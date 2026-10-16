import { createContext, useContext, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Float, MeshDistortMaterial, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import type { ProceduralModelId } from '@/data/portfolioData'

/**
 * Procedural fallback models. These render in the live inspector whenever an
 * asset has no .glb yet (or its file fails to load), so the viewer works
 * out-of-the-box. Every material reads the viewer's wireframe / clay state.
 */

interface MatState {
  wireframe: boolean
  clay: boolean
  /** Wire colour chosen for contrast against the current lighting backdrop. */
  wireColor: string
}
const MatContext = createContext<MatState>({ wireframe: false, clay: false, wireColor: '#3f352b' })

interface MatProps {
  color: string
  metalness?: number
  roughness?: number
  emissive?: string
  emissiveIntensity?: number
  flatShading?: boolean
  physical?: boolean
  clearcoat?: number
  iridescence?: number
  transmission?: number
  thickness?: number
  opacity?: number
}

const CLAY = '#b4b4bb'

function Mat({
  color,
  metalness = 0.2,
  roughness = 0.5,
  emissive,
  emissiveIntensity = 0,
  flatShading = false,
  physical = false,
  clearcoat = 0,
  iridescence = 0,
  transmission = 0,
  thickness = 0,
  opacity = 1,
}: MatProps) {
  const { wireframe, clay, wireColor } = useContext(MatContext)

  if (clay) {
    return <meshStandardMaterial key="clay" color={CLAY} roughness={0.82} metalness={0} flatShading={flatShading} wireframe={wireframe} />
  }
  if (wireframe) {
    return <meshBasicMaterial key="wire" color={emissive && emissiveIntensity > 0.5 ? emissive : wireColor} wireframe />
  }
  if (physical) {
    return (
      <meshPhysicalMaterial
        key="physical"
        color={color}
        metalness={metalness}
        roughness={roughness}
        emissive={emissive ?? '#000000'}
        emissiveIntensity={emissiveIntensity}
        flatShading={flatShading}
        clearcoat={clearcoat}
        clearcoatRoughness={0.08}
        iridescence={iridescence}
        iridescenceIOR={1.6}
        iridescenceThicknessRange={[120, 680]}
        transmission={transmission}
        thickness={thickness}
        transparent={opacity < 1}
        opacity={opacity}
      />
    )
  }
  return (
    <meshStandardMaterial
      key="standard"
      color={color}
      metalness={metalness}
      roughness={roughness}
      emissive={emissive ?? '#000000'}
      emissiveIntensity={emissiveIntensity}
      flatShading={flatShading}
      transparent={opacity < 1}
      opacity={opacity}
    />
  )
}

// ── Models ───────────────────────────────────────────────────────────────────

function HyperKnot() {
  return (
    <mesh castShadow rotation={[0.3, 0, 0]} scale={0.78}>
      <torusKnotGeometry args={[0.95, 0.3, 360, 56, 2, 3]} />
      <Mat color="#4f46e5" physical metalness={0.55} roughness={0.12} clearcoat={1} iridescence={1} />
    </mesh>
  )
}

function Shard({ position, rotation, height, radius, color }: { position: [number, number, number]; rotation: [number, number, number]; height: number; radius: number; color: string }) {
  return (
    <group position={position} rotation={rotation}>
      <mesh castShadow position={[0, height / 2, 0]}>
        <cylinderGeometry args={[radius, radius * 1.1, height, 6]} />
        <Mat color={color} physical flatShading metalness={0.05} roughness={0.08} transmission={0.55} thickness={0.8} emissive={color} emissiveIntensity={0.35} />
      </mesh>
      <mesh castShadow position={[0, height + radius * 0.9, 0]}>
        <coneGeometry args={[radius, radius * 1.8, 6]} />
        <Mat color={color} physical flatShading metalness={0.05} roughness={0.08} transmission={0.55} thickness={0.8} emissive={color} emissiveIntensity={0.45} />
      </mesh>
    </group>
  )
}

function CrystalCluster() {
  type V3 = [number, number, number]
  const shards = useMemo<{ p: V3; r: V3; h: number; rad: number; c: string }[]>(
    () =>
      [
        { p: [0, -0.9, 0], r: [0, 0, 0], h: 1.7, rad: 0.32, c: '#a855f7' },
        { p: [0.45, -0.95, 0.15], r: [0.15, 0, -0.45], h: 1.1, rad: 0.24, c: '#c084fc' },
        { p: [-0.45, -0.95, 0.1], r: [-0.1, 0, 0.5], h: 1.25, rad: 0.25, c: '#22d3ee' },
        { p: [0.1, -0.95, -0.45], r: [-0.5, 0, 0.1], h: 1.0, rad: 0.22, c: '#818cf8' },
        { p: [-0.15, -0.95, 0.5], r: [0.55, 0, -0.1], h: 0.8, rad: 0.18, c: '#e879f9' },
        { p: [0.75, -1.0, -0.3], r: [-0.2, 0, -0.8], h: 0.6, rad: 0.15, c: '#22d3ee' },
        { p: [-0.7, -1.0, -0.35], r: [-0.3, 0, 0.8], h: 0.55, rad: 0.14, c: '#a855f7' },
      ],
    [],
  )
  return (
    <group>
      <mesh castShadow receiveShadow position={[0, -1.05, 0]} scale={[1.3, 0.4, 1.1]}>
        <dodecahedronGeometry args={[0.9, 0]} />
        <Mat color="#2a2733" flatShading roughness={0.9} />
      </mesh>
      {shards.map((s, i) => (
        <Shard key={i} position={s.p} rotation={s.r} height={s.h} radius={s.rad} color={s.c} />
      ))}
    </group>
  )
}

function MechDrone() {
  const rotors = useRef<THREE.Group[]>([])
  const body = useRef<THREE.Group>(null)
  useFrame((state, dt) => {
    rotors.current.forEach((r, i) => r && (r.rotation.y += dt * (i % 2 ? -28 : 28)))
    if (body.current) body.current.position.y = Math.sin(state.clock.elapsedTime * 1.6) * 0.06
  })
  const arms: [number, number][] = [
    [1, 1],
    [-1, 1],
    [1, -1],
    [-1, -1],
  ]
  return (
    <group ref={body}>
      <RoundedBox args={[1.25, 0.42, 0.95]} radius={0.16} smoothness={4} castShadow>
        <Mat color="#3b3f4d" metalness={0.75} roughness={0.32} />
      </RoundedBox>
      <RoundedBox args={[0.9, 0.18, 0.7]} radius={0.08} position={[0, 0.27, 0]} castShadow>
        <Mat color="#565b6d" metalness={0.7} roughness={0.28} />
      </RoundedBox>
      {/* sensor eye */}
      <mesh position={[0, -0.02, 0.48]}>
        <cylinderGeometry args={[0.13, 0.13, 0.08, 32]} />
        <Mat color="#0b0c12" metalness={0.9} roughness={0.2} />
      </mesh>
      <mesh position={[0, -0.02, 0.53]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.08, 32]} />
        <meshBasicMaterial color="#22d3ee" toneMapped={false} />
      </mesh>
      {/* status strips */}
      {[-0.45, 0.45].map((x) => (
        <mesh key={x} position={[x, -0.12, 0.476]}>
          <boxGeometry args={[0.22, 0.04, 0.01]} />
          <Mat color="#e87d0d" emissive="#e87d0d" emissiveIntensity={2.5} />
        </mesh>
      ))}
      {arms.map(([x, z], i) => (
        <group key={i} position={[x * 0.62, 0.05, z * 0.47]} rotation={[0, Math.atan2(x, z), 0]}>
          <mesh position={[0, 0, 0.32]} castShadow>
            <boxGeometry args={[0.14, 0.1, 0.64]} />
            <Mat color="#2b2e39" metalness={0.8} roughness={0.35} />
          </mesh>
          <group position={[0, 0.06, 0.7]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.11, 0.13, 0.2, 24]} />
              <Mat color="#4a4f60" metalness={0.8} roughness={0.25} />
            </mesh>
            <mesh position={[0, -0.12, 0]}>
              <torusGeometry args={[0.42, 0.025, 8, 48]} />
              <Mat color="#1f2230" metalness={0.6} roughness={0.4} />
            </mesh>
            <group ref={(g) => { if (g) rotors.current[i] = g }} position={[0, 0.13, 0]}>
              {[0, Math.PI / 2].map((r) => (
                <mesh key={r} rotation={[0, r, 0]}>
                  <boxGeometry args={[0.8, 0.012, 0.07]} />
                  <Mat color="#9ca3af" metalness={0.6} roughness={0.3} opacity={0.85} />
                </mesh>
              ))}
            </group>
          </group>
        </group>
      ))}
      {/* landing skids */}
      {[-0.32, 0.32].map((x) => (
        <mesh key={x} position={[x, -0.36, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <capsuleGeometry args={[0.035, 0.9, 4, 12]} />
          <Mat color="#1f2230" metalness={0.7} roughness={0.4} />
        </mesh>
      ))}
    </group>
  )
}

function SciFiCrate() {
  return (
    <group position={[0, -0.15, 0]}>
      <RoundedBox args={[1.7, 1.25, 1.2]} radius={0.08} smoothness={3} castShadow receiveShadow>
        <Mat color="#3f4656" metalness={0.65} roughness={0.42} />
      </RoundedBox>
      {/* inset panels */}
      {[0.61, -0.61].map((z) => (
        <RoundedBox key={z} args={[1.35, 0.9, 0.04]} radius={0.02} position={[0, 0, z]} castShadow>
          <Mat color="#2d323e" metalness={0.7} roughness={0.5} />
        </RoundedBox>
      ))}
      {[0.86, -0.86].map((x) => (
        <RoundedBox key={x} args={[0.04, 0.9, 0.85]} radius={0.02} position={[x, 0, 0]}>
          <Mat color="#2d323e" metalness={0.7} roughness={0.5} />
        </RoundedBox>
      ))}
      {/* emissive strips */}
      {[0.63, -0.63].map((z) => (
        <mesh key={z} position={[0, 0.25, z]}>
          <boxGeometry args={[1.1, 0.05, 0.02]} />
          <Mat color="#e87d0d" emissive="#e87d0d" emissiveIntensity={3} />
        </mesh>
      ))}
      <mesh position={[0.88, 0.25, 0]}>
        <boxGeometry args={[0.02, 0.05, 0.6]} />
        <Mat color="#06b6d4" emissive="#06b6d4" emissiveIntensity={3} />
      </mesh>
      {/* lid + handles */}
      <RoundedBox args={[1.3, 0.14, 0.9]} radius={0.05} position={[0, 0.69, 0]} castShadow>
        <Mat color="#525a6c" metalness={0.7} roughness={0.35} />
      </RoundedBox>
      {[-0.45, 0.45].map((x) => (
        <mesh key={x} position={[x, 0.8, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <torusGeometry args={[0.1, 0.025, 8, 24, Math.PI]} />
          <Mat color="#9ca3af" metalness={0.9} roughness={0.2} />
        </mesh>
      ))}
      {/* corner bolts */}
      {[-1, 1].flatMap((x) =>
        [-1, 1].flatMap((y) =>
          [-1, 1].map((z) => (
            <mesh key={`${x}${y}${z}`} position={[x * 0.8, y * 0.57, z * 0.56]}>
              <cylinderGeometry args={[0.045, 0.045, 0.06, 6]} />
              <Mat color="#c0c4cc" metalness={0.95} roughness={0.2} />
            </mesh>
          )),
        ),
      )}
      {/* side crate */}
      <RoundedBox args={[0.7, 0.55, 0.6]} radius={0.05} position={[1.35, -0.35, 0.25]} rotation={[0, -0.35, 0]} castShadow>
        <Mat color="#4a5266" metalness={0.65} roughness={0.42} />
      </RoundedBox>
    </group>
  )
}

function EnergyCore() {
  const rings = useRef<THREE.Mesh[]>([])
  const core = useRef<THREE.Mesh>(null)
  useFrame((state, dt) => {
    const [a, b, c] = rings.current
    if (a) a.rotation.x += dt * 0.9
    if (b) b.rotation.y += dt * 0.7
    if (c) { c.rotation.z += dt * 1.1; c.rotation.x += dt * 0.3 }
    if (core.current) core.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 3) * 0.04)
  })
  return (
    <group position={[0, 0.1, 0]}>
      <mesh ref={core}>
        <icosahedronGeometry args={[0.45, 4]} />
        <Mat color="#22d3ee" emissive="#22d3ee" emissiveIntensity={2.4} roughness={0.2} />
      </mesh>
      <mesh>
        <icosahedronGeometry args={[0.62, 1]} />
        <Mat color="#6366f1" metalness={0.2} roughness={0.1} emissive="#6366f1" emissiveIntensity={0.4} opacity={0.25} />
      </mesh>
      {[1.0, 1.2, 1.4].map((r, i) => (
        <mesh key={r} ref={(m) => { if (m) rings.current[i] = m }} rotation={[i * 0.7, i * 0.4, 0]} castShadow>
          <torusGeometry args={[r, 0.045 + i * 0.01, 16, 96]} />
          <Mat color={i === 1 ? '#e87d0d' : '#cbd5e1'} metalness={0.95} roughness={0.18} />
        </mesh>
      ))}
      <mesh position={[0, -1.2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.7, 0.9, 0.25, 8]} />
        <Mat color="#1c1e28" metalness={0.8} roughness={0.35} flatShading />
      </mesh>
      <mesh position={[0, -1.06, 0]}>
        <torusGeometry args={[0.6, 0.02, 8, 64]} />
        <Mat color="#22d3ee" emissive="#22d3ee" emissiveIntensity={3} />
      </mesh>
    </group>
  )
}

function LowPolyTree() {
  return (
    <group position={[0, -1.1, 0]}>
      <mesh castShadow position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.1, 0.17, 1.0, 6]} />
        <Mat color="#6b4423" flatShading roughness={0.9} />
      </mesh>
      {[
        { y: 1.15, r: 0.95, h: 1.1, c: '#2f9e6b' },
        { y: 1.7, r: 0.75, h: 0.95, c: '#38b27a' },
        { y: 2.18, r: 0.5, h: 0.8, c: '#4cc58c' },
      ].map((l) => (
        <mesh key={l.y} castShadow position={[0, l.y, 0]}>
          <coneGeometry args={[l.r, l.h, 7]} />
          <Mat color={l.c} flatShading roughness={0.75} />
        </mesh>
      ))}
      {[
        [0.85, 0.12, 0.45, 0.28],
        [-0.7, 0.1, 0.6, 0.2],
        [0.3, 0.08, -0.8, 0.16],
      ].map(([x, y, z, s], i) => (
        <mesh key={i} castShadow position={[x, y, z]} scale={[s * 1.3, s, s]}>
          <dodecahedronGeometry args={[1, 0]} />
          <Mat color="#6b7280" flatShading roughness={0.95} />
        </mesh>
      ))}
      <mesh receiveShadow position={[0, 0.0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.3, 7]} />
        <Mat color="#1f3b2d" flatShading roughness={1} />
      </mesh>
    </group>
  )
}

