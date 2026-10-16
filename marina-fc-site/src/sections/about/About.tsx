import { createTimeline, cubicBezier, stagger, utils } from 'animejs'
import type { Timeline } from 'animejs'
import { useEffect, useRef } from 'react'
import ShinyText from '../../components/reactbits/ShinyText'
import { clamp } from '../../lib/math'
import { prefersReducedMotion } from '../../lib/motion'
import { usePaperSurface } from '../../lib/paperPattern'
import { currentScroll } from '../../lib/smoothScroll'
import { addTick } from '../../lib/ticker'
import { ABOUT_COPY } from './aboutCopy'
import type { SportIcon } from './aboutCopy'
import { BadmintonIcon, CricketIcon, FootballIcon, FutsalIcon } from './AboutIcons'
import './About.css'

const easeEnter = cubicBezier(0.16, 1, 0.3, 1)
const SPORT_ICONS: Record<SportIcon, typeof FootballIcon> = {
  football: FootballIcon,
  cricket: CricketIcon,
  badminton: BadmintonIcon,
  futsal: FutsalIcon,
}
/** Largest drift of the photo, in px, as the section passes through the screen. */
const PARALLAX_PX = 36

/**
 * About section, three rows on one shared container. First, the copy on the left (eyebrow, heading
 * with React Bits ShinyText and its last line highlighted in the kit's lime, paragraph, two
 * buttons) beside the beach photo, colour-graded into the site's navy and lime
 * (scripts/build-about-image.py) and running to the screen edge; a page layer with the wall pattern
 * covers only its white surround, so it melts into the page. Then the four sport programmes as a
 * row of translucent cards, and a navy stats band.
 * Reveals once on scroll-in; the photo drifts gently with the scroll; the stats count up.
 */
