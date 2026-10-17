import * as THREE from 'three'
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'

/**
 * Point clouds for the loading animation: a computer, a cat, a dog, a phone,
 * an apple and an armchair, each modeled from primitives and sampled into the
 * same number of surface points so every particle has a partner in every shape.
 * Plain TypeScript (no React), so it can also be run in Node to preview shapes.
 */

export const COUNT = 5200
const SIZE = 2.1 // every shape is normalised to this largest dimension

type V3 = [number, number, number]
type Part = { g: THREE.BufferGeometry; p?: V3; r?: V3; s?: V3 }

const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d)
const sphere = (r: number) => new THREE.SphereGeometry(r, 28, 20)
const cyl = (rt: number, rb: number, h: number) => new THREE.CylinderGeometry(rt, rb, h, 20)

const computer = (): Part[] => [
  { g: new RoundedBoxGeometry(1.7, 1.05, 0.07, 3, 0.03), p: [0, 0.35, 0] },
  { g: box(0.14, 0.42, 0.06), p: [0, -0.34, -0.06] },
  { g: box(0.62, 0.035, 0.38), p: [0, -0.55, -0.02] },
  { g: new RoundedBoxGeometry(1.15, 0.045, 0.36, 2, 0.015), p: [0, -0.55, 0.5] },
]

const cat = (): Part[] => [
  { g: sphere(0.5), p: [0, -0.15, 0], s: [0.85, 1.05, 0.8] },
  { g: sphere(0.4), p: [0, -0.48, 0.04], s: [1.1, 0.6, 1.1] },
  { g: sphere(0.32), p: [0, 0.62, 0.1] },
  { g: new THREE.ConeGeometry(0.11, 0.25, 4), p: [-0.17, 0.94, 0.08], r: [0, 0, 0.25] },
  { g: new THREE.ConeGeometry(0.11, 0.25, 4), p: [0.17, 0.94, 0.08], r: [0, 0, -0.25] },
  { g: sphere(0.1), p: [0, 0.55, 0.38], s: [1.1, 0.7, 0.8] },
  { g: cyl(0.07, 0.07, 0.55), p: [-0.15, -0.42, 0.3] },
  { g: cyl(0.07, 0.07, 0.55), p: [0.15, -0.42, 0.3] },
  { g: new THREE.TorusGeometry(0.4, 0.06, 10, 32, Math.PI * 1.15), p: [0.1, -0.68, -0.05], r: [Math.PI / 2, 0, -0.4] },
]

const dog = (): Part[] => [
  { g: new THREE.CapsuleGeometry(0.27, 0.8, 8, 20), p: [0, 0.05, 0], r: [0, 0, Math.PI / 2] },
  { g: cyl(0.12, 0.16, 0.36), p: [0.5, 0.3, 0], r: [0, 0, -0.6] },
  { g: sphere(0.24), p: [0.68, 0.52, 0] },
  { g: new THREE.CapsuleGeometry(0.1, 0.18, 6, 14), p: [0.9, 0.45, 0], r: [0, 0, Math.PI / 2] },
  { g: sphere(0.12), p: [0.6, 0.48, 0.2], s: [0.55, 1.3, 0.3], r: [0.3, 0, 0] },
  { g: sphere(0.12), p: [0.6, 0.48, -0.2], s: [0.55, 1.3, 0.3], r: [-0.3, 0, 0] },
  { g: cyl(0.07, 0.06, 0.6), p: [0.38, -0.48, 0.14] },
  { g: cyl(0.07, 0.06, 0.6), p: [0.38, -0.48, -0.14] },
  { g: cyl(0.07, 0.06, 0.6), p: [-0.38, -0.48, 0.14] },
  { g: cyl(0.07, 0.06, 0.6), p: [-0.38, -0.48, -0.14] },
  { g: cyl(0.035, 0.06, 0.45), p: [-0.62, 0.32, 0], r: [0, 0, 0.9] },
]

const phone = (): Part[] => [
  { g: new RoundedBoxGeometry(0.9, 1.8, 0.09, 4, 0.11) },
  // front details: speaker slot and home bar
  { g: new RoundedBoxGeometry(0.24, 0.035, 0.03, 2, 0.012), p: [0, 0.78, 0.05] },
  { g: new RoundedBoxGeometry(0.34, 0.035, 0.03, 2, 0.012), p: [0, -0.8, 0.05] },
  // side buttons
  { g: box(0.03, 0.22, 0.05), p: [0.46, 0.42, 0] },
  { g: box(0.03, 0.13, 0.05), p: [-0.46, 0.5, 0] },
  { g: box(0.03, 0.13, 0.05), p: [-0.46, 0.3, 0] },
  // rear camera bump with two lenses
  { g: new RoundedBoxGeometry(0.36, 0.36, 0.045, 2, 0.07), p: [-0.2, 0.6, -0.065] },
  { g: cyl(0.065, 0.065, 0.03), p: [-0.27, 0.68, -0.095], r: [Math.PI / 2, 0, 0] },
  { g: cyl(0.065, 0.065, 0.03), p: [-0.13, 0.52, -0.095], r: [Math.PI / 2, 0, 0] },
]

