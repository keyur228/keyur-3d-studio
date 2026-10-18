import { useEffect } from 'react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { initSmoothScroll, lockScroll } from '@/lib/scroll'
import { useModalOpen } from '@/store/useStore'
import { Navbar } from '@/components/sections/Navbar'
import { Hero } from '@/components/sections/Hero'
import { Projects } from '@/components/sections/Projects'
import { Process } from '@/components/sections/Process'
import { Skills } from '@/components/sections/Skills'
import { RequestForm } from '@/components/sections/RequestForm'
import { Footer } from '@/components/sections/Footer'
import { InspectorModal } from '@/components/modals/InspectorModal'
import { Toaster } from '@/components/ui/Toaster'
import { warmViewerWhenIdle } from '@/lib/prefetch'

export default function App() {
  const modalOpen = useModalOpen()

  useEffect(() => {
    initSmoothScroll()
    // fonts change line heights; re-measure scroll triggers once they're in
    document.fonts?.ready.then(() => ScrollTrigger.refresh())
  }, [])

  useEffect(() => {
    if (document.readyState === 'complete') warmViewerWhenIdle()
    else window.addEventListener('load', warmViewerWhenIdle, { once: true })
  }, [])

  useEffect(() => {
    lockScroll(modalOpen)
  }, [modalOpen])

  return (
    <>
      <a href="#projects" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-paper">
        Skip to projects
      </a>
      <Navbar />
      <main>
        <Hero />
        <Projects />
        <Process />
        <Skills />
        <RequestForm />
      </main>
      <Footer />

      <InspectorModal />
      <Toaster />
    </>
  )
}
