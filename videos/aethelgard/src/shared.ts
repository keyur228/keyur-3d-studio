import { interpolate } from "remotion";

export const FPS = 30;
export const DURATION = 660;
export const WIDTH = 1920;
export const HEIGHT = 1080;

/** Act boundaries in frames. */
export const ACTS = {
  veil: { start: 0, end: 150, dive: 125 },
  sanctum: { start: 150, end: 330, whip: 300 },
  conduit: { start: 330, end: 510, eruption: 385, pullBack: 480 },
  ascent: { start: 510, end: 660, fade: 630 },
} as const;

export const PALETTE = {
  obsidian: "#070913",
  indigo: "#161B33",
  cyan: "#00F5D4",
  amber: "#FFB703",
  magenta: "#9B5DE5",
  midnight: "#05071a",
  moon: "#b9c6ff",
  gold: "#f5c66b",
} as const;

/** Key world anchors shared by the camera rig and the world geometry. */
export const ANCHORS = {
  gate: [0, 6, 95] as const,
  obelisk: [0, 24, 0] as const,
  spireTop: 12.5,
};

export type Vec3 = [number, number, number];

/** Clamped multi-key interpolation helper. */
export const track = (
  frame: number,
  input: readonly number[],
  output: readonly number[],
  easing?: (t: number) => number,
): number =>
  interpolate(frame, input as number[], output as number[], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing,
  });

/** Deterministic PRNG (mulberry32). */
export const createRng = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** Stateless per-index hash in [0, 1). */
export const hash1 = (n: number): number => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return s - Math.floor(s);
};

const fade = (t: number) => t * t * (3 - 2 * t);
const lattice = (x: number, y: number, z: number) => hash1(x * 1.0 + y * 57.0 + z * 113.0);

/** Smooth 3D value noise in [-1, 1]; a pure function of position so shared vertices displace identically. */
export const noise3 = (x: number, y: number, z: number): number => {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const iz = Math.floor(z);
  const fx = fade(x - ix);
  const fy = fade(y - iy);
  const fz = fade(z - iz);
  const l = (a: number, b: number, t: number) => a + (b - a) * t;
  const v = l(
    l(
      l(lattice(ix, iy, iz), lattice(ix + 1, iy, iz), fx),
      l(lattice(ix, iy + 1, iz), lattice(ix + 1, iy + 1, iz), fx),
      fy,
    ),
    l(
      l(lattice(ix, iy, iz + 1), lattice(ix + 1, iy, iz + 1), fx),
      l(lattice(ix, iy + 1, iz + 1), lattice(ix + 1, iy + 1, iz + 1), fx),
      fy,
    ),
    fz,
  );
  return v * 2 - 1;
};

export const fbm3 = (x: number, y: number, z: number, octaves = 3): number => {
  let sum = 0;
  let amp = 0.5;
  let freq = 1;
  for (let i = 0; i < octaves; i++) {
    sum += amp * noise3(x * freq, y * freq, z * freq);
    freq *= 2.03;
    amp *= 0.5;
  }
  return sum;
};

/** Shared GLSL: hashing, value noise, fbm and exp2 fog helpers. */
export const GLSL_NOISE = /* glsl */ `
  float hash11(float p) {
    p = fract(p * 0.1031);
    p *= p + 33.33;
    p *= p + p;
    return fract(p);
  }
  float hash31(vec3 p3) {
    p3 = fract(p3 * 0.1031);
    p3 += dot(p3, p3.zyx + 31.32);
    return fract((p3.x + p3.y) * p3.z);
  }
  float vnoise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float n000 = hash31(i);
    float n100 = hash31(i + vec3(1.0, 0.0, 0.0));
    float n010 = hash31(i + vec3(0.0, 1.0, 0.0));
    float n110 = hash31(i + vec3(1.0, 1.0, 0.0));
    float n001 = hash31(i + vec3(0.0, 0.0, 1.0));
    float n101 = hash31(i + vec3(1.0, 0.0, 1.0));
    float n011 = hash31(i + vec3(0.0, 1.0, 1.0));
    float n111 = hash31(i + vec3(1.0, 1.0, 1.0));
    return mix(
      mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y),
      mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y),
      f.z
    );
  }
  float fbm(vec3 p) {
    float sum = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 5; i++) {
      sum += amp * vnoise(p);
      p = p * 2.02 + vec3(1.7, 9.2, 3.1);
      amp *= 0.5;
    }
    return sum;
  }
  float fogAmount(float depth, float density) {
    return 1.0 - exp(-density * density * depth * depth);
  }
`;

/**
 * Deterministic integral of a frame-dependent angular rate (radians / second).
 * Lets spin speeds ramp smoothly without accumulating state across renders.
 */
export const integrate = (frame: number, rate: (f: number) => number, fps: number = FPS): number => {
  let sum = 0;
  const whole = Math.floor(frame);
  for (let i = 0; i < whole; i++) sum += rate(i + 0.5) / fps;
  sum += (rate(whole + (frame - whole) * 0.5) * (frame - whole)) / fps;
  return sum;
};
