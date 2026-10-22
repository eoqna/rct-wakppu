// Honey tower: wax honeycomb that crumbles, honey puddles, honey-drop jelly and wooden dipper steps.

import * as THREE from 'three'
import { hexTexture } from '../textures.ts'
import { baseView, cachedMaterial, registerShape, squashSync } from '../views.ts'
import { addKeycap } from './rainbow.ts'
import { breakableView, puddleShape, seeded } from './kit.ts'

const combGeo = new THREE.CylinderGeometry(0.88, 0.88, 0.6, 6).translate(0, 0.3, 0)
const crumbGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.4, 6).translate(0, 0.2, 0)

const combMaterials = () => {
  const side = cachedMaterial('comb-side', () => new THREE.MeshStandardMaterial({ color: '#f5c04a', roughness: 0.55 }))
  const top = cachedMaterial('comb-top', () => new THREE.MeshStandardMaterial({ map: hexTexture('#ffd76e', '#d9962a'), roughness: 0.5 }))
  // cylinder groups: side, top cap, bottom cap
  return [side, top, side]
}

/** A wax honeycomb block; the first step crushes it into lower crumbs. */
registerShape('hexComb', (placed, ctx) => {
  const rnd = seeded(placed)
  const mats = combMaterials()
  const block = new THREE.Mesh(combGeo, mats)
  block.rotation.y = Math.PI / 6
  const intact = new THREE.Group()
  intact.add(block)
  const broken = new THREE.Group()
  for (let i = 0; i < 4; i++) {
    const crumb = new THREE.Mesh(crumbGeo, mats)
    const a = (i / 4) * Math.PI * 2 + rnd() * 0.5
    crumb.position.set(Math.cos(a) * 0.42, 0, Math.sin(a) * 0.42)
    crumb.rotation.set((rnd() - 0.5) * 0.2, rnd() * Math.PI, (rnd() - 0.5) * 0.2)
    broken.add(crumb)
  }
  return breakableView(placed, {
    intact,
    broken,
    occluders: [block],
    burst(p) { ctx.effects.shards(placed.x, p.collider.top, placed.z, '#f5c04a', 18, 0.6) },
  })
})

puddleShape('honeyPuddle', { liquid: '#f0a01c', dish: '#fff1c7', bubble: '#ffe08a', every: [0.25, 0.5] })

const dropGeo = new THREE.LatheGeometry(
  [[0, 0], [0.55, 0], [0.68, 0.08], [0.72, 0.3], [0.62, 0.55], [0.4, 0.72], [0.18, 0.82], [0, 0.86]].map(([x, y]) => new THREE.Vector2(x, y)), 36,
)

/** A wobbly drop of honey jelly. */
registerShape('honeyDrop', (placed) => {
  const { root, body } = baseView(placed)
  const color = placed.color ?? placed.skin.color ?? '#ffc23d'
  const mesh = new THREE.Mesh(dropGeo, cachedMaterial(`drop:${color}`, () => new THREE.MeshPhysicalMaterial({
    color, roughness: 0.08, clearcoat: 1, transparent: true, opacity: 0.85,
  })))
  body.add(mesh)
  return { root, occluders: [mesh], sync(p) { squashSync(body, p) }, dispose() {} }
})

const grooveGeo = new THREE.BoxGeometry(1.32, 0.05, 0.08)

/** Wooden steps with dipper grooves; labels are carved in darker ink. */
registerShape('woodStick', (placed) => {
  const { root, body } = baseView(placed)
  const mesh = addKeycap(body, placed.color ?? placed.skin.color ?? '#d9a66b', placed.label, '#7a4b22')
  const groove = cachedMaterial('wood-groove', () => new THREE.MeshStandardMaterial({ color: '#b07a43', roughness: 0.8 }))
  const rnd = seeded(placed)
  for (const z of [-0.42, 0.42]) {
    const g = new THREE.Mesh(grooveGeo, groove)
    g.position.set(0, 0.555 + rnd() * 0.004, z)
    body.add(g)
  }
  return {
    root,
    occluders: [mesh],
    sync(p) { squashSync(body, p) },
    surface: (p) => ({ stand: p.press, shadow: p.press }),
    dispose() {},
  }
})
