/**
 * Server-side announcement persistence.
 * Prefer data/announcements.json; fall back to globalThis memory (serverless soft).
 */

import { promises as fs } from 'fs'
import path from 'path'
import type { Announcement } from './announcements'

const FILE = path.join(process.cwd(), 'data', 'announcements.json')

type G = typeof globalThis & {
  __nfAnnouncements?: Announcement[]
}

function mem(): Announcement[] {
  const g = globalThis as G
  if (!g.__nfAnnouncements) g.__nfAnnouncements = []
  return g.__nfAnnouncements
}

export async function readAnnouncementsFile(): Promise<Announcement[]> {
  try {
    const raw = await fs.readFile(FILE, 'utf8')
    const parsed = JSON.parse(raw) as { items?: Announcement[] } | Announcement[]
    const items = Array.isArray(parsed) ? parsed : parsed.items || []
    const g = globalThis as G
    g.__nfAnnouncements = items
    return items
  } catch {
    return mem()
  }
}

export async function writeAnnouncementsFile(
  items: Announcement[],
): Promise<Announcement[]> {
  const g = globalThis as G
  g.__nfAnnouncements = items
  try {
    await fs.mkdir(path.dirname(FILE), { recursive: true })
    await fs.writeFile(FILE, JSON.stringify({ items }, null, 2), 'utf8')
  } catch {
    // Vercel read-only FS — memory only for this instance
  }
  return items
}
