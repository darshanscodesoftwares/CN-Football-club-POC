/**
 * One requestAnimationFrame loop for the whole site.
 * Subscribers run in priority order (lower first) so smooth scroll updates the scroll
 * position before anything that reads it paints in the same frame.
 */
export type TickHandler = (time: number, deltaMs: number) => void

interface Entry {
  fn: TickHandler
  priority: number
}

const entries: Entry[] = []
let rafId = 0
let lastTime = 0

function frame(time: number) {
  // Clamp long gaps (background tabs, breakpoints) so smoothing never jumps.
  const delta = lastTime ? Math.min(time - lastTime, 100) : 1000 / 60
  lastTime = time
  for (let i = 0; i < entries.length; i++) entries[i].fn(time, delta)
  rafId = requestAnimationFrame(frame)
}

export function addTick(fn: TickHandler, priority = 0): () => void {
  const entry: Entry = { fn, priority }
  entries.push(entry)
  entries.sort((a, b) => a.priority - b.priority)
  if (!rafId) {
    lastTime = 0
    rafId = requestAnimationFrame(frame)
  }
  return () => {
    const index = entries.indexOf(entry)
    if (index !== -1) entries.splice(index, 1)
    if (!entries.length && rafId) {
      cancelAnimationFrame(rafId)
      rafId = 0
    }
  }
}
