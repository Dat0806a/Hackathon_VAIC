/**
 * Platform announcements — admin-authored rich HTML.
 * Client localStorage is SSOT when server FS is ephemeral (Vercel).
 * Remote empty NEVER wipes non-empty local cache.
 */

export type AnnouncementAudience = 'all' | 'startup' | 'intake' | 'admin'

export type Announcement = {
  id: string
  title: string
  bodyHtml: string
  bodyText: string
  audience: AnnouncementAudience
  active: boolean
  priority: number
  createdAt: string
  updatedAt: string
  createdBy?: string
  expiresAt?: string | null
}

export type AnnouncementDismiss =
  | { mode: 'once'; sessionKey: string }
  | { mode: 'forever'; at: string }

const LIST_KEY = 'nf.announcements.v1'
const BACKUP_KEY = 'nf.announcements.backup.v1'
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

function parseList(raw: string | null): Announcement[] {
  if (!raw) return []
  try {
    const list = JSON.parse(raw) as Announcement[] | { items?: Announcement[] }
    if (Array.isArray(list)) return list
    if (list && Array.isArray(list.items)) return list.items
    return []
  } catch {
    return []
  }
}

export function readLocalAnnouncements(): Announcement[] {
  if (typeof window === 'undefined') return []
  try {
    const primary = parseList(localStorage.getItem(LIST_KEY))
    if (primary.length) return primary
    // fallback backup if primary wiped
    return parseList(localStorage.getItem(BACKUP_KEY))
  } catch {
    return []
  }
}

export function writeLocalAnnouncements(list: Announcement[]) {
  if (typeof window === 'undefined') return
  const payload = JSON.stringify(list)
  try {
    localStorage.setItem(LIST_KEY, payload)
    localStorage.setItem(BACKUP_KEY, payload)
  } catch {
    /* quota */
  }
  try {
    window.dispatchEvent(new CustomEvent('nf:announcements', { detail: { list } }))
  } catch {
    /* */
  }
}

/** Merge two lists by id — keep newer updatedAt */
export function mergeAnnouncementLists(
  a: Announcement[],
  b: Announcement[],
): Announcement[] {
  const map = new Map<string, Announcement>()
  for (const item of [...a, ...b]) {
    if (!item?.id) continue
    const prev = map.get(item.id)
    if (!prev) {
      map.set(item.id, item)
      continue
    }
    const ta = Date.parse(item.updatedAt || item.createdAt || '') || 0
    const tb = Date.parse(prev.updatedAt || prev.createdAt || '') || 0
    map.set(item.id, ta >= tb ? item : prev)
  }
  return Array.from(map.values()).sort(
    (x, y) =>
      (y.priority || 0) - (x.priority || 0) ||
      String(y.createdAt || '').localeCompare(String(x.createdAt || '')),
  )
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

export function dismissOnce(id: string) {
  const map = readDismiss()
  map[id] = { mode: 'once', sessionKey: sessionId() }
  writeDismiss(map)
}

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
  const local = readLocalAnnouncements()
  try {
    const res = await fetch('/api/public/announcements', { cache: 'no-store' })
    if (!res.ok) throw new Error('fail')
    const body = await res.json()
    const items = (body?.data?.items || body?.items || body) as Announcement[]
    if (Array.isArray(items) && items.length > 0) {
      const merged = mergeAnnouncementLists(local, items)
      writeLocalAnnouncements(merged)
      return merged
    }
    // Server empty — KEEP local (Vercel can't always persist FS)
  } catch {
    /* fall through */
  }
  return local
}

export async function fetchAdminAnnouncements(
  token: string,
): Promise<Announcement[]> {
  const local = readLocalAnnouncements()
  try {
    const res = await fetch('/api/admin/announcements', {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    if (!res.ok) throw new Error('fail')
    const body = await res.json()
    const items = (body?.data?.items || []) as Announcement[]
    if (Array.isArray(items) && items.length > 0) {
      const merged = mergeAnnouncementLists(local, items)
      writeLocalAnnouncements(merged)
      return merged
    }
    // Remote empty but we have local → re-hydrate server
    if (local.length > 0) {
      await saveAnnouncementsRemote(local, token)
      return local
    }
  } catch {
    /* keep local */
  }
  return local
}

export async function saveAnnouncementsRemote(
  list: Announcement[],
  token?: string,
): Promise<Announcement[]> {
  // Always persist client first (survives refresh on Vercel)
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
      // Prefer what we sent if server returns empty by mistake
      const final = Array.isArray(items) && items.length > 0 ? items : list
      writeLocalAnnouncements(final)
      return final
    }
  } catch {
    /* local already saved */
  }
  return list
}

export function htmlToText(html: string): string {
  if (typeof document === 'undefined') {
    return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  }
  const d = document.createElement('div')
  d.innerHTML = html
  return (d.textContent || '').trim()
}
