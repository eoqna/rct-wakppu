// A platform's look. Each skin names a shape; shapes register a builder here and
// redraw themselves from the platform's state every frame.

import * as THREE from 'three'
import type { PlatformState } from '../platform.ts'
import type { PlacedPlatform, TowerTheme } from '../types.ts'
import type { Effects } from './effects.ts'

export interface ViewContext {
  theme: TowerTheme
  effects: Effects
}

export interface PlatformView {
  root: THREE.Group
  /** meshes the camera should not look through */
  occluders: THREE.Object3D[]
  sync(p: PlatformState, time: number, dt: number): void
  crack?(p: PlatformState): void
  restore?(p: PlatformState): void
  collapse?(p: PlatformState): void
  /** how far the character (stand) and its shadow sit above the collider top */
  surface?(p: PlatformState): { stand: number; shadow: number }
  dispose(): void
}

type ShapeBuilder = (placed: PlacedPlatform, ctx: ViewContext) => PlatformView

const SHAPES = new Map<string, ShapeBuilder>()

export function registerShape(shape: string, build: ShapeBuilder) {
  SHAPES.set(shape, build)
}

export function createView(placed: PlacedPlatform, ctx: ViewContext): PlatformView {
  const build = SHAPES.get(placed.skin.shape)
  if (!build) throw new Error(`no shape registered for '${placed.skin.shape}'`)
  return build(placed, ctx)
}

/** The usual frame: root at the platform's base, turned along the spiral; body squashes and presses. */
export function baseView(placed: PlacedPlatform) {
  const root = new THREE.Group()
  root.position.set(placed.x, placed.top - placed.skin.topRest, placed.z)
  root.rotation.y = placed.yaw
  const body = new THREE.Group()
  root.add(body)
  return { root, body }
}

export function squashSync(body: THREE.Object3D, p: PlatformState, widen = 0.55) {
  const sx = 1 + (1 - p.sy) * widen
  body.scale.set(sx, p.sy, sx)
  body.position.y = p.press
}

const materials = new Map<string, THREE.Material>()

/** Shared materials, keyed by kind and colour; they live for the whole session. */
export function cachedMaterial<M extends THREE.Material>(key: string, make: () => M): M {
  let m = materials.get(key)
  if (!m) {
    m = make()
    materials.set(key, m)
  }
  return m as M
}
