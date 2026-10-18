import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { ThreeCanvas } from "@remotion/three";
import {
  BloomEffect,
  EffectComposer,
  EffectPass,
  KernelSize,
  RenderPass,
  ToneMappingEffect,
  ToneMappingMode,
} from "postprocessing";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { CameraRig, getAtmosphere } from "./CameraRig";
import { CloudCanopy, LanternSwarm, LensEmbers, RuneDrift, StoryOverlay, VeilMist } from "./EffectsAndUI";
import { ArcaneObelisk, MysticalVillage, ReflectiveWater, RuneGate, SkyDome, Starfield, VeilRocks } from "./WorldGeometry";
import { PALETTE, track } from "./shared";

/** Scene-wide fog, lights and bloom, all keyed off the current frame. */
const Atmosphere: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scene = useThree((s) => s.scene);
  const ambient = useRef<THREE.AmbientLight>(null);
  const moon = useRef<THREE.DirectionalLight>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const atmo = getAtmosphere(frame);

  useLayoutEffect(() => {
    if (!(scene.fog instanceof THREE.FogExp2)) scene.fog = new THREE.FogExp2(PALETTE.indigo, 0.015);
    const fog = scene.fog as THREE.FogExp2;
    fog.color.set(atmo.fogColor);
    fog.density = atmo.fogDensity;
    scene.background = new THREE.Color(PALETTE.obsidian);
    const t = frame / fps;
    if (ambient.current) ambient.current.intensity = atmo.ambient;
    if (hemi.current) hemi.current.intensity = atmo.ambient * 0.9;
    if (moon.current) {
      moon.current.intensity = atmo.moon * (0.96 + 0.04 * Math.sin(t * 0.7));
      moon.current.position.set(-90 + Math.sin(t * 0.05) * 4, 130, 70);
    }
  }, [frame, fps, scene, atmo.fogColor, atmo.fogDensity, atmo.ambient, atmo.moon]);

  return (
    <>
      <ambientLight ref={ambient} color="#6d72b8" intensity={0.9} />
      <hemisphereLight ref={hemi} args={["#6a70c0", "#1a1530", 0.8]} />
      <directionalLight ref={moon} color={PALETTE.moon} intensity={0.8} position={[-90, 130, 70]} />
    </>
  );
};

/**
 * Bloom + ACES tone mapping via a composer we own, so it is sized synchronously at creation and is
 * ready on the very first advance() of every render tab. useFrame is used purely as the render hook
 * (priority 1 replaces R3F's default render); it carries no animation state — bloom intensity is
 * driven from the Remotion frame in a layout effect.
 */
const PostFX: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);

  const { composer, bloom } = useMemo(() => {
    const fx = new EffectComposer(gl, { frameBufferType: THREE.HalfFloatType, multisampling: 4 });
    fx.addPass(new RenderPass(scene, camera));
    const bloomEffect = new BloomEffect({
      mipmapBlur: true,
      intensity: 1,
      luminanceThreshold: 0.62,
      luminanceSmoothing: 0.28,
      radius: 0.78,
      kernelSize: KernelSize.LARGE,
    });
    fx.addPass(new EffectPass(camera, bloomEffect, new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC })));
    fx.setSize(width, height);
    return { composer: fx, bloom: bloomEffect };
  }, [gl, scene, camera, width, height]);

  useEffect(() => () => composer.dispose(), [composer]);

  useLayoutEffect(() => {
    bloom.intensity = getAtmosphere(frame).bloomIntensity;
  }, [frame, bloom]);

  useFrame(() => composer.render(), 1);
  return null;
};

const World: React.FC = () => (
  <>
    <CameraRig />
    <Atmosphere />
    <SkyDome />
    <Starfield />
    <ReflectiveWater />
    <VeilRocks />
    <VeilMist />
    <RuneDrift />
    <RuneGate />
    <MysticalVillage />
    <LanternSwarm count={300} />
    <ArcaneObelisk />
    <CloudCanopy />
    <LensEmbers />
    <PostFX />
  </>
);

export const MysticalVillageComp: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const { exposure } = getAtmosphere(frame);
  const contrast = track(frame, [0, 150, 330, 510, 660], [1.04, 1.06, 1.08, 1.05, 1.0]);

  return (
    <AbsoluteFill style={{ backgroundColor: PALETTE.midnight }}>
      <AbsoluteFill style={{ opacity: Math.min(1, exposure * 1.15), filter: `brightness(${exposure}) contrast(${contrast}) saturate(1.08)` }}>
        <ThreeCanvas
          width={width}
          height={height}
          gl={{ antialias: false, powerPreference: "high-performance", preserveDrawingBuffer: true }}
          camera={{ fov: 48, near: 0.1, far: 4000, position: [0, 7.5, 172] }}
          dpr={1}
        >
          <World />
        </ThreeCanvas>
      </AbsoluteFill>
      <StoryOverlay />
    </AbsoluteFill>
  );
};
