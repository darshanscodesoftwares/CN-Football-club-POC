/**
 * Paints the cursor ball's surface as an equirectangular map (2:1) for a three.js sphere, in the
 * style of the 2026 World Cup ball the client referenced: white, with red, blue and green swirl
 * panels and maroon/navy pinstripes. The Marina FC crest sits on the blue panel where that ball
 * carries its tournament emblem, and the club name sits on the green panel. No third-party marks
 * (FIFA, adidas, ball name) are reproduced.
 *
 * Mapping (three.js SphereGeometry): texture x = 25% faces the camera (+Z), x grows toward the
 * viewer's right, y = 0 is the north pole. Positions below are written as [longitude, latitude]
 * in degrees, with longitude 0 facing the viewer.
 */
import { CREST_SVG } from './crestArt'

export const TEX_W = 1024
export const TEX_H = 512
/** Sizes below are authored for a 2048-wide map. */
const K = TEX_W / 2048

const C = {
  white: '#f6f6f3',
  seam: 'rgba(24, 36, 60, 0.13)',
  blue: '#20a2dc',
  blueSwoosh: '#2a95dd',
  bluePattern: '#0a479c',
  blueLight: '#6ccaf2',
  red: '#d72d38',
  redPattern: '#a81d29',
  green: '#38b676',
  greenPattern: '#1f7d48',
  greenDark: '#0f4a2e',
  maroon: '#6b2028',
  navy: '#2a4f9f',
} as const

type Pt = readonly [lon: number, lat: number]
type Curve = readonly [c1: Pt, c2: Pt, end: Pt]

const x = (lon: number) => (0.25 + lon / 360) * TEX_W
const y = (lat: number) => (0.5 - lat / 180) * TEX_H
const rad = (deg: number) => (deg * Math.PI) / 180
/** Horizontal stretch at a latitude, so shapes read at their true width on the sphere. */
const stretch = (lat: number) => 1 / Math.max(0.25, Math.cos(rad(lat)))

function bezierPath(start: Pt, curves: readonly Curve[], close = true) {
  const p = new Path2D()
  p.moveTo(x(start[0]), y(start[1]))
  for (const [c1, c2, end] of curves) p.bezierCurveTo(x(c1[0]), y(c1[1]), x(c2[0]), y(c2[1]), x(end[0]), y(end[1]))
  if (close) p.closePath()
  return p
}

function starPath(r: number, inner = 0.42) {
  const p = new Path2D()
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    const rr = i % 2 ? r * inner : r
    if (i) p.lineTo(Math.cos(a) * rr, Math.sin(a) * rr)
    else p.moveTo(Math.cos(a) * rr, Math.sin(a) * rr)
  }
  p.closePath()
  return p
}

/** A simple maple-style leaf, unit size, pointing up. */
function leafPath(r: number) {
  const half: Array<[number, number]> = [
    [0, -1], [0.16, -0.58], [0.44, -0.74], [0.36, -0.3], [0.86, -0.4], [0.62, 0.02], [0.78, 0.2], [0.22, 0.2], [0.14, 0.62],
  ]
  const pts = [...half, [0.05, 0.62], [0.05, 0.95], [-0.05, 0.95], [-0.05, 0.62], ...half.slice(1).reverse().map(([a, b]) => [-a, b] as [number, number])]
  const p = new Path2D()
  pts.forEach(([a, b], i) => (i ? p.lineTo(a * r, b * r) : p.moveTo(a * r, b * r)))
  p.closePath()
  return p
}

/** Runs `draw` with the origin at [lon, lat], stretched so the drawing keeps its proportions on the sphere. */
function at(ctx: CanvasRenderingContext2D, [lon, lat]: Pt, rotate: number, draw: () => void) {
  ctx.save()
  ctx.translate(x(lon), y(lat))
  ctx.scale(stretch(lat), 1)
  ctx.rotate(rotate)
  draw()
  ctx.restore()
}

function fillPanel(ctx: CanvasRenderingContext2D, path: Path2D, color: string, pattern: () => void) {
  ctx.save()
  ctx.fillStyle = color
  ctx.fill(path)
  ctx.clip(path)
  pattern()
  ctx.restore()
}

