// Building blocks for platform looks: things that break, liquid puddles, rising bubbles.

import * as THREE from 'three'
import type { PlatformState } from '../../platform.ts'
import type { PlacedPlatform } from '../../types.ts'
import { mulberry32, rand } from '../../util.ts'
import { regrowScale } from '../geometry.ts'
import { baseView, cachedMaterial, registerShape, squashSync, type PlatformView, type ViewContext } from '../views.ts'

/** Same scatter for the same platform every time the tower is built. */
export const seeded = (placed: PlacedPlatform) => mulberry32(placed.index * 7919 + 17)

/**
 * Something that breaks: `intact` until the first step, then `broken` (lower) stays;
 * on the hard setting `broken` flattens away; the intact shape pops back when it regrows.
 */
export function breakableView(
  placed: PlacedPlatform,
  parts: { intact: THREE.Object3D; broken: THREE.Object3D; occluders: THREE.Object3D[]; burst(p: PlatformState): void },
): PlatformView {
  const { root, body } = baseView(placed)
  body.add(parts.intact, parts.broken)
  parts.broken.visible = false
  return {
    root,
    occluders: parts.occluders,
    sync(p) {
      squashSync(body, p, 0.3)
      parts.intact.visible = !p.cracked
      parts.intact.scale.setScalar(!p.cracked && p.grow < 1 ? regrowScale(p.grow) : 1)
      parts.broken.visible = p.cracked && !(p.collapsed && p.shrink === 0)
      const k = p.collapsed ? Math.max(0.001, p.shrink) : 1
      parts.broken.scale.set(k, k, k)
    },
    crack: (p) => parts.burst(p),
    dispose() {},
  }
}

/** Bubbles rising around the feet while someone stands on a platform. */
export function bubbler(ctx: ViewContext, placed: PlacedPlatform, o: { spread: number; every: [number, number]; color: string; depth?: number }) {
  let t = 0
  return (p: PlatformState, dt: number) => {
    if (!p.standing) { t = 0; return }
    t -= dt
    while (t <= 0) {
      t += rand(o.every[0], o.every[1])
      ctx.effects.bubble(placed.x + rand(-o.spread, o.spread), p.collider.top - rand(0.02, o.depth ?? 0.25), placed.z + rand(-o.spread, o.spread), o.color)
    }
  }
}

/** Fires once each time someone lands on the platform. */
export function onLand(fn: (p: PlatformState) => void) {
  let was = false
  return (p: PlatformState) => {
    if (p.standing && !was) fn(p)
    was = p.standing
  }
}

const dishGeo = new THREE.CylinderGeometry(1.2, 1.28, 0.16, 40).translate(0, 0.08, 0)
const liquidGeo = new THREE.CylinderGeometry(1.08, 1.08, 0.08, 40).translate(0, 0.2, 0)

/** A shallow dish of something liquid; the standing height is its surface (topRest 0.25). */
export function puddleShape(kind: string, o: { liquid: string; dish: string; bubble: string; every: [number, number] }) {
  registerShape(kind, (placed, ctx) => {
    const { root, body } = baseView(placed)
    const dish = new THREE.Mesh(dishGeo, cachedMaterial(`dish:${o.dish}`, () => new THREE.MeshStandardMaterial({ color: o.dish, roughness: 0.6 })))
    const liquid = new THREE.Mesh(liquidGeo, cachedMaterial(`liquid:${o.liquid}`, () => new THREE.MeshPhysicalMaterial({
      color: o.liquid, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.1,
    })))
    body.add(dish, liquid)
    const bubbles = bubbler(ctx, placed, { spread: 0.8, every: o.every, color: o.bubble, depth: 0.08 })
    return {
      root,
      occluders: [dish],
      sync(p, _time, dt) {
        squashSync(body, p, 0.3)
        bubbles(p, dt)
      },
      dispose() {},
    }
  })
}
