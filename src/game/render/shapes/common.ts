// Checkpoint discs, plain pads and the goal trophy, shared by every tower.

import * as THREE from 'three'
import { decalTexture } from '../textures.ts'
import { baseView, cachedMaterial, registerShape } from '../views.ts'

const padGeo = new THREE.CylinderGeometry(1.3, 1.38, 0.3, 48).translate(0, 0.15, 0)
const decalGeo = new THREE.PlaneGeometry(2.1, 2.1).rotateX(-Math.PI / 2)
const goalGeo = new THREE.CylinderGeometry(1.9, 2.0, 0.4, 56).translate(0, 0.2, 0)

registerShape('checkpoint', (placed, ctx) => {
  const { root, body } = baseView(placed)
  const kind = ctx.theme.decal ?? 'flower'
  // its own material: the glow tells whether this checkpoint has been reached
  const mat = new THREE.MeshStandardMaterial({ color: '#fff3e6', roughness: 0.7, emissive: '#ffd86b', emissiveIntensity: 0 })
  const disc = new THREE.Mesh(padGeo, mat)
  const decal = new THREE.Mesh(decalGeo, cachedMaterial(`decal:${kind}`, () => new THREE.MeshBasicMaterial({
    map: decalTexture(kind), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2,
  })))
  decal.position.y = 0.303
  body.add(disc, decal)
  return {
    root,
    occluders: [disc],
    sync(p) { mat.emissiveIntensity = p.active ? 0.45 : 0 },
    dispose() { mat.dispose() },
  }
})

registerShape('pad', (placed) => {
  const { root, body } = baseView(placed)
  const disc = new THREE.Mesh(padGeo, cachedMaterial('pad', () => new THREE.MeshStandardMaterial({ color: '#f3e4ef', roughness: 0.7 })))
  body.add(disc)
  return { root, occluders: [disc], sync() {}, dispose() {} }
})

function makeTrophy() {
  const gold = cachedMaterial('trophy-gold', () => new THREE.MeshStandardMaterial({ color: '#ffc93c', metalness: 0.55, roughness: 0.28 }))
  const g = new THREE.Group()
  const profile = [[0, 0], [0.34, 0], [0.36, 0.08], [0.12, 0.14], [0.09, 0.42], [0.2, 0.52], [0.44, 0.78], [0.48, 1.08], [0.43, 1.1]]
    .map(([x, y]) => new THREE.Vector2(x, y))
  g.add(new THREE.Mesh(new THREE.LatheGeometry(profile, 40), gold))
  for (const s of [-1, 1]) {
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.045, 10, 24, Math.PI), gold)
    handle.position.set(0.46 * s, 0.86, 0)
    handle.rotation.z = (-s * Math.PI) / 2
    g.add(handle)
  }
  const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.22),
    cachedMaterial('trophy-star', () => new THREE.MeshStandardMaterial({ color: '#ff9cc4', emissive: '#ff6fa8', emissiveIntensity: 0.4, roughness: 0.4 })))
  star.position.y = 1.55
  g.add(star)
  g.position.y = 0.4
  return { trophy: g, star }
}

registerShape('goal', (placed) => {
  const { root, body } = baseView(placed)
  const disc = new THREE.Mesh(goalGeo, cachedMaterial('goal-disc', () => new THREE.MeshStandardMaterial({ color: '#ffe08a', roughness: 0.55 })))
  const { trophy, star } = makeTrophy()
  body.add(disc, trophy)
  return {
    root,
    occluders: [disc],
    sync(_p, time, dt) {
      trophy.rotation.y += dt * 0.8
      star.position.y = 1.55 + Math.sin(time * 2) * 0.08
      star.rotation.y += dt * 2
    },
    dispose() {},
  }
})
