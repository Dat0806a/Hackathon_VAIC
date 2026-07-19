import { NextRequest, NextResponse } from 'next/server'
import type { Announcement } from '@/lib/announcements'
import {
  readAnnouncementsFile,
  writeAnnouncementsFile,
} from '@/lib/announcements-server'

export const dynamic = 'force-dynamic'

function unauthorized() {
  return NextResponse.json(
    { success: false, message: 'Unauthorized', error: { code: 'UNAUTHORIZED' } },
    { status: 401 },
  )
}

/** Soft gate: require Bearer (admin UI always sends token). Full JWT verify lives on API host. */
function hasToken(req: NextRequest) {
  const h = req.headers.get('authorization') || ''
  return h.toLowerCase().startsWith('bearer ') && h.length > 20
}

export async function GET(req: NextRequest) {
  if (!hasToken(req)) return unauthorized()
  const items = await readAnnouncementsFile()
  return NextResponse.json({ success: true, data: { items } })
}

export async function PUT(req: NextRequest) {
  if (!hasToken(req)) return unauthorized()
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { success: false, message: 'Invalid JSON' },
      { status: 400 },
    )
  }
  const raw = body as { items?: Announcement[] }
  const items = Array.isArray(raw.items) ? raw.items : []
  // light sanitize: cap size
  const capped = items.slice(0, 100).map((a) => ({
    ...a,
    title: String(a.title || '').slice(0, 200),
    bodyHtml: String(a.bodyHtml || '').slice(0, 50_000),
    bodyText: String(a.bodyText || '').slice(0, 10_000),
  }))
  await writeAnnouncementsFile(capped)
  return NextResponse.json({ success: true, data: { items: capped } })
}
