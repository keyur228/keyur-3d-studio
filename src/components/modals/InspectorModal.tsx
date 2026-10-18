import { lazy, Suspense, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Box, ChevronLeft, ChevronRight, Crosshair, Grid3x3, Images, Moon, Palette, RotateCw, Sun, Sunset, X, type LucideIcon } from 'lucide-react'
import { useStore, type LightingPreset } from '@/store/useStore'
import { lightingPresets } from '@/components/three/lightingPresets'
import { scrollToTarget } from '@/lib/scroll'
import { has3D } from '@/lib/project'
import { prefetchProject } from '@/lib/prefetch'
import { CharacterPanel } from './CharacterPanel'

// Code-split: the inspector only downloads when an asset is opened.
const InspectorCanvas = lazy(() => import('@/components/three/InspectorCanvas'))
const LoadProgress = lazy(() => import('@/components/three/LoadProgress'))

const presetIcons: Record<LightingPreset, LucideIcon> = { studio: Sun, sunset: Sunset, cyberpunk: Moon, clay: Palette }
const presetOrder: LightingPreset[] = ['studio', 'sunset', 'cyberpunk', 'clay']

function ToolButton({ active, onClick, icon: Icon, label, hotkey }: { active?: boolean; onClick: () => void; icon: LucideIcon; label: string; hotkey: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={`${label} (${hotkey})`}
      aria-label={label}
      className={`flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] transition-colors ${active ? 'bg-ink text-paper' : 'text-ink-2 hover:bg-paper-2 hover:text-ink'}`}
    >
      <Icon className="h-4 w-4" />
      <span className="hidden md:inline">{label}</span>
    </button>
  )
}

