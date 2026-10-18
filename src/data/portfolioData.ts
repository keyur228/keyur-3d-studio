/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  PORTFOLIO DATA — edit this file to update the whole site.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *  • `projects` are listed in the Projects section; each opens the live 3D preview.
 *      - thumbnailUrl → any image in /public (png / jpg / webp / svg)
 *      - modelUrl     → a .glb / .gltf in /public/models. If the file is missing
 *                       or fails to load, the preview shows the procedural
 *                       `fallbackModel` instead, so nothing breaks.
 *      - renders      → stills shown in the preview's "Renders" tab.
 */

import { asset } from '@/lib/asset'

/** Bump when a model in /public/models changes: the service worker caches models by URL, so this busts it. */
const MODEL_V = '20261019'

// ── Types ────────────────────────────────────────────────────────────────────

export type AssetCategory = 'Props' | 'Environments' | 'Sci-Fi' | 'Stylized' | 'Shaders' | 'Animation'

/** Built-in procedural models used when no .glb is available. */
export type ProceduralModelId =
  | 'hyperKnot'
  | 'crystalCluster'
  | 'mechDrone'
  | 'sciFiCrate'
  | 'energyCore'
  | 'lowPolyTree'
  | 'monolithShrine'
  | 'liquidOrb'

export interface Project {
  id: string
  title: string
  subtitle: string
  description: string
  categories: AssetCategory[]
  thumbnailUrl: string
  /** Path to a .glb/.gltf in /public/models. A project with a model (or a fallback) gets a Live 3D view. */
  modelUrl?: string
  /** Procedural model shown if `modelUrl` is missing or fails to load. */
  fallbackModel?: ProceduralModelId
  polyCount?: string
  textures?: string
  topology?: string
  software: string[]
  tags: string[]
  /** Accent color used for glows/badges on this card. */
  accent: string
  year: number
  /** Rendered stills, shown in the preview's "Renders" tab. */
  renders?: { src: string; caption: string }[]
  /** Short technical highlights listed in the inspector. */
  highlights?: string[]
  /** Download size of the 3D preview, shown before it loads (e.g. '6 MB'). */
  previewSize?: string
  /** The first featured project is shown in the hero. */
  featured?: boolean
  /** The model is a rigged, clickable character (click zones, eye tracking, NLA clips). */
  interactive?: 'doraemon'
}

export interface SkillGroup {
  id: string
  title: string
  socketColor: string
  icon: 'box' | 'palette' | 'clapperboard' | 'workflow'
  skills: { name: string; level: number }[]
}

// ── Profile ──────────────────────────────────────────────────────────────────

export const profile = {
  name: 'Keyur',
  brand: 'KEYUR // 3D STUDIO',
  email: 'assetcrate02@gmail.com',
  roles: ['3D Artist', 'Blender Specialist', 'Motion Designer'],
  location: 'Based in India, working worldwide',
  availability: 'Available for custom 3D & animation work',
  /** Hero headline — `emphasis` is set in the accent italic. */
  heroTitle: { before: 'Crafting game-ready worlds,', emphasis: 'one vertex', after: 'at a time.' },
  intro:
    'I model, texture and animate 3D assets in Blender for games, the web and product visuals — ' +
    'from a single hero prop to complete modular packs.',
  responseTime: 'Replies within 24–48 hours',
  /** Social links — set `url` to your profile; entries with an empty url are hidden. */
  socials: [
    { label: 'ArtStation', url: 'https://www.artstation.com/' },
    { label: 'Sketchfab', url: 'https://sketchfab.com/' },
    { label: 'Instagram', url: 'https://www.instagram.com/' },
    { label: 'LinkedIn', url: 'https://www.linkedin.com/' },
  ],
}

// ── Projects (each opens the live 3D preview) ────────────────────────────────

