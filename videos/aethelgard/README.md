# The Awakening of Aethelgard

A 22-second (660 frames @ 30 fps, 1920×1080) procedural film built with Remotion, React Three Fiber, Three.js and Tailwind. It uses no external models or textures: every island, cottage, rune, crystal and shader is generated in code.

```bash
npm install
npm run studio        # interactive preview at http://localhost:3000
npm run render        # → out/aethelgard.mp4
node scripts/preview-stills.mjs 60 200 400   # half-scale stills → out/stills/
```

## Structure

| File | Role |
| --- | --- |
| `src/Root.tsx` | Registers the `MysticalVillage` composition |
| `src/MysticalVillageComp.tsx` | `<ThreeCanvas>`, fog, lights, bloom + ACES composer, overlay |
| `src/CameraRig.tsx` | Pure `getCameraState(frame)` spline rig for all 4 acts, plus `getAtmosphere(frame)` (fog, bloom, pulse, beam, exposure keyframes) |
| `src/WorldGeometry.tsx` | Sky nebula, starfield, reflective water, veil rocks, rune gate, village layout (islands, cottages, bridges, docks) and the arcane obelisk with GLSL shaders |
| `src/EffectsAndUI.tsx` | Instanced lanterns, runes, mist, clouds, lens embers, and the cinematic typography overlay |
| `src/shared.ts` | Timeline constants, palette, seeded PRNG, noise and shared GLSL |

## Determinism

Everything is a pure function of `useCurrentFrame()`. Per-frame mutations run in `useLayoutEffect`, so they land before `@remotion/three` calls R3F's `advance()` in its passive effect. Spin speeds that ramp up are integrated from the frame number (`integrate()` in `shared.ts`), never accumulated.

The only `useFrame` is the composer's render hook in `PostFX`, and it carries no animation state. The composer is owned directly, not through `@react-three/postprocessing`, because that wrapper sizes its render targets in a passive effect that runs *after* Remotion's `advance()`. With the wrapper, the first frame of every render tab came out blank.

## Rendering notes

`remotion.config.ts` sets the ANGLE GL backend (WebGL needs a GPU in headless Chrome) and concurrency 2 to keep VRAM in check. Raise the concurrency on a larger GPU.
