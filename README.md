# KEYUR // 3D STUDIO

Interactive 3D portfolio and asset showcase for Keyur — 3D artist, Blender creator and motion designer.

**Design:** warm editorial light theme with Instrument Serif headlines, Inter body text and one burnt-orange accent. All colours and type tokens live at the top of `src/index.css` (`@theme`).

**Stack:** React 19 · TypeScript · Vite 6 · Tailwind CSS 4 · Three.js · React Three Fiber 9 · drei 10 · GSAP ScrollTrigger · Framer Motion · Lenis · Zustand · Lucide

---

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build → dist/
npm run preview    # serve the production build
```

Requires Node 18+.

---

## Editing your content

Almost everything lives in **`src/data/portfolioData.ts`**:

| Export | What it controls |
| --- | --- |
| `profile` | Name, roles, bio, email, availability, stats, badges, social links |
| `individualAssets` | Cards that open the **live 3D inspector** |
| `assetPacks` | Cards that open the **image lightbox** (no WebGL) |
| `skillGroups`, `toolchain` | The Blender-style node graph |
| `processSteps` | The horizontal pin-scroll pipeline |
| `requestOptions` | Dropdowns and pills in the request form |

> The stats (`120+ Assets Modeled` and so on), pack contents and social links are sample values. Replace them with your real numbers and profile URLs.

### Adding a 3D asset

1. Export from Blender as **glTF Binary (.glb)**. Draco or Meshopt compression is recommended for the web.
2. Drop the file in `public/models/`, e.g. `public/models/my-robot.glb`.
3. Drop a render in `public/thumbnails/`, e.g. `my-robot.webp`.
4. Add an entry to `individualAssets`:

```ts
{
  id: 'my-robot',
  title: 'Patrol Robot',
  subtitle: 'Rigged Hard-Surface Character',
  description: '…',
  categories: ['Sci-Fi', 'Props'],
  thumbnailUrl: '/thumbnails/my-robot.webp',
  modelUrl: '/models/my-robot.glb',
  fallbackModel: 'mechDrone',      // shown if the .glb is missing or fails
  polyCount: '28.1k Tris',
  textures: '4K PBR',
  topology: 'Quad · LOD0–2',
  software: ['Blender', 'Substance Painter'],
  tags: ['Rigged', 'Hard-Surface'],
  accent: '#06b6d4',
  year: 2026,
}
```

Full projects can add three optional fields. The **Market Fruit Crate** entry uses all of them:

- `renders: [{ src, caption }]` adds a **Renders** tab to the inspector, next to **Live 3D**.
- `highlights: string[]` adds a bullet list of technical highlights.
- `previewSize: '6 MB'` shows the download size while the model loads.
- `featured: true` puts the project in the hero and marks its card. The first featured entry wins.

Game-engine exports are fine as-is. Collision hulls, either glTF extras with `collision_proxy` or nodes named `UCX_*`, are stripped before display. Models are stood on the ground plane, and the camera aims at their centre.

The inspector scales and centres any model automatically, so unit scale and pivot placement don't matter. If `modelUrl` is missing or fails to load, it shows the procedural `fallbackModel`. That's why the site works before you add any `.glb` files. The 8 built-in fallbacks are `hyperKnot`, `crystalCluster`, `mechDrone`, `sciFiCrate`, `energyCore`, `lowPolyTree`, `monolithShrine` and `liquidOrb`.

### Adding an asset pack

Put images in `public/packs/<pack-id>/` and add an entry to `assetPacks` with `coverImage`, `galleryImages[]` (each has `src`, `caption` and a `kind` of `Beauty`, `Clay`, `Wireframe`, `Overview` or `Detail`), `assetCount`, `formats`, `contents`, `specs` and an optional `storeUrl` / `price`.

The placeholder SVG renders in `public/thumbnails` and `public/packs` are stand-ins. Overwrite them with your real renders (PNG, JPG and WebP all work).

---

## Request form email delivery

The form sends to **keyurkurani5@gmail.com**.

- **No setup needed:** with no provider configured, Send Request opens the visitor's email app with a pre-filled subject and body (`mailto:`). A **Copy Email** button is always available.
- **Direct delivery (recommended):** copy `.env.example` to `.env` and configure one provider:

```bash
# Web3Forms (free, simplest): get an access key at https://web3forms.com
VITE_FORM_PROVIDER=web3forms
VITE_WEB3FORMS_ACCESS_KEY=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# Formspree
# VITE_FORM_PROVIDER=formspree
# VITE_FORMSPREE_FORM_ID=abcdwxyz

