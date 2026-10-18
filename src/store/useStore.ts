import { create } from 'zustand'
import type { Project } from '@/data/portfolioData'

export type LightingPreset = 'studio' | 'sunset' | 'cyberpunk' | 'clay'

export interface Toast {
  id: number
  title: string
  description?: string
  tone: 'success' | 'error' | 'info'
}

interface ViewerSettings {
  wireframe: boolean
  autoRotate: boolean
  lighting: LightingPreset
  /** Incremented to request a camera reset inside the inspector canvas. */
  resetToken: number
}

/** A command for an interactive character in the inspector (see DoraemonModel). */
export interface CharCommand {
  n: number
  cmd: 'clip' | 'expression' | 'look' | 'reset'
  arg?: string
}

interface PortfolioState {
  activeAsset: Project | null
  /** True once the open project's 3D model is on screen (the inspector shows the project's render until then). */
  viewerReady: boolean
  setViewerReady: (ready: boolean) => void
  charCmd: CharCommand | null
  sendCharCmd: (cmd: CharCommand['cmd'], arg?: string) => void
  viewer: ViewerSettings
  toasts: Toast[]
  openAsset: (asset: Project) => void
  closeAsset: () => void
  toggleWireframe: () => void
  toggleAutoRotate: () => void
  setLighting: (preset: LightingPreset) => void
  resetCamera: () => void
  pushToast: (toast: Omit<Toast, 'id'>) => void
  dismissToast: (id: number) => void
}

const defaultViewer: ViewerSettings = { wireframe: false, autoRotate: true, lighting: 'studio', resetToken: 0 }

let toastId = 0

export const useStore = create<PortfolioState>((set) => ({
  activeAsset: null,
  viewerReady: false,
  setViewerReady: (viewerReady) => set({ viewerReady }),
  charCmd: null,
  sendCharCmd: (cmd, arg) => set((s) => ({ charCmd: { n: (s.charCmd?.n ?? 0) + 1, cmd, arg } })),
  viewer: defaultViewer,
  toasts: [],
  openAsset: (activeAsset) => set({ activeAsset, viewerReady: false, viewer: { ...defaultViewer } }),
  closeAsset: () => set({ activeAsset: null }),
  toggleWireframe: () => set((s) => ({ viewer: { ...s.viewer, wireframe: !s.viewer.wireframe } })),
  toggleAutoRotate: () => set((s) => ({ viewer: { ...s.viewer, autoRotate: !s.viewer.autoRotate } })),
  setLighting: (lighting) => set((s) => ({ viewer: { ...s.viewer, lighting } })),
  resetCamera: () => set((s) => ({ viewer: { ...s.viewer, resetToken: s.viewer.resetToken + 1 } })),
  pushToast: (toast) => {
    const id = ++toastId
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }))
    window.setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 5200)
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

/** True while the 3D preview is open — used to pause smooth scroll and the hero. */
export const useModalOpen = () => useStore((s) => s.activeAsset !== null)
