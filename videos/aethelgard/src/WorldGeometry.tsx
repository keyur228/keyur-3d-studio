import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { Reflector } from "three/examples/jsm/objects/Reflector.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { getAtmosphere, PORTAL_CROSS_FRAME } from "./CameraRig";
import {
  ACTS,
  ANCHORS,
  GLSL_NOISE,
  HEIGHT,
  PALETTE,
  WIDTH,
  createRng,
  fbm3,
  integrate,
  track,
  type Vec3,
} from "./shared";

/* -------------------------------------------------------------------------------------------------
 * Shared helpers
 * -----------------------------------------------------------------------------------------------*/

const useTime = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return { frame, fps, t: frame / fps };
};

/** Creates a resource once and disposes it on unmount. */
const useDisposable = <T extends { dispose: () => void }>(factory: () => T): T => {
  const value = useMemo(factory, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => value.dispose(), [value]);
  return value;
};

const fogUniforms = () => THREE.UniformsUtils.clone(THREE.UniformsLib.fog);

const tmpMatrix = new THREE.Matrix4();
const tmpQuat = new THREE.Quaternion();
const tmpPos = new THREE.Vector3();
const tmpScale = new THREE.Vector3();
const tmpEuler = new THREE.Euler();
const Y_AXIS = new THREE.Vector3(0, 1, 0);
const Z_AXIS = new THREE.Vector3(0, 0, 1);

const compose = (
  position: Vec3 | THREE.Vector3,
  rotation: [number, number, number],
  scale: Vec3 | number,
  out: THREE.Matrix4 = new THREE.Matrix4(),
): THREE.Matrix4 => {
  if (position instanceof THREE.Vector3) tmpPos.copy(position);
  else tmpPos.set(position[0], position[1], position[2]);
  tmpQuat.setFromEuler(tmpEuler.set(rotation[0], rotation[1], rotation[2]));
  if (typeof scale === "number") tmpScale.setScalar(scale);
  else tmpScale.set(scale[0], scale[1], scale[2]);
  return out.compose(tmpPos, tmpQuat, tmpScale);
};

/** Applies a static list of matrices (and optional colors) to an InstancedMesh once. */
const useStaticInstances = (
  ref: React.RefObject<THREE.InstancedMesh | null>,
  matrices: THREE.Matrix4[],
  colors?: THREE.Color[],
) => {
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
    if (colors) colors.forEach((c, i) => mesh.setColorAt(i, c));
    mesh.count = matrices.length;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [ref, matrices, colors]);
};

/* -------------------------------------------------------------------------------------------------
 * Procedural geometry generators
 * -----------------------------------------------------------------------------------------------*/

/** Floating island: flat mossy crown on a tapered, stalactite-ridden dodecahedral rock. Top sits at y=0. */
const createIslandGeometry = (seed: number): THREE.BufferGeometry => {
  const geo = new THREE.DodecahedronGeometry(1, 2);
  const pos = geo.getAttribute("position") as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const moss = new THREE.Color("#2f5d57");
  const rim = new THREE.Color("#4b4372");
  const deep = new THREE.Color("#1b1634");
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const n = fbm3(x * 1.6 + seed * 7.1, y * 1.6 + seed * 3.3, z * 1.6 + seed * 5.7, 3);
    let nx = x * (1 + n * 0.24);
    let nz = z * (1 + n * 0.24);
    let ny: number;
    if (y > 0) {
      ny = n * 0.035;
      const radial = Math.min(1, Math.hypot(nx, nz));
      c.copy(moss).lerp(rim, THREE.MathUtils.smoothstep(radial, 0.7, 1.0));
    } else {
      const spike = Math.max(0, fbm3(x * 3.1 + seed, 0.5, z * 3.1 - seed, 2)) * 1.1;
      ny = (y * 1.9 - spike) * (1 + n * 0.15);
      const taper = Math.max(0.12, 1 + ny * 0.3);
      nx *= taper;
      nz *= taper;
      c.copy(rim).lerp(deep, Math.min(1, -ny / 1.8));
    }
    pos.setXYZ(i, nx, ny, nz);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
};

/** Jagged obsidian shard used for the veil's drifting rock silhouettes. */
const createRockGeometry = (seed: number): THREE.BufferGeometry => {
  const geo = new THREE.IcosahedronGeometry(1, 2);
  const pos = geo.getAttribute("position") as THREE.BufferAttribute;
  const stretch = new THREE.Vector3(0.8 + (seed % 3) * 0.25, 1.1 + (seed % 2) * 0.6, 0.7 + (seed % 4) * 0.15);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const n = fbm3(x * 1.4 + seed * 11.3, y * 1.4 + seed * 2.9, z * 1.4 + seed * 4.1, 3);
    const ridge = 1 - Math.abs(fbm3(x * 2.7 - seed, y * 2.7 + seed, z * 2.7, 2)) * 2;
    const r = 1 + n * 0.55 + ridge * 0.12;
    pos.setXYZ(i, x * r * stretch.x, y * r * stretch.y, z * r * stretch.z);
  }
  geo.computeVertexNormals();
  return geo;
};

/** Central spire: noisy tapered rock column rising from the water. */
const createSpireGeometry = (): THREE.BufferGeometry => {
  const height = ANCHORS.spireTop + 4;
  const geo = new THREE.CylinderGeometry(4.4, 7.2, height, 28, 10, false);
  geo.translate(0, height / 2 - 4, 0);
  const pos = geo.getAttribute("position") as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const r = Math.hypot(x, z);
    if (r < 0.01) continue;
    const n = fbm3(x * 0.35, y * 0.22, z * 0.35, 3);
    const k = 1 + n * 0.35;
    pos.setXYZ(i, x * k, y, z * k);
  }
  geo.computeVertexNormals();
  return geo;
};

/** Hexagonal bipyramid crystal for the obelisk and its orbiting shards. */
const createCrystalGeometry = (height: number, radius: number): THREE.BufferGeometry => {
  const points = [
    new THREE.Vector2(0, -height),
    new THREE.Vector2(radius * 0.92, -height * 0.25),
    new THREE.Vector2(radius, height * 0.18),
    new THREE.Vector2(0, height),
  ];
  const geo = new THREE.LatheGeometry(points, 6);
  return geo;
};

/* -------------------------------------------------------------------------------------------------
 * Village layout (deterministic)
 * -----------------------------------------------------------------------------------------------*/

interface IslandSpec {
  center: Vec3;
  radius: number;
  variant: number;
  rotY: number;
}
interface CottageSpec {
  position: Vec3;
  rotY: number;
  w: number;
  h: number;
  d: number;
  roof: number;
  chimney: boolean;
  lit: number[];
}
interface PropSpec {
  position: Vec3;
  scale: number;
  rotY: number;
}
interface DockSpec {
  center: Vec3;
  rotY: number;
  length: number;
  width: number;
}
interface BridgeSpec {
  a: Vec3;
  b: Vec3;
}
export interface VillageLayout {
  islands: IslandSpec[];
  cottages: CottageSpec[];
  trees: PropSpec[];
  crystals: PropSpec[];
  lamps: PropSpec[];
  docks: DockSpec[];
  bridges: BridgeSpec[];
  lightClusters: Vec3[];
}

export const ISLAND_VARIANTS = 6;
const SPIRAL_COUNT = 13;
const OUTER_COUNT = 26;
const DOCK_COUNT = 9;

