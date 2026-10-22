// Strawberry choco tower: snapping chocolate bars, strawberry jelly, marshmallows,
// crunchy choco balls and a dish of melted chocolate.

import * as THREE from 'three'
import { softBlock } from '../geometry.ts'
import { baseView, cachedMaterial, registerShape, squashSync } from '../views.ts'
import { breakableView, puddleShape, seeded } from './kit.ts'
import { ballView } from './rainbow.ts'

const segGeo = softBlock(0.56, 0.35, 0.6, 0.06, 0.05)
const chocoMat = () => cachedMaterial('choco-bar', () => new THREE.MeshStandardMaterial({ color: '#6e3b24', roughness: 0.45 }))

/** A 3 × 2 chocolate bar; the first step snaps it into three chunks that settle lower. */
registerShape('chocoBar', (placed, ctx) => {
  const rnd = seeded(placed)
  const segment = (x: number, z: number) => {
    const m = new THREE.Mesh(segGeo, chocoMat())
    m.position.set(x, 0, z)
    return m
  }
  const intact = new THREE.Group()
  for (const x of [-0.6, 0, 0.6]) for (const z of [-0.32, 0.32]) intact.add(segment(x, z))
  const broken = new THREE.Group()
  for (const x of [-0.62, 0, 0.62]) {
    const chunk = new THREE.Group()
    chunk.add(segment(0, -0.32), segment(0, 0.32))
    chunk.position.set(x * 1.08, 0, 0)
    chunk.rotation.set((rnd() - 0.5) * 0.12, (rnd() - 0.5) * 0.3, (rnd() - 0.5) * 0.1)
    chunk.scale.y = 0.7
    broken.add(chunk)
  }
  return breakableView(placed, {
    intact,
    broken,
    occluders: [...intact.children],
    burst(p) { ctx.effects.shards(placed.x, p.collider.top, placed.z, '#6e3b24', 18, 0.7) },
  })
})

const jellyGeo = softBlock(1.6, 0.8, 1.6, 0.3, 0.15)
const berryGeo = new THREE.SphereGeometry(0.16, 14, 10)

/** Wobbly strawberry jelly with a few strawberry pieces suspended inside. */
registerShape('jellyCube', (placed) => {
  const { root, body } = baseView(placed)
  const color = placed.color ?? placed.skin.color ?? '#ff8fab'
  const mesh = new THREE.Mesh(jellyGeo, cachedMaterial(`jelly:${color}`, () => new THREE.MeshPhysicalMaterial({
    color, roughness: 0.1, clearcoat: 1, transparent: true, opacity: 0.78,
  })))
  body.add(mesh)
  const rnd = seeded(placed)
  const berryMat = cachedMaterial('berry', () => new THREE.MeshStandardMaterial({ color: '#e8344e', roughness: 0.4 }))
  for (let i = 0; i < 3; i++) {
    const b = new THREE.Mesh(berryGeo, berryMat)
    b.position.set((rnd() - 0.5) * 0.9, 0.25 + rnd() * 0.3, (rnd() - 0.5) * 0.9)
    b.scale.set(1, 0.8, 1.2)
    body.add(b)
  }
  return { root, occluders: [mesh], sync(p) { squashSync(body, p) }, dispose() {} }
})

const mallowGeo = new THREE.LatheGeometry(
  [[0, 0], [0.62, 0], [0.72, 0.06], [0.76, 0.2], [0.76, 0.7], [0.72, 0.84], [0.62, 0.9], [0, 0.9]].map(([x, y]) => new THREE.Vector2(x, y)), 36,
)

registerShape('marshmallow', (placed) => {
  const { root, body } = baseView(placed)
  const color = placed.color ?? placed.skin.color ?? '#fff4f7'
  const mesh = new THREE.Mesh(mallowGeo, cachedMaterial(`mallow:${color}`, () => new THREE.MeshStandardMaterial({ color, roughness: 0.95 })))
  body.add(mesh)
  return { root, occluders: [mesh], sync(p) { squashSync(body, p, 0.7) }, dispose() {} }
})

ballView('#7b4a33', '#f6e0c8', 'chocoBall')

puddleShape('chocoPuddle', { liquid: '#5c2e1b', dish: '#ffd6e2', bubble: '#7a4129', every: [0.08, 0.16] })
