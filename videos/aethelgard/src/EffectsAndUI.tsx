import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { getAtmosphere, getCameraState, PORTAL_CROSS_FRAME } from "./CameraRig";
import { ACTS, ANCHORS, GLSL_NOISE, PALETTE, createRng, hash1, track, type Vec3 } from "./shared";

/* -------------------------------------------------------------------------------------------------
 * Shared billboard sprite shader (runes, embers, mist, clouds)
 * -----------------------------------------------------------------------------------------------*/

/**
 * Instanced camera-facing quads. The instance matrix supplies centre + uniform scale; the quad is
 * expanded in view space so every sprite always faces the lens.
 */
const BILLBOARD_VERTEX = /* glsl */ `
  attribute float aSeed;
  attribute float aAlpha;
  attribute vec3 aColor;
  uniform float uSpin;
  uniform float uTime;
  varying vec2 vUv;
  varying float vSeed;
  varying float vAlpha;
  varying vec3 vColor;
  varying float vDepth;
  void main() {
    vUv = uv;
    vSeed = aSeed;
    vAlpha = aAlpha;
    vColor = aColor;
    vec4 center = modelViewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    float scale = length(instanceMatrix[0].xyz);
    float angle = uSpin * (aSeed - 0.5) * uTime + aSeed * 6.2831;
    mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
    vec2 offset = rot * position.xy * scale;
    vec4 mv = center + vec4(offset, 0.0, 0.0);
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const RUNE_FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform float fogDensity;
  varying vec2 vUv;
  varying float vSeed;
  varying float vAlpha;
  varying vec3 vColor;
  varying float vDepth;
  ${GLSL_NOISE}
  float segment(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p - a;
    vec2 ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h);
  }
  void main() {
    vec2 p = vUv;
    float r1 = hash11(vSeed * 91.7);
    float r2 = hash11(vSeed * 17.3 + 2.0);
    float r3 = hash11(vSeed * 53.1 + 5.0);
    float d = segment(p, vec2(0.5, 0.18), vec2(0.5, 0.82));
    d = min(d, segment(p, vec2(0.5, mix(0.35, 0.75, r1)), vec2(mix(0.72, 0.86, r2), mix(0.2, 0.8, r3))));
    if (r2 > 0.4) d = min(d, segment(p, vec2(0.5, mix(0.25, 0.6, r3)), vec2(mix(0.14, 0.28, r1), mix(0.45, 0.85, r2))));
    if (r3 > 0.55) d = min(d, segment(p, vec2(0.3, mix(0.3, 0.7, r1)), vec2(0.7, mix(0.3, 0.7, r2))));
    if (r1 > 0.7) d = min(d, abs(length(p - vec2(0.5, 0.5)) - 0.3));
    float stroke = smoothstep(0.05, 0.015, d);
    float halo = exp(-d * 14.0) * 0.55;
    float flicker = 0.7 + 0.3 * sin(uTime * (4.0 + vSeed * 6.0) + vSeed * 30.0);
    float fog = 1.0 - fogAmount(vDepth, fogDensity) * 0.9;
    vec3 col = vColor * (stroke * 1.6 + halo) * flicker * vAlpha * fog;
    gl_FragColor = vec4(col, 1.0);
  }
`;

const EMBER_FRAGMENT = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;
  varying float vSeed;
  varying float vAlpha;
  varying vec3 vColor;
  varying float vDepth;
  void main() {
    float d = length(vUv - 0.5) * 2.0;
    float core = smoothstep(0.35, 0.0, d);
    float glow = exp(-d * 4.0) * 0.6;
    float flicker = 0.75 + 0.25 * sin(uTime * (7.0 + vSeed * 9.0) + vSeed * 50.0);
    vec3 col = vColor * (core * 2.2 + glow) * flicker * vAlpha;
    gl_FragColor = vec4(col, 1.0);
  }
