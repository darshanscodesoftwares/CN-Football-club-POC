import { CLUB } from '../../club'

/**
 * About section copy: eyebrow, three-line heading (the last line highlighted), paragraph, two
 * buttons, the photo, the four sport programmes and the stats band. Placeholder content for the
 * pitch demo.
 * Each paragraph is a list of [text, bold?] runs; bold runs render as <strong>.
 */
export type Run = readonly [text: string, bold?: boolean]

export type SportIcon = 'football' | 'cricket' | 'badminton' | 'futsal'

export interface Programme {
  icon: SportIcon
  name: string
  blurb: string
  ages: string
}

export interface Stat {
  value: string
  /** When set, the value counts up from 0 to this number on reveal. */
  count?: number
  label: string
}

export const ABOUT_COPY = {
  eyebrow: 'About us',
  titleLines: ['One club.', 'Every game.', 'Every player.'],
  paragraph: [
    [`${CLUB.name} is a `],
    ['multi-sport academy', true],
    [' where young players learn to '],
    ['love the game', true],
    [' first, then grow into it. Football, cricket, badminton and futsal, all coached with one philosophy: '],
    ['technique, character and confidence', true],
    [', built session by session.'],
  ] as readonly Run[],
  cta: { label: 'Join a programme', href: '#join' },
  secondary: { label: 'Meet our coaches', href: '#coaches' },
  programmesLabel: 'Our programmes',
  programmes: [
    { icon: 'football', name: 'Football', blurb: 'Grassroots to competitive squads, with weekly fixtures.', ages: 'Ages 5–19' },
    { icon: 'cricket', name: 'Cricket', blurb: 'Net sessions, batting and bowling technique, match play.', ages: 'Ages 7–19' },
    { icon: 'badminton', name: 'Badminton', blurb: 'Footwork, strokes and junior tournament preparation.', ages: 'Ages 6–18' },
    { icon: 'futsal', name: 'Futsal', blurb: 'Fast small-sided play that sharpens touch and decisions.', ages: 'Ages 6–16' },
  ] as readonly Programme[],
  image: {
    /** Colour-graded by scripts/build-about-image.py from ../replace-image/about. */
    src: '/media/about/beach-graded.jpg',
    /** Marks only the photo's plain white surround; see About.css. */
    matte: '/media/about/beach-matte.png',
    width: 862,
    height: 485,
    alt: 'A player striking the ball on the beach at sunset, sand spraying from his kick',
  },
  stats: [
    { value: '4', count: 4, label: 'Sports, one academy' },
    { value: 'U-6 to U-19', label: 'Age-group squads' },
    { value: 'Since 2017', label: 'Coaching young players' },
    { value: '6', count: 6, label: 'Training days a week' },
  ] as readonly Stat[],
}
