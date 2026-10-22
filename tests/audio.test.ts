import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CUES, cuesForTower, pickVariant, resolveCue, type CueDef } from '../src/game/audio/cues.ts'
import { LoopSet } from '../src/game/audio/loops.ts'
import { fixtureTower } from './helpers/fixtureTower.ts'

describe('resolveCue', () => {
  const def: CueDef = { files: ['a.wav', 'b.wav', 'c.wav'], synth: 'thock', gain: 1 }

  it('resolveCue uses loaded buffers and skips failed files', () => {
    const loaded = new Map([['a.wav', 'A'], ['b.wav', null], ['c.wav', 'C']])
    expect(resolveCue(def, loaded)).toEqual({ kind: 'buffers', buffers: ['A', 'C'] })
  })

  it('resolveCue falls back to synth when every file failed or is still loading', () => {
    const failed = new Map<string, string | null>([['a.wav', null], ['b.wav', null], ['c.wav', null]])
    expect(resolveCue(def, failed)).toEqual({ kind: 'synth', id: 'thock' })
    expect(resolveCue(def, new Map<string, string | null>())).toEqual({ kind: 'synth', id: 'thock' })
    expect(resolveCue({ files: ['a.wav'], gain: 1 }, failed)).toEqual({ kind: 'none' })
    expect(resolveCue({ synth: 'chime', gain: 1 }, failed)).toEqual({ kind: 'synth', id: 'chime' })
  })
})

describe('pickVariant', () => {
  it('never plays the same slice twice in a row', () => {
    const rolls = [0, 0, 0.5, 0.5, 0.99, 0.99]
    let last = -1
    for (const r of rolls) {
      const i = pickVariant(4, last, () => r)
      expect(i).not.toBe(last)
      expect(i).toBeGreaterThanOrEqual(0)
      expect(i).toBeLessThan(4)
      last = i
    }
    expect(pickVariant(1, 0, () => 0.7)).toBe(0)
  })
})

describe('LoopSet', () => {
  it('LoopSet never stacks the same key and stops it once', () => {
    const stopped: string[] = []
    const set = new LoopSet<string>()
    let made = 0
    const create = (h: string) => () => { made++; return h }
    expect(set.start('jelly', create('h1'), (h) => stopped.push(h))).toBe(true)
    expect(set.start('jelly', create('h2'), (h) => stopped.push(h))).toBe(false)
    expect(made).toBe(1)
    expect(set.size).toBe(1)
    set.stop('jelly')
    set.stop('jelly')
    expect(stopped).toEqual(['h1'])
    set.start('a', create('ha'), (h) => stopped.push(h))
    set.start('b', create('hb'), (h) => stopped.push(h))
    set.stopAll()
    expect(stopped).toEqual(['h1', 'ha', 'hb'])
    expect(set.size).toBe(0)
  })
})

describe('cue table', () => {
  it('every file listed in CUES exists under public/', () => {
    const missing = Object.values(CUES).flatMap((d) => d.files ?? []).filter((f) => !existsSync(join('public', f)))
    expect(missing).toEqual([])
  })

  it("cuesForTower lists every cue used by the tower's skins plus the common cues", () => {
    expect(cuesForTower(fixtureTower).sort()).toEqual(
      ['fx/crunch', 'fx/press', 'fx/release', 'fx/squish', 'synth:chime', 'synth:fanfare', 'synth:jump', 'synth:thud'],
    )
  })
})
