/**
 * About section copy (Marina FC), arranged like the reference (Reference/image 18): eyebrow,
 * three-line heading, paragraph, button and a three-part stats row, with the beach photo beside it.
 * Each paragraph is a list of [text, bold?] runs; bold runs render as <strong>.
 *
 * The stats come from the client's own site (pathway cards, about bullets, hero badge). The
 * reference mock-up showed "10K+ players hosted" and "3 turf locations", which do not appear in
 * any Marina material, so they were not used.
 */
export type Run = readonly [text: string, bold?: boolean]

export type StatIcon = 'pathways' | 'badge' | 'calendar'

export interface Stat {
  icon: StatIcon
  value: string
  /** When set, the value counts up from 0 to this number on reveal. */
  count?: number
  label: string
}

export const ABOUT_COPY = {
  eyebrow: 'About us',
  titleLines: ['Developing complete', 'footballers on & off', 'the pitch'],
  paragraph: [
    ['At Marina Football Club, football is a vehicle for '],
    ['personal growth', true],
    [', '],
    ['resilience', true],
    [', and '],
    ['athletic mastery', true],
    ['. Our '],
    ['360-degree philosophy', true],
    [' balances '],
    ['technical excellence', true],
    [' with '],
    ['character building', true],
    ['.'],
  ] as readonly Run[],
  cta: 'More About Us',
  ctaHref: '#about',
  stats: [
    { icon: 'pathways', value: '4', count: 4, label: 'Development pathways' },
    { icon: 'badge', value: 'AIFF/AFC', label: 'Licensed coaches' },
    { icon: 'calendar', value: 'Since 2017', label: 'Grassroots to competitive' },
  ] as readonly Stat[],
  image: {
    src: '/media/about/beach-sunset.png',
    /** Marks only the photo's plain white surround (npm run matte:about); see About.css. */
    matte: '/media/about/beach-sunset-matte.png',
    width: 862,
    height: 485,
    alt: 'A young player strikes the ball on a beach at sunset',
  },
} as const
