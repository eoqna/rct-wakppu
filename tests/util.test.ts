import { describe, expect, it } from 'vitest'
import { fmtTime, lerpAngle, mulberry32 } from '../src/game/util.ts'

describe('lerpAngle', () => {
  it('turns the short way across ±π', () => {
    // from 3 rad to -3 rad the short way is +0.283 through π, not -6 through 0
    const mid = lerpAngle(3, -3, 0.5)
    expect(Math.abs(Math.abs(mid) - Math.PI)).toBeLessThan(1e-3)
    expect(lerpAngle(0.5, 1.5, 0.25)).toBeCloseTo(0.75, 9)
  })
})

describe('fmtTime', () => {
  it('shows minutes and seconds with two digits', () => {
    expect(fmtTime(0)).toBe('00:00')
    expect(fmtTime(75.9)).toBe('01:15')
    expect(fmtTime(3599.9)).toBe('59:59')
    expect(fmtTime(3725)).toBe('62:05')
  })
})

describe('mulberry32', () => {
  it('gives the same sequence for the same seed and stays within [0, 1)', () => {
    const a = mulberry32(42), b = mulberry32(42), c = mulberry32(43)
    const seqA = Array.from({ length: 5 }, a), seqB = Array.from({ length: 5 }, b), seqC = Array.from({ length: 5 }, c)
    expect(seqA).toEqual(seqB)
    expect(seqA).not.toEqual(seqC)
    for (const v of seqA) { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThan(1) }
  })
})
