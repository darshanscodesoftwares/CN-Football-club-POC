import { animate } from 'animejs'
import { useEffect, useRef } from 'react'
import { prefersReducedMotion } from '../lib/motion'
import './MenuButton.css'

/**
 * Fixed round menu trigger from the reference header. The menu panel itself is a later step,
 * so for now the button only gives hover and press feedback.
 */
export function MenuButton() {
  const faceRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const face = faceRef.current
    if (!face) return
    const intro = prefersReducedMotion()
      ? animate(face, { opacity: [0, 1], duration: 500, delay: 300 })
      : animate(face, { opacity: [0, 1], scale: [0.4, 1], duration: 1200, delay: 700, ease: 'outBack(1.8)' })
    return () => {
      intro.revert()
    }
  }, [])

  const press = () => {
    const face = faceRef.current
    if (!face || prefersReducedMotion()) return
    animate(face, { scale: [0.84, 1], duration: 800, ease: 'outElastic(1, .45)' })
  }

  return (
    <button type="button" className="menu-btn" aria-label="Menu" onClick={press}>
      <span ref={faceRef} className="menu-btn__face">
        <span className="menu-btn__line menu-btn__line--top" />
        <span className="menu-btn__line menu-btn__line--bottom" />
      </span>
    </button>
  )
}
