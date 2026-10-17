import { useEffect, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { ContactShadows, GizmoHelper, GizmoViewport, Grid, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import type { Project } from '@/data/portfolioData'
import { useStore } from '@/store/useStore'
import { AssetModel } from './AssetModel'
import { LightingRig, lightingPresets } from './LightingRig'

const CAMERA_START: [number, number, number] = [3.4, 2.1, 4.4]

/** Portrait viewports (phones) get a wider shot so the model isn't cropped. */
function startPosition(): [number, number, number] {
  const k = typeof window !== 'undefined' && window.innerWidth < 1024 ? 1.4 : 1
  return CAMERA_START.map((v) => v * k) as [number, number, number]
}

function Controls() {
  const ref = useRef<OrbitControlsImpl>(null)
  const autoRotate = useStore((s) => s.viewer.autoRotate)
  const resetToken = useStore((s) => s.viewer.resetToken)

  useEffect(() => {
    if (resetToken > 0) ref.current?.reset()
  }, [resetToken])

  return (
    <OrbitControls
      ref={ref}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      autoRotate={autoRotate}
      autoRotateSpeed={1.4}
      enablePan
      minDistance={2.2}
      maxDistance={11}
      maxPolarAngle={Math.PI * 0.62}
      target={[0, 0, 0]}
    />
  )
}

/**
 * The live WebGL inspector. Mounted only while the modal is open; R3F disposes
 * the renderer + scene graph and force-loses the GL context on unmount.
 */
export default function InspectorCanvas({ asset }: { asset: Project }) {
  const { wireframe, lighting } = useStore((s) => s.viewer)
  const clay = lighting === 'clay'
  const preset = lightingPresets[lighting]

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: startPosition(), fov: 38, near: 0.1, far: 60 }}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, powerPreference: 'high-performance' }}
      className="!touch-none"
    >
      <LightingRig preset={lighting} />

      <group position={[0, 0.15, 0]}>
        <AssetModel asset={asset} wireframe={wireframe} clay={clay} wireColor={preset.dark ? '#d6dbff' : '#3f352b'} />
      </group>

      <ContactShadows position={[0, -1.3, 0]} opacity={preset.dark ? 0.65 : 0.4} scale={9} blur={2.4} far={3} resolution={512} color={preset.dark ? '#000000' : '#3a2a1a'} />
      <Grid
        position={[0, -1.31, 0]}
        args={[30, 30]}
        cellSize={0.5}
        cellThickness={0.6}
        cellColor={preset.floor}
        sectionSize={2.5}
        sectionThickness={1}
        sectionColor={lighting === 'cyberpunk' ? '#6d28d9' : preset.dark ? '#e87d0d' : '#c9a487'}
        fadeDistance={16}
        fadeStrength={1.5}
        infiniteGrid
      />

      <Controls />

      <GizmoHelper alignment="top-right" margin={[72, 112]}>
        <GizmoViewport axisColors={['#d9534f', '#6a9a3a', '#3d7bd9']} labelColor="#fbf8f2" />
      </GizmoHelper>
    </Canvas>
  )
}
