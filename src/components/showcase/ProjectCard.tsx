import { useRef, useState } from 'react'
import { ArrowUpRight, Box, Play } from 'lucide-react'
import type { Project } from '@/data/portfolioData'
import { useStore } from '@/store/useStore'
import { projectMeta } from '@/lib/project'

/** A project: its render (or a hover-preview of its film) and key specs; opens the project preview. */
export function ProjectCard({ project }: { project: Project }) {
  const openAsset = useStore((s) => s.openAsset)
  const preview = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const film = project.video

  // hover plays the small muted clip; it's only fetched on first hover
  const startPreview = () => {
    const v = preview.current
    if (!v) return
    v.play().then(() => setPlaying(true)).catch(() => {})
  }
  const stopPreview = () => {
    const v = preview.current
    if (!v) return
    v.pause()
    v.currentTime = 0
    setPlaying(false)
  }

  return (
    <button
      type="button"
      onClick={() => openAsset(project)}
      onPointerEnter={film?.preview ? startPreview : undefined}
      onPointerLeave={film?.preview ? stopPreview : undefined}
      aria-label={film ? `Watch ${project.title}` : `Preview ${project.title} in 3D`}
      className="group block w-full text-left"
    >
      <div className="relative aspect-video overflow-hidden rounded-2xl border border-line bg-paper-2 transition-shadow duration-500 group-hover:shadow-[var(--shadow-lift)]">
        <img
          src={project.thumbnailUrl}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition-transform duration-700 ease-out-expo group-hover:scale-[1.03]"
        />
        {film?.preview && (
          <video
            ref={preview}
            src={film.preview}
            muted
            loop
            playsInline
            preload="none"
            aria-hidden
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${playing ? 'opacity-100' : 'opacity-0'}`}
          />
        )}
        <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-card/90 px-3 py-1.5 text-[13px] font-medium text-ink shadow-[var(--shadow-soft)] backdrop-blur transition-colors group-hover:bg-ink group-hover:text-paper">
          {film ? <Play className="h-3.5 w-3.5" /> : <Box className="h-3.5 w-3.5" />} {film ? 'Watch film' : 'Preview in 3D'}
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
