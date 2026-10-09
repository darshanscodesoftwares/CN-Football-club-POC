import { lazy, Suspense, useEffect } from 'react'
import { BallCursor } from './components/cursor/BallCursor'
import { MenuButton } from './components/MenuButton'
import { ScrollIndicator } from './components/ScrollIndicator'
import { startSmoothScroll } from './lib/smoothScroll'
import { About } from './sections/about/About'
import { Hero } from './sections/hero/Hero'

// Below-the-fold sections load as separate chunks (GSAP and motion live there), so the hero's
// first download stays small. They start loading straight away, long before anyone scrolls to them.
const Gallery = lazy(() => import('./sections/gallery/Gallery').then((m) => ({ default: m.Gallery })))
const Team = lazy(() => import('./sections/team/Team').then((m) => ({ default: m.Team })))
const Footer = lazy(() => import('./sections/footer/Footer').then((m) => ({ default: m.Footer })))

export default function App() {
  useEffect(() => startSmoothScroll(), [])

  return (
    <>
      <MenuButton />
      <ScrollIndicator />
      <main>
        <Hero />
        <About />
        <Suspense fallback={null}>
          <Gallery />
        </Suspense>
        <Suspense fallback={null}>
          <Team />
        </Suspense>
      </main>
      <Suspense fallback={null}>
        <Footer />
      </Suspense>
      <BallCursor />
    </>
  )
}
