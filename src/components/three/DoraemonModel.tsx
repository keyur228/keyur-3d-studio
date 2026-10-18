import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { useStore } from '@/store/useStore'

/**
 * The interactive Doraemon bundle (Blender → glTF).
 *  - NLA clips (idle, wave, pocket, eat, hover, shutdown) + prop actions play through one AnimationMixer
 *  - HIT_* collision proxies are raycast for head-pat / pocket-click / tail-pull / belly-poke
 *  - the pupils follow the cursor through the eyeLook* morph targets (CTRL_Eye_LookAt in the engine spec)
 *  - the pocket stencil portal is drawn colourless between the body and the gadgets so props clip against the pouch
 * Names and behaviour mirror Export/Doraemon_Interaction_Spec.json.
 */

const HEIGHT = 1.293
const SCALE = 2.3 / HEIGHT
const FLOOR_Y = -1.45
const FADE = 0.28
const GADGETS = ['Takecopter', 'Dorayaki'] as const
type Gadget = (typeof GADGETS)[number]

/** Morph weights per expression chip (names are the shape keys of the Blender bundle). */
export const EXPRESSIONS: Record<string, Record<string, number>> = {
  neutral: {},
  laugh: { Mouth_GiantLaugh: 1, Eyes_Happy_Arcs: 1, Cheeks_Puffed: 0.3 },
  pout: { Mouth_Pout: 1, Brow_Angry: 0.7 },
  scream: { Mouth_Shocked_Scream: 1, Eyes_Tiny_Shock_Dots: 1, Brow_Worried: 0.6 },
  love: { Mouth_DorayakiDrool: 0.55, Eyes_Heart_Pupils: 1, mouthSmileLeft: 0.6, mouthSmileRight: 0.6 },
  dizzy: { mouthFunnel: 0.7, Eyes_Spiral_Dizzy: 1 },
  angry: { Brow_Angry: 1, Mouth_Pout: 0.45, eyeSquintLeft: 0.4, eyeSquintRight: 0.4 },
}
const GIGGLE = EXPRESSIONS.laugh
const LOOK_KEYS = ['eyeLookUp', 'eyeLookDown', 'eyeLookIn', 'eyeLookOut'].flatMap((k) => [`${k}Left`, `${k}Right`])
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))

interface Hit {
  name: string
  event: string
  priority: number
}

function findClip(clips: THREE.AnimationClip[], name: string) {
  const n = name.toLowerCase()
  return clips.find((c) => c.name.toLowerCase() === n) ?? clips.find((c) => c.name.toLowerCase().includes(n))
}

