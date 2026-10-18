import type { Project } from '@/data/portfolioData'

/** Whether a project can be shown in the live 3D viewer. */
export const has3D = (p: Project) => Boolean(p.modelUrl || p.fallbackModel)

/** Short spec line for cards and captions: polycount and textures. */
export function projectMeta(p: Project): string[] {
  return [p.polyCount, p.textures].filter((x): x is string => Boolean(x))
}
