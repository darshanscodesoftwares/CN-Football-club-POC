import { animate, createAnimatable, createTimeline, cubicBezier, splitText, stagger, utils } from 'animejs'
import type { AnimationParams, TextSplitter, Timeline } from 'animejs'
import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, MouseEvent } from 'react'
import { ArrowUpRight, SkipIcon, SwitchIcon } from '../../components/icons'
import { MarinaCrest } from '../../components/MarinaCrest'
import { clamp, damp, invLerp, piecewise, progressIn, smoothstep } from '../../lib/math'
import { hasFinePointer, prefersReducedMotion } from '../../lib/motion'
import { currentScroll, scrollToTarget } from '../../lib/smoothScroll'
import { addTick } from '../../lib/ticker'
import { CoverCanvas, getFrameSequence } from './frameSequence'
import type { FrameSequence } from './frameSequence'
import { BRAND_HIDE_AFTER_PX, CAPTION_COPY, CAPTION_FADE, HERO_COPY, HERO_LENGTH_VH, INTRO_OUT } from './heroScript'
import { HERO_VIDEOS, initialVideoIndex } from './heroVideos'
import type { HeroCaption, HeroVideo } from './heroVideos'
import './Hero.css'

type SetName = 'desktop' | 'mobile'

/** Safety cap on canvas backing-store pixels. */
const MAX_CANVAS_PIXELS = 4_200_000
/** After this long without scroll movement the picture settles on a whole frame (no blend). */
const IDLE_AFTER_MS = 140
/** Blends are quantised to 1/48 steps so unchanged frames are never redrawn. */
const BLEND_STEPS = 48
/** Crossfade length when switching videos. */
const SWITCH_MS = 750
/** If the exact frame is still missing after this long, switch using the nearest decoded one. */
const SWITCH_WAIT_MS = 4000

/** Reference easings: the copy's load-in curve and the caption word reveal. */
const easeEnter = cubicBezier(0.16, 1, 0.3, 1)
const easeReveal = cubicBezier(0.22, 1, 0.36, 1)
const easeSwitch = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2)

interface CaptionRuntime {
  el: HTMLElement
  inner: HTMLElement
  caption: HeroCaption
  reveal: Timeline
  local: number
  revealed: boolean
}

interface VideoRuntime {
  config: HeroVideo
  sequences: Record<SetName, FrameSequence>
  lastFrame: number
  /** Smoothed frame index currently shown for this video. */
  display: number
  captions: CaptionRuntime[]
}

/** Captions slide in from the side they sit on, or rise from below. */
const enterOffset = (placement: HeroCaption['placement']) =>
  placement === 'story-left' ? { x: -20, y: 0 } : placement === 'story-right' ? { x: 20, y: 0 } : { x: 0, y: 20 }

const captionKey = (videoIndex: number, captionIndex: number) => `${videoIndex}:${captionIndex}`