export function DoraemonModel({ url, wireframe, clay }: { url: string; wireframe: boolean; clay: boolean }) {
  const gltf = useGLTF(url)
  const { camera, raycaster } = useThree()
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null
  const cmd = useStore((s) => s.charCmd)
  const root = useRef<THREE.Group>(null)

  const model = useMemo(() => {
    const scene = cloneSkinned(gltf.scene) as THREE.Group
    const meshes: THREE.Mesh[] = []
    const morphMeshes: THREE.Mesh[] = []
    const hitMeshes: THREE.Mesh[] = []
    const originals = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>()
    scene.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (!mesh.isMesh) return
      const isHit = mesh.name.startsWith('HIT_') || mesh.userData?.collision_proxy
      mesh.frustumCulled = false // skinned + morphed bounds are not tracked per frame
      if (isHit) {
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
        mats.forEach((m) => (m.visible = false)) // raycast only
        hitMeshes.push(mesh)
        return
      }
      mesh.castShadow = true
      mesh.receiveShadow = !mesh.name.includes('Eyes')
      mesh.material = Array.isArray(mesh.material) ? mesh.material.map((m) => m.clone()) : mesh.material.clone()
      originals.set(mesh, mesh.material)
      meshes.push(mesh)
      if (mesh.morphTargetDictionary && mesh.morphTargetInfluences) morphMeshes.push(mesh)
      // draw order: body (0) -> pocket stencil portal (1, colourless depth mask) -> gadgets (2)
      if (mesh.name === 'Mesh_4D_Pocket_Stencil_Portal') {
        mesh.renderOrder = 1
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
        mats.forEach((m) => {
          m.colorWrite = false
          m.depthWrite = true
        })
      } else if (mesh.name.startsWith('Prop_')) {
        mesh.renderOrder = 2
      }
    })
    const names = (n: string) => scene.getObjectByName(n) ?? null
    const belly = names('SPRING_Belly')
    const bellyRest = belly ? belly.scale.clone() : new THREE.Vector3(1, 1, 1)
    const props: Record<Gadget, THREE.Object3D | null> = {
      Takecopter: names('RIG_Prop_Takecopter'),
      Dorayaki: names('RIG_Prop_Dorayaki'),
    }
    const propRest = new Map<THREE.Object3D, { p: THREE.Vector3; q: THREE.Quaternion; s: THREE.Vector3 }>()
    Object.values(props).forEach((o) => o && propRest.set(o, { p: o.position.clone(), q: o.quaternion.clone(), s: o.scale.clone() }))
    const clayMaterial = new THREE.MeshStandardMaterial({ color: '#b4b4bb', roughness: 0.82, metalness: 0 })
    const skinned: THREE.SkinnedMesh[] = []
    scene.traverse((o) => ((o as THREE.SkinnedMesh).isSkinnedMesh ? skinned.push(o as THREE.SkinnedMesh) : undefined))
    const eyeL = names('DEF_Eye_L')
    const eyePos = new THREE.Vector3()
    eyeL?.getWorldPosition(eyePos)
    return { scene, meshes, morphMeshes, hitMeshes, originals, belly, bellyRest, props, propRest, clayMaterial, skinned }
  }, [gltf])

  // ── centre on the ground and aim the orbit camera at the character ─────────────────────
  const midHeight = FLOOR_Y + (HEIGHT * SCALE) / 2
  useLayoutEffect(() => {
    if (!controls) return
    const targetY = midHeight + 0.2
    const dy = targetY - controls.target.y
    controls.target.y = targetY
    camera.position.y += dy
    controls.update()
    controls.saveState()
  }, [controls, camera, midHeight])

  useEffect(() => {
    model.originals.forEach((orig, mesh) => {
      mesh.material = clay ? model.clayMaterial : orig
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      mats.forEach((m) => {
        ;(m as THREE.MeshStandardMaterial).wireframe = wireframe
        m.needsUpdate = true
      })
    })
  }, [wireframe, clay, model])

  // ── animation state ─────────────────────────────────────────────────────────────
  const st = useRef({
    mixer: null as THREE.AnimationMixer | null,
    actions: new Map<string, THREE.AnimationAction>(),
    main: null as THREE.AnimationAction | null,
    mainName: 'idle',
    propActions: [] as THREE.AnimationAction[],
    gadgetIndex: 0,
    shown: null as Gadget | null,
    standby: false,
    expression: 'neutral',
    giggle: 0,
    poke: 0,
    weights: {} as Record<string, number>,
    pendingStandbyPause: false,
    look: new THREE.Vector2(),
  })

  useEffect(() => {
    const s = st.current
    const mixer = new THREE.AnimationMixer(model.scene)
    s.mixer = mixer
    gltf.animations.forEach((c) => s.actions.set(c.name, mixer.clipAction(c)))
    const idle = findClip(gltf.animations, 'Anim_Idle_Breathing')
    if (idle) {
      const a = s.actions.get(idle.name)!
      a.setLoop(THREE.LoopRepeat, Infinity).reset().play()
      s.main = a
    }
    const onFinished = (e: THREE.Event & { action?: THREE.AnimationAction }) => {
      if (e.action && e.action === s.main && !s.standby) toIdle()
    }
    mixer.addEventListener('finished', onFinished as never)
    return () => {
      mixer.removeEventListener('finished', onFinished as never)
      mixer.stopAllAction()
      mixer.uncacheRoot(model.scene)
      document.body.style.cursor = ''
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gltf, model])

  const actionFor = (name: string) => {
    const c = findClip(gltf.animations, name)
    return c ? st.current.actions.get(c.name) : undefined
  }

  const resetProps = () => {
    const s = st.current
    s.propActions.forEach((a) => a.stop())
    s.propActions = []
    model.propRest.forEach((r, o) => {
      o.position.copy(r.p)
      o.quaternion.copy(r.q)
      o.scale.copy(r.s)
    })
    s.shown = null
  }

  function playMain(name: string, opts: { loop?: boolean; hold?: boolean } = {}) {
    const s = st.current
    const next = actionFor(name)
    if (!next) return null
    next.reset()
    next.setLoop(opts.loop ? THREE.LoopRepeat : THREE.LoopOnce, opts.loop ? Infinity : 1)
    next.clampWhenFinished = !!opts.hold
    next.setEffectiveWeight(1).setEffectiveTimeScale(1)
    next.paused = false
    next.play()
    if (s.main && s.main !== next) s.main.crossFadeTo(next, FADE, false)
    else next.fadeIn(FADE)
    s.main = next
    return next
  }

  function toIdle() {
    const s = st.current
    s.standby = false
    s.mainName = 'idle'
    playMain('Anim_Idle_Breathing', { loop: true })
  }

  function playProp(name: string, loop = false) {
    const a = actionFor(name)
    if (!a) return
    a.reset()
    a.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1)
    a.clampWhenFinished = !loop
    a.setEffectiveWeight(1).setEffectiveTimeScale(1)
    a.play()
    st.current.propActions.push(a)
  }

  function trigger(kind: string) {
    const s = st.current
    if (kind === 'idle') {
      resetProps()
      toIdle()
    } else if (kind === 'wave') {
      s.mainName = 'wave'
      playMain('Anim_Wave_Hello')
    } else if (kind === 'pocket') {
      resetProps()
      const g = GADGETS[s.gadgetIndex % GADGETS.length]
      s.gadgetIndex += 1
      s.shown = g
      s.mainName = 'pocket'
      playMain('Anim_Pocket_Rummage_And_Pull')
      playProp(`Spawn_${g}`)
    } else if (kind === 'eat') {
      resetProps()
      s.mainName = 'eat'
      playMain('Anim_Eat_Dorayaki_Happy', { loop: true })
      playProp('Eat_Dorayaki', true)
      playProp('Eat_Dorayaki_Bites', true)
    } else if (kind === 'hover') {
      resetProps()
      s.mainName = 'hover'
      playMain('Anim_Takecopter_Hover_Loop', { loop: true })
      playProp('Hover_Takecopter', true)
      playProp('Hover_Takecopter_Blur', true)
    } else if (kind === 'power') {
      if (s.standby) {
        // reboot: resume the clip from the standby hold
        s.standby = false
        s.pendingStandbyPause = false
        if (s.main) {
          s.main.paused = false
          s.main.clampWhenFinished = false
        }
      } else {
        resetProps()
        s.mainName = 'shutdown'
        s.pendingStandbyPause = true
        playMain('Anim_Tail_Pulled_Shutdown')
      }
    } else if (kind === 'poke') {
      s.poke = 1
      s.giggle = 1
    }
  }

  // commands from the inspector UI
  const lastCmd = useRef(0)
  useEffect(() => {
    if (!cmd || cmd.n === lastCmd.current) return
    lastCmd.current = cmd.n
    if (cmd.cmd === 'clip' && cmd.arg) trigger(cmd.arg)
    else if (cmd.cmd === 'expression') st.current.expression = cmd.arg ?? 'neutral'
    else if (cmd.cmd === 'reset') {
      st.current.expression = 'neutral'
      trigger('idle')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cmd])

  // ── per frame ───────────────────────────────────────────────────────────────────
  const plane = useMemo(() => new THREE.Plane(), [])
  const tmp = useMemo(() => ({ a: new THREE.Vector3(), b: new THREE.Vector3(), c: new THREE.Vector3() }), [])
  useFrame(({ pointer }, dt) => {
    const s = st.current
    const mixer = s.mixer
    if (!mixer) return
    const d = Math.min(dt, 1 / 20)
    // baseline: undo last frame's procedural additions before the mixer writes this frame's animated values
    const controlled = new Set<string>([...LOOK_KEYS, ...Object.keys(GIGGLE), ...Object.values(EXPRESSIONS).flatMap((e) => Object.keys(e))])
    model.morphMeshes.forEach((m) => {
      const dict = m.morphTargetDictionary!
      controlled.forEach((k) => {
        const i = dict[k]
        if (i !== undefined) m.morphTargetInfluences![i] = 0
      })
    })
    if (model.belly) model.belly.scale.copy(model.bellyRest)

    mixer.update(d)

    // hold the shutdown clip at the standby pose until the tail is pulled again
    if (s.pendingStandbyPause && s.main && s.mainName === 'shutdown') {
      const clip = s.main.getClip()
      if (s.main.time >= Math.min(clip.duration, 72 / 30)) {
        s.main.time = 72 / 30
        s.main.paused = true
        s.pendingStandbyPause = false
        s.standby = true
      }
    }

    // procedural layer: expression chips, giggle, cursor eye-tracking
    s.giggle = Math.max(0, s.giggle - d / 1.1)
    s.poke = Math.max(0, s.poke - d / 0.55)
    const target: Record<string, number> = {}
    const add = (k: string, v: number) => (target[k] = Math.max(target[k] ?? 0, v))
    Object.entries(EXPRESSIONS[s.expression] ?? {}).forEach(([k, v]) => add(k, v))
    if (s.giggle > 0) Object.entries(GIGGLE).forEach(([k, v]) => add(k, v * Math.min(1, s.giggle * 1.6)))
    if (!s.standby && s.expression !== 'dizzy') {
      raycaster.setFromCamera(pointer, camera)
      const rootObj = root.current
      if (rootObj) {
        rootObj.updateWorldMatrix(true, false)
        const fwd = tmp.a.set(0, 0, 1).transformDirection(rootObj.matrixWorld)
        const eye = tmp.b.set(0, 1.076, 0.3).applyMatrix4(rootObj.matrixWorld)
        plane.setFromNormalAndCoplanarPoint(fwd, tmp.c.copy(eye).addScaledVector(fwd, 1.2 * SCALE))
        const hit = raycaster.ray.intersectPlane(plane, tmp.c)
        if (hit) {
          const local = rootObj.worldToLocal(hit.clone())
          const nx = clamp(local.x / 0.7, -1, 1)
          const nz = clamp((local.y - 1.076) / 0.5, -1, 1)
          s.look.lerp(new THREE.Vector2(nx, nz), 1 - Math.exp(-d * 10))
        }
      }
      const { x, y } = s.look
      add('eyeLookOutLeft', Math.max(x, 0)); add('eyeLookInLeft', Math.max(-x, 0))
      add('eyeLookInRight', Math.max(x, 0)); add('eyeLookOutRight', Math.max(-x, 0))
      ;['Left', 'Right'].forEach((side) => {
        add(`eyeLookUp${side}`, Math.max(y, 0))
        add(`eyeLookDown${side}`, Math.max(-y, 0))
      })
    }
    const w = s.weights
    const k = 1 - Math.exp(-d * 12)
    const keys = new Set([...Object.keys(w), ...Object.keys(target)])
    keys.forEach((key) => {
      w[key] = (w[key] ?? 0) + ((target[key] ?? 0) - (w[key] ?? 0)) * k
      if (w[key] < 0.002 && !(key in target)) delete w[key]
    })
    model.morphMeshes.forEach((m) => {
      const dict = m.morphTargetDictionary!
      Object.entries(w).forEach(([key, v]) => {
        const i = dict[key]
        if (i !== undefined) m.morphTargetInfluences![i] = Math.min(1, m.morphTargetInfluences![i] + v)
      })
    })
    // belly poke: damped squash with volume preservation (SPRING_Belly: local Y is the squash axis)
    if (model.belly && s.poke > 0) {
      const sq = 1 - 0.22 * Math.sin(Math.min(1, s.poke) * Math.PI) * s.poke
      model.belly.scale.set(model.bellyRest.x / Math.sqrt(sq), model.bellyRest.y * sq, model.bellyRest.z / Math.sqrt(sq))
    }
  })

  // ── pointer: hit volumes ───────────────────────────────────────────────────────
  const pickHit = (e: ThreeEvent<PointerEvent>): Hit | null => {
    let best: Hit | null = null
    for (const i of e.intersections) {
      const o = i.object
      if (!o.name.startsWith('HIT_')) continue
      const ud = o.userData as { event?: string; priority?: number }
      const h = { name: o.name, event: ud.event ?? '', priority: ud.priority ?? 0 }
      if (!best || h.priority > best.priority) best = h
    }
    return best
  }
  const onDown = (e: ThreeEvent<PointerEvent>) => {
    const h = pickHit(e)
    if (!h) return
    e.stopPropagation()
    const map: Record<string, string> = { on_pat: 'wave', on_pocket_click: 'pocket', on_tail_pull: 'power', on_belly_poke: 'poke' }
    if (map[h.event]) trigger(map[h.event])
  }
  const onMove = (e: ThreeEvent<PointerEvent>) => {
    document.body.style.cursor = pickHit(e) ? 'pointer' : ''
  }

  return (
    <group ref={root} position={[0, FLOOR_Y, 0]} scale={SCALE}>
      <primitive object={model.scene} onPointerDown={onDown} onPointerMove={onMove} onPointerOut={() => (document.body.style.cursor = '')} />
    </group>
  )
}
