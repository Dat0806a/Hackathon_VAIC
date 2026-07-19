/**
 * Personal account customization (per user id).
 * - Display name with 7-day change cooldown
 * - Avatar (data URL)
 * - Activity status
 * - Profession / industries
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
  displayName: string
  /** ISO when displayName last changed (cooldown 7 days) */
  nameChangedAt: string | null
  avatarDataUrl: string | null
  activityStatus: ActivityStatus
  customStatus: string
  profession: string
  industries: string[]
  headline: string
  updatedAt: string
}

const STORE_KEY = 'nf.personal.profiles.v1'
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

type Store = Record<string, PersonalProfile>

function readStore(): Store {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) || '{}') as Store
  } catch {
    return {}
  }
}

function writeStore(store: Store) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORE_KEY, JSON.stringify(store))
  try {
    window.dispatchEvent(new CustomEvent('nf:personal-profile'))
  } catch {
    /* */
  }
}

export function emptyProfile(
  userId: string,
  fallbackName = '',
): PersonalProfile {
  const now = new Date().toISOString()
  return {
    userId,
    displayName: fallbackName.slice(0, 80),
    nameChangedAt: null,
    avatarDataUrl: null,
    activityStatus: 'online',
    customStatus: '',
    profession: '',
    industries: [],
    headline: '',
    updatedAt: now,
  }
}

export function getPersonalProfile(
  userId: string | null | undefined,
  fallbackName = '',
): PersonalProfile {
  if (!userId) return emptyProfile('anon', fallbackName)
  const store = readStore()
  if (store[userId]) {
    const p = store[userId]
    // seed name from auth if empty
    if (!p.displayName && fallbackName) {
      return { ...p, displayName: fallbackName.slice(0, 80) }
    }
    return p
  }
  return emptyProfile(userId, fallbackName)
}

export function savePersonalProfile(profile: PersonalProfile): PersonalProfile {
  const next: PersonalProfile = {
    ...profile,
    displayName: profile.displayName.trim().slice(0, 80),
    customStatus: profile.customStatus.trim().slice(0, 80),
    profession: profile.profession.trim().slice(0, 80),
    headline: profile.headline.trim().slice(0, 160),
    industries: (profile.industries || []).slice(0, 8),
    updatedAt: new Date().toISOString(),
  }
  const store = readStore()
  store[next.userId] = next
  writeStore(store)
  return next
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

/**
 * Apply name change with 7-day rule.
 * Returns error message or null on success; mutates via save.
 */
export function tryChangeDisplayName(
  profile: PersonalProfile,
  newName: string,
): { profile: PersonalProfile; error: string | null } {
  const name = newName.trim().slice(0, 80)
  if (!name) {
    return { profile, error: 'empty' }
  }
  if (name === profile.displayName) {
    return { profile, error: null }
  }
  const info = nameChangeInfo(profile)
  if (!info.canChange) {
    return { profile, error: 'cooldown' }
  }
  const next = savePersonalProfile({
    ...profile,
    displayName: name,
    nameChangedAt: new Date().toISOString(),
  })
  return { profile: next, error: null }
}

/** Resize image file to max edge and JPEG data URL */
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
