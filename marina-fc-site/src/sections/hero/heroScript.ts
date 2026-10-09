/**
 * Copy and choreography shared by every hero video. Per-video timing (how scroll maps onto
 * that video, and where its captions sit) lives in heroVideos.ts.
 *
 * Choreography follows the neidhalfc.com reference: the picture holds still while the opening
 * copy lifts away, captions fade in on scroll and their words reveal on a timer, and the last
 * caption stays until the hero scrolls off.
 */

/** Total height of the hero section in viewport heights; one of them is the sticky stage. */
export const HERO_LENGTH_VH = 800

/** Scroll range over which the opening headline, copy and buttons lift away. */
export const INTRO_OUT: readonly [number, number] = [0.004, 0.055]

/** The crest and wordmark hide once the page has scrolled this far (px), as on the reference. */
export const BRAND_HIDE_AFTER_PX = 80

/** Share of each caption's range spent fading in (and out). */
export const CAPTION_FADE = 0.16

export const HERO_COPY = {
  brand: 'MARINA FC',
  titleLines: ['From Grassroots', 'to Competitive.'],
  lede: 'A professional football ecosystem for young players, with AIFF/AFC-standard coaching, all-weather training and clear competitive pathways.',
  cta: 'Join our club today',
  ctaHref: '#join',
  skip: 'Skip intro',
  switchVideo: 'Switch video',
} as const

/** Caption copy, written once and placed per video. */
export const CAPTION_COPY = {
  grassroots: {
    heading: 'It Starts at the Grassroots',
    body: 'Since 2017 we have guided young players from their very first touch to a lifelong love of the game.',
  },
  academy: {
    heading: 'Developing Complete Footballers',
    body: 'Every session follows a structured progression: warm-up, strengthening, technical work, game model, cool down and de-brief.',
  },
  competitive: {
    heading: 'Clear Pathways to Competitive Football',
    body: 'AIFF/AFC licensed coaches, weekly competitive fixtures and scout showcase matches.',
  },
  welcome: {
    heading: 'Welcome to Marina Football Club',
    body: 'Growing players with technical ability, character and the confidence to compete at every stage.',
  },
} as const

export type CaptionCopyId = keyof typeof CAPTION_COPY
