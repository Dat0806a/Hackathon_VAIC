/**
 * Server-side announcement persistence for serverless (Vercel).
 * Order: memory → /tmp (writable) → project data/ (local dev).
 * Never treat empty file as wipe if memory still has items.
 */

import { promises as fs } from 'fs'
import path from 'path'
import type { Announcement } from './announcements'

const PROJECT_FILE = path.join(process.cwd(), 'data', 'announcements.json')
const TMP_FILE = path.join('/tmp', 'nf-announcements.v1.json')

type G = typeof globalThis & {
  __nfAnnouncements?: Announcement[]
  __nfAnnouncementsLoaded?: boolean
}

function memGet(): Announcement[] {
  const g = globalThis as G
  if (!g.__nfAnnouncements) g.__nfAnnouncements = []
  return g.__nfAnnouncements
}

function memSet(items: Announcement[]) {
  const g = globalThis as G
  g.__nfAnnouncements = items
  g.__nfAnnouncementsLoaded = true
}

async function readJsonFile(file: string): Promise<Announcement[] | null> {
  try {
    const raw = await fs.readFile(file, 'utf8')
    const parsed = JSON.parse(raw) as { items?: Announcement[] } | Announcement[]
    const items = Array.isArray(parsed) ? parsed : parsed.items || []
    return Array.isArray(items) ? items : []
  } catch {
    return null
  }
}

async function writeJsonFile(file: string, items: Announcement[]) {
  await fs.mkdir(path.dirname(file), { recursive: true })
  await fs.writeFile(file, JSON.stringify({ items, updatedAt: new Date().toISOString() }, null, 2), 'utf8')
}

export async function readAnnouncementsFile(): Promise<Announcement[]> {
  const g = globalThis as G
  // Prefer warm memory first (same isolate)
  if (g.__nfAnnouncementsLoaded && Array.isArray(g.__nfAnnouncements)) {
    return g.__nfAnnouncements
  }

  // /tmp is writable on Vercel for the instance lifetime
  const fromTmp = await readJsonFile(TMP_FILE)
  if (fromTmp && fromTmp.length > 0) {
    memSet(fromTmp)
    return fromTmp
  }

  const fromProject = await readJsonFile(PROJECT_FILE)
  if (fromProject && fromProject.length > 0) {
    memSet(fromProject)
    // best-effort mirror to tmp
    try {
      await writeJsonFile(TMP_FILE, fromProject)
    } catch {
      /* */
    }
    return fromProject
  }

  // Empty — keep memory default
  const m = memGet()
  g.__nfAnnouncementsLoaded = true
  return m
}

export async function writeAnnouncementsFile(
  items: Announcement[],
): Promise<Announcement[]> {
  memSet(items)

  // Always try /tmp first (works on Vercel)
  try {
    await writeJsonFile(TMP_FILE, items)
  } catch (e) {
    console.warn('[announcements] /tmp write failed', e)
  }

  // Local dev / writable deploys
  try {
    await writeJsonFile(PROJECT_FILE, items)
  } catch {
    // expected read-only on Vercel build output
  }

  return items
}