`;

const PUFF_FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform float uOpacity;
  uniform vec3 uLight;
  uniform float fogDensity;
  uniform vec3 fogColor;
  varying vec2 vUv;
  varying float vSeed;
  varying float vAlpha;
  varying vec3 vColor;
  varying float vDepth;
  ${GLSL_NOISE}
  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float r = length(p);
    float n = fbm(vec3(p * 1.6 + vSeed * 17.0, uTime * 0.08 + vSeed * 3.0));
    float shape = smoothstep(1.0, 0.15, r + (n - 0.5) * 0.9);
    float alpha = shape * shape * vAlpha * uOpacity;
    float nearFade = smoothstep(2.0, 14.0, vDepth);
    alpha *= nearFade;
    vec3 col = mix(vColor, uLight, smoothstep(0.35, 0.8, n) * 0.5);
    col = mix(col, fogColor, fogAmount(vDepth, fogDensity) * 0.6);
    gl_FragColor = vec4(col, alpha);
  }
`;

interface SpriteSystem {
  geometry: THREE.InstancedBufferGeometry | THREE.BufferGeometry;
  alpha: THREE.InstancedBufferAttribute;
}

/** Builds a quad geometry carrying per-instance seed / alpha / color attributes. */
const createSpriteGeometry = (count: number, seedBase: number, colorFor: (i: number) => THREE.Color): SpriteSystem => {
  const geometry = new THREE.PlaneGeometry(1, 1);
  const seeds = new Float32Array(count);
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    seeds[i] = hash1(i + seedBase);
    const c = colorFor(i);
    colors.set([c.r, c.g, c.b], i * 3);
  }
  const alpha = new THREE.InstancedBufferAttribute(new Float32Array(count).fill(1), 1);
  alpha.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute("aSeed", new THREE.InstancedBufferAttribute(seeds, 1));
  geometry.setAttribute("aColor", new THREE.InstancedBufferAttribute(colors, 3));
  geometry.setAttribute("aAlpha", alpha);
  return { geometry, alpha };
};

const useSprites = (count: number, seedBase: number, colorFor: (i: number) => THREE.Color) => {
  const system = useMemo(() => createSpriteGeometry(count, seedBase, colorFor), [count, seedBase]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => system.geometry.dispose(), [system]);
  return system;
};

const useMaterial = <T extends THREE.Material>(factory: () => T): T => {
  const m = useMemo(factory, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => m.dispose(), [m]);
  return m;
};

const tmpMatrix = new THREE.Matrix4();
const tmpQuat = new THREE.Quaternion();
const tmpPos = new THREE.Vector3();
const tmpScale = new THREE.Vector3();
const tmpEuler = new THREE.Euler();
const tmpColor = new THREE.Color();

const setInstance = (mesh: THREE.InstancedMesh, i: number, p: Vec3, scale: number | Vec3, rot: Vec3 = [0, 0, 0]) => {
  tmpPos.set(p[0], p[1], p[2]);
  tmpQuat.setFromEuler(tmpEuler.set(rot[0], rot[1], rot[2]));
  if (typeof scale === "number") tmpScale.setScalar(scale);
  else tmpScale.set(scale[0], scale[1], scale[2]);
  mesh.setMatrixAt(i, tmpMatrix.compose(tmpPos, tmpQuat, tmpScale));
};

/** Smooth 0→1→0 envelope across a looping life cycle, for seamless particle respawn. */
const lifeEnvelope = (phase: number, fadeIn = 0.12, fadeOut = 0.2) =>
  Math.min(1, phase / fadeIn) * Math.min(1, (1 - phase) / fadeOut);

/* -------------------------------------------------------------------------------------------------
 * Lantern swarm — paper lanterns rising over the sanctum
 * -----------------------------------------------------------------------------------------------*/

interface LanternSeed {
  x: number;
  z: number;
  baseY: number;
  rise: number;
  speed: number;
  offset: number;
  sway: number;
  swayFreq: number;
  scale: number;
  hue: number;
  dist: number;
}

