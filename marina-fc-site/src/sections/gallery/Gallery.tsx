import { createTimeline, cubicBezier, stagger, utils } from 'animejs'
import type { Timeline } from 'animejs'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'
import AccordionGallery from '../../components/reactbits/AccordionGallery'
import { prefersReducedMotion } from '../../lib/motion'
import { GALLERY_SLIDES, GALLERY_TITLE, slideLabels } from './galleryData'
import './Gallery.css'

const easeOut = cubicBezier(0.16, 1, 0.3, 1)
/** Horizontal drag needed on the viewer to change slide. */
const SWIPE_PX = 48
/** Longest wait for the next photo to decode before the wipe starts anyway. */
const DECODE_WAIT_MS = 250

const pad = (n: number) => String(n)

/** Crop points for accordion photos, applied by src so the React Bits component stays as published. */
const ACCORDION_CROPS = GALLERY_SLIDES.flatMap((slide) =>
  slide.kind === 'accordion' ? slide.images.filter((image) => image.position) : [],
)
  .map((image) => `.gallery__accordion .ag-img[src="${image.src}"]{object-position:${image.position}}`)
  .join('')

function Chevron({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={direction === 'left' ? 'm15 18-6-6 6-6' : 'm9 18 6-6-6-6'} />
    </svg>
  )
}

/**
 * "Life at <club>" photo collage (reference: "Life at Neidhal FC"): a thumbnail rail on the
 * left and a large viewer that alternates a single wide photo with a 3-panel hover accordion
 * (React Bits AccordionGallery), looping. A new slide wipes in from the direction of travel while
 * its photos settle from a slight zoom; the old one fades back.
 */
