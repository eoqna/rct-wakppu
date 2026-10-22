import { makeCollider, type Collider } from '../../src/game/physics.ts'

export const RADIUS = 4.6

/** A key-sized box sitting on the climbing spiral at angle t, as the tower lays them out. */
export function spiralKey(
  id: number,
  t: number,
  top: number,
  o: { hx?: number; hz?: number; height?: number; r?: number } = {},
): Collider {
  const r = o.r ?? RADIUS
  const yaw = Math.atan2(Math.cos(t), -Math.sin(t))
  return makeCollider(id, r * Math.cos(t), -r * Math.sin(t), yaw, o.hx ?? 0.65, o.hz ?? 0.65, top, top - (o.height ?? 0.55))
}

/** Unit direction of travel along the spiral (increasing t) at a point. */
export function tangentAt(x: number, z: number): [number, number] {
  const t = Math.atan2(-z, x)
  return [-Math.sin(t), -Math.cos(t)]
}

/** Arc length along the spiral expressed as an angle. */
export const arc = (len: number) => len / RADIUS
