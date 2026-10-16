import { Images } from 'lucide-react'
import type { AssetPack } from '@/data/portfolioData'
import { useStore } from '@/store/useStore'

/** Asset pack: a cover render that opens the image gallery (no WebGL). */
export function PackCard({ pack }: { pack: AssetPack }) {
  const openPack = useStore((s) => s.openPack)
  return (
    <button type="button" onClick={() => openPack(pack)} aria-label={`Open ${pack.title} gallery`} className="group block w-full text-left">
      <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-line bg-paper-2 transition-shadow duration-500 group-hover:shadow-[var(--shadow-lift)]">
        <img
          src={pack.coverImage}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition-transform duration-700 ease-out-expo group-hover:scale-[1.03]"
        />
        <span className="absolute left-3 top-3 rounded-full bg-card/90 px-3 py-1 text-[13px] font-medium text-ink backdrop-blur">{pack.assetCount}</span>
        <span className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-card/90 px-2.5 py-1 font-mono text-[11px] text-ink-2 backdrop-blur">
          <Images className="h-3.5 w-3.5" /> {pack.galleryImages.length}
        </span>
      </div>
      <div className="mt-4 flex items-baseline justify-between gap-4">
        <h3 className="truncate text-[1.0625rem] font-medium text-ink">{pack.title}</h3>
        <span className="shrink-0 font-mono text-xs text-muted">{pack.formats.join(' ')}</span>
      </div>
      <p className="mt-1 text-sm text-ink-2">{pack.tagline}</p>
    </button>
  )
}