export const LanternSwarm: React.FC<{ count?: number }> = ({ count = 300 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ref = useRef<THREE.InstancedMesh>(null);

  const seeds = useMemo<LanternSeed[]>(() => {
    const rng = createRng(1337);
    return Array.from({ length: count }, () => {
      const a = rng() * Math.PI * 2;
      const r = 9 + Math.pow(rng(), 0.7) * 58;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      return {
        x,
        z,
        baseY: 0.6 + rng() * 3,
        rise: 38 + rng() * 26,
        speed: 0.55 + rng() * 0.9,
        offset: rng(),
        sway: 0.4 + rng() * 1.1,
        swayFreq: 0.35 + rng() * 0.6,
        scale: 0.3 + rng() * 0.26,
        hue: rng(),
        dist: r,
      };
    });
  }, [count]);

  const geometry = useMemo(() => new THREE.OctahedronGeometry(1, 0), []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const material = useMaterial(() => new THREE.MeshBasicMaterial({ color: "#ffffff", toneMapped: false }));
  const warmA = useMemo(() => new THREE.Color(PALETTE.amber), []);
  const warmB = useMemo(() => new THREE.Color("#ff7b3a"), []);
  const cool = useMemo(() => new THREE.Color(PALETTE.cyan), []);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const t = frame / fps;
    const atmo = getAtmosphere(frame);
    const release = track(frame, [ACTS.sanctum.start - 30, ACTS.sanctum.start + 40], [0.15, 1]);
    seeds.forEach((s, i) => {
      // Deterministic loop: each lantern's altitude is a pure function of time and its seed.
      const cycle = (t * s.speed) / s.rise + s.offset;
      const phase = cycle - Math.floor(cycle);
      const y = s.baseY + phase * s.rise;
      const swayX = Math.sin(t * s.swayFreq + i * 1.7) * s.sway + Math.sin(t * 0.21 + i) * 0.6;
      const swayZ = Math.cos(t * s.swayFreq * 0.8 + i * 2.3) * s.sway;
      const life = lifeEnvelope(phase, 0.08, 0.25);
      const size = s.scale * (0.35 + 0.65 * life);
      setInstance(mesh, i, [s.x + swayX, y, s.z + swayZ], [size * 0.62, size, size * 0.62], [0, t * 0.4 + i, Math.sin(t + i) * 0.12]);

      const flicker = 0.82 + 0.18 * Math.sin(t * (5 + s.hue * 4) + i * 3.1);
      const wave = 0.5 + 0.5 * Math.sin(s.dist * 0.3 - t * 5.5);
      const harmonic = atmo.pulse * Math.pow(wave, 3);
      tmpColor.copy(warmA).lerp(warmB, s.hue * 0.6).lerp(cool, harmonic * 0.55);
      tmpColor.multiplyScalar((2.2 + harmonic * 3.5) * flicker * life * release);
      mesh.setColorAt(i, tmpColor);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [frame, fps, seeds, warmA, warmB, cool]);

  return <instancedMesh ref={ref} args={[geometry, material, count]} frustumCulled={false} />;
};

/* -------------------------------------------------------------------------------------------------
 * Rune drift — glowing cyan glyphs rising through the veil
 * -----------------------------------------------------------------------------------------------*/

const RUNE_COUNT = 140;

export const RuneDrift: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ref = useRef<THREE.InstancedMesh>(null);
  const cyan = useMemo(() => new THREE.Color(PALETTE.cyan).multiplyScalar(1.6), []);
  const magenta = useMemo(() => new THREE.Color(PALETTE.magenta).multiplyScalar(1.5), []);
  const sprites = useSprites(RUNE_COUNT, 500, (i) => (hash1(i * 3.3) > 0.82 ? magenta : cyan));
  const material = useMaterial(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog), uTime: { value: 0 }, uSpin: { value: 0.6 } },
        vertexShader: BILLBOARD_VERTEX,
        fragmentShader: RUNE_FRAGMENT,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: true,
      }),
  );

  const seeds = useMemo(() => {
    const rng = createRng(808);
    return Array.from({ length: RUNE_COUNT }, () => {
      const nearGate = rng() < 0.3;
      return {
        x: nearGate ? (rng() - 0.5) * 30 : (rng() - 0.5) * 80,
        z: nearGate ? ANCHORS.gate[2] + (rng() - 0.3) * 24 : 100 + rng() * 120,
        y0: -6 + rng() * 6,
        range: 34 + rng() * 14,
        speed: 0.9 + rng() * 1.4,
        offset: rng(),
        size: 0.5 + rng() * 0.9,
        sway: rng() * Math.PI * 2,
      };
    });
  }, []);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const t = frame / fps;
    const atmo = getAtmosphere(frame);
    material.uniforms.uTime.value = t;
    const visible = track(frame, [0, 10, 170, 210], [0.4, 1, 1, 0]);
    seeds.forEach((s, i) => {
      const cycle = (t * s.speed) / s.range + s.offset;
      const phase = cycle - Math.floor(cycle);
      const y = s.y0 + phase * s.range;
      // Runes near the gate get drawn inward as the portal spins up.
      const pull = Math.min(1, atmo.portalSpin / 2.6) * (Math.abs(s.z - ANCHORS.gate[2]) < 20 ? 0.35 : 0);
      const x = (s.x + Math.sin(t * 0.7 + s.sway) * 1.2) * (1 - pull);
      const z = s.z + Math.cos(t * 0.5 + s.sway) * 1.0;
      setInstance(mesh, i, [x, y, z], s.size);
      sprites.alpha.setX(i, lifeEnvelope(phase, 0.15, 0.3) * visible);
    });
    sprites.alpha.needsUpdate = true;
    mesh.instanceMatrix.needsUpdate = true;
  }, [frame, fps, seeds, material, sprites]);

  return <instancedMesh ref={ref} args={[sprites.geometry, material, RUNE_COUNT]} frustumCulled={false} renderOrder={2} />;
};

