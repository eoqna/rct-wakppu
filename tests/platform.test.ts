import { describe, expect, it } from 'vitest'
import {
  createPlatformState,
  enterPlatform,
  leavePlatform,
  resetPlatform,
  updatePlatform,
  type PlatformEvent,
  type PlatformState,
} from '../src/game/platform.ts'
import { makeCollider } from '../src/game/physics.ts'
import type { SkinDef } from '../src/game/types.ts'

const key: SkinDef = {
  action: 'key', shape: 'key', hx: 0.65, hz: 0.65, topRest: 0.55, botRest: 0,
  cues: { enter: 'k/press', leave: 'k/release' },
}
const ball: SkinDef = {
  action: 'breakable', shape: 'ball', hx: 0.66, hz: 0.66, topRest: 1.7, botRest: 0.32,
  cracked: { topRest: 1.56, botRest: 0.25 }, squash: 0.8,
  cues: { crack: 'b/crunch', enter: 'b/squish', collapse: 'b/crumble' },
}
const jelly: SkinDef = {
  action: 'stay', shape: 'jelly', hx: 0.9, hz: 0.9, topRest: 0.75, botRest: 0, squash: 0.9, kick: 2.8, soft: 8,
  cues: { enter: 'j/land', loop: 'j/fizz' },
}
const flag: SkinDef = { action: 'checkpoint', shape: 'pad', hx: 0.98, hz: 0.98, topRest: 0.3, botRest: 0, cues: {} }

function make(skin: SkinDef, top = 2) {
  return createPlatformState(0, skin, makeCollider(0, 0, 0, 0, skin.hx, skin.hz, top, top - skin.topRest + skin.botRest))
}

function recorder() {
  const events: PlatformEvent[] = []
  return { events, emit: (_index: number, e: PlatformEvent) => { events.push(e) } }
}
const cuesOf = (events: PlatformEvent[]) => events.flatMap((e) => (e.type === 'cue' ? [e.cue] : []))
const count = (events: PlatformEvent[], type: PlatformEvent['type']) => events.filter((e) => e.type === type).length

/** Advance from `from` to `to` seconds in 1/60 s frames; returns `to`. */
function run(p: PlatformState, from: number, to: number, emit: (i: number, e: PlatformEvent) => void) {
  let t = from
  while (t < to - 1e-9) {
    const dt = Math.min(1 / 60, to - t)
    t += dt
    updatePlatform(p, dt, t, emit)
  }
  return to
}

describe('keys', () => {
  it('key press is cosmetic: collider top stays while pressed', () => {
    const { emit } = recorder()
    const p = make(key, 2)
    enterPlatform(p, 0, false, emit)
    run(p, 0, 0.5, emit)
    expect(p.press).toBeLessThan(-0.1)
    expect(p.collider.top).toBeCloseTo(2, 9)
  })

  it('key plays enter on step and leave on step-off', () => {
    const { events, emit } = recorder()
    const p = make(key)
    enterPlatform(p, 0, false, emit)
    expect(cuesOf(events)).toEqual(['k/press'])
    leavePlatform(p, emit)
    expect(cuesOf(events)).toEqual(['k/press', 'k/release'])
  })
})

describe('breakable', () => {
  it('breakable cracks once, then plays the soft cue', () => {
    const { events, emit } = recorder()
    const p = make(ball)
    enterPlatform(p, 0, false, emit)
    expect(count(events, 'crack')).toBe(1)
    expect(cuesOf(events)).toEqual(['b/crunch'])
    expect(p.topRest).toBe(1.56)
    leavePlatform(p, emit)
    run(p, 0, 2, emit)
    enterPlatform(p, 2, false, emit)
    expect(count(events, 'crack')).toBe(1)
    expect(cuesOf(events)).toEqual(['b/crunch', 'b/squish'])
  })

  it('breakable restores after 10 s only once nobody stands on it', () => {
    const { events, emit } = recorder()
    const p = make(ball)
    enterPlatform(p, 0, false, emit)
    run(p, 0, 10.5, emit)
    expect(count(events, 'restore')).toBe(0)
    expect(p.cracked).toBe(true)
    leavePlatform(p, emit)
    run(p, 10.5, 10.6, emit)
    expect(count(events, 'restore')).toBe(1)
    expect(p.cracked).toBe(false)
    expect(p.topRest).toBe(1.7)
  })

  it('hard collapse starts at 0.7 s and turns the collider off 0.25 s later', () => {
    const { events, emit } = recorder()
    const p = make(ball)
    enterPlatform(p, 0, true, emit)
    let t = run(p, 0, 0.69, emit)
    expect(count(events, 'collapse')).toBe(0)
    t = run(p, t, 0.71, emit)
    expect(count(events, 'collapse')).toBe(1)
    expect(cuesOf(events)).toEqual(['b/crunch', 'b/crumble'])
    expect(p.collider.off).toBe(false)
    t = run(p, t, 0.97, emit)
    expect(p.collider.off).toBe(true)
    leavePlatform(p, emit)
    run(p, t, 10.1, emit)
    expect(p.collider.off).toBe(false)
    expect(p.collapsed).toBe(false)
  })

  it('does not collapse on easy and normal', () => {
    const { events, emit } = recorder()
    const p = make(ball)
    enterPlatform(p, 0, false, emit)
    run(p, 0, 5, emit)
    expect(count(events, 'collapse')).toBe(0)
    expect(p.collider.off).toBe(false)
  })
})

describe('stay', () => {
  it('stay starts its loop on enter and stops it on leave', () => {
    const { events, emit } = recorder()
    const p = make(jelly)
    enterPlatform(p, 0, false, emit)
    expect(events).toContainEqual({ type: 'loopStart', cue: 'j/fizz' })
    expect(cuesOf(events)).toEqual(['j/land'])
    leavePlatform(p, emit)
    expect(count(events, 'loopStop')).toBe(1)
  })
})

describe('checkpoints', () => {
  it('checkpoint fires once', () => {
    const { events, emit } = recorder()
    const p = make(flag)
    enterPlatform(p, 0, false, emit)
    leavePlatform(p, emit)
    enterPlatform(p, 1, false, emit)
    expect(count(events, 'checkpoint')).toBe(1)
    expect(cuesOf(events)).toEqual(['synth:chime'])
  })

  it('a checkpoint with its own sound plays it on every step but chimes only the first time', () => {
    const { events, emit } = recorder()
    const p = make({ ...flag, cues: { enter: 'kb/enter' } })
    enterPlatform(p, 0, false, emit)
    leavePlatform(p, emit)
    enterPlatform(p, 1, false, emit)
    expect(cuesOf(events)).toEqual(['kb/enter', 'synth:chime', 'kb/enter'])
    expect(count(events, 'checkpoint')).toBe(1)
  })

  it('resetPlatform restores a broken platform and deactivates a checkpoint', () => {
    const { emit } = recorder()
    const p = make(ball)
    enterPlatform(p, 0, true, emit)
    run(p, 0, 1, emit)
    resetPlatform(p)
    run(p, 1, 1.5, emit)
    expect(p.cracked).toBe(false)
    expect(p.collider.off).toBe(false)
    expect(p.collider.top).toBeCloseTo(2, 3)

    const f = make(flag)
    enterPlatform(f, 0, false, emit)
    resetPlatform(f)
    expect(f.active).toBe(false)
  })
})
