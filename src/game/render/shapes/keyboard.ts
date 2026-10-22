// Keyboard tower: a long spacebar, piles of loose keycaps, a key that types by itself, and Enter as the checkpoint.

import * as THREE from 'three'
import { rand } from '../../util.ts'
import { softBlock } from '../geometry.ts'
import { wordTexture } from '../textures.ts'
import { baseView, cachedMaterial, registerShape, squashSync } from '../views.ts'
import { breakableView, seeded } from './kit.ts'
import { addKeycap, keyMaterial } from './rainbow.ts'

const spaceGeo = softBlock(3.6, 0.55, 1.3, 0.22, 0.09)

registerShape('spaceBar', (placed) => {
  const { root, body } = baseView(placed)
  const mesh = new THREE.Mesh(spaceGeo, keyMaterial(placed.color ?? placed.skin.color ?? '#f4f1ff'))
  body.add(mesh)
  return {
    root,
    occluders: [mesh],
    sync(p) { squashSync(body, p, 0.1) },
    surface: (p) => ({ stand: p.press, shadow: p.press }),
    dispose() {},
  }
})

const capGeo = softBlock(0.42, 0.22, 0.42, 0.08, 0.04)

/** A heap of loose keycaps four layers high; stepping on it spills it into a low scatter. */
registerShape('keycapPile', (placed, ctx) => {
  const rnd = seeded(placed)
  const colors = ctx.theme.palette
  const cap = (x: number, y: number, z: number) => {
    const m = new THREE.Mesh(capGeo, keyMaterial(colors[Math.floor(rnd() * colors.length)]))
    m.position.set(x, y, z)
    m.rotation.y = rnd() * Math.PI
    m.rotation.z = (rnd() - 0.5) * 0.25
    return m
  }
  const intact = new THREE.Group()
  const layers: [number, number][] = [[3, 0.46], [3, 0.4], [2, 0.42], [1, 0]]
  layers.forEach(([n, step], layer) => {
    const off = ((n - 1) * step) / 2
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) intact.add(cap(i * step - off, layer * 0.22, j * step - off))
  })
  const broken = new THREE.Group()
  for (let i = 0; i < 16; i++) {
    const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * 0.8
    broken.add(cap(Math.cos(a) * r, (i % 2) * 0.22, Math.sin(a) * r))
  }
  const occluder = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.9, 1.4).translate(0, 0.45, 0))
  occluder.visible = false
  intact.add(occluder)
  return breakableView(placed, {
    intact,
    broken,
    occluders: [occluder],
    burst(p) {
      for (let k = 0; k < 3; k++) ctx.effects.shards(placed.x, p.collider.top, placed.z, colors[Math.floor(rand(0, colors.length))], 8, 0.6)
    },
  })
})

/** A keycap that keeps typing while someone stands on it ("타다닥"). */
registerShape('rapidKey', (placed) => {
  const { root, body } = baseView(placed)
  const color = placed.color ?? placed.skin.color ?? '#ffd86b'
  const mesh = addKeycap(body, color, placed.label, '#5b4668')
  return {
    root,
    occluders: [mesh],
    sync(p, time) {
      squashSync(body, p)
      if (p.standing) body.position.y = p.press - Math.abs(Math.sin(time * 38)) * 0.05
    },
    surface: (p) => ({ stand: p.press, shadow: p.press }),
    dispose() {},
  }
})

const enterGeo = softBlock(2.0, 0.3, 2.0, 0.3, 0.1)
const enterLabelGeo = new THREE.PlaneGeometry(1.3, 0.65).rotateX(-Math.PI / 2)

/** The checkpoint of the keyboard tower: a big Enter key that lights up once reached. */
registerShape('enterKey', (placed) => {
  const { root, body } = baseView(placed)
  const mat = new THREE.MeshStandardMaterial({ color: '#ffe6a8', roughness: 0.55, emissive: '#ffd86b', emissiveIntensity: 0 })
  const mesh = new THREE.Mesh(enterGeo, mat)
  const label = new THREE.Mesh(enterLabelGeo, cachedMaterial('enter-label', () => new THREE.MeshBasicMaterial({
    map: wordTexture('Enter', '#5b4668'), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2,
  })))
  label.position.y = 0.303
  body.add(mesh, label)
  return {
    root,
    occluders: [mesh],
    sync(p) {
      mat.emissiveIntensity = p.active ? 0.45 : 0
      squashSync(body, p, 0.1)
    },
    dispose() { mat.dispose() },
  }
})