function strokeCurve(ctx: CanvasRenderingContext2D, start: Pt, curves: readonly Curve[], color: string, width: number) {
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = width * K
  ctx.lineCap = 'round'
  ctx.stroke(bezierPath(start, curves, false))
  ctx.restore()
}

/** Angular zig-zag lines like the reference's blue-panel graphics. */
function zigzags(ctx: CanvasRenderingContext2D, lon0: number, lon1: number, lat0: number, lat1: number, rows: number, color: string, width: number) {
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = width * K
  ctx.lineJoin = 'miter'
  const step = 34 * K
  for (let i = 0; i < rows; i++) {
    const lat = lat0 + ((lat1 - lat0) * (i + 0.5)) / rows
    const yy = y(lat)
    const amp = (10 + (i % 3) * 4) * K
    ctx.beginPath()
    let up = i % 2 === 0
    for (let xx = x(lon0) - step; xx <= x(lon1) + step; xx += step) {
      ctx.lineTo(xx, yy + (up ? -amp : amp))
      up = !up
    }
    ctx.stroke()
  }
  ctx.restore()
}

function paintPanels(ctx: CanvasRenderingContext2D) {
  // ------------------------------------------------------------ front
  // Red panel, left of the front, with maple-leaf graphics.
  const red = bezierPath([-108, 48], [
    [[-92, 64], [-58, 62], [-45, 45]],
    [[-35, 30], [-36, 4], [-43, -16]],
    [[-50, -35], [-76, -45], [-100, -38]],
    [[-114, -22], [-116, 28], [-108, 48]],
  ])
  fillPanel(ctx, red, C.red, () => {
    ctx.fillStyle = C.redPattern
    for (const [pt, r, rot] of [[[-80, 30], 40, -0.3], [[-60, 4], 34, 0.25], [[-94, -10], 30, -0.1], [[-56, 38], 22, 0.4], [[-76, -28], 26, 0.2], [[-100, 30], 20, 0.5]] as const) {
      at(ctx, pt, rot, () => ctx.fill(leafPath(r * K)))
    }
  })

  // Blue front panel: the crest sits on it.
  const bx0 = x(-31)
  const bx1 = x(25)
  const by0 = y(47)
  const by1 = y(-45)
  const blue = new Path2D()
  blue.roundRect(bx0, by0, bx1 - bx0, by1 - by0, 78 * K)
  fillPanel(ctx, blue, C.blue, () => {
    ctx.globalAlpha = 0.8
    zigzags(ctx, -31, 25, 44, -42, 7, C.bluePattern, 5)
    ctx.globalAlpha = 1
    ctx.strokeStyle = C.bluePattern
    ctx.lineWidth = 5 * K
    for (const [pt, r] of [[[-21, 35], 26], [[16, -33], 24], [[17, 35], 16], [[-23, -34], 18]] as const) {
      at(ctx, pt, 0.2, () => ctx.stroke(starPath(r * K)))
    }
  })

  // Big blue swoosh sweeping over the top-right.
  const swoosh = bezierPath([14, 84], [
    [[52, 80], [80, 56], [86, 24]],
    [[92, -4], [86, -32], [72, -50]],
    [[64, -48], [58, -44], [52, -40]],
    [[60, -18], [60, 10], [52, 30]],
    [[44, 50], [32, 62], [10, 70]],
  ])
  fillPanel(ctx, swoosh, C.blueSwoosh, () => {
    ctx.fillStyle = C.bluePattern
    ctx.strokeStyle = C.bluePattern
    ctx.lineWidth = 5 * K
    for (const [pt, r, fill] of [[[68, 22], 32, true], [[72, -14], 26, false], [[44, 60], 22, false], [[78, 42], 18, true], [[62, -34], 16, true]] as const) {
      at(ctx, pt, 0.3, () => (fill ? ctx.fill(starPath(r * K)) : ctx.stroke(starPath(r * K))))
    }
    ctx.globalAlpha = 0.55
    zigzags(ctx, 30, 96, 74, -46, 7, C.blueLight, 4)
    ctx.globalAlpha = 1
  })

  // Green panel along the bottom: carries the club name.
  const green = bezierPath([-62, -50], [
    [[-36, -40], [26, -39], [56, -51]],
    [[60, -68], [60, -84], [58, -90]],
    [[14, -90], [-34, -90], [-64, -90]],
    [[-65, -78], [-64, -62], [-62, -50]],
  ])
  fillPanel(ctx, green, C.green, () => {
    ctx.strokeStyle = C.greenPattern
    ctx.lineWidth = 7 * K
    for (let i = 0; i < 6; i++) {
      strokeCurve(ctx, [-70, -46 - i * 8], [[[-24, -36 - i * 8], [24, -56 - i * 8], [70, -46 - i * 8]]], C.greenPattern, 6)
    }
  })

  // Pinstripes: maroon over the top and down the right, navy along the swoosh, thin greens by the red.
  strokeCurve(ctx, [-88, 4], [
    [[-76, 46], [-44, 68], [-10, 66]],
    [[18, 64], [32, 54], [36, 34]],
    [[40, 12], [42, -14], [38, -36]],
    [[34, -54], [24, -64], [10, -70]],
  ], C.maroon, 13)
  strokeCurve(ctx, [-24, 88], [
    [[14, 90], [58, 82], [84, 58]],
    [[98, 42], [102, 18], [100, -6]],
  ], C.navy, 9)
  strokeCurve(ctx, [50, -46], [[[58, -58], [70, -66], [88, -70]]], C.navy, 9)
  strokeCurve(ctx, [-56, 76], [[[-62, 60], [-70, 44], [-80, 26]]], C.greenDark, 8)
  strokeCurve(ctx, [-50, 76], [[[-56, 60], [-63, 44], [-72, 26]]], C.green, 4)

  // ------------------------------------------------------------- back
  const red2 = bezierPath([142, 58], [
    [[160, 66], [196, 62], [208, 44]],
    [[214, 26], [210, 4], [200, -8]],
    [[184, -2], [160, 6], [146, 20]],
    [[136, 32], [134, 48], [142, 58]],
  ])
  fillPanel(ctx, red2, C.red, () => {
    ctx.fillStyle = C.redPattern
    for (const [pt, r, rot] of [[[170, 40], 28, 0.2], [[196, 20], 22, -0.3], [[154, 30], 16, 0.5]] as const) {
      at(ctx, pt, rot, () => ctx.fill(leafPath(r * K)))
    }
  })
  const swoosh2 = bezierPath([196, -70], [
    [[226, -64], [252, -40], [258, -10]],
    [[262, 12], [252, 34], [238, 48]],
    [[232, 44], [228, 40], [224, 36]],
    [[236, 16], [238, -8], [228, -30]],
    [[220, -48], [208, -58], [190, -62]],
  ])
  fillPanel(ctx, swoosh2, C.blueSwoosh, () => {
    ctx.fillStyle = C.bluePattern
    ctx.strokeStyle = C.bluePattern
    ctx.lineWidth = 5 * K
    for (const [pt, r, fill] of [[[246, -8], 28, true], [[236, -40], 20, false], [[244, 24], 18, false]] as const) {
      at(ctx, pt, -0.2, () => (fill ? ctx.fill(starPath(r * K)) : ctx.stroke(starPath(r * K))))
    }
  })
  const green2 = bezierPath([98, -18], [
    [[112, -10], [136, -14], [150, -26]],
    [[160, -36], [158, -54], [148, -64]],
    [[130, -66], [108, -58], [98, -46]],
    [[92, -38], [92, -26], [98, -18]],
  ])
  fillPanel(ctx, green2, C.green, () => {
    for (let i = 0; i < 4; i++) strokeCurve(ctx, [94, -22 - i * 11], [[[118, -14 - i * 11], [138, -30 - i * 11], [158, -26 - i * 11]]], C.greenPattern, 6)
  })
  strokeCurve(ctx, [94, -6], [
    [[120, 18], [150, 74], [196, 72]],
    [[226, 70], [250, 58], [262, 40]],
  ], C.maroon, 13)
  strokeCurve(ctx, [116, -70], [
    [[150, -80], [200, -82], [232, -70]],
  ], C.navy, 9)
}

