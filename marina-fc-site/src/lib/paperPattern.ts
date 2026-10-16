import { useEffect } from 'react'
import type { RefObject } from 'react'
import { addTick } from './ticker'

/**
 * The page's faint football pattern (styles/global.css) is painted on the page itself, so it
 * scrolls with the document from its top-left corner. Layers that paint the page colour over a
 * photo (mattes, veils, fades) carry the pattern too (class "paper-surface"); this keeps each
 * one's copy lined up with the page's by offsetting it by the layer's own position in the page.
 * Checked every frame (after the parallax, priority 5), since reveals and parallax move these
 * layers; the offset is only written when it changes, and only for layers near the screen.
 */
const surfaces = new Map<HTMLElement, string>()
let stopTick: (() => void) | null = null

function align(el: HTMLElement, last: string) {
  const rect = el.getBoundingClientRect()
  if (rect.bottom < -200 || rect.top > window.innerHeight + 200) return
  const x = Math.round(-(rect.left + window.scrollX) * 2) / 2
  const y = Math.round(-(rect.top + window.scrollY) * 2) / 2
  const key = `${x} ${y}`
  if (key === last) return
  surfaces.set(el, key)
  el.style.setProperty('--paper-x', `${x}px`)
  el.style.setProperty('--paper-y', `${y}px`)
}

/** Registers a paper-surface layer for as long as the component is mounted. */
export function usePaperSurface(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    surfaces.set(el, '')
    align(el, '')
    stopTick ??= addTick(() => {
      for (const [surface, last] of surfaces) align(surface, last)
    }, 10)
    return () => {
      surfaces.delete(el)
      if (!surfaces.size && stopTick) {
        stopTick()
        stopTick = null
      }
    }
  }, [ref])
}
