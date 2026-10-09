import { useEffect, useRef } from 'react'
import { clamp } from '../lib/math'
import { currentScroll, getLenis } from '../lib/smoothScroll'
import { addTick } from '../lib/ticker'
import './ScrollIndicator.css'

/** How long the pill stays fully visible after the page stops moving. */
const ACTIVE_FOR_MS = 900

/**
 * Replaces the native scrollbar (hidden in global.css) with a short pill on the right edge.
 * It tracks overall page progress, brightens while the page moves, and can be dragged.
 */
export function ScrollIndicator() {
  const railRef = useRef<HTMLDivElement>(null)
  const thumbRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const rail = railRef.current
    const thumb = thumbRef.current
    if (!rail || !thumb) return

    let travel = 0
    let lastY = -1
    let lastMoveAt = 0
    let dragging = false
    let shown = false

    const limit = () => {
      const lenis = getLenis()
      return Math.max(1, lenis ? lenis.limit : document.documentElement.scrollHeight - window.innerHeight)
    }
    const measure = () => {
      travel = Math.max(0, rail.clientHeight - thumb.offsetHeight)
      lastY = -1
    }
    measure()
    const resizeObserver = new ResizeObserver(measure)
    resizeObserver.observe(rail)

    const stopTick = addTick((time) => {
      const y = Math.round(clamp(currentScroll() / limit()) * travel * 10) / 10
      if (y !== lastY) {
        if (lastY !== -1) lastMoveAt = time
        lastY = y
        thumb.style.transform = `translate3d(0, ${y}px, 0)`
      }
      const active = dragging || time - lastMoveAt < ACTIVE_FOR_MS
      if (active !== shown) {
        shown = active
        rail.classList.toggle('is-active', active)
      }
    }, 10)

    const onPointerDown = (event: PointerEvent) => {
      event.preventDefault()
      dragging = true
      rail.classList.add('is-dragging')
      thumb.setPointerCapture(event.pointerId)
      const startY = event.clientY
      const startScroll = currentScroll()
      const onMove = (move: PointerEvent) => {
        const max = limit()
        const target = clamp(startScroll + ((move.clientY - startY) / Math.max(1, travel)) * max, 0, max)
        const lenis = getLenis()
        if (lenis) lenis.scrollTo(target, { lerp: 0.2, force: true })
        else window.scrollTo(0, target)
      }
      const onUp = () => {
        dragging = false
        rail.classList.remove('is-dragging')
        thumb.removeEventListener('pointermove', onMove)
        thumb.removeEventListener('pointerup', onUp)
        thumb.removeEventListener('pointercancel', onUp)
      }
      thumb.addEventListener('pointermove', onMove)
      thumb.addEventListener('pointerup', onUp)
      thumb.addEventListener('pointercancel', onUp)
    }
    thumb.addEventListener('pointerdown', onPointerDown)

    return () => {
      stopTick()
      resizeObserver.disconnect()
      thumb.removeEventListener('pointerdown', onPointerDown)
    }
  }, [])

  return (
    <div ref={railRef} className="scroll-indicator" aria-hidden="true">
      <div ref={thumbRef} className="scroll-indicator__thumb" />
    </div>
  )
}
