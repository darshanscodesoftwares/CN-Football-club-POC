import '@fontsource-variable/plus-jakarta-sans'
import '@fontsource-variable/roboto-flex/opsz.css'
import { createTimeline, cubicBezier, stagger, utils } from 'animejs'
import { useEffect, useRef } from 'react'
import { MarinaCrest } from '../../components/MarinaCrest'
import VariableProximity from '../../components/reactbits/VariableProximity'
import { prefersReducedMotion } from '../../lib/motion'
import { FOOTER_COPY } from './footerCopy'
import type { PlaceIcon, SocialIcon } from './footerCopy'
import { ArrowUpRightSmall, FacebookIcon, InstagramIcon, MailIcon, PhoneIcon, PinIcon, YouTubeIcon } from './FooterIcons'
import './Footer.css'

const SOCIAL_ICONS: Record<SocialIcon, typeof InstagramIcon> = {
  instagram: InstagramIcon,
  youtube: YouTubeIcon,
  facebook: FacebookIcon,
}
const PLACE_ICONS: Record<PlaceIcon, typeof PinIcon> = { pin: PinIcon, phone: PhoneIcon }

const easeEnter = cubicBezier(0.16, 1, 0.3, 1)

/**
 * Site footer laid out like the reference (Reference/image.png): a band in the site's own paper
 * colour carries the crest, tagline, socials, links and the enquiries email; below it the client's
 * pitch photo is shown whole (original file, natural size), toned down on request with a display
 * filter, with a huge club name that fades out downwards, the academy's location and phone, and
 * the legal bar.
 */
export function Footer() {
  const rootRef = useRef<HTMLElement>(null)
  const wordRef = useRef<HTMLDivElement>(null)
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

  const { tagline, followLabel, socials, nav, email, emailLabel, watermark, places, copyright, crafted, legal } = FOOTER_COPY

  return (
    <footer ref={rootRef} className="site-footer" data-reveal="pending">
      {/* ------------------------------------------------------ band */}
      <div className="site-footer__band">
        <div className="site-footer__inner">
          <div className="site-footer__top">
            <a className="site-footer__brand" href="#top" data-footer-reveal aria-label="Marina Football Club, back to top">
              <MarinaCrest className="site-footer__crest" />
              <span className="site-footer__tagline">{tagline}</span>
            </a>
            <div className="site-footer__follow" data-footer-reveal>
              <p className="site-footer__follow-label">{followLabel}</p>
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
          </div>

          <div className="site-footer__row">
            <nav className="site-footer__nav" aria-label="Footer">
              {nav.map((item) => (
                <a key={item.label} className="site-footer__link" href={item.href} data-footer-reveal>
                  {item.label}
                </a>
              ))}
            </nav>
            <a className="site-footer__mail" href={`mailto:${email}`} data-footer-reveal>
              <span className="site-footer__mail-icon">
                <MailIcon />
              </span>
              <span className="site-footer__mail-text">
                <span className="site-footer__mail-address">{email}</span>
                <span className="site-footer__mail-label">{emailLabel}</span>
              </span>
            </a>
          </div>
        </div>
      </div>

      {/* --------------------------------------------------- the pitch */}
      <div className="site-footer__field">
      <div className="site-footer__frame">
        <img className="site-footer__pitch" src="/media/footer/ground.png" alt="" width={1329} height={480} loading="lazy" decoding="async" />
        <span className="site-footer__sky" aria-hidden="true" />
        <span className="site-footer__vignette" aria-hidden="true" />
        <div ref={wordRef} className="site-footer__word" aria-hidden="true">
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

      <ul className="site-footer__places">
        {places.map((place) => {
          const Icon = PLACE_ICONS[place.icon]
          return (
            <li key={place.name} data-footer-reveal>
              <a className="site-footer__place" href={place.href}>
                <Icon className="site-footer__place-icon" />
                <span className="site-footer__place-name">{place.name}</span>
                <span className="site-footer__place-detail">· {place.detail}</span>
                <ArrowUpRightSmall className="site-footer__place-arrow" />
              </a>
            </li>
          )
        })}
      </ul>

      <div className="site-footer__inner site-footer__bottom">
        <hr className="site-footer__rule" />
        <div className="site-footer__bar" data-footer-reveal>
          <p className="site-footer__legal">
            <span>{copyright}</span>
            <span className="site-footer__sep" aria-hidden="true">
              |
            </span>
            <span>{crafted}</span>
          </p>
          <ul className="site-footer__legal site-footer__legal--links">
            {legal.map((item) => (
              <li key={item.label}>
                <a className="site-footer__bar-link" href={item.href}>
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
      </div>
    </footer>
  )
}
