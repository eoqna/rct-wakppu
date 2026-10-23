// A cylinder player against yaw-rotated boxes, ported from the prototype.
// Pure: no rendering, no sound. The game reacts to the ground changes it reports.

import { PHYSICS, PLAYER, SUPPORT_R, TOWER } from './config.ts'
import { approach, clamp } from './util.ts'

export interface Collider {
  id: number
  cx: number
  cz: number
  hx: number
  hz: number
  cos: number
  sin: number
  top: number
  bottom: number
  off: boolean
}

/** The ground disc around the tower; special-cased, never listed in a world. */
export const FLOOR: Collider = { id: -1, cx: 0, cz: 0, hx: 0, hz: 0, cos: 1, sin: 0, top: 0, bottom: -1, off: false }

export function makeCollider(
  id: number,
  cx: number,
  cz: number,
  yaw: number,
  hx: number,
  hz: number,
  top: number,
  bottom: number,
): Collider {
  return { id, cx, cz, hx, hz, cos: Math.cos(yaw), sin: Math.sin(yaw), top, bottom, off: false }
}

export function horizDist2(c: Collider, x: number, z: number) {
  const dx = x - c.cx, dz = z - c.cz
  const lx = c.cos * dx - c.sin * dz, lz = c.sin * dx + c.cos * dz
  const ex = lx - clamp(lx, -c.hx, c.hx), ez = lz - clamp(lz, -c.hz, c.hz)
  return ex * ex + ez * ez
}

export interface PlayerState {
  x: number
  y: number
  z: number
  vx: number
  vy: number
  vz: number
  grounded: boolean
  ground: Collider | null
  coyote: number
  jumpBuf: number
}

export interface World {
  colliders: Collider[]
  pillarTop: number
}

export interface StepEvents {
  jumped: boolean
  /** vertical speed (negative) of a hard landing this frame, else null */
  landingSpeed: number | null
  /** each new ground in the order it happened; null means airborne */
  groundChanges: (Collider | null)[]
}

const R2 = PLAYER.radius ** 2
const SUPPORT_R2 = SUPPORT_R ** 2
const HARD_LANDING = -7

export function createPlayer(): PlayerState {
  return { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, grounded: false, ground: null, coyote: 0, jumpBuf: 0 }
}

export function resetPlayer(p: PlayerState, x: number, y: number, z: number) {
  p.x = x; p.y = y; p.z = z
  p.vx = 0; p.vy = 0; p.vz = 0
  p.grounded = false; p.ground = null; p.coyote = 0; p.jumpBuf = 0
}

export function requestJump(p: PlayerState) {
  p.jumpBuf = PLAYER.jumpBuffer
}

/** One frame: jump and run control, then the fixed substeps. moveX/moveZ is a world direction of length 1 or 0. */
export function stepPlayer(p: PlayerState, world: World, moveX: number, moveZ: number, dt: number): StepEvents {
  const ev: StepEvents = { jumped: false, landingSpeed: null, groundChanges: [] }
  const setGround = (c: Collider | null) => {
    if (c === p.ground) return
    p.ground = c
    ev.groundChanges.push(c)
  }

  // ride a platform as it squashes or presses down, before the jump: a jump from a top that
  // has since risen would meet the platform just left as a wall and be pushed out sideways
  if (p.grounded && p.ground && Math.abs(p.ground.top - p.y) < PHYSICS.rideSnap) p.y = p.ground.top

  if (p.jumpBuf > 0) p.jumpBuf -= dt
  if (p.jumpBuf > 0 && (p.grounded || p.coyote > 0)) {
    p.vy = PLAYER.jumpSpeed; p.jumpBuf = 0; p.coyote = 0
    p.grounded = false
    setGround(null)
    ev.jumped = true
  }
  const accel = (p.grounded ? PLAYER.accelGround : PLAYER.accelAir) * dt
  p.vx = approach(p.vx, moveX * PLAYER.runSpeed, accel)
  p.vz = approach(p.vz, moveZ * PLAYER.runSpeed, accel)

  const h = dt / PHYSICS.substeps
  for (let i = 0; i < PHYSICS.substeps; i++) substep(p, world, h, ev, setGround)
  return ev
}

