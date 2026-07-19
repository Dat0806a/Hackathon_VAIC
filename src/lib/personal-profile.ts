/**
 * Personal customization — survives logout/login.
 * Primary key: email (stable). Secondary: userId alias.
 * Local SSOT + Vercel Blob for multi-device.
 */

export type ActivityStatus =
  | 'online'
  | 'away'
  | 'busy'
  | 'dnd'
  | 'offline'
  | 'custom'

export type PersonalProfile = {
  userId: string
  email: string
  displayName: string
  nameChangedAt: string | null
  avatarDataUrl: string | null
  activityStatus: ActivityStatus
  customStatus: string
  profession: string
  industries: string[]
  headline: string
  updatedAt: string
  /** true only after user saved at least once */
  saved?: boolean
}

const STORE_KEY = 'nf.personal.profiles.v2'
const STORE_KEY_LEGACY = 'nf.personal.profiles.v1'
const LAST_EMAIL_KEY = 'nf.personal.last-email.v1'
export const NAME_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000

export const PROFESSION_OPTIONS = [
  'Founder / CEO',
  'CTO / Technical lead',
  'Product manager',
  'Growth / Marketing',
  'Investment analyst',
  'Program manager',
  'Partnerships',
  'Researcher',
  'Designer',
  'Operations',
  'Advisor',
  'Other',
] as const

export const INDUSTRY_OPTIONS = [
  'AI / Machine Learning',
  'SaaS / B2B',
  'Fintech',
  'Healthtech',
  'Edtech',
  'Climate / Clean energy',
  'E-commerce',
  'Deeptech / Hardware',
  'AgriTech',
  'Logistics',
  'Media / Content',
  'Government / Civic',
  'Impact / Social',
  'Other',
] as const

export const ACTIVITY_OPTIONS: {
  id: ActivityStatus
  vi: string
  en: string
  color: string
}[] = [
  { id: 'online', vi: 'Đang hoạt động', en: 'Active', color: 'bg-emerald-500' },
  { id: 'away', vi: 'Vắng mặt', en: 'Away', color: 'bg-amber-400' },
  { id: 'busy', vi: 'Bận', en: 'Busy', color: 'bg-orange-500' },
  { id: 'dnd', vi: 'Không làm phiền', en: 'Do not disturb', color: 'bg-rose-500' },
  { id: 'offline', vi: 'Ngoại tuyến', en: 'Offline', color: 'bg-zinc-400' },
  { id: 'custom', vi: 'Tùy chỉnh', en: 'Custom', color: 'bg-sky-500' },
]

type Store = {
  byEmail: Record<string, PersonalProfile>
  userToEmail: Record<string, string>
}

export function normalizeEmail(email?: string | null): string {
  return String(email || '')
    .trim()
    .toLowerCase()
}

function emptyStore(): Store {
  return { byEmail: {}, userToEmail: {} }
}

function readStore(): Store {
  if (typeof window === 'undefined') return emptyStore()
  try {
    const v2 = localStorage.getItem(STORE_KEY)
    if (v2) {
      const parsed = JSON.parse(v2) as Store
      if (parsed?.byEmail) {
        return {
          byEmail: parsed.byEmail || {},
          userToEmail: parsed.userToEmail || {},
        }
      }
    }
    const v1 = localStorage.getItem(STORE_KEY_LEGACY)
    if (v1) {
      const legacy = JSON.parse(v1) as Record<string, PersonalProfile>
      const store = emptyStore()
      for (const [uid, p] of Object.entries(legacy || {})) {
        if (!p || typeof p !== 'object') continue
        const email =
          normalizeEmail((p as { email?: string }).email) || `uid:${uid}`
        const next: PersonalProfile = {
          ...emptyProfile(uid, '', email),
          ...p,
          userId: p.userId || uid,
          email,
          saved: true,
        }
        store.byEmail[email] = next
        store.userToEmail[uid] = email
      }
      writeStore(store)
      return store
    }
  } catch {
    /* */
  }
  return emptyStore()
}