export const projects: Project[] = [
  {
    id: 'fruit-crate',
    title: 'Market Fruit Crate',
    subtitle: 'Interactive, physics-ready game asset',
    description:
      'A slatted pine market crate with five compartments, one per fruit type, settled into place with a ' +
      'Bullet physics simulation. Each fruit type is modeled once and varied in shape and size per piece, at ' +
      'real-world scale, with baked 4K PBR and subsurface textures, a convex collider per piece, and metadata ' +
      'for grabbing, inspecting and snap-back.',
    categories: ['Props', 'Environments'],
    thumbnailUrl: asset('/projects/fruit-crate/thumb.webp'),
    modelUrl: asset('/models/fruit-crate.glb') + `?v=${MODEL_V}`,
    fallbackModel: 'sciFiCrate',
    polyCount: '54.6k Tris',
    textures: '4K PBR + SSS',
    topology: 'Game-ready · UCX colliders',
    software: ['Blender', 'Cycles', 'Bullet Physics'],
    tags: ['Physics', 'Game-Ready', 'glTF / FBX'],
    accent: '#b9521a',
    year: 2026,
    previewSize: '6 MB',
    renders: [
      { src: asset('/projects/fruit-crate/hero.webp'), caption: 'Hero render — Cycles, studio lighting' },
      { src: asset('/projects/fruit-crate/top.webp'), caption: 'Top-down view of the five compartments' },
      { src: asset('/projects/fruit-crate/closeup.webp'), caption: 'Close-up of the subsurface fruit materials' },
    ],
    highlights: [
      'Five fruit types — apples, oranges, kiwis, pears and pineapples — with per-piece shape and size variation, settled with Bullet physics',
      '60 × 40 × 25 cm crate at real-world scale, origins at each centre of mass',
      'Seven 4K baked texture sets with subsurface, sheen (kiwi) and clearcoat (orange)',
      '42 Unreal-style UCX convex colliders plus mass, grab and snap-back metadata',
      'Exports: glTF, FBX for Unreal / Unity, and a 6 MB web GLB with 2K WebP textures',
      'Fully scripted, re-runnable Blender Python build pipeline',
    ],
  },
  {
    id: 'cozy-house',
    title: 'Cozy House Interior',
    subtitle: 'Interactive, explorable game environment',
    description:
      'A furnished cottage interior built for first-person or orbit exploration: golden-hour sun through sheer ' +
      'linen, a bouclé sofa, a brick fireplace, a sage kitchen with brass hardware and a herringbone oak floor. ' +
      'Doors and drawers are rigged on real hinge and slide axes, every lamp toggles its light and glow together, ' +
      'and the clutter is grabbable with physics metadata — with navmesh, colliders and baked lightmaps ready for an engine.',
    categories: ['Environments', 'Props'],
    thumbnailUrl: asset('/projects/cozy-house/thumb.webp'),
    modelUrl: asset('/models/cozy-house.glb') + `?v=${MODEL_V}`,
    fallbackModel: 'monolithShrine',
    polyCount: '345k Tris',
    textures: '2K PBR + 4K lightmaps',
    topology: 'Game-ready · dual UVs',
    software: ['Blender', 'Cycles', 'Poly Haven'],
    tags: ['Interactive', 'Game-Ready', 'glTF / FBX'],
    accent: '#7d8f62',
    year: 2026,
    previewSize: '23 MB',
    renders: [
      { src: asset('/projects/cozy-house/living.webp'), caption: 'Living room — golden-hour sun through sheer linen' },
      { src: asset('/projects/cozy-house/kitchen.webp'), caption: 'Sage kitchen, butcher-block island and the fruit crate' },
      { src: asset('/projects/cozy-house/bedroom.webp'), caption: 'Bedroom with oak bed, walnut nightstands and lamps' },
      { src: asset('/projects/cozy-house/living-evening.webp'), caption: 'Evening — sun off, the same lamps switched on' },
      { src: asset('/projects/cozy-house/cutaway.webp'), caption: 'Cut-away of the whole floor plan' },
      { src: asset('/projects/cozy-house/crate.webp'), caption: 'The fruit crate on the kitchen island' },
    ],
    highlights: [
      '85.8 m² explorable cottage with golden-hour lighting',
      '17 hinged doors and 11 drawers, each with a real pivot and limits',
      '10 lights that switch the lamp and its emissive glow together',
      '58 grabbable props, including the fruit crate on the kitchen island',
      'Navmesh, 150 UCX colliders and camera POIs',
      'Dual UVs with 4K baked lightmaps',
      '26/26 automated checks passing',
    ],
  },
  {
    id: 'doraemon',
    title: 'Doraemon — Interactive 4D Pocket',
    subtitle: 'Rigged, clickable stylized CGI character bundle',
    description:
      'A tactile, vinyl-soft take on the blue robot cat, built to be played with rather than posed. Click his head, belly, ' +
      'pocket or red tail; his eyes follow your cursor. The pocket opens onto a stencil portal so a Take-copter and a dorayaki ' +
      'can be pulled out of "infinite" space without clipping through his body. 53 ARKit-plus-anime shape ' +
      'keys, IK/FK limbs with volume-preserving squash and stretch, spring bones for the bell, whiskers and tail, and six baked ' +
      'NLA clips — all in one glTF with the interaction spec embedded.',
    categories: ['Props', 'Stylized', 'Animation'],
    thumbnailUrl: asset('/projects/doraemon/thumb.webp'),
    modelUrl: asset('/models/doraemon.glb') + `?v=${MODEL_V}`,
    fallbackModel: 'liquidOrb',
    interactive: 'doraemon',
    featured: true,
    polyCount: '101k Tris + gadgets',
    textures: '4K skin PBR · 2K gadgets',
    topology: 'All-quad · 53 shape keys',
    software: ['Blender', 'Cycles', 'Python'],
    tags: ['Interactive', 'Rigged', 'glTF / FBX'],
    accent: '#1e90e6',
    year: 2026,
    previewSize: '11 MB',
    renders: [
      { src: asset('/projects/doraemon/hero.webp'), caption: 'Hero — soft satin vinyl skin, lacquered nose, brushed brass bell' },
      { src: asset('/projects/doraemon/face.webp'), caption: 'Face — curved oval eyes, sliding pupils, drawn smile and philtrum' },
      { src: asset('/projects/doraemon/expressions.webp'), caption: 'Expression library — laugh, pout, shock, heart eyes, dizzy, worried' },
      { src: asset('/projects/doraemon/pocket_open.webp'), caption: 'The 4D pocket opening, belly bulging as the hand rummages inside' },
      { src: asset('/projects/doraemon/eat.webp'), caption: 'Eating a dorayaki — three-layer bite shape keys' },
      { src: asset('/projects/doraemon/hover.webp'), caption: 'Take-copter hover with the motion-blur disc swap' },
      { src: asset('/projects/doraemon/clips.webp'), caption: 'Six baked NLA clips' },
      { src: asset('/projects/doraemon/wire_head.webp'), caption: 'Clean all-quad topology — head and mouth rim' },
    ],
    highlights: [
      'Click the head, belly, pocket or tail — hit volumes drive the state machine',
      'Pupils follow the cursor (CTRL_Eye_LookAt, ±6° limits)',
      'Pocket stencil portal: gadgets clip against the pouch, never the body',
      '53 shape keys: ARKit subset + anime library, driven by a bone slider panel',
      'IK/FK arms and legs, soft IK, auto volume-preserving squash and stretch',
      'Spring bones on bell, pellet, 6 whiskers, tail and belly — baked into every clip',
      'Take-copter and Dorayaki with their own rigs and sockets',
      '95/95 automated checks passing',
    ],
  },
]

