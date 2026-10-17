import { useEffect } from 'react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { initSmoothScroll, lockScroll } from '@/lib/scroll'
import { useModalOpen } from '@/store/useStore'
import { Navbar } from '@/components/sections/Navbar'
import { Hero } from '@/components/sections/Hero'
import { Projects } from '@/components/sections/Projects'
import { Process } from '@/components/sections/Process'
import { Skills } from '@/components/sections/Skills'
import { About } from '@/components/sections/About'
import { RequestForm } from '@/components/sections/RequestForm'
import { Footer } from '@/components/sections/Footer'
import { InspectorModal } from '@/components/modals/InspectorModal'
import { Toaster } from '@/components/ui/Toaster'

export default function App() {
  const modalOpen = useModalOpen()

  useEffect(() => {
    initSmoothScroll()
    // fonts change line heights; re-measure scroll triggers once they're in
    document.fonts?.ready.then(() => ScrollTrigger.refresh())
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
        <About />
        <RequestForm />
      </main>
      <Footer />

      <InspectorModal />
      <Toaster />
    </>
  )
}