/* -------------------------------------------------------------------------------------------------
 * Volumetric mist (Act I) and cloud canopy (Act III → IV)
 * -----------------------------------------------------------------------------------------------*/

interface PuffSeed {
  p: Vec3;
  size: number;
  drift: number;
  alpha: number;
}

const PuffField: React.FC<{
  seeds: PuffSeed[];
  baseColor: string;
  lightColor: string;
  opacityKey: "mistOpacity" | "cloudOpacity";
  seedBase: number;
}> = ({ seeds, baseColor, lightColor, opacityKey, seedBase }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ref = useRef<THREE.InstancedMesh>(null);
  const tint = useMemo(() => new THREE.Color(baseColor), [baseColor]);
  const sprites = useSprites(seeds.length, seedBase, () => tint);
  const material = useMaterial(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
          uTime: { value: 0 },
          uSpin: { value: 0.05 },
          uOpacity: { value: 1 },
          uLight: { value: new THREE.Color(lightColor) },
        },
        vertexShader: BILLBOARD_VERTEX,
        fragmentShader: PUFF_FRAGMENT,
        transparent: true,
        depthWrite: false,
        fog: true,
      }),
  );

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const t = frame / fps;
    const opacity = getAtmosphere(frame)[opacityKey];
    material.uniforms.uTime.value = t;
    material.uniforms.uOpacity.value = opacity;
    mesh.visible = opacity > 0.001;
    seeds.forEach((s, i) => {
      setInstance(mesh, i, [s.p[0] + Math.sin(t * 0.1 + i) * s.drift, s.p[1] + Math.sin(t * 0.17 + i * 0.7) * 0.4, s.p[2] + t * s.drift * 0.3], s.size);
      sprites.alpha.setX(i, s.alpha);
    });
    sprites.alpha.needsUpdate = true;
    mesh.instanceMatrix.needsUpdate = true;
  }, [frame, fps, seeds, material, sprites, opacityKey]);

  return <instancedMesh ref={ref} args={[sprites.geometry, material, seeds.length]} frustumCulled={false} renderOrder={3} />;
};

