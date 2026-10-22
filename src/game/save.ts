// Settings, where each climb left off, and best records, kept in this browser only.
// Anything unreadable falls back to defaults; a blocked storage just means nothing is kept.

import type { CharacterId, DifficultyKey, TowerId } from './types.ts'
import { clamp } from './util.ts'

export interface StorageLike {
  getItem(k: string): string | null
  setItem(k: string, v: string): void
  removeItem(k: string): void
}

export interface Prefs {
  tower: TowerId
  character: CharacterId
  difficulty: DifficultyKey
  volume: number
  muted: boolean
}

export interface Progress {
  checkpoint: number
  elapsed: number
  steps: number
  savedAt: number
}

export interface RecordEntry {
  bestTime: number
  /** steps taken on the best-time climb */
  bestSteps: number
  clears: number
}

export interface Save {
  loadPrefs(): Prefs
  savePrefs(p: Prefs): void
  loadProgress(t: TowerId, d: DifficultyKey): Progress | null
  saveProgress(t: TowerId, d: DifficultyKey, p: Progress): void
  clearProgress(t: TowerId, d: DifficultyKey): void
  loadRecord(t: TowerId, d: DifficultyKey): RecordEntry | null
  recordClear(t: TowerId, d: DifficultyKey, time: number, steps: number): { newBest: boolean; record: RecordEntry }
}

export const DEFAULT_PREFS: Prefs = { tower: 'rainbow', character: 'hamster', difficulty: 'easy', volume: 0.7, muted: false }

const DIFFICULTIES: readonly DifficultyKey[] = ['easy', 'normal', 'hard']
const PREFS_KEY = 'wakppu.prefs'
const progressKey = (t: TowerId, d: DifficultyKey) => `wakppu.progress.${t}.${d}`
const recordKey = (t: TowerId, d: DifficultyKey) => `wakppu.record.${t}.${d}`

export function getBrowserStorage(): StorageLike | null {
  try {
    const s = window.localStorage
    s.setItem('wakppu.probe', '1')
    s.removeItem('wakppu.probe')
    return s
  } catch {
    return null
  }
}

/** A saved spot is only usable if it points at a checkpoint the current layout still has. */
export function sanitizeProgress(p: Progress | null, checkpointCount: number): Progress | null {
  if (!isProgress(p)) return null
  return p.checkpoint < checkpointCount ? p : null
}

export function createSave(
  storage: StorageLike | null,
  known: { towers: readonly TowerId[]; characters: readonly CharacterId[] },
): Save {
  const read = (k: string): unknown => {
    if (!storage) return null
    try {
      const v = storage.getItem(k)
      return v === null ? null : JSON.parse(v)
    } catch {
      return null
    }
  }
  const write = (k: string, v: unknown) => {
    try { storage?.setItem(k, JSON.stringify(v)) } catch { /* full or blocked: keep playing */ }
  }
  const remove = (k: string) => {
    try { storage?.removeItem(k) } catch { /* blocked */ }
  }
  const loadRecord = (t: TowerId, d: DifficultyKey) => {
    const r = read(recordKey(t, d))
    return isRecord(r) ? r : null
  }

  return {
    loadPrefs() {
      const raw = read(PREFS_KEY)
      const o = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>
      return {
        tower: pick(o.tower, known.towers, DEFAULT_PREFS.tower),
        character: pick(o.character, known.characters, DEFAULT_PREFS.character),
        difficulty: pick(o.difficulty, DIFFICULTIES, DEFAULT_PREFS.difficulty),
        volume: typeof o.volume === 'number' && Number.isFinite(o.volume) ? clamp(o.volume, 0, 1) : DEFAULT_PREFS.volume,
        muted: typeof o.muted === 'boolean' ? o.muted : DEFAULT_PREFS.muted,
      }
    },
    savePrefs(p) { write(PREFS_KEY, p) },
    loadProgress(t, d) {
      const p = read(progressKey(t, d))
      return isProgress(p) ? p : null
    },
    saveProgress(t, d, p) { write(progressKey(t, d), p) },
    clearProgress(t, d) { remove(progressKey(t, d)) },
    loadRecord,
    recordClear(t, d, time, steps) {
      const prev = loadRecord(t, d)
      const newBest = !prev || time < prev.bestTime
      const record: RecordEntry = newBest
        ? { bestTime: time, bestSteps: steps, clears: (prev?.clears ?? 0) + 1 }
        : { ...prev, clears: prev.clears + 1 }
      write(recordKey(t, d), record)
      return { newBest, record }
    },
  }
}

function pick<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(v as T) ? (v as T) : fallback
}

const isCount = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0
const isTime = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0

function isProgress(p: unknown): p is Progress {
  if (typeof p !== 'object' || p === null) return false
  const o = p as Record<string, unknown>
  return isCount(o.checkpoint) && isTime(o.elapsed) && isCount(o.steps) && typeof o.savedAt === 'number'
}

function isRecord(r: unknown): r is RecordEntry {
  if (typeof r !== 'object' || r === null) return false
  const o = r as Record<string, unknown>
  return isTime(o.bestTime) && isCount(o.bestSteps) && isCount(o.clears) && (o.clears as number) > 0
}
