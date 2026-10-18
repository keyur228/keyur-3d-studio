import type { LightingPreset } from '@/store/useStore'

/** Preset colours (kept free of three / drei imports so the modal can show labels without loading the 3D chunk). */
export const lightingPresets: Record<
  LightingPreset,
  { label: string; background: string; key: string; rim: string; fill: string; ambient: number; floor: string; dark: boolean }
> = {
  studio: { label: 'Studio', background: '#ece5d9', key: '#fff8ee', rim: '#f3d2b4', fill: '#ffffff', ambient: 0.55, floor: '#d3c8b7', dark: false },
  sunset: { label: 'Sunset', background: '#1a0f14', key: '#ffb36b', rim: '#ff5e7e', fill: '#7c3aed', ambient: 0.3, floor: '#3a1e26', dark: true },
  cyberpunk: { label: 'Night', background: '#07060f', key: '#22d3ee', rim: '#e879f9', fill: '#6366f1', ambient: 0.2, floor: '#24133d', dark: true },
  clay: { label: 'Clay', background: '#e6e2dc', key: '#ffffff', rim: '#ffffff', fill: '#e4e0da', ambient: 0.6, floor: '#cfc9c0', dark: false },
}
