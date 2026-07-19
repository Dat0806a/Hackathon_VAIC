'use client'

import { useEffect } from 'react'
import { allowSmoothScroll } from '@/lib/perf'

/**
 * Lenis + GSAP ScrollTrigger — disabled on Windows / lite perf / reduced-motion.
 * Native scroll is smoother on DWM compositors than fake smooth-scroll loops.
 */
export function SmoothScroll() {
  useEffect(() => {
    if (!allowSmoothScroll()) return

    let destroyed = false
    let cleanup: (() => void) | undefined

    void (async () => {
      const [{ default: Lenis }, gsapMod, stMod] = await Promise.all([
        import('lenis'),
        import('gsap'),
        import('gsap/ScrollTrigger'),
      ])
      if (destroyed) return

      const gsap = gsapMod.default
      const { ScrollTrigger } = stMod
      gsap.registerPlugin(ScrollTrigger)

      const mobile = window.matchMedia('(max-width: 768px)').matches
      const lenis = new Lenis({
        lerp: mobile ? 0.16 : 0.1,
        smoothWheel: true,
        wheelMultiplier: mobile ? 0.95 : 1,
        touchMultiplier: 1.05,
      })

      lenis.on('scroll', ScrollTrigger.update)

      const raf = (time: number) => lenis.raf(time * 1000)
      gsap.ticker.add(raf)
      gsap.ticker.lagSmoothing(500, 33)

      cleanup = () => {
        gsap.ticker.remove(raf)
        lenis.destroy()
      }
    })()

    return () => {
      destroyed = true
      cleanup?.()
    }
  }, [])

  return null
}