const buildVillageLayout = (): VillageLayout => {
  const rng = createRng(20260418);
  const islands: IslandSpec[] = [];
  const cottages: CottageSpec[] = [];
  const trees: PropSpec[] = [];
  const crystals: PropSpec[] = [];
  const lamps: PropSpec[] = [];
  const docks: DockSpec[] = [];
  const bridges: BridgeSpec[] = [];

  const makeCottage = (x: number, y: number, z: number, rotY: number, scale = 1): CottageSpec => ({
    position: [x, y, z],
    rotY,
    w: (2.2 + rng() * 1.2) * scale,
    h: (1.8 + rng() * 1.0) * scale,
    d: (2.0 + rng() * 1.0) * scale,
    roof: (1.4 + rng() * 0.9) * scale,
    chimney: rng() > 0.45,
    lit: [0, 1, 2, 3, 4, 5].map(() => (rng() > 0.18 ? 0.75 + rng() * 0.5 : 0.08)),
  });

  /** Scatters points on an island crown with simple rejection sampling. */
  const scatter = (island: IslandSpec, count: number, minDist: number, maxR: number, taken: Vec3[]): Vec3[] => {
    const placed: Vec3[] = [];
    for (let k = 0; k < count; k++) {
      for (let attempt = 0; attempt < 24; attempt++) {
        const a = rng() * Math.PI * 2;
        const r = Math.sqrt(rng()) * island.radius * maxR;
        const p: Vec3 = [island.center[0] + Math.cos(a) * r, island.center[1], island.center[2] + Math.sin(a) * r];
        const clear = [...taken, ...placed].every((q) => Math.hypot(q[0] - p[0], q[2] - p[2]) > minDist);
        if (clear) {
          placed.push(p);
          break;
        }
      }
    }
    return placed;
  };

  const populate = (island: IslandSpec, cottageCount: number, treeCount: number, crystalCount: number) => {
    const homes = scatter(island, cottageCount, 3.8, 0.58, []);
    homes.forEach((p) => {
      const outward = Math.atan2(p[0] - island.center[0], p[2] - island.center[2]);
      cottages.push(makeCottage(p[0], p[1], p[2], outward + (rng() - 0.5) * 0.8));
    });
    const pines = scatter(island, treeCount, 1.6, 0.8, homes);
    pines.forEach((p) => trees.push({ position: p, scale: 0.7 + rng() * 0.9, rotY: rng() * Math.PI }));
    const shards = scatter(island, crystalCount, 1.2, 0.85, [...homes, ...pines]);
    shards.forEach((p) => crystals.push({ position: p, scale: 0.35 + rng() * 0.5, rotY: rng() * Math.PI }));
  };

  // Terraced spiral climbing around the spire.
  for (let i = 0; i < SPIRAL_COUNT; i++) {
    const theta = i * 0.95 + 0.4;
    const r = 18 + i * 1.7;
    const island: IslandSpec = {
      center: [Math.cos(theta) * r, 2.5 + i * 0.62 + Math.sin(i * 1.7) * 0.6, Math.sin(theta) * r],
      radius: 5.4 + rng() * 1.8,
      variant: i % ISLAND_VARIANTS,
      rotY: rng() * Math.PI * 2,
    };
    islands.push(island);
    populate(island, 3 + Math.floor(rng() * 3), 3 + Math.floor(rng() * 3), 1);
  }

  // Bridges along the spiral, plus radial spans between the two coils.
  const edgePoint = (from: IslandSpec, to: IslandSpec): Vec3 => {
    const dx = to.center[0] - from.center[0];
    const dz = to.center[2] - from.center[2];
    const len = Math.hypot(dx, dz);
    return [from.center[0] + (dx / len) * from.radius * 0.82, from.center[1] + 0.05, from.center[2] + (dz / len) * from.radius * 0.82];
  };
  for (let i = 0; i < SPIRAL_COUNT - 1; i++) {
    bridges.push({ a: edgePoint(islands[i], islands[i + 1]), b: edgePoint(islands[i + 1], islands[i]) });
  }
  for (let i = 0; i + 7 < SPIRAL_COUNT; i += 2) {
    bridges.push({ a: edgePoint(islands[i], islands[i + 7]), b: edgePoint(islands[i + 7], islands[i]) });
  }

  // Stilted docks on the waterline.
  for (let k = 0; k < DOCK_COUNT; k++) {
    const theta = (k / DOCK_COUNT) * Math.PI * 2 + 0.2;
    const r = 52 + rng() * 5;
    const dock: DockSpec = {
      center: [Math.cos(theta) * r, 0.75, Math.sin(theta) * r],
      rotY: -theta + Math.PI / 2,
      length: 10 + rng() * 3,
      width: 5.5,
    };
    docks.push(dock);
    const along = new THREE.Vector3(1, 0, 0).applyAxisAngle(Y_AXIS, dock.rotY);
    const slots = rng() > 0.5 ? [-3.2, 0, 3.2] : [-2.2, 2.2];
    slots.forEach((s) => {
      cottages.push(
        makeCottage(dock.center[0] + along.x * s, dock.center[1] + 0.2, dock.center[2] + along.z * s, dock.rotY + (rng() > 0.5 ? 0 : Math.PI), 0.9),
      );
    });
    [-1, 1].forEach((end) => {
      lamps.push({
        position: [
          dock.center[0] + along.x * (dock.length / 2) * end,
          dock.center[1] + 1.9,
          dock.center[2] + along.z * (dock.length / 2) * end,
        ],
        scale: 0.22,
        rotY: 0,
      });
    });
  }

  // Outer archipelago on a golden-angle spiral, leaving the veil approach corridor open.
  let placedOuter = 0;
  for (let i = 0; placedOuter < OUTER_COUNT && i < OUTER_COUNT * 3; i++) {
    const theta = i * 2.39996 + 0.9;
    const wrapped = Math.atan2(Math.sin(theta), Math.cos(theta));
    if (Math.abs(wrapped - Math.PI / 2) < 0.42) continue;
    const r = 72 + Math.sqrt((placedOuter + 0.5) / OUTER_COUNT) * 105;
    const island: IslandSpec = {
      center: [Math.cos(theta) * r, 8 + rng() * 34, Math.sin(theta) * r],
      radius: 6 + rng() * 9,
      variant: (i + 3) % ISLAND_VARIANTS,
      rotY: rng() * Math.PI * 2,
    };
    islands.push(island);
    populate(island, 2 + Math.floor(rng() * 4), 4 + Math.floor(rng() * 6), 2 + Math.floor(rng() * 3));
    placedOuter++;
  }

  const lightClusters: Vec3[] = [2, 6, 10].map((i) => {
    const c = islands[i].center;
    return [c[0], c[1] + 4.5, c[2]] as Vec3;
  });
  lightClusters.push([docks[2].center[0], 4, docks[2].center[2]]);

  return { islands, cottages, trees, crystals, lamps, docks, bridges, lightClusters };
};

export const VILLAGE: VillageLayout = buildVillageLayout();

/* -------------------------------------------------------------------------------------------------
 * Shaders
 * -----------------------------------------------------------------------------------------------*/

/** Emissive window / lamp glass with flicker and the Act III harmonic pulse wave. */
const WINDOW_VERTEX = /* glsl */ `
  attribute float aDist;
  attribute float aSeed;
  attribute float aBright;
  varying float vDist;
  varying float vSeed;
  varying float vBright;
  varying vec2 vUv;
  varying float vDepth;
  void main() {
    vUv = uv;
    vDist = aDist;
    vSeed = aSeed;
    vBright = aBright;
    vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const WINDOW_FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform float uPulse;
  uniform float uBase;
  uniform float uMullion;
  uniform vec3 uWarm;
  uniform vec3 uCool;
  uniform vec3 fogColor;
  uniform float fogDensity;
  varying float vDist;
  varying float vSeed;
  varying float vBright;
  varying vec2 vUv;
  varying float vDepth;
  ${GLSL_NOISE}
  void main() {
    float flicker = 0.86 + 0.14 * sin(uTime * (3.0 + vSeed * 5.0) + vSeed * 40.0) * sin(uTime * 1.7 + vSeed * 13.0);
    float wave = 0.5 + 0.5 * sin(vDist * 0.3 - uTime * 5.5);
    float wave2 = 0.5 + 0.5 * sin(vDist * 0.62 - uTime * 11.0 + 1.3);
    float harmonic = pow(wave, 3.0) * 0.75 + pow(wave2, 4.0) * 0.35;
    float energy = vBright * (uBase * flicker + uPulse * harmonic * 2.6);
    vec3 tint = mix(uWarm, mix(uWarm, uCool, 0.7), clamp(uPulse * harmonic, 0.0, 1.0));
    vec3 col = tint * energy;
    vec2 c = abs(vUv - 0.5);
    float edge = step(0.42, max(c.x, c.y));
    float bars = step(c.x, 0.035) + step(abs(vUv.y - 0.55), 0.035);
    col *= 1.0 - clamp(edge + bars, 0.0, 1.0) * 0.85 * uMullion;
    col *= 0.8 + 0.45 * (1.0 - length(c) * 1.3);
    col = mix(col, fogColor, fogAmount(vDepth, fogDensity));
    gl_FragColor = vec4(col, 1.0);
  }
`;

const createWindowMaterial = (mullion: number, base: number) =>
  new THREE.ShaderMaterial({
    uniforms: {
      ...fogUniforms(),
      uTime: { value: 0 },
      uPulse: { value: 0 },
      uBase: { value: base },
      uMullion: { value: mullion },
      uWarm: { value: new THREE.Color(PALETTE.amber).multiplyScalar(2.4) },
      uCool: { value: new THREE.Color(PALETTE.cyan).multiplyScalar(2.6) },
    },
    vertexShader: WINDOW_VERTEX,
    fragmentShader: WINDOW_FRAGMENT,
    fog: true,
    side: THREE.DoubleSide,
  });

/** Nebula sky dome. */
const SKY_VERTEX = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_Position.z = gl_Position.w;
  }
