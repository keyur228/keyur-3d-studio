import type { ReactNode } from 'react'
import { Reveal } from './Reveal'

/**
 * Section header: numbered eyebrow and serif title on the left,
 * a short supporting paragraph on the right (stacked on mobile).
 */
export function SectionHeading({ index, eyebrow, title, description, aside }: { index: string; eyebrow: string; title: ReactNode; description?: string; aside?: ReactNode }) {
  return (
    <Reveal className="mb-12 grid gap-6 border-t border-line pt-8 md:mb-16 md:grid-cols-12 md:gap-10">
      <div className="md:col-span-7">
        <p className="eyebrow">
          <span className="text-accent">{index}</span>
          <span className="mx-2 text-line-strong">/</span>
          {eyebrow}
        </p>
        <h2 className="display mt-4 text-[clamp(2.5rem,5vw,4rem)] text-ink">{title}</h2>
      </div>
      {(description || aside) && (
        <div className="flex flex-col justify-end gap-5 md:col-span-5">
          {description && <p className="max-w-md text-[1.0625rem] leading-relaxed text-ink-2">{description}</p>}
          {aside}
        </div>
      )}
    </Reveal>
  )
}
