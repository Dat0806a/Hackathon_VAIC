/**
 * Estimated-progress timer for long ops (AI extract, match, reload…).
 * Progress eases toward ~92% until complete, then snaps to 100%.
 */

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export type ProcessingPhase = {
  /** 0–1 share of total estimate when this phase is active */
  weight: number
  labelVi: string
  labelEn: string
}

export type UseProcessingOptions = {
  /** Expected duration in ms (default 12s) */
  estimateMs?: number
  phases?: ProcessingPhase[]
  lang?: 'vi' | 'en'
}

const DEFAULT_PHASES: ProcessingPhase[] = [
  { weight: 0.15, labelVi: 'Chuẩn bị…', labelEn: 'Preparing…' },
  { weight: 0.45, labelVi: 'Đang xử lý…', labelEn: 'Processing…' },
  { weight: 0.3, labelVi: 'Phân tích kết quả…', labelEn: 'Analyzing results…' },
  { weight: 0.1, labelVi: 'Hoàn tất…', labelEn: 'Finishing…' },
]

export function useProcessing(options: UseProcessingOptions = {}) {
  const {
    estimateMs = 12_000,
    phases = DEFAULT_PHASES,
    lang = 'vi',
  } = options

  const [active, setActive] = useState(false)
  const [progress, setProgress] = useState(0)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [done, setDone] = useState(false)
  const startRef = useRef(0)
  const rafRef = useRef(0)
  const estimateRef = useRef(estimateMs)
  estimateRef.current = estimateMs

  const tick = useCallback(() => {
    const elapsed = Date.now() - startRef.current
    setElapsedMs(elapsed)
    // asymptotic toward 92% based on estimate
    const est = Math.max(1500, estimateRef.current)
    const ratio = elapsed / est
    // ease-out curve: 1 - e^(-k t)
    const p = Math.min(0.92, 1 - Math.exp(-1.4 * ratio))
    setProgress(p)
    rafRef.current = window.requestAnimationFrame(tick)
  }, [])

  const start = useCallback(
    (opts?: { estimateMs?: number }) => {
      if (opts?.estimateMs) estimateRef.current = opts.estimateMs
      startRef.current = Date.now()
      setDone(false)
      setActive(true)
      setProgress(0.02)
      setElapsedMs(0)
      cancelAnimationFrame(rafRef.current)
      rafRef.current = window.requestAnimationFrame(tick)
    },
    [tick],
  )

  const finish = useCallback(async (holdMs = 320) => {
    cancelAnimationFrame(rafRef.current)
    setProgress(1)
    setDone(true)
    setElapsedMs(Date.now() - startRef.current)
    if (holdMs > 0) {
      await new Promise((r) => setTimeout(r, holdMs))
    }
    setActive(false)
    setDone(false)
    setProgress(0)
  }, [])

  const fail = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    setActive(false)
    setDone(false)
    setProgress(0)
  }, [])

  useEffect(() => {
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  const remainingMs = active
    ? Math.max(0, estimateRef.current * (1 - progress) * 1.05)
    : 0

  const phaseIndex = (() => {
    if (!active) return 0
    let acc = 0
    for (let i = 0; i < phases.length; i++) {
      acc += phases[i].weight
      if (progress < acc || i === phases.length - 1) return i
    }
    return phases.length - 1
  })()

  const phase = phases[phaseIndex] || phases[0]
  const phaseLabel = lang === 'en' ? phase.labelEn : phase.labelVi

  return {
    active,
    progress,
    progressPct: Math.round(progress * 100),
    elapsedMs,
    remainingMs,
    done,
    phaseLabel,
    phaseIndex,
    start,
    finish,
    fail,
    estimateMs: estimateRef.current,
  }
}

export function formatEta(ms: number, lang: 'vi' | 'en' = 'vi'): string {
  if (ms <= 0) return lang === 'en' ? 'almost done' : 'sắp xong'
  const sec = Math.ceil(ms / 1000)
  if (sec < 60) {
    return lang === 'en' ? `~${sec}s left` : `còn ~${sec}s`
  }
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return lang === 'en' ? `~${m}m ${s}s left` : `còn ~${m}p ${s}s`
}

export function formatElapsed(ms: number, lang: 'vi' | 'en' = 'vi'): string {
  const sec = Math.max(0, Math.floor(ms / 1000))
  if (sec < 60) return lang === 'en' ? `${sec}s` : `${sec}s`
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`
}
