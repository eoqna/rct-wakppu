// How each platform reacts to being stood on, generalized from the prototype's
// key, wax ball and soda jelly. Pure state: views read it, sounds come out as events.

import type { Collider } from './physics.ts'
import type { CueId, SkinDef } from './types.ts'
import { damp } from './util.ts'

export const BREAKABLE = { regenSec: 10, collapseDelay: 0.7, collapseShrink: 0.25, regrowSec: 0.35 } as const

const KEY_PRESS = -0.12
const SPRING_K = 240
const CRACK_KICK = 3.4
const SOFT_KICK = 2.2
const LEAVE_BOUNCE = 0.57

export interface PlatformState {
  index: number
  skin: SkinDef
  baseY: number
  topRest: number
  botRest: number
  sy: number
  svy: number
  target: number
  press: number
  pressTarget: number
  cracked: boolean
  regenAt: number
  collapseAt: number
  collapsed: boolean
  shrink: number
  grow: number
  active: boolean
  standing: boolean
  collider: Collider
}

export type PlatformEvent =
  | { type: 'cue'; cue: CueId }
  | { type: 'crack' }
  | { type: 'collapse' }
  | { type: 'restore' }
  | { type: 'loopStart'; cue: CueId }
  | { type: 'loopStop' }
  | { type: 'checkpoint' }
  | { type: 'goal' }

export type Emit = (index: number, e: PlatformEvent) => void

export function createPlatformState(index: number, skin: SkinDef, collider: Collider): PlatformState {
  return {
    index, skin, collider,
    baseY: collider.top - skin.topRest,
    topRest: skin.topRest, botRest: skin.botRest,
    sy: 1, svy: 0, target: 1, press: 0, pressTarget: 0,
    cracked: false, regenAt: 0, collapseAt: 0, collapsed: false, shrink: 0, grow: 1,
    active: false, standing: false,
  }
}

export function enterPlatform(p: PlatformState, now: number, collapse: boolean, emit: Emit) {
  const { skin } = p, cues = skin.cues
  const cue = (c: CueId | undefined) => { if (c) emit(p.index, { type: 'cue', cue: c }) }
  p.standing = true
  switch (skin.action) {
    case 'key':
      p.pressTarget = KEY_PRESS
      cue(cues.enter)
      break
    case 'breakable':
      p.target = skin.squash ?? 0.8
      if (!p.cracked) {
        // the shell bursts and the player sinks a little onto what is left
        p.cracked = true
        p.svy -= CRACK_KICK
        p.regenAt = now + BREAKABLE.regenSec
        if (collapse) p.collapseAt = now + BREAKABLE.collapseDelay
        if (skin.cracked) { p.topRest = skin.cracked.topRest; p.botRest = skin.cracked.botRest }
        emit(p.index, { type: 'crack' })
        cue(cues.crack)
      } else {
        p.svy -= SOFT_KICK
        cue(cues.enter)
      }
      break
    case 'squishy':
    case 'stay':
      p.target = skin.squash ?? 1
      p.svy -= skin.kick ?? 0
      cue(cues.enter)
      if (skin.action === 'stay' && cues.loop) emit(p.index, { type: 'loopStart', cue: cues.loop })
      break
    case 'checkpoint':
      cue(cues.enter)
      if (!p.active) {
        p.active = true
        emit(p.index, { type: 'checkpoint' })
        cue('synth:chime')
      }
      break
    case 'goal':
      emit(p.index, { type: 'goal' })
      break
    case 'plain':
      break
  }
}

export function leavePlatform(p: PlatformState, emit: Emit) {
  const { skin } = p, cues = skin.cues
  p.standing = false
  switch (skin.action) {
    case 'key':
      p.pressTarget = 0
      if (cues.leave) emit(p.index, { type: 'cue', cue: cues.leave })
      break
    case 'breakable':
      p.target = p.cracked ? 0.9 : 1
      break
    case 'squishy':
    case 'stay':
      p.target = 1
      p.svy += (skin.kick ?? 0) * LEAVE_BOUNCE
      if (skin.action === 'stay') {
        emit(p.index, { type: 'loopStop' })
        if (cues.leave) emit(p.index, { type: 'cue', cue: cues.leave })
      }
      break
    default:
      break
  }
}

export function updatePlatform(p: PlatformState, dt: number, now: number, emit: Emit) {
  const { skin } = p
  if (skin.action === 'breakable') {
    // a broken platform grows back once nobody is standing on it
    if (p.cracked && now >= p.regenAt && !p.standing) {
      restore(p)
      emit(p.index, { type: 'restore' })
    }
    // hard setting: what is left gives way shortly after the break
    if (p.cracked && !p.collapsed && p.collapseAt && now >= p.collapseAt) {
      p.collapsed = true
      p.shrink = 1
      emit(p.index, { type: 'collapse' })
      if (skin.cues.collapse) emit(p.index, { type: 'cue', cue: skin.cues.collapse })
    }
    if (p.collapsed && p.shrink > 0) {
      p.shrink = Math.max(0, p.shrink - dt / BREAKABLE.collapseShrink)
      const rest = skin.cracked ?? skin
      p.topRest = rest.topRest * p.shrink
      p.botRest = rest.botRest * p.shrink
      if (p.shrink === 0) p.collider.off = true
    }
    if (p.grow < 1) p.grow = Math.min(1, p.grow + dt / BREAKABLE.regrowSec)
  }
  p.svy += (SPRING_K * (p.target - p.sy) - (skin.soft ?? 15) * p.svy) * dt
  p.sy += p.svy * dt
  p.press += (p.pressTarget - p.press) * damp(30, dt)
  // the key press is cosmetic only: if it moved the collider, a player standing across two keys
  // would see the neighbour as a ledge, step onto it, and bounce between the two forever
  p.collider.top = p.baseY + p.topRest * p.sy
  p.collider.bottom = p.baseY + p.botRest * p.sy
}

/** Back to the untouched state, for a fresh run. Checkpoint 0 is re-activated by the caller. */
export function resetPlatform(p: PlatformState) {
  restore(p)
  p.grow = 1
  p.regenAt = 0
  p.active = false
  p.standing = false
  p.sy = 1; p.svy = 0; p.target = 1
  p.press = 0; p.pressTarget = 0
}

function restore(p: PlatformState) {
  p.cracked = false
  p.target = 1
  p.grow = 0
  p.topRest = p.skin.topRest
  p.botRest = p.skin.botRest
  p.collapseAt = 0
  p.collapsed = false
  p.shrink = 0
  p.collider.off = false
}
