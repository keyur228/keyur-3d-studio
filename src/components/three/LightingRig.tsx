import { Environment, Lightformer } from '@react-three/drei'
import type { LightingPreset } from '@/store/useStore'
import { lightingPresets } from './lightingPresets'

export { lightingPresets }

/**
 * HDRI-style lighting built from drei Lightformers — no external HDR files,
 * so every preset works offline and loads instantly.
 */
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
