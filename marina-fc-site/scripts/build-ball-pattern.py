#!/usr/bin/env python3
"""
Writes public/media/pattern/football-web.svg: the faint football-panel pattern behind the whole
page, like a ball's seams painted across a wall.

It is a honeycomb of panel seams, gently warped so the lines curve like a web. One cell in three
is faintly shaded (the ball's dark panels): that arrangement is the football's own, where every
light panel touches three dark ones and no two dark ones touch. Cells, shading and the warp all
repeat with the tile, so it tiles seamlessly. Strength is set by INK_LINE / INK_FILL.
Run from the project root: python3 scripts/build-ball-pattern.py
"""
import math, os

COL_W = 84          # px between cell centres along a row
ROW_H = 72          # px between rows (rows are offset by half a cell)
COLS, ROWS = 12, 12  # tile size in cells; both multiples of 6 so the shading repeats too
INK = '#0b1f3a'
INK_LINE = 0.03     # seam opacity
INK_FILL = 0.008    # dark-panel opacity
STROKE = 1          # px
WARP = 12           # px: how far the seams bend
W, H = COLS * COL_W, ROWS * ROW_H
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'public', 'media', 'pattern', 'football-web.svg')


def warp(x, y):
    """Smooth, tile-periodic bend, so the honeycomb reads as a hand-painted web."""
    tx, ty = 2 * math.pi * x / W, 2 * math.pi * y / H
    dx = WARP * (math.sin(ty * 2 + 0.7) * 0.6 + math.sin(tx + ty + 1.9) * 0.4)
    dy = WARP * (math.sin(tx * 2 + 0.3) * 0.6 + math.cos(tx - ty * 2 + 0.4) * 0.4)
    return x + dx, y + dy


def corners(cx, cy):
    """Pointy-topped hexagon corners for a cell centred at (cx, cy)."""
    half, r = COL_W / 2, ROW_H * 2 / 3
    return [(cx, cy - r), (cx + half, cy - r / 2), (cx + half, cy + r / 2),
            (cx, cy + r), (cx - half, cy + r / 2), (cx - half, cy - r / 2)]


def fmt(p):
    return f'{p[0]:.1f},{p[1]:.1f}'


def main():
    edges, shaded = set(), []
    for row in range(-1, ROWS + 1):
        for col in range(-1, COLS + 1):
            cx = col * COL_W + (COL_W / 2 if row % 2 else 0)
            cy = row * ROW_H
            pts = [warp(x, y) for x, y in corners(cx, cy)]
            for a, b in zip(pts, pts[1:] + pts[:1]):
                key = tuple(sorted((fmt(a), fmt(b))))
                edges.add(key)
            # axial coordinates of an odd-row-offset grid; (q - r) % 3 == 0 picks one cell in three
            q = col - (row - (row & 1)) // 2
            if (q - row) % 3 == 0:
                shaded.append(pts)
    seams = ' '.join(f'M{a}L{b}' for a, b in sorted(edges))
    panels = ' '.join('M' + 'L'.join(fmt(p) for p in pts) + 'Z' for pts in shaded)
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">\n'
           f'<path d="{panels}" fill="{INK}" fill-opacity="{INK_FILL}"/>\n'
           f'<path d="{seams}" fill="none" stroke="{INK}" stroke-opacity="{INK_LINE}" stroke-width="{STROKE}" stroke-linecap="round"/>\n'
           '</svg>\n')
    with open(OUT, 'w') as f:
        f.write(svg)
    print(f'{W}x{H} tile, {len(edges)} seams, {len(shaded)} dark panels -> {os.path.relpath(OUT)}')


if __name__ == '__main__':
    main()
