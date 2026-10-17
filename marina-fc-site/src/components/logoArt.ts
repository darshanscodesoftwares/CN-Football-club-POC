/**
 * The club logo, one source for every place it appears: the hero and footer (ClubCrest), the
 * cursor ball's texture (cursor/ballTexture.ts) and, copied by hand, public/favicon.svg.
 *
 * A navy hexagon (a football panel's shape) with a lime inner ring, and at its centre a white
 * pentagon panel with its five seams: a football reduced to a badge. Generic on purpose, so it
 * suits any club until the client supplies their own; swap the markup below to change it.
 */
const NAVY = '#0b1f3a'
const LIME = '#c6f02f'
const W = 48
const H = 52
const CX = W / 2
const CY = H / 2

/** Points of a regular polygon around the centre; the first vertex points straight up. */
function polygon(sides: number, radius: number) {
  return Array.from({ length: sides }, (_, i) => {
    const a = ((-90 + (360 / sides) * i) * Math.PI) / 180
    return [CX + radius * Math.cos(a), CY + radius * Math.sin(a)] as const
  })
}

const pts = (points: readonly (readonly [number, number])[]) => points.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ')

const panel = polygon(5, 7.2)
const seamEnds = polygon(5, 15.5)
const seams = panel.map(([x, y], i) => `M${x.toFixed(2)} ${y.toFixed(2)}L${seamEnds[i][0].toFixed(2)} ${seamEnds[i][1].toFixed(2)}`).join('')

export const LOGO_WIDTH = W
export const LOGO_HEIGHT = H

/** Standalone SVG document (also what public/favicon.svg holds). */
export const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W * 10}" height="${H * 10}">
<polygon points="${pts(polygon(6, 23.4))}" fill="${NAVY}" stroke="${NAVY}" stroke-width="2.4" stroke-linejoin="round"/>
<polygon points="${pts(polygon(6, 19.6))}" fill="none" stroke="${LIME}" stroke-width="1.5" stroke-linejoin="round"/>
<path d="${seams}" stroke="#ffffff" stroke-opacity="0.85" stroke-width="1.6" stroke-linecap="round"/>
<polygon points="${pts(panel)}" fill="#ffffff" stroke="#ffffff" stroke-width="1" stroke-linejoin="round"/>
</svg>`

/** The logo as an image URL, for <img> and canvas drawing. */
export const LOGO_URL = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(LOGO_SVG)}`