/** Still renders of a project, shown over the viewport when "Renders" is selected. */
function RendersView({ renders, index, onIndex }: { renders: { src: string; caption: string }[]; index: number; onIndex: (i: number) => void }) {
  const step = (d: number) => onIndex((index + d + renders.length) % renders.length)
  return (
    <div className="absolute inset-0 z-[5] flex flex-col bg-paper-2">
      <div className="relative min-h-0 flex-1">
        <AnimatePresence initial={false} mode="popLayout">
          <motion.img
            key={renders[index].src}
            src={renders[index].src}
            alt={renders[index].caption}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0 h-full w-full object-contain"
          />
        </AnimatePresence>
        {renders.length > 1 &&
          [
            { d: -1, Icon: ChevronLeft, pos: 'left-3', label: 'Previous render' },
            { d: 1, Icon: ChevronRight, pos: 'right-3', label: 'Next render' },
          ].map(({ d, Icon, pos, label }) => (
            <button
              key={d}
              type="button"
              onClick={() => step(d)}
              aria-label={label}
              className={`absolute top-1/2 ${pos} grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-line bg-card/95 text-ink shadow-[var(--shadow-soft)]`}
            >
              <Icon className="h-[18px] w-[18px]" />
            </button>
          ))}
      </div>
      <div className="flex items-center justify-between gap-4 border-t border-line bg-card px-4 py-3">
        <p className="truncate text-sm text-ink-2">{renders[index].caption}</p>
        <div className="flex shrink-0 gap-1.5">
          {renders.map((r, i) => (
            <button
              key={r.src}
              type="button"
              onClick={() => onIndex(i)}
              aria-label={`Show render ${i + 1}`}
              aria-current={i === index}
              className={`h-1.5 rounded-full transition-all ${i === index ? 'w-5 bg-ink' : 'w-1.5 bg-line-strong hover:bg-muted'}`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

type View = 'live' | 'renders'

function CanvasFallback() {
  return (
    <div className="absolute inset-0 grid place-items-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-line-strong border-t-accent" />
        <p className="text-sm text-ink-2">Preparing viewport…</p>
      </div>
    </div>
  )
}

export function InspectorModal() {
  const asset = useStore((s) => s.activeAsset)
  const close = useStore((s) => s.closeAsset)
  const viewer = useStore((s) => s.viewer)
  const toggleWireframe = useStore((s) => s.toggleWireframe)
  const toggleAutoRotate = useStore((s) => s.toggleAutoRotate)
  const setLighting = useStore((s) => s.setLighting)
  const resetCamera = useStore((s) => s.resetCamera)
  const renders = asset?.renders ?? []
  const show3D = asset ? has3D(asset) : false
  const views: View[] = asset ? [...(show3D ? ['live' as const] : []), ...(renders.length ? ['renders' as const] : [])] : []
  const [view, setView] = useState<View>('live')
  const [renderIndex, setRenderIndex] = useState(0)
  // the 3D canvas mounts once the open animation has finished: creating the GL context, parsing the model and compiling shaders
  // in the same frames as the animation is what makes it stutter
  const [canvasOn, setCanvasOn] = useState(false)

  // a project opens on its live 3D preview
  useEffect(() => {
    setView(asset && has3D(asset) ? 'live' : 'renders')
    setRenderIndex(0)
    setCanvasOn(false)
    if (!asset) return
    prefetchProject(asset) // normally already warm from hovering the card; this covers keyboard / touch opens
    const t = window.setTimeout(() => setCanvasOn(true), 800) // safety net if the animation callback never fires
    return () => window.clearTimeout(t)
  }, [asset])

  useEffect(() => {
    if (!asset) return
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      const k = e.key.toLowerCase()
      if (k === 'escape') close()
      else if (view !== 'live') return
      else if (k === 'w') toggleWireframe()
      else if (k === 'r') toggleAutoRotate()
      else if (k === 'f') resetCamera()
      else if (['1', '2', '3', '4'].includes(k)) setLighting(presetOrder[Number(k) - 1])
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [asset, view, close, toggleWireframe, toggleAutoRotate, resetCamera, setLighting])

  const requestSimilar = () => {
    close()
    window.setTimeout(() => scrollToTarget('#request'), 350)
  }

  const dark = asset ? lightingPresets[viewer.lighting].dark : false

  return (
    <AnimatePresence>
      {asset && (
        <motion.div
          key={asset.id}
          className="fixed inset-0 z-[80] flex items-stretch justify-center bg-ink/55 md:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={close}
          role="dialog"
          aria-modal="true"
          aria-label={`${asset.title}, project preview`}
        >
          <motion.div
            className="relative flex w-full max-w-[1400px] flex-col overflow-hidden bg-card shadow-[var(--shadow-lift)] md:rounded-[1.5rem] md:border md:border-line lg:flex-row"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.99 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            onAnimationComplete={() => setCanvasOn(true)}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Viewport */}
            <div className="relative h-[56vh] min-h-[320px] flex-1 lg:h-auto">
              {show3D && (canvasOn ? (
                <Suspense fallback={<CanvasFallback />}>
                  <InspectorCanvas asset={asset} />
                </Suspense>
              ) : (
                <CanvasFallback />
              ))}

              {view === 'live' && (
                <div className={`pointer-events-none absolute left-4 top-4 flex flex-col gap-0.5 font-mono text-[11px] ${dark ? 'text-white/70' : 'text-ink-2'}`}>
                  <span>
                    {viewer.wireframe ? 'Wireframe' : lightingPresets[viewer.lighting].label}
                    {asset.polyCount && ` · ${asset.polyCount}`}
                  </span>
                  <Suspense fallback={null}>
                    <LoadProgress size={asset.previewSize} />
                  </Suspense>
                </div>
              )}

              {view === 'live' && asset.interactive && <CharacterPanel dark={dark} />}

              {renders.length > 0 && view === 'renders' && <RendersView renders={renders} index={renderIndex} onIndex={setRenderIndex} />}

              {views.length > 1 && (
                <div className="absolute left-4 top-[3.75rem] z-10 flex rounded-full md:left-1/2 md:top-4 md:-translate-x-1/2 border border-line bg-card/95 p-1 shadow-[var(--shadow-soft)]" role="tablist" aria-label="Preview mode">
                  {views.map((v) => {
                    const [Icon, label] = v === 'live' ? [Box, 'Live 3D'] : [Images, 'Renders']
                    return (
                    <button
                      key={v}
                      type="button"
                      role="tab"
                      aria-selected={view === v}
                      onClick={() => setView(v)}
                      className={`flex h-8 items-center gap-1.5 rounded-full px-3.5 text-[13px] transition-colors ${view === v ? 'bg-ink text-paper' : 'text-ink-2 hover:text-ink'}`}
                    >
                      <Icon className="h-3.5 w-3.5" /> {label}
                    </button>
                    )
                  })}
                </div>
              )}

              <div className={`absolute inset-x-0 bottom-4 flex justify-center px-3 ${view === 'live' ? '' : 'hidden'}`}>
                <div className="flex max-w-full flex-wrap items-center justify-center gap-0.5 rounded-full border border-line bg-card/95 p-1 shadow-[var(--shadow-soft)]">
                  <ToolButton active={viewer.wireframe} onClick={toggleWireframe} icon={Grid3x3} label="Wireframe" hotkey="W" />
                  <ToolButton active={viewer.autoRotate} onClick={toggleAutoRotate} icon={RotateCw} label="Rotate" hotkey="R" />
                  <span className="mx-1 h-5 w-px bg-line" />
                  {presetOrder.map((p, i) => (
                    <ToolButton key={p} active={viewer.lighting === p} onClick={() => setLighting(p)} icon={presetIcons[p]} label={lightingPresets[p].label} hotkey={String(i + 1)} />
                  ))}
                  <span className="mx-1 h-5 w-px bg-line" />
                  <ToolButton onClick={resetCamera} icon={Crosshair} label="Reset" hotkey="F" />
                </div>
              </div>

              <button
                type="button"
                onClick={close}
                aria-label="Close preview"
                className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full border border-line bg-card/95 text-ink shadow-[var(--shadow-soft)] lg:hidden"
              >
                <X className="h-[18px] w-[18px]" />
              </button>
            </div>

            {/* Details */}
            <aside data-lenis-prevent className="relative w-full overflow-y-auto border-t border-line p-6 md:p-8 lg:w-[380px] lg:border-l lg:border-t-0">
              <button
                type="button"
                onClick={close}
                aria-label="Close preview"
                className="absolute right-6 top-6 hidden h-10 w-10 place-items-center rounded-full border border-line text-ink-2 transition-colors hover:border-ink hover:text-ink lg:grid"
              >
                <X className="h-[18px] w-[18px]" />
              </button>

              <p className="eyebrow">{asset.categories.join(' · ')}</p>
              <h3 className="display mt-3 pr-12 text-[2.5rem] text-ink">{asset.title}</h3>
              <p className="mt-1 text-ink-2">{asset.subtitle}</p>
              <p className="mt-6 leading-relaxed text-ink-2">{asset.description}</p>

              {asset.highlights && (
                <ul className="mt-6 space-y-2.5 text-sm leading-relaxed text-ink-2">
                  {asset.highlights.map((h) => (
                    <li key={h} className="flex gap-2.5">
                      <span className="mt-[0.55rem] h-1 w-1 shrink-0 rounded-full bg-accent" />
                      {h}
                    </li>
                  ))}
                </ul>
              )}

              <dl className="mt-8 divide-y divide-line border-y border-line">
                {(
                  [
                    ['Polycount', asset.polyCount],
                    ['Textures', asset.textures],
                    ['Topology', asset.topology],
                    ['Software', asset.software.join(', ')],
                    ['Year', String(asset.year)],
                  ].filter(([, v]) => v) as [string, string][]
                ).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-6 py-3 text-sm">
                    <dt className="text-muted">{k}</dt>
                    <dd className="text-right text-ink">{v}</dd>
                  </div>
                ))}
              </dl>

              <button type="button" onClick={requestSimilar} className="btn btn-primary mt-8 w-full justify-center">
                Request something similar
              </button>
              <p className="mt-4 text-center text-xs text-muted">{show3D ? (asset.interactive ? 'Click the character · drag to orbit · scroll to zoom · Esc to close' : 'Drag to orbit · scroll to zoom · Esc to close') : 'Esc to close'}</p>
            </aside>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
