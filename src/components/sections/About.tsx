import { useEffect, useRef, useState } from 'react'
import { useInView } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import { profile } from '@/data/portfolioData'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { Reveal } from '@/components/ui/Reveal'

function Counter({ value, suffix }: { value: number; suffix: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-15%' })
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!inView) return
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min((now - start) / 1400, 1)
      setN(Math.round(value * (1 - Math.pow(1 - t, 4))))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [inView, value])
  return (
    <span ref={ref} className="tabular-nums">
      {n}
      {suffix}
    </span>
  )
}

export function About() {
  const socials = profile.socials.filter((s) => s.url)
  return (
    <section id="about" className="section bg-paper-2/60">
      <div className="container-page">
        <SectionHeading
          index="04"
          eyebrow="About"
          title={
            <>
              The person behind <em className="text-accent">the renders.</em>
            </>
          }
        />

        <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
          {/* Portrait */}
          <Reveal className="lg:col-span-5">
            <div className="relative aspect-[4/5] overflow-hidden rounded-[1.5rem] border border-line bg-paper">
              {profile.portraitUrl ? (
                <img src={profile.portraitUrl} alt={`Portrait of ${profile.name}`} className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full w-full place-items-center bg-[radial-gradient(70%_60%_at_50%_40%,#fbf6ee,#ede6da)]">
                  <span className="display text-[9rem] text-accent">K</span>
                </div>
              )}
            </div>
          </Reveal>

          {/* Bio */}
          <Reveal className="flex flex-col lg:col-span-7" stagger={0.08}>
            <p className="display text-[clamp(1.75rem,3vw,2.5rem)] leading-[1.15] text-ink">
              Hi, I&apos;m {profile.name}. I make 3D assets that look right in a render <em className="text-accent">and</em> behave in a pipeline.
            </p>
            <p className="mt-6 text-[1.0625rem] leading-relaxed text-ink-2">{profile.bio}</p>

            <dl className="mt-10 grid grid-cols-2 gap-x-8 gap-y-8 border-t border-line pt-8 sm:grid-cols-4">
              {profile.stats.map((s) => (
                <div key={s.label} className="flex flex-col-reverse">
                  <dt className="mt-1 text-sm text-ink-2">{s.label}</dt>
                  <dd className="display text-[2.75rem] text-ink">
                    <Counter value={s.value} suffix={s.suffix} />
                  </dd>
                </div>
              ))}
            </dl>

            <div className="mt-10 grid gap-6 border-t border-line pt-8 sm:grid-cols-2">
              <div>
                <p className="eyebrow">Specialities</p>
                <ul className="mt-3 space-y-1.5 text-ink-2">
                  {profile.badges.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              </div>
              {socials.length > 0 && (
                <div>
                  <p className="eyebrow">Elsewhere</p>
                  <ul className="mt-3 space-y-1.5">
                    {socials.map((s) => (
                      <li key={s.label}>
                        <a href={s.url} target="_blank" rel="noreferrer" className="group inline-flex items-center gap-1 text-ink hover:text-accent">
                          <span className="link-underline">{s.label}</span>
                          <ArrowUpRight className="h-3.5 w-3.5 text-muted transition group-hover:text-accent" />
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
