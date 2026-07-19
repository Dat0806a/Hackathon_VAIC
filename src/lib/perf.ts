/**
 * Runtime performance profile — Windows + low-power machines lag on
 * backdrop-blur, WebGL, Lenis/GSAP scroll loops more than macOS.
 *
 * Sets `document.documentElement.dataset.perf = 'lite' | 'full'`
 * and exposes helpers for components.
 */

'use client'

export type PerfMode = 'full' | 'lite'

const STORAGE_KEY = 'nf.perf.mode.v1'

function uaWindows(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  const plat = (navigator as Navigator & { userAgentData?: { platform?: string } })
    .userAgentData?.platform
  return /Windows/i.test(ua) || /Win/i.test(String(plat || ''))
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function lowCores(): boolean {
  if (typeof navigator === 'undefined') return false
  const c = navigator.hardwareConcurrency
  return typeof c === 'number' && c > 0 && c <= 4
}

function saveData(): boolean {
  if (typeof navigator === 'undefined') return false
  return !!(navigator as Navigator & { connection?: { saveData?: boolean } }).connection
    ?.saveData
}

/** Decide mode: explicit override > reduced-motion > Windows/low-end > full */
export function detectPerfMode(): PerfMode {
  if (typeof window === 'undefined') return 'full'
  try {
    const forced = localStorage.getItem(STORAGE_KEY)
    if (forced === 'lite' || forced === 'full') return forced
  } catch {
    /* */
  }
  if (prefersReducedMotion() || saveData()) return 'lite'
  if (uaWindows() || lowCores()) return 'lite'
  return 'full'
}

export function isLitePerf(mode?: PerfMode): boolean {
  return (mode ?? getPerfMode()) === 'lite'
}

export function getPerfMode(): PerfMode {
  if (typeof document === 'undefined') return 'full'
  const d = document.documentElement.dataset.perf
  if (d === 'lite' || d === 'full') return d
  return detectPerfMode()
}

export function applyPerfMode(mode?: PerfMode) {
  if (typeof document === 'undefined') return detectPerfMode()
  const m = mode ?? detectPerfMode()
  document.documentElement.dataset.perf = m
  document.documentElement.classList.toggle('perf-lite', m === 'lite')
  document.documentElement.classList.toggle('perf-full', m === 'full')
  return m
}

export function setPerfModeOverride(mode: PerfMode | 'auto') {
  try {
    if (mode === 'auto') localStorage.removeItem(STORAGE_KEY)
    else localStorage.setItem(STORAGE_KEY, mode)
  } catch {
    /* */
  }
  return applyPerfMode(mode === 'auto' ? undefined : mode)
}

/** Should heavy decorative WebGL / particle backgrounds run? */
export function allowHeavyFx(): boolean {
  return !isLitePerf() && !prefersReducedMotion()
}

/** Should Lenis smooth-scroll run? */
export function allowSmoothScroll(): boolean {
  return !isLitePerf() && !prefersReducedMotion()
}
