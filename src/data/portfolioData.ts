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

// ── Types ────────────────────────────────────────────────────────────────────

export type AssetCategory = 'Props' | 'Environments' | 'Sci-Fi' | 'Stylized' | 'Shaders'

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
  /** Path to a .glb/.gltf in /public/models — optional. */
  modelUrl?: string
  fallbackModel: ProceduralModelId
  polyCount: string
  textures: string
  topology: string
  software: string[]
  tags: string[]
  /** Accent color used for glows/badges on this card. */
  accent: string
  year: number
  /** Full project entries: rendered stills shown in the inspector's "Renders" tab. */
  renders?: { src: string; caption: string }[]
  /** Short technical highlights listed in the inspector. */
  highlights?: string[]
  /** Download size of the 3D preview, shown before it loads (e.g. '6 MB'). */
  previewSize?: string
  /** The first featured project is shown in the hero. */
  featured?: boolean
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
  /** Optional portrait for the About section (e.g. '/portrait.jpg'). A monogram is shown when empty. */
  portraitUrl: '',
  responseTime: 'Replies within 24–48 hours',
  bio:
    'I build high-fidelity 3D models, stylized and realistic shaders, game-ready assets and ' +
    'cinematic motion in Blender. From a single hero prop to a complete modular asset pack, ' +
    'every piece ships with clean topology, efficient UVs and PBR textures that drop straight ' +
    'into your engine, renderer or WebGL scene.',
  badges: ['Blender 3D', 'PBR Workflows', 'Game-Ready Topology', 'Custom Asset Packs', 'Cycles & Eevee', 'GLB for Web'],
  stats: [
    { value: 120, suffix: '+', label: 'Assets modeled' },
    { value: 8, suffix: '', label: 'Asset packs released' },
    { value: 4, suffix: 'K', label: 'Max texture resolution' },
    { value: 100, suffix: '%', label: 'Quad-based topology' },
  ],
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
    modelUrl: asset('/models/fruit-crate.glb'),
    fallbackModel: 'sciFiCrate',
    polyCount: '54.6k Tris',
    textures: '4K PBR + SSS',
    topology: 'Game-ready · UCX colliders',
    software: ['Blender', 'Cycles', 'Bullet Physics'],
    tags: ['Physics', 'Game-Ready', 'glTF / FBX'],
    accent: '#b9521a',
    year: 2026,
    featured: true,
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
    modelUrl: asset('/models/cozy-house.glb'),
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
