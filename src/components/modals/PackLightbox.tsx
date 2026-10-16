import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion, type PanInfo } from 'framer-motion'
import { ArrowUpRight, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { scrollToTarget } from '@/lib/scroll'

const slide = {
  enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
}

export function PackLightbox() {
  const pack = useStore((s) => s.activePack)
  const close = useStore((s) => s.closePack)
  const [[index, dir], setIndex] = useState<[number, number]>([0, 0])

  useEffect(() => setIndex([0, 0]), [pack?.id])

  const count = pack?.galleryImages.length ?? 0
  const go = useCallback((step: number) => setIndex(([i]) => [(i + step + count) % count, step]), [count])

  useEffect(() => {
    if (!pack) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      if (e.key === 'ArrowRight') go(1)
      if (e.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pack, close, go])

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -60 || info.velocity.x < -400) go(1)
    else if (info.offset.x > 60 || info.velocity.x > 400) go(-1)
  }

  const requestCustom = () => {
    close()
    window.setTimeout(() => scrollToTarget('#request'), 350)
  }

  return (
    <AnimatePresence>
      {pack && (
        <motion.div
          key={pack.id}
          className="fixed inset-0 z-[80] flex items-stretch justify-center bg-ink/40 backdrop-blur-sm md:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={close}
          role="dialog"
          aria-modal="true"
          aria-label={`${pack.title} — asset pack gallery`}
        >
          <motion.div
            data-lenis-prevent
            className="relative flex w-full max-w-[1400px] flex-col overflow-y-auto bg-card shadow-[var(--shadow-lift)] md:rounded-[1.5rem] md:border md:border-line lg:flex-row lg:overflow-hidden"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.99 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Gallery */}
            <div className="flex min-w-0 flex-1 flex-col gap-3 p-3 md:p-5">
              <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl bg-paper-2">
                <AnimatePresence initial={false} custom={dir} mode="popLayout">
                  <motion.img
                    key={index}
                    src={pack.galleryImages[index].src}
                    alt={pack.galleryImages[index].caption}
                    custom={dir}
                    variants={slide}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.2}
                    onDragEnd={onDragEnd}
                    draggable={false}
                    className="absolute inset-0 h-full w-full cursor-grab object-cover active:cursor-grabbing"
                  />
                </AnimatePresence>
                {[
                  { step: -1, Icon: ChevronLeft, pos: 'left-3', label: 'Previous image' },
                  { step: 1, Icon: ChevronRight, pos: 'right-3', label: 'Next image' },
                ].map(({ step, Icon, pos, label }) => (
                  <button
                    key={step}
                    type="button"
                    aria-label={label}
                    onClick={() => go(step)}
                    className={`absolute top-1/2 ${pos} grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-line bg-card/95 text-ink shadow-[var(--shadow-soft)] transition-colors hover:bg-card`}
                  >
                    <Icon className="h-[18px] w-[18px]" />
                  </button>
                ))}
                <button
                  type="button"
                  onClick={close}
                  aria-label="Close gallery"
                  className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full border border-line bg-card/95 text-ink shadow-[var(--shadow-soft)] lg:hidden"
                >
                  <X className="h-[18px] w-[18px]" />
                </button>
              </div>

              <div className="flex items-baseline justify-between gap-4 px-1">
                <p className="text-sm text-ink">
                  <span className="text-muted">{pack.galleryImages[index].kind} — </span>
                  {pack.galleryImages[index].caption}
                </p>
                <span className="shrink-0 font-mono text-xs text-muted">
                  {index + 1} / {count}
                </span>
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1">
                {pack.galleryImages.map((img, i) => (
                  <button
                    key={img.src}
                    type="button"
                    onClick={() => setIndex([i, i > index ? 1 : -1])}
                    aria-label={`Show ${img.caption}`}
                    aria-current={i === index}
                    className={`relative aspect-[16/10] w-24 shrink-0 overflow-hidden rounded-lg border-2 transition md:w-28 ${i === index ? 'border-ink' : 'border-transparent opacity-60 hover:opacity-100'}`}
                  >
                    <img src={img.src} alt="" className="h-full w-full object-cover" loading="lazy" />
                  </button>
                ))}
              </div>
            </div>

            {/* Breakdown */}
            <aside data-lenis-prevent className="relative w-full border-t border-line p-6 md:p-8 lg:w-[400px] lg:overflow-y-auto lg:border-l lg:border-t-0">
              <button
                type="button"
                onClick={close}
                aria-label="Close gallery"
                className="absolute right-6 top-6 hidden h-10 w-10 place-items-center rounded-full border border-line text-ink-2 transition-colors hover:border-ink hover:text-ink lg:grid"
              >
                <X className="h-[18px] w-[18px]" />
              </button>
              <p className="eyebrow">Asset pack · {pack.assetCount}</p>
              <h3 className="display mt-3 pr-12 text-[2.5rem] text-ink">{pack.title}</h3>
              <p className="mt-1 text-ink-2">{pack.tagline}</p>
              <p className="mt-6 leading-relaxed text-ink-2">{pack.description}</p>

              <h4 className="eyebrow mt-10">What&apos;s inside</h4>
              <div className="mt-4 space-y-5">
                {pack.contents.map((c) => (
                  <div key={c.group}>
                    <p className="text-sm font-medium text-ink">{c.group}</p>
                    <ul className="mt-1.5 space-y-1 text-sm text-ink-2">
                      {c.items.map((it) => (
                        <li key={it}>{it}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              <h4 className="eyebrow mt-10">Specs</h4>
              <dl className="mt-3 divide-y divide-line border-y border-line">
                {[...pack.specs, { label: 'Formats', value: pack.formats.join(', ') }].map((s) => (
                  <div key={s.label} className="flex justify-between gap-6 py-3 text-sm">
                    <dt className="text-muted">{s.label}</dt>
                    <dd className="text-right text-ink">{s.value}</dd>
                  </div>
                ))}
              </dl>

              <div className="mt-8 flex flex-col gap-3">
                {pack.storeUrl && (
                  <a href={pack.storeUrl} target="_blank" rel="noreferrer" className="btn btn-primary justify-center">
                    Get this pack {pack.price && `· ${pack.price}`} <ArrowUpRight className="h-4 w-4" />
                  </a>
                )}
                <button type="button" onClick={requestCustom} className={`btn justify-center ${pack.storeUrl ? 'btn-ghost' : 'btn-primary'}`}>
                  Request a custom pack
                </button>
              </div>
            </aside>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
