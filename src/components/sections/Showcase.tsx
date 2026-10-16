import { useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { assetCategories, assetPacks, individualAssets, type AssetCategory } from '@/data/portfolioData'
import { useStore, type ShowcaseMode } from '@/store/useStore'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { AssetCard } from '@/components/showcase/AssetCard'
import { PackCard } from '@/components/showcase/PackCard'

const modes: { id: ShowcaseMode; label: string; count: number }[] = [
  { id: 'assets', label: '3D Assets', count: individualAssets.length },
  { id: 'packs', label: 'Asset Packs', count: assetPacks.length },
]

export function Showcase() {
  const mode = useStore((s) => s.showcaseMode)
  const category = useStore((s) => s.category)
  const setMode = useStore((s) => s.setShowcaseMode)
  const setCategory = useStore((s) => s.setCategory)

  const source = mode === 'assets' ? individualAssets : assetPacks
  const categories = useMemo(() => assetCategories.filter((c) => source.some((s) => s.categories.includes(c))), [source])
  const visibleAssets = individualAssets.filter((a) => category === 'All' || a.categories.includes(category))
  const visiblePacks = assetPacks.filter((p) => category === 'All' || p.categories.includes(category))
  const empty = (mode === 'assets' ? visibleAssets : visiblePacks).length === 0

  return (
    <section id="work" className="section">
      <div className="container-page">
        <SectionHeading
          index="01"
          eyebrow="Selected work"
          title={
            <>
              Assets you can <em className="text-accent">inspect</em> in 3D.
            </>
          }
          description="Open any asset to orbit the model, check its topology in wireframe and try different lighting. Asset packs open a full render breakdown."
        />

        {/* Controls: mode tabs on the left, category filter on the right */}
        <div className="mb-10 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="flex gap-8 border-b border-line" role="tablist" aria-label="Showcase mode">
            {modes.map((m) => (
              <button
                key={m.id}
                type="button"
                role="tab"
                aria-selected={mode === m.id}
                onClick={() => setMode(m.id)}
                className={`relative -mb-px pb-3 text-[0.9375rem] transition-colors ${mode === m.id ? 'text-ink' : 'text-muted hover:text-ink'}`}
              >
                {m.label} <span className="ml-1 font-mono text-xs text-muted">{m.count}</span>
                {mode === m.id && <motion.span layoutId="mode-underline" className="absolute inset-x-0 bottom-0 h-0.5 bg-ink" />}
              </button>
            ))}
          </div>

          <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" role="group" aria-label="Filter by category">
            {(['All', ...categories] as (AssetCategory | 'All')[]).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                aria-pressed={category === c}
                className={`h-9 shrink-0 rounded-full px-4 text-sm transition-colors ${
                  category === c ? 'bg-ink text-paper' : 'border border-line text-ink-2 hover:border-line-strong hover:text-ink'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`${mode}-${category}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className={mode === 'assets' ? 'grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3' : 'grid gap-x-6 gap-y-12 md:grid-cols-2'}
          >
            {mode === 'assets' ? visibleAssets.map((a) => <AssetCard key={a.id} asset={a} />) : visiblePacks.map((p) => <PackCard key={p.id} pack={p} />)}
          </motion.div>
        </AnimatePresence>
        {empty && <p className="py-16 text-center text-ink-2">Nothing in this category yet.</p>}
      </div>
    </section>
  )
}