`;

const SKY_FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform float uMist;
  uniform vec3 uMistColor;
  uniform vec3 uObsidian;
  uniform vec3 uIndigo;
  uniform vec3 uMagenta;
  uniform vec3 uCyan;
  uniform vec3 uAmber;
  varying vec3 vDir;
  ${GLSL_NOISE}
  void main() {
    vec3 dir = normalize(vDir);
    float h = dir.y;
    vec3 p = dir * 2.4;
    float n1 = fbm(p + vec3(0.0, uTime * 0.012, uTime * 0.006));
    float n2 = fbm(p * 1.9 + n1 * 1.6 + vec3(3.0, 1.0, -2.0));
    float nebula = smoothstep(0.42, 0.82, n2);
    float band = exp(-pow(dot(dir, normalize(vec3(0.35, 0.75, -0.55))) * 3.2, 2.0));
    vec3 col = mix(uObsidian, uIndigo, smoothstep(-0.25, 0.7, h) * 0.75 + 0.1);
    col += uMagenta * nebula * (0.35 + band * 0.6) * smoothstep(-0.3, 0.3, h);
    col += uCyan * pow(smoothstep(0.5, 0.95, n1 * n2 * 1.7), 2.0) * (0.25 + band * 0.4);
    col += mix(uMagenta, uCyan, n1) * band * 0.18;
    col += uAmber * 0.22 * exp(-abs(h) * 7.0);
    col *= mix(0.55, 1.0, smoothstep(-0.3, 0.1, h));
    float mist = uMist * (0.55 + 0.45 * (1.0 - smoothstep(0.0, 0.8, abs(h))));
    col = mix(col, uMistColor, clamp(mist, 0.0, 1.0));
    gl_FragColor = vec4(col, 1.0);
  }
`;

/** Reflective water: projective reflection with procedural ripples and exp2 fog. */
const WATER_SHADER = {
  name: "AethelgardWater",
  uniforms: {
    color: { value: null as THREE.Color | null },
    tDiffuse: { value: null as THREE.Texture | null },
    textureMatrix: { value: null as THREE.Matrix4 | null },
    uTime: { value: 0 },
    uDeep: { value: new THREE.Color("#04050d") },
    uGlint: { value: new THREE.Color(PALETTE.cyan) },
    ...THREE.UniformsLib.fog,
  },
  vertexShader: /* glsl */ `
    uniform mat4 textureMatrix;
    varying vec4 vProj;
    varying vec3 vWorld;
    void main() {
      vProj = textureMatrix * vec4(position, 1.0);
      vec4 world = modelMatrix * vec4(position, 1.0);
      vWorld = world.xyz;
      gl_Position = projectionMatrix * viewMatrix * world;
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform vec3 uDeep;
    uniform vec3 uGlint;
    uniform vec3 fogColor;
    uniform float fogDensity;
    varying vec4 vProj;
    varying vec3 vWorld;
    ${GLSL_NOISE}
    void main() {
      vec2 q = vWorld.xz * 0.12;
      float n1 = vnoise(vec3(q * 1.0 + vec2(uTime * 0.12, uTime * 0.05), uTime * 0.1));
      float n2 = vnoise(vec3(q * 2.3 - vec2(uTime * 0.07, uTime * 0.15), uTime * 0.13 + 4.0));
      vec2 ripple = (vec2(n1, n2) - 0.5) * 0.035;
      float dist = length(cameraPosition - vWorld);
      ripple *= clamp(30.0 / max(dist, 1.0), 0.15, 1.0);
      vec2 uv = vProj.xy / vProj.w + ripple;
      vec3 reflection = texture2D(tDiffuse, uv).rgb;
      vec3 viewDir = normalize(cameraPosition - vWorld);
      float fresnel = 0.25 + 0.75 * pow(1.0 - max(dot(viewDir, vec3(0.0, 1.0, 0.0)), 0.0), 3.0);
      vec3 col = mix(uDeep, reflection * 0.9, fresnel);
      float sparkle = pow(vnoise(vec3(vWorld.xz * 1.7, uTime * 0.8)), 18.0) * 2.0;
      col += uGlint * sparkle * 0.25 * fresnel;
      col = mix(col, fogColor, fogAmount(dist, fogDensity));
      gl_FragColor = vec4(col, 1.0);
    }
  `,
};

/** Rune gate torus: carved stone with scrolling glyph bands. */
const RUNE_RING_VERTEX = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormalV;
  varying vec3 vViewPos;
  void main() {
    vUv = uv;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vViewPos = mv.xyz;
    vNormalV = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * mv;
  }
`;

const RUNE_RING_FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform float uGlow;
  uniform vec3 uStone;
  uniform vec3 uRune;
  uniform vec3 fogColor;
  uniform float fogDensity;
  varying vec2 vUv;
  varying vec3 vNormalV;
  varying vec3 vViewPos;
  ${GLSL_NOISE}
  float segment(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p - a;
    vec2 ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h);
  }
  float glyph(vec2 p, float id) {
    float d = segment(p, vec2(0.5, 0.12), vec2(0.5, 0.88));
    float r1 = hash11(id * 3.7);
    float r2 = hash11(id * 7.1 + 1.3);
    float r3 = hash11(id * 1.9 + 4.2);
    if (r1 > 0.3) d = min(d, segment(p, vec2(0.5, mix(0.3, 0.7, r2)), vec2(0.82, mix(0.15, 0.85, r3))));
    if (r2 > 0.45) d = min(d, segment(p, vec2(0.5, mix(0.2, 0.6, r3)), vec2(0.18, mix(0.4, 0.9, r1))));
    if (r3 > 0.6) d = min(d, segment(p, vec2(0.25, 0.5), vec2(0.75, 0.5)));
    return d;
  }
  void main() {
    vec3 n = normalize(vNormalV);
    vec3 v = normalize(-vViewPos);
    float lambert = 0.35 + 0.65 * max(dot(n, normalize(vec3(-0.4, 0.8, 0.5))), 0.0);
    float grain = fbm(vec3(vUv * vec2(80.0, 6.0), 1.0));
    vec3 col = uStone * lambert * (0.7 + grain * 0.6);
    float cells = 56.0;
    vec2 cell = vec2(fract(vUv.x * cells - uTime * 0.25), fract(vUv.y * 2.0));
    float id = floor(vUv.x * cells - uTime * 0.25) + floor(vUv.y * 2.0) * 101.0;
    float d = glyph(cell, id);
    float stroke = smoothstep(0.08, 0.02, d);
    float halo = exp(-d * 9.0) * 0.45;
    float pulse = 0.6 + 0.4 * sin(uTime * 3.0 + id * 0.7);
    col += uRune * (stroke + halo) * pulse * uGlow;
    float rim = pow(1.0 - max(dot(n, v), 0.0), 3.0);
    col += uRune * rim * 0.35 * uGlow;
    col = mix(col, fogColor, fogAmount(-vViewPos.z, fogDensity) * 0.85);
    gl_FragColor = vec4(col, 1.0);
  }
`;

/** Swirling portal membrane inside the gate. */
const PORTAL_FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform float uIntensity;
  uniform vec3 uCyan;
  uniform vec3 uMagenta;
  varying vec2 vUv;
  ${GLSL_NOISE}
  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float r = length(p);
    float a = atan(p.y, p.x);
    float swirl = fbm(vec3(cos(a + r * 4.0 - uTime * 1.8) * r * 2.5, sin(a + r * 4.0 - uTime * 1.8) * r * 2.5, uTime * 0.25));
    float rings = 0.5 + 0.5 * sin(r * 26.0 - uTime * 6.0 + swirl * 6.0);
    float edge = smoothstep(1.0, 0.82, r);
    float core = smoothstep(0.55, 0.0, r);
    vec3 col = mix(uMagenta, uCyan, swirl) * (0.25 + swirl * 0.9) * (0.6 + rings * 0.6);
    col += uCyan * pow(smoothstep(0.85, 1.0, r) * edge, 1.0) * 1.4;
    col += vec3(0.8, 1.0, 1.0) * core * 0.15;
    float alpha = edge * (0.35 + 0.65 * swirl);
    gl_FragColor = vec4(col * alpha * uIntensity, 1.0);
  }
