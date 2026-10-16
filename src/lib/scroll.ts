import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

/**
 * Shared, mutable scroll + pointer state. Read inside `useFrame` / rAF loops
 * without causing React re-renders.
 */
export const motionState = {
  velocity: 0,
  progress: 0,
  scroll: 0,
  /** Normalised pointer, -1..1 on both axes. */
  pointer: { x: 0, y: 0 },
}

let lenis: Lenis | null = null

export function initSmoothScroll() {
  if (lenis) return lenis
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  lenis = new Lenis({
    lerp: reduced ? 1 : 0.09,
    smoothWheel: !reduced,
    wheelMultiplier: 1,
    touchMultiplier: 1.4,
  })

  lenis.on('scroll', (l: Lenis) => {
    motionState.velocity = l.velocity
    motionState.progress = l.progress
    motionState.scroll = l.scroll
    ScrollTrigger.update()
  })

  const raf = (time: number) => lenis?.raf(time * 1000)
  gsap.ticker.add(raf)
  gsap.ticker.lagSmoothing(0)

  const onPointer = (e: PointerEvent) => {
    motionState.pointer.x = (e.clientX / window.innerWidth) * 2 - 1
    motionState.pointer.y = -((e.clientY / window.innerHeight) * 2 - 1)
  }
  window.addEventListener('pointermove', onPointer, { passive: true })

  return lenis
}

export function getLenis() {
  return lenis
}

export function scrollToTarget(target: string | HTMLElement, offset = -80) {
  const el = typeof target === 'string' ? document.querySelector<HTMLElement>(target) : target
  if (!el) return
  if (lenis) lenis.scrollTo(el, { offset, duration: 1.6, easing: (t) => 1 - Math.pow(1 - t, 4) })
  else el.scrollIntoView({ behavior: 'smooth' })
}

export function lockScroll(locked: boolean) {
  if (!lenis) return
  if (locked) lenis.stop()
  else lenis.start()
  document.documentElement.style.overflow = locked ? 'hidden' : ''
}
