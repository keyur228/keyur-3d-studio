import { Environment, Lightformer } from '@react-three/drei'
import type { LightingPreset } from '@/store/useStore'

/**
 * HDRI-style lighting built from drei Lightformers — no external HDR files,
 * so every preset works offline and loads instantly.
 */
export const lightingPresets: Record<
  LightingPreset,
  { label: string; background: string; key: string; rim: string; fill: string; ambient: number; floor: string; dark: boolean }
> = {
  studio: { label: 'Studio', background: '#ece5d9', key: '#fff8ee', rim: '#f3d2b4', fill: '#ffffff', ambient: 0.55, floor: '#d3c8b7', dark: false },
  sunset: { label: 'Sunset', background: '#1a0f14', key: '#ffb36b', rim: '#ff5e7e', fill: '#7c3aed', ambient: 0.3, floor: '#3a1e26', dark: true },
  cyberpunk: { label: 'Night', background: '#07060f', key: '#22d3ee', rim: '#e879f9', fill: '#6366f1', ambient: 0.2, floor: '#24133d', dark: true },
  clay: { label: 'Clay', background: '#e6e2dc', key: '#ffffff', rim: '#ffffff', fill: '#e4e0da', ambient: 0.6, floor: '#cfc9c0', dark: false },
}

export function LightingRig({ preset }: { preset: LightingPreset }) {
  const p = lightingPresets[preset]
  return (
    <>
      <color attach="background" args={[p.background]} />
      <fog attach="fog" args={[p.background, 9, 22]} />
      <ambientLight intensity={p.ambient} />
      <directionalLight
        position={[4, 6, 3]}
        intensity={preset === 'cyberpunk' ? 1.2 : 2.2}
        color={p.key}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0004}
      />
      <pointLight position={[-4, 2, -3]} intensity={preset === 'clay' ? 8 : 30} color={p.rim} distance={14} />

      <Environment key={preset} resolution={256} frames={1}>
        <color attach="background" args={[p.background]} />
        {/* key softbox */}
        <Lightformer form="rect" intensity={preset === 'cyberpunk' ? 3 : 4} color={p.key} position={[3, 4, 4]} scale={[6, 3, 1]} target={[0, 0, 0]} />
        {/* rim strip */}
        <Lightformer form="rect" intensity={3} color={p.rim} position={[-5, 1, -3]} scale={[1, 8, 1]} target={[0, 0, 0]} />
        {/* fill */}
        <Lightformer form="circle" intensity={1.5} color={p.fill} position={[-4, -1, 4]} scale={4} target={[0, 0, 0]} />
        {/* top ring */}
        <Lightformer form="ring" intensity={2} color={p.key} position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={5} />
        {preset === 'cyberpunk' && (
          <>
            <Lightformer form="rect" intensity={6} color="#22d3ee" position={[5, 0, -2]} scale={[0.4, 10, 1]} target={[0, 0, 0]} />
            <Lightformer form="rect" intensity={6} color="#e879f9" position={[-5, 0, 2]} scale={[0.4, 10, 1]} target={[0, 0, 0]} />
          </>
        )}
        {preset === 'sunset' && <Lightformer form="rect" intensity={5} color="#ff8a3d" position={[0, 0.5, -8]} scale={[16, 2, 1]} target={[0, 0, 0]} />}
      </Environment>
    </>
  )
}
