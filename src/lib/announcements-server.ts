/**
 * Shared durable announcement store for multi-user (all accounts / machines).
 *
 * Priority:
 * 1. Vercel Blob (BLOB_READ_WRITE_TOKEN) — survives cold starts & instances
 * 2. /tmp + memory — local/dev / warm fallback
 * 3. project data/announcements.json — local filesystem
 */

import { promises as fs } from 'fs'
import path from 'path'
import type { Announcement } from './announcements'

const BLOB_PATH = 'nf/announcements/v1.json'
const PROJECT_FILE = path.join(process.cwd(), 'data', 'announcements.json')
const TMP_FILE = path.join('/tmp', 'nf-announcements.v1.json')

type G = typeof globalThis & {
  __nfAnnouncements?: Announcement[]
  __nfAnnouncementsLoaded?: boolean
  __nfBlobUrl?: string
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

function hasBlobToken() {
  return !!process.env.BLOB_READ_WRITE_TOKEN
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
  await fs.writeFile(
    file,
    JSON.stringify({ items, updatedAt: new Date().toISOString() }, null, 2),
    'utf8',
  )
}

function parseItems(raw: unknown): Announcement[] {
  if (!raw) return []
  if (Array.isArray(raw)) return raw as Announcement[]
  if (typeof raw === 'object' && raw !== null && 'items' in raw) {
    const items = (raw as { items: unknown }).items
    return Array.isArray(items) ? (items as Announcement[]) : []
  }
  return []
}

async function readFromBlob(): Promise<Announcement[] | null> {
  if (!hasBlobToken()) return null
  try {
    const { list } = await import('@vercel/blob')
    const { blobs } = await list({ prefix: 'nf/announcements/', limit: 20 })
    // Prefer exact pathname match
    const hit =
      blobs.find((b) => b.pathname === BLOB_PATH) ||
      blobs.find((b) => b.pathname.includes('announcements')) ||
      blobs[0]
    if (!hit?.url) return null
    const g = globalThis as G
    g.__nfBlobUrl = hit.url
    const res = await fetch(hit.url, { cache: 'no-store' })
    if (!res.ok) return null
    const body = await res.json()
    return parseItems(body)
  } catch (e) {
    console.warn('[announcements] blob read failed', e)
    return null
  }
}

async function writeToBlob(items: Announcement[]): Promise<boolean> {
  if (!hasBlobToken()) return false
  try {
    const { put } = await import('@vercel/blob')
    const payload = JSON.stringify({
      items,
      updatedAt: new Date().toISOString(),
    })
    const blob = await put(BLOB_PATH, payload, {
      access: 'public',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'application/json',
      cacheControlMaxAge: 0,
    })
    const g = globalThis as G
    g.__nfBlobUrl = blob.url
    return true
  } catch (e) {
    console.warn('[announcements] blob write failed', e)
    return false
  }
}

export async function readAnnouncementsFile(): Promise<Announcement[]> {
  // 1) Durable shared store (all users)
  const fromBlob = await readFromBlob()
  if (fromBlob && fromBlob.length >= 0) {
    // empty array is valid (admin deleted all)
    // Only trust blob if token exists — empty blob is real empty
    if (hasBlobToken()) {
      memSet(fromBlob)
      try {
        await writeJsonFile(TMP_FILE, fromBlob)
      } catch {
        /* */
      }
      return fromBlob
    }
  }

  const g = globalThis as G
  if (g.__nfAnnouncementsLoaded && Array.isArray(g.__nfAnnouncements)) {
    return g.__nfAnnouncements
  }

  const fromTmp = await readJsonFile(TMP_FILE)
  if (fromTmp && fromTmp.length > 0) {
    memSet(fromTmp)
    return fromTmp
  }

  const fromProject = await readJsonFile(PROJECT_FILE)
  if (fromProject && fromProject.length > 0) {
    memSet(fromProject)
    try {
      await writeJsonFile(TMP_FILE, fromProject)
    } catch {
      /* */
    }
    // seed blob if token available
    if (hasBlobToken()) {
      void writeToBlob(fromProject)
    }
    return fromProject
  }

  const m = memGet()
  g.__nfAnnouncementsLoaded = true
  return m
}

export async function writeAnnouncementsFile(
  items: Announcement[],
): Promise<Announcement[]> {
  memSet(items)

  // 1) Shared durable write (critical for multi-account)
  const blobOk = await writeToBlob(items)
  if (!blobOk && hasBlobToken()) {
    console.error(
      '[announcements] BLOB_READ_WRITE_TOKEN set but write failed — multi-user may lag',
    )
  }

  // 2) Local warm cache
  try {
    await writeJsonFile(TMP_FILE, items)
  } catch {
    /* */
  }

  // 3) Dev project file
  try {
    await writeJsonFile(PROJECT_FILE, items)
  } catch {
    /* expected on Vercel read-only */
  }

  return items
}

/** Public helper for health/debug */
export function announcementsStoreMode(): string {
  if (hasBlobToken()) return 'vercel-blob'
  if (process.env.VERCEL) return 'tmp+memory'
  return 'filesystem'
}
