// Every sound the game can play. Platform sounds are recordings; the synthesized
// version of each is only a stand-in while files load or when one fails.

import type { CueId, SkinCues, TowerDef } from '../types.ts'

export type SynthId =
  | 'thock' | 'thockUp' | 'clicky' | 'clickyUp' | 'crunch' | 'crumble' | 'squish' | 'blub'
  | 'fizzTick' | 'fizzBed' | 'chime' | 'jump' | 'thud' | 'fanfare'

export interface CueDef {
  /** paths under public/, one recorded slice each; a random one plays, never the same twice in a row */
  files?: string[]
  synth?: SynthId
  gain: number
  /** playback-rate range */
  rate?: [number, number]
  /** random left-right spread */
  pan?: number
  /** seconds after the trigger */
  delay?: number
  loop?: boolean
}

export function cueFiles(prefix: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => `sounds/${prefix}-${String(i + 1).padStart(2, '0')}.wav`)
}

const around = (rate: number, spread = 0.03): [number, number] => [rate * (1 - spread), rate * (1 + spread)]

export const COMMON_CUES: CueId[] = ['synth:jump', 'synth:thud', 'synth:chime', 'synth:fanfare']

export const CUES: Record<CueId, CueDef> = {
  'synth:jump': { synth: 'jump', gain: 1 },
  'synth:thud': { synth: 'thud', gain: 1 },
  'synth:chime': { synth: 'chime', gain: 1 },
  'synth:fanfare': { synth: 'fanfare', gain: 1 },

  // prototype keys: white keycaps sit a little lower in pitch than the coloured bridge,
  // and the upstroke lands a beat after the foot leaves, like a finger lifting
  'shared/blue-press-low': { files: cueFiles('shared/blue-press', 10), synth: 'thock', gain: 0.7, rate: around(0.94), pan: 0.2 },
  'shared/blue-release-low': { files: cueFiles('shared/blue-release', 6), synth: 'thockUp', gain: 0.32, rate: around(0.94), pan: 0.2, delay: 0.06 },
  'shared/blue-press-high': { files: cueFiles('shared/blue-press', 10), synth: 'clicky', gain: 0.7, rate: around(1.04), pan: 0.2 },
  'shared/blue-release-high': { files: cueFiles('shared/blue-release', 6), synth: 'clickyUp', gain: 0.32, rate: around(1.04), pan: 0.2, delay: 0.05 },
  'shared/wax-crunch': { files: cueFiles('shared/wax-crunch', 7), synth: 'crunch', gain: 0.9, rate: [0.92, 1.08] },
  // a broken ball giving way on the hard setting: a smaller, lower crunch
  'shared/wax-crumble': { files: cueFiles('shared/wax-crunch', 7), synth: 'crumble', gain: 0.45, rate: [0.72, 0.82] },

  // Gains put every recording at one of the levels the user already approved by ear, measured as
  // the loudest 100 ms RMS times the gain: a step or key press at the blue switch's -29.7 dB,
  // a release at -34.2 dB, a first break at the wax crunch's -25.7 dB, a collapse at -31.7 dB,
  // and a continuous loop about 6 dB under a step (-36 dB).

  // keyboard tower
  'keyboard/brown-press': { files: cueFiles('keyboard/brown-press', 9), synth: 'thock', gain: 0.38, rate: around(1), pan: 0.2 },
  'keyboard/brown-release': { files: cueFiles('keyboard/brown-release', 5), synth: 'thockUp', gain: 0.19, rate: around(1), pan: 0.2, delay: 0.06 },
  'keyboard/red-press': { files: cueFiles('keyboard/red-press', 10), synth: 'thock', gain: 0.44, rate: around(1), pan: 0.2 },
  'keyboard/red-release': { files: cueFiles('keyboard/red-release', 6), synth: 'thockUp', gain: 0.18, rate: around(1), pan: 0.2, delay: 0.06 },
  // the spacebar and Enter are big keys, 2 dB over a normal one
  'keyboard/space-press': { files: cueFiles('keyboard/space-press', 4), synth: 'thock', gain: 0.45, rate: around(1), pan: 0.15 },
  'keyboard/space-release': { files: cueFiles('keyboard/space-release', 4), synth: 'thockUp', gain: 0.2, rate: around(1), pan: 0.15, delay: 0.07 },
  'keyboard/enter-press': { files: cueFiles('keyboard/enter-press', 1), synth: 'thock', gain: 0.41, rate: [0.92, 1.0] },
  'keyboard/keycap-scatter': { files: cueFiles('keyboard/keycap-scatter', 6), synth: 'crunch', gain: 0.52, rate: [0.95, 1.05], pan: 0.3 },
  'keyboard/keycap-scatter-low': { files: cueFiles('keyboard/keycap-scatter', 6), synth: 'crumble', gain: 0.26, rate: [0.8, 0.88], pan: 0.3 },
  // the key that keeps typing: the blue switch, quicker and 6 dB quieter
  'keyboard/rapid': { files: cueFiles('shared/blue-press', 10), synth: 'clicky', gain: 0.35, rate: around(1.1, 0.05), pan: 0.35 },

  // ice cola tower
  'icecola/snow-step': { files: cueFiles('icecola/snow-step', 8), synth: 'squish', gain: 0.23, rate: around(1), pan: 0.2 },
  'icecola/snow-step-high': { files: cueFiles('icecola/snow-step', 8), synth: 'squish', gain: 0.2, rate: [1.15, 1.25], pan: 0.2 },
  'icecola/ice-crack': { files: cueFiles('icecola/ice-crack', 8), synth: 'crunch', gain: 0.39, rate: around(1), pan: 0.3 },
  'icecola/ice-crack-low': { files: cueFiles('icecola/ice-crack', 8), synth: 'crumble', gain: 0.2, rate: [0.75, 0.85], pan: 0.3 },
  // the glass ring in a few slices can sound sharp, so a touch under a step
  'icecola/ice-clink': { files: cueFiles('icecola/ice-clink', 8), synth: 'blub', gain: 0.26, rate: around(1), pan: 0.25 },
  'icecola/cola-land': { files: cueFiles('icecola/cola-land', 5), synth: 'blub', gain: 0.27, rate: around(1), pan: 0.2 },
  'icecola/cola-fizz-loop': { files: cueFiles('icecola/cola-fizz-loop', 1), synth: 'fizzBed', gain: 0.16, loop: true },

  // honey tower
  'honey/comb-crunch': { files: cueFiles('honey/comb-crunch', 6), synth: 'crunch', gain: 0.36, rate: around(1), pan: 0.3 },
  'honey/comb-crumble': { files: cueFiles('honey/comb-crunch', 6), synth: 'crumble', gain: 0.18, rate: [0.75, 0.85], pan: 0.3 },
  'honey/drop-squish': { files: cueFiles('honey/drop-squish', 6), synth: 'squish', gain: 0.3, rate: around(1), pan: 0.2 },
  'honey/honey-stick': { files: cueFiles('honey/honey-stick', 6), synth: 'squish', gain: 0.28, rate: around(1), pan: 0.2 },
  'honey/wood-tap': { files: cueFiles('honey/wood-tap', 9), synth: 'thock', gain: 0.27, rate: around(1), pan: 0.2 },
  'honey/honey-loop': { files: cueFiles('honey/honey-loop', 1), synth: 'fizzBed', gain: 0.26, loop: true },

  // rainbow tower
  'rainbow/wax-squish': { files: cueFiles('rainbow/wax-squish', 8), synth: 'squish', gain: 0.3, rate: around(1), pan: 0.2 },
  'rainbow/jelly-land': { files: cueFiles('rainbow/jelly-land', 8), synth: 'blub', gain: 0.14, rate: around(1), pan: 0.2 },
  'rainbow/fizz-loop': { files: cueFiles('rainbow/fizz-loop', 1), synth: 'fizzBed', gain: 0.23, loop: true },

  // strawberry choco tower: the choco ball cracks like a wax ball, a little lower
  'choco/ball-crunch': { files: cueFiles('shared/wax-crunch', 7), synth: 'crunch', gain: 0.9, rate: [0.76, 0.86] },
  'choco/choco-snap': { files: cueFiles('choco/choco-snap', 6), synth: 'crunch', gain: 0.59, rate: around(1), pan: 0.25 },
  'choco/choco-snap-soft': { files: cueFiles('choco/choco-snap', 6), synth: 'crumble', gain: 0.3, rate: [0.85, 0.95], pan: 0.25 },
  'choco/jelly-squish': { files: cueFiles('choco/jelly-squish', 7), synth: 'squish', gain: 0.42, rate: around(1), pan: 0.2 },
  'choco/mallow-press': { files: cueFiles('choco/mallow-press', 7), synth: 'squish', gain: 0.24, rate: around(1), pan: 0.2 },
  'choco/choco-plop': { files: cueFiles('choco/choco-plop', 7), synth: 'blub', gain: 0.25, rate: around(1), pan: 0.2 },
  'choco/choco-bubble-loop': { files: cueFiles('choco/choco-bubble-loop', 1), synth: 'fizzBed', gain: 0.25, loop: true },
}