export function Gallery() {
  const count = GALLERY_SLIDES.length
  const [active, setActive] = useState(0)

  const sectionRef = useRef<HTMLElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const railRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<HTMLDivElement>(null)
  const counterNumRef = useRef<HTMLSpanElement>(null)
  const slideRefs = useRef<Array<HTMLElement | null>>([])
  const thumbRefs = useRef<Array<HTMLButtonElement | null>>([])
  const shownRef = useRef(0)
  const directionRef = useRef(1)
  const swipeRef = useRef<{ x: number; y: number } | null>(null)

  const go = useCallback(
    (target: number, direction?: number) => {
      const next = ((target % count) + count) % count
      setActive((current) => {
        if (next === current) return current
        directionRef.current = direction ?? (next > current ? 1 : -1)
        return next
      })
    },
    [count],
  )

  // ------------------------------------------------------------ slide change
  // Layout effect: the incoming slide must be clipped before the browser paints it.
  useLayoutEffect(() => {
    const to = active
    const from = shownRef.current // the slide actually on screen, not merely the previous index
    if (from === to) {
      // e.g. navigating straight back while a change was still waiting to start
      slideRefs.current.forEach((slide) => slide?.classList.remove('is-leaving'))
      return
    }
    const outgoing = slideRefs.current[from]
    const incoming = slideRefs.current[to]
    if (!outgoing || !incoming) return

    const reduce = prefersReducedMotion()
    const direction = directionRef.current
    // Wipe targets: the single photo's frame, or the whole accordion.
    const inFrames = Array.from(incoming.querySelectorAll<HTMLElement>('.gallery__frame, .gallery__accordion'))
    const inImages = Array.from(incoming.querySelectorAll<HTMLImageElement>('.gallery__img, .ag-img'))
    const inCaptions = Array.from(incoming.querySelectorAll<HTMLElement>('.gallery__caption'))
    const outCaptions = Array.from(outgoing.querySelectorAll<HTMLElement>('.gallery__caption'))

    slideRefs.current.forEach((slide, index) => {
      if (slide && index !== from && index !== to) slide.classList.remove('is-leaving')
    })
    outgoing.classList.add('is-leaving')

    // Clip insets reach 12% past every edge, so the accordion's 3D-tilted panels are never cut
    // square during the wipe and nothing jumps when the clip is released at the end.
    const shownClip = 'inset(-12% -12% -12% -12%)'
    const hiddenClip = direction > 0 ? 'inset(-12% -12% -12% 112%)' : 'inset(-12% 112% -12% -12%)'
    if (!reduce) utils.set(inFrames, { clipPath: hiddenClip })
    if (inCaptions.length) utils.set(inCaptions, { opacity: 0 })
    if (reduce) utils.set(incoming, { opacity: 0 })

    let started = false
    let cancelled = false
    let timeline: Timeline | null = null
    const release = () => {
      for (const frame of inFrames) frame.style.clipPath = ''
      if (inCaptions.length) utils.set(inCaptions, { opacity: 1 })
      if (reduce) utils.set(incoming, { opacity: 1 })
    }

    const start = () => {
      if (cancelled) return
      started = true
      timeline = createTimeline({
        defaults: { ease: easeOut },
        onComplete: () => {
          shownRef.current = to
          outgoing.classList.remove('is-leaving')
          utils.set(outgoing, { opacity: 1, scale: 1, translateX: 0 })
          if (outCaptions.length) utils.set(outCaptions, { opacity: 1 })
          for (const frame of inFrames) frame.style.clipPath = ''
        },
      })
      if (reduce) {
        timeline.add(incoming, { opacity: [0, 1], duration: 400 }, 0)
        if (inCaptions.length) timeline.add(inCaptions, { opacity: [0, 1], duration: 300 }, 200)
      } else {
        if (outCaptions.length) timeline.add(outCaptions, { opacity: [1, 0], duration: 220, ease: 'outQuad' }, 0)
        timeline
          .add(outgoing, { opacity: [1, 0], scale: [1, 0.97], translateX: ['0%', `${-direction * 2}%`], duration: 900 }, 60)
          .add(inFrames, { clipPath: [hiddenClip, shownClip], duration: 1050, delay: stagger(90) }, 0)
        if (inImages.length) timeline.add(inImages, { scale: [1.12, 1], duration: 1500, delay: stagger(90) }, 0)
        if (inCaptions.length) {
          timeline.add(inCaptions, { opacity: [0, 1], translateY: [14, 0], duration: 750, delay: stagger(90) }, 420)
        }
      }
    }

    // Wait (briefly) for the incoming photos to decode so the wipe never reveals a blank frame.
    const decoded = Promise.all(inImages.map((img) => img.decode().catch(() => undefined)))
    const timeout = new Promise((resolve) => window.setTimeout(resolve, DECODE_WAIT_MS))
    void Promise.race([decoded, timeout]).then(start)

    // Counter rolls in the direction of travel.
    const counter = counterNumRef.current
    if (counter && !reduce) {
      createTimeline({ defaults: { ease: easeOut } }).add(counter, {
        opacity: [0, 1],
        translateY: [`${direction * 70}%`, '0%'],
        duration: 500,
      })
    }

    // Keep the active thumbnail in view, scrolling the rail by whole thumbnails and leaving one
    // neighbour visible on the side we are heading towards (vertical on desktop, sideways on phones).
    const rail = railRef.current
    const thumb = thumbRefs.current[to]
    if (rail && thumb) {
      const behavior: ScrollBehavior = reduce ? 'auto' : 'smooth'
      const vertical = getComputedStyle(rail).flexDirection === 'column'
      const second = thumbRefs.current[1]
      const pitch = second && thumbRefs.current[0]
        ? vertical
          ? second.offsetTop - (thumbRefs.current[0] as HTMLElement).offsetTop
          : second.offsetLeft - (thumbRefs.current[0] as HTMLElement).offsetLeft
        : 1
      const viewport = vertical ? rail.clientHeight : rail.clientWidth
      const visible = Math.max(1, Math.floor((viewport + pitch * 0.1) / pitch))
      let first = Math.round((vertical ? rail.scrollTop : rail.scrollLeft) / pitch)
      if (to < first + 1) first = to - 1
      else if (to > first + visible - 2) first = to - visible + 2
      first = Math.min(Math.max(first, 0), Math.max(0, count - visible))
      rail.scrollTo(vertical ? { top: first * pitch, behavior } : { left: first * pitch, behavior })
      // Roving focus: keyboard users stay on the selected tab, and focus never falls to the page
      // when the slide holding it (e.g. an accordion panel) is hidden.
      const focused = document.activeElement
      if (rail.contains(focused) || outgoing.contains(focused)) thumb.focus({ preventScroll: true })
    }

    return () => {
      // A newer change arrived. If this one never started, its slide was left clipped: release it.
      // If it is mid-wipe, finish it instantly so the new change starts from a settled slide.
      if (!started) {
        cancelled = true
        release()
      } else if (timeline && !timeline.completed) {
        timeline.complete()
      }
    }
  }, [active, count])

  // ------------------------------------------------------- reveal on scroll-in
  useEffect(() => {
    const section = sectionRef.current
    const title = titleRef.current
    const rail = railRef.current
    const viewer = viewerRef.current
    if (!section || !title || !rail || !viewer) return
    const reduce = prefersReducedMotion()
    const thumbs = Array.from(rail.querySelectorAll<HTMLElement>('.gallery__thumb'))
    utils.set([title, viewer, ...thumbs], { opacity: 0 })
    if (!reduce) {
      utils.set(title, { translateY: 24, filter: 'blur(12px)' })
      utils.set(viewer, { translateY: 32, scale: 0.98 })
      utils.set(thumbs, { translateX: -14 })
    }
    section.removeAttribute('data-reveal')

    // Once revealed, hand the thumbnails back to CSS (inactive dimming and hover use opacity).
    const releaseThumbs = () => {
      for (const thumb of thumbs) {
        thumb.style.removeProperty('opacity')
        thumb.style.removeProperty('transform')
      }
    }
    const timeline = createTimeline({ autoplay: false, defaults: { ease: easeOut }, onComplete: releaseThumbs })
    if (reduce) {
      timeline.add([title, viewer, ...thumbs], { opacity: [0, 1], duration: 500 }, 0)
    } else {
      timeline
        .add(title, {
          opacity: [0, 1],
          translateY: [24, 0],
          filter: ['blur(12px)', 'blur(0px)'],
          duration: 1200,
          onComplete: () => {
            title.style.filter = ''
          },
        }, 0)
        .add(viewer, { opacity: [0, 1], translateY: [32, 0], scale: [0.98, 1], duration: 1300 }, 250)
        .add(thumbs, { opacity: [0, 1], translateX: [-14, 0], duration: 900, delay: stagger(60) }, 400)
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          timeline.play()
          observer.disconnect()
        }
      },
      { threshold: 0.2 },
    )
    observer.observe(section)
    return () => {
      observer.disconnect()
      timeline.revert()
      for (const el of [title, viewer, ...thumbs]) el.removeAttribute('style')
      section.setAttribute('data-reveal', 'pending')
    }
  }, [])

  // -------------------------------------------------------------- input
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    // Arrow keys inside an accordion move between its panels (it calls preventDefault); leave them.
    if (event.defaultPrevented) return
    const keys: Record<string, () => void> = {
      ArrowRight: () => go(active + 1, 1),
      ArrowDown: () => go(active + 1, 1),
      ArrowLeft: () => go(active - 1, -1),
      ArrowUp: () => go(active - 1, -1),
      Home: () => go(0, -1),
      End: () => go(count - 1, 1),
    }
    const action = keys[event.key]
    if (!action) return
    event.preventDefault()
    action()
  }

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    swipeRef.current = { x: event.clientX, y: event.clientY }
  }
  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const start = swipeRef.current
    swipeRef.current = null
    if (!start) return
    const dx = event.clientX - start.x
    const dy = event.clientY - start.y
    if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(dy) * 1.2) {
      if (dx < 0) go(active + 1, 1)
      else go(active - 1, -1)
    }
  }

  const activeSlide = GALLERY_SLIDES[active]

  return (
    <section ref={sectionRef} className="gallery" id="gallery" aria-labelledby="gallery-title" data-reveal="pending">
      {ACCORDION_CROPS && <style>{ACCORDION_CROPS}</style>}
      <h2 ref={titleRef} id="gallery-title" className="gallery__title">
        {GALLERY_TITLE}
      </h2>

      <div className="gallery__body" onKeyDown={onKeyDown}>
        <div ref={railRef} className="gallery__rail" role="tablist" aria-label="Gallery photos" aria-orientation="vertical">
          {GALLERY_SLIDES.map((slide, index) => (
            <button
              key={slide.id}
              ref={(el) => {
                thumbRefs.current[index] = el
              }}
              type="button"
              role="tab"
              id={`gallery-tab-${slide.id}`}
              aria-selected={index === active}
              aria-controls="gallery-viewer"
              aria-label={`Slide ${index + 1} of ${count}: ${slideLabels(slide).join(', ')}`}
              tabIndex={index === active ? 0 : -1}
              className={`gallery__thumb${index === active ? ' is-active' : ''}`}
              onClick={() => go(index)}
            >
              <img src={slide.thumb} alt="" width={180} height={132} loading="lazy" decoding="async" draggable={false} />
            </button>
          ))}
        </div>

        <div
          ref={viewerRef}
          id="gallery-viewer"
          className="gallery__viewer"
          role="tabpanel"
          aria-roledescription="carousel"
          aria-labelledby={`gallery-tab-${activeSlide.id}`}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={() => (swipeRef.current = null)}
          onPointerLeave={() => (swipeRef.current = null)}
        >
          {GALLERY_SLIDES.map((slide, index) => (
            <figure
              key={slide.id}
              ref={(el) => {
                slideRefs.current[index] = el
              }}
              className={`gallery__slide gallery__slide--${slide.kind}${index === active ? ' is-active' : ''}`}
              aria-hidden={index !== active}
            >
              {slide.kind === 'single' ? (
                <div className="gallery__frame">
                  <img
                    className="gallery__img"
                    src={slide.image.src}
                    alt={slide.image.alt}
                    loading={index === 0 ? 'eager' : 'lazy'}
                    decoding="async"
                    draggable={false}
                    style={slide.image.position ? { objectPosition: slide.image.position } : undefined}
                  />
                  <figcaption className="gallery__caption">
                    <span className="gallery__eyebrow">{slide.image.label}</span>
                    <span className="gallery__place">{slide.place}</span>
                  </figcaption>
                </div>
              ) : (
                <div className="gallery__accordion">
                  <AccordionGallery
                    items={slide.images.map((image) => ({ image: image.src, label: image.label, alt: image.alt }))}
                    defaultIndex={1}
                    expandRatio={0.52}
                    trigger="hover"
                    accentColor="#c8a96b"
                    overlayColor="#05080f"
                    textColor="#ffffff"
                    grayscale
                    showLabels
                    duration={0.6}
                    ease="power3.out"
                    parallax={0.5}
                    tilt={8}
                    stagger={0.06}
                    height={478}
                    gap={8}
                    radius={10}
                    orientation="horizontal"
                  />
                </div>
              )}
            </figure>
          ))}

          <span className="gallery__counter" aria-hidden="true">
            <span ref={counterNumRef} className="gallery__counter-num">
              {pad(active + 1)}
            </span>
            <span className="gallery__counter-sep">/</span>
            <span>{pad(count)}</span>
          </span>

          <div className="gallery__nav">
            <button type="button" className="gallery__nav-btn" aria-label="Previous photo" onClick={() => go(active - 1, -1)}>
              <Chevron direction="left" />
            </button>
            <button type="button" className="gallery__nav-btn" aria-label="Next photo" onClick={() => go(active + 1, 1)}>
              <Chevron direction="right" />
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