export function Hero() {
  const [initialIndex] = useState(initialVideoIndex)
  const initialVideo = HERO_VIDEOS[initialIndex]

  const sectionRef = useRef<HTMLElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const mediaRef = useRef<HTMLDivElement>(null)
  const mediaInnerRef = useRef<HTMLDivElement>(null)
  const posterRef = useRef<HTMLImageElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const brandRef = useRef<HTMLAnchorElement>(null)
  const brandInnerRef = useRef<HTMLSpanElement>(null)
  const introRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const ledeRef = useRef<HTMLParagraphElement>(null)
  const actionsRef = useRef<HTMLDivElement>(null)
  const controlsRef = useRef<HTMLDivElement>(null)
  const switchRef = useRef<HTMLButtonElement>(null)
  const captionRefs = useRef(new Map<string, HTMLDivElement>())

  useEffect(() => {
    const section = sectionRef.current
    const stage = stageRef.current
    const media = mediaRef.current
    const mediaInner = mediaInnerRef.current
    const poster = posterRef.current
    const canvas = canvasRef.current
    const brand = brandRef.current
    const brandInner = brandInnerRef.current
    const intro = introRef.current
    const title = titleRef.current
    const lede = ledeRef.current
    const actions = actionsRef.current
    const controls = controlsRef.current
    const switchButton = switchRef.current
    if (!section || !stage || !media || !mediaInner || !poster || !canvas || !brand || !brandInner) return
    if (!intro || !title || !lede || !actions || !controls) return

    const reduce = prefersReducedMotion()
    const cleanups: Array<() => void> = []
    const splitters: TextSplitter[] = []
    let disposed = false

    // ------------------------------------------------------- captions (per video)
    const buildCaption = (el: HTMLElement, caption: HeroCaption): CaptionRuntime => {
      const inner = el.querySelector<HTMLElement>('.chapter__inner')
      const heading = el.querySelector<HTMLElement>('.chapter__heading')
      const body = el.querySelector<HTMLElement>('.chapter__body')
      if (!inner || !heading || !body) throw new Error(`Caption ${caption.copy} markup is incomplete`)
      const headingSplit = splitText(heading, { words: true })
      const bodySplit = splitText(body, { words: true })
      splitters.push(headingSplit, bodySplit)
      const headingWords = headingSplit.words as HTMLElement[]
      const bodyWords = bodySplit.words as HTMLElement[]
      const wordIn: AnimationParams = reduce
        ? { opacity: [0, 1], duration: 400 }
        : { opacity: [0, 1], translateY: [20, 0], filter: ['blur(6px)', 'blur(0px)'], duration: 720, ease: easeReveal }
      utils.set([...headingWords, ...bodyWords], reduce ? { opacity: 0 } : { opacity: 0, translateY: 20, filter: 'blur(6px)' })
      utils.set(inner, { opacity: 0 })
      const reveal = createTimeline({ autoplay: false })
      reveal.add(headingWords, { ...wordIn, delay: stagger(60) }, 0)
      reveal.add(bodyWords, { ...wordIn, delay: stagger(30) }, 200)
      return { el, inner, caption, reveal, local: -1, revealed: false }
    }

    // ---------------------------------------------------------- videos + frames
    const runtimes: VideoRuntime[] = HERO_VIDEOS.map((config, videoIndex) => ({
      config,
      sequences: {
        desktop: getFrameSequence(config.frames.sets.desktop, config.frames.version),
        mobile: getFrameSequence(config.frames.sets.mobile, config.frames.version),
      },
      lastFrame: config.frames.frameCount - 1,
      display: -1,
      captions: config.captions.map((caption, captionIndex) => {
        const el = captionRefs.current.get(captionKey(videoIndex, captionIndex))
        if (!el) throw new Error(`Missing caption element ${config.id}/${caption.copy}`)
        return buildCaption(el, caption)
      }),
    }))

    const surface = new CoverCanvas(canvas)
    let activeIndex = initialIndex
    let previousIndex = -1
    let pendingIndex = -1
    let pendingSince = 0
    let switchStartedAt = 0
    let switchMix = 1
    let activeSet: SetName = 'desktop'
    let sectionTop = 0
    let distance = 1
    let needsDraw = true
    let drawnKey = ''
    let posterHidden = false
    let lastProgress = -1
    let lastMoveAt = 0
    let backgroundStarted = false

    const progressNow = () => clamp((currentScroll() - sectionTop) / distance)
    const frameFor = (runtime: VideoRuntime, progress: number) =>
      clamp(piecewise(runtime.config.timeMap, progress) * runtime.config.frames.fps, 0, runtime.lastFrame)

    // Once the visible video has every frame, quietly preload the one the switch button goes to
    // next (only that one, so three videos never mean three full downloads up front).
    const maybeStartBackground = () => {
      if (backgroundStarted || runtimes.length < 2 || !runtimes[activeIndex].sequences[activeSet].complete) return
      backgroundStarted = true
      const next = runtimes[(activeIndex + 1) % runtimes.length]
      next.sequences[activeSet].start(frameFor(next, lastProgress), 3)
    }
    for (const runtime of runtimes) {
      for (const sequence of Object.values(runtime.sequences)) {
        cleanups.push(
          sequence.subscribe(() => {
            needsDraw = true
            maybeStartBackground()
          }),
        )
      }
    }

    const measure = () => {
      sectionTop = section.getBoundingClientRect().top + window.scrollY
      distance = Math.max(1, section.offsetHeight - stage.clientHeight)
      // Portrait screens use the pre-cropped portrait frames: same sharpness, a fraction of the bytes.
      const next: SetName = stage.clientWidth / Math.max(1, stage.clientHeight) < 0.75 ? 'mobile' : 'desktop'
      if (next !== activeSet) {
        activeSet = next
        needsDraw = true
        backgroundStarted = false
      }
      const runtime = runtimes[activeIndex]
      runtime.sequences[activeSet].start(frameFor(runtime, progressNow()))

      // Size the backing store to the frames' own pixel density, not the screen's: each draw is a
      // near 1:1 copy and the compositor does the final upscale on the GPU.
      const width = canvas.clientWidth
      const height = canvas.clientHeight
      const set = runtime.config.frames.sets[activeSet]
      const coverScale = Math.max(width / set.width, height / set.height)
      const dpr = window.devicePixelRatio || 1
      const pixelCap = Math.sqrt(MAX_CANVAS_PIXELS / Math.max(1, width * height))
      const ratio = Math.min(dpr, 1 / Math.max(coverScale, 1e-3), pixelCap)
      if (surface.resize(width, height, ratio)) needsDraw = true
    }

    /** The decoded frame nearest to `index` for a video, preferring the current set. */
    const pick = (runtime: VideoRuntime, index: number) => {
      for (const set of [activeSet, activeSet === 'desktop' ? 'mobile' : 'desktop'] as SetName[]) {
        const sequence = runtime.sequences[set]
        const found = sequence.nearestIndex(index)
        const image = found >= 0 ? sequence.get(found) : undefined
        if (image) return { set, sequence, index: found, image, focusX: set === 'desktop' ? runtime.config.frames.focus : 0.5 }
      }
      return null
    }

    const draw = () => {
      const runtime = runtimes[activeIndex]
      const layers: Array<{ image: HTMLImageElement; alpha: number; focusX: number; focusY: number }> = []
      let key: string
      if (previousIndex >= 0) {
        // Switching: the outgoing video underneath, the incoming one fading in on top.
        const outgoing = runtimes[previousIndex]
        const from = pick(outgoing, Math.round(outgoing.display))
        const to = pick(runtime, Math.round(runtime.display))
        const step = Math.round(easeSwitch(switchMix) * BLEND_STEPS)
        if (from) layers.push({ image: from.image, alpha: 1, focusX: from.focusX, focusY: outgoing.config.focusY })
        if (to) layers.push({ image: to.image, alpha: from ? step / BLEND_STEPS : 1, focusX: to.focusX, focusY: runtime.config.focusY })
        key = `x${previousIndex}${from?.set}${from?.index}>${activeIndex}${to?.set}${to?.index}:${step}`
      } else {
        const i0 = Math.floor(runtime.display)
        const base = pick(runtime, i0)
        if (!base) return
        const i1 = Math.min(i0 + 1, runtime.lastFrame)
        const canBlend = base.index === i0 && i1 !== i0 && base.sequence.has(i1)
        const step = canBlend ? Math.round(smoothstep(0.08, 0.92, runtime.display - i0) * BLEND_STEPS) : 0
        layers.push({ image: base.image, alpha: 1, focusX: base.focusX, focusY: runtime.config.focusY })
        const next = step ? base.sequence.get(i1) : undefined
        if (next) layers.push({ image: next, alpha: step / BLEND_STEPS, focusX: base.focusX, focusY: runtime.config.focusY })
        key = `${activeIndex}${base.set}${base.index}:${step ? i1 : -1}:${step}`
      }
      if (!layers.length || (!needsDraw && key === drawnKey)) return
      for (const layer of layers) {
        if (!surface.drawLayer(layer.image, layer.alpha, layer.focusX, layer.focusY)) return
      }
      drawnKey = key
      needsDraw = false
      if (!posterHidden) {
        posterHidden = true
        poster.classList.add('is-hidden')
      }
    }

    // ------------------------------------------- opening copy: scrubbed exit
    const introOut = createTimeline({ autoplay: false, defaults: { ease: 'inOutQuad' } })
    introOut.add(
      intro,
      reduce
        ? { opacity: [1, 0], duration: 1000 }
        : { opacity: [1, 0], translateY: [0, -30], filter: ['blur(0px)', 'blur(6px)'], duration: 1000 },
      0,
    )
    let introLocal = -1

    // ------------------------------- crest + wordmark: hide after 80 px (timed)
    let brandHidden = false
    const setBrandHidden = (hidden: boolean) => {
      if (hidden === brandHidden) return
      brandHidden = hidden
      brand.style.pointerEvents = hidden ? 'none' : ''
      const to = { opacity: hidden ? 0 : 1, translateY: hidden ? -20 : 0 }
      if (reduce) utils.set(brand, to)
      else animate(brand, { ...to, duration: 300, ease: 'outQuad' })
    }

    const applyCaption = (caption: CaptionRuntime, progress: number) => {
      const [start, end] = caption.caption.range
      const local = clamp(invLerp(start, end, progress))
      if (local === caption.local) return
      caption.local = local
      const fadeIn = smoothstep(0, CAPTION_FADE, local)
      const fadeOut = end > 1 ? 0 : smoothstep(1 - CAPTION_FADE, 1, local)
      const offset = enterOffset(caption.caption.placement)
      const rest = reduce ? 0 : 1 - fadeIn
      caption.inner.style.opacity = (fadeIn * (1 - fadeOut)).toFixed(3)
      caption.inner.style.transform = `translate3d(${(offset.x * rest).toFixed(2)}px, ${(offset.y * rest).toFixed(2)}px, 0)`
      const isActive = local > 0 && local < 1
      caption.el.dataset.active = String(isActive)
      // Words reveal on a timer when the caption starts to fade in (so they always finish),
      // and reset once it is fully out of range so they replay on the way back.
      if (isActive && !caption.revealed) {
        caption.revealed = true
        caption.reveal.restart()
      } else if (!isActive && caption.revealed) {
        caption.revealed = false
        caption.reveal.pause()
        caption.reveal.seek(0)
      }
    }

    /** Fades a caption out regardless of progress (used for the outgoing video on a switch). */
    const dismissCaption = (caption: CaptionRuntime) => {
      caption.local = -1
      caption.inner.style.opacity = '0'
      caption.el.dataset.active = 'false'
      if (!caption.revealed) return
      caption.revealed = false
      caption.reveal.pause()
      window.setTimeout(() => {
        if (!caption.revealed) caption.reveal.seek(0)
      }, SWITCH_MS)
    }

    const applyProgress = (progress: number) => {
      const introNow = progressIn(INTRO_OUT[0], INTRO_OUT[1], progress)
      if (introNow !== introLocal) {
        introLocal = introNow
        introOut.seek(introNow * 1000)
        // Faded-out buttons must not stay clickable.
        intro.style.visibility = introNow >= 1 ? 'hidden' : ''
      }
      setBrandHidden(currentScroll() - sectionTop > BRAND_HIDE_AFTER_PX)
      for (const caption of runtimes[activeIndex].captions) applyCaption(caption, progress)
    }

    // ------------------------------------------------------------ switching
    const switchIcon = switchButton?.querySelector<SVGElement>('.switch-btn__icon') ?? null
    const labelSwitch = () => {
      if (!switchButton) return
      const next = runtimes[(activeIndex + 1) % runtimes.length].config
      switchButton.setAttribute('aria-label', `${HERO_COPY.switchVideo}: showing ${runtimes[activeIndex].config.label}, next ${next.label}`)
      switchButton.title = `${HERO_COPY.switchVideo} (${next.label})`
    }

    const requestSwitch = () => {
      if (runtimes.length < 2 || pendingIndex >= 0 || previousIndex >= 0) return
      pendingIndex = (activeIndex + 1) % runtimes.length
      pendingSince = performance.now()
      const runtime = runtimes[pendingIndex]
      // Start (or re-prioritise) loading right where the reader is.
      runtime.sequences[activeSet].start(frameFor(runtime, progressNow()))
      if (switchButton) switchButton.dataset.state = 'loading'
    }

    const beginSwitch = (time: number) => {
      previousIndex = activeIndex
      activeIndex = pendingIndex
      pendingIndex = -1
      switchStartedAt = time
      switchMix = reduce ? 1 : 0
      const incoming = runtimes[activeIndex]
      incoming.display = frameFor(incoming, lastProgress)
      backgroundStarted = false
      stage.classList.add('is-switching')
      section.dataset.footage = incoming.config.footage
      for (const caption of runtimes[previousIndex].captions) dismissCaption(caption)
      for (const caption of incoming.captions) caption.local = -1
      for (const caption of incoming.captions) applyCaption(caption, lastProgress)
      needsDraw = true
      if (switchButton) switchButton.dataset.state = ''
      if (switchIcon && !reduce) animate(switchIcon, { rotate: '+=180', duration: SWITCH_MS, ease: 'inOutCubic' })
      labelSwitch()
      const url = new URL(window.location.href)
      if (activeIndex === 0) url.searchParams.delete('video')
      else url.searchParams.set('video', incoming.config.id)
      window.history.replaceState(window.history.state, '', url)
    }

    const endSwitch = () => {
      previousIndex = -1
      switchMix = 1
      needsDraw = true
      stage.classList.remove('is-switching')
      maybeStartBackground()
    }

    if (switchButton) {
      labelSwitch()
      switchButton.addEventListener('click', requestSwitch)
      cleanups.push(() => switchButton.removeEventListener('click', requestSwitch))
    }

    // ------------------------------------------------------------- the loop
    const tick = (time: number, delta: number) => {
      const progress = progressNow()
      if (progress !== lastProgress) {
        lastProgress = progress
        lastMoveAt = time
        applyProgress(progress)
      }
      const idle = time - lastMoveAt > IDLE_AFTER_MS
      for (const index of [activeIndex, previousIndex]) {
        if (index < 0) continue
        const runtime = runtimes[index]
        const target = frameFor(runtime, progress)
        // While moving, follow the exact (fractional) frame; at rest, settle on a whole frame.
        const goal = idle ? Math.round(target) : target
        if (runtime.display < 0) {
          runtime.display = goal
        } else {
          runtime.display = damp(runtime.display, goal, reduce ? 40 : 16, delta)
          if (Math.abs(goal - runtime.display) < 0.004) runtime.display = goal
        }
      }
      if (pendingIndex >= 0) {
        const runtime = runtimes[pendingIndex]
        const sequence = runtime.sequences[activeSet]
        const target = Math.round(frameFor(runtime, progress))
        const waitedTooLong = time - pendingSince > SWITCH_WAIT_MS && sequence.nearestIndex(target) >= 0
        if (sequence.has(target) || waitedTooLong) beginSwitch(time)
      }
      if (previousIndex >= 0) {
        switchMix = reduce ? 1 : clamp((time - switchStartedAt) / SWITCH_MS)
        draw()
        if (switchMix >= 1) {
          endSwitch()
          draw()
        }
        return
      }
      draw()
    }

    // Resizing a canvas clears it, so redraw in the same frame instead of waiting for the next tick.
    const remeasure = () => {
      measure()
      needsDraw = true
      if (runtimes[activeIndex].display >= 0) draw()
    }
    measure()
    applyProgress(progressNow())
    const resizeObserver = new ResizeObserver(remeasure)
    resizeObserver.observe(stage)
    resizeObserver.observe(section)
    window.addEventListener('resize', remeasure)
    const stopTick = addTick(tick, 0)

    // ----------------------------------------------------------- load-in
    // Reference choreography: the headline lines, copy and buttons rise 16 px in a stagger while a
    // colour band (navy, sand, teal, cream) sweeps across the type and leaves it solid.
    // Our surreal touch: the picture wakes from a soft blur.
    const lines = Array.from(title.querySelectorAll<HTMLElement>('.hero__title-line'))
    const sweeps = [...lines, lede]
    const rise = [...lines, lede, actions]
    utils.set(rise, reduce ? { opacity: 0 } : { opacity: 0, translateY: 16 })
    utils.set([brandInner, controls], { opacity: 0 })
    if (!reduce) {
      sweeps.forEach((el) => el.classList.add('dia'))
      utils.set(mediaInner, { scale: 1.05, filter: 'blur(10px)' })
    }
    section.removeAttribute('data-intro')

    let entrance: Timeline | null = null
    const finishSweeps = () => sweeps.forEach((el) => el.classList.remove('dia'))
    const startEntrance = () => {
      if (disposed) return
      const timeline = createTimeline({ defaults: { ease: easeEnter } })
      if (reduce) {
        timeline.add([...rise, brandInner, controls], { opacity: [0, 1], duration: 600 }, 0)
      } else {
        const sweep = { backgroundPosition: ['100% 0%', '0% 0%'], ease: 'inOutCubic' }
        timeline
          .add(
            mediaInner,
            {
              scale: [1.05, 1],
              filter: ['blur(10px)', 'blur(0px)'],
              duration: 1600,
              ease: 'outQuart',
              onComplete: () => {
                mediaInner.style.filter = ''
              },
            },
            0,
          )
          .add(brandInner, { opacity: [0, 1], translateY: [-12, 0], duration: 1000 }, 150)
          .add(rise, { opacity: [0, 1], translateY: [16, 0], duration: 1000, delay: stagger(150, { start: 100 }) }, 0)
          .add(lines[0], { ...sweep, duration: 1200 }, 100)
          .add(lines[1], { ...sweep, duration: 1200 }, 400)
          .add(lede, { ...sweep, duration: 1800, onComplete: finishSweeps }, 800)
          .add(controls, { opacity: [0, 1], translateX: [-12, 0], duration: 1000 }, 700)
      }
      entrance = timeline
    }
    const posterReady = poster.decode().catch(() => undefined)
    const fontsReady = document.fonts ? document.fonts.ready.then(() => undefined) : Promise.resolve()
    const timeout = new Promise<void>((resolve) => window.setTimeout(resolve, 1400))
    void Promise.race([Promise.all([posterReady, fontsReady]), timeout]).then(startEntrance)

    // ------------------------------- pointer parallax on the picture only (depth)
    // Text and buttons stay still; only the video layer drifts against the pointer.
    if (hasFinePointer() && !reduce) {
      const mediaPull = createAnimatable(media, { x: 1400, y: 1400, ease: 'out(3)' })
      const onPointer = (event: PointerEvent) => {
        mediaPull.x((event.clientX / window.innerWidth - 0.5) * -24)
        mediaPull.y((event.clientY / window.innerHeight - 0.5) * -16)
      }
      window.addEventListener('pointermove', onPointer, { passive: true })
      cleanups.push(() => {
        window.removeEventListener('pointermove', onPointer)
        mediaPull.revert()
      })
    }

    return () => {
      disposed = true
      stopTick()
      resizeObserver.disconnect()
      window.removeEventListener('resize', remeasure)
      cleanups.forEach((cleanup) => cleanup())
      entrance?.revert()
      introOut.revert()
      const captionInners: HTMLElement[] = []
      for (const runtime of runtimes) {
        for (const caption of runtime.captions) {
          caption.reveal.revert()
          captionInners.push(caption.inner)
        }
      }
      splitters.forEach((splitter) => splitter.revert())
      finishSweeps()
      const touched = [brand, intro, ...rise, brandInner, controls, mediaInner, ...captionInners]
      utils.remove(touched)
      for (const el of touched) el.removeAttribute('style')
      stage.classList.remove('is-switching')
      poster.classList.remove('is-hidden')
      section.dataset.footage = HERO_VIDEOS[initialIndex].footage
      section.setAttribute('data-intro', 'pending')
    }
  }, [initialIndex])

  const skipIntro = () => {
    const next = sectionRef.current?.nextElementSibling
    if (next instanceof HTMLElement) scrollToTarget(next, 2.4)
  }

  const backToTop = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault()
    scrollToTarget(0, 1.4)
  }

  return (
    <section
      ref={sectionRef}
      className="hero"
      id="top"
      aria-label="Marina Football Club"
      data-intro="pending"
      data-footage={initialVideo.footage}
      style={{ height: `${HERO_LENGTH_VH}vh` }}
    >
      <div ref={stageRef} className="hero__stage">
        <div ref={mediaRef} className="hero__media" aria-hidden="true">
          <div ref={mediaInnerRef} className="hero__media-inner">
            <canvas ref={canvasRef} className="hero__canvas" />
            {/* Sits above the canvas (which is opaque black until its first draw) and fades out after it. */}
            <img
              ref={posterRef}
              className="hero__poster"
              src={`${initialVideo.frames.poster}?v=${initialVideo.frames.version}`}
              alt=""
              decoding="async"
              fetchPriority="high"
              style={{ objectPosition: `${initialVideo.frames.focus * 100}% ${initialVideo.focusY * 100}%` }}
            />
          </div>
        </div>

        <div className="hero__overlay">
          <a ref={brandRef} className="hero__brand" href="#top" onClick={backToTop} aria-label="Marina Football Club, back to top">
            <span ref={brandInnerRef} className="hero__brand-inner" data-reveal>
              <MarinaCrest className="hero__crest" />
              <span className="hero__brand-name">{HERO_COPY.brand}</span>
            </span>
          </a>

          <div ref={introRef} className="hero__intro">
            <h1 ref={titleRef} className="hero__title">
              {HERO_COPY.titleLines.map((line) => (
                <span key={line} className="hero__title-line">
                  {line}
                </span>
              ))}
            </h1>
            <p ref={ledeRef} className="hero__lede" data-reveal>
              {HERO_COPY.lede}
            </p>
            <div ref={actionsRef} className="hero__actions" data-reveal>
              <a className="pill-btn" href={HERO_COPY.ctaHref}>
                <span className="pill-btn__face">
                  <span className="pill-btn__roll">
                    <span className="pill-btn__label">{HERO_COPY.cta}</span>
                    <span className="pill-btn__label" aria-hidden="true">
                      {HERO_COPY.cta}
                    </span>
                  </span>
                </span>
              </a>
              <a className="round-btn" href={HERO_COPY.ctaHref} aria-label={HERO_COPY.cta}>
                <span className="round-btn__face">
                  <ArrowUpRight className="round-btn__icon" />
                </span>
              </a>
            </div>
          </div>

          {HERO_VIDEOS.map((video, videoIndex) =>
            video.captions.map((caption, captionIndex) => {
              const copy = CAPTION_COPY[caption.copy]
              const key = captionKey(videoIndex, captionIndex)
              return (
                <div
                  key={`${video.id}-${caption.copy}`}
                  ref={(el) => {
                    if (el) captionRefs.current.set(key, el)
                    else captionRefs.current.delete(key)
                  }}
                  className={`chapter chapter--${caption.placement} chapter--${caption.tone}`}
                  data-video={video.id}
                  data-active="false"
                  style={caption.top ? ({ '--caption-top': caption.top } as CSSProperties) : undefined}
                >
                  <div className="chapter__inner">
                    <span className="chapter__haze" aria-hidden="true" />
                    <h2 className="chapter__heading">{copy.heading}</h2>
                    <p className="chapter__body">{copy.body}</p>
                  </div>
                </div>
              )
            }),
          )}

          <div ref={controlsRef} className="hero__controls" data-reveal>
            <button type="button" className="skip-btn" onClick={skipIntro}>
              <span className="skip-btn__face">
                <span>{HERO_COPY.skip}</span>
                <SkipIcon className="skip-btn__icon" />
              </span>
            </button>
            {HERO_VIDEOS.length > 1 && (
              <button ref={switchRef} type="button" className="switch-btn" aria-label={HERO_COPY.switchVideo}>
                <span className="switch-btn__face">
                  <SwitchIcon className="switch-btn__icon" />
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