function MonolithShrine() {
  return (
    <group position={[0, -1.1, 0]}>
      <mesh castShadow receiveShadow position={[0, 0.1, 0]}>
        <boxGeometry args={[2.2, 0.2, 2.2]} />
        <Mat color="#8a7656" roughness={0.9} flatShading />
      </mesh>
      <mesh castShadow receiveShadow position={[0, 0.27, 0]}>
        <boxGeometry args={[1.6, 0.14, 1.6]} />
        <Mat color="#9c8662" roughness={0.9} />
      </mesh>
      {[
        [-0.85, 1.3],
        [0.85, 1.6],
        [-0.85, 1.05],
        [0.85, 1.45],
      ].map(([x, h], i) => {
        const z = i < 2 ? -0.85 : 0.85
        return (
          <group key={i} position={[x, 0.2 + h / 2, z]} rotation={[0, i * 0.2, i === 2 ? 0.08 : 0]}>
            <mesh castShadow>
              <boxGeometry args={[0.32, h, 0.32]} />
              <Mat color="#a8906b" roughness={0.85} flatShading />
            </mesh>
            <mesh castShadow position={[0, h / 2 + 0.05, 0]}>
              <boxGeometry args={[0.42, 0.1, 0.42]} />
              <Mat color="#8a7656" roughness={0.9} />
            </mesh>
          </group>
        )
      })}
      <Float speed={2} rotationIntensity={1.2} floatIntensity={0.6}>
        <mesh castShadow position={[0, 1.55, 0]}>
          <octahedronGeometry args={[0.38, 0]} />
          <Mat color="#f59e0b" emissive="#f59e0b" emissiveIntensity={1.6} metalness={0.3} roughness={0.25} flatShading />
        </mesh>
      </Float>
      <mesh position={[0, 0.35, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.45, 0.52, 6]} />
        <Mat color="#f59e0b" emissive="#f59e0b" emissiveIntensity={2.5} />
      </mesh>
    </group>
  )
}

