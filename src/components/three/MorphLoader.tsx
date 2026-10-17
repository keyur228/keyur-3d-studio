import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '@/store/useStore'
import { lightingPresets } from './LightingRig'
import { COUNT, getShapes, mulberry } from './morphShapes'

/**
 * Loading animation for the 3D preview: a cloud of particles that flows
 * between everyday objects (see ./morphShapes) while the model downloads.
 */

const HOLD = 0.7 // seconds each shape rests
const MORPH = 1.25 // seconds per transition

const vertexShader = /* glsl */ `
  attribute vec3 aFrom;
  attribute vec3 aTo;
  attribute float aDelay;
  attribute float aScale;
  attribute float aMix;
  uniform float uProgress;
  uniform float uTime;
  uniform float uSize;
  uniform float uPixelRatio;
  varying float vMix;
  varying float vFade;
  varying float vDepth;

  void main() {
    // each particle starts a little later than the one below it
    float t = clamp((uProgress - aDelay * 0.45) / 0.55, 0.0, 1.0);
    t = t * t * (3.0 - 2.0 * t);
    vec3 pos = mix(aFrom, aTo, t);
    // particles bulge outward mid-flight, then settle
    float flight = sin(t * 3.14159);
    pos += normalize(pos + vec3(0.0001)) * flight * 0.32;
    // gentle idle shimmer
    pos += vec3(sin(uTime * 1.7 + aDelay * 40.0), cos(uTime * 1.3 + aDelay * 23.0), sin(uTime * 1.1 + aDelay * 31.0)) * 0.012;

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * aScale * uPixelRatio * (1.0 + flight * 0.5) / -mv.z;
    vMix = aMix;
    vFade = 1.0 - flight * 0.35;
    // nearer particles are stronger, so the volume reads as 3D
    vDepth = smoothstep(-9.5, -5.0, mv.z);
  }
`

const fragmentShader = /* glsl */ `
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  varying float vMix;
  varying float vFade;
  varying float vDepth;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float alpha = smoothstep(0.5, 0.1, d) * vFade * mix(0.18, 0.95, vDepth);
    gl_FragColor = vec4(mix(uColorA, uColorB, vMix), alpha);
  }
`

export function MorphLoader() {
  const dark = useStore((s) => lightingPresets[s.viewer.lighting].dark)
  const dpr = useThree((s) => s.viewport.dpr)
  const group = useRef<THREE.Group>(null)
  const geo = useRef<THREE.BufferGeometry>(null)
  const timeline = useRef({ shape: 0, elapsed: 0 })

  const { shapes, from, to, delay, scale, mixAttr } = useMemo(() => {
    const shapes = getShapes()
    const rand = mulberry(7)
    // first frame: particles gather from a loose sphere into the first object
    const from = new Float32Array(COUNT * 3)
    for (let i = 0; i < COUNT; i++) {
      const u = rand() * 2 - 1
      const th = rand() * Math.PI * 2
      const rad = 1.6 + rand() * 0.8
      const s = Math.sqrt(1 - u * u)
      from.set([Math.cos(th) * s * rad, u * rad, Math.sin(th) * s * rad], i * 3)
    }
    const delay = new Float32Array(COUNT)
    const scale = new Float32Array(COUNT)
    const mixAttr = new Float32Array(COUNT)
    for (let i = 0; i < COUNT; i++) {
      delay[i] = i / COUNT
      scale[i] = 0.55 + rand() * 0.9
      mixAttr[i] = rand() < 0.4 ? 0 : 0.55 + rand() * 0.45
    }
    return { shapes, from, to: shapes[0].slice(), delay, scale, mixAttr }
  }, [])

  const uniforms = useMemo(
    () => ({
      uProgress: { value: 0 },
      uTime: { value: 0 },
      uSize: { value: 22 },
      uPixelRatio: { value: dpr },
      uColorA: { value: new THREE.Color() },
      uColorB: { value: new THREE.Color() },
    }),
    [dpr],
  )
  uniforms.uColorA.value.set(dark ? '#f3ece2' : '#3a3129')
  uniforms.uColorB.value.set(dark ? '#f08d4f' : '#b9521a')

  useFrame((state, dt) => {
    const tl = timeline.current
    // cap only large gaps (e.g. a background tab) so slow devices still animate in real time
    tl.elapsed += Math.min(dt, 0.25)
    uniforms.uTime.value = state.clock.elapsedTime
    uniforms.uProgress.value = Math.min(tl.elapsed / MORPH, 1)

    // after the morph and a short hold, the current shape becomes the start of the next
    if (tl.elapsed > MORPH + HOLD && geo.current) {
      tl.elapsed = 0
      tl.shape = (tl.shape + 1) % shapes.length
      const fromAttr = geo.current.getAttribute('aFrom') as THREE.BufferAttribute
      const toAttr = geo.current.getAttribute('aTo') as THREE.BufferAttribute
      ;(fromAttr.array as Float32Array).set(toAttr.array as Float32Array)
      ;(toAttr.array as Float32Array).set(shapes[tl.shape])
      fromAttr.needsUpdate = true
      toAttr.needsUpdate = true
      uniforms.uProgress.value = 0
    }
    if (group.current) group.current.rotation.y += dt * 0.35
  })

  return (
    <group ref={group} rotation={[0.08, -0.5, 0]}>
      <points frustumCulled={false}>
        <bufferGeometry ref={geo}>
          {/* `position` is only used for bounds; the shader reads aFrom/aTo */}
          <bufferAttribute attach="attributes-position" args={[from, 3]} />
          <bufferAttribute attach="attributes-aFrom" args={[from.slice(), 3]} />
          <bufferAttribute attach="attributes-aTo" args={[to, 3]} />
          <bufferAttribute attach="attributes-aDelay" args={[delay, 1]} />
          <bufferAttribute attach="attributes-aScale" args={[scale, 1]} />
          <bufferAttribute attach="attributes-aMix" args={[mixAttr, 1]} />
        </bufferGeometry>
        <shaderMaterial vertexShader={vertexShader} fragmentShader={fragmentShader} uniforms={uniforms} transparent depthWrite={false} />
      </points>
    </group>
  )
}