`;

const UV_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/** Faceted crystal with fresnel rim and scrolling inner veins. Works for instanced and plain meshes. */
const CRYSTAL_VERTEX = /* glsl */ `
  varying vec3 vViewPos;
  varying vec3 vLocal;
  void main() {
    vLocal = position;
    vec4 local = vec4(position, 1.0);
    #ifdef USE_INSTANCING
      local = instanceMatrix * local;
    #endif
    vec4 mv = modelViewMatrix * local;
    vViewPos = mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`;

const CRYSTAL_FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform float uPulse;
  uniform float uFlash;
  uniform vec3 uCore;
  uniform vec3 uBody;
  uniform vec3 uRim;
  uniform vec3 fogColor;
  uniform float fogDensity;
  varying vec3 vViewPos;
  varying vec3 vLocal;
  ${GLSL_NOISE}
  void main() {
    vec3 n = normalize(cross(dFdx(vViewPos), dFdy(vViewPos)));
    vec3 v = normalize(-vViewPos);
    float facing = abs(dot(n, v));
    float fresnel = pow(1.0 - facing, 2.2);
    float facet = 0.35 + 0.65 * max(dot(n, normalize(vec3(0.3, 0.9, 0.4))), 0.0);
    float veins = sin(vLocal.y * 2.6 - uTime * 4.0 + fbm(vLocal * 1.3 + uTime * 0.2) * 5.0);
    float vein = smoothstep(0.75, 1.0, veins);
    vec3 col = uBody * facet;
    col += uRim * fresnel * (1.4 + uPulse * 1.2);
    col += uCore * vein * (0.45 + uPulse * 2.2);
    col += uCore * pow(facing, 6.0) * (0.25 + uPulse * 0.8);
    col += vec3(1.0) * uFlash * 2.5;
    col = mix(col, fogColor, fogAmount(-vViewPos.z, fogDensity) * 0.8);
    gl_FragColor = vec4(col, 1.0);
  }
`;

const createCrystalMaterial = () =>
  new THREE.ShaderMaterial({
    uniforms: {
      ...fogUniforms(),
      uTime: { value: 0 },
      uPulse: { value: 0 },
      uFlash: { value: 0 },
      uCore: { value: new THREE.Color(PALETTE.cyan).multiplyScalar(1.6) },
      uBody: { value: new THREE.Color("#2a1856") },
      uRim: { value: new THREE.Color(PALETTE.magenta).multiplyScalar(1.3) },
    },
    vertexShader: CRYSTAL_VERTEX,
    fragmentShader: CRYSTAL_FRAGMENT,
    fog: true,
  });

/** Vertical energy pillar with scrolling procedural waves. */
const BEAM_VERTEX = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormalV;
  varying vec3 vViewPos;
  varying float vWorldY;
  void main() {
    vUv = uv;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorldY = world.y;
    vec4 mv = viewMatrix * world;
    vViewPos = mv.xyz;
    vNormalV = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * mv;
  }
`;

const BEAM_FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform float uIntensity;
  uniform float uSharpness;
  uniform vec3 uCore;
  uniform vec3 uEdge;
  varying vec2 vUv;
  varying vec3 vNormalV;
  varying vec3 vViewPos;
  varying float vWorldY;
  ${GLSL_NOISE}
  void main() {
    float facing = abs(dot(normalize(vNormalV), normalize(-vViewPos)));
    float core = pow(facing, uSharpness);
    float spiral = sin(vUv.x * 6.2831 * 3.0 + vWorldY * 0.35 - uTime * 7.0);
    float waves = 0.5 + 0.5 * sin(vWorldY * 0.6 - uTime * 14.0 + spiral * 1.5);
    float turbulence = fbm(vec3(vUv.x * 9.0, vWorldY * 0.07 - uTime * 1.6, uTime * 0.3));
    float energy = core * (0.55 + 0.7 * waves * turbulence + 0.25 * spiral);
    float top = 1.0 - smoothstep(0.55, 1.0, vUv.y);
    float base = smoothstep(0.0, 0.015, vUv.y);
    vec3 col = mix(uEdge, uCore, core) * energy;
    col += vec3(0.9, 1.0, 1.0) * pow(core, 6.0) * 0.8;
    gl_FragColor = vec4(col * top * base * uIntensity, 1.0);
  }
`;

const createBeamMaterial = (sharpness: number) =>
  new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uIntensity: { value: 0 },
      uSharpness: { value: sharpness },
      uCore: { value: new THREE.Color(PALETTE.cyan).multiplyScalar(1.5) },
      uEdge: { value: new THREE.Color(PALETTE.magenta).multiplyScalar(1.1) },
    },
    vertexShader: BEAM_VERTEX,
    fragmentShader: BEAM_FRAGMENT,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

/* -------------------------------------------------------------------------------------------------
 * Sky & water
 * -----------------------------------------------------------------------------------------------*/

export const SkyDome: React.FC = () => {
  const { frame, t } = useTime();
  const geometry = useDisposable(() => new THREE.SphereGeometry(1800, 64, 32));
  const material = useDisposable(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uMist: { value: 1 },
          uMistColor: { value: new THREE.Color(PALETTE.indigo) },
          uObsidian: { value: new THREE.Color(PALETTE.obsidian) },
          uIndigo: { value: new THREE.Color("#2c3678") },
          uMagenta: { value: new THREE.Color(PALETTE.magenta) },
          uCyan: { value: new THREE.Color(PALETTE.cyan) },
          uAmber: { value: new THREE.Color(PALETTE.amber) },
        },
        vertexShader: SKY_VERTEX,
        fragmentShader: SKY_FRAGMENT,
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
      }),
  );

  useLayoutEffect(() => {
    const atmo = getAtmosphere(frame);
    material.uniforms.uTime.value = t;
    material.uniforms.uMist.value = atmo.skyMist;
    (material.uniforms.uMistColor.value as THREE.Color).set(atmo.fogColor);
  }, [frame, t, material]);

  return <mesh geometry={geometry} material={material} renderOrder={-10} frustumCulled={false} />;
};

const STAR_COUNT = 3200;

export const Starfield: React.FC = () => {
  const { frame, t } = useTime();
  const geometry = useDisposable(() => {
    const rng = createRng(77);
    const positions = new Float32Array(STAR_COUNT * 3);
    const sizes = new Float32Array(STAR_COUNT);
    const seeds = new Float32Array(STAR_COUNT);
    const colors = new Float32Array(STAR_COUNT * 3);
    const tints = [new THREE.Color("#ffffff"), new THREE.Color("#bff8ff"), new THREE.Color("#ffe1a8"), new THREE.Color("#d9c2ff")];
    for (let i = 0; i < STAR_COUNT; i++) {
      const y = -0.05 + rng() * 1.05;
      const a = rng() * Math.PI * 2;
      const r = Math.sqrt(1 - y * y);
      positions.set([Math.cos(a) * r * 1500, y * 1500, Math.sin(a) * r * 1500], i * 3);
      sizes[i] = 1.2 + Math.pow(rng(), 6) * 4.5;
      seeds[i] = rng();
      const c = tints[Math.floor(rng() * tints.length)];
      colors.set([c.r, c.g, c.b], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return g;
  });
  const material = useDisposable(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uVisibility: { value: 0 } },
        vertexShader: /* glsl */ `
          attribute float aSize;
          attribute float aSeed;
          uniform float uTime;
          varying vec3 vColor;
          varying float vTwinkle;
          void main() {
            vColor = color;
            vTwinkle = 0.6 + 0.4 * sin(uTime * (1.5 + aSeed * 3.0) + aSeed * 60.0);
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            gl_Position = projectionMatrix * mv;
            gl_Position.z = gl_Position.w * 0.99999;
            gl_PointSize = aSize;
          }
        `,
        fragmentShader: /* glsl */ `
          uniform float uVisibility;
          varying vec3 vColor;
          varying float vTwinkle;
          void main() {
            float d = length(gl_PointCoord - 0.5);
            float a = smoothstep(0.5, 0.0, d);
            gl_FragColor = vec4(vColor * a * a * vTwinkle * uVisibility * 1.6, 1.0);
          }
        `,
        vertexColors: true,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false,
      }),
  );

  useLayoutEffect(() => {
    const atmo = getAtmosphere(frame);
    material.uniforms.uTime.value = t;
    material.uniforms.uVisibility.value = 1 - atmo.skyMist * 0.92;
  }, [frame, t, material]);

  return <points geometry={geometry} material={material} renderOrder={-9} frustumCulled={false} />;
};

export const ReflectiveWater: React.FC = () => {
  const { frame, t } = useTime();
  const reflector = useDisposable(() => {
    const r = new Reflector(new THREE.PlaneGeometry(3200, 3200), {
      textureWidth: WIDTH / 2,
      textureHeight: HEIGHT / 2,
      clipBias: 0.003,
      color: new THREE.Color("#7f86a8"),
      multisample: 2,
      shader: WATER_SHADER,
    });
    r.rotation.x = -Math.PI / 2;
    const mat = r.material as THREE.ShaderMaterial;
    mat.fog = true;
    return r;
  });

  useLayoutEffect(() => {
    (reflector.material as THREE.ShaderMaterial).uniforms.uTime.value = t;
  }, [frame, t, reflector]);

  return <primitive object={reflector} />;
};

/* -------------------------------------------------------------------------------------------------
 * Act I — the veil: drifting obsidian rocks and the rune gate
 * -----------------------------------------------------------------------------------------------*/

interface RockInstance {
  base: Vec3;
  scale: Vec3;
  rot: Vec3;
  spin: Vec3;
  bob: number;
  phase: number;
}

const ROCK_VARIANTS = 6;
const ROCKS_PER_VARIANT = 9;

const buildRocks = (): RockInstance[][] => {
  const rng = createRng(4242);
  const sets: RockInstance[][] = [];
  for (let v = 0; v < ROCK_VARIANTS; v++) {
    const list: RockInstance[] = [];
    while (list.length < ROCKS_PER_VARIANT) {
      const x = (rng() - 0.5) * 130;
      const y = -4 + rng() * 34;
      const z = 98 + rng() * 150;
      const s = 1.4 + Math.pow(rng(), 1.8) * 6.5;
      const inCorridor = Math.abs(x) < 9 + s && Math.abs(y - 6.5) < 8 + s;
      const nearGate = Math.hypot(x, y - ANCHORS.gate[1], (z - ANCHORS.gate[2]) * 0.6) < 13 + s;
      if (inCorridor || nearGate) continue;
      list.push({
        base: [x, y, z],
        scale: [s * (0.8 + rng() * 0.5), s * (0.8 + rng() * 0.8), s * (0.8 + rng() * 0.5)],
        rot: [rng() * Math.PI, rng() * Math.PI, rng() * Math.PI],
        spin: [(rng() - 0.5) * 0.12, (rng() - 0.5) * 0.18, (rng() - 0.5) * 0.1],
        bob: 0.3 + rng() * 0.9,
        phase: rng() * Math.PI * 2,
      });
    }
    sets.push(list);
  }
  return sets;
};

