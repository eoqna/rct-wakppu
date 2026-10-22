import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CUES, skinCueIds } from '../src/game/audio/cues.ts'
import { LENGTH } from '../src/game/config.ts'
import { buildLayout, clearanceViolations, estimateSeconds, unreachableJumps } from '../src/game/layout.ts'
import { TOWERS } from '../src/game/towers/index.ts'
import type { Action } from '../src/game/types.ts'

const DIFFS = ['easy', 'normal', 'hard'] as const
const PLATFORM_ACTIONS: Action[] = ['key', 'breakable', 'squishy', 'stay']

describe.each(TOWERS.map((t) => [t.id, t] as const))('%s tower', (_id, tower) => {
  const usedSkins = [...new Set(tower.steps.map((s) => s.skin))]
    .map((id) => tower.skins[id])
    .filter((s) => PLATFORM_ACTIONS.includes(s.action))

  it('every tower uses at least one breakable and one stay platform, and 4 to 6 platform kinds', () => {
    expect(usedSkins.some((s) => s.action === 'breakable')).toBe(true)
    expect(usedSkins.some((s) => s.action === 'stay')).toBe(true)
    expect(usedSkins.length).toBeGreaterThanOrEqual(4)
    expect(usedSkins.length).toBeLessThanOrEqual(6)
  })

  it.each(DIFFS)('no platform hangs within 3.2 m above another (%s)', (d) => {
    expect(clearanceViolations(buildLayout(tower, d))).toEqual([])
  })

  it.each(DIFFS)('every jump is reachable (%s)', (d) => {
    expect(unreachableJumps(buildLayout(tower, d))).toEqual([])
  })

  it('easy length: rainbow 180–300 s, others 300–480 s', () => {
    const [lo, hi] = tower.id === 'rainbow' ? LENGTH.intro : LENGTH.tower
    const { total } = estimateSeconds(buildLayout(tower, 'easy'))
    expect(total).toBeGreaterThanOrEqual(lo)
    expect(total).toBeLessThanOrEqual(hi)
  })

  it.each(DIFFS)('checkpoint stretches stay within 120 / 180 / 240 s (%s)', (d) => {
    expect(estimateSeconds(buildLayout(tower, d)).worstStretch).toBeLessThanOrEqual(LENGTH.stretch[d])
  })

  it('every platform cue is a recording that exists', () => {
    for (const skin of usedSkins) {
      for (const cue of skinCueIds(skin.cues)) {
        const def = CUES[cue]
        expect(def, cue).toBeDefined()
        expect(def.files?.length ?? 0, cue).toBeGreaterThan(0)
        for (const f of def.files ?? []) expect(existsSync(join('public', f)), f).toBe(true)
      }
    }
  })
})

describe('tower looks', () => {
  // design doc 6.6: each tower has its own pillar pattern and checkpoint shape
  it('towers do not share a pillar pattern or a checkpoint look', () => {
    expect(new Set(TOWERS.map((t) => t.theme.pattern)).size).toBe(TOWERS.length)
    expect(new Set(TOWERS.map((t) => `${t.skins.checkpoint.shape}:${t.theme.decal ?? ''}`)).size).toBe(TOWERS.length)
  })
})