function substep(p: PlayerState, world: World, dt: number, ev: StepEvents, setGround: (c: Collider | null) => void) {
  p.vy = Math.max(p.vy - PLAYER.gravity * dt, -PLAYER.maxFall)
  p.x += p.vx * dt; p.z += p.vz * dt
  collideHorizontal(p, world, setGround)
  const prevY = p.y, vyBefore = p.vy
  p.y += p.vy * dt
  const landed = collideVertical(p, world, prevY)
  if (landed) {
    if (!p.grounded && vyBefore < HARD_LANDING && ev.landingSpeed === null) ev.landingSpeed = vyBefore
    p.grounded = true; p.coyote = PLAYER.coyote
    setGround(landed)
  } else {
    p.grounded = false; p.coyote -= dt
    setGround(null)
  }
}

function collideHorizontal(p: PlayerState, world: World, setGround: (c: Collider | null) => void) {
  for (const c of world.colliders) {
    if (c === p.ground || c.off) continue
    if (p.y + PLAYER.height <= c.bottom + 0.001 || p.y >= c.top - 0.001) continue
    const dx = p.x - c.cx, dz = p.z - c.cz
    const lx = c.cos * dx - c.sin * dz, lz = c.sin * dx + c.cos * dz
    const ex = lx - clamp(lx, -c.hx, c.hx), ez = lz - clamp(lz, -c.hz, c.hz)
    const d2 = ex * ex + ez * ez
    if (d2 >= R2) continue
    const rise = c.top - p.y
    if (rise <= PLAYER.stepUp && (p.grounded || p.coyote > 0 || (p.vy <= 0 && rise <= 0.3))) {
      // step up only once the centre is far enough over the ledge to stand there;
      // stepping up earlier gets undone by the support check and retriggers every substep
      if (d2 >= SUPPORT_R2) continue
      p.y = c.top; p.vy = Math.max(0, p.vy)
      p.grounded = true; p.coyote = PLAYER.coyote
      setGround(c)
      continue
    }
    let pushX: number, pushZ: number
    if (d2 > 1e-9) {
      const d = Math.sqrt(d2), pen = PLAYER.radius - d
      pushX = (ex / d) * pen; pushZ = (ez / d) * pen
    } else {
      const px = c.hx - Math.abs(lx) + PLAYER.radius, pz = c.hz - Math.abs(lz) + PLAYER.radius
      if (px < pz) { pushX = (lx >= 0 ? 1 : -1) * px; pushZ = 0 } else { pushX = 0; pushZ = (lz >= 0 ? 1 : -1) * pz }
    }
    p.x += c.cos * pushX + c.sin * pushZ
    p.z += -c.sin * pushX + c.cos * pushZ
  }
  const rr = Math.hypot(p.x, p.z), minR = TOWER.pillarRadius + PLAYER.radius
  if (rr < minR && p.y < world.pillarTop) {
    const k = minR / Math.max(rr, 1e-6)
    p.x *= k; p.z *= k
  }
}

function collideVertical(p: PlayerState, world: World, prevY: number): Collider | null {
  let best: Collider | null = null, bestD = Infinity
  for (const c of world.colliders) {
    if (c.off) continue
    const d2 = horizDist2(c, p.x, p.z)
    if (d2 >= SUPPORT_R2) continue
    if (p.vy <= 0) {
      const tol = c === p.ground ? 0.4 : 0.12
      // inclusive, so a player just stepped up onto exactly this top still counts as standing on it
      if (prevY >= c.top - tol && p.y <= c.top &&
        (d2 < bestD - 1e-6 || (best !== null && Math.abs(d2 - bestD) <= 1e-6 && c.top > best.top))) {
        best = c; bestD = d2
      }
    } else if (prevY + PLAYER.height <= c.bottom + 0.05 && p.y + PLAYER.height > c.bottom) {
      p.y = c.bottom - PLAYER.height; p.vy = 0
    }
  }
  if (best) { p.y = best.top; p.vy = 0; return best }
  if (p.vy <= 0 && p.y <= 0 && prevY >= -0.3 && Math.hypot(p.x, p.z) < TOWER.floorRadius) {
    p.y = 0; p.vy = 0
    return FLOOR
  }
  return null
}
