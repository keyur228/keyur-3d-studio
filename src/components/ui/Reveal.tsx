import { useLayoutEffect, useRef, type ElementType, type ReactNode } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

/**
 * The site's one entrance animation: direct children fade up a short distance
 * in sequence when they scroll into view. Skipped for reduced-motion users.
 */
export function Reveal({ children, className = '', as: Tag = 'div', stagger = 0.08, delay = 0 }: { children: ReactNode; className?: string; as?: ElementType; stagger?: number; delay?: number }) {
  const ref = useRef<HTMLElement>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el.children,
        { y: 24, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.9,
          ease: 'power3.out',
          stagger,
          delay,
          clearProps: 'transform,opacity',
          scrollTrigger: { trigger: el, start: 'top 88%', once: true },
        },
      )
    }, el)
    return () => ctx.revert()
  }, [stagger, delay])
  return (
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  )
}
