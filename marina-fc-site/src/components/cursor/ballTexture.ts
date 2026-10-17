/**
 * Paints the cursor ball's surface as an equirectangular map (2:1) for a three.js sphere: a
 * classic football in the club's colours. The panels are the real thing, a truncated icosahedron
 * (12 pentagons, 20 hexagons) blown up onto the sphere: every texel takes the colour of the flat
 * face its direction meets first, the way a ball's panels sit on its surface. Navy pentagons with
 * a thin lime edge, off-white hexagons, soft seams, and the club's hexagon logo
 * (components/logoArt.ts) filling the hexagon panel that faces the viewer.
 *
 * Mapping (three.js SphereGeometry): texture x = 25% faces the camera (+Z), x grows toward the
 * viewer's right, y = 0 is the north pole. Longitude 0 faces the viewer.
 */
import { LOGO_URL } from '../logoArt'

export const TEX_W = 1024
export const TEX_H = 512

const C = {
  hexagon: [246, 246, 243],
  pentagon: [11, 31, 58], // site navy
  edge: [198, 240, 47], // kit lime
  seam: [24, 36, 60],
} as const
/** Seam and lime-edge widths, as the gap between the nearest and second-nearest face (see below). */
const SEAM = 0.004
const SEAM_ALPHA = 0.45
const EDGE = 0.016
/** Angular height of the logo on the front panel (degrees); the hexagon panel is about 47° tall. */
const LOGO_DEG = 43

type V = readonly [number, number, number]

const PHI = (1 + Math.sqrt(5)) / 2
const unit = ([a, b, c]: V): V => {
  const l = Math.hypot(a, b, c)
  return [a / l, b / l, c / l]
}
const dot = (a: V, b: V) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const scale = (a: V, k: number): V => [a[0] * k, a[1] * k, a[2] * k]
const signs = (n: number) => Array.from({ length: 1 << n }, (_, i) => Array.from({ length: n }, (_, k) => (i >> k) & 1 ? -1 : 1))

/**
 * Pentagon centres: the icosahedron's vertices. Hexagon centres: its face centres. With these
 * coordinates (edge 2) the truncated icosahedron's pentagon faces lie PENTAGON_PLANE from the
 * centre and its hexagon faces (in the icosahedron's own face planes) HEXAGON_PLANE.
 */
const ICO_R = Math.sqrt(1 + PHI * PHI)
const PENTAGON_PLANE = ICO_R - (ICO_R - PHI / ICO_R) / 3
const HEXAGON_PLANE = (PHI * PHI) / Math.sqrt(3)

function panelCentres() {
  const pentagons: V[] = []
  for (const [s, t] of signs(2)) pentagons.push([0, s, t * PHI], [s, t * PHI, 0], [t * PHI, 0, s])
  const hexagons: V[] = []
  for (const [s, t, u] of signs(3)) hexagons.push([s, t, u])
  for (const [s, t] of signs(2)) hexagons.push([s / PHI, 0, t * PHI], [t * PHI, s / PHI, 0], [0, t * PHI, s / PHI])
  return { pentagons: pentagons.map(unit), hexagons: hexagons.map(unit) }
}

/** Rotation (row-major 3x3) taking unit vector a onto unit vector b. */
function rotationBetween(a: V, b: V): number[] {
  const v: V = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
  const c = dot(a, b)
  const k = 1 / (1 + c)
  return [
    1 - k * (v[1] ** 2 + v[2] ** 2), k * v[0] * v[1] - v[2], k * v[0] * v[2] + v[1],
    k * v[0] * v[1] + v[2], 1 - k * (v[0] ** 2 + v[2] ** 2), k * v[1] * v[2] - v[0],
    k * v[0] * v[2] - v[1], k * v[1] * v[2] + v[0], 1 - k * (v[0] ** 2 + v[1] ** 2),
  ]
}
const apply = (m: number[], [a, b, c]: V): V => [m[0] * a + m[1] * b + m[2] * c, m[3] * a + m[4] * b + m[5] * c, m[6] * a + m[7] * b + m[8] * c]

/**
 * The panel centres turned so a hexagon faces the viewer (+Z) with a corner at the top, like the
 * logo: its three pentagon neighbours then sit at 0°, 120° and 240° around it.
 */