const apple = (): Part[] => [
  { g: new THREE.SphereGeometry(0.7, 40, 30), s: [1, 0.88, 1] },
  { g: cyl(0.025, 0.035, 0.32), p: [0.02, 0.72, 0], r: [0, 0, 0.2] },
  { g: sphere(0.16), p: [0.2, 0.78, 0], s: [1.4, 0.12, 0.6], r: [0, 0, -0.45] },
]

const armchair = (): Part[] => [
  { g: new RoundedBoxGeometry(1.2, 0.24, 1.0, 2, 0.05), p: [0, -0.15, 0] },
  { g: new RoundedBoxGeometry(1.2, 0.9, 0.2, 2, 0.05), p: [0, 0.37, -0.42], r: [-0.12, 0, 0] },
  { g: new RoundedBoxGeometry(0.18, 0.5, 1.0, 2, 0.05), p: [-0.69, 0.02, 0] },
  { g: new RoundedBoxGeometry(0.18, 0.5, 1.0, 2, 0.05), p: [0.69, 0.02, 0] },
  { g: cyl(0.05, 0.035, 0.4), p: [-0.55, -0.46, 0.38] },
  { g: cyl(0.05, 0.035, 0.4), p: [0.55, -0.46, 0.38] },
  { g: cyl(0.05, 0.035, 0.4), p: [-0.55, -0.46, -0.38] },
  { g: cyl(0.05, 0.035, 0.4), p: [0.55, -0.46, -0.38] },
]

/** In morph order; geometries are only created when first sampled. */
export const SHAPE_NAMES = ['computer', 'cat', 'dog', 'phone', 'apple', 'armchair'] as const
const SHAPES = [computer, cat, dog, phone, apple, armchair]

/** Merge an object's parts and sample COUNT surface points, sorted bottom→top. */
function samplePoints(parts: Part[], seed: number): Float32Array {
  const pieces = parts.map(({ g, p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1] }) => {
    const src = g.index ? g.toNonIndexed() : g
    const piece = new THREE.BufferGeometry()
    piece.setAttribute('position', src.getAttribute('position').clone())
    piece.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...p), new THREE.Quaternion().setFromEuler(new THREE.Euler(...r)), new THREE.Vector3(...s)))
    if (src !== g) src.dispose()
    g.dispose()
    return piece
  })
  const merged = mergeGeometries(pieces)!
  pieces.forEach((g) => g.dispose())

  // centre and normalise so every object fills the same space
  merged.computeBoundingBox()
  const bb = merged.boundingBox!
  const size = bb.getSize(new THREE.Vector3())
  const centre = bb.getCenter(new THREE.Vector3())
  merged.translate(-centre.x, -centre.y, -centre.z)
  merged.scale(...(new Array(3).fill(SIZE / Math.max(size.x, size.y, size.z)) as V3))

  const rand = mulberry(seed)
  // seeded so every visitor sees identical shapes; @types/three omits setRandomGenerator
  const sampler = (new MeshSurfaceSampler(new THREE.Mesh(merged)) as MeshSurfaceSampler & { setRandomGenerator(fn: () => number): MeshSurfaceSampler })
    .setRandomGenerator(rand)
    .build()
  const pts: THREE.Vector3[] = []
  const v = new THREE.Vector3()
  for (let i = 0; i < COUNT; i++) {
    sampler.sample(v)
    pts.push(v.clone())
  }
  merged.dispose()
  // pairing points by height (with a little jitter) makes each morph sweep
  // upward smoothly instead of particles crossing the whole scene
  const keyed = pts.map((p) => ({ p, k: p.y + (rand() - 0.5) * 0.35 }))
  keyed.sort((a, b) => a.k - b.k)
  const out = new Float32Array(COUNT * 3)
  keyed.forEach(({ p }, i) => p.toArray(out, i * 3))
  return out
}

export function mulberry(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

let cachedShapes: Float32Array[] | null = null
/** Sampled once per page load and reused every time the preview opens. */
export function getShapes() {
  if (!cachedShapes) cachedShapes = SHAPES.map((make, i) => samplePoints(make(), 101 + i * 37))
  return cachedShapes
}
