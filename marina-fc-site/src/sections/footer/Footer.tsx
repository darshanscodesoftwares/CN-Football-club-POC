import '@fontsource-variable/plus-jakarta-sans'
import '@fontsource-variable/roboto-flex/opsz.css'
import { createTimeline, cubicBezier, stagger, utils } from 'animejs'
import { useEffect, useRef } from 'react'
import type { CSSProperties } from 'react'
import { ClubCrest } from '../../components/ClubCrest'
import { CLUB } from '../../club'
import VariableProximity from '../../components/reactbits/VariableProximity'
import { prefersReducedMotion } from '../../lib/motion'
import { usePaperSurface } from '../../lib/paperPattern'
import { FOOTER_COPY } from './footerCopy'
import type { ContactIcon, SocialIcon } from './footerCopy'
import { FacebookIcon, InstagramIcon, MailIcon, PhoneIcon, PinIcon, YouTubeIcon } from './FooterIcons'
import './Footer.css'

const SOCIAL_ICONS: Record<SocialIcon, typeof InstagramIcon> = {
  instagram: InstagramIcon,
  youtube: YouTubeIcon,
  facebook: FacebookIcon,
}
const CONTACT_ICONS: Record<ContactIcon, typeof PinIcon> = { mail: MailIcon, phone: PhoneIcon, pin: PinIcon }

const easeEnter = cubicBezier(0.16, 1, 0.3, 1)

/**
 * Site footer. On the page's patterned wall: the brand column (crest, name, tagline, socials), the
 * "Explore" links and a navy "Get in touch" card (email, phone, location) in the kit's lime
 * accents. Below, the pitch photo whole (original file, natural size, toned down with a display
 * filter) with a soft lime glow on the centre circle, a huge club name that fades out downwards,
 * the ink vignette, and the legal bar with a back-to-top button.
 */
