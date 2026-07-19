/**
 * Soft live-reload helpers — keep screens fresh without forcing F5.
 *
 * Use cases:
 * - Revalidate when user returns to the tab (focus / visibility)
 * - Revalidate after mutations (profile save, match run, connection, eval…)
 * - Cross-tab sync via storage + BroadcastChannel
 *
 * Pages call `useLiveReload(loader)` instead of a bare mount-only useEffect.
 */

'use client'

import { useCallback, useEffect, useRef } from 'react'

/** App-wide data events (CustomEvent on window + BroadcastChannel) */
export type LiveEvent =
  | 'nf:data'
  | 'nf:profile'
  | 'nf:matches'
  | 'nf:connections'
  | 'nf:programs'
  | 'nf:evaluations'
  | 'nf:notifications'
  | 'nf:sandbox-progress'
  | 'nf:auth'

const CHANNEL_NAME = 'nf.live.v1'
const STORAGE_PULSE_KEY = 'nf.live.pulse.v1'

export type LiveReloadOptions = {
  /** Event names that should trigger a reload (in addition to focus/visibility) */
  events?: LiveEvent[]
  /** Revalidate when tab becomes visible again (default true) */
  onVisible?: boolean
  /** Revalidate on window focus (default true) */
  onFocus?: boolean
  /** Polling interval ms; 0 = off (default 0). Prefer events over polling. */
  intervalMs?: number
  /** Min ms between reloads to avoid thrashing (default 800) */
  debounceMs?: number
  /** Run immediately on mount (default true) */
  immediate?: boolean
  /** When false, skip all reloads (e.g. not authenticated yet) */
  enabled?: boolean
}

function canUseWindow() {
  return typeof window !== 'undefined'
}

/** Notify every live subscriber (same tab + other tabs). */
export function notifyLive(
  event: LiveEvent = 'nf:data',
  detail?: Record<string, unknown>,
) {
  if (!canUseWindow()) return
  try {
    window.dispatchEvent(new CustomEvent(event, { detail: detail ?? {} }))
    if (event !== 'nf:data') {
      window.dispatchEvent(
        new CustomEvent('nf:data', { detail: { source: event, ...(detail ?? {}) } }),
      )
    }
  } catch {
    /* ignore */
  }
  try {
    const bc = new BroadcastChannel(CHANNEL_NAME)
    bc.postMessage({ event, detail: detail ?? {}, t: Date.now() })
    bc.close()
  } catch {
    /* BroadcastChannel unsupported — fall through to storage pulse */
  }
  try {
    localStorage.setItem(
      STORAGE_PULSE_KEY,
      JSON.stringify({ event, t: Date.now(), detail: detail ?? {} }),
    )
  } catch {
    /* ignore quota / private mode */
  }
}

/** Convenience aliases used after mutations */
export const live = {
  all: (d?: Record<string, unknown>) => notifyLive('nf:data', d),
  profile: (d?: Record<string, unknown>) => notifyLive('nf:profile', d),
  matches: (d?: Record<string, unknown>) => notifyLive('nf:matches', d),
  connections: (d?: Record<string, unknown>) => notifyLive('nf:connections', d),
  programs: (d?: Record<string, unknown>) => notifyLive('nf:programs', d),
  evaluations: (d?: Record<string, unknown>) => notifyLive('nf:evaluations', d),
  notifications: (d?: Record<string, unknown>) => notifyLive('nf:notifications', d),
  sandbox: (d?: Record<string, unknown>) => notifyLive('nf:sandbox-progress', d),
  auth: (d?: Record<string, unknown>) => notifyLive('nf:auth', d),
}

/**
 * Subscribe a loader so data stays fresh without manual browser refresh.
 * Returns a stable `reload` you can also bind to a button.
 */
export function useLiveReload(
  loader: () => void | Promise<void>,
  options: LiveReloadOptions = {},
) {
  const {
    events = ['nf:data'],
    onVisible = true,
    onFocus = true,
    intervalMs = 0,
    debounceMs = 800,
    immediate = true,
    enabled = true,
  } = options

  const loaderRef = useRef(loader)
  loaderRef.current = loader
  const lastRun = useRef(0)
  const inflight = useRef<Promise<void> | null>(null)
  // Stabilize event list so callers can pass inline arrays without re-binding
  const eventsKey = events.join('|')

  const reload = useCallback(
    async (reason?: string) => {
      if (!enabled) return
      const now = Date.now()
      if (now - lastRun.current < debounceMs) return
      if (inflight.current) return
      lastRun.current = now
      const run = (async () => {
        try {
          await loaderRef.current()
        } catch (e) {
          if (process.env.NODE_ENV !== 'production') {
            console.warn('[live-reload]', reason || 'reload', e)
          }
        }
      })()
      inflight.current = run
      try {
        await run
      } finally {
        if (inflight.current === run) inflight.current = null
      }
    },
    [enabled, debounceMs],
  )

  useEffect(() => {
    if (!enabled || !canUseWindow()) return

    const eventList = eventsKey
      ? (eventsKey.split('|') as LiveEvent[])
      : (['nf:data'] as LiveEvent[])

    if (immediate) void reload('mount')

    const onCustom = () => void reload('event')
    for (const ev of eventList) {
      window.addEventListener(ev, onCustom)
    }

    const onVis = () => {
      if (!onVisible) return
      if (document.visibilityState === 'visible') void reload('visible')
    }
    if (onVisible) {
      document.addEventListener('visibilitychange', onVis)
    }

    const onWinFocus = () => {
      if (onFocus) void reload('focus')
    }
    if (onFocus) {
      window.addEventListener('focus', onWinFocus)
    }

    // Cross-tab via storage pulse + BroadcastChannel
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_PULSE_KEY && e.newValue) void reload('storage')
    }
    window.addEventListener('storage', onStorage)

    let bc: BroadcastChannel | null = null
    try {
      bc = new BroadcastChannel(CHANNEL_NAME)
      bc.onmessage = (msg) => {
        const ev = msg?.data?.event as LiveEvent | undefined
        if (!ev) return
        if (
          eventList.includes(ev) ||
          eventList.includes('nf:data') ||
          ev === 'nf:data'
        ) {
          void reload('broadcast')
        }
      }
    } catch {
      bc = null
    }

    let timer: ReturnType<typeof setInterval> | null = null
    if (intervalMs > 0) {
      timer = setInterval(() => {
        if (document.visibilityState === 'visible') void reload('interval')
      }, intervalMs)
    }

    // bfcache restore (back/forward)
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) void reload('pageshow')
    }
    window.addEventListener('pageshow', onPageShow)

    return () => {
      for (const ev of eventList) {
        window.removeEventListener(ev, onCustom)
      }
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('focus', onWinFocus)
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('pageshow', onPageShow)
      if (timer) clearInterval(timer)
      try {
        bc?.close()
      } catch {
        /* */
      }
    }
  }, [enabled, immediate, onVisible, onFocus, intervalMs, eventsKey, reload])

  return reload
}
