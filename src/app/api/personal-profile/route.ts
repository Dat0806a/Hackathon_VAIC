/**
 * Shared personal profile API (email-keyed) via Vercel Blob.
 * Survives logout/login and works across devices.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import type { PersonalProfile } from '@/lib/personal-profile'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const PREFIX = 'nf/personal/'

function emailKey(email: string) {
  const em = String(email || '')
    .trim()
    .toLowerCase()
  const hash = createHash('sha256').update(em).digest('hex').slice(0, 32)
  return `${PREFIX}${hash}.json`
}

function hasBlob() {
  return !!process.env.BLOB_READ_WRITE_TOKEN
}

async function readRemote(email: string): Promise<PersonalProfile | null> {
  if (!hasBlob()) return null
  try {
    const { list } = await import('@vercel/blob')
    const pathname = emailKey(email)
    const { blobs } = await list({ prefix: pathname.replace(/\.json$/, ''), limit: 5 })
    const hit =
      blobs.find((b) => b.pathname === pathname) ||
      blobs.find((b) => b.pathname.endsWith('.json'))
    if (!hit?.url) return null
    const res = await fetch(hit.url, { cache: 'no-store' })
    if (!res.ok) return null
    const body = await res.json()
    return (body?.profile || body) as PersonalProfile
  } catch (e) {
    console.warn('[personal-profile] read', e)
    return null
  }
}

async function writeRemote(profile: PersonalProfile): Promise<boolean> {
  if (!hasBlob()) return false
  const email = String(profile.email || '')
    .trim()
    .toLowerCase()
  if (!email) return false
  try {
    const { put } = await import('@vercel/blob')
    const pathname = emailKey(email)
    // Cap avatar size in shared store (~120KB data URL)
    let avatar = profile.avatarDataUrl
    if (avatar && avatar.length > 120_000) {
      avatar = avatar.slice(0, 120_000)
    }
    const payload = JSON.stringify({
      profile: { ...profile, email, avatarDataUrl: avatar },
      updatedAt: new Date().toISOString(),
    })
    await put(pathname, payload, {
      access: 'public',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'application/json',
      cacheControlMaxAge: 0,
    })
    return true
  } catch (e) {
    console.warn('[personal-profile] write', e)
    return false
  }
}

export async function GET(req: NextRequest) {
  const email = String(req.nextUrl.searchParams.get('email') || '')
    .trim()
    .toLowerCase()
  if (!email || !email.includes('@')) {
    return NextResponse.json(
      { success: false, message: 'email required' },
      { status: 400 },
    )
  }
  const profile = await readRemote(email)
  return NextResponse.json(
    {
      success: true,
      data: {
        profile,
        store: hasBlob() ? 'vercel-blob' : 'none',
      },
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}

export async function PUT(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, message: 'Invalid JSON' }, { status: 400 })
  }
  const profile = (body as { profile?: PersonalProfile })?.profile
  if (!profile || typeof profile !== 'object') {
    return NextResponse.json(
      { success: false, message: 'profile required' },
      { status: 400 },
    )
  }
  const email = String(profile.email || '')
    .trim()
    .toLowerCase()
  if (!email || !email.includes('@')) {
    return NextResponse.json(
      { success: false, message: 'profile.email required' },
      { status: 400 },
    )
  }
  const ok = await writeRemote({
    ...profile,
    email,
    displayName: String(profile.displayName || '').slice(0, 80),
    customStatus: String(profile.customStatus || '').slice(0, 80),
    profession: String(profile.profession || '').slice(0, 80),
    headline: String(profile.headline || '').slice(0, 160),
    industries: Array.isArray(profile.industries)
      ? profile.industries.slice(0, 8).map(String)
      : [],
    updatedAt: new Date().toISOString(),
  })
  return NextResponse.json({
    success: true,
    data: { stored: ok, store: hasBlob() ? 'vercel-blob' : 'local-only' },
  })
}
