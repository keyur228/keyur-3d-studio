/** Resolve a /public path against Vite's base (e.g. '/keyur-3d-studio/' on GitHub Pages). */
export const asset = (path: string) => import.meta.env.BASE_URL + path.replace(/^\//, '')