export function Footer() {
  const rootRef = useRef<HTMLElement>(null)
  const wordRef = useRef<HTMLDivElement>(null)
  const skyRef = useRef<HTMLSpanElement>(null)
  usePaperSurface(skyRef)
  // VariableProximity measures its letters whenever the mouse moves anywhere on the page. It only
  // gets its container while the footer is near the screen, so nothing runs during the hero scroll.
  const proximityRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const root = rootRef.current
    const word = wordRef.current
    if (!root || !word) return
    const reduce = prefersReducedMotion()
    // The letters VariableProximity renders (each one is aria-hidden; the label is read once).
    const letters = Array.from(word.querySelectorAll<HTMLElement>('span[aria-hidden="true"]'))
    const near = new IntersectionObserver(
      (entries) => {
        proximityRef.current = entries.some((entry) => entry.isIntersecting) ? word : null
      },
      { rootMargin: '200px 0px' },
    )
    near.observe(root)
    const items = Array.from(root.querySelectorAll<HTMLElement>('[data-footer-reveal]'))

    utils.set([...items, ...letters], { opacity: 0 })
    if (!reduce) {
      utils.set(items, { translateY: 14 })
      utils.set(letters, { translateY: '35%', filter: 'blur(10px)' })
    }
    root.removeAttribute('data-reveal')

    const timeline = createTimeline({ autoplay: false, defaults: { ease: easeEnter } })
    if (reduce) {
      timeline.add([...items, ...letters], { opacity: [0, 1], duration: 500 }, 0)
    } else {
      timeline
        .add(items, { opacity: [0, 1], translateY: [14, 0], duration: 1000, delay: stagger(60) }, 0)
        .add(
          letters,
          {
            opacity: [0, 1],
            translateY: ['35%', '0%'],
            filter: ['blur(10px)', 'blur(0px)'],
            duration: 1300,
            delay: stagger(70),
            onComplete: () => letters.forEach((letter) => letter.style.removeProperty('filter')),
          },
          250,
        )
    }
    // Play once, when the footer is a fifth on screen.
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          timeline.play()
          observer.disconnect()
        }
      },
      { threshold: 0.2 },
    )
    observer.observe(root)

    return () => {
      observer.disconnect()
      near.disconnect()
      proximityRef.current = null
      timeline.revert()
      for (const el of items) el.removeAttribute('style')
      root.setAttribute('data-reveal', 'pending')
    }
  }, [])

  const { tagline, socials, navLabel, nav, contactLabel, contact, watermark, copyright, crafted, legal, backToTop } = FOOTER_COPY

  return (
    <footer ref={rootRef} className="site-footer" id="contact" data-reveal="pending">
      <span className="site-footer__beam" aria-hidden="true" />

      {/* ------------------------------------------------------ band */}
      <div className="site-footer__band">
        <div className="site-footer__inner site-footer__grid">
          <div className="site-footer__brand-col" data-footer-reveal>
            <a className="site-footer__brand" href="#top" aria-label={`${CLUB.shortName}, back to top`}>
              <ClubCrest className="site-footer__crest" />
              <span className="site-footer__name">{CLUB.shortName}</span>
            </a>
            <p className="site-footer__tagline">{tagline}</p>
            <ul className="site-footer__socials">
              {socials.map((social) => {
                const Icon = SOCIAL_ICONS[social.icon]
                return (
                  <li key={social.label}>
                    <a className="site-footer__social" href={social.href} aria-label={social.label}>
                      <Icon />
                    </a>
                  </li>
                )
              })}
            </ul>
          </div>

          <nav className="site-footer__nav" aria-labelledby="footer-nav-title" data-footer-reveal>
            <p id="footer-nav-title" className="site-footer__heading">
              {navLabel}
            </p>
            <ul className="site-footer__links">
              {nav.map((item) => (
                <li key={item.label}>
                  <a className="site-footer__link" href={item.href}>
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="site-footer__contact" data-footer-reveal>
            <p className="site-footer__heading site-footer__heading--light">{contactLabel}</p>
            <ul className="site-footer__contact-list">
              {contact.map((item) => {
                const Icon = CONTACT_ICONS[item.icon]
                return (
                  <li key={item.label}>
                    <a className="site-footer__contact-item" href={item.href}>
                      <span className="site-footer__contact-icon">
                        <Icon />
                      </span>
                      <span className="site-footer__contact-text">
                        <span className="site-footer__contact-value">{item.value}</span>
                        <span className="site-footer__contact-label">{item.label}</span>
                      </span>
                    </a>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      </div>

      {/* --------------------------------------------------- the pitch */}
      <div className="site-footer__field">
        <div className="site-footer__frame">
          <img className="site-footer__pitch" src="/media/footer/ground.png" alt="" width={1329} height={480} loading="lazy" decoding="async" />
          <span ref={skyRef} className="site-footer__sky paper-surface" aria-hidden="true" />
          <span className="site-footer__glow" aria-hidden="true" />
          <span className="site-footer__vignette" aria-hidden="true" />
          <div
            ref={wordRef}
            className="site-footer__word"
            style={{ '--word-chars': watermark.length } as CSSProperties}
            aria-hidden="true"
          >
            {/* Letters swell toward the cursor (React Bits VariableProximity on Roboto Flex). */}
            <VariableProximity
              label={watermark}
              fromFontVariationSettings="'wght' 600, 'opsz' 9"
              toFontVariationSettings="'wght' 1000, 'opsz' 40"
              containerRef={proximityRef}
              radius={170}
              falloff="linear"
              style={{ fontFamily: "'Roboto Flex Variable', 'Roboto Flex', sans-serif" }}
            />
          </div>
        </div>

        <div className="site-footer__inner site-footer__bottom">
          <div className="site-footer__bar" data-footer-reveal>
            <p className="site-footer__legal">
              <span>{copyright}</span>
              <span className="site-footer__sep" aria-hidden="true">
                ·
              </span>
              <span>{crafted}</span>
            </p>
            <div className="site-footer__bar-end">
              <ul className="site-footer__legal site-footer__legal--links">
                {legal.map((item) => (
                  <li key={item.label}>
                    <a className="site-footer__bar-link" href={item.href}>
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
              <a className="site-footer__top-btn" href="#top" aria-label={backToTop}>
                <svg viewBox="0 0 16 16" aria-hidden="true">
                  <path d="M8 13V3M4 7l4-4 4 4" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
