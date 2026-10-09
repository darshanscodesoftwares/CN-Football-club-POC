import { createTimeline, cubicBezier, stagger, utils } from 'animejs'
import type { Timeline } from 'animejs'
import { useEffect, useRef } from 'react'
import ShinyText from '../../components/reactbits/ShinyText'
import { clamp } from '../../lib/math'
import { prefersReducedMotion } from '../../lib/motion'
import { currentScroll } from '../../lib/smoothScroll'
import { addTick } from '../../lib/ticker'
import { ABOUT_COPY } from './aboutCopy'
import type { StatIcon } from './aboutCopy'
import { BadgeIcon, CalendarIcon, PathwaysIcon } from './AboutIcons'
import './About.css'

const easeEnter = cubicBezier(0.16, 1, 0.3, 1)
const STAT_ICONS: Record<StatIcon, typeof BadgeIcon> = { pathways: PathwaysIcon, badge: BadgeIcon, calendar: CalendarIcon }
/** Largest drift of the photo, in px, as the section passes through the screen. */
const PARALLAX_PX = 36

/**
 * About section, arranged like the reference (Reference image 18): the copy on the left (eyebrow,
 * heading with React Bits ShinyText, paragraph, button, stats row) and the client's beach photo on
 * the right. The photo is shown whole and untouched at its natural ratio. A page-coloured layer
 * covers only its plain white surround (a mask built from the image), so the white meets the page
 * colour while every pixel of the photo itself stays exactly as supplied.
 * Reveals once on scroll-in; the photo drifts gently with the scroll.
 */
export function About() {
  const sectionRef = useRef<HTMLElement>(null)
  const mediaRef = useRef<HTMLDivElement>(null)
  const mediaInnerRef = useRef<HTMLDivElement>(null)

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
    const copy = q<HTMLElement>('.about__para, .about__cta')
    const stats = q<HTMLElement>('.about__stat')
    const dividers = q<HTMLElement>('.about__stat-divider')
    const rule = q<HTMLElement>('.about__stats-rule')
    const counters = q<HTMLElement>('[data-count]').map((el) => ({ el, to: Number(el.dataset.count), final: el.textContent ?? '' }))

    const fading = [...eyebrowText, ...title, ...copy, ...stats, mediaInner]
    utils.set(fading, { opacity: 0 })
    if (!reduce) {
      utils.set(eyebrowLine, { scaleX: 0 })
      utils.set([...rule], { scaleX: 0 })
      utils.set(dividers, { scaleY: 0 })
      utils.set([...eyebrowText, ...copy, ...stats], { translateY: 18 })
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
        .add(copy, { opacity: [0, 1], translateY: [18, 0], duration: 1000, delay: stagger(140) }, 420)
        .add(rule, { scaleX: [0, 1], duration: 1100 }, 620)
        .add(stats, { opacity: [0, 1], translateY: [18, 0], duration: 1000, delay: stagger(120) }, 700)
        .add(dividers, { scaleY: [0, 1], duration: 900, delay: stagger(120) }, 760)
        .add(mediaInner, { opacity: [0, 1], translateX: [48, 0], duration: 1600 }, 200)
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
          760,
        )
      }
    }

    // Play once, when a quarter of the section is on screen.
    const revealObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          timeline.play()
          revealObserver.disconnect()
        }
      },
      { threshold: 0.25 },
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
        const rect = section.getBoundingClientRect()
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
      for (const el of [...fading, ...eyebrowLine, ...rule, ...dividers, media]) el.removeAttribute('style')
      section.setAttribute('data-reveal', 'pending')
    }
  }, [])

  const { eyebrow, titleLines, paragraph, cta, ctaHref, stats, image } = ABOUT_COPY

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
              shineColor="#c9a24d"
              speed={3}
              delay={2.2}
              angle={120}
              shineWidth={34}
              softness={0.8}
              bands={1}
              glow={0}
              direction="right"
              easing="smooth"
              trigger="loop"
            >
              {titleLines.map((line) => (
                <span key={line} className="about__title-line">
                  {line}
                </span>
              ))}
            </ShinyText>
          </h2>

          <p className="about__para">
            {paragraph.map(([text, bold], index) => (bold ? <strong key={index}>{text}</strong> : <span key={index}>{text}</span>))}
          </p>

          <div className="about__cta">
            <a className="about-btn" href={ctaHref}>
              <span className="about-btn__face">
                <span className="about-btn__roll">
                  <span className="about-btn__label">{cta}</span>
                  <span className="about-btn__label" aria-hidden="true">
                    {cta}
                  </span>
                </span>
              </span>
            </a>
          </div>

          <div className="about__stats">
            <span className="about__stats-rule" aria-hidden="true" />
            <ul className="about__stats-list">
              {stats.map((stat, index) => {
                const Icon = STAT_ICONS[stat.icon]
                return (
                  <li key={stat.label} className="about__stat-item">
                    {index > 0 && <span className="about__stat-divider" aria-hidden="true" />}
                    <div className="about__stat">
                      <Icon className="about__stat-icon" />
                      <div className="about__stat-text">
                        <span className="about__stat-value" data-count={stat.count}>
                          {stat.value}
                        </span>
                        <span className="about__stat-label">{stat.label}</span>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
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
            <span className="about__matte" aria-hidden="true" style={{ ['--matte' as string]: `url(${image.matte})` }} />
          </div>
        </div>
      </div>
    </section>
  )
}