function orientedCentres() {
  const { pentagons, hexagons } = panelCentres()
  const front = hexagons[8] // (1/φ, 0, φ)
  const toFront = rotationBetween(front, [0, 0, 1])
  const turned = pentagons.map((p) => apply(toFront, p))
  const neighbour = turned.reduce((best, p) => (p[2] > best[2] ? p : best))
  const roll = -Math.atan2(neighbour[1], neighbour[0])
  const cos = Math.cos(roll)
  const sin = Math.sin(roll)
  const spin = (p: V): V => [p[0] * cos - p[1] * sin, p[0] * sin + p[1] * cos, p[2]]
  return { pentagons: turned.map(spin), hexagons: hexagons.map((h) => spin(apply(toFront, h))) }
}

const smooth = (edge0: number, edge1: number, v: number) => {
  const t = Math.min(1, Math.max(0, (v - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

function paintPanels(data: Uint8ClampedArray) {
  const { pentagons, hexagons } = orientedCentres()
  // A face is met at distance plane / (direction . normal): the nearest face scores highest.
  const centres = [...pentagons.map((p) => scale(p, 1 / PENTAGON_PLANE)), ...hexagons.map((h) => scale(h, 1 / HEXAGON_PLANE))]
  const isPentagon = (i: number) => i < pentagons.length
  for (let row = 0; row < TEX_H; row++) {
    const lat = (0.5 - (row + 0.5) / TEX_H) * Math.PI
    const cosLat = Math.cos(lat)
    const sinLat = Math.sin(lat)
    for (let col = 0; col < TEX_W; col++) {
      const lon = ((col + 0.5) / TEX_W - 0.25) * 2 * Math.PI
      const d: V = [Math.sin(lon) * cosLat, sinLat, Math.cos(lon) * cosLat]
      let best = -2
      let second = -2
      let bestIndex = 0
      for (let i = 0; i < centres.length; i++) {
        const s = dot(d, centres[i])
        if (s > best) {
          second = best
          best = s
          bestIndex = i
        } else if (s > second) second = s
      }
      const gap = best - second
      let colour: readonly number[] = C.hexagon
      if (isPentagon(bestIndex)) {
        // navy, with a lime edge just inside the seam
        const lime = 1 - smooth(EDGE - 0.004, EDGE + 0.004, gap)
        colour = C.pentagon.map((v, k) => v + (C.edge[k] - v) * lime)
      }
      const seam = (1 - smooth(SEAM - 0.003, SEAM + 0.003, gap)) * SEAM_ALPHA
      const o = (row * TEX_W + col) * 4
      for (let k = 0; k < 3; k++) data[o + k] = colour[k] + (C.seam[k] - colour[k]) * seam
      data[o + 3] = 255
    }
  }
}

function loadImage(src: string) {
  const img = new Image()
  img.decoding = 'async'
  img.src = src
  return img.decode().then(() => img)
}

/** Draws the logo onto the front hexagon panel, each row widened for its latitude. */
async function paintLogo(ctx: CanvasRenderingContext2D) {
  const img = await loadImage(LOGO_URL)
  const h = Math.round((LOGO_DEG / 180) * TEX_H)
  const w = Math.round((h * img.naturalWidth) / img.naturalHeight)
  const src = document.createElement('canvas')
  src.width = w
  src.height = h
  src.getContext('2d')?.drawImage(img, 0, 0, w, h)
  const cx = 0.25 * TEX_W
  const top = Math.round(TEX_H / 2 - h / 2)
  for (let r = 0; r < h; r++) {
    const ty = top + r
    const rowLat = (0.5 - (ty + 0.5) / TEX_H) * Math.PI
    // a degree of longitude spans 1/cos(lat) times more texels away from the equator
    const rowW = w / Math.max(0.25, Math.cos(rowLat))
    ctx.drawImage(src, 0, r, w, 1, cx - rowW / 2, ty, rowW, 1)
  }
}

export async function paintBallTexture(): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas')
  canvas.width = TEX_W
  canvas.height = TEX_H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2D canvas unavailable')
  const image = ctx.createImageData(TEX_W, TEX_H)
  paintPanels(image.data)
  ctx.putImageData(image, 0, 0)
  await paintLogo(ctx)
  return canvas
}