function LiquidOrb() {
  const { wireframe, clay, wireColor } = useContext(MatContext)
  return (
    <group>
      <mesh castShadow>
        <icosahedronGeometry args={[1.05, 48]} />
        <MeshDistortMaterial
          key={clay ? 'clay' : wireframe ? 'wire' : 'chrome'}
          color={clay ? CLAY : wireframe ? wireColor : '#c7d2fe'}
          metalness={clay ? 0 : 1}
          roughness={clay ? 0.8 : 0.06}
          distort={0.38}
          speed={1.6}
          wireframe={wireframe}
        />
      </mesh>
      <mesh position={[0, -1.25, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[0.55, 0.65, 0.12, 48]} />
        <Mat color="#15161d" metalness={0.8} roughness={0.3} />
      </mesh>
    </group>
  )
}

const registry: Record<ProceduralModelId, () => React.JSX.Element> = {
  hyperKnot: HyperKnot,
  crystalCluster: CrystalCluster,
  mechDrone: MechDrone,
  sciFiCrate: SciFiCrate,
  energyCore: EnergyCore,
  lowPolyTree: LowPolyTree,
  monolithShrine: MonolithShrine,
  liquidOrb: LiquidOrb,
}

export function ProceduralModel({ id, wireframe, clay, wireColor }: { id: ProceduralModelId; wireframe: boolean; clay: boolean; wireColor: string }) {
  const Model = registry[id] ?? HyperKnot
  const state = useMemo(() => ({ wireframe, clay, wireColor }), [wireframe, clay, wireColor])
  return (
    <MatContext.Provider value={state}>
      <Model />
    </MatContext.Provider>
  )
}
