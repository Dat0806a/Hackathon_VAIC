/**
 * Platform announcements — admin-authored rich HTML, shown as login popup.
 * Persisted via /api/admin/announcements + public GET; client cache for offline.
 */

export type AnnouncementAudience = 'all' | 'startup' | 'intake' | 'admin'

export type Announcement = {
  id: string
  title: string
  /** Sanitized-ish HTML from rich editor */
  bodyHtml: string
  /** Plain text fallback */
  bodyText: string
  audience: AnnouncementAudience
  active: boolean
  priority: number
  createdAt: string
  updatedAt: string
  createdBy?: string
  /** Optional expire ISO */
  expiresAt?: string | null
}

export type AnnouncementDismiss =
  | { mode: 'once'; sessionKey: string }
  | { mode: 'forever'; at: string }

const LIST_KEY = 'nf.announcements.v1'
const DISMISS_KEY = 'nf.announcements.dismiss.v1'
const SESSION_KEY = 'nf.announcements.session.v1'

function uid() {
  return `ann-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function createEmptyAnnouncement(
  partial?: Partial<Announcement>,
): Announcement {
  const now = new Date().toISOString()
  return {
    id: uid(),
    title: '',
    bodyHtml: '<p></p>',
    bodyText: '',
    audience: 'all',
    active: true,
    priority: 0,
    createdAt: now,
    updatedAt: now,
    ...partial,
  }
}

export function readLocalAnnouncements(): Announcement[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(LIST_KEY)
    if (!raw) return []
    const list = JSON.parse(raw) as Announcement[]
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

export function writeLocalAnnouncements(list: Announcement[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(LIST_KEY, JSON.stringify(list))
  try {
    window.dispatchEvent(new CustomEvent('nf:announcements', { detail: { list } }))
  } catch {
    /* */
  }
}

type DismissMap = Record<string, AnnouncementDismiss>

function readDismiss(): DismissMap {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(localStorage.getItem(DISMISS_KEY) || '{}') as DismissMap
  } catch {
    return {}
  }
}

function writeDismiss(map: DismissMap) {
  if (typeof window === 'undefined') return
  localStorage.setItem(DISMISS_KEY, JSON.stringify(map))
}

function sessionId(): string {
  if (typeof window === 'undefined') return 'ssr'
  try {
    let s = sessionStorage.getItem(SESSION_KEY)
    if (!s) {
      s = `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
      sessionStorage.setItem(SESSION_KEY, s)
    }
    return s
  } catch {
    return 'anon'
  }
}

/** User dismissed this announcement for current browser session only */
export function dismissOnce(id: string) {
  const map = readDismiss()
  map[id] = { mode: 'once', sessionKey: sessionId() }
  writeDismiss(map)
}

/** Never show again on this browser */
export function dismissForever(id: string) {
  const map = readDismiss()
  map[id] = { mode: 'forever', at: new Date().toISOString() }
  writeDismiss(map)
}

export function isDismissed(id: string): boolean {
  const d = readDismiss()[id]
  if (!d) return false
  if (d.mode === 'forever') return true
  return d.sessionKey === sessionId()
}

export function clearDismiss(id: string) {
  const map = readDismiss()
  delete map[id]
  writeDismiss(map)
}

export type ViewerKind = 'guest' | 'startup' | 'intake' | 'admin'

export function matchesAudience(a: Announcement, viewer: ViewerKind): boolean {
  if (!a.active) return false
  if (a.expiresAt && new Date(a.expiresAt).getTime() < Date.now()) return false
  if (a.audience === 'all') return viewer !== 'guest'
  return a.audience === viewer
}

export function pickVisibleAnnouncements(
  list: Announcement[],
  viewer: ViewerKind,
): Announcement[] {
  return list
    .filter((a) => matchesAudience(a, viewer) && !isDismissed(a.id))
    .sort((x, y) => y.priority - x.priority || y.createdAt.localeCompare(x.createdAt))
}

export async function fetchPublicAnnouncements(): Promise<Announcement[]> {
  try {
    const res = await fetch('/api/public/announcements', { cache: 'no-store' })
    if (!res.ok) throw new Error('fail')
    const body = await res.json()
    const items = (body?.data?.items || body?.items || body) as Announcement[]
    if (Array.isArray(items) && items.length) {
      writeLocalAnnouncements(items)
      return items
    }
  } catch {
    /* fall through */
  }
  return readLocalAnnouncements()
}

export async function saveAnnouncementsRemote(
  list: Announcement[],
  token?: string,
): Promise<Announcement[]> {
  writeLocalAnnouncements(list)
  try {
    const res = await fetch('/api/admin/announcements', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ items: list }),
    })
    if (res.ok) {
      const body = await res.json()
      const items = (body?.data?.items || body?.items || list) as Announcement[]
      writeLocalAnnouncements(items)
      return items
    }
  } catch {
    /* local already saved */
  }
  return list
}

/** Minimal HTML strip for text export */
export function htmlToText(html: string): string {
  if (typeof document === 'undefined') {
    return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  }
  const d = document.createElement('div')
  d.innerHTML = html
  return (d.textContent || '').trim()
}
