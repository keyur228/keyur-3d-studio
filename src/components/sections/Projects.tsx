import { projects } from '@/data/portfolioData'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { Reveal } from '@/components/ui/Reveal'
import { ProjectCard } from '@/components/showcase/ProjectCard'

/** Every project in one list; each card opens the live 3D preview. */
export function Projects() {
  return (
    <section id="projects" className="section">
      <div className="container-page">
        <SectionHeading
          index="01"
          eyebrow="Projects"
          title={
            <>
              Selected <em className="text-accent">projects.</em>
            </>
          }
          description="Open any project to explore the real model in 3D: orbit around it, check the topology in wireframe, switch the lighting, or browse the final renders."
        />
        <Reveal className="grid gap-x-8 gap-y-14 md:grid-cols-2" stagger={0.1}>
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </Reveal>
      </div>
    </section>
  )
}
