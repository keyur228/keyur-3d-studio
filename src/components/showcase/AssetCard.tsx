import { Box } from 'lucide-react'
import type { IndividualAsset } from '@/data/portfolioData'
import { useStore } from '@/store/useStore'

/** Individual asset: a 2D render that opens the live 3D inspector on click. */
export function AssetCard({ asset }: { asset: IndividualAsset }) {
  const openAsset = useStore((s) => s.openAsset)
  return (
    <button type="button" onClick={() => openAsset(asset)} aria-label={`Inspect ${asset.title} in 3D`} className="group block w-full text-left">
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-line bg-paper-2 transition-shadow duration-500 group-hover:shadow-[var(--shadow-lift)]">
        <img
          src={asset.thumbnailUrl}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition-transform duration-700 ease-out-expo group-hover:scale-[1.03]"
        />
        {asset.featured && <span className="absolute left-3 top-3 rounded-full bg-accent px-3 py-1 text-[12px] font-medium text-paper">Featured project</span>}
        <span className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-card/90 px-2.5 py-1 font-mono text-[11px] text-ink-2 backdrop-blur">
          <Box className="h-3.5 w-3.5" /> 3D
        </span>
        <span className="absolute bottom-3 left-3 translate-y-2 rounded-full bg-ink px-3.5 py-1.5 text-[13px] font-medium text-paper opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">
          Inspect in 3D
        </span>
      </div>
      <div className="mt-4 flex items-baseline justify-between gap-4">
        <h3 className="truncate text-[1.0625rem] font-medium text-ink">{asset.title}</h3>
        <span className="shrink-0 text-sm text-muted">{asset.categories[0]}</span>
      </div>
      <p className="mt-1 font-mono text-xs text-muted">
        {asset.polyCount} · {asset.textures}
      </p>
    </button>
  )
}
