import { useEffect, useRef } from 'react'
import { damp } from '../../lib/math'
import { prefersReducedMotion } from '../../lib/motion'
import { addTick } from '../../lib/ticker'
import type { BallScene } from './ballScene'
import './BallCursor.css'

/** Canvas size in CSS px; the ball fills FILL of it (about 28 px across). */
const SIZE = 34
const FILL = 0.82
/** Follow speed (1/s): the ball trails the pointer by about 25 ms, smooth without feeling late. */
const FOLLOW = 42

const pixelRatio = () => Math.min(window.devicePixelRatio || 1, 2)

/**
 * The site cursor: a small 3D football (three.js) in the style of the 2026 World Cup ball with the
 * Marina FC crest, centred on the pointer. Each click spins it one full turn. Only on devices with
 * a precise hovering pointer; touch screens keep their normal behaviour. Three.js loads in its own
 * chunk once the browser is idle, and the normal cursor stays until the ball is ready.
 */
export function BallCursor() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)')
    if (!canvas || !fine.matches) return

    let disposed = false
    let stop = () => {}
    const boot = async () => {
      try {
        const { createBallScene } = await import('./ballScene')
        if (disposed) return
        const scene = await createBallScene(canvas, { cssSize: SIZE, fill: FILL, pixelRatio: pixelRatio() })
        if (disposed) {
          scene.dispose()
          return
        }
        stop = run(canvas, scene, fine)
      } catch {
        // No WebGL (or it failed to start): the normal cursor simply stays.
      }
    }
    const idle = window.requestIdleCallback
      ? window.requestIdleCallback(() => void boot(), { timeout: 1500 })
      : window.setTimeout(() => void boot(), 600)

    return () => {
      disposed = true
      if (window.cancelIdleCallback) window.cancelIdleCallback(idle)
      else window.clearTimeout(idle)
      stop()
    }
  }, [])

  return <canvas ref={canvasRef} className="ball-cursor" aria-hidden="true" />
}

function run(canvas: HTMLCanvasElement, scene: BallScene, fine: MediaQueryList): () => void {
  const root = document.documentElement
  const reduce = prefersReducedMotion()
  const half = SIZE / 2
  let targetX = 0
  let targetY = 0
  let x = 0
  let y = 0
  let lastX = Number.NaN
  let lastY = Number.NaN
  let visible = false
  let needsRender = true
  let lost = false

  const place = () => {
    if (x === lastX && y === lastY) return
    lastX = x
    lastY = y
    canvas.style.transform = `translate3d(${(x - half).toFixed(2)}px, ${(y - half).toFixed(2)}px, 0)`
  }
  const show = () => {
    if (visible || lost || !fine.matches) return
    visible = true
    canvas.classList.add('is-visible')
    // The normal cursor hides only once the ball is actually on screen.
    root.classList.add('ball-cursor-on')
  }
  const hide = () => {
    if (!visible) return
    visible = false
    canvas.classList.remove('is-visible')
  }

  const onMove = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse') return
    targetX = event.clientX
    targetY = event.clientY
    if (!visible) {
      // Appear right under the pointer rather than gliding in from the last position.
      x = targetX
      y = targetY
      place()
      show()
    }
  }
  const onDown = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse' || reduce) return
    scene.spin(performance.now())
    needsRender = true
  }
  const onOut = (event: MouseEvent) => {
    if (!event.relatedTarget) hide()
  }
  // If the GPU drops the WebGL context, hand straight back to the normal cursor (never leave the
  // page without one); restore the ball if the context comes back.
  const onContextLost = (event: Event) => {
    event.preventDefault()
    lost = true
    hide()
    root.classList.remove('ball-cursor-on')
  }
  const onContextRestored = () => {
    lost = false
    needsRender = true
  }
  const onMediaChange = () => {
    if (fine.matches) return
    hide()
    root.classList.remove('ball-cursor-on')
  }
  // Re-render sharply when the window moves to a screen with a different pixel density.
  let densityQuery = window.matchMedia(`(resolution: ${pixelRatio()}dppx)`)
  const onDensityChange = () => {
    scene.resize(SIZE, pixelRatio())
    needsRender = true
    densityQuery.removeEventListener('change', onDensityChange)
    densityQuery = window.matchMedia(`(resolution: ${pixelRatio()}dppx)`)
    densityQuery.addEventListener('change', onDensityChange)
  }

  canvas.addEventListener('webglcontextlost', onContextLost)
  canvas.addEventListener('webglcontextrestored', onContextRestored)
  window.addEventListener('pointermove', onMove, { passive: true })
  window.addEventListener('pointerdown', onDown, { passive: true })
  document.addEventListener('mouseout', onOut)
  window.addEventListener('blur', hide)
  fine.addEventListener('change', onMediaChange)
  densityQuery.addEventListener('change', onDensityChange)

  const stopTick = addTick((now, delta) => {
    if (visible) {
      x = damp(x, targetX, FOLLOW, delta)
      y = damp(y, targetY, FOLLOW, delta)
      if (Math.abs(targetX - x) < 0.05) x = targetX
      if (Math.abs(targetY - y) < 0.05) y = targetY
      place()
    }
    if (needsRender && !lost) needsRender = scene.render(now)
  }, 50)

  return () => {
    stopTick()
    canvas.removeEventListener('webglcontextlost', onContextLost)
    canvas.removeEventListener('webglcontextrestored', onContextRestored)
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerdown', onDown)
    document.removeEventListener('mouseout', onOut)
    window.removeEventListener('blur', hide)
    fine.removeEventListener('change', onMediaChange)
    densityQuery.removeEventListener('change', onDensityChange)
    root.classList.remove('ball-cursor-on')
    canvas.classList.remove('is-visible')
    canvas.style.transform = ''
    scene.dispose()
  }
}