const ROCKS = buildRocks();

const RockSet: React.FC<{ variant: number; geometry: THREE.BufferGeometry; material: THREE.Material }> = ({
  variant,
  geometry,
  material,
}) => {
  const { frame, t } = useTime();
  const ref = useRef<THREE.InstancedMesh>(null);
  const rocks = ROCKS[variant];

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    rocks.forEach((r, i) => {
      compose(
        [r.base[0], r.base[1] + Math.sin(t * 0.6 + r.phase) * r.bob, r.base[2]],
        [r.rot[0] + t * r.spin[0], r.rot[1] + t * r.spin[1], r.rot[2] + t * r.spin[2]],
        r.scale,
        tmpMatrix,
      );
      mesh.setMatrixAt(i, tmpMatrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [frame, t, rocks]);

  return <instancedMesh ref={ref} args={[geometry, material, rocks.length]} frustumCulled={false} />;
};

export const VeilRocks: React.FC = () => {
  const geometries = useMemo(() => Array.from({ length: ROCK_VARIANTS }, (_, i) => createRockGeometry(i + 1)), []);
  useEffect(() => () => geometries.forEach((g) => g.dispose()), [geometries]);
  const material = useDisposable(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#1d2142",
        roughness: 0.92,
        metalness: 0.08,
        flatShading: true,
        emissive: new THREE.Color("#0a0d24"),
        emissiveIntensity: 0.6,
      }),
  );
  return (
    <group>
      {geometries.map((g, i) => (
        <RockSet key={i} variant={i} geometry={g} material={material} />
      ))}
    </group>
  );
};

const GATE_STONES = 24;

export const RuneGate: React.FC = () => {
  const { frame, fps, t } = useTime();
  const rootRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Group>(null);
  const outerRef = useRef<THREE.Group>(null);
  const stonesRef = useRef<THREE.InstancedMesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);

  const torus = useDisposable(() => new THREE.TorusGeometry(7, 0.62, 28, 180));
  const thinTorus = useDisposable(() => new THREE.TorusGeometry(8.5, 0.09, 8, 220));
  const disc = useDisposable(() => new THREE.CircleGeometry(6.45, 128));
  const stoneGeo = useDisposable(() => new THREE.OctahedronGeometry(0.42, 0));

  const ringMaterial = useDisposable(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          ...fogUniforms(),
          uTime: { value: 0 },
          uGlow: { value: 1 },
          uStone: { value: new THREE.Color("#2a2c48") },
          uRune: { value: new THREE.Color(PALETTE.cyan).multiplyScalar(2.2) },
        },
        vertexShader: RUNE_RING_VERTEX,
        fragmentShader: RUNE_RING_FRAGMENT,
        fog: true,
      }),
  );
  const portalMaterial = useDisposable(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uIntensity: { value: 1 },
          uCyan: { value: new THREE.Color(PALETTE.cyan).multiplyScalar(1.4) },
          uMagenta: { value: new THREE.Color(PALETTE.magenta).multiplyScalar(1.2) },
        },
        vertexShader: UV_VERTEX,
        fragmentShader: PORTAL_FRAGMENT,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
  );
  const haloMaterial = useDisposable(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(PALETTE.magenta).multiplyScalar(2.2),
        toneMapped: false,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
  );
  const stoneMaterial = useDisposable(
    () => new THREE.MeshBasicMaterial({ color: new THREE.Color(PALETTE.cyan).multiplyScalar(1.8), toneMapped: false }),
  );

  useLayoutEffect(() => {
    const atmo = getAtmosphere(frame);
    const spin = integrate(frame, (f) => getAtmosphere(f).portalSpin, fps);
    const awaken = track(frame, [0, 40, 120], [0.45, 0.8, 1.25]);
    // Once the camera is through, the gate seals itself behind the viewer.
    const seal = track(frame, [PORTAL_CROSS_FRAME + 6, PORTAL_CROSS_FRAME + 40], [1, 0], (x) => x * x * x);
    if (rootRef.current) {
      rootRef.current.scale.setScalar(Math.max(seal, 0.0001));
      rootRef.current.visible = seal > 0.001;
    }
    ringMaterial.uniforms.uTime.value = t;
    ringMaterial.uniforms.uGlow.value = awaken + atmo.portalFlash * 2;
    portalMaterial.uniforms.uTime.value = t * (1 + atmo.portalSpin * 0.6);
    portalMaterial.uniforms.uIntensity.value = awaken * (1 + atmo.portalFlash * 3);
    haloMaterial.opacity = 0.55 + 0.45 * Math.sin(t * 2.2);
    if (ringRef.current) ringRef.current.rotation.z = spin;
    if (outerRef.current) {
      outerRef.current.rotation.z = -spin * 0.6;
      outerRef.current.rotation.x = Math.sin(t * 0.5) * 0.08;
    }
    if (lightRef.current) lightRef.current.intensity = ((35 + Math.sin(t * 3.1) * 8) * awaken + atmo.portalFlash * 160) * seal;
    const stones = stonesRef.current;
    if (stones) {
      for (let i = 0; i < GATE_STONES; i++) {
        const a = (i / GATE_STONES) * Math.PI * 2 - spin * 0.35;
        const r = 10 + Math.sin(t * 1.3 + i) * 0.35;
        compose([Math.cos(a) * r, Math.sin(a) * r, Math.sin(t * 0.9 + i * 0.7) * 0.6], [t + i, t * 0.7, 0], [1, 1.8, 1], tmpMatrix);
        stones.setMatrixAt(i, tmpMatrix);
      }
      stones.instanceMatrix.needsUpdate = true;
    }
  }, [frame, fps, t, ringMaterial, portalMaterial, haloMaterial]);

  return (
    <group ref={rootRef} position={[...ANCHORS.gate]}>
      <group ref={ringRef}>
        <mesh geometry={torus} material={ringMaterial} />
      </group>
      <group ref={outerRef}>
        <mesh geometry={thinTorus} material={haloMaterial} />
        <instancedMesh ref={stonesRef} args={[stoneGeo, stoneMaterial, GATE_STONES]} frustumCulled={false} />
      </group>
      <mesh geometry={disc} material={portalMaterial} />
      <pointLight ref={lightRef} color={PALETTE.cyan} intensity={30} distance={90} decay={1.2} />
    </group>
  );
};

/* -------------------------------------------------------------------------------------------------
 * Act II — the mystical village
 * -----------------------------------------------------------------------------------------------*/

const ISLAND_COLORS = { wallTones: ["#5d527c", "#6b5c84", "#4f4d74", "#614c6c"], roofTones: ["#2f2952", "#3b305a", "#463152", "#2d3759"] };

interface CottageBuffers {
  walls: THREE.Matrix4[];
  wallColors: THREE.Color[];
  roofs: THREE.Matrix4[];
  roofColors: THREE.Color[];
  timbers: THREE.Matrix4[];
  chimneys: THREE.Matrix4[];
  windows: THREE.Matrix4[];
  windowDist: number[];
  windowSeed: number[];
  windowBright: number[];
  doors: THREE.Matrix4[];
  doorDist: number[];
  doorSeed: number[];
}

