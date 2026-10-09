#!/usr/bin/env node
/**
 * Turns a video into the image sequences that the scroll-scrubbed hero draws on <canvas>.
 *
 * Why frames instead of <video>.currentTime: generated videos ship with very few keyframes
 * (the Gemini clip has 6 in 240 frames), so every seek has to decode a long run of
 * B/P-frames and scrubbing stutters. Pre-decoded stills can be painted synchronously
 * inside the same animation frame as the scroll update, in every browser.
 *
 * Usage:
 *   node scripts/build-hero-frames.mjs --input "<video.mp4>" --id <name> [--mirror] [--focus 0.44] [--fps 30]
 *     [--quality 80] [--max-width 1920] [--mobile-aspect 0.75]
 *
 * Output (one folder per video, so several can coexist):
 *   public/media/hero/<id>/desktop/0000.webp ...  full frames (capped by --max-width)
 *   public/media/hero/<id>/mobile/0000.webp  ...  portrait crops for narrow screens
 *   public/media/hero/<id>/poster.webp            first frame at high quality
 *   src/sections/hero/videos/<id>.frames.json     manifest consumed by the app
 */
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, readdir, rm, stat, writeFile, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ffmpegPath from 'ffmpeg-static'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function parseArgs(argv) {
  const args = { id: '', mirror: false, focus: 0.5, quality: 80, maxWidth: 1920, mobileAspect: 0.75, mobileWidth: 0, fps: 0 }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    const next = () => argv[++i]
    if (a === '--input') args.input = next()
    else if (a === '--id') args.id = next()
    else if (a === '--mirror') args.mirror = true
    else if (a === '--focus') args.focus = Number(next())
    else if (a === '--quality') args.quality = Number(next())
    else if (a === '--mobile-width') args.mobileWidth = Number(next())
    else if (a === '--mobile-aspect') args.mobileAspect = Number(next())
    else if (a === '--fps') args.fps = Number(next())
    else if (a === '--max-width') args.maxWidth = Number(next())
    else throw new Error(`Unknown argument: ${a}`)
  }
  if (!args.input) throw new Error('Missing --input <video>')
  if (!/^[a-z0-9-]+$/.test(args.id)) throw new Error('Missing or invalid --id (lowercase letters, digits, dashes)')
  if (!(args.focus >= 0 && args.focus <= 1)) throw new Error('--focus must be between 0 and 1')
  return args
}

function run(args, { capture = false } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpegPath, args, { stdio: ['ignore', 'ignore', 'pipe'] })
    let stderr = ''
    child.stderr.on('data', (d) => { stderr += d })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) resolve(capture ? stderr : '')
      else reject(new Error(`ffmpeg exited with ${code}\n${stderr.slice(-2000)}`))
    })
  })
}

async function probe(input) {
  // ffmpeg prints stream info to stderr; `-f null -` decodes everything so we also get an exact frame count.
  const info = await run(['-hide_banner', '-i', input, '-map', '0:v:0', '-vf', "select='gt(scene,0.25)',showinfo", '-f', 'null', '-'], { capture: true })
  const stream = info.match(/Video: .*?, (\d{2,5})x(\d{2,5})[ ,].*?([\d.]+) fps/)
  if (!stream) throw new Error('Could not read video stream info')
  const [, w, h, fps] = stream
  const cuts = [...info.matchAll(/pts_time:([\d.]+)/g)].map((m) => Number(Number(m[1]).toFixed(3)))
  const countOut = await run(['-hide_banner', '-i', input, '-map', '0:v:0', '-c', 'copy', '-f', 'null', '-'], { capture: true })
  const frameMatch = [...countOut.matchAll(/frame=\s*(\d+)/g)].pop()
  return { width: Number(w), height: Number(h), fps: Number(fps), cuts, frameCount: frameMatch ? Number(frameMatch[1]) : NaN }
}

async function dirBytes(dir) {
  let total = 0
  for (const f of await readdir(dir)) total += (await stat(path.join(dir, f))).size
  return total
}