export const VeilMist: React.FC = () => {
  const seeds = useMemo<PuffSeed[]>(() => {
    const rng = createRng(31);
    const list: PuffSeed[] = [];
    while (list.length < 70) {
      const x = (rng() - 0.5) * 140;
      const y = -4 + rng() * 26;
      const z = 98 + rng() * 150;
      if (Math.abs(x) < 6 && Math.abs(y - 6.5) < 5) continue;
      list.push({ p: [x, y, z], size: 14 + rng() * 26, drift: 0.6 + rng() * 1.5, alpha: 0.18 + rng() * 0.22 });
    }
    return list;
  }, []);
  return <PuffField seeds={seeds} baseColor="#2a2f5c" lightColor="#6f6aa8" opacityKey="mistOpacity" seedBase={40} />;
};

export const CloudCanopy: React.FC = () => {
  const seeds = useMemo<PuffSeed[]>(() => {
    const rng = createRng(73);
    return Array.from({ length: 110 }, () => {
      const a = rng() * Math.PI * 2;
      const r = 20 + Math.sqrt(rng()) * 190;
      return {
        p: [Math.cos(a) * r, 52 + rng() * 30, Math.sin(a) * r] as Vec3,
        size: 22 + rng() * 34,
        drift: 0.8 + rng() * 1.6,
        alpha: 0.22 + rng() * 0.28,
      };
    });
  }, []);
  return <PuffField seeds={seeds} baseColor="#3a3570" lightColor="#b9a8ff" opacityKey="cloudOpacity" seedBase={90} />;
};

/* -------------------------------------------------------------------------------------------------
 * Golden embers drifting past the lens (Act III tail → Act IV)
 * -----------------------------------------------------------------------------------------------*/

const EMBER_COUNT = 160;
const camForward = new THREE.Vector3();
const camRight = new THREE.Vector3();
const camUp = new THREE.Vector3();

export const LensEmbers: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ref = useRef<THREE.InstancedMesh>(null);
  const gold = useMemo(() => new THREE.Color(PALETTE.amber).multiplyScalar(1.8), []);
  const pale = useMemo(() => new THREE.Color(PALETTE.gold).multiplyScalar(1.6), []);
  const sprites = useSprites(EMBER_COUNT, 900, (i) => (hash1(i * 7.7) > 0.6 ? pale : gold));
  const material = useMaterial(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uSpin: { value: 0 } },
        vertexShader: BILLBOARD_VERTEX,
        fragmentShader: EMBER_FRAGMENT,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
  );
  const seeds = useMemo(() => {
    const rng = createRng(2024);
    return Array.from({ length: EMBER_COUNT }, () => ({
      x: (rng() - 0.5) * 2,
      y: rng(),
      depth: 3 + Math.pow(rng(), 1.5) * 40,
      speed: 0.04 + rng() * 0.08,
      wobble: rng() * Math.PI * 2,
      size: 0.04 + rng() * 0.08,
    }));
  }, []);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const t = frame / fps;
    material.uniforms.uTime.value = t;
    const visible = track(frame, [490, 530, ACTS.ascent.fade, ACTS.ascent.end], [0, 1, 1, 0.3]);
    mesh.visible = visible > 0.001;
    if (!mesh.visible) return;

    // Embers live in camera space and are projected into the world from the pure rig state.
    const cam = getCameraState(frame, fps);
    camForward.set(cam.target[0] - cam.position[0], cam.target[1] - cam.position[1], cam.target[2] - cam.position[2]).normalize();
    camRight.crossVectors(camForward, camUp.set(0, 1, 0)).normalize();
    camUp.crossVectors(camRight, camForward).normalize();
    const halfH = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    const aspect = 16 / 9;

    seeds.forEach((s, i) => {
      const cycle = t * s.speed + s.y;
      const phase = cycle - Math.floor(cycle);
      const vy = (phase * 2.4 - 1.2) * halfH * s.depth;
      const vx = (s.x * aspect * 1.1 + Math.sin(t * 0.6 + s.wobble) * 0.08 - phase * 0.25) * halfH * s.depth;
      const px = cam.position[0] + camRight.x * vx + camUp.x * vy + camForward.x * s.depth;
      const py = cam.position[1] + camRight.y * vx + camUp.y * vy + camForward.y * s.depth;
      const pz = cam.position[2] + camRight.z * vx + camUp.z * vy + camForward.z * s.depth;
      setInstance(mesh, i, [px, py, pz], s.size * s.depth * 0.35);
      sprites.alpha.setX(i, lifeEnvelope(phase, 0.2, 0.2) * visible);
    });
    sprites.alpha.needsUpdate = true;
    mesh.instanceMatrix.needsUpdate = true;
  }, [frame, fps, seeds, material, sprites]);

  return <instancedMesh ref={ref} args={[sprites.geometry, material, EMBER_COUNT]} frustumCulled={false} renderOrder={5} />;
};

