export interface FrameSet {
  path: string
  width: number
  height: number
  count: number
}

/**
 * Load order: a few frames around where the reader already is, both ends, then
 * coarse-to-fine (every 128th, 64th, ... frame). Scrubbing works almost at once with
 * the nearest loaded frame and sharpens as the gaps fill in.
 */
function progressiveOrder(count: number, start: number): number[] {
  const order: number[] = []
  const seen = new Uint8Array(count)
  const push = (i: number) => {
    if (i >= 0 && i < count && !seen[i]) {
      seen[i] = 1
      order.push(i)
    }
  }
  for (let d = 0; d <= 4; d++) {
    push(start + d)
    push(start - d)
  }
  push(0)
  push(count - 1)
  for (let step = 1 << Math.floor(Math.log2(Math.max(1, count))); step >= 1; step >>= 1) {
    for (let i = 0; i < count; i += step) push(i)
  }
  return order
}

/** Per-frame load state. */
const QUEUED = 0
const LOADING = 1
const READY = 2
const FAILED = 3

export class FrameSequence {
  readonly count: number
  private readonly set: FrameSet
  private readonly version: string
  private readonly frames: Array<HTMLImageElement | undefined>
  private readonly state: Uint8Array
  private readonly listeners = new Set<(index: number) => void>()
  private queue: number[] = []
  private started = false
  private failed = 0
  loaded = 0

  constructor(set: FrameSet, version: string) {
    this.set = set
    this.version = version
    this.count = set.count
    this.frames = new Array(set.count)
    this.state = new Uint8Array(set.count)
  }

  url(index: number) {
    return `${this.set.path}/${String(index).padStart(4, '0')}.webp?v=${this.version}`
  }

  /** True once every frame has either loaded or failed. */
  get complete() {
    return this.loaded + this.failed >= this.count
  }

  /** Called after each frame finishes decoding. Returns an unsubscribe function. */
  subscribe(listener: (index: number) => void) {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  /** Starts loading around `startIndex`; if already loading, moves those frames to the front instead. */
  start(startIndex = 0, concurrency = 6) {
    if (this.started) {
      this.prioritize(startIndex)
      return
    }
    this.started = true
    this.queue = progressiveOrder(this.count, Math.round(startIndex))
    for (let i = 0; i < concurrency; i++) void this.worker()
  }

  /** Moves the not-yet-loaded frames around `index` to the front of the queue. */
  prioritize(index: number, radius = 6) {
    const center = Math.round(index)
    const near: number[] = []
    for (let d = 0; d <= radius; d++) {
      for (const i of d ? [center + d, center - d] : [center]) {
        if (i >= 0 && i < this.count && this.state[i] === QUEUED) near.push(i)
      }
    }
    if (!near.length) return
    const first = new Set(near)
    this.queue = [...near, ...this.queue.filter((i) => !first.has(i))]
  }

  private async worker() {
    while (this.queue.length) {
      const index = this.queue.shift() as number
      if (this.state[index] !== QUEUED) continue
      this.state[index] = LOADING
      const img = new Image()
      img.decoding = 'async'
      img.src = this.url(index)
      try {
        // decode() resolves once the bitmap can be painted without a main-thread decode.
        await img.decode()
      } catch {
        this.state[index] = FAILED
        this.failed++
        continue
      }
      this.frames[index] = img
      this.state[index] = READY
      this.loaded++
      this.listeners.forEach((listener) => listener(index))
    }
  }

  has(index: number) {
    return this.state[index] === READY
  }

  get(index: number) {
    return this.frames[index]
  }

  /** The closest decoded frame to `index`, preferring earlier frames on ties, or -1. */
  nearestIndex(index: number): number {
    if (this.state[index] === READY) return index
    for (let d = 1; d < this.count; d++) {
      if (index - d >= 0 && this.state[index - d] === READY) return index - d
      if (index + d < this.count && this.state[index + d] === READY) return index + d
    }
    return -1
  }
}

const cache = new Map<string, FrameSequence>()

/**
 * One sequence per frame set for the lifetime of the page, so React StrictMode remounts
 * and route changes never download the frames twice.
 */
export function getFrameSequence(set: FrameSet, version: string) {
  const key = `${set.path}?v=${version}`
  let sequence = cache.get(key)
  if (!sequence) {
    sequence = new FrameSequence(set, version)
    cache.set(key, sequence)
  }
  return sequence
}

/** Paints images into a canvas with CSS `object-fit: cover` semantics. */
export class CoverCanvas {
  private readonly canvas: HTMLCanvasElement
  private readonly ctx: CanvasRenderingContext2D
  width = 0
  height = 0

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    // alpha: false lets the compositor skip blending the canvas with what is behind it.
    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) throw new Error('Canvas 2D context unavailable')
    this.ctx = ctx
  }

  /** Returns true when the backing store changed size (and therefore was cleared). */
  resize(cssWidth: number, cssHeight: number, pixelRatio: number): boolean {
    const width = Math.max(1, Math.round(cssWidth * pixelRatio))
    const height = Math.max(1, Math.round(cssHeight * pixelRatio))
    // Always sync: a second wrapper around the same canvas (React StrictMode remount) starts at 0.
    this.width = width
    this.height = height
    this.ctx.imageSmoothingEnabled = true
    this.ctx.imageSmoothingQuality = 'high'
    if (width === this.canvas.width && height === this.canvas.height) return false
    this.canvas.width = width
    this.canvas.height = height
    // Resizing resets context state.
    this.ctx.imageSmoothingEnabled = true
    this.ctx.imageSmoothingQuality = 'high'
    return true
  }

  /** Draws one image cover-fitted at `alpha`. Returns false if nothing could be drawn. */
  drawLayer(image: HTMLImageElement, alpha: number, focusX = 0.5, focusY = 0.5): boolean {
    const { ctx, width, height } = this
    const iw = image.naturalWidth
    const ih = image.naturalHeight
    if (!iw || !ih || !width || !height) return false
    const scale = Math.max(width / iw, height / ih)
    const dw = iw * scale
    const dh = ih * scale
    ctx.globalAlpha = alpha
    ctx.drawImage(image, (width - dw) * focusX, (height - dh) * focusY, dw, dh)
    ctx.globalAlpha = 1
    return true
  }
}