const even = (n) => Math.max(2, Math.round(n / 2) * 2)

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const input = path.resolve(args.input)
  const outDir = path.resolve(root, 'public/media/hero', args.id)
  const meta = await probe(input)
  // Resample first (cheapest place to drop frames), then mirror and scale.
  const resample = args.fps > 0 ? [`fps=${args.fps}`] : []
  const flip = [...resample, ...(args.mirror ? ['hflip'] : [])]
  const fps = args.fps > 0 ? args.fps : meta.fps

  const width = Math.min(meta.width, args.maxWidth)
  const height = even((meta.height * width) / meta.width)
  // Portrait crop keeps the full height; its width follows --mobile-aspect unless --mobile-width is given.
  const mobileW = Math.min(even(args.mobileWidth > 0 ? args.mobileWidth : height * args.mobileAspect), width)
  // Keep the crop window inside the frame while centring it on the focus point.
  const cropX = Math.round(Math.min(Math.max(args.focus * width - mobileW / 2, 0), width - mobileW))

  const sets = {
    desktop: { filter: [...flip, `scale=${width}:${height}:flags=lanczos`], width, height },
    mobile: { filter: [...flip, `scale=${width}:${height}:flags=lanczos`, `crop=${mobileW}:${height}:${cropX}:0`], width: mobileW, height },
  }

  const webp = ['-c:v', 'libwebp', '-quality', String(args.quality), '-compression_level', '6', '-preset', 'drawing']
  const manifestSets = {}
  for (const [name, set] of Object.entries(sets)) {
    const dir = path.join(outDir, name)
    await rm(dir, { recursive: true, force: true })
    await mkdir(dir, { recursive: true })
    process.stdout.write(`Encoding ${name} frames (${set.width}x${set.height})... `)
    await run(['-hide_banner', '-loglevel', 'error', '-y', '-i', input, '-an', '-map', '0:v:0', '-vf', set.filter.join(','),
      '-fps_mode', 'passthrough', ...webp, '-start_number', '0', path.join(dir, '%04d.webp')])
    const files = (await readdir(dir)).filter((f) => f.endsWith('.webp'))
    const bytes = await dirBytes(dir)
    console.log(`${files.length} frames, ${(bytes / 1024 / 1024).toFixed(1)} MB`)
    manifestSets[name] = { path: `/${path.relative(path.join(root, 'public'), dir).split(path.sep).join('/')}`, width: set.width, height: set.height, count: files.length, bytes }
  }

  await run(['-hide_banner', '-loglevel', 'error', '-y', '-i', input, '-an', '-map', '0:v:0', '-vf', sets.desktop.filter.join(','),
    '-frames:v', '1', '-c:v', 'libwebp', '-quality', '90', '-compression_level', '6', path.join(outDir, 'poster.webp')])

  const counts = Object.values(manifestSets).map((s) => s.count)
  if (new Set(counts).size !== 1) throw new Error(`Frame sets disagree on length: ${counts.join(', ')}`)
  const version = createHash('sha1').update(await readFile(input)).update(JSON.stringify(args)).digest('hex').slice(0, 10)

  const manifest = {
    id: args.id,
    source: path.basename(input),
    version,
    mirrored: args.mirror,
    focus: args.focus,
    fps,
    frameCount: counts[0],
    duration: Number((counts[0] / fps).toFixed(3)),
    cuts: meta.cuts,
    poster: `${manifestSets.desktop.path.replace(/\/desktop$/, '')}/poster.webp`,
    sets: manifestSets,
  }
  const manifestPath = path.join(root, 'src/sections/hero/videos', `${args.id}.frames.json`)
  await mkdir(path.dirname(manifestPath), { recursive: true })
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
  console.log(`Manifest written to ${path.relative(root, manifestPath)}`)
}

main().catch((err) => {
  console.error(err.message ?? err)
  process.exit(1)
})
