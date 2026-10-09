export const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value))

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/** Where `value` sits between a and b, unclamped (0 at a, 1 at b). */
export const invLerp = (a: number, b: number, value: number) => (a === b ? 0 : (value - a) / (b - a))

/** Same as invLerp, clamped to 0–1. */
export const progressIn = (a: number, b: number, value: number) => clamp(invLerp(a, b, value))

export const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = progressIn(edge0, edge1, x)
  return t * t * (3 - 2 * t)
}

/**
 * Frame-rate independent exponential smoothing.
 * `lambda` is roughly 1 / time-constant in seconds, so 20 settles in about 150 ms at any refresh rate.
 */
export const damp = (current: number, target: number, lambda: number, deltaMs: number) =>
  lerp(current, target, 1 - Math.exp(-lambda * (deltaMs / 1000)))

/** Piecewise-linear interpolation through [x, y] stops sorted by x. */
export function piecewise(stops: ReadonlyArray<readonly [number, number]>, x: number): number {
  if (x <= stops[0][0]) return stops[0][1]
  for (let i = 1; i < stops.length; i++) {
    const [x1, y1] = stops[i]
    if (x <= x1) {
      const [x0, y0] = stops[i - 1]
      return lerp(y0, y1, invLerp(x0, x1, x))
    }
  }
  return stops[stops.length - 1][1]
}
