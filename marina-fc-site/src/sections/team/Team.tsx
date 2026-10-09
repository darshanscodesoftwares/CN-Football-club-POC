import { createTimeline, cubicBezier, stagger, utils } from 'animejs'
import type { Timeline } from 'animejs'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import { prefersReducedMotion } from '../../lib/motion'
import { COACHES, TEAM_COPY, TEAM_LAYOUT } from './teamData'
import type { Coach, CoachId } from './teamData'
import './Team.css'

const easeEnter = cubicBezier(0.16, 1, 0.3, 1)
const { portrait, people } = TEAM_LAYOUT
/** Space between a person and their card, in % of the picture width. */
const CARD_GAP = 2.5

function AwardIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="9" r="5.5" />
      <path d="m8.6 13.4-1.6 7.1 5-2.6 5 2.6-1.6-7.1" />
    </svg>
  )
}

/** Card placement: beside the person, on the side with open space. */
function cardStyle(coach: Coach): CSSProperties {
  const box = people[coach.id].box
  return coach.side === 'right'
    ? ({ '--card-left': `${box.right + CARD_GAP}%` } as CSSProperties)
    : ({ '--card-right': `${100 - box.left + CARD_GAP}%` } as CSSProperties)
}

/**
 * "Our coaches": the client's team portrait with each person's own cutout stacked exactly over
 * them (aligned by scripts/build-team.py). Hovering a person (tapping on touch screens, focusing
 * with the keyboard) blurs and softens the portrait, lifts that person's cutout forward and opens
 * their card. The portrait's white background meets the page colour through the same masked
 * matte as the About photo, so the people themselves are never tinted.
 */
