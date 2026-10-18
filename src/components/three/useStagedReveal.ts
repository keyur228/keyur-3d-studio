import { useEffect, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

const TEXTURE_SLOTS = [
  'map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap', 'bumpMap', 'alphaMap', 'lightMap',
  'sheenColorMap', 'sheenRoughnessMap', 'clearcoatMap', 'clearcoatNormalMap', 'clearcoatRoughnessMap', 'anisotropyMap',
  'specularIntensityMap', 'specularColorMap', 'transmissionMap', 'thicknessMap',
] as const

/**
 * Brings a freshly loaded model on screen without a hitch.
 * Uploading every texture to the GPU and compiling its shaders in the first rendered frame freezes the page for a few hundred
 * milliseconds (and the loader animation with it). Instead the model stays hidden while
 *   1. its textures are uploaded a few milliseconds' worth per frame (`renderer.initTexture`), then
 *   2. its shader programs are compiled without blocking (`renderer.compileAsync`),
 * and only then it appears. Returns false until that has finished, so callers keep the loader up.
 */
export function useStagedReveal(root: THREE.Object3D) {
  const gl = useThree((s) => s.gl)
  const camera = useThree((s) => s.camera)
  const scene = useThree((s) => s.scene)
  const [ready, setReady] = useState(false)
  const job = useRef<{ queue: THREE.Texture[]; phase: 'upload' | 'compile' | 'done' } | null>(null)

  useEffect(() => {
    const textures = new Set<THREE.Texture>()
    root.traverse((o) => {
      const material = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined
      if (!material) return
      for (const m of Array.isArray(material) ? material : [material]) {
        for (const slot of TEXTURE_SLOTS) {
          const t = (m as unknown as Record<string, unknown>)[slot]
          if (t instanceof THREE.Texture) textures.add(t)
        }
      }
    })
    root.visible = false
    const j: { queue: THREE.Texture[]; phase: 'upload' | 'compile' | 'done' } = { queue: [...textures], phase: 'upload' }
    job.current = j
    setReady(false)
    return () => {
      if (job.current === j) job.current = null
      root.visible = true
    }
  }, [root])

  useFrame(() => {
    const j = job.current
    if (!j || j.phase !== 'upload') return
    const start = performance.now()
    while (j.queue.length && performance.now() - start < 5) {
      try {
        gl.initTexture(j.queue.shift()!)
      } catch {
        /* a texture that can't be pre-uploaded is simply uploaded on first use */
      }
    }
    if (j.queue.length) return
    j.phase = 'compile'
    const finish = () => {
      if (job.current !== j) return
      j.phase = 'done'
      root.visible = true
      setReady(true)
    }
    if (typeof gl.compileAsync === 'function') gl.compileAsync(root, camera, scene).then(finish, finish)
    else finish()
  })

  return ready
}