/* -------------------------------------------------------------------------------------------------
 * 2D cinematic overlay — typography, flash, vignette, film grain
 * -----------------------------------------------------------------------------------------------*/

interface StoryBeat {
  from: number;
  to: number;
  numeral: string;
  title: string;
  line: string;
}

const BEATS: StoryBeat[] = [
  { from: 18, to: 118, numeral: "I", title: "The Shrouded Veil", line: "Beyond the mortal mist, time sleeps..." },
  { from: 176, to: 294, numeral: "II", title: "The Lantern Sanctum", line: "...lies Aethelgard, keeper of the ember." },
  { from: 352, to: 474, numeral: "III", title: "The Astral Conduit", line: "When the stars align, the ancient heart awakens." },
  { from: 532, to: 626, numeral: "IV", title: "The Eternal Ascent", line: "Where magic remembers your name." },
];

const Beat: React.FC<{ beat: StoryBeat; frame: number }> = ({ beat, frame }) => {
  const { from, to } = beat;
  if (frame < from - 1 || frame > to + 1) return null;
  const words = beat.line.split(" ");
  const local = frame - from;
  const span = to - from;
  const outStart = span - 22;
  const out = interpolate(local, [outStart, span], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.in(Easing.cubic),
  });
  const isFinal = beat.numeral === "IV";
  const tracking = interpolate(local, [0, span], [0.04, isFinal ? 0.12 : 0.14], { extrapolateRight: "clamp", easing: Easing.out(Easing.quad) });
  const labelIn = interpolate(local, [0, 20], [0, 1], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const rule = interpolate(local, [6, 36], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });

  return (
    <div
      className="absolute inset-x-0 flex flex-col items-center px-24 text-center"
      style={{
        bottom: isFinal ? undefined : 150,
        top: isFinal ? "41%" : undefined,
        opacity: 1 - out,
        filter: `blur(${out * 10}px)`,
        transform: `translateY(${-out * 14}px)`,
      }}
    >
      <div
        className="font-cinematic mb-5 flex items-center gap-5 text-[22px] uppercase"
        style={{
          color: PALETTE.cyan,
          letterSpacing: `${0.55 + labelIn * 0.15}em`,
          opacity: labelIn * 0.85,
          textShadow: `0 0 18px ${PALETTE.cyan}88`,
        }}
      >
        <span className="h-px w-24" style={{ background: `linear-gradient(90deg, transparent, ${PALETTE.cyan})`, transform: `scaleX(${rule})`, transformOrigin: "right" }} />
        <span>
          {beat.numeral} · {beat.title}
        </span>
        <span className="h-px w-24" style={{ background: `linear-gradient(270deg, transparent, ${PALETTE.cyan})`, transform: `scaleX(${rule})`, transformOrigin: "left" }} />
      </div>
      <div
        className="font-cinematic italic leading-tight whitespace-nowrap"
        style={{
          fontSize: isFinal ? 76 : 60,
          letterSpacing: `${tracking}em`,
          color: "#f4ecdf",
          textShadow: `0 0 28px ${PALETTE.amber}55, 0 0 2px #000, 0 4px 30px #000c`,
          fontWeight: 400,
        }}
      >
        {words.map((w, i) => {
          const start = 8 + i * 4;
          const p = interpolate(local, [start, start + 20], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.out(Easing.cubic),
          });
          return (
            <span
              key={`${w}-${i}`}
              className="inline-block"
              style={{
                opacity: p,
                filter: `blur(${(1 - p) * 14}px)`,
                transform: `translateY(${(1 - p) * 18}px)`,
                marginRight: "0.32em",
              }}
            >
              {w}
            </span>
          );
        })}
      </div>
    </div>
  );
};

