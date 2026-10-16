import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Box, Clapperboard, Palette, Workflow, type LucideIcon } from 'lucide-react'
import { skillGroups, toolchain, type SkillGroup } from '@/data/portfolioData'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { Reveal } from '@/components/ui/Reveal'

const icons: Record<SkillGroup['icon'], LucideIcon> = { box: Box, palette: Palette, clapperboard: Clapperboard, workflow: Workflow }

interface Wire {
  id: string
  d: string
  color: string
}

/** Centre of `el` relative to `container`, ignoring CSS transforms (so entrance animations don't skew wires). */
function centreWithin(el: HTMLElement, container: HTMLElement) {
  let x = el.offsetWidth / 2
  let y = el.offsetHeight / 2
  let node: HTMLElement | null = el
  while (node && node !== container) {
    x += node.offsetLeft
    y += node.offsetTop
    node = node.offsetParent as HTMLElement | null
  }
  return { x, y }
}

function Socket({ color, active, socketRef }: { color: string; active: boolean; socketRef?: (el: HTMLSpanElement | null) => void }) {
  return (
    <span
      ref={socketRef}
      className="relative z-10 block h-3 w-3 shrink-0 rounded-full border-2 border-card transition-transform duration-300"
      style={{ background: color, transform: active ? 'scale(1.35)' : 'scale(1)', boxShadow: `0 0 0 1px ${color}` }}
    />
  )
}

function SkillNode({
  group,
  side,
  active,
  dimmed,
  onHover,
  socketRef,
}: {
  group: SkillGroup
  side: 'left' | 'right'
  active: boolean
  dimmed: boolean
  onHover: (id: string | null) => void
  socketRef: (el: HTMLSpanElement | null) => void
}) {
  const Icon = icons[group.icon]
  return (
    <div
      onPointerEnter={() => onHover(group.id)}
      onPointerLeave={() => onHover(null)}
      onFocus={() => onHover(group.id)}
      onBlur={() => onHover(null)}
      tabIndex={0}
      className={`relative rounded-xl border bg-card transition-[opacity,box-shadow,border-color] duration-300 ${
        active ? 'border-line-strong shadow-[var(--shadow-lift)]' : 'border-line shadow-[var(--shadow-soft)]'
      } ${dimmed ? 'opacity-50' : 'opacity-100'}`}
    >
      <div className="flex items-center gap-2.5 border-b border-line px-4 py-3">
        <span className="grid h-6 w-6 place-items-center rounded-md" style={{ background: `${group.socketColor}1f`, color: group.socketColor }}>
          <Icon className="h-3.5 w-3.5" />
        </span>
        <span className="text-[0.9375rem] font-medium text-ink">{group.title}</span>
      </div>

      {/* output socket on the side facing the Output node (desktop only) */}
      <div className={`absolute top-[1.1rem] hidden lg:block ${side === 'left' ? '-right-[0.4rem]' : '-left-[0.4rem]'}`}>
        <Socket color={group.socketColor} active={active} socketRef={socketRef} />
      </div>

      <ul className="space-y-1.5 p-3">
        {group.skills.map((s, i) => (
          // the row (not the zero-width bar) is what gets observed, so the fill reliably triggers
          <motion.li key={s.name} className="relative h-8 overflow-hidden rounded-md bg-paper" initial="hidden" whileInView="shown" viewport={{ once: true, margin: '-5%' }}>
            <motion.span
              className="absolute inset-y-0 left-0"
              style={{ background: `${group.socketColor}29` }}
              variants={{ hidden: { width: 0 }, shown: { width: `${s.level}%` } }}
              transition={{ duration: 1.1, delay: 0.1 + i * 0.06, ease: [0.16, 1, 0.3, 1] }}
            />
            <span className="relative flex h-full items-center justify-between gap-3 px-3 text-sm">
              <span className="truncate text-ink">{s.name}</span>
              <span className="font-mono text-xs text-muted">{(s.level / 100).toFixed(2)}</span>
            </span>
          </motion.li>
        ))}
      </ul>
    </div>
  )
}

