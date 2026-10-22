import { describe, expect, it } from 'vitest'
import { createSave, sanitizeProgress, type StorageLike } from '../src/game/save.ts'

class MemoryStorage implements StorageLike {
  map = new Map<string, string>()
  getItem(k: string) { return this.map.get(k) ?? null }
  setItem(k: string, v: string) { this.map.set(k, v) }
  removeItem(k: string) { this.map.delete(k) }
}

const throwing: StorageLike = {
  getItem() { throw new Error('denied') },
  setItem() { throw new Error('denied') },
  removeItem() { throw new Error('denied') },
}

const known = { towers: ['rainbow', 'keyboard'] as const, characters: ['hamster', 'cat'] as const }
const defaults = { tower: 'rainbow', character: 'hamster', difficulty: 'easy', volume: 0.7, muted: false }

describe('prefs', () => {
  it('prefs round-trip and fall back to defaults on garbage', () => {
    const s = new MemoryStorage()
    const save = createSave(s, known)
    expect(save.loadPrefs()).toEqual(defaults)

    save.savePrefs({ tower: 'keyboard', character: 'cat', difficulty: 'hard', volume: 0.3, muted: true })
    expect(createSave(s, known).loadPrefs()).toEqual({ tower: 'keyboard', character: 'cat', difficulty: 'hard', volume: 0.3, muted: true })

    s.setItem('wakppu.prefs', '{')
    expect(save.loadPrefs()).toEqual(defaults)

    s.setItem('wakppu.prefs', JSON.stringify({ tower: 'pyramid', character: 'cat', difficulty: 'hard', volume: 'loud', muted: 'yes' }))
    expect(save.loadPrefs()).toEqual({ tower: 'rainbow', character: 'cat', difficulty: 'hard', volume: 0.7, muted: false })

    s.setItem('wakppu.prefs', JSON.stringify({ volume: 7 }))
    expect(save.loadPrefs().volume).toBe(1)
  })

  it('works when storage throws on every call', () => {
    for (const storage of [throwing, null]) {
      const save = createSave(storage, known)
      expect(save.loadPrefs()).toEqual(defaults)
      expect(() => save.savePrefs({ tower: 'keyboard', character: 'cat', difficulty: 'hard', volume: 0.3, muted: true })).not.toThrow()
      expect(() => save.saveProgress('rainbow', 'easy', { checkpoint: 1, elapsed: 5, steps: 3, savedAt: 1 })).not.toThrow()
      expect(save.loadProgress('rainbow', 'easy')).toBeNull()
      expect(() => save.clearProgress('rainbow', 'easy')).not.toThrow()
      expect(save.recordClear('rainbow', 'easy', 300, 200)).toEqual({ newBest: true, record: { bestTime: 300, bestSteps: 200, clears: 1 } })
    }
  })
})

describe('progress', () => {
  it('progress round-trips and clears', () => {
    const s = new MemoryStorage()
    const save = createSave(s, known)
    save.saveProgress('rainbow', 'easy', { checkpoint: 2, elapsed: 61.5, steps: 40, savedAt: 1000 })
    expect(createSave(s, known).loadProgress('rainbow', 'easy')).toEqual({ checkpoint: 2, elapsed: 61.5, steps: 40, savedAt: 1000 })
    expect(save.loadProgress('rainbow', 'hard')).toBeNull()
    expect(save.loadProgress('keyboard', 'easy')).toBeNull()
    save.clearProgress('rainbow', 'easy')
    expect(save.loadProgress('rainbow', 'easy')).toBeNull()

    s.setItem('wakppu.progress.rainbow.easy', JSON.stringify({ checkpoint: 'two', elapsed: 1, steps: 1, savedAt: 1 }))
    expect(save.loadProgress('rainbow', 'easy')).toBeNull()
  })

  it('sanitizeProgress drops a checkpoint the layout no longer has', () => {
    const ok = { checkpoint: 2, elapsed: 10, steps: 5, savedAt: 1 }
    expect(sanitizeProgress(ok, 3)).toEqual(ok)
    expect(sanitizeProgress({ ...ok, checkpoint: 5 }, 3)).toBeNull()
    expect(sanitizeProgress({ ...ok, checkpoint: 3 }, 3)).toBeNull()
    expect(sanitizeProgress({ ...ok, checkpoint: -1 }, 3)).toBeNull()
    expect(sanitizeProgress({ ...ok, checkpoint: Number.NaN }, 3)).toBeNull()
    expect(sanitizeProgress({ ...ok, checkpoint: 1.5 }, 3)).toBeNull()
    expect(sanitizeProgress({ ...ok, elapsed: -4 }, 3)).toBeNull()
    expect(sanitizeProgress(null, 3)).toBeNull()
  })
})

describe('records', () => {
  it('recordClear keeps the best time and counts clears', () => {
    const s = new MemoryStorage()
    const save = createSave(s, known)
    expect(save.recordClear('rainbow', 'easy', 300, 200)).toEqual({ newBest: true, record: { bestTime: 300, bestSteps: 200, clears: 1 } })
    expect(save.recordClear('rainbow', 'easy', 320, 150)).toEqual({ newBest: false, record: { bestTime: 300, bestSteps: 200, clears: 2 } })
    expect(save.recordClear('rainbow', 'easy', 280, 210)).toEqual({ newBest: true, record: { bestTime: 280, bestSteps: 210, clears: 3 } })
    expect(createSave(s, known).loadRecord('rainbow', 'easy')).toEqual({ bestTime: 280, bestSteps: 210, clears: 3 })
    expect(save.loadRecord('rainbow', 'hard')).toBeNull()
  })
})