function writeStore(store: Store) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(store))
  } catch {
    try {
      const slim: Store = { byEmail: {}, userToEmail: { ...store.userToEmail } }
      for (const [k, p] of Object.entries(store.byEmail)) {
        slim.byEmail[k] = {
          ...p,
          avatarDataUrl:
            p.avatarDataUrl && p.avatarDataUrl.length > 100_000
              ? null
              : p.avatarDataUrl,
        }
      }
      localStorage.setItem(STORE_KEY, JSON.stringify(slim))
    } catch {
      /* */
    }
  }
  try {
    window.dispatchEvent(new CustomEvent('nf:personal-profile'))
  } catch {
    /* */
  }
}

export function emptyProfile(
  userId: string,
  fallbackName = '',
  email = '',
): PersonalProfile {
  return {
    userId,
    email: normalizeEmail(email),
    // Do NOT pre-fill displayName — that fake "data" blocked remote hydrate
    displayName: '',
    nameChangedAt: null,
    avatarDataUrl: null,
    activityStatus: 'online',
    customStatus: '',
    profession: '',
    industries: [],
    headline: '',
    updatedAt: '1970-01-01T00:00:00.000Z',
    saved: false,
  }
}

/** True if this is a real user-saved profile (not a placeholder). */
export function isPersistedProfile(p: PersonalProfile | null | undefined): boolean {
  if (!p) return false
  if (p.saved === true) return true
  if (p.nameChangedAt) return true
  if (p.avatarDataUrl) return true
  if ((p.profession || '').trim()) return true
  if ((p.headline || '').trim()) return true
  if ((p.customStatus || '').trim()) return true
  if ((p.industries || []).length > 0) return true
  // displayName alone is not enough (could be from auth fullName)
  return false
}

function resolveEmailKey(
  store: Store,
  userId?: string | null,
  email?: string | null,
): string | null {
  const em = normalizeEmail(email)
  if (em && store.byEmail[em]) return em
  if (userId && store.userToEmail[userId] && store.byEmail[store.userToEmail[userId]]) {
    return store.userToEmail[userId]
  }
  if (userId && store.byEmail[`uid:${userId}`]) return `uid:${userId}`
  // last email used on this browser (after logout)
  try {
    const last = normalizeEmail(localStorage.getItem(LAST_EMAIL_KEY))
    if (last && store.byEmail[last] && (!em || em === last)) return last
  } catch {
    /* */
  }
  if (em) return em
  if (userId) return `uid:${userId}`
  return null
}

export function getPersonalProfile(
  userId: string | null | undefined,
  fallbackName = '',
  email?: string | null,
): PersonalProfile {
  const store = readStore()
  const key = resolveEmailKey(store, userId, email)
  if (key && store.byEmail[key]) {
    const p = { ...store.byEmail[key] }
    if (userId) p.userId = userId
    if (email) p.email = normalizeEmail(email)
    // UI helper: show fallback name if user never set one
    if (!p.displayName && fallbackName) {
      return { ...p, displayName: fallbackName.slice(0, 80) }
    }
    return p
  }
  const shell = emptyProfile(userId || 'anon', fallbackName, email || '')
  if (fallbackName) shell.displayName = fallbackName.slice(0, 80)
  return shell
}

export function savePersonalProfile(profile: PersonalProfile): PersonalProfile {
  const email =
    normalizeEmail(profile.email) ||
    (profile.userId ? `uid:${profile.userId}` : '')
  if (!email) {
    console.warn('[personal] save without email/userId — skipped')
    return profile
  }
  const next: PersonalProfile = {
    ...profile,
    email: email.startsWith('uid:') ? normalizeEmail(profile.email) || email : email,
    userId: profile.userId || email,
    displayName: (profile.displayName || '').trim().slice(0, 80),
    customStatus: (profile.customStatus || '').trim().slice(0, 80),
    profession: (profile.profession || '').trim().slice(0, 80),
    headline: (profile.headline || '').trim().slice(0, 160),
    industries: (profile.industries || []).slice(0, 8),
    updatedAt: new Date().toISOString(),
    saved: true,
  }
  // Prefer real email key when available
  const storeKey =
    normalizeEmail(profile.email) ||
    (next.email.includes('@') ? next.email : email)

  const store = readStore()
  store.byEmail[storeKey] = { ...next, email: storeKey.startsWith('uid:') ? next.email : storeKey }
  if (next.userId) store.userToEmail[next.userId] = storeKey
  if (storeKey.includes('@')) {
    try {
      localStorage.setItem(LAST_EMAIL_KEY, storeKey)
    } catch {
      /* */
    }
  }
  writeStore(store)
  return store.byEmail[storeKey]
}