export function Skills() {
  const container = useRef<HTMLDivElement>(null)
  const outSockets = useRef<Record<string, HTMLSpanElement | null>>({})
  const inSockets = useRef<Record<string, HTMLSpanElement | null>>({})
  const [wires, setWires] = useState<Wire[]>([])
  const [hovered, setHovered] = useState<string | null>(null)
  const desktop = useMediaQuery('(min-width: 1024px)')

  const left = skillGroups.slice(0, 2)
  const right = skillGroups.slice(2)

  const measure = useCallback(() => {
    const c = container.current
    if (!c || !desktop) return setWires([])
    const next: Wire[] = []
    skillGroups.forEach((g) => {
      const a = outSockets.current[g.id]
      const b = inSockets.current[g.id]
      if (!a || !b) return
      const p1 = centreWithin(a, c)
      const p2 = centreWithin(b, c)
      const dx = Math.max(Math.abs(p2.x - p1.x) * 0.55, 50)
      const s = p2.x > p1.x ? 1 : -1
      next.push({ id: g.id, color: g.socketColor, d: `M ${p1.x} ${p1.y} C ${p1.x + dx * s} ${p1.y}, ${p2.x - dx * s} ${p2.y}, ${p2.x} ${p2.y}` })
    })
    setWires(next)
  }, [desktop])

  useLayoutEffect(() => {
    measure()
    const ro = new ResizeObserver(measure)
    if (container.current) ro.observe(container.current)
    document.fonts?.ready.then(measure)
    return () => ro.disconnect()
  }, [measure])

  const isDim = (id: string) => hovered !== null && hovered !== id

  return (
    <section id="skills" className="section">
      <div className="container-page">
        <SectionHeading
          index="03"
          eyebrow="Skills"
          title={
            <>
              A toolkit wired like a <em className="text-accent">shader graph.</em>
            </>
          }
          description="Four disciplines feed every asset I deliver. Hover a node to trace its connection to the final output."
        />

        <Reveal>
          <div ref={container} className="relative rounded-[1.5rem] border border-line bg-paper-2/60 p-4 md:p-8 lg:p-10">
            <div className="pointer-events-none absolute inset-0 rounded-[1.5rem] opacity-70 [background-image:radial-gradient(#d9cfbf_1px,transparent_1px)] [background-size:20px_20px]" />

            {desktop && (
              <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-hidden>
                {wires.map((w) => {
                  const on = hovered === w.id
                  return (
                    <g key={w.id} style={{ opacity: hovered && !on ? 0.25 : 1, transition: 'opacity 0.3s' }}>
                      <motion.path
                        d={w.d}
                        fill="none"
                        stroke={w.color}
                        strokeWidth={on ? 2.5 : 1.75}
                        strokeLinecap="round"
                        initial={{ pathLength: 0 }}
                        whileInView={{ pathLength: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 1.4, delay: 0.3, ease: [0.65, 0, 0.35, 1] }}
                      />
                      {on && <path d={w.d} fill="none" stroke="#fbf8f2" strokeWidth={1.5} strokeLinecap="round" className="wire-flow" />}
                    </g>
                  )
                })}
              </svg>
            )}

            <div className="relative grid gap-5 lg:grid-cols-[1fr_minmax(230px,0.7fr)_1fr] lg:gap-16">
              <div className="flex flex-col gap-5 lg:justify-between lg:gap-10">
                {left.map((g) => (
                  <SkillNode key={g.id} group={g} side="left" active={hovered === g.id} dimmed={isDim(g.id)} onHover={setHovered} socketRef={(el) => (outSockets.current[g.id] = el)} />
                ))}
              </div>

              {/* Output node */}
              <div className="flex items-center">
                <div className="w-full rounded-xl border border-line bg-card shadow-[var(--shadow-soft)]">
                  <div className="flex items-center justify-between border-b border-line px-4 py-3">
                    <span className="text-[0.9375rem] font-medium text-ink">Material Output</span>
                    <span className="eyebrow">Final</span>
                  </div>
                  <div className="p-4">
                    <div className="relative mx-auto grid aspect-square w-full max-w-[180px] place-items-center rounded-lg bg-paper-2">
                      <div
                        className="h-[70%] w-[70%] rounded-full"
                        style={{
                          background: 'radial-gradient(circle at 34% 30%, #fffaf2 0%, #efe3d2 28%, #d9b99a 62%, #9a6a45 100%)',
                          boxShadow: '0 18px 30px -14px rgba(90,60,30,0.45)',
                        }}
                      />
                      <span className="eyebrow absolute bottom-2 left-2.5 text-[10px]">Preview</span>
                    </div>
                    <ul className="mt-4 space-y-1">
                      {skillGroups.map((g, i) => {
                        const onLeft = i < 2
                        return (
                          <li
                            key={g.id}
                            className={`relative flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${hovered === g.id ? 'bg-paper text-ink' : 'text-ink-2'} ${onLeft ? '' : 'flex-row-reverse text-right'}`}
                            onPointerEnter={() => setHovered(g.id)}
                            onPointerLeave={() => setHovered(null)}
                          >
                            <span className={`absolute hidden lg:block ${onLeft ? '-left-[1.4rem]' : '-right-[1.4rem]'}`}>
                              <Socket color={g.socketColor} active={hovered === g.id} socketRef={(el) => (inSockets.current[g.id] = el)} />
                            </span>
                            <span className="h-2 w-2 shrink-0 rounded-full lg:hidden" style={{ background: g.socketColor }} />
                            <span className="flex-1 truncate">{g.title}</span>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-5 lg:justify-between lg:gap-10">
                {right.map((g) => (
                  <SkillNode key={g.id} group={g} side="right" active={hovered === g.id} dimmed={isDim(g.id)} onHover={setHovered} socketRef={(el) => (outSockets.current[g.id] = el)} />
                ))}
              </div>
            </div>
          </div>
        </Reveal>

        <div className="mt-10 flex flex-col gap-3 md:flex-row md:items-baseline md:gap-8">
          <p className="eyebrow shrink-0">Toolchain</p>
          <p className="leading-relaxed text-ink-2">{toolchain.join(' · ')}</p>
        </div>
      </div>
    </section>
  )
}