/** Final title card under the last line. */
const TitleCard: React.FC<{ frame: number }> = ({ frame }) => {
  const p = interpolate(frame, [568, 600, ACTS.ascent.fade, ACTS.ascent.end - 6], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  if (p <= 0) return null;
  return (
    <div
      className="font-cinematic absolute inset-x-0 text-center uppercase"
      style={{
        top: "58%",
        fontSize: 26,
        letterSpacing: `${0.6 + p * 0.25}em`,
        color: PALETTE.gold,
        opacity: p * 0.9,
        filter: `blur(${(1 - p) * 6}px)`,
        textShadow: `0 0 22px ${PALETTE.amber}aa`,
      }}
    >
      The Awakening of Aethelgard
    </div>
  );
};

const FilmGrain: React.FC<{ frame: number }> = ({ frame }) => {
  const seed = frame % 97;
  return (
    <svg className="absolute inset-0 h-full w-full" style={{ mixBlendMode: "overlay", opacity: 0.16 }}>
      <filter id={`grain-${seed}`}>
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={seed} stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter={`url(#grain-${seed})`} />
    </svg>
  );
};

export const StoryOverlay: React.FC = () => {
  const frame = useCurrentFrame();
  const flash = getAtmosphere(frame).portalFlash;
  const eruption = track(frame, [ACTS.conduit.eruption - 1, ACTS.conduit.eruption + 2, ACTS.conduit.eruption + 16], [0, 1, 0]);
  const fade = track(frame, [ACTS.ascent.fade, ACTS.ascent.end], [0, 1], Easing.inOut(Easing.quad));
  const letterbox = track(frame, [0, 20, ACTS.ascent.fade, ACTS.ascent.end], [70, 54, 54, 70]);
  const crossDistance = Math.abs(frame - PORTAL_CROSS_FRAME);

  return (
    <AbsoluteFill className="pointer-events-none">
      {/* Portal crossing flash */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% 50%, #e9fffb 0%, ${PALETTE.cyan} 28%, ${PALETTE.magenta}66 60%, transparent 85%)`,
          opacity: flash * 0.85,
          mixBlendMode: "screen",
          transform: `scale(${1 + crossDistance * 0.04})`,
        }}
      />
      {/* Eruption bloom */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at 50% 45%, #ffffff 0%, ${PALETTE.cyan}aa 25%, transparent 70%)`,
          opacity: eruption * 0.32,
          mixBlendMode: "screen",
        }}
      />
      {/* Vignette */}
      <AbsoluteFill
        style={{ background: "radial-gradient(ellipse at 50% 50%, transparent 52%, rgba(3,4,12,0.55) 82%, rgba(2,3,9,0.9) 100%)" }}
      />
      <FilmGrain frame={frame} />
      {/* Letterbox */}
      <div className="absolute inset-x-0 top-0" style={{ height: letterbox, background: PALETTE.obsidian }} />
      <div className="absolute inset-x-0 bottom-0" style={{ height: letterbox, background: PALETTE.obsidian }} />

      {BEATS.map((b) => (
        <Beat key={b.numeral} beat={b} frame={frame} />
      ))}
      <TitleCard frame={frame} />

      {/* Fade to midnight void */}
      <AbsoluteFill style={{ background: PALETTE.midnight, opacity: fade }} />
    </AbsoluteFill>
  );
};
