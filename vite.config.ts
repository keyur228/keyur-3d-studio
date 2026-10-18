import { fileURLToPath, URL } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/** Preload the two fonts every page uses (hashed file names are only known at build time). */
const preloadFonts = (): Plugin => ({
  name: 'preload-critical-fonts',
  transformIndexHtml(_html, ctx) {
    const base = process.env.GITHUB_ACTIONS ? '/keyur-3d-studio/' : '/'
    const files = Object.keys(ctx.bundle ?? {}).filter((f) => /(inter-latin-400-normal|instrument-serif-latin-400-normal)-[\w-]+\.woff2$/.test(f))
    return files.map((f) => ({
      tag: 'link',
      attrs: { rel: 'preload', as: 'font', type: 'font/woff2', crossorigin: '', href: base + f },
      injectTo: 'head',
    }))
  },
})

/**
 * Content-Security-Policy for the production build (GitHub Pages can't send headers, so it is a <meta> tag).
 * Scripts only from this origin (+ WebAssembly for the meshopt decoder), no plugins, no <base> hijacking, and the page can only
 * talk to itself and the three form services the request form supports, so an injected script couldn't ship data elsewhere.
 * Not applied in dev: Vite's HMR needs inline scripts and a websocket.
 */
const contentSecurityPolicy = (): Plugin => ({
  name: 'content-security-policy',
  apply: 'build',
  transformIndexHtml() {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'wasm-unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self' blob: data: https://api.web3forms.com https://formspree.io https://api.emailjs.com",
      "worker-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ')
    return [
      { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: csp }, injectTo: 'head-prepend' },
      { tag: 'meta', attrs: { name: 'referrer', content: 'strict-origin-when-cross-origin' }, injectTo: 'head-prepend' },
    ]
  },
})

export default defineConfig({
  // GitHub Pages serves this as a project page under /keyur-3d-studio/.
  base: process.env.GITHUB_ACTIONS ? '/keyur-3d-studio/' : '/',
  plugins: [react(), tailwindcss(), preloadFonts(), contentSecurityPolicy()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        // Function form: shared helpers (zustand, react) stay with the entry instead of being dragged into the 3D chunks,
        // so three / r3f / drei only download when the viewer opens.
        manualChunks(id: string) {
          if (/vite\/preload-helper|commonjsHelpers|vite\/modulepreload-polyfill/.test(id)) return 'vendor'
          if (!id.includes('node_modules')) return undefined
          if (/node_modules\/(react|react-dom|scheduler|zustand|use-sync-external-store|lucide-react)\//.test(id)) return 'vendor'
          if (/node_modules\/(three|three-stdlib|@react-three|meshline|troika|maath|camera-controls|stats-gl|@mediapipe|detect-gpu|suspend-react|its-fine|react-use-measure|tunnel-rat|hls\.js|bidi-js|webgl-sdf-generator|potpack|@monogrid)/.test(id)) return 'three'
          if (/node_modules\/(gsap|framer-motion|motion-dom|motion-utils|lenis)\//.test(id)) return 'motion'
          return undefined
        },
      },
    },
  },
})
