import Lenis from 'lenis'
import { prefersReducedMotion } from './motion'
import { addTick } from './ticker'

let instance: Lenis | null = null

export const getLenis = () => instance

/** Starts Lenis on the window and drives it from the shared ticker. Returns a cleanup function. */
export function startSmoothScroll(): () => void {
  if (instance) return () => {}
  const reduce = prefersReducedMotion()
  const lenis = new Lenis({
    autoRaf: false,
    lerp: 0.09,
    smoothWheel: !reduce,
    anchors: true,
  })
  instance = lenis
  const stopTick = addTick((time) => lenis.raf(time), -100)
  return () => {
    stopTick()
    lenis.destroy()
    if (instance === lenis) instance = null
  }
}

/** The scroll position for this frame (Lenis' smoothed value when it is running). */
export const currentScroll = () => (instance ? instance.scroll : window.scrollY)

/** True while the page is still moving, including Lenis easing out after the wheel stops. */
export const isScrolling = () => (instance ? Boolean(instance.isScrolling) : false)

const easeInOutQuart = (t: number) => (t < 0.5 ? 8 * t ** 4 : 1 - (-2 * t + 2) ** 4 / 2)

export function scrollToTarget(target: HTMLElement | number, duration = 1.6) {
  const reduce = prefersReducedMotion()
  if (instance) {
    instance.scrollTo(target, { duration, easing: easeInOutQuart, immediate: reduce, force: true })
    return
  }
  const top = typeof target === 'number' ? target : target.getBoundingClientRect().top + window.scrollY
  window.scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' })
}
