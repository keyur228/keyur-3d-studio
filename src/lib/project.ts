import type { Project } from '@/data/portfolioData'

/** Whether a project can be shown in the live 3D viewer. */
export const has3D = (p: Project) => Boolean(p.modelUrl || p.fallbackModel)

/** Short spec line for cards and captions: film length and format, or polycount and textures. */
export function projectMeta(p: Project): string[] {
  const parts = p.video ? [p.video.duration, p.video.format] : [p.polyCount, p.textures]
  return parts.filter((x): x is string => Boolean(x))
}
