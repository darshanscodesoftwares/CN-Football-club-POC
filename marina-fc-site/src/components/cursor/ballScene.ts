/**
 * The three.js scene behind the ball cursor: a glossy sphere wearing the painted map, lit like a
 * studio product shot, rendered into a small transparent canvas. It only renders when something
 * changes (first frame, a spin, a resize); following the pointer is a CSS transform on the canvas.
 */
import {
  CanvasTexture,
  DirectionalLight,
  Group,
  HemisphereLight,
  Mesh,
  MeshPhysicalMaterial,
  NeutralToneMapping,
  OrthographicCamera,
  Scene,
  SphereGeometry,
  SRGBColorSpace,
  WebGLRenderer,
} from 'three'
import { paintBallTexture } from './ballTexture'

const TAU = Math.PI * 2
/** One click = one full turn, easing out over this long (stacked clicks spin faster). */
const SPIN_MS = 950

export interface BallScene {
  /** Draws a frame; returns true while a spin is still running (call again next frame). */
  render(now: number): boolean
  /** Adds one full turn to the spin. */
  spin(now: number): void
  /** Sets the spin angle directly (radians); for previews and tests. */
  setAngle(angle: number): void
  resize(cssSize: number, pixelRatio: number): void
  dispose(): void
}

export interface BallSceneOptions {
  /** Canvas size in CSS px (square). */
  cssSize: number
  /** Ball diameter as a share of the canvas. */
  fill: number
  pixelRatio: number
}

export async function createBallScene(canvas: HTMLCanvasElement, options: BallSceneOptions): Promise<BallScene> {
  const map = await paintBallTexture()

  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' })
  renderer.setClearColor(0x000000, 0)
  renderer.outputColorSpace = SRGBColorSpace
  renderer.toneMapping = NeutralToneMapping // keeps the panel colours true

  const texture = new CanvasTexture(map)
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy())

  const material = new MeshPhysicalMaterial({ map: texture, roughness: 0.46, metalness: 0, clearcoat: 0.5, clearcoatRoughness: 0.24 })
  const geometry = new SphereGeometry(1, 64, 48)
  const ball = new Mesh(geometry, material)

  // A slight tilt shows the ball as a ball (and a little of the green panel); spins turn about its own axis.
  const tilt = new Group()
  tilt.rotation.set(-0.26, 0, 0.1)
  tilt.add(ball)

  const scene = new Scene()
  scene.add(tilt)
  scene.add(new HemisphereLight(0xffffff, 0xc4cad4, 1.45))
  const key = new DirectionalLight(0xffffff, 2.3)
  key.position.set(-2, 2.6, 3.5)
  const fillLight = new DirectionalLight(0xf2f5ff, 0.5)
  fillLight.position.set(2.6, -1.2, 2)
  const rim = new DirectionalLight(0xffffff, 0.9)
  rim.position.set(1.4, 2.2, -3)
  scene.add(key, fillLight, rim)

  const half = 1 / options.fill
  const camera = new OrthographicCamera(-half, half, half, -half, 0.1, 10)
  camera.position.z = 5

  let angle = 0
  let from = 0
  let to = 0
  let start = 0
  let spinning = false

  const api: BallScene = {
    render(now) {
      if (spinning) {
        const t = Math.min(1, (now - start) / SPIN_MS)
        angle = from + (to - from) * (1 - (1 - t) ** 5)
        if (t >= 1) {
          spinning = false
          angle = 0
          to = 0
        }
      }
      ball.rotation.y = angle
      renderer.render(scene, camera)
      return spinning
    },
    spin(now) {
      if (!spinning) to = 0
      from = angle
      to += TAU
      start = now
      spinning = true
    },
    setAngle(value) {
      spinning = false
      angle = value
    },
    resize(cssSize, pixelRatio) {
      renderer.setPixelRatio(pixelRatio)
      renderer.setSize(cssSize, cssSize, false)
    },
    dispose() {
      geometry.dispose()
      material.dispose()
      texture.dispose()
      renderer.dispose()
    },
  }
  api.resize(options.cssSize, options.pixelRatio)
  return api
}
