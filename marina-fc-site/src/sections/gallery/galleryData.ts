/**
 * "Life at Marina FC" slides. The carousel alternates, and loops:
 *   single photo -> 3-panel hover accordion (React Bits AccordionGallery) -> single -> accordion ...
 *
 * Photos are the client's (Reference/images_for_collage), at their supplied size and framing,
 * saved as full-colour JPEG for page weight (visually identical: 42-45 dB PSNR against the PNGs).
 * The goalkeeping slide keeps stills from the photoreal video, because the supplied set has no
 * goalkeeping action shots. Frames crop to fit; `position` keeps faces in view where needed.
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

const VENUE = 'Marina FC · Chennai'
const photo = (file: string) => `/media/gallery/${file}.jpg`
const still = (file: string) => `/media/gallery/${file}.webp`

export const GALLERY_TITLE = 'Life at Marina FC'

export const GALLERY_SLIDES: readonly GallerySlide[] = [
  {
    kind: 'single',
    id: 'floodlit-squad',
    thumb: photo('01-floodlit-squad-thumb'),
    place: VENUE,
    image: {
      src: photo('01-floodlit-squad'),
      alt: 'The Marina FC squad and coaches lined up on the floodlit turf at night',
      label: 'Under the floodlights',
      position: '50% 60%',
    },
  },
  {
    kind: 'accordion',
    id: 'squads',
    thumb: photo('02-squads-thumb'),
    images: [
      { src: photo('02-grassroots-squad'), alt: 'Young grassroots players with their coaches on the training pitch', label: 'Grassroots squad' },
      { src: photo('02-matchday-squad'), alt: 'Players in the Marina kit with coaches and a trophy in front of the goal', label: 'Match-day squad' },
      { src: photo('02-training-squad'), alt: 'Players in orange training kit with their coaches on the turf', label: 'Training squad' },
    ],
  },
  {
    kind: 'single',
    id: 'speed-agility',
    thumb: photo('03-speed-agility-thumb'),
    place: VENUE,
    image: {
      src: photo('03-speed-agility'),
      alt: 'Players in orange kit sprinting off the line in a speed drill',
      label: 'Speed & agility drills',
      position: '50% 58%',
    },
  },
  {
    kind: 'accordion',
    id: 'goalkeeping',
    thumb: still('04-goalkeeping-thumb'),
    images: [
      { src: still('04-goalkeeping-a'), alt: 'Goalkeeper standing ready in front of goal', label: 'Goalkeeping fundamentals' },
      { src: still('04-goalkeeping-b'), alt: 'Goalkeeper diving to make a save', label: 'Shot-stopping drills' },
      { src: still('04-goalkeeping-c'), alt: 'Goalkeeper landing after a full-stretch save', label: 'Full-stretch saves' },
    ],
  },
  {
    kind: 'single',
    id: 'coaching-team',
    thumb: photo('05-coaching-team-thumb'),
    place: VENUE,
    image: {
      src: photo('05-coaching-team'),
      alt: 'The Marina FC coaching team, arms folded, the head coach holding a ball',
      label: 'Our coaching team',
      position: '50% 20%',
    },
  },
  {
    kind: 'accordion',
    id: 'awards',
    thumb: photo('06-awards-thumb'),
    images: [
      { src: photo('06-trophy-day'), alt: 'Players and a coach pointing to the trophies they won', label: 'Trophy day', position: '50% 38%' },
      {
        src: photo('06-goalkeeper-award'),
        alt: 'A young goalkeeper holding his trophy and medal in front of the goal',
        label: "Goalkeeper's award",
        position: '50% 16%',
      },
      { src: photo('06-certificates'), alt: 'Players holding their certificates beside a trophy, with their coach', label: 'Certificates of merit', position: '50% 40%' },
    ],
  },
  {
    kind: 'single',
    id: 'celebrating',
    thumb: photo('07-celebrating-thumb'),
    place: VENUE,
    image: {
      src: photo('07-celebrating'),
      alt: 'Coaches and players gathered around their trophies at sunset',
      label: 'Celebrating together',
      position: '50% 35%',
    },
  },
  {
    kind: 'accordion',
    id: 'spirit',
    thumb: photo('08-spirit-thumb'),
    images: [
      { src: photo('08-squad-spirit'), alt: 'Players arm in arm at the stadium', label: 'Squad spirit' },
      { src: photo('08-u11-award'), alt: 'The under-11 team and coaches receiving the Best Management award', label: 'U-11 Best Management award' },
      { src: photo('08-kick-off'), alt: 'Players lined up with their goalkeeper at the front', label: 'Ready for kick-off' },
    ],
  },
]

/** Labels shown in thumbnail tooltips and screen-reader names. */
export const slideLabels = (slide: GallerySlide) =>
  slide.kind === 'single' ? [slide.image.label] : slide.images.map((image) => image.label)