function paintSeams(ctx: CanvasRenderingContext2D) {
  for (const start of [-36, 54, 144, 234]) {
    strokeCurve(ctx, [start + 4, 88], [
      [[start + 22, 50], [start - 18, 18], [start, -10]],
      [[start + 18, -38], [start - 14, -62], [start + 2, -88]],
    ], C.seam, 3)
  }
  strokeCurve(ctx, [-180, -8], [[[-120, 8], [-60, -24], [0, -6]], [[60, 12], [120, -20], [180, -8]]], C.seam, 3)
}

function loadImage(src: string) {
  const img = new Image()
  img.decoding = 'async'
  img.src = src
  return img.decode().then(() => img)
}

/** The crest, sized for the blue panel. */
async function renderCrest() {
  const h = Math.round(0.34 * TEX_H)
  const w = Math.round(h * 0.6)
  const img = await loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(CREST_SVG)}`)
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  c.getContext('2d')?.drawImage(img, 0, 0, w, h)
  return c
}

/** "MARINA FC" in white for the green panel. */
async function renderName() {
  const size = Math.round(40 * K)
  const font = `800 ${size}px "Sora Variable", "Inter Tight Variable", system-ui, sans-serif`
  try {
    await document.fonts.load(font)
  } catch {
    // fall back to the system face
  }
  const probe = document.createElement('canvas').getContext('2d')
  if (!probe) throw new Error('2D canvas unavailable')
  probe.font = font
  const label = 'MARINA FC'
  const spacing = size * 0.08
  const width = Math.ceil(probe.measureText(label).width + spacing * label.length + size)
  const c = document.createElement('canvas')
  c.width = width
  c.height = Math.round(size * 1.5)
  const ctx = c.getContext('2d')
  if (!ctx) throw new Error('2D canvas unavailable')
  ctx.font = font
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#ffffff'
  ctx.strokeStyle = C.greenDark
  ctx.lineWidth = Math.max(1, size * 0.08)
  let cx = size / 2
  for (const ch of label) {
    ctx.strokeText(ch, cx, c.height / 2)
    ctx.fillText(ch, cx, c.height / 2)
    cx += ctx.measureText(ch).width + spacing
  }
  return c
}

/** Copies `src` onto the map centred at [lon, lat], stretching each row so it reads undistorted. */
function warpOnto(ctx: CanvasRenderingContext2D, src: HTMLCanvasElement, [lon, lat]: Pt) {
  const cx = x(lon)
  const top = Math.round(y(lat) - src.height / 2)
  for (let r = 0; r < src.height; r++) {
    const ty = top + r
    const rowLat = (0.5 - (ty + 0.5) / TEX_H) * 180
    const w = src.width * stretch(rowLat)
    ctx.drawImage(src, 0, r, src.width, 1, cx - w / 2, ty, w, 1)
  }
}

export async function paintBallTexture(): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas')
  canvas.width = TEX_W
  canvas.height = TEX_H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2D canvas unavailable')
  ctx.fillStyle = C.white
  ctx.fillRect(0, 0, TEX_W, TEX_H)
  // Panels are drawn three times, shifted by a full turn, so shapes crossing the map's edge wrap.
  for (const shift of [-TEX_W, 0, TEX_W]) {
    ctx.save()
    ctx.translate(shift, 0)
    paintPanels(ctx)
    ctx.restore()
  }
  const [crest, name] = await Promise.all([renderCrest(), renderName()])
  warpOnto(ctx, crest, [-3, 1])
  warpOnto(ctx, name, [-3, -60])
  for (const shift of [-TEX_W, 0, TEX_W]) {
    ctx.save()
    ctx.translate(shift, 0)
    paintSeams(ctx)
    ctx.restore()
  }
  return canvas
}
