import { Component, Suspense, use, useEffect, useLayoutEffect, useMemo, type ReactNode } from 'react'
import { useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import type { Project } from '@/data/portfolioData'
import { ProceduralModel } from './ProceduralModels'
import { MorphLoader } from './MorphLoader'

interface ViewProps {
  wireframe: boolean
  clay: boolean
  wireColor: string
}

// ── Model availability check ────────────────────────────────────────────────
// Avoids a noisy loader error when a .glb hasn't been added yet. A missing
// file on most static hosts returns 404 or an HTML fallback page.
const availability = new Map<string, Promise<boolean>>()

function checkModel(url: string) {
  if (!availability.has(url)) {
    availability.set(
      url,
      fetch(url, { method: 'HEAD' })
        .then((res) => res.ok && !(res.headers.get('content-type') ?? '').includes('text/html'))
        .catch(() => false),
    )
  }
  return availability.get(url)!
}


// ── Error boundary (corrupt / unsupported files fall back to procedural) ───
class ModelErrorBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: unknown) {
    console.warn('[Inspector] Model failed to load, using procedural fallback.', error)
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

// ── GLB model ───────────────────────────────────────────────────────────────
const TARGET_SIZE = 2.4
/** Local y of the inspector's ground plane (world y −1.3 minus the model group's +0.15 offset). */
const FLOOR_Y = -1.45

function GLBModel({ url, wireframe, clay }: { url: string } & Omit<ViewProps, 'wireColor'>) {
  const gltf = useGLTF(url)

  // Clone so toggles never mutate the cached original, then normalise scale
  // and centre so any export (cm, m, offset pivots) frames nicely.
  const { root, originals, clayMaterial, midHeight } = useMemo(() => {
    const scene = gltf.scene.clone(true)
    // Game exports ship collision hulls next to the render meshes (glTF extras
    // `collision_proxy`, or Unreal's UCX_ naming). They're physics data, not
    // visuals, so drop them before measuring and rendering.
    const proxies: THREE.Object3D[] = []
    scene.traverse((o) => {
      if (o.userData?.collision_proxy || o.name.startsWith('UCX_')) proxies.push(o)
    })
    proxies.forEach((p) => p.removeFromParent())
    const originals = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>()
    scene.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (!mesh.isMesh) return
      mesh.castShadow = true
      mesh.receiveShadow = true
      mesh.material = Array.isArray(mesh.material) ? mesh.material.map((m) => m.clone()) : mesh.material.clone()
      originals.set(mesh, mesh.material)
    })
    const box = new THREE.Box3().setFromObject(scene)
    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())
    const scale = TARGET_SIZE / Math.max(size.x, size.y, size.z, 1e-6)
    // centre on X/Z and stand the model on the ground plane
    const root = new THREE.Group()
    scene.position.set(-center.x, -box.min.y, -center.z)
    root.add(scene)
    root.scale.setScalar(scale)
    root.position.y = FLOOR_Y
    const midHeight = FLOOR_Y + (size.y * scale) / 2
    const clayMaterial = new THREE.MeshStandardMaterial({ color: '#b4b4bb', roughness: 0.82, metalness: 0 })
    return { root, originals, clayMaterial, midHeight }
  }, [gltf])

  // Aim the orbit camera at the model's middle and make that the reset view.
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null
  const camera = useThree((s) => s.camera)
  useLayoutEffect(() => {
    if (!controls) return
    const targetY = midHeight + 0.15
    const dy = targetY - controls.target.y
    controls.target.y = targetY
    camera.position.y += dy
    controls.update()
    controls.saveState()
  }, [controls, camera, midHeight])

  // Apply wireframe / clay toggles.
  useEffect(() => {
    originals.forEach((orig, mesh) => {
      mesh.material = clay ? clayMaterial : orig
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      mats.forEach((m) => {
        ;(m as THREE.MeshStandardMaterial).wireframe = wireframe
        m.needsUpdate = true
      })
    })
  }, [wireframe, clay, originals, clayMaterial])

  // Free GPU memory when the inspector closes.
  useEffect(
    () => () => {
      originals.forEach((orig) => (Array.isArray(orig) ? orig : [orig]).forEach((m) => m.dispose()))
      clayMaterial.dispose()
      gltf.scene.traverse((o) => {
        const mesh = o as THREE.Mesh
        if (!mesh.isMesh) return
        mesh.geometry?.dispose()
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
        mats.forEach((m) => {
          Object.values(m).forEach((v) => v instanceof THREE.Texture && v.dispose())
          m.dispose()
        })
      })
      useGLTF.clear(url)
    },
    [gltf, originals, clayMaterial, url],
  )

  return <primitive object={root} />
}

/**
 * Renders an asset's .glb when present, otherwise its procedural fallback.
 */
export function AssetModel({ asset, wireframe, clay, wireColor }: { asset: Project } & ViewProps) {
  const fallback = <ProceduralModel id={asset.fallbackModel ?? 'hyperKnot'} wireframe={wireframe} clay={clay} wireColor={wireColor} />
  if (!asset.modelUrl) return fallback

  // The availability check and the download both suspend under one boundary,
  // so the loader plays continuously instead of restarting between them.
  return (
    <ModelErrorBoundary fallback={fallback}>
      <Suspense fallback={<MorphLoader />}>
        <CheckedGLB url={asset.modelUrl} fallback={fallback} wireframe={wireframe} clay={clay} />
      </Suspense>
    </ModelErrorBoundary>
  )
}

function CheckedGLB({ url, fallback, ...view }: { url: string; fallback: ReactNode } & Omit<ViewProps, 'wireColor'>) {
  const available = use(checkModel(url))
  return available ? <GLBModel url={url} {...view} /> : fallback
}