// ── Skills (rendered as a Blender-style node graph) ──────────────────────────

export const skillGroups: SkillGroup[] = [
  {
    id: 'modeling',
    title: '3D & Modeling',
    socketColor: '#b9521a',
    icon: 'box',
    skills: [
      { name: 'Hard-Surface Modeling', level: 95 },
      { name: 'Sculpting', level: 85 },
      { name: 'Retopology', level: 90 },
      { name: 'UV Unwrapping', level: 90 },
      { name: 'Modular Kitbashing', level: 88 },
    ],
  },
  {
    id: 'lookdev',
    title: 'Texturing & LookDev',
    socketColor: '#b08a2e',
    icon: 'palette',
    skills: [
      { name: 'Procedural Shaders', level: 92 },
      { name: 'PBR Texturing', level: 90 },
      { name: 'Baking', level: 88 },
      { name: 'Lighting & Rendering (Cycles / Eevee)', level: 93 },
    ],
  },
  {
    id: 'motion',
    title: 'Animation & Motion',
    socketColor: '#3f7d8c',
    icon: 'clapperboard',
    skills: [
      { name: 'Keyframe Animation', level: 87 },
      { name: 'Camera Rigging', level: 85 },
      { name: 'Physics Simulations', level: 80 },
      { name: 'Visual Storytelling', level: 86 },
    ],
  },
  {
    id: 'pipeline',
    title: 'Pipeline & Web 3D',
    socketColor: '#5b5e9e',
    icon: 'workflow',
    skills: [
      { name: 'GLTF / GLB Optimization', level: 90 },
      { name: 'Three.js / WebGL Integration', level: 82 },
      { name: 'Game Engine Export', level: 88 },
    ],
  },
]

export const toolchain = ['Blender', 'Cycles', 'Eevee', 'Geometry Nodes', 'Substance Painter', 'ZBrush', 'Unreal Engine', 'Unity', 'Three.js', 'After Effects']

// ── Process (horizontal pinned scroll) ───────────────────────────────────────

export const processSteps = [
  { id: '01', title: 'Brief & Reference', text: 'We lock style, scale, polycount budget and target platform. I build a reference board and block-out plan.' },
  { id: '02', title: 'Block-out', text: 'Primitive block-out to nail silhouette and proportions — reviewed in-engine or in a quick turntable.' },
  { id: '03', title: 'Model & Sculpt', text: 'Hard-surface modeling and sculpted detail, keeping edge flow clean for deformation and subdivision.' },
  { id: '04', title: 'Retopo & UV', text: 'Game-ready retopology, efficient UV layouts and texel density matched across the whole set.' },
  { id: '05', title: 'Texture & Shade', text: 'Baked maps, PBR or stylized texturing and procedural shaders tuned under multiple lighting setups.' },
  { id: '06', title: 'Render & Deliver', text: 'Beauty renders, turntables and optimized .BLEND / .FBX / .GLB exports ready for your pipeline.' },
]

// ── Request form options ─────────────────────────────────────────────────────

export const requestOptions = {
  types: ['Single Custom 3D Asset', 'Full Asset Pack', '3D Animation / Scene', 'Other Inquiry'],
  styles: ['Realistic PBR', 'Low-Poly / Stylized', 'Sci-Fi / Hard-Surface', 'Architectural / Environment'],
  platforms: ['WebGL / Three.js', 'Unreal / Unity', 'Blender Native Render'],
  budgets: ['< $250', '$250 – $750', '$750 – $2,000', '$2,000 – $5,000', '$5,000+', 'Not sure yet'],
  timelines: ['ASAP (< 1 week)', '1 – 2 weeks', '2 – 4 weeks', '1 – 2 months', 'Flexible'],
}