export async function savePersonalProfileRemote(
  profile: PersonalProfile,
): Promise<PersonalProfile> {
  const next = savePersonalProfile(profile)
  const em = normalizeEmail(next.email)
  if (!em || !em.includes('@')) {
    console.warn('[personal] no email — remote skip, local only', next)
    return next
  }
  try {
    const res = await fetch('/api/personal-profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile: next }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok || body?.data?.stored === false) {
      console.warn('[personal] remote store failed', body)
    }
  } catch (e) {
    console.warn('[personal] remote error', e)
  }
  return next
}

export async function hydratePersonalProfile(
  userId: string | null | undefined,
  email: string | null | undefined,
  fallbackName = '',
): Promise<PersonalProfile> {
  const em = normalizeEmail(email)
  const local = getPersonalProfile(userId, fallbackName, em)
  const localReal = isPersistedProfile(local)

  if (!em || !em.includes('@')) {
    return local
  }

  try {
    const res = await fetch(
      `/api/personal-profile?email=${encodeURIComponent(em)}`,
      { cache: 'no-store' },
    )
    if (!res.ok) return local
    const body = await res.json()
    const remote = body?.data?.profile as PersonalProfile | null
    if (!remote || typeof remote !== 'object') return local

    const remoteReal = isPersistedProfile(remote)
    if (!remoteReal) return local

    const localT = Date.parse(local.updatedAt || '') || 0
    const remoteT = Date.parse(remote.updatedAt || '') || 0

    // Always take remote if local is not a real save, or remote is newer
    if (!localReal || remoteT >= localT) {
      return savePersonalProfile({
        ...remote,
        userId: userId || remote.userId,
        email: em,
        saved: true,
      })
    }
  } catch (e) {
    console.warn('[personal] hydrate', e)
  }
  return local
}

export function nameChangeInfo(profile: PersonalProfile): {
  canChange: boolean
  nextAt: Date | null
  daysLeft: number
  msLeft: number
} {
  if (!profile.nameChangedAt) {
    return { canChange: true, nextAt: null, daysLeft: 0, msLeft: 0 }
  }
  const changed = new Date(profile.nameChangedAt).getTime()
  const next = changed + NAME_COOLDOWN_MS
  const msLeft = Math.max(0, next - Date.now())
  const canChange = msLeft <= 0
  return {
    canChange,
    nextAt: canChange ? null : new Date(next),
    daysLeft: canChange ? 0 : Math.ceil(msLeft / (24 * 60 * 60 * 1000)),
    msLeft,
  }
}

export function tryChangeDisplayName(
  profile: PersonalProfile,
  newName: string,
): { profile: PersonalProfile; error: string | null } {
  const name = newName.trim().slice(0, 80)
  if (!name) return { profile, error: 'empty' }
  if (name === profile.displayName) return { profile, error: null }
  const info = nameChangeInfo(profile)
  if (!info.canChange) return { profile, error: 'cooldown' }
  // Don't save yet — caller saves with full fields
  return {
    profile: {
      ...profile,
      displayName: name,
      nameChangedAt: new Date().toISOString(),
    },
    error: null,
  }
}

export function fileToAvatarDataUrl(
  file: File,
  maxEdge = 256,
  quality = 0.82,
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('not-image'))
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      reject(new Error('too-large'))
      return
    }
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('read'))
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const scale = Math.min(1, maxEdge / Math.max(img.width, img.height))
        const w = Math.max(1, Math.round(img.width * scale))
        const h = Math.max(1, Math.round(img.height * scale))
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('canvas'))
          return
        }
        ctx.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.onerror = () => reject(new Error('image'))
      img.src = String(reader.result)
    }
    reader.readAsDataURL(file)
  })
}

export function initialsFrom(name: string, email?: string) {
  const base = (name || email || 'U').trim()
  const parts = base.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return base.replace(/[^a-zA-Z0-9À-ỹ]/g, '').slice(0, 2).toUpperCase() || 'U'
}

export function activityMeta(status: ActivityStatus) {
  return ACTIVITY_OPTIONS.find((o) => o.id === status) || ACTIVITY_OPTIONS[0]
}
