import { CLUB } from '../../club'

/**
 * "Life at <club>" slides. The carousel alternates, and loops:
 *   single photo -> 3-panel hover accordion (React Bits AccordionGallery) -> single -> accordion ...
 *
 * Photos are free Pexels photos (../replace-image/gallery), sized and thumbnailed by
 * scripts/build-gallery.py. Frames crop to fit; `position` keeps the action in view, and matches
 * the focus the script crops the thumbnails around.
 */
export interface GalleryImage {
  src: string
  alt: string
  /** Activity line: the single photo's eyebrow, or the accordion panel's label. */
  label: string
  /** CSS object-position for this photo's crop (single frame or accordion panel). Default: centre. */
  position?: string
}

export type GallerySlide =
  | { kind: 'single'; id: string; thumb: string; image: GalleryImage; place: string }
  | {
      kind: 'accordion'
      id: string
      thumb: string
      images: readonly [GalleryImage, GalleryImage, GalleryImage]
    }

const VENUE = `${CLUB.name} · ${CLUB.city}`
const photo = (file: string) => `/media/gallery/${file}.jpg`

export const GALLERY_TITLE = `Life at ${CLUB.name}`

export const GALLERY_SLIDES: readonly GallerySlide[] = [
  {
    kind: 'single',
    id: 'squad',
    thumb: photo('01-squad-thumb'),
    place: VENUE,
    image: {
      src: photo('01-squad'),
      alt: 'The squad in black and yellow kit lined up for a team photo, green hills behind',
      label: 'Match-day squad',
      position: '50% 72%',
    },
  },
  {
    kind: 'accordion',
    id: 'squads',
    thumb: photo('02-squads-thumb'),
    images: [
      { src: photo('02-senior-squad'), alt: 'The senior squad in sky-blue kit posing for their team photo', label: 'Senior squad' },
      { src: photo('02-youth-squad'), alt: 'A youth squad in green and blue kit lined up by the stand', label: 'Youth squad', position: '50% 55%' },
      { src: photo('02-walking-out'), alt: 'Two young players in blue kit walking out of the tunnel with the match ball', label: 'Walking out', position: '58% 45%' },
    ],
  },
  {
    kind: 'single',
    id: 'dribbling',
    thumb: photo('03-dribbling-thumb'),
    place: VENUE,
    image: {
      src: photo('03-dribbling'),
      alt: 'A player dribbling through a line of orange cones on the training pitch',
      label: 'Dribbling drills',
      position: '52% 60%',
    },
  },
  {
    kind: 'accordion',
    id: 'goalkeeping',
    thumb: photo('04-goalkeeping-thumb'),
    images: [
      { src: photo('04-high-catch'), alt: 'A goalkeeper in green leaping above the attackers to catch a cross', label: 'High catches', position: '48% 40%' },
      { src: photo('04-diving-save'), alt: 'A goalkeeper diving across the goal to keep out a shot', label: 'Diving saves', position: '54% 45%' },
      { src: photo('04-full-stretch'), alt: 'A goalkeeper at full stretch, fingertips reaching for the ball', label: 'Full-stretch stops', position: '45% 55%' },
    ],
  },
  {
    kind: 'single',
    id: 'training',
    thumb: photo('05-training-thumb'),
    place: VENUE,
    image: {
      src: photo('05-training'),
      alt: 'Players in blue training kit working through a ball drill on the indoor pitch',
      label: 'Training sessions',
      position: '50% 45%',
    },
  },
  {
    kind: 'accordion',
    id: 'match-day',
    thumb: photo('06-match-day-thumb'),
    images: [
      { src: photo('06-on-the-ball'), alt: 'A young player in black and white stripes striking the ball on a dry pitch', label: 'On the ball', position: '50% 55%' },
      { src: photo('06-into-the-tackle'), alt: 'Two players racing each other for the ball during a match', label: 'Into the tackle', position: '50% 55%' },
      { src: photo('06-shielding'), alt: 'A player shielding the ball from a defender in front of goal', label: 'Shielding the ball', position: '52% 55%' },
    ],
  },
  {
    kind: 'single',
    id: 'grassroots',
    thumb: photo('07-grassroots-thumb'),
    place: VENUE,
    image: {
      src: photo('07-grassroots'),
      alt: 'Young children chasing the ball together in a small-sided game on the grass',
      label: 'Grassroots games',
      position: '50% 70%',
    },
  },
  {
    kind: 'accordion',
    id: 'drills',
    thumb: photo('08-drills-thumb'),
    images: [
      { src: photo('08-warm-up'), alt: 'A player stretching in a deep lunge before training', label: 'Warm-up & stretching', position: '45% 50%' },
      { src: photo('08-pole-drill'), alt: 'A player dribbling around an orange pole in an agility drill', label: 'Agility poles', position: '50% 33%' },
      { src: photo('08-recovery'), alt: 'A goalkeeper sliding across the grass after diving for the ball', label: 'Recovery saves', position: '45% 60%' },
    ],
  },
]

/** Labels shown in thumbnail tooltips and screen-reader names. */
export const slideLabels = (slide: GallerySlide) =>
  slide.kind === 'single' ? [slide.image.label] : slide.images.map((image) => image.label)
