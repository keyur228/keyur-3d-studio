/* Service worker: repeat visits are served from the Cache Storage.
 *  - /assets/*   hashed build output       cache-first (immutable)
 *  - /models/*   GLB files (URL carries ?v=) cache-first
 * Everything else (HTML, renders/thumbnails, API calls, third-party) is left to the browser's own HTTP cache. */
const CACHE = 'keyur-runtime-v1'

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) if (key.startsWith('keyur-runtime-') && key !== CACHE) await caches.delete(key)
      await self.clients.claim()
    })(),
  )
})

const cacheable = (res) => res && res.status === 200 && (res.type === 'basic' || res.type === 'default')

async function cacheFirst(req) {
  const cache = await caches.open(CACHE)
  const hit = await cache.match(req)
  if (hit) return hit
  const res = await fetch(req)
  if (cacheable(res)) cache.put(req, res.clone())
  return res
}

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET' || req.headers.has('range')) return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return
  if (/\/assets\//.test(url.pathname) || /\/models\//.test(url.pathname)) event.respondWith(cacheFirst(req))
})