const buildCottageBuffers = (layout: VillageLayout): CottageBuffers => {
  const rng = createRng(99);
  const out: CottageBuffers = {
    walls: [],
    wallColors: [],
    roofs: [],
    roofColors: [],
    timbers: [],
    chimneys: [],
    windows: [],
    windowDist: [],
    windowSeed: [],
    windowBright: [],
    doors: [],
    doorDist: [],
    doorSeed: [],
  };
  const base = new THREE.Matrix4();
  const local = new THREE.Matrix4();
  const push = (target: THREE.Matrix4[], p: Vec3, r: [number, number, number], s: Vec3) => {
    compose(p, r, s, local);
    target.push(new THREE.Matrix4().multiplyMatrices(base, local));
  };

  layout.cottages.forEach((c, idx) => {
    compose(c.position, [0, c.rotY, 0], 1, base);
    const dist = Math.hypot(c.position[0], c.position[2]);
    const { w, h, d } = c;
    push(out.walls, [0, -0.45, 0], [0, 0, 0], [w, h + 0.45, d]);
    out.wallColors.push(new THREE.Color(ISLAND_COLORS.wallTones[idx % 4]).multiplyScalar(0.85 + rng() * 0.3));
    const half = Math.SQRT1_2;
    push(out.roofs, [0, h - 0.02, 0], [0, Math.PI / 4, 0], [(w / 2 + 0.32) / half, c.roof, (d / 2 + 0.32) / half]);
    out.roofColors.push(new THREE.Color(ISLAND_COLORS.roofTones[(idx * 3) % 4]).multiplyScalar(0.85 + rng() * 0.3));

    // Timber frame: corner posts and horizontal beams front and back.
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        push(out.timbers, [(sx * w) / 2, -0.45, (sz * d) / 2], [0, 0, 0], [0.17, h + 0.45, 0.17]);
      }
    }
    for (const sz of [-1, 1]) {
      push(out.timbers, [0, h * 0.24, (sz * d) / 2 + 0.03], [0, 0, 0], [w + 0.1, 0.12, 0.08]);
      push(out.timbers, [0, h - 0.1, (sz * d) / 2 + 0.03], [0, 0, 0], [w + 0.1, 0.12, 0.08]);
    }
    if (c.chimney) push(out.chimneys, [w * 0.22, h + c.roof * 0.25, d * 0.12], [0, 0, 0], [0.36, c.roof * 0.6 + 0.4, 0.36]);

    // Windows: two front, one back, one per side. Door on the front.
    const wy = h * 0.58;
    const panes: { p: Vec3; r: number }[] = [
      { p: [-w * 0.27, wy, d / 2 + 0.025], r: 0 },
      { p: [w * 0.27, wy, d / 2 + 0.025], r: 0 },
      { p: [0, wy, -d / 2 - 0.025], r: Math.PI },
      { p: [w / 2 + 0.025, wy, 0], r: Math.PI / 2 },
      { p: [-w / 2 - 0.025, wy, 0], r: -Math.PI / 2 },
    ];
    panes.forEach((pane, k) => {
      push(out.windows, pane.p, [0, pane.r, 0], [0.44, 0.56, 1]);
      out.windowDist.push(dist);
      out.windowSeed.push(rng());
      out.windowBright.push(c.lit[k]);
    });
    push(out.doors, [0, 0.5, d / 2 + 0.02], [0, 0, 0], [0.58, 1.0, 1]);
    out.doorDist.push(dist);
    out.doorSeed.push(rng());
  });
  return out;
};

interface BridgeBuffers {
  ropes: THREE.BufferGeometry;
  planks: THREE.Matrix4[];
  posts: THREE.Matrix4[];
  lamps: PropSpec[];
}

const buildBridgeBuffers = (bridges: BridgeSpec[]): BridgeBuffers => {
  const tubes: THREE.BufferGeometry[] = [];
  const planks: THREE.Matrix4[] = [];
  const posts: THREE.Matrix4[] = [];
  const lamps: PropSpec[] = [];
  bridges.forEach((b) => {
    const A = new THREE.Vector3(...b.a);
    const B = new THREE.Vector3(...b.b);
    const len = A.distanceTo(B);
    const mid = A.clone().lerp(B, 0.5);
    mid.y -= 0.35 + len * 0.07;
    const deck = new THREE.QuadraticBezierCurve3(A, mid, B);
    const dir = B.clone().sub(A).setY(0).normalize();
    const side = new THREE.Vector3(dir.z, 0, -dir.x).multiplyScalar(0.62);
    for (const s of [-1, 1]) {
      const off = side.clone().multiplyScalar(s);
      const rail = new THREE.QuadraticBezierCurve3(
        A.clone().add(off).add(new THREE.Vector3(0, 1.05, 0)),
        mid.clone().add(off).add(new THREE.Vector3(0, 1.25, 0)),
        B.clone().add(off).add(new THREE.Vector3(0, 1.05, 0)),
      );
      tubes.push(new THREE.TubeGeometry(rail, 28, 0.045, 5, false));
      const guide = new THREE.QuadraticBezierCurve3(A.clone().add(off), mid.clone().add(off), B.clone().add(off));
      tubes.push(new THREE.TubeGeometry(guide, 28, 0.035, 5, false));
      for (const end of [A, B]) {
        posts.push(compose(end.clone().add(off).add(new THREE.Vector3(0, 0.55, 0)), [0, 0, 0], [0.11, 1.15, 0.11]));
      }
    }
    const count = Math.max(4, Math.ceil(len / 0.42));
    for (let i = 0; i < count; i++) {
      const tt = (i + 0.5) / count;
      const p = deck.getPoint(tt);
      const tan = deck.getTangent(tt).normalize();
      const q = new THREE.Quaternion().setFromUnitVectors(Z_AXIS, tan);
      planks.push(new THREE.Matrix4().compose(p, q, new THREE.Vector3(1.3, 0.08, 0.3)));
    }
    const lampPos = deck.getPoint(0.5);
    lamps.push({ position: [lampPos.x, lampPos.y + 1.55, lampPos.z], scale: 0.2, rotY: 0 });
  });
  const ropes = mergeGeometries(tubes, false) ?? new THREE.BufferGeometry();
  tubes.forEach((g) => g.dispose());
  return { ropes, planks, posts, lamps };
};

const InstancedGlow: React.FC<{
  geometry: THREE.BufferGeometry;
  material: THREE.ShaderMaterial;
  matrices: THREE.Matrix4[];
  dist: number[];
  seed: number[];
  bright: number[];
}> = ({ geometry, material, matrices, dist, seed, bright }) => {
  const ref = useRef<THREE.InstancedMesh>(null);
  const instanced = useMemo(() => {
    const g = geometry.clone();
    g.setAttribute("aDist", new THREE.InstancedBufferAttribute(new Float32Array(dist), 1));
    g.setAttribute("aSeed", new THREE.InstancedBufferAttribute(new Float32Array(seed), 1));
    g.setAttribute("aBright", new THREE.InstancedBufferAttribute(new Float32Array(bright), 1));
    return g;
  }, [geometry, dist, seed, bright]);
  useEffect(() => () => instanced.dispose(), [instanced]);
  useStaticInstances(ref, matrices);
  return <instancedMesh ref={ref} args={[instanced, material, matrices.length]} frustumCulled={false} />;
};

const StaticInstances: React.FC<{
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  matrices: THREE.Matrix4[];
  colors?: THREE.Color[];
}> = ({ geometry, material, matrices, colors }) => {
  const ref = useRef<THREE.InstancedMesh>(null);
  useStaticInstances(ref, matrices, colors);
  return <instancedMesh ref={ref} args={[geometry, material, Math.max(1, matrices.length)]} frustumCulled={false} />;
};

