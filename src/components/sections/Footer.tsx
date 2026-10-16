import { ArrowUp } from 'lucide-react'
import { profile } from '@/data/portfolioData'
import { scrollToTarget } from '@/lib/scroll'

export function Footer() {
  const socials = profile.socials.filter((s) => s.url)
  return (
    <footer className="border-t border-line bg-paper-2/60">
      <div className="container-page pb-10 pt-20 md:pt-28">
        <p className="eyebrow">Start a project</p>
        <a href={`mailto:${profile.email}`} className="display mt-5 block text-[clamp(2.25rem,6vw,5rem)] text-ink transition-colors hover:text-accent">
          Let&apos;s make something <em>worth rendering.</em>
        </a>
        <a href={`mailto:${profile.email}`} className="link-underline mt-6 inline-block break-all text-lg text-ink-2 hover:text-ink">
          {profile.email}
        </a>

        <div className="mt-20 flex flex-col gap-6 border-t border-line pt-6 text-sm text-ink-2 md:flex-row md:items-center md:justify-between">
          <p>
            © {new Date().getFullYear()} {profile.name} · 3D Studio
          </p>
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {socials.map((s) => (
              <li key={s.label}>
                <a href={s.url} target="_blank" rel="noreferrer" className="link-underline hover:text-ink">
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => scrollToTarget('#top', 0)} className="inline-flex items-center gap-2 hover:text-ink">
            Back to top <ArrowUp className="h-4 w-4" />
          </button>
        </div>
      </div>
    </footer>
  )
}
