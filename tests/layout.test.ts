import { describe, expect, it } from 'vitest'
import { buildLayout, clearanceViolations, estimateSeconds, unreachableJumps } from '../src/game/layout.ts'
import { goal, hops, keys } from '../src/game/towers/kit.ts'
import { fixtureTower, towerWith } from './helpers/fixtureTower.ts'

const R = 4.6

describe('buildLayout', () => {
  it('walk steps keep their spacing on every difficulty', () => {
    for (const diff of ['easy', 'hard'] as const) {
      const { platforms: p } = buildLayout(fixtureTower, diff)
      for (const i of [2, 3, 4]) {
        expect(p[i].t - p[i - 1].t).toBeCloseTo(1.36 / R, 9)
        expect(p[i].top - p[i - 1].top).toBeCloseTo(0.3, 9)
      }
    }
  })

  it('jump steps scale arc by gap and rise by the rise multiplier', () => {
    const easy = buildLayout(fixtureTower, 'easy').platforms
    const hard = buildLayout(fixtureTower, 'hard').platforms
    expect(easy[1].t).toBeCloseTo(1.95 / R, 9)
    expect(easy[1].top).toBeCloseTo(0.3 + 0.3, 9)
    expect(hard[1].t).toBeCloseTo((1.95 * 1.45) / R, 9)
    expect(hard[1].top).toBeCloseTo(0.3 + 0.3 * 1.3, 9)
    expect(hard[6].top - hard[5].top).toBeCloseTo(0.75 * 1.3, 9)
    expect(hard[6].t - hard[5].t).toBeCloseTo((2.3 * 1.45) / R, 9)
  })

  it('places platforms on the spiral, facing along it', () => {
    const p = buildLayout(fixtureTower, 'easy').platforms[1]
    expect(p.x).toBeCloseTo(R * Math.cos(1.95 / R), 9)
    expect(p.z).toBeCloseTo(-R * Math.sin(1.95 / R), 9)
    expect(p.yaw).toBeCloseTo(Math.atan2(Math.cos(1.95 / R), -Math.sin(1.95 / R)), 9)
  })

  it('checkpoint tiers: easy keeps 4, normal 3, hard 2 including the start', () => {
    expect(buildLayout(fixtureTower, 'easy').checkpoints).toEqual([0, 5, 8, 10])
    expect(buildLayout(fixtureTower, 'normal').checkpoints).toEqual([0, 8, 10])
    expect(buildLayout(fixtureTower, 'hard').checkpoints).toEqual([0, 10])
  })

  it('dropped checkpoints become pads at the same spot', () => {
    const hard = buildLayout(fixtureTower, 'hard')
    expect(hard.platforms).toHaveLength(12)
    expect(hard.platforms[5].skinId).toBe('pad')
    expect(hard.platforms[5].checkpoint).toBeUndefined()
    expect(hard.platforms[10].skinId).toBe('checkpoint')
    expect(hard.platforms[10].checkpoint).toBe(1)
    expect(hard.goal).toBe(11)
  })

  it('the goal must be the last step', () => {
    expect(() => buildLayout(towerWith(keys('key', 'AB', { first: 1.95, rise: 0.3 })), 'easy')).toThrow(/goal/)
  })
})

describe('estimateSeconds', () => {
  it('estimateSeconds adds 2.0 s per jump and 0.5 s per walk', () => {
    // 8 jumps + 3 walks; easy stretches 5.5 / 6 / 4 / 2, hard 15.5 / 2
    expect(estimateSeconds(buildLayout(fixtureTower, 'easy'))).toEqual({ total: 17.5, worstStretch: 6 })
    expect(estimateSeconds(buildLayout(fixtureTower, 'hard'))).toEqual({ total: 17.5, worstStretch: 15.5 })
  })
})

describe('unreachableJumps', () => {
  it('unreachableJumps flags a 1.8 rise and a 4 m gap but not spike-sized jumps', () => {
    const tooHigh = towerWith([...hops('ball', 1, { arc: 2.3, rise: 1.8 }), goal(2.75, 0.6)])
    expect(unreachableJumps(buildLayout(tooHigh, 'easy'))).toEqual([1])

    // a 6 m step along the spiral leaves a ~3.95 m gap between the start pad and the key
    const tooFar = towerWith([...keys('key', 'A', { first: 6, rise: 0 }), goal(2.75, 0.6)])
    expect(unreachableJumps(buildLayout(tooFar, 'easy'))).toEqual([1])

    const spike = towerWith([...hops('ball', 3, { arc: 2.3, rise: 0.75 }), goal(2.75, 0.6)])
    expect(unreachableJumps(buildLayout(spike, 'hard'))).toEqual([])
  })
})

describe('clearanceViolations', () => {
  it('clearanceViolations flags a platform 2 m above an overlapping one', () => {
    // keys climbing 0.1 each come round the spiral: keys 22 and 23 sit right above key 1,
    // their undersides about 1.6 m over its top
    const lap = towerWith([...keys('key', 'ABCDEFGHIJKLMNOPQRSTUVW', { first: 1.95, rise: 0.1 }), goal(2.75, 0.6)])
    const found = clearanceViolations(buildLayout(lap, 'easy'))
    expect(found).toContainEqual([1, 22])
    expect(found).toContainEqual([1, 23])
    expect(clearanceViolations(buildLayout(fixtureTower, 'hard'))).toEqual([])
  })
})
