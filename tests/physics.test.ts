import { describe, expect, it } from 'vitest'
import {
  createPlayer,
  makeCollider,
  requestJump,
  resetPlayer,
  stepPlayer,
  type Collider,
  type PlayerState,
  type World,
} from '../src/game/physics.ts'
import { arc, RADIUS, spiralKey, tangentAt } from './helpers/spiral.ts'

const DT = 1 / 60
const world = (colliders: Collider[]): World => ({ colliders, pillarTop: 60 })

type Move = (p: PlayerState) => [number, number]
const still: Move = () => [0, 0]

function simulate(w: World, p: PlayerState, frames: number, move: Move = still) {
  const changes: (Collider | null)[] = []
  for (let i = 0; i < frames; i++) {
    const [mx, mz] = move(p)
    changes.push(...stepPlayer(p, w, mx, mz, DT).groundChanges)
  }
  return changes
}

describe('standing on key boundaries', () => {
  it('boundary between two bridge keys flips ground at most twice in 3 s', () => {
    const t0 = 1
    const keys = [spiralKey(1, t0, 1.0), spiralKey(2, t0 + arc(1.36), 1.0)]
    const mid = t0 + arc(0.68)
    const p = createPlayer()
    resetPlayer(p, RADIUS * Math.cos(mid), 1.01, -RADIUS * Math.sin(mid))
    const changes = simulate(world(keys), p, 180)
    expect(changes.length).toBeLessThanOrEqual(2)
    expect(p.ground?.id === 1 || p.ground?.id === 2).toBe(true)
  })

  it('boundary between two stair keys flips ground at most twice in 3 s', () => {
    // the player stands on the lower key with its centre 0.30 short of the higher key:
    // inside the body radius (0.34) but outside the support radius (0.272)
    const t1 = 1
    const t2 = t1 + arc(1.36)
    const low = spiralKey(1, t1, 1.0)
    const high = spiralKey(2, t2, 1.3)
    const [tx, tz] = tangentAt(high.cx, high.cz)
    const p = createPlayer()
    resetPlayer(p, high.cx - 0.95 * tx, 1.001, high.cz - 0.95 * tz)
    const changes = simulate(world([low, high]), p, 180)
    expect(changes.length).toBeLessThanOrEqual(2)
    expect(p.ground?.id).toBe(1)
  })
})

describe('climbing', () => {
  it('climbing a 6-key staircase enters each key exactly once in order', () => {
    const pad = makeCollider(0, RADIUS, 0, Math.atan2(1, 0), 0.98, 0.98, 0.3, 0)
    const colliders = [pad]
    let t = arc(1.95)
    for (let i = 1; i <= 6; i++) {
      colliders.push(spiralKey(i, t, 0.3 + 0.3 * i))
      t += arc(1.36)
    }
    const p = createPlayer()
    resetPlayer(p, RADIUS, 0.32, 0)
    const entered: number[] = []
    for (let i = 0; i < 900 && entered.at(-1) !== 6; i++) {
      const [mx, mz] = tangentAt(p.x, p.z)
      for (const c of stepPlayer(p, world(colliders), mx, mz, DT).groundChanges) if (c) entered.push(c.id)
    }
    expect(entered).toEqual([0, 1, 2, 3, 4, 5, 6])
  })

  it('walks up a 0.35 ledge without jumping and is blocked by a 0.45 ledge', () => {
    // long ledges starting at x = 12, so one second of walking ends on top of them
    const low = makeCollider(1, 16, 0, 0, 4, 1, 0.35, 0)
    const p = createPlayer()
    resetPlayer(p, 10, 0, 0)
    simulate(world([low]), p, 60, () => [1, 0])
    expect(p.ground?.id).toBe(1)
    expect(p.y).toBeCloseTo(0.35, 5)

    const high = makeCollider(2, 16, 0, 0, 4, 1, 0.45, 0)
    const q = createPlayer()
    resetPlayer(q, 10, 0, 0)
    simulate(world([high]), q, 60, () => [1, 0])
    expect(q.y).toBe(0)
    expect(q.x).toBeLessThan(12 - 0.34 + 0.01)
  })
})

describe('jumping', () => {
  it('jump apex is 1.70 ± 0.05 above the floor', () => {
    const p = createPlayer()
    resetPlayer(p, 10, 0, 0)
    simulate(world([]), p, 2)
    requestJump(p)
    let apex = 0
    for (let i = 0; i < 90; i++) {
      stepPlayer(p, world([]), 0, 0, DT)
      apex = Math.max(apex, p.y)
    }
    expect(apex).toBeGreaterThan(1.65)
    expect(apex).toBeLessThan(1.75)
    expect(p.y).toBe(0)
  })
})
