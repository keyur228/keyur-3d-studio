import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Menu, X } from 'lucide-react'
import { profile } from '@/data/portfolioData'
import { scrollToTarget } from '@/lib/scroll'

interface NavLink {
  label: string
  target: string
  id: string
}

const links: NavLink[] = [
  { label: 'Projects', target: '#projects', id: 'projects' },
  { label: 'Process', target: '#process', id: 'process' },
  { label: 'Skills', target: '#skills', id: 'skills' },
]

export function Navbar() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [active, setActive] = useState('')

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const io = new IntersectionObserver((entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id)), { rootMargin: '-45% 0px -50% 0px' })
    ;['top', 'projects', 'process', 'skills', 'request'].forEach((id) => {
      const el = document.getElementById(id)
      if (el) io.observe(el)
    })
    return () => io.disconnect()
  }, [])

  const go = (l: Pick<NavLink, 'target'>) => {
    setOpen(false)
    scrollToTarget(l.target)
  }

  const isActive = (l: NavLink) => active === l.id

  return (
    <header
      className={`fixed inset-x-0 top-0 z-[70] transition-[background-color,border-color,backdrop-filter] duration-300 ${
        scrolled || open ? 'border-b border-line bg-paper/95' : 'border-b border-transparent'
      }`}
    >
      <nav className="container-page flex h-16 items-center justify-between gap-6 md:h-[4.5rem]" aria-label="Primary">
        <button type="button" onClick={() => scrollToTarget('#top', 0)} className="flex items-baseline gap-2" aria-label="Keyur, back to top">
          <span className="display text-[1.75rem] leading-none text-ink">Keyur</span>
          <span className="eyebrow hidden sm:inline">3D Studio</span>
        </button>

        <ul className="hidden items-center gap-8 lg:flex">
          {links.map((l) => (
            <li key={l.id}>
              <button
                type="button"
                onClick={() => go(l)}
                aria-current={isActive(l) ? 'true' : undefined}
                className={`relative py-1 text-[0.9375rem] transition-colors ${isActive(l) ? 'text-ink' : 'text-ink-2 hover:text-ink'}`}
              >
                {l.label}
                {isActive(l) && <motion.span layoutId="nav-underline" className="absolute inset-x-0 -bottom-0.5 h-px bg-ink" />}
              </button>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-4">
          <span className="hidden items-center gap-2 text-sm text-ink-2 xl:flex">
            <span className="status-dot h-2 w-2 rounded-full bg-ok" />
            Available for work
          </span>
          <button type="button" onClick={() => go({ target: '#request' })} className="btn btn-primary hidden h-10 text-sm sm:inline-flex">
            Request an asset
          </button>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="grid h-10 w-10 place-items-center rounded-full border border-line-strong text-ink lg:hidden"
            aria-expanded={open}
            aria-label={open ? 'Close menu' : 'Open menu'}
          >
            {open ? <X className="h-[18px] w-[18px]" /> : <Menu className="h-[18px] w-[18px]" />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden lg:hidden"
          >
            <ul className="container-page flex flex-col pb-6">
              {[...links, { label: 'Request an asset', target: '#request', id: 'request' }].map((l) => (
                <li key={l.id} className="border-t border-line">
                  <button type="button" onClick={() => go(l)} className="display w-full py-4 text-left text-3xl text-ink">
                    {l.label}
                  </button>
                </li>
              ))}
              <li className="flex items-center gap-2 border-t border-line pt-5 text-sm text-ink-2">
                <span className="status-dot h-2 w-2 rounded-full bg-ok" /> {profile.availability}
              </li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
