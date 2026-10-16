import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type * as THREE from 'three'

/**
 * Stylised 3D loader shown while a model streams in. Download progress is
 * rendered by the modal HUD (drei's `useProgress` store works outside the canvas).
 */
export function LoadingSpinner3D() {
  const outer = useRef<THREE.Mesh>(null)
  const inner = useRef<THREE.Mesh>(null)
  const ring = useRef<THREE.Mesh>(null)

  useFrame((state, dt) => {
    if (outer.current) {
      outer.current.rotation.x += dt * 0.8
      outer.current.rotation.y += dt * 1.2
    }
    if (inner.current) {
      inner.current.rotation.y -= dt * 2
      inner.current.rotation.z += dt * 0.6
    }
    if (ring.current) ring.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 4) * 0.08)
  })

  return (
    <group>
      <mesh ref={outer}>
        <icosahedronGeometry args={[0.9, 1]} />
        <meshBasicMaterial color="#6366f1" wireframe transparent opacity={0.7} />
      </mesh>
      <mesh ref={inner}>
        <octahedronGeometry args={[0.4, 0]} />
        <meshBasicMaterial color="#e87d0d" wireframe />
      </mesh>
      <mesh ref={ring} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.25, 0.01, 8, 96]} />
        <meshBasicMaterial color="#06b6d4" toneMapped={false} />
      </mesh>
    </group>
  )
}
