import { useLayoutEffect } from "react";
import { useThree } from "@react-three/fiber";
import { Easing, spring, useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { ACTS, ANCHORS, FPS, track, type Vec3 } from "./shared";

export interface CameraState {
  position: Vec3;
  target: Vec3;
  fov: number;
  /** Roll around the view axis, radians. */
  roll: number;
}

export interface AtmosphereState {
  fogDensity: number;
  fogColor: string;
  bloomIntensity: number;
  ambient: number;
  moon: number;
  skyMist: number;
  mistOpacity: number;
  cloudOpacity: number;
  pulse: number;
  beam: number;
  exposure: number;
  portalSpin: number;
  portalFlash: number;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpV = (a: Vec3 | readonly number[], b: Vec3 | readonly number[], t: number): Vec3 => [
  lerp(a[0], b[0], t),
  lerp(a[1], b[1], t),
  lerp(a[2], b[2], t),
];
const polar = (theta: number, r: number, y: number): Vec3 => [Math.cos(theta) * r, y, Math.sin(theta) * r];

const EASE = {
  drift: Easing.bezier(0.37, 0, 0.63, 1),
  dive: Easing.bezier(0.6, 0, 0.85, 0.5),
  emerge: Easing.bezier(0.05, 0.9, 0.2, 1),
  whip: Easing.bezier(0.65, 0, 0.35, 1),
  orbit: Easing.bezier(0.3, 0, 0.7, 1),
  vertigo: Easing.bezier(0.55, 0, 0.15, 1),
  settle: Easing.bezier(0.25, 0.1, 0.25, 1),
  smooth: Easing.bezier(0.45, 0, 0.55, 1),
};

/** Fixed waypoints of the rig, all derived from world anchors so acts hand off seamlessly. */
const OBELISK = ANCHORS.obelisk;
const VEIL_START: Vec3 = [0, 7.5, 172];
const VEIL_HOLD: Vec3 = [0, 6.3, 128];
const DIVE_END: Vec3 = [0, 6, 74];
const SANCTUM_END: Vec3 = [20, 17, 46];
const WHIP_THETA_A = Math.atan2(SANCTUM_END[2], SANCTUM_END[0]);
const WHIP_R_A = Math.hypot(SANCTUM_END[0], SANCTUM_END[2]);
const WHIP_THETA_B = WHIP_THETA_A + Math.PI * 1.35;
const ORBIT_THETA_END = WHIP_THETA_B + Math.PI * 0.55;
const ASCENT_THETA = ORBIT_THETA_END + Math.PI * 0.08;

const SPRING_CONFIG = { damping: 14, stiffness: 90, mass: 1 } as const;
const SHAKE_CONFIG = { damping: 7, stiffness: 140, mass: 0.8 } as const;

/** Pure camera function: identical output for identical frame, which keeps rendering deterministic. */
export const getCameraState = (frame: number, fps: number = FPS): CameraState => {
  const f = frame;

  // ACT I — slow drift through the veil, then a Z-axis dive through the rune gate.
  if (f < ACTS.veil.end) {
    const p = track(f, [0, ACTS.veil.dive], [0, 1], EASE.drift);
    const q = track(f, [ACTS.veil.dive, ACTS.veil.end], [0, 1], EASE.dive);
    const floatFade = 1 - q;
    const hold = lerpV(VEIL_START, VEIL_HOLD, p);
    const base = lerpV(hold, DIVE_END, q);
    const position: Vec3 = [
      base[0] + Math.sin(f * 0.045) * 0.6 * floatFade,
      base[1] + Math.sin(f * 0.06 + 1.0) * 0.35 * floatFade,
      base[2],
    ];
    const gazeY = lerp(8, ANCHORS.gate[1], p);
    const target: Vec3 = [position[0] * 0.3, lerp(gazeY, position[1], q), position[2] - 60];
    return {
      position,
      target,
      fov: lerp(48, 46, p) + q * q * 32,
      roll: Math.sin(f * 0.03) * 0.03 * floatFade + q * q * 0.6,
    };
  }

  // ACT II — emerge into the sanctum, decelerating into a lazy glide above the water.
  if (f < ACTS.sanctum.whip) {
    const u = track(f, [ACTS.sanctum.start, ACTS.sanctum.whip], [0, 1], EASE.emerge);
    const settle = spring({ frame: f - ACTS.sanctum.start, fps, config: SPRING_CONFIG });
    const floatIn = track(f, [ACTS.sanctum.start, 185, 270, ACTS.sanctum.whip], [0, 1, 1, 0]);
    const base = lerpV(DIVE_END, SANCTUM_END, u);
    const position: Vec3 = [
      base[0] + Math.sin((f - ACTS.sanctum.start) * 0.04) * 0.4 * floatIn,
      base[1] + Math.sin((f - ACTS.sanctum.start) * 0.05) * 0.3 * floatIn - Math.sin(Math.min(settle, 1) * Math.PI) * 0.8,
      base[2],
    ];
    const target = lerpV([0, 6, 34], [0, 9, 0], track(f, [ACTS.sanctum.start, 230], [0, 1], EASE.smooth));
    return {
      position,
      target,
      fov: lerp(78, 52, track(f, [ACTS.sanctum.start, 205], [0, 1], EASE.emerge)),
      roll: 0.6 * (1 - settle),
    };
  }

  // ACT II → III — orbital whip-pan: banking helix up toward the central spire.
  if (f < ACTS.conduit.start) {
    const w = track(f, [ACTS.sanctum.whip, ACTS.conduit.start], [0, 1], EASE.whip);
    const theta = lerp(WHIP_THETA_A, WHIP_THETA_B, w);
    const r = lerp(WHIP_R_A, 24, w);
    const y = lerp(SANCTUM_END[1], 27, w) + Math.sin(w * Math.PI) * 4;
    const target = lerpV([0, 9, 0], OBELISK, EASE.smooth(w));
    return {
      position: polar(theta, r, y),
      target,
      fov: lerp(52, 50, w) + Math.sin(w * Math.PI) * 10,
      roll: Math.sin(w * Math.PI) * (Math.PI / 4),
    };
  }

  // ACT III — reverent orbit around the obelisk; the eruption kicks the rig with a spring shake.
  if (f < ACTS.conduit.pullBack) {
    const v = track(f, [ACTS.conduit.start, ACTS.conduit.pullBack], [0, 1], EASE.orbit);
    const theta = lerp(WHIP_THETA_B, ORBIT_THETA_END, v);
    const r = lerp(24, 20, v);
    const y = lerp(27, 26, v) + Math.sin(v * Math.PI) * 2;
    const shakeSpring = spring({ frame: f - ACTS.conduit.eruption, fps, config: SHAKE_CONFIG });
    const shake = f >= ACTS.conduit.eruption ? 1 - shakeSpring : 0;
    const base = polar(theta, r, y);
    const position: Vec3 = [
      base[0] + Math.sin(f * 2.3) * shake * 0.45,
      base[1] + Math.cos(f * 1.9) * shake * 0.35,
      base[2] + Math.sin(f * 2.9 + 1.0) * shake * 0.45,
    ];
    const lookUp = track(f, [ACTS.conduit.eruption, 430], [0, 1], EASE.smooth);
    return {
      position,
      target: [0, OBELISK[1] + lookUp * 6, 0],
      fov: 50 + shake * 3,
      roll: Math.sin(v * Math.PI) * 0.05 + shake * Math.sin(f * 1.3) * 0.05,
    };
  }

  // ACT III → IV — vertigo pull-back: crane up through the cloud canopy and dolly out.
  if (f < ACTS.ascent.start) {
    const x = track(f, [ACTS.conduit.pullBack, ACTS.ascent.start], [0, 1], EASE.vertigo);
    const theta = lerp(ORBIT_THETA_END, ASCENT_THETA, x);
    const r = lerp(20, 190, x);
    const y = lerp(26, 150, x);
    const target = lerpV([0, OBELISK[1] + 6, 0], [0, 8, 0], x);
    return {
      position: polar(theta, r, y),
      target,
      fov: lerp(50, 44, x) - Math.sin(x * Math.PI) * 14,
      roll: Math.sin(x * Math.PI) * -0.12,
    };
  }

  // ACT IV — wide cosmic vista, easing into a near-still float.
  const s = track(f, [ACTS.ascent.start, ACTS.ascent.end], [0, 1], EASE.settle);
  const calm = 1 - track(f, [ACTS.ascent.fade, ACTS.ascent.end], [0, 0.7]);
  const base = polar(ASCENT_THETA + s * Math.PI * 0.1, lerp(190, 172, s), lerp(150, 140, s));
  return {
    position: [base[0], base[1] + Math.sin((f - ACTS.ascent.start) * 0.04) * 0.8 * calm, base[2]],
    target: [0, lerp(8, 14, s), 0],
    fov: 44,
    roll: Math.sin((f - ACTS.ascent.start) * 0.025) * 0.015 * calm,
  };
};

/** First (fractional) frame at which the camera crosses the rune gate plane. */
export const PORTAL_CROSS_FRAME: number = (() => {
  for (let f = ACTS.veil.dive; f < ACTS.veil.end; f += 0.05) {
    if (getCameraState(f).position[2] <= ANCHORS.gate[2]) return f;
  }
  return ACTS.veil.end;
})();

const lerpColor = (keys: readonly number[], colors: readonly string[], frame: number): string => {
  const c = new THREE.Color();
  const a = new THREE.Color();
  const b = new THREE.Color();
  if (frame <= keys[0]) return colors[0];
  for (let i = 0; i < keys.length - 1; i++) {
    if (frame <= keys[i + 1]) {
      const t = (frame - keys[i]) / (keys[i + 1] - keys[i]);
      a.set(colors[i]);
      b.set(colors[i + 1]);
      c.copy(a).lerp(b, t);
      return `#${c.getHexString()}`;
    }
  }
  return colors[colors.length - 1];
};

/** Global atmosphere keyframes: fog, bloom, light levels, and scene-wide effect drivers. */
export const getAtmosphere = (frame: number): AtmosphereState => {
  const f = frame;
  const cross = PORTAL_CROSS_FRAME;
  return {
    fogDensity: track(
      f,
      [0, 120, cross - 2, cross + 8, 330, 480, 494, 530, 660],
      [0.015, 0.013, 0.02, 0.0062, 0.0055, 0.0052, 0.011, 0.0021, 0.0021],
    ),
    fogColor: lerpColor([0, 150, 330, 510, 660], ["#2a3166", "#262d60", "#2b2460", "#161c45", "#10143a"], f),
    bloomIntensity: track(
      f,
      [0, 120, cross - 3, cross, cross + 10, 300, 330, ACTS.conduit.eruption, 395, 440, 480, 520, 660],
      [0.85, 1.05, 2.2, 3.2, 1.15, 1.05, 1.2, 1.25, 1.9, 1.35, 1.3, 1.15, 1.0],
    ),
    ambient: track(f, [0, 150, 330, 510, 660], [0.9, 0.85, 0.8, 1.0, 1.0]),
    moon: track(f, [0, 150, 330, 510, 660], [1.3, 2.4, 2.0, 2.8, 2.8]),
    skyMist: track(f, [0, 120, 160, 330, 480, 520, 660], [0.86, 0.8, 0.55, 0.45, 0.35, 0.04, 0.0]),
    mistOpacity: track(f, [0, cross, 175], [1, 0.9, 0]),
    cloudOpacity: track(f, [0, 440, 470, 512, 548], [0, 0, 1, 1, 0.16]),
    pulse: track(f, [0, 340, 380, ACTS.conduit.eruption + 8, 480, 520, 660], [0, 0, 0.35, 1, 1, 0.55, 0.45]),
    beam: track(f, [0, ACTS.conduit.eruption, ACTS.conduit.eruption + 22], [0, 0, 1], Easing.out(Easing.cubic)),
    exposure:
      track(f, [0, 14], [0, 1], EASE.smooth) *
      track(f, [ACTS.ascent.fade, ACTS.ascent.end], [1, 0], EASE.smooth),
    portalSpin: track(f, [0, 100, cross], [0.25, 0.35, 2.6], Easing.in(Easing.quad)),
    portalFlash: track(f, [cross - 5, cross, cross + 9], [0, 1, 0]),
  };
};

const tmpForward = new THREE.Vector3();
const tmpUp = new THREE.Vector3();
const tmpQuat = new THREE.Quaternion();

/** Drives the default R3F camera from the pure rig every frame (layout phase, before R3F's advance()). */
export const CameraRig: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;

  useLayoutEffect(() => {
    const state = getCameraState(frame, fps);
    camera.position.set(...state.position);
    tmpForward.set(
      state.target[0] - state.position[0],
      state.target[1] - state.position[1],
      state.target[2] - state.position[2],
    ).normalize();
    tmpUp.set(0, 1, 0).applyQuaternion(tmpQuat.setFromAxisAngle(tmpForward, -state.roll));
    camera.up.copy(tmpUp);
    camera.lookAt(state.target[0], state.target[1], state.target[2]);
    camera.fov = state.fov;
    camera.near = 0.1;
    camera.far = 4000;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);
  }, [frame, fps, camera]);

  return null;
};
