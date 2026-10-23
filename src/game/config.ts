import type { DifficultyKey } from './types.ts'

// Tuned values from the prototype the user played and accepted (design doc 9.1).
// Change them only after the user has tried the change.

export const PLAYER = {
  radius: 0.34,
  height: 1.45,
  gravity: 26,
  jumpSpeed: 9.4,
  runSpeed: 4.8,
  stepUp: 0.36,
  coyote: 0.1,
  jumpBuffer: 0.14,
  accelGround: 44,
  accelAir: 20,
  maxFall: 24,
} as const

/** How far the centre may hang past an edge and still stand on it; stepping up uses the same reach. */
export const SUPPORT_R = PLAYER.radius * 0.8

export const PHYSICS = {
  substeps: 4,
  maxDt: 0.05,
  respawnBelow: -12,
  /** a grounded player follows its platform's top while it squashes within this distance */
  rideSnap: 0.4,
} as const

export const TOWER = {
  radius: 4.6,
  pillarRadius: 2.2,
  floorRadius: 40,
  /** steps longer than this along the spiral are jumps; shorter ones are walked */
  jumpArc: 1.5,
  startTop: 0.3,
} as const

export interface DifficultyDef {
  label: string
  /** multiplies the length of jump steps only */
  gap: number
  /** multiplies the rise of jump steps only */
  rise: number
  /** checkpoints with a tier up to this stay */
  keep: 1 | 2 | 3
  /** broken platforms give way shortly after breaking */
  collapse: boolean
  note: string
}

export const DIFFICULTY: Record<DifficultyKey, DifficultyDef> = {
  easy: { label: '쉬움', gap: 1, rise: 1, keep: 3, collapse: false, note: '틈이 좁고 체크포인트가 많아요.' },
  normal: { label: '보통', gap: 1.25, rise: 1.15, keep: 2, collapse: false, note: '발판 사이가 넓고 단차가 높아요. 체크포인트는 쉬움의 절반쯤이에요.' },
  hard: { label: '어려움', gap: 1.45, rise: 1.3, keep: 1, collapse: true, note: '틈이 더 넓고 높아요. 깨진 발판은 1초도 안 돼 무너지고, 체크포인트가 가장 적어요.' },
}

/** Rough human pace, for checking tower length (design doc 6.4, 6.6). */
export const PACE = { jumpSec: 2.0, walkSec: 0.5 } as const

export const LENGTH = {
  /** easy-setting seconds for the intro tower and the others */
  intro: [180, 300],
  tower: [300, 480],
  /** longest climb between checkpoints, per difficulty */
  stretch: { easy: 120, normal: 180, hard: 240 },
} as const

export const CAMERA = {
  fov: 55,
  near: 0.1,
  far: 160,
  dist: 8.5,
  minDist: 4,
  maxDist: 15,
  pitch: 0.42,
  minPitch: 0.08,
  maxPitch: 1.15,
  yawPerPx: 0.006,
  pitchPerPx: 0.004,
  zoomPerDelta: 0.01,
  /** never pull closer than this when something blocks the view */
  minPull: 1.4,
  /** after a respawn the view sits outside the tower, a little behind the climb */
  startOffset: -0.55,
  /** seconds the camera takes to settle in at the start of a run */
  settle: 1.2,
  /** a portrait screen widens the vertical view angle up to this, so the view keeps some width */
  maxFov: 80,
} as const

/** On-screen thumb controls for touch screens; first guesses, not yet tried on a phone by the user. */
export const TOUCH = {
  /** how far (CSS px) the knob travels from where the thumb landed */
  stickRadius: 56,
  /** fractions of that travel: no move inside `dead`, full speed from `full` */
  stickDead: 0.2,
  stickFull: 0.7,
} as const
