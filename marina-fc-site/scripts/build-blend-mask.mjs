#!/usr/bin/env node
/**
 * Builds an alpha mask that marks only the plain white BACKGROUND of a supplied image, so the
 * page can lay its own paper colour over that background without touching the photo itself.
 * The source image is only read, never modified.
 *
 * The background is found by flood-filling from the chosen edges through neutral, near-white
 * pixels (bright, and with almost no colour). Anything with colour or detail - the photo, its
 * sunset, sea sparkle or shirt highlights that are not connected that way - stays out of the mask.
 *
 * Usage:
 *   node scripts/build-blend-mask.mjs --input <image> --output <mask.png>
 *     [--min 236] [--neutral 14] [--seed top,left] [--preview <preview.png>]
 */
import { spawn } from 'node:child_process'
import ffmpegPath from 'ffmpeg-static'

function parseArgs(argv) {
  const args = { min: 236, neutral: 14, seed: ['top', 'left'] }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    const next = () => argv[++i]
    if (a === '--input') args.input = next()
    else if (a === '--output') args.output = next()
    else if (a === '--preview') args.preview = next()
    else if (a === '--min') args.min = Number(next())
    else if (a === '--neutral') args.neutral = Number(next())
    else if (a === '--seed') args.seed = next().split(',')
    else throw new Error(`Unknown argument: ${a}`)
  }
  if (!args.input || !args.output) throw new Error('Usage: --input <image> --output <mask.png>')
  return args
}

function ffmpeg(args, input) {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpegPath, args, { stdio: ['pipe', 'pipe', 'pipe'] })
    const out = []
    let err = ''
    child.stdout.on('data', (d) => out.push(d))
    child.stderr.on('data', (d) => (err += d))
    child.on('error', reject)
    child.on('close', (code) => (code === 0 ? resolve({ data: Buffer.concat(out), err }) : reject(new Error(err.slice(-1500)))))
    if (input) child.stdin.end(input)
    else child.stdin.end()
  })
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const probe = await ffmpeg(['-hide_banner', '-i', args.input, '-f', 'null', '-']).catch((e) => ({ err: e.message }))
  const size = probe.err.match(/, (\d{2,5})x(\d{2,5})[, ]/)
  if (!size) throw new Error('Could not read image size')
  const [w, h] = [Number(size[1]), Number(size[2])]
  const { data: rgba } = await ffmpeg(['-hide_banner', '-loglevel', 'error', '-i', args.input, '-f', 'rawvideo', '-pix_fmt', 'rgba', '-'])

  const isBackground = (i) => {
    const r = rgba[i * 4]
    const g = rgba[i * 4 + 1]
    const b = rgba[i * 4 + 2]
    const lo = Math.min(r, g, b)
    return lo >= args.min && Math.max(r, g, b) - lo <= args.neutral
  }

  const mask = new Uint8Array(w * h)
  const queue = new Int32Array(w * h)
  let head = 0
  let tail = 0
  const push = (x, y) => {
    const i = y * w + x
    if (mask[i] || !isBackground(i)) return
    mask[i] = 1
    queue[tail++] = i
  }
  for (const edge of args.seed) {
    if (edge === 'top') for (let x = 0; x < w; x++) push(x, 0)
    if (edge === 'bottom') for (let x = 0; x < w; x++) push(x, h - 1)
    if (edge === 'left') for (let y = 0; y < h; y++) push(0, y)
    if (edge === 'right') for (let y = 0; y < h; y++) push(w - 1, y)
  }
  while (head < tail) {
    const i = queue[head++]
    const x = i % w
    const y = (i - x) / w
    if (x > 0) push(x - 1, y)
    if (x < w - 1) push(x + 1, y)
    if (y > 0) push(x, y - 1)
    if (y < h - 1) push(x, y + 1)
  }

  // Alpha mask: opaque where the background is, transparent over the photo.
  const out = Buffer.alloc(w * h * 4)
  let count = 0
  for (let i = 0; i < w * h; i++) {
    out[i * 4 + 3] = mask[i] ? 255 : 0
    count += mask[i]
  }
  await ffmpeg(['-hide_banner', '-loglevel', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${w}x${h}`, '-i', '-', '-compression_level', '9', args.output], out)
  console.log(`Mask ${w}x${h}: background ${((count / (w * h)) * 100).toFixed(1)}% -> ${args.output}`)

  if (args.preview) {
    // Background tinted red over the image, to check nothing in the photo is included.
    const pv = Buffer.alloc(w * h * 3)
    for (let i = 0; i < w * h; i++) {
      const [r, g, b] = [rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2]]
      pv[i * 3] = mask[i] ? 255 : r
      pv[i * 3 + 1] = mask[i] ? Math.round(g * 0.45) : g
      pv[i * 3 + 2] = mask[i] ? Math.round(b * 0.45) : b
    }
    await ffmpeg(['-hide_banner', '-loglevel', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', `${w}x${h}`, '-i', '-', args.preview], pv)
  }
}

main().catch((err) => {
  console.error(err.message ?? err)
  process.exit(1)
})
