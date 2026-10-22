export type DifficultyKey = 'easy' | 'normal' | 'hard'
export type TowerId = 'rainbow' | 'keyboard' | 'choco' | 'honey' | 'icecola'
export type CharacterId = 'hamster' | 'rabbit' | 'chick' | 'cat'

/** How a platform reacts when stood on; the look and sound come from its skin. */
export type Action = 'key' | 'breakable' | 'squishy' | 'stay' | 'checkpoint' | 'goal' | 'plain'

/** A sound cue: `<pack>/<cue>` for a recording, `synth:<name>` for a synthesized one. */
export type CueId = string

export interface SkinCues {
  enter?: CueId
  leave?: CueId
  crack?: CueId
  collapse?: CueId
  loop?: CueId
  tick?: { cue: CueId; every: [number, number] }
}

export interface SkinDef {
  action: Action
  shape: string
  /** collider half extents: x along the spiral, z across it */
  hx: number
  hz: number
  /** standing height above the platform's base, and the collider's underside */
  topRest: number
  botRest: number
  cracked?: { topRest: number; botRest: number }
  /** vertical squash target while stood on (1 = none) */
  squash?: number
  /** downward spring kick when landed on */
  kick?: number
  /** spring damping, lower is wobblier */
  soft?: number
  color?: string
  cues: SkinCues
}

/** One platform of a tower's climb, placed relative to the one before it. */
export interface StepDef {
  skin: string
  /** distance from the previous platform's centre along the spiral; over 1.5 is a jump */
  arc: number
  /** standing-height gain over the previous platform */
  rise: number
  /** offset from the spiral radius */
  r?: number
  label?: string
  color?: string
  /** checkpoints only: 1 stays on every difficulty, 2 on easy and normal, 3 on easy */
  tier?: 1 | 2 | 3
}

export type PillarPattern = 'checker' | 'frost' | 'hex' | 'grid' | 'keys'
export type DecalKind = 'flower' | 'snowflake' | 'honeycomb' | 'strawberry'

export interface TowerTheme {
  sky: [string, string]
  fog: string
  /** the pillar's pattern, drawn in its two colours */
  pattern: PillarPattern
  pillar: [string, string]
  /** the picture on checkpoint discs (towers with their own checkpoint shape leave it out) */
  decal?: DecalKind
  floor: [string, string]
  accent: string
  palette: string[]
}

/** A tower is data: skins (must include 'checkpoint', 'pad' and 'goal') and the climb. */
export interface TowerDef {
  id: TowerId
  name: string
  blurb: string
  theme: TowerTheme
  skins: Record<string, SkinDef>
  steps: StepDef[]
}

export interface PlacedPlatform {
  index: number
  skinId: string
  skin: SkinDef
  t: number
  r: number
  x: number
  z: number
  yaw: number
  top: number
  jump: boolean
  label?: string
  color?: string
  /** index into Layout.checkpoints when this platform is a kept checkpoint */
  checkpoint?: number
}

export interface Layout {
  platforms: PlacedPlatform[]
  /** platform indices of the kept checkpoints; [0] is the start */
  checkpoints: number[]
  goal: number
  goalTop: number
}
