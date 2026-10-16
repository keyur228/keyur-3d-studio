import { processSteps } from '@/data/portfolioData'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { Reveal } from '@/components/ui/Reveal'

/** Six-step commission pipeline as a calm numbered grid. */
export function Process() {
  return (
    <section id="process" className="section bg-paper-2/60">
      <div className="container-page">
        <SectionHeading
          index="02"
          eyebrow="Process"
          title={
            <>
              From brief <em className="text-accent">to render.</em>
            </>
          }
          description="A clear pipeline with a review at every stage, so you see the asset take shape and nothing surprises you at delivery."
        />
        <Reveal as="ol" className="grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-3" stagger={0.06}>
          {processSteps.map((s) => (
            <li key={s.id} className="border-t border-line-strong pt-6">
              <span className="font-mono text-sm text-accent">{s.id}</span>
              <h3 className="mt-3 text-xl font-medium text-ink">{s.title}</h3>
              <p className="mt-2 leading-relaxed text-ink-2">{s.text}</p>
            </li>
          ))}
        </Reveal>
      </div>
    </section>
  )
}