# EmailJS (template variables: subject, from_name, reply_to, message, to_email)
# VITE_FORM_PROVIDER=emailjs
# VITE_EMAILJS_SERVICE_ID=service_xxx
# VITE_EMAILJS_TEMPLATE_ID=template_xxx
# VITE_EMAILJS_PUBLIC_KEY=xxxxxxxx
```

Restart `npm run dev` after editing `.env`. If the configured service fails, the form falls back to `mailto:` automatically. On Vercel or Netlify, add the same variables in the dashboard.

---

## Project structure

```
src/
├── data/portfolioData.ts          ← all editable content
├── store/useStore.ts              ← Zustand: showcase mode/filter, modals, viewer settings, toasts
├── lib/
│   ├── scroll.ts                  ← Lenis + GSAP ScrollTrigger sync, shared pointer/velocity state
│   └── email.ts                   ← Web3Forms / Formspree / EmailJS + mailto fallback
├── hooks/                         ← media-query + in-view helpers
├── components/
│   ├── three/
│   │   ├── HeroSculpture.tsx      ← framed ceramic sculpture in the hero
│   │   ├── InspectorCanvas.tsx    ← live viewer: OrbitControls, grid, contact shadows, nav gizmo
│   │   ├── AssetModel.tsx         ← GLB loader → normalise → wireframe/clay → dispose
│   │   ├── ProceduralModels.tsx   ← 8 fallback models
│   │   ├── LightingRig.tsx        ← Studio / Sunset / Night / Clay (Lightformer HDRI)
│   │   └── LoadingSpinner3D.tsx
│   ├── modals/                    ← InspectorModal (3D) + PackLightbox (images)
│   ├── showcase/                  ← AssetCard, PackCard
│   ├── sections/                  ← Navbar, Hero, Showcase, Process, Skills, About, RequestForm, Footer
│   └── ui/                        ← Reveal (the single fade-up animation), SectionHeading, Toaster
└── index.css                      ← design tokens, type, buttons, layout helpers
```

## Performance notes

- **The grid uses thumbnails, not canvases.** A WebGL canvas mounts only when an asset is opened, and that code is split into its own chunk.
- **Unmounting frees GPU memory.** Closing the inspector unmounts the canvas. R3F disposes the renderer and scene, and `AssetModel` disposes cloned materials, geometries and textures and clears the `useGLTF` cache.
- **The hero canvas pauses** when it scrolls out of view or a modal is open (`frameloop="never"`).
- **Lighting presets need no HDR downloads.** They're built from drei `Lightformer`s, so they work offline.
- **Motion is deliberately quiet.** Sections fade up once as they enter, and `prefers-reduced-motion` turns off smooth scrolling and entrance animations.

## Inspector shortcuts

`W` wireframe · `R` auto-rotate · `1–4` lighting preset · `F` reset camera · `Esc` close
In the pack lightbox: `←` / `→` to navigate, and swipe on touch devices.

The `Studio` and `Clay` presets use warm light backdrops to match the site; `Sunset` and `Night` are moody looks for showing emissives.

## Deploy

`npm run build` and upload `dist/` to any static host (Vercel, Netlify, Cloudflare Pages, GitHub Pages).
