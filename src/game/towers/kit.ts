// Building blocks for writing a tower's climb.

import type { SkinDef, StepDef } from '../types.ts'

const KEY_ARC = 1.36

/** A row of keys that sit side by side, one per character; only the first step can be a jump. */
export function keys(skin: string, text: string, o: { first: number; rise: number; arc?: number; colors?: string[] }): StepDef[] {
  return [...text].map((label, i) => ({
    skin,
    arc: i ? (o.arc ?? KEY_ARC) : o.first,
    rise: o.rise,
    label,
    ...(o.colors ? { color: o.colors[i % o.colors.length] } : {}),
  }))
}

/** n jumps in a row, cycling through skins, radius offsets, colours and labels. */
export function hops(skin: string | string[], n: number, o: { arc: number; rise: number; r?: number[]; colors?: string[]; labels?: string[] }): StepDef[] {
  const skins = typeof skin === 'string' ? [skin] : skin
  return Array.from({ length: n }, (_, i) => ({
    skin: skins[i % skins.length],
    arc: o.arc,
    rise: o.rise,
    ...(o.r ? { r: o.r[i % o.r.length] } : {}),
    ...(o.colors ? { color: o.colors[i % o.colors.length] } : {}),
    ...(o.labels ? { label: o.labels[i % o.labels.length] } : {}),
  }))
}

/** A checkpoint that stays on difficulties whose keep level is at least `tier`, else a plain pad. */
export function checkpoint(tier: 1 | 2 | 3, arc: number, rise: number): StepDef {
  return { skin: 'checkpoint', arc, rise, tier }
}

export function goal(arc: number, rise: number): StepDef {
  return { skin: 'goal', arc, rise }
}

/** Prototype sizes: a 0.3-high disc with a 0.98 square footing, and a 0.4-high goal disc. */
export const COMMON_SKINS: { checkpoint: SkinDef; pad: SkinDef; goal: SkinDef } = {
  checkpoint: { action: 'checkpoint', shape: 'checkpoint', hx: 0.98, hz: 0.98, topRest: 0.3, botRest: 0, cues: {} },
  pad: { action: 'plain', shape: 'pad', hx: 0.98, hz: 0.98, topRest: 0.3, botRest: 0, cues: {} },
  goal: { action: 'goal', shape: 'goal', hx: 1.4, hz: 1.4, topRest: 0.4, botRest: 0, cues: {} },
}