export function skinCueIds(c: SkinCues): CueId[] {
  return [c.enter, c.leave, c.crack, c.collapse, c.loop, c.tick?.cue].filter((x): x is CueId => !!x)
}

/** Cues a tower can trigger: those of the skins its climb uses, plus jump, landing, checkpoint and clear. */
export function cuesForTower(t: TowerDef): CueId[] {
  const used = new Set(['checkpoint', 'pad', 'goal', ...t.steps.map((s) => s.skin)])
  const out = new Set<CueId>(COMMON_CUES)
  for (const id of used) {
    const skin = t.skins[id]
    if (skin) for (const c of skinCueIds(skin.cues)) out.add(c)
  }
  return [...out]
}

export type Resolved<B> = { kind: 'buffers'; buffers: B[] } | { kind: 'synth'; id: SynthId } | { kind: 'none' }

/** What to play for a cue right now: the slices that loaded, else the synthesized stand-in. */
export function resolveCue<B>(def: CueDef, loaded: ReadonlyMap<string, B | null>): Resolved<B> {
  const buffers = (def.files ?? []).map((f) => loaded.get(f)).filter((b): b is B => b !== undefined && b !== null)
  if (buffers.length) return { kind: 'buffers', buffers }
  if (def.synth) return { kind: 'synth', id: def.synth }
  return { kind: 'none' }
}

/** A random slice index that is never the one played last. */
export function pickVariant(count: number, last: number, rnd: () => number = Math.random) {
  if (count <= 1) return 0
  if (last < 0 || last >= count) return Math.floor(rnd() * count)
  const i = Math.floor(rnd() * (count - 1))
  return i >= last ? i + 1 : i
}
