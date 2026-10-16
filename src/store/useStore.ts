import { create } from 'zustand'
import type { AssetCategory, AssetPack, IndividualAsset } from '@/data/portfolioData'

export type ShowcaseMode = 'assets' | 'packs'
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

interface PortfolioState {
  showcaseMode: ShowcaseMode
  category: AssetCategory | 'All'
  activeAsset: IndividualAsset | null
  activePack: AssetPack | null
  viewer: ViewerSettings
  toasts: Toast[]
  setShowcaseMode: (mode: ShowcaseMode) => void
  setCategory: (category: AssetCategory | 'All') => void
  openAsset: (asset: IndividualAsset) => void
  closeAsset: () => void
  openPack: (pack: AssetPack) => void
  closePack: () => void
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
  showcaseMode: 'assets',
  category: 'All',
  activeAsset: null,
  activePack: null,
  viewer: defaultViewer,
  toasts: [],
  setShowcaseMode: (showcaseMode) => set({ showcaseMode, category: 'All' }),
  setCategory: (category) => set({ category }),
  openAsset: (activeAsset) => set({ activeAsset, viewer: { ...defaultViewer } }),
  closeAsset: () => set({ activeAsset: null }),
  openPack: (activePack) => set({ activePack }),
  closePack: () => set({ activePack: null }),
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

/** True while any modal is open — used to pause background WebGL and smooth scroll. */
export const useModalOpen = () => useStore((s) => s.activeAsset !== null || s.activePack !== null)
