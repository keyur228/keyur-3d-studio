/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  PORTFOLIO DATA — edit this file to update the whole site.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *  • Individual assets open the live 3D inspector.
 *      - thumbnailUrl → any image in /public (png / jpg / webp / svg)
 *      - modelUrl     → a .glb / .gltf in /public/models. If the file is missing
 *                       or fails to load, the inspector automatically shows the
 *                       procedural `fallbackModel` instead, so nothing breaks.
 *
 *  • Asset packs open the multi-image lightbox (no WebGL).
 *      - coverImage + galleryImages[] → any images in /public/packs/<pack>/
 *
 *  The placeholder renders that ship with the project live in
 *  /public/thumbnails and /public/packs — overwrite them with your own renders.
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

export interface IndividualAsset {
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
  /** The first featured asset is shown in the hero. */
  featured?: boolean
}

export interface PackImage {
  src: string
  caption: string
  kind: 'Beauty' | 'Clay' | 'Wireframe' | 'Overview' | 'Detail'
}

export interface AssetPack {
  id: string
  title: string
  tagline: string
  description: string
  categories: AssetCategory[]
  coverImage: string
  galleryImages: PackImage[]
  assetCount: string
  formats: string[]
  tags: string[]
  contents: { group: string; items: string[] }[]
  specs: { label: string; value: string }[]
  accent: string
  /** Optional store link (Gumroad, ArtStation, Blender Market, Fab…). Hidden when empty. */
  storeUrl?: string
  price?: string
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

// ── Individual 3D assets (open the live inspector) ───────────────────────────

export const individualAssets: IndividualAsset[] = [
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
  {
    id: 'hyper-knot',
    title: 'Hyper Knot',
    subtitle: 'Iridescent Shader Study',
    description:
      'A (2,3) torus-knot shader study exploring thin-film iridescence, clearcoat layering and ' +
      'procedural roughness breakup. Built as a look-dev test bed for Cycles and Eevee Next.',
    categories: ['Shaders', 'Stylized'],
    thumbnailUrl: asset('/thumbnails/hyper-knot.svg'),
    modelUrl: asset('/models/hyper-knot.glb'),
    fallbackModel: 'hyperKnot',
    polyCount: '18.4k Tris',
    textures: 'Procedural',
    topology: 'All-Quad · Subd Ready',
    software: ['Blender', 'Cycles'],
    tags: ['Iridescence', 'Clearcoat', 'Look-Dev'],
    accent: '#6366f1',
    year: 2026,
  },
  {
    id: 'prism-crystals',
    title: 'Prism Crystal Cluster',
    subtitle: 'Stylized Environment Prop',
    description:
      'Hand-shaped crystal cluster with faceted low-poly silhouette, baked gradient emission and ' +
      'a shared trim atlas — designed to scatter across stylized cave and fantasy environments.',
    categories: ['Stylized', 'Environments', 'Props'],
    thumbnailUrl: asset('/thumbnails/prism-crystals.svg'),
    modelUrl: asset('/models/prism-crystals.glb'),
    fallbackModel: 'crystalCluster',
    polyCount: '6.8k Tris',
    textures: '2K Stylized',
    topology: 'Low-Poly · Game-Ready',
    software: ['Blender', 'Substance Painter'],
    tags: ['Emissive', 'Scatter Ready', 'Gradient Atlas'],
    accent: '#a855f7',
    year: 2026,
  },
  {
    id: 'sentinel-drone',
    title: 'Sentinel Recon Drone',
    subtitle: 'Hard-Surface Hero Asset',
    description:
      'Quad-rotor recon drone modeled with a boolean-free hard-surface workflow, weighted normals ' +
      'and a 4K PBR texture set. Rigged rotors and a looping hover animation included.',
    categories: ['Sci-Fi', 'Props'],
    thumbnailUrl: asset('/thumbnails/sentinel-drone.svg'),
    modelUrl: asset('/models/sentinel-drone.glb'),
    fallbackModel: 'mechDrone',
    polyCount: '24.6k Tris',
    textures: '4K PBR',
    topology: 'Weighted Normals · LOD0–2',
    software: ['Blender', 'Substance Painter', 'Unreal'],
    tags: ['Hard-Surface', 'Rigged', 'Animated'],
    accent: '#06b6d4',
    year: 2026,
  },
  {
    id: 'cargo-crate',
    title: 'Cargo Crate MK-II',
    subtitle: 'Modular Sci-Fi Prop',
    description:
      'Industrial sci-fi cargo crate with bevelled panels, emissive status strips and a trim-sheet ' +
      'texture approach so variants can be produced in minutes.',
    categories: ['Sci-Fi', 'Props'],
    thumbnailUrl: asset('/thumbnails/cargo-crate.svg'),
    modelUrl: asset('/models/cargo-crate.glb'),
    fallbackModel: 'sciFiCrate',
    polyCount: '3.2k Tris',
    textures: '4K PBR',
    topology: 'Game-Ready · Trim Sheet',
    software: ['Blender', 'Substance Painter'],
    tags: ['Trim Sheet', 'Modular', 'Emissive'],
    accent: '#e87d0d',
    year: 2025,
  },
  {
    id: 'fusion-core',
    title: 'Fusion Reactor Core',
    subtitle: 'Animated Emissive Centerpiece',
    description:
      'Gyroscopic reactor core with counter-rotating rings and an animated volumetric-look emissive ' +
      'shader. Optimised as a lightweight GLB centerpiece for WebGL landing pages.',
    categories: ['Sci-Fi', 'Shaders'],
    thumbnailUrl: asset('/thumbnails/fusion-core.svg'),
    modelUrl: asset('/models/fusion-core.glb'),
    fallbackModel: 'energyCore',
    polyCount: '15.1k Tris',
    textures: 'Emissive Shader',
    topology: 'Optimised · Web Ready',
    software: ['Blender', 'Three.js'],
    tags: ['Animated', 'WebGL', 'Emissive'],
    accent: '#22d3ee',
    year: 2026,
  },
  {
    id: 'grove-tree',
    title: 'Low-Poly Grove Tree',
    subtitle: 'Stylized Foliage',
    description:
      'Faceted stylized tree with wind-ready vertex colors and a single gradient atlas material. ' +
      'Three size variants share one 256px texture for near-zero draw-call cost.',
    categories: ['Stylized', 'Environments'],
    thumbnailUrl: asset('/thumbnails/grove-tree.svg'),
    modelUrl: asset('/models/grove-tree.glb'),
    fallbackModel: 'lowPolyTree',
    polyCount: '1.9k Tris',
    textures: 'Gradient Atlas',
    topology: 'Low-Poly · Vertex Color',
    software: ['Blender', 'Unity'],
    tags: ['Foliage', 'Wind Ready', 'Mobile'],
    accent: '#34d399',
    year: 2025,
  },
  {
    id: 'monolith-shrine',
    title: 'Ancient Monolith Shrine',
    subtitle: 'Environment Set-Piece',
    description:
      'Weathered stone shrine with a floating relic, sculpted in high-poly and baked down to a ' +
      'clean game mesh. Tileable 4K stone material and glowing rune decals included.',
    categories: ['Environments', 'Props'],
    thumbnailUrl: asset('/thumbnails/monolith-shrine.svg'),
    modelUrl: asset('/models/monolith-shrine.glb'),
    fallbackModel: 'monolithShrine',
    polyCount: '9.4k Tris',
    textures: '4K PBR',
    topology: 'Baked High→Low',
    software: ['Blender', 'ZBrush', 'Substance Painter'],
    tags: ['Sculpted', 'Baked', 'Decals'],
    accent: '#f59e0b',
    year: 2025,
  },
  {
    id: 'chrome-orb',
    title: 'Chrome Liquid Orb',
    subtitle: 'Procedural Displacement Shader',
    description:
      'A metaball-style liquid chrome sphere driven entirely by procedural noise displacement — ' +
      'no textures, fully animatable and tuned for product-style motion loops.',
    categories: ['Shaders'],
    thumbnailUrl: asset('/thumbnails/chrome-orb.svg'),
    modelUrl: asset('/models/chrome-orb.glb'),
    fallbackModel: 'liquidOrb',
    polyCount: '32.0k Tris',
    textures: 'Procedural',
    topology: 'Subdivided Sphere',
    software: ['Blender', 'Geometry Nodes'],
    tags: ['Displacement', 'Chrome', 'Loopable'],
    accent: '#818cf8',
    year: 2026,
  },
]

// ── Asset packs (open the image lightbox) ────────────────────────────────────

const packGallery = (id: string): PackImage[] => [
  { src: asset(`/packs/${id}/cover.svg`), caption: 'Hero composition', kind: 'Beauty' },
  { src: asset(`/packs/${id}/01-beauty.svg`), caption: 'Textured beauty shot', kind: 'Beauty' },
  { src: asset(`/packs/${id}/02-clay.svg`), caption: 'Clay render — form & silhouette', kind: 'Clay' },
  { src: asset(`/packs/${id}/03-wireframe.svg`), caption: 'Topology / wireframe pass', kind: 'Wireframe' },
  { src: asset(`/packs/${id}/04-overview.svg`), caption: 'Asset overview sheet', kind: 'Overview' },
]

export const assetPacks: AssetPack[] = [
  {
    id: 'neon-district',
    title: 'Neon District',
    tagline: 'Modular Cyberpunk City Kit',
    description:
      'A snap-to-grid modular kit for building dense cyberpunk streets: towers, kiosks, ' +
      'skybridges, signage and rooftop greebles, all sharing two trim sheets and an emissive atlas.',
    categories: ['Sci-Fi', 'Environments'],
    coverImage: asset('/packs/neon-district/cover.svg'),
    galleryImages: packGallery('neon-district'),
    assetCount: '45+ Modular Assets',
    formats: ['.BLEND', '.FBX', '.OBJ', '.GLB'],
    tags: ['Modular', 'Cyberpunk', 'Trim Sheets', 'Emissive'],
    contents: [
      { group: 'Architecture', items: ['12 tower modules', '8 wall & floor tiles', '4 skybridges'] },
      { group: 'Props', items: ['10 kiosks & vending units', '6 vent / AC stacks', '5 holo billboards'] },
      { group: 'Materials', items: ['2 tileable trim sheets', '1 emissive signage atlas', 'Wet-street shader'] },
    ],
    specs: [
      { label: 'Total Tris', value: '186k' },
      { label: 'Textures', value: '4K PBR (Metal/Rough)' },
      { label: 'Grid', value: '2m snap · real-world scale' },
      { label: 'Engine', value: 'Blender · Unreal · Unity' },
    ],
    accent: '#d946ef',
  },
  {
    id: 'fantasy-forest',
    title: 'Whispering Grove',
    tagline: 'Stylized Fantasy Forest Pack',
    description:
      'Hand-crafted stylized foliage, mushrooms, rocks and ground scatter with gradient-atlas ' +
      'materials — built for mobile, WebGL and stylized PC titles.',
    categories: ['Stylized', 'Environments'],
    coverImage: asset('/packs/fantasy-forest/cover.svg'),
    galleryImages: packGallery('fantasy-forest'),
    assetCount: '60+ Stylized Assets',
    formats: ['.BLEND', '.FBX', '.GLB'],
    tags: ['Stylized', 'Foliage', 'Mobile Ready', 'Wind'],
    contents: [
      { group: 'Foliage', items: ['14 trees (3 sizes)', '12 bushes & ferns', '6 grass clumps'] },
      { group: 'Props', items: ['9 glowing mushrooms', '10 rocks & cliffs', '5 stumps & logs'] },
      { group: 'Materials', items: ['1 shared 512px gradient atlas', 'Vertex-color wind setup'] },
    ],
    specs: [
      { label: 'Total Tris', value: '74k' },
      { label: 'Textures', value: '512px Gradient Atlas' },
      { label: 'Draw Calls', value: '1 material for entire pack' },
      { label: 'Engine', value: 'Blender · Unity · Three.js' },
    ],
    accent: '#34d399',
  },
  {
    id: 'kitbash-vol1',
    title: 'Hard-Surface Kitbash Vol.1',
    tagline: 'Greebles · Panels · Mechanical Parts',
    description:
      'A production kitbash library of bolts, vents, hatches, pipes and panel inserts with clean ' +
      'shading — drop them on any hard-surface model to add instant mechanical detail.',
    categories: ['Sci-Fi', 'Props'],
    coverImage: asset('/packs/kitbash-vol1/cover.svg'),
    galleryImages: packGallery('kitbash-vol1'),
    assetCount: '120+ Kitbash Parts',
    formats: ['.BLEND', '.FBX', '.OBJ'],
    tags: ['Kitbash', 'Hard-Surface', 'Greebles', 'Asset Browser'],
    contents: [
      { group: 'Mechanical', items: ['32 vents & grilles', '24 pipes & joints', '18 bolts & rings'] },
      { group: 'Panels', items: ['28 panel inserts', '12 hatches & doors'] },
      { group: 'Extras', items: ['Blender Asset Browser library', 'Weighted-normal presets'] },
    ],
    specs: [
      { label: 'Total Tris', value: '210k' },
      { label: 'Shading', value: 'Weighted normals · no textures needed' },
      { label: 'Library', value: 'Blender Asset Browser ready' },
      { label: 'Use', value: 'Concept · Hero props · Renders' },
    ],
    accent: '#e87d0d',
  },
  {
    id: 'desert-ruins',
    title: 'Sunken Sands',
    tagline: 'Desert Ruins Environment Pack',
    description:
      'Sun-bleached pillars, broken arches, obelisks and rubble sculpted in high detail and baked ' +
      'to game-ready meshes with tileable sandstone materials.',
    categories: ['Environments'],
    coverImage: asset('/packs/desert-ruins/cover.svg'),
    galleryImages: packGallery('desert-ruins'),
    assetCount: '38 Environment Assets',
    formats: ['.BLEND', '.FBX', '.OBJ', '.GLB'],
    tags: ['Sculpted', 'Ruins', 'PBR', 'Tileable'],
    contents: [
      { group: 'Structures', items: ['8 pillars (intact & broken)', '4 arch gates', '6 wall segments'] },
      { group: 'Scatter', items: ['12 rubble pieces', '5 dune rocks', '3 obelisks'] },
      { group: 'Materials', items: ['3 tileable sandstone sets', 'Sand blend shader'] },
    ],
    specs: [
      { label: 'Total Tris', value: '142k' },
      { label: 'Textures', value: '4K PBR + tileables' },
      { label: 'Workflow', value: 'Sculpt → Retopo → Bake' },
      { label: 'Engine', value: 'Blender · Unreal · Unity' },
    ],
    accent: '#f59e0b',
  },
]

export const assetCategories: AssetCategory[] = ['Props', 'Environments', 'Sci-Fi', 'Stylized', 'Shaders']

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
