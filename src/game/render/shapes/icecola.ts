// Ice cola tower: snow blocks that puff, thin ice that cracks, clinking ice cubes and cola puddles.

import * as THREE from 'three'
import { softBlock } from '../geometry.ts'
import { baseView, cachedMaterial, registerShape, squashSync } from '../views.ts'
import { breakableView, onLand, puddleShape, seeded } from './kit.ts'

const snowGeo = softBlock(1.5, 0.6, 1.5, 0.4, 0.2)
const lumpGeo = new THREE.SphereGeometry(0.28, 14, 10)

/** A soft snow block; landing on it throws up a little puff of snow. */
registerShape('snowBlock', (placed, ctx) => {
  const { root, body } = baseView(placed)
  const snow = cachedMaterial('snow', () => new THREE.MeshStandardMaterial({ color: '#fbfdff', roughness: 1 }))
  const mesh = new THREE.Mesh(snowGeo, snow)
  body.add(mesh)
  const rnd = seeded(placed)
  for (let i = 0; i < 3; i++) {
    const lump = new THREE.Mesh(lumpGeo, snow)
    lump.position.set((rnd() - 0.5) * 1.0, 0.55, (rnd() - 0.5) * 1.0)
    lump.scale.set(1, 0.45, 1)
    body.add(lump)
  }
  const puff = onLand((p) => ctx.effects.puff(placed.x, p.collider.top, placed.z, '#ffffff', 10))
  return { root, occluders: [mesh], sync(p) { squashSync(body, p); puff(p) }, dispose() {} }
})

const iceMat = () => cachedMaterial('thin-ice', () => new THREE.MeshPhysicalMaterial({
  color: '#cfefff', roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.72,
}))
const slabGeo = softBlock(1.7, 0.3, 1.7, 0.2, 0.06)
const shardSlabGeo = softBlock(0.8, 0.2, 0.8, 0.08, 0.04)

/** A pane of thin ice; the first step breaks it into four lower pieces. */
registerShape('thinIce', (placed, ctx) => {
  const rnd = seeded(placed)
  const intact = new THREE.Group()
  const pane = new THREE.Mesh(slabGeo, iceMat())
  intact.add(pane)
  const broken = new THREE.Group()
  for (const [x, z] of [[-0.43, -0.43], [0.43, -0.43], [-0.43, 0.43], [0.43, 0.43]]) {
    const piece = new THREE.Mesh(shardSlabGeo, iceMat())
    piece.position.set(x * 1.05, 0, z * 1.05)
    piece.rotation.set((rnd() - 0.5) * 0.2, (rnd() - 0.5) * 0.4, (rnd() - 0.5) * 0.2)
    broken.add(piece)
  }
  return breakableView(placed, {
    intact,
    broken,
    occluders: [pane],
    burst(p) { ctx.effects.shards(placed.x, p.collider.top, placed.z, '#e6f7ff', 20, 0.7) },
  })
})

const cubeGeo = softBlock(1.2, 0.9, 1.2, 0.14, 0.08)
const coreGeo = new THREE.BoxGeometry(0.6, 0.5, 0.6).translate(0, 0.45, 0)

/** A big ice cube that jumps a little when landed on. */
registerShape('iceCube', (placed) => {
  const { root, body } = baseView(placed)
  const mesh = new THREE.Mesh(cubeGeo, cachedMaterial('ice-cube', () => new THREE.MeshPhysicalMaterial({
    color: '#bfe8ff', roughness: 0.04, clearcoat: 1, transparent: true, opacity: 0.6,
  })))
  const core = new THREE.Mesh(coreGeo, cachedMaterial('ice-core', () => new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.35 })))
  body.add(mesh, core)
  return { root, occluders: [mesh], sync(p) { squashSync(body, p, 0.2) }, dispose() {} }
})

puddleShape('colaPuddle', { liquid: '#4a1f10', dish: '#eaf6ff', bubble: '#f3e3d3', every: [0.03, 0.07] })