export const MysticalVillage: React.FC = () => {
  const { frame, t } = useTime();
  const layout = VILLAGE;

  const cottages = useMemo(() => buildCottageBuffers(layout), [layout]);
  const bridges = useMemo(() => buildBridgeBuffers(layout.bridges), [layout]);
  useEffect(() => () => bridges.ropes.dispose(), [bridges]);

  const islandGeos = useMemo(() => Array.from({ length: ISLAND_VARIANTS }, (_, i) => createIslandGeometry(i * 3 + 1)), []);
  useEffect(() => () => islandGeos.forEach((g) => g.dispose()), [islandGeos]);
  const spireGeo = useDisposable(createSpireGeometry);
  const box = useDisposable(() => new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0));
  const centeredBox = useDisposable(() => new THREE.BoxGeometry(1, 1, 1));
  const roofGeo = useDisposable(() => new THREE.ConeGeometry(1, 1, 4, 1).translate(0, 0.5, 0));
  const plane = useDisposable(() => new THREE.PlaneGeometry(1, 1));
  const lampGeo = useDisposable(() => new THREE.SphereGeometry(1, 12, 8));
  const pineLower = useDisposable(() => new THREE.ConeGeometry(0.95, 2.1, 7).translate(0, 1.35, 0));
  const pineUpper = useDisposable(() => new THREE.ConeGeometry(0.62, 1.7, 7).translate(0, 2.6, 0));
  const trunkGeo = useDisposable(() => new THREE.CylinderGeometry(0.12, 0.16, 0.8, 5).translate(0, 0.4, 0));
  const shardGeo = useDisposable(() => new THREE.OctahedronGeometry(1, 0));
  const stiltGeo = useDisposable(() => new THREE.CylinderGeometry(0.16, 0.2, 1, 6).translate(0, 0.5, 0));

  const islandMaterial = useDisposable(
    () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0.02, flatShading: true }),
  );
  const spireMaterial = useDisposable(
    () => new THREE.MeshStandardMaterial({ color: "#423d66", roughness: 0.92, flatShading: true, emissive: "#0e0c22" }),
  );
  const wallMaterial = useDisposable(() => new THREE.MeshStandardMaterial({ roughness: 0.88, metalness: 0.0 }));
  const roofMaterial = useDisposable(() => new THREE.MeshStandardMaterial({ roughness: 0.8, flatShading: true }));
  const timberMaterial = useDisposable(() => new THREE.MeshStandardMaterial({ color: "#241a2c", roughness: 0.9 }));
  const woodMaterial = useDisposable(() => new THREE.MeshStandardMaterial({ color: "#3a2a26", roughness: 0.95 }));
  const ropeMaterial = useDisposable(() => new THREE.MeshStandardMaterial({ color: "#6b5640", roughness: 1 }));
  const pineMaterial = useDisposable(
    () => new THREE.MeshStandardMaterial({ color: "#1e4a46", roughness: 0.9, flatShading: true, emissive: "#05302b", emissiveIntensity: 0.7 }),
  );
  const shardMaterial = useDisposable(
    () => new THREE.MeshBasicMaterial({ color: new THREE.Color(PALETTE.cyan).multiplyScalar(1.7), toneMapped: false }),
  );
  const runeStripMaterial = useDisposable(
    () => new THREE.MeshBasicMaterial({ color: new THREE.Color(PALETTE.cyan).multiplyScalar(2.0), toneMapped: false }),
  );
  const windowMaterial = useDisposable(() => createWindowMaterial(1, 1));
  const doorMaterial = useDisposable(() => createWindowMaterial(0, 0.45));
  const lampMaterial = useDisposable(() => createWindowMaterial(0, 1.35));

  // Islands grouped by geometry variant.
  const islandMatrices = useMemo(() => {
    const groups: THREE.Matrix4[][] = Array.from({ length: ISLAND_VARIANTS }, () => []);
    layout.islands.forEach((isl) => {
      groups[isl.variant].push(compose(isl.center, [0, isl.rotY, 0], [isl.radius, isl.radius * 0.95, isl.radius]));
    });
    return groups;
  }, [layout]);

  const props = useMemo(() => {
    const lower: THREE.Matrix4[] = [];
    const upper: THREE.Matrix4[] = [];
    const trunks: THREE.Matrix4[] = [];
    layout.trees.forEach((tr) => {
      const m = compose(tr.position, [0, tr.rotY, 0], tr.scale);
      lower.push(m);
      upper.push(m);
      trunks.push(m);
    });
    const shards = layout.crystals.map((c) =>
      compose([c.position[0], c.position[1] + c.scale * 1.1, c.position[2]], [0.2, c.rotY, 0.1], [c.scale * 0.6, c.scale * 1.8, c.scale * 0.6]),
    );
    const allLamps = [...layout.lamps, ...bridges.lamps];
    const lamps = allLamps.map((l) => compose(l.position, [0, 0, 0], l.scale));
    const lampDist = allLamps.map((l) => Math.hypot(l.position[0], l.position[2]));
    const lampSeed = allLamps.map((_, i) => (i * 0.618) % 1);
    const lampBright = allLamps.map(() => 1);

    const dockDecks: THREE.Matrix4[] = [];
    const stilts: THREE.Matrix4[] = [];
    const lampPosts: THREE.Matrix4[] = [];
    layout.docks.forEach((d) => {
      dockDecks.push(compose([d.center[0], d.center[1] - 0.25, d.center[2]], [0, d.rotY, 0], [d.length, 0.4, d.width]));
      const along = new THREE.Vector3(1, 0, 0).applyAxisAngle(Y_AXIS, d.rotY);
      const across = new THREE.Vector3(0, 0, 1).applyAxisAngle(Y_AXIS, d.rotY);
      for (const a of [-0.45, 0, 0.45]) {
        for (const c of [-0.4, 0.4]) {
          stilts.push(
            compose(
              [d.center[0] + along.x * a * d.length + across.x * c * d.width, -2.5, d.center[2] + along.z * a * d.length + across.z * c * d.width],
              [0, 0, 0],
              [1, 3.1, 1],
            ),
          );
        }
      }
      for (const end of [-1, 1]) {
        lampPosts.push(
          compose([d.center[0] + along.x * (d.length / 2) * end, d.center[1] + 0.85, d.center[2] + along.z * (d.length / 2) * end], [0, 0, 0], [0.12, 1.7, 0.12]),
        );
      }
    });

    const stones: THREE.Matrix4[] = [];
    const strips: THREE.Matrix4[] = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const p: Vec3 = [Math.cos(a) * 5.6, ANCHORS.spireTop + 1.2, Math.sin(a) * 5.6];
      stones.push(compose(p, [0, -a, 0], [0.9, 2.8, 0.55]));
      strips.push(compose([p[0], p[1] + 0.1, p[2]], [0, -a, 0], [0.14, 2.0, 0.6]));
    }
    return { lower, upper, trunks, shards, lamps, lampDist, lampSeed, lampBright, dockDecks, stilts, lampPosts, stones, strips };
  }, [layout, bridges]);

  const lightRefs = useRef<(THREE.PointLight | null)[]>([]);

  useLayoutEffect(() => {
    const atmo = getAtmosphere(frame);
    for (const m of [windowMaterial, doorMaterial, lampMaterial]) {
      m.uniforms.uTime.value = t;
      m.uniforms.uPulse.value = atmo.pulse;
    }
    const awake = track(frame, [0, ACTS.sanctum.start - 10, ACTS.sanctum.start + 30], [0.4, 0.4, 1]);
    windowMaterial.uniforms.uBase.value = awake;
    lampMaterial.uniforms.uBase.value = 1.35 * awake;
    runeStripMaterial.color.set(PALETTE.cyan).multiplyScalar(1.2 + atmo.pulse * 2.2 * (0.6 + 0.4 * Math.sin(t * 5)));
    lightRefs.current.forEach((l, i) => {
      if (!l) return;
      const wave = 0.5 + 0.5 * Math.sin(t * 5.5 - i * 1.3);
      l.intensity = (14 + Math.sin(t * 2.3 + i * 2.1) * 2.5) * awake * (1 + atmo.pulse * wave * 1.5);
    });
  }, [frame, t, windowMaterial, doorMaterial, lampMaterial, runeStripMaterial]);

  return (
    <group>
      {islandGeos.map((g, i) => (
        <StaticInstances key={i} geometry={g} material={islandMaterial} matrices={islandMatrices[i]} />
      ))}
      <mesh geometry={spireGeo} material={spireMaterial} />
      <mesh geometry={islandGeos[0]} material={islandMaterial} position={[0, ANCHORS.spireTop, 0]} scale={[8.2, 7, 8.2]} />
      <StaticInstances geometry={centeredBox} material={spireMaterial} matrices={props.stones} />
      <StaticInstances geometry={centeredBox} material={runeStripMaterial} matrices={props.strips} />

      <StaticInstances geometry={box} material={wallMaterial} matrices={cottages.walls} colors={cottages.wallColors} />
      <StaticInstances geometry={roofGeo} material={roofMaterial} matrices={cottages.roofs} colors={cottages.roofColors} />
      <StaticInstances geometry={box} material={timberMaterial} matrices={cottages.timbers} />
      <StaticInstances geometry={box} material={timberMaterial} matrices={cottages.chimneys} />
      <InstancedGlow
        geometry={plane}
        material={windowMaterial}
        matrices={cottages.windows}
        dist={cottages.windowDist}
        seed={cottages.windowSeed}
        bright={cottages.windowBright}
      />
      <InstancedGlow
        geometry={plane}
        material={doorMaterial}
        matrices={cottages.doors}
        dist={cottages.doorDist}
        seed={cottages.doorSeed}
        bright={cottages.doorDist.map(() => 1)}
      />

      <StaticInstances geometry={pineLower} material={pineMaterial} matrices={props.lower} />
      <StaticInstances geometry={pineUpper} material={pineMaterial} matrices={props.upper} />
      <StaticInstances geometry={trunkGeo} material={timberMaterial} matrices={props.trunks} />
      <StaticInstances geometry={shardGeo} material={shardMaterial} matrices={props.shards} />

      <mesh geometry={bridges.ropes} material={ropeMaterial} />
      <StaticInstances geometry={centeredBox} material={woodMaterial} matrices={bridges.planks} />
      <StaticInstances geometry={centeredBox} material={timberMaterial} matrices={bridges.posts} />

      <StaticInstances geometry={centeredBox} material={woodMaterial} matrices={props.dockDecks} />
      <StaticInstances geometry={stiltGeo} material={timberMaterial} matrices={props.stilts} />
      <StaticInstances geometry={centeredBox} material={timberMaterial} matrices={props.lampPosts} />
      <InstancedGlow
        geometry={lampGeo}
        material={lampMaterial}
        matrices={props.lamps}
        dist={props.lampDist}
        seed={props.lampSeed}
        bright={props.lampBright}
      />

      {layout.lightClusters.map((p, i) => (
        <pointLight
          key={i}
          ref={(el) => {
            lightRefs.current[i] = el;
          }}
          position={p}
          color={PALETTE.amber}
          intensity={14}
          distance={42}
          decay={1.3}
        />
      ))}
    </group>
  );
};

/* -------------------------------------------------------------------------------------------------
 * Act III — the arcane obelisk and the astral conduit
 * -----------------------------------------------------------------------------------------------*/

const RING_SPECS = [
  { radius: 10.8, tube: 0.16, ticks: 60 },
  { radius: 8.6, tube: 0.2, ticks: 48 },
  { radius: 6.5, tube: 0.14, ticks: 36 },
] as const;

const SHARD_COUNT = 8;

const RingTicks: React.FC<{ radius: number; count: number; geometry: THREE.BufferGeometry; material: THREE.Material }> = ({
  radius,
  count,
  geometry,
  material,
}) => {
  const matrices = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const a = (i / count) * Math.PI * 2;
        const long = i % 5 === 0;
        return compose([Math.cos(a) * radius, Math.sin(a) * radius, 0], [0, 0, a], long ? [0.55, 0.12, 0.12] : [0.28, 0.07, 0.07]);
      }),
    [radius, count],
  );
  return <StaticInstances geometry={geometry} material={material} matrices={matrices} />;
};

