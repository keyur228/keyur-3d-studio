import { ArrowUpRight, Box } from 'lucide-react'
import type { Project } from '@/data/portfolioData'
import { useStore } from '@/store/useStore'
import { projectMeta } from '@/lib/project'
import { prefetchProject } from '@/lib/prefetch'

/** A project: its render and key specs; opens the live 3D preview (and warms its model while the pointer is over the card). */
export function ProjectCard({ project }: { project: Project }) {
  const openAsset = useStore((s) => s.openAsset)
  const warm = () => prefetchProject(project)

  return (
    <button
      type="button"
      onClick={() => openAsset(project)}
      onPointerEnter={warm}
      onFocus={warm}
      onTouchStart={warm}
      aria-label={`Preview ${project.title} in 3D`}
      className="group block w-full text-left"
    >
      <div className="relative aspect-video overflow-hidden rounded-2xl border border-line bg-paper-2 transition-shadow duration-500 group-hover:shadow-[var(--shadow-lift)]">
        <img
          src={project.thumbnailUrl}
          alt=""
          width={1280}
          height={720}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition-transform duration-700 ease-out-expo group-hover:scale-[1.03]"
        />
        <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-card/95 px-3 py-1.5 text-[13px] font-medium text-ink shadow-[var(--shadow-soft)] transition-colors group-hover:bg-ink group-hover:text-paper">
          <Box className="h-3.5 w-3.5" /> Preview in 3D
        </span>
      </div>
      <div className="mt-5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="display text-[1.875rem] leading-tight text-ink">{project.title}</h3>
          <p className="mt-1 text-ink-2">{project.subtitle}</p>
        </div>
        <ArrowUpRight className="mt-2 h-5 w-5 shrink-0 text-muted transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent" />
      </div>
      <p className="mt-3 font-mono text-xs text-muted">{[String(project.year), ...projectMeta(project)].join(' · ')}</p>
    </button>
  )
}