export function Team() {
  const [active, setActive] = useState<CoachId | null>(null)
  const sectionRef = useRef<HTMLElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef(new Map<CoachId, HTMLElement>())
  const lastPointer = useRef<string>('mouse')

  const open = useCallback((id: CoachId) => setActive(id), [])
  const close = useCallback(() => setActive(null), [])

  // ------------------------------------------------------------ reveal on scroll-in
  useEffect(() => {
    const section = sectionRef.current
    if (!section) return
    const reduce = prefersReducedMotion()
    const head = Array.from(section.querySelectorAll<HTMLElement>('.team__eyebrow, .team__title, .team__hint'))
    const frame = section.querySelector<HTMLElement>('.team__frame')
    if (!frame) return
    utils.set([...head, frame], { opacity: 0 })
    if (!reduce) {
      utils.set(head, { translateY: 18 })
      utils.set(frame, { translateY: 36, scale: 0.985 })
    }
    section.removeAttribute('data-reveal')
    const timeline: Timeline = createTimeline({
      autoplay: false,
      defaults: { ease: easeEnter },
      onComplete: () => {
        // Hand the frame back to CSS so hover transitions are not fighting inline styles.
        frame.style.removeProperty('transform')
        frame.style.removeProperty('opacity')
      },
    })
    if (reduce) {
      timeline.add([...head, frame], { opacity: [0, 1], duration: 500 }, 0)
    } else {
      timeline
        .add(head, { opacity: [0, 1], translateY: [18, 0], duration: 1000, delay: stagger(110) }, 0)
        .add(frame, { opacity: [0, 1], translateY: [36, 0], scale: [0.985, 1], duration: 1400 }, 250)
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
      // Only the properties the reveal sets (React owns the rest of these style attributes).
      for (const el of [...head, frame]) {
        for (const prop of ['opacity', 'transform', 'filter']) el.style.removeProperty(prop)
      }
      section.setAttribute('data-reveal', 'pending')
    }
  }, [])

  // -------------------------------------- decode the cutouts before the first hover
  useEffect(() => {
    const section = sectionRef.current
    if (!section) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return
        observer.disconnect()
        for (const img of section.querySelectorAll<HTMLImageElement>('.team__cutout img, .team__portrait')) {
          img.loading = 'eager'
          void img.decode().catch(() => undefined)
        }
      },
      { rootMargin: '900px 0px' },
    )
    observer.observe(section)
    return () => observer.disconnect()
  }, [])

  // ----------------------------------------------- card contents rise in, in turn
  useEffect(() => {
    if (!active) return
    const card = cardRefs.current.get(active)
    if (!card) return
    const items = Array.from(card.querySelectorAll<HTMLElement>('[data-card-item]'))
    if (prefersReducedMotion()) return
    const timeline = createTimeline({ defaults: { ease: easeEnter } }).add(items, {
      opacity: [0, 1],
      translateY: [14, 0],
      duration: 700,
      delay: stagger(55, { start: 90 }),
    })
    return () => {
      timeline.revert()
    }
  }, [active])

  // ------------------------------------------- close on Escape, or a tap elsewhere
  useEffect(() => {
    if (!active) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    const onPointerDown = (event: PointerEvent) => {
      const stage = stageRef.current
      if (stage && !stage.contains(event.target as Node)) close()
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onPointerDown)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onPointerDown)
    }
  }, [active, close])

  const onHitEnter = (id: CoachId) => (event: ReactPointerEvent) => {
    lastPointer.current = event.pointerType
    if (event.pointerType !== 'touch') open(id)
  }
  const onHitClick = (id: CoachId) => () => {
    // Touch and keyboard toggle; a mouse already opened the card on hover.
    if (lastPointer.current === 'mouse' && active === id) return
    setActive((current) => (current === id ? null : id))
  }
  const onStageLeave = (event: ReactPointerEvent) => {
    if (event.pointerType !== 'touch') close()
  }

  const activeCoach = COACHES.find((coach) => coach.id === active)

  return (
    <section ref={sectionRef} className="team" id="coaches" aria-labelledby="team-title" data-reveal="pending">
      <header className="team__head">
        <p className="team__eyebrow">
          <span className="team__eyebrow-line" aria-hidden="true" />
          <span>{TEAM_COPY.eyebrow}</span>
        </p>
        <h2 id="team-title" className="team__title">
          {TEAM_COPY.title}
        </h2>
        <p className="team__hint">
          <span className="team__hint--hover">{TEAM_COPY.hintHover}</span>
          <span className="team__hint--tap">{TEAM_COPY.hintTap}</span>
        </p>
      </header>

      <div
        ref={stageRef}
        className="team__stage"
        data-active={active ?? undefined}
        onPointerLeave={onStageLeave}
        style={{ ['--team-ratio' as string]: `${portrait.width} / ${portrait.height}` }}
      >
        <div className="team__frame">
          <img
            className="team__portrait"
            src={portrait.src}
            alt="The Marina FC coaching team: Mohan, founder Masthan Maharaj with a ball, Vijay and Sathish"
            width={portrait.width}
            height={portrait.height}
            loading="lazy"
            decoding="async"
            draggable={false}
          />
          <img className="team__portrait team__portrait--soft" src={portrait.src} alt="" aria-hidden="true" loading="lazy" decoding="async" draggable={false} />
          <span className="team__matte" aria-hidden="true" style={{ ['--matte' as string]: `url(${portrait.matte})` }} />
          <span className="team__veil" aria-hidden="true" />

          {COACHES.map((coach) => {
            const { cutout, place } = people[coach.id]
            return (
              <div
                key={coach.id}
                className={`team__cutout${active === coach.id ? ' is-on' : ''}`}
                aria-hidden="true"
                style={{ left: `${place.left}%`, top: `${place.top}%`, width: `${place.width}%`, rotate: `${place.rotate}deg` }}
              >
                <img src={cutout.src} alt="" width={cutout.width} height={cutout.height} loading="lazy" decoding="async" draggable={false} />
              </div>
            )
          })}

          <span className="team__fade" aria-hidden="true" />

          {COACHES.map((coach) => (
            <button
              key={coach.id}
              type="button"
              className="team__hit"
              style={{ clipPath: people[coach.id].hit }}
              aria-label={`${coach.name}, ${coach.role}`}
              aria-expanded={active === coach.id}
              aria-controls={`coach-${coach.id}`}
              onPointerEnter={onHitEnter(coach.id)}
              onPointerDown={(event) => (lastPointer.current = event.pointerType)}
              onKeyDown={() => (lastPointer.current = 'keyboard')}
              onFocus={(event) => {
                if (event.currentTarget.matches(':focus-visible')) open(coach.id)
              }}
              onClick={onHitClick(coach.id)}
            />
          ))}
        </div>

        {COACHES.map((coach) => (
          <article
            key={coach.id}
            id={`coach-${coach.id}`}
            ref={(el) => {
              if (el) cardRefs.current.set(coach.id, el)
              else cardRefs.current.delete(coach.id)
            }}
            className={`team__card team__card--${coach.side}${active === coach.id ? ' is-on' : ''}`}
            style={cardStyle(coach)}
            aria-label={coach.name}
          >
            <p className="team__badge" data-card-item>
              <span className="team__badge-line" aria-hidden="true" />
              {coach.badge}
            </p>
            <h3 className="team__name" data-card-item>
              {coach.name}
            </h3>
            <p className="team__role" data-card-item>
              {coach.role}
            </p>
            <p className="team__label" data-card-item>
              {TEAM_COPY.qualificationsLabel}
            </p>
            <ul className="team__quals">
              {coach.qualifications.map((item) => (
                <li key={item} data-card-item>
                  <AwardIcon />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="team__bio" data-card-item>
              {coach.bio}
            </p>
            <p className="team__label" data-card-item>
              {TEAM_COPY.specializationLabel}
            </p>
            <p className="team__spec" data-card-item>
              {coach.specialization}
            </p>
          </article>
        ))}

        <div className="team__chips" role="group" aria-label="Coaches">
          {COACHES.map((coach) => (
            <button
              key={coach.id}
              type="button"
              className="team__chip"
              aria-pressed={active === coach.id}
              onClick={() => setActive((current) => (current === coach.id ? null : coach.id))}
            >
              {coach.name}
            </button>
          ))}
        </div>
        <span className="team__sr" aria-live="polite">
          {activeCoach ? `${activeCoach.name}, ${activeCoach.role}` : ''}
        </span>
      </div>
    </section>
  )
}