export const ArcaneObelisk: React.FC = () => {
  const { frame, fps, t } = useTime();
  const crystalRef = useRef<THREE.Group>(null);
  const gimbalY = useRef<THREE.Group>(null);
  const gimbalX = useRef<THREE.Group>(null);
  const gimbalZ = useRef<THREE.Group>(null);
  const beamRef = useRef<THREE.Mesh>(null);
  const beamOuterRef = useRef<THREE.Mesh>(null);
  const shockRef = useRef<THREE.Mesh>(null);
  const shardsRef = useRef<THREE.InstancedMesh>(null);
  const coreLight = useRef<THREE.PointLight>(null);
  const fillLight = useRef<THREE.PointLight>(null);

  const crystalGeo = useDisposable(() => createCrystalGeometry(6.4, 2.3));
  const shardGeo = useDisposable(() => createCrystalGeometry(1.1, 0.4));
  const coreGeo = useDisposable(() => new THREE.SphereGeometry(1, 24, 16));
  const ringGeos = useMemo(() => RING_SPECS.map((r) => new THREE.TorusGeometry(r.radius, r.tube, 16, 220)), []);
  useEffect(() => () => ringGeos.forEach((g) => g.dispose()), [ringGeos]);
  const tickGeo = useDisposable(() => new THREE.BoxGeometry(1, 1, 1));
  const beamGeo = useDisposable(() => new THREE.CylinderGeometry(1, 1, 1, 64, 1, true).translate(0, 0.5, 0));
  const shockGeo = useDisposable(() => new THREE.RingGeometry(0.86, 1, 160).rotateX(-Math.PI / 2));

  const crystalMaterial = useDisposable(createCrystalMaterial);
  const shardMaterial = useDisposable(createCrystalMaterial);
  const coreMaterial = useDisposable(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(PALETTE.cyan).multiplyScalar(3),
        toneMapped: false,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
  );
  const goldMaterial = useDisposable(
    () =>
      new THREE.MeshStandardMaterial({
        color: PALETTE.gold,
        metalness: 0.92,
        roughness: 0.28,
        emissive: new THREE.Color(PALETTE.gold),
        emissiveIntensity: 0.4,
      }),
  );
  const tickMaterial = useDisposable(
    () => new THREE.MeshBasicMaterial({ color: new THREE.Color(PALETTE.cyan).multiplyScalar(2), toneMapped: false }),
  );
  const beamMaterial = useDisposable(() => createBeamMaterial(2.2));
  const beamOuterMaterial = useDisposable(() => createBeamMaterial(1.2));
  const shockMaterial = useDisposable(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(PALETTE.cyan).multiplyScalar(2.5),
        toneMapped: false,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
  );

  useLayoutEffect(() => {
    const atmo = getAtmosphere(frame);
    const e = ACTS.conduit.eruption;
    const ringRate = (f: number) => 0.35 + getAtmosphere(f).pulse * 1.1 + getAtmosphere(f).beam * 0.6;
    const spin = integrate(frame, ringRate, fps);
    const charge = track(frame, [ACTS.conduit.start, e], [0, 1]);
    const flash = track(frame, [e - 2, e, e + 12], [0, 1, 0]);

    for (const m of [crystalMaterial, shardMaterial]) {
      m.uniforms.uTime.value = t;
      m.uniforms.uPulse.value = Math.max(atmo.pulse, charge * 0.5);
    }
    crystalMaterial.uniforms.uFlash.value = flash * 0.3;
    shardMaterial.uniforms.uFlash.value = flash * 0.15;

    if (crystalRef.current) {
      crystalRef.current.position.y = Math.sin(t * 1.1) * 0.6;
      crystalRef.current.rotation.y = t * 0.25 + spin * 0.15;
    }
    if (gimbalY.current) gimbalY.current.rotation.y = spin;
    if (gimbalX.current) gimbalX.current.rotation.x = -spin * 1.35;
    if (gimbalZ.current) gimbalZ.current.rotation.z = spin * 1.8;

    goldMaterial.emissiveIntensity = 0.35 + atmo.pulse * 1.3 + flash * 1.2;
    tickMaterial.color.set(PALETTE.cyan).multiplyScalar(1.2 + atmo.pulse * 1.8 + flash * 2);
    coreMaterial.opacity = 0.35 + charge * 0.35 + atmo.pulse * 0.3 * (0.6 + 0.4 * Math.sin(t * 6));

    const beamHeight = Math.max(0.001, atmo.beam * 320);
    const burst = 1 + track(frame, [e, e + 6, e + 30], [0, 0.8, 0]);
    if (beamRef.current) beamRef.current.scale.set(1.5 * burst, beamHeight, 1.5 * burst);
    if (beamOuterRef.current) beamOuterRef.current.scale.set(4.2 * burst, beamHeight * 0.96, 4.2 * burst);
    beamMaterial.uniforms.uTime.value = t;
    beamOuterMaterial.uniforms.uTime.value = t;
    const beamPulse = 0.85 + 0.15 * Math.sin(t * 9);
    beamMaterial.uniforms.uIntensity.value = atmo.beam * beamPulse * (1 + flash * 0.5);
    beamOuterMaterial.uniforms.uIntensity.value = atmo.beam * 0.2 * beamPulse;

    const shockT = track(frame, [e, e + 45], [0, 1], (x) => 1 - Math.pow(1 - x, 3));
    if (shockRef.current) {
      const s = 2 + shockT * 120;
      shockRef.current.scale.set(s, 1, s);
    }
    shockMaterial.opacity = frame >= e ? (1 - shockT) * 0.9 : 0;

    const shards = shardsRef.current;
    if (shards) {
      for (let i = 0; i < SHARD_COUNT; i++) {
        const a = (i / SHARD_COUNT) * Math.PI * 2 + spin * 0.6;
        const r = 4.6 + Math.sin(t * 0.8 + i) * 0.4 + atmo.beam * 1.2;
        compose(
          [Math.cos(a) * r, Math.sin(t * 1.2 + i * 1.7) * 1.6, Math.sin(a) * r],
          [Math.sin(t + i) * 0.3, a, Math.cos(t * 0.7 + i) * 0.3],
          0.8 + (i % 3) * 0.25,
          tmpMatrix,
        );
        shards.setMatrixAt(i, tmpMatrix);
      }
      shards.instanceMatrix.needsUpdate = true;
    }

    if (coreLight.current) coreLight.current.intensity = 40 + charge * 60 + atmo.pulse * 90 * (0.7 + 0.3 * Math.sin(t * 5.5)) + flash * 150;
    if (fillLight.current) fillLight.current.intensity = 18 + atmo.beam * 40;
  }, [frame, fps, t, crystalMaterial, shardMaterial, goldMaterial, tickMaterial, coreMaterial, beamMaterial, beamOuterMaterial, shockMaterial]);

  const beamBase = ANCHORS.spireTop - ANCHORS.obelisk[1];

  return (
    <group position={[...ANCHORS.obelisk]}>
      <group ref={crystalRef}>
        <mesh geometry={crystalGeo} material={crystalMaterial} />
        <mesh geometry={coreGeo} material={coreMaterial} scale={1.6} />
      </group>
      <instancedMesh ref={shardsRef} args={[shardGeo, shardMaterial, SHARD_COUNT]} frustumCulled={false} />

      <group ref={gimbalY}>
        <mesh geometry={ringGeos[0]} material={goldMaterial} />
        <RingTicks radius={RING_SPECS[0].radius} count={RING_SPECS[0].ticks} geometry={tickGeo} material={tickMaterial} />
        <group ref={gimbalX} rotation={[0, Math.PI / 2, 0]}>
          <mesh geometry={ringGeos[1]} material={goldMaterial} />
          <RingTicks radius={RING_SPECS[1].radius} count={RING_SPECS[1].ticks} geometry={tickGeo} material={tickMaterial} />
          <group ref={gimbalZ} rotation={[Math.PI / 2, 0, 0]}>
            <mesh geometry={ringGeos[2]} material={goldMaterial} />
            <RingTicks radius={RING_SPECS[2].radius} count={RING_SPECS[2].ticks} geometry={tickGeo} material={tickMaterial} />
          </group>
        </group>
      </group>

      <mesh ref={beamRef} geometry={beamGeo} material={beamMaterial} position={[0, beamBase, 0]} frustumCulled={false} />
      <mesh ref={beamOuterRef} geometry={beamGeo} material={beamOuterMaterial} position={[0, beamBase, 0]} frustumCulled={false} />
      <mesh ref={shockRef} geometry={shockGeo} material={shockMaterial} position={[0, beamBase + 0.6, 0]} frustumCulled={false} />

      <pointLight ref={coreLight} color={PALETTE.cyan} intensity={40} distance={120} decay={1.1} />
      <pointLight ref={fillLight} color={PALETTE.magenta} intensity={18} distance={80} decay={1.2} position={[0, 14, 0]} />
    </group>
  );
};
