// Turns a tower's climb into placed platforms for one difficulty, plus the checks
// every tower must pass: reachable jumps, head room, and length.

import { DIFFICULTY, PACE, PLAYER, TOWER } from './config.ts'
import type { DifficultyKey, Layout, PlacedPlatform, TowerDef } from './types.ts'

/** Highest rise a jump may ask for; the apex is 9.4² / (2·26) ≈ 1.70. */
const MAX_RISE = 1.5
/** platforms this close in the climb are never on different laps (steps are at least 1.36 apart) */
const NEIGHBOURS = 2

export function buildLayout(tower: TowerDef, diff: DifficultyKey): Layout {
  const d = DIFFICULTY[diff]
  if (tower.steps.at(-1)?.skin !== 'goal') throw new Error(`${tower.id}: the last step must be the goal`)

  const platforms: PlacedPlatform[] = []
  const checkpoints: number[] = []
  const place = (skinId: string, t: number, top: number, jump: boolean, extra: { r?: number; label?: string; color?: string; checkpoint?: boolean }) => {
    const skin = tower.skins[skinId]
    if (!skin) throw new Error(`${tower.id}: unknown skin '${skinId}'`)
    const r = TOWER.radius + (extra.r ?? 0)
    const p: PlacedPlatform = {
      index: platforms.length, skinId, skin, t, r,
      x: r * Math.cos(t), z: -r * Math.sin(t),
      // local x runs along the spiral, local z points away from the pillar
      yaw: Math.atan2(Math.cos(t), -Math.sin(t)),
      top, jump,
    }
    if (extra.label !== undefined) p.label = extra.label
    if (extra.color !== undefined) p.color = extra.color
    if (extra.checkpoint) { p.checkpoint = checkpoints.length; checkpoints.push(p.index) }
    platforms.push(p)
  }

  place('checkpoint', 0, TOWER.startTop, false, { checkpoint: true })
  let t = 0, top = TOWER.startTop
  for (const step of tower.steps) {
    const jump = step.arc > TOWER.jumpArc
    t += (jump ? step.arc * d.gap : step.arc) / TOWER.radius
    top += jump ? step.rise * d.rise : step.rise
    const kept = step.skin === 'checkpoint' && (step.tier ?? 1) <= d.keep
    const skinId = step.skin === 'checkpoint' && !kept ? 'pad' : step.skin
    place(skinId, t, top, jump, { r: step.r, label: step.label, color: step.color, checkpoint: kept })
  }
  const goal = platforms.length - 1
  return { platforms, checkpoints, goal, goalTop: platforms[goal].top }
}

/** Expected climbing time at a casual pace, and the longest climb between checkpoints. */
export function estimateSeconds(layout: Layout) {
  let total = 0, stretch = 0, worstStretch = 0
  const { platforms } = layout
  for (let i = 1; i < platforms.length; i++) {
    const s = platforms[i].jump ? PACE.jumpSec : PACE.walkSec
    total += s
    stretch += s
    if (platforms[i].checkpoint !== undefined || i === layout.goal) {
      worstStretch = Math.max(worstStretch, stretch)
      stretch = 0
    }
  }
  return { total, worstStretch }
}

/** Indices of platforms that cannot be reached from the one before, with a safety margin. */
export function unreachableJumps(layout: Layout, safety = 0.9): number[] {
  const out: number[] = []
  const { platforms } = layout
  const v = PLAYER.jumpSpeed, g = PLAYER.gravity
  for (let i = 1; i < platforms.length; i++) {
    const a = platforms[i - 1], b = platforms[i]
    const rise = b.top - a.top
    if (rise > MAX_RISE) { out.push(i); continue }
    const air = (v + Math.sqrt(v * v - 2 * g * rise)) / g
    if (gapBetween(a, b) > PLAYER.runSpeed * air * safety) out.push(i)
  }
  return out
}

/**
 * Pairs of platforms whose footings overlap with too little head room between them.
 * Neighbours in the climb are skipped: keys in a row fan out around the spiral and touch
 * at their inner corners, which is fine; trouble is a later lap passing over an earlier one.
 */
export function clearanceViolations(layout: Layout, minGap = 3.2): Array<[number, number]> {
  const out: Array<[number, number]> = []
  const { platforms } = layout
  for (let i = 0; i < platforms.length; i++) {
    for (let j = i + NEIGHBOURS + 1; j < platforms.length; j++) {
      const a = platforms[i], b = platforms[j]
      if (signedGap(a, b) >= 0) continue
      const [lo, hi] = a.top <= b.top ? [a, b] : [b, a]
      const hiBottom = hi.top - hi.skin.topRest + hi.skin.botRest
      if (hiBottom - lo.top < minGap) out.push([i, j])
    }
  }
  return out
}

function gapBetween(a: PlacedPlatform, b: PlacedPlatform) {
  return Math.max(0, signedGap(a, b))
}

/** Distance between two footings along the line joining their centres; negative when they overlap. */
function signedGap(a: PlacedPlatform, b: PlacedPlatform) {
  const dx = b.x - a.x, dz = b.z - a.z
  const d = Math.hypot(dx, dz)
  if (d < 1e-9) return -Infinity
  const ux = dx / d, uz = dz / d
  return d - extent(a, ux, uz) - extent(b, ux, uz)
}

function extent(p: PlacedPlatform, ux: number, uz: number) {
  const c = Math.cos(p.yaw), s = Math.sin(p.yaw)
  return Math.abs(ux * c - uz * s) * p.skin.hx + Math.abs(ux * s + uz * c) * p.skin.hz
}
