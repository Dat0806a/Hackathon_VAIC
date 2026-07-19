import { NextResponse } from 'next/server'
import { readAnnouncementsFile } from '@/lib/announcements-server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const items = await readAnnouncementsFile()
  const active = items.filter((a) => {
    if (!a.active) return false
    if (a.expiresAt && new Date(a.expiresAt).getTime() < Date.now()) return false
    return true
  })
  return NextResponse.json({
    success: true,
    data: { items: active },
  })
}
