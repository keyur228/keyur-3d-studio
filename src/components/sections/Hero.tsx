import { ArrowDownRight, ArrowUpRight, Box } from 'lucide-react'
import { individualAssets, profile } from '@/data/portfolioData'
import { scrollToTarget } from '@/lib/scroll'
import { useStore } from '@/store/useStore'
import { Reveal } from '@/components/ui/Reveal'

const featured = individualAssets.find((a) => a.featured) ?? individualAssets[0]

export function Hero() {
  const openAsset = useStore((s) => s.openAsset)
  const { before, emphasis, after } = profile.heroTitle

  return (
    <section id="top" className="pb-6 pt-28 md:pb-16 md:pt-36">
      <div className="container-page grid items-center gap-12 lg:grid-cols-12 lg:gap-10">
        {/* Copy */}
        <Reveal className="min-w-0 lg:col-span-7" stagger={0.1}>
          <p className="eyebrow">{profile.roles.join(' · ')}</p>
          <h1 className="display mt-6 text-[clamp(3rem,6.6vw,5.75rem)] text-ink">
            {before} <em className="text-accent">{emphasis}</em> {after}
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-relaxed text-ink-2">{profile.intro}</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <button type="button" onClick={() => scrollToTarget('#work')} className="btn btn-primary">
              View selected work <ArrowDownRight className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => scrollToTarget('#request')} className="btn btn-ghost">
              Request an asset
            </button>
          </div>
          <ul className="mt-12 flex flex-wrap gap-x-8 gap-y-3 border-t border-line pt-6 text-sm text-ink-2">
            <li className="flex items-center gap-2">
              <span className="status-dot h-2 w-2 rounded-full bg-ok" /> {profile.availability}
            </li>
            <li>{profile.location}</li>
          </ul>
        </Reveal>

        {/* Featured project — a real render; the live 3D loads only on request */}
        <Reveal className="min-w-0 lg:col-span-5" delay={0.15}>
          <figure className="overflow-hidden rounded-[1.5rem] border border-line bg-paper-2">
            <button type="button" onClick={() => openAsset(featured)} aria-label={`Preview ${featured.title} in 3D`} className="group relative block aspect-[4/3] w-full overflow-hidden">
              <img
                src={featured.renders?.[0]?.src ?? featured.thumbnailUrl}
                alt={`${featured.title} — ${featured.renders?.[0]?.caption ?? 'render'}`}
                fetchPriority="high"
                className="h-full w-full object-cover transition-transform duration-700 ease-out-expo group-hover:scale-[1.03]"
              />
              <span className="absolute bottom-4 left-4 inline-flex items-center gap-1.5 rounded-full bg-card/90 px-3 py-1.5 text-[13px] font-medium text-ink shadow-[var(--shadow-soft)] backdrop-blur transition-colors group-hover:bg-ink group-hover:text-paper">
                <Box className="h-3.5 w-3.5" /> Preview in 3D
              </span>
            </button>
            <figcaption className="flex items-center justify-between gap-4 border-t border-line bg-card px-5 py-4">
              <div className="min-w-0">
                <p className="truncate text-[0.9375rem] font-medium text-ink">Featured project · {featured.title}</p>
                <p className="font-mono text-xs text-muted">
                  {featured.polyCount} · {featured.textures}
                </p>
              </div>
              <button type="button" onClick={() => openAsset(featured)} className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-accent hover:text-accent-deep">
                View project <ArrowUpRight className="h-4 w-4" />
              </button>
            </figcaption>
          </figure>
        </Reveal>
      </div>
    </section>
  )
}
