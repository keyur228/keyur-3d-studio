import type { Project } from '@/data/portfolioData'

/**
 * Warm-up helpers so opening a project doesn't start from zero:
 *  - the 3D viewer chunk (three + r3f) is fetched once the page is idle,
 *  - a project's model is fetched at low priority when its card is hovered, focused or touched.
 * Both are skipped on Save-Data / 2G connections. The service worker keeps the model for the next visit.
 */
let viewer: Promise<unknown> | null = null
const warmed = new Set<string>()

const constrained = () => {
  const c = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection
  return Boolean(c?.saveData || /(^|-)2g$/.test(c?.effectiveType ?? ''))
}

export function prefetchViewer() {
  if (constrained()) return
  viewer ??= import('@/components/three/InspectorCanvas')
}

export function prefetchProject(p: Project) {
  if (constrained()) return
  prefetchViewer()
  const url = p.modelUrl
  if (!url || warmed.has(url)) return
  warmed.add(url)
  fetch(url, { priority: 'low' } as RequestInit)
    .then((r) => (r.ok ? r.blob() : Promise.reject(new Error(String(r.status)))))
    .catch(() => warmed.delete(url))
}

/** Fetch the viewer code after first paint, when the main thread and network are idle. */
export function warmViewerWhenIdle() {
  const run = () => prefetchViewer()
  const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback
  if (ric) ric(run, { timeout: 5000 })
  else window.setTimeout(run, 2500)
}
