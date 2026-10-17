/**
 * Hero videos available in the demo. The first entry is the default; the round switch button
 * next to "Skip intro" cycles through them, and `?video=<id>` in the URL opens a specific one.
 *
 * To keep a single video later: delete the other entry (and its frames folder). The switch
 * button only renders when there is more than one video.
 *
 * Frames come from `npm run frames:gemini`, `frames:vis` and `frames:gemini-new` (see package.json).
 */
import type { FrameSet } from './frameSequence'
import type { CaptionCopyId } from './heroScript'
import gemini from './videos/gemini.frames.json'
import geminiNew from './videos/gemini-new.frames.json'
// Night-stadium video switched off for now (see the commented entry below); its frames stay on disk.
// import googleVis from './videos/google-vis.frames.json'

export interface FramesManifest {
  id: string
  version: string
  fps: number
  frameCount: number
  /** Horizontal focus used for the portrait crop (0 = left, 1 = right). */
  focus: number
  poster: string
  sets: { desktop: FrameSet; mobile: FrameSet }
}

/** Caption positions, named after the reference's classes. */
export type CaptionPlacement = 'story-left' | 'story-right' | 'story-center-bottom' | 'story-conclusion'

export interface HeroCaption {
  copy: CaptionCopyId
  /** Scroll range in which the caption enters, holds and leaves. An end above 1 means it never leaves. */
  range: readonly [number, number]
  placement: CaptionPlacement
  /** Vertical centre for side placements (CSS length); defaults to 30%. */
  top?: string
  /** "ink" is navy with a light haze; "light" is white with a dark haze. */
  tone: 'ink' | 'light'
}

export interface HeroVideo {
  id: string
  label: string
  frames: FramesManifest
  /** Bright footage keeps the navy type; dark footage switches the hero copy to white. */
  footage: 'bright' | 'dark'
  /** Vertical anchor of the cover crop (0 = top, 1 = bottom). */
  focusY: number
  /** Scroll progress (0–1) to video time (seconds), piecewise-linear. */
  timeMap: ReadonlyArray<readonly [number, number]>
  captions: readonly HeroCaption[]
}

const lastFrameTime = (frames: FramesManifest) => (frames.frameCount - 1) / frames.fps

export const HERO_VIDEOS: readonly HeroVideo[] = [
  {
    // The default: the newer anime cut of the story (gemini_HD-new.mp4), mirrored so the right
    // side stays clear for the headline. It ends on the goal rather than a celebration.
    id: 'gemini-new',
    label: 'Gemini (new)',
    frames: geminiNew,
    footage: 'bright',
    focusY: 0.35,
    timeMap: [
      [0, 0],
      [0.06, 0.12], // nearly still while the opening copy leaves
      [0.22, 2.6], // beach dribble, the ball kicked skyward, then the whip to the street
      [0.31, 3.8], // street game, then through the academy gate
      [0.47, 5.25], // academy match, then the sunburst
      [0.66, 7.7], // stadium reveal and dribble, then the close-up
      [0.74, 8.5], // determined close-up, then the power kick
      [0.83, 9.15], // the strike, then the ball bursting into the net
      [0.94, lastFrameTime(geminiNew)],
      [1, lastFrameTime(geminiNew)],
    ],
    captions: [
      // Lower right over the sea; leaves before the street scene, where the boy moves right.
      { copy: 'grassroots', range: [0.07, 0.21], placement: 'story-right', top: '60%', tone: 'ink' },
      { copy: 'academy', range: [0.32, 0.46], placement: 'story-center-bottom', tone: 'light' },
      { copy: 'competitive', range: [0.48, 0.65], placement: 'story-conclusion', tone: 'ink' },
      { copy: 'welcome', range: [0.86, 1.12], placement: 'story-left', top: '30%', tone: 'ink' },
    ],
  },
  {
    // The earlier anime cut, mirrored so the boy stands left of centre like the reference.
    id: 'gemini',
    label: 'Gemini',
    frames: gemini,
    footage: 'bright',
    focusY: 0.35,
    timeMap: [
      [0, 0],
      [0.06, 0.12], // nearly still while the opening copy leaves
      [0.22, 2.8], // beach juggling, then cut to the street game
      [0.31, 3.75], // street game, then the academy gate
      [0.48, 6.0], // academy pitch, then the sunburst
      [0.65, 8.633], // stadium, then the close-up
      [0.71, 8.917], // close-up, then the goal
      [0.82, 9.717], // goal, then the celebration
      [0.93, lastFrameTime(gemini)],
      [1, lastFrameTime(gemini)],
    ],
    captions: [
      { copy: 'grassroots', range: [0.095, 0.3], placement: 'story-right', tone: 'ink' },
      { copy: 'academy', range: [0.32, 0.475], placement: 'story-center-bottom', tone: 'light' },
      { copy: 'competitive', range: [0.49, 0.645], placement: 'story-conclusion', tone: 'ink' },
      { copy: 'welcome', range: [0.84, 1.12], placement: 'story-left', tone: 'ink' },
    ],
  },
  // Switched off for now: uncomment this entry (and the googleVis import above) to bring it back.
  // {
  //   // Photoreal night stadium in Marina's kit (google-vis_HD_V2.mp4, colour-adjusted). Not mirrored, so the crest on the shirt reads correctly.
  //   id: 'google-vis',
  //   label: 'Google Vis',
  //   frames: googleVis,
  //   footage: 'dark',
  //   focusY: 0.4,
  //   timeMap: [
  //     [0, 0.35], // floodlights igniting
  //     [0.06, 0.5], // nearly still while the opening copy leaves
  //     [0.2, 2.0], // lights up over the pitch, then cut to the player with the ball
  //     [0.38, 3.967], // player poised, then cut to match play
  //     [0.58, 6.433], // match play, then cut to the keeper
  //     [0.95, lastFrameTime(googleVis)], // keeper set, the shot, the diving save
  //     [1, lastFrameTime(googleVis)],
  //   ],
  //   captions: [
  //     { copy: 'grassroots', range: [0.2, 0.37], placement: 'story-left', top: '45%', tone: 'light' },
  //     { copy: 'academy', range: [0.39, 0.57], placement: 'story-center-bottom', tone: 'light' },
  //     { copy: 'competitive', range: [0.59, 0.72], placement: 'story-right', top: '45%', tone: 'light' },
  //     { copy: 'welcome', range: [0.86, 1.12], placement: 'story-left', top: '34%', tone: 'light' },
  //   ],
  // },
]

/** Index of the video named by `?video=<id>`, or the default (first) video. */
export function initialVideoIndex(): number {
  if (typeof window === 'undefined') return 0
  const id = new URLSearchParams(window.location.search).get('video')
  const index = HERO_VIDEOS.findIndex((video) => video.id === id)
  return index >= 0 ? index : 0
}