export function About() {
  const sectionRef = useRef<HTMLElement>(null)
  const mediaRef = useRef<HTMLDivElement>(null)
  const mediaInnerRef = useRef<HTMLDivElement>(null)
  const matteRef = useRef<HTMLSpanElement>(null)
  usePaperSurface(matteRef)

  useEffect(() => {
    const section = sectionRef.current
    const media = mediaRef.current
    const mediaInner = mediaInnerRef.current
    if (!section || !media || !mediaInner) return
    const reduce = prefersReducedMotion()
    const q = <T extends Element>(selector: string) => Array.from(section.querySelectorAll<T>(selector))

    const eyebrowLine = q<HTMLElement>('.about__eyebrow-line')
    const eyebrowText = q<HTMLElement>('.about__eyebrow-text')
    const title = q<HTMLElement>('.about__title')
    const mark = q<HTMLElement>('.about__mark')
    const copy = q<HTMLElement>('.about__para, .about__actions')
    const cards = q<HTMLElement>('.about__card, .about__cards-label')
    const band = q<HTMLElement>('.about__band')
    const stats = q<HTMLElement>('.about__stat')
    const counters = q<HTMLElement>('[data-count]').map((el) => ({ el, to: Number(el.dataset.count), final: el.textContent ?? '' }))

    const fading = [...eyebrowText, ...title, ...copy, ...cards, ...band, ...stats, mediaInner]
    utils.set(fading, { opacity: 0 })
    if (!reduce) {
      utils.set(eyebrowLine, { scaleX: 0 })
      utils.set(mark, { scaleX: 0 })
      utils.set([...eyebrowText, ...copy, ...stats], { translateY: 18 })
      utils.set(cards, { translateY: 28 })
      utils.set(band, { translateY: 36 })
      utils.set(title, { translateY: 24, filter: 'blur(12px)' })
      utils.set(mediaInner, { translateX: 48 })
      for (const counter of counters) counter.el.textContent = '0'
    }
    section.removeAttribute('data-reveal')

    const timeline: Timeline = createTimeline({ autoplay: false, defaults: { ease: easeEnter } })
    if (reduce) {
      timeline.add(fading, { opacity: [0, 1], duration: 500 }, 0)
    } else {
      timeline
        .add(eyebrowLine, { scaleX: [0, 1], duration: 900 }, 0)
        .add(eyebrowText, { opacity: [0, 1], translateY: [18, 0], duration: 900 }, 120)
        .add(
          title,
          {
            opacity: [0, 1],
            translateY: [24, 0],
            filter: ['blur(12px)', 'blur(0px)'],
            duration: 1200,
            onComplete: () => title.forEach((el) => el.style.removeProperty('filter')),
          },
          150,
        )
        .add(mark, { scaleX: [0, 1], duration: 900 }, 900)
        .add(copy, { opacity: [0, 1], translateY: [18, 0], duration: 1000, delay: stagger(140) }, 420)
        .add(mediaInner, { opacity: [0, 1], translateX: [48, 0], duration: 1600 }, 200)
        .add(cards, { opacity: [0, 1], translateY: [28, 0], duration: 1100, delay: stagger(90) }, 650)
        .add(band, { opacity: [0, 1], translateY: [36, 0], duration: 1200 }, 900)
        .add(stats, { opacity: [0, 1], translateY: [18, 0], duration: 1000, delay: stagger(110) }, 1080)
      // Numbers count up while their stat rises in.
      for (const counter of counters) {
        const tally = { value: 0 }
        timeline.add(
          tally,
          {
            value: [0, counter.to],
            duration: 1300,
            ease: 'outCubic',
            onRender: () => {
              counter.el.textContent = String(Math.round(tally.value))
            },
          },
          1100,
        )
      }
    }

    // Play once, when a sixth of the section is on screen.
    const revealObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          timeline.play()
          revealObserver.disconnect()
        }
      },
      { threshold: 0.16 },
    )
    revealObserver.observe(section)

    // ---- scroll parallax on the photo (transform only, so it never touches the image itself)
    let stopTick = () => {}
    let nearObserver: IntersectionObserver | null = null
    let resizeObserver: ResizeObserver | null = null
    if (!reduce) {
      let near = false
      let centre = 0
      let lastY = Number.NaN
      const measure = () => {
        const rect = media.getBoundingClientRect()
        centre = rect.top + currentScroll() + rect.height / 2
      }
      measure()
      resizeObserver = new ResizeObserver(measure)
      resizeObserver.observe(section)
      nearObserver = new IntersectionObserver(
        (entries) => {
          near = entries.some((entry) => entry.isIntersecting)
          media.style.willChange = near ? 'transform' : ''
          if (near) measure()
        },
        { rootMargin: '200px 0px' },
      )
      nearObserver.observe(section)
      stopTick = addTick(() => {
        if (!near) return
        const offset = centre - (currentScroll() + window.innerHeight / 2)
        const y = Math.round(clamp(offset * 0.06, -PARALLAX_PX, PARALLAX_PX) * 10) / 10
        if (y === lastY) return
        lastY = y
        media.style.transform = `translate3d(0, ${y}px, 0)`
      }, 5)
    }

    return () => {
      revealObserver.disconnect()
      nearObserver?.disconnect()
      resizeObserver?.disconnect()
      stopTick()
      timeline.revert()
      for (const counter of counters) counter.el.textContent = counter.final
      for (const el of [...fading, ...eyebrowLine, ...mark, media]) el.removeAttribute('style')
      section.setAttribute('data-reveal', 'pending')
    }
  }, [])

  const { eyebrow, titleLines, paragraph, cta, secondary, programmesLabel, programmes, stats, image } = ABOUT_COPY
  const lastLine = titleLines.length - 1

  return (
    <section ref={sectionRef} className="about" id="about-intro" aria-labelledby="about-title" data-reveal="pending">
      <div className="about__inner">
        <div className="about__copy">
          <p className="about__eyebrow">
            <span className="about__eyebrow-line" aria-hidden="true" />
            <span className="about__eyebrow-text">{eyebrow}</span>
          </p>

          <h2 id="about-title" className="about__title">
            <ShinyText
              color="#0b1f3a"
              shineColor="#7fa30f"
              speed={3}
              delay={2.6}
              angle={120}
              shineWidth={30}
              softness={0.8}
              bands={1}
              glow={0}
              direction="right"
              easing="smooth"
              trigger="loop"
            >
              {titleLines.map((line, index) => (
                <span key={line} className={`about__title-line${index === lastLine ? ' about__title-line--mark' : ''}`}>
                  {line}
                  {index === lastLine && <span className="about__mark" aria-hidden="true" />}
                </span>
              ))}
            </ShinyText>
          </h2>

          <p className="about__para">
            {paragraph.map(([text, bold], index) => (bold ? <strong key={index}>{text}</strong> : <span key={index}>{text}</span>))}
          </p>

          <div className="about__actions">
            <a className="about-btn" href={cta.href}>
              <span className="about-btn__face">
                <span className="about-btn__roll">
                  <span className="about-btn__label">{cta.label}</span>
                  <span className="about-btn__label" aria-hidden="true">
                    {cta.label}
                  </span>
                </span>
              </span>
            </a>
            <a className="about-link" href={secondary.href}>
              <span>{secondary.label}</span>
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="M3 8h10M9 4l4 4-4 4" />
              </svg>
            </a>
          </div>
        </div>

        <div ref={mediaRef} className="about__media">
          <div ref={mediaInnerRef} className="about__media-inner">
            <img
              className="about__img"
              src={image.src}
              alt={image.alt}
              width={image.width}
              height={image.height}
              loading="lazy"
              decoding="async"
              draggable={false}
            />
            <span ref={matteRef} className="about__matte paper-surface" aria-hidden="true" style={{ ['--matte' as string]: `url(${image.matte})` }} />
          </div>
        </div>
      </div>

      <div className="about__cards">
        <p className="about__cards-label">{programmesLabel}</p>
        <ul className="about__cards-grid">
          {programmes.map((programme) => {
            const Icon = SPORT_ICONS[programme.icon]
            return (
              <li key={programme.name} className="about__card">
                <span className="about__card-icon">
                  <Icon />
                </span>
                <h3 className="about__card-name">{programme.name}</h3>
                <p className="about__card-blurb">{programme.blurb}</p>
                <span className="about__card-ages">{programme.ages}</span>
              </li>
            )
          })}
        </ul>
      </div>

      <div className="about__band">
        <ul className="about__stats">
          {stats.map((stat) => (
            <li key={stat.label} className="about__stat">
              <span className="about__stat-value" data-count={stat.count}>
                {stat.value}
              </span>
              <span className="about__stat-label">{stat.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
