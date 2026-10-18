# KEYUR // 3D STUDIO

Interactive 3D portfolio for Keyur — 3D artist, Blender creator and motion designer.

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
| `projects` | The **Projects** section. Each card opens the live 3D preview |
| `skillGroups`, `toolchain` | The Blender-style node graph |
| `processSteps` | The process steps |
| `requestOptions` | Dropdowns and pills in the request form |

> The stats (`120+ Assets Modeled` and so on) and social links are sample values. Replace them with your real numbers and profile URLs.

### Adding a project

1. Export from Blender as **glTF Binary (.glb)**. WebP textures keep it small. Draco and Meshopt also work, but Draco loads its decoder from a CDN.
2. Put the model in `public/models/` and its renders in `public/projects/<id>/`. A 16:9 thumbnail fits the card exactly.
3. Add an entry to `projects`. Wrap every path in `asset()` so it also works under the GitHub Pages sub-path:

```ts
{
  id: 'my-robot',
  title: 'Patrol Robot',
  subtitle: 'Rigged hard-surface character',
  description: '…',
  categories: ['Sci-Fi', 'Props'],
  thumbnailUrl: asset('/projects/my-robot/thumb.webp'),
  modelUrl: asset('/models/my-robot.glb'),
  fallbackModel: 'mechDrone',      // shown if the .glb is missing or fails
  polyCount: '28.1k Tris',
  textures: '4K PBR',
  topology: 'Quad · LOD0–2',
  software: ['Blender', 'Substance Painter'],
  tags: ['Rigged', 'Hard-Surface'],
  accent: '#06b6d4',
  year: 2026,
  // optional
  renders: [{ src: asset('/projects/my-robot/hero.webp'), caption: 'Hero render' }],
  highlights: ['…'],
  previewSize: '8 MB',
  featured: false,
}
```

What the optional fields do:

- `renders` adds a **Renders** tab next to **Live 3D**.
- `interactive: 'doraemon'` swaps the generic viewer for the clickable character viewer (`DoraemonModel`).
- `highlights` adds a bullet list of technical highlights.
- `previewSize` shows the download size while the model loads.
- `featured: true` puts the project in the hero; the first featured entry wins.

Shrink a GLB for the web with `npx @gltf-transform/cli meshopt in.glb out.glb --level high` (quantises and meshopt-compresses geometry and animation; the loader decodes it automatically). Bump `MODEL_V` in `portfolioData.ts` after replacing a model: the service worker caches models by URL.

Game-engine exports are fine as-is. Collision hulls (glTF extras with `collision_proxy`, or nodes named `UCX_*`) are stripped before display. The preview scales any model, stands it on the ground plane and aims the camera at its centre. If `modelUrl` is missing or fails to load, it shows the procedural `fallbackModel` instead. The built-in fallbacks are `hyperKnot`, `crystalCluster`, `mechDrone`, `sciFiCrate`, `energyCore`, `lowPolyTree`, `monolithShrine` and `liquidOrb`.

While a model downloads, the preview shows the project's render behind a particle animation that morphs between a computer, a cat, a dog, a phone, an apple and an armchair. The shapes are defined in `src/components/three/morphShapes.ts`.

---

## Request form email delivery

The form sends to **assetcrate02@gmail.com**.

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
├── store/useStore.ts              ← Zustand: open project, viewer settings, toasts
├── lib/
│   ├── scroll.ts                  ← Lenis + GSAP ScrollTrigger sync, shared pointer/velocity state
│   └── email.ts                   ← Web3Forms / Formspree / EmailJS + mailto fallback
├── hooks/                         ← media-query + in-view helpers
├── components/
│   ├── three/
│   │   ├── InspectorCanvas.tsx    ← live viewer: OrbitControls, grid, contact shadows, nav gizmo
│   │   ├── AssetModel.tsx         ← GLB loader → normalise → wireframe/clay → dispose
│   │   ├── ProceduralModels.tsx   ← 8 fallback models
│   │   ├── LightingRig.tsx        ← Studio / Sunset / Night / Clay (Lightformer HDRI)
│   │   ├── MorphLoader.tsx        ← particle loader shown while a model downloads
│   │   └── morphShapes.ts         ← the loader's six objects, sampled to point clouds
│   ├── modals/                    ← InspectorModal: live 3D preview + renders
│   ├── showcase/                  ← ProjectCard
│   ├── sections/                  ← Navbar, Hero, Projects, Process, Skills, About, RequestForm, Footer
│   └── ui/                        ← Reveal (the single fade-up animation), SectionHeading, Toaster
└── index.css                      ← design tokens, type, buttons, layout helpers
```

## Performance notes

- **Project cards are images, not canvases.** A WebGL canvas mounts only when a project is opened, and that code is split into its own chunk.
- **Unmounting frees GPU memory.** Closing the inspector unmounts the canvas. R3F disposes the renderer and scene, and `AssetModel` disposes cloned materials, geometries and textures and clears the `useGLTF` cache.
- **The loader's point clouds are sampled once** per page load and reused on every open.
- **Lighting presets need no HDR downloads.** They're built from drei `Lightformer`s, so they work offline.
- **Motion is deliberately quiet.** Sections fade up once as they enter, and `prefers-reduced-motion` turns off smooth scrolling and entrance animations.

## 3D preview shortcuts

`W` wireframe · `R` auto-rotate · `1–4` lighting preset · `F` reset camera · `Esc` close

The `Studio` and `Clay` presets use warm light backdrops to match the site; `Sunset` and `Night` are moody looks for showing emissives.

## Deploy

`npm run build` and upload `dist/` to any static host (Vercel, Netlify, Cloudflare Pages, GitHub Pages).
