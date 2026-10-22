// The four characters. Simple rounded shapes like the prototype's, with sparkling eyes,
// a small smile and little feet so they read as cute rather than as plain capsules.
// All of them fit the same collision cylinder (radius 0.34, height 1.45) and face +z.

import * as THREE from 'three'
import type { CharacterId } from '../types.ts'

const INK = '#3a2947'
const ink = new THREE.MeshBasicMaterial({ color: INK })
const sparkle = new THREE.MeshBasicMaterial({ color: '#ffffff' })
const blush = new THREE.MeshBasicMaterial({ color: '#ff9cc4', transparent: true, opacity: 0.85 })
const eyeGeo = new THREE.SphereGeometry(0.06, 16, 12)
const sparkleGeo = new THREE.SphereGeometry(0.022, 8, 6)
const cheekGeo = new THREE.SphereGeometry(0.068, 12, 8)
const smileGeo = new THREE.TorusGeometry(0.042, 0.012, 6, 14, Math.PI)
const footGeo = new THREE.SphereGeometry(0.12, 14, 10)

function addFace(g: THREE.Group, y: number, z: number, spread = 0.12, smile = true, cheeks = true) {
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(eyeGeo, ink)
    eye.position.set(spread * s, y, z)
    eye.scale.set(1, 1.18, 0.55)
    const glint = new THREE.Mesh(sparkleGeo, sparkle)
    glint.position.set(spread * s + 0.02, y + 0.03, z + 0.03)
    g.add(eye, glint)
    if (!cheeks) continue
    const cheek = new THREE.Mesh(cheekGeo, blush)
    cheek.position.set((spread + 0.1) * s, y - 0.1, z - 0.01)
    cheek.scale.set(1, 0.55, 0.35)
    g.add(cheek)
  }
  if (!smile) return
  const mouth = new THREE.Mesh(smileGeo, ink)
  mouth.position.set(0, y - 0.08, z + 0.01)
  mouth.rotation.z = Math.PI
  g.add(mouth)
}

function addFeet(g: THREE.Group, color: string, spread = 0.15) {
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.6 })
  for (const s of [-1, 1]) {
    const foot = new THREE.Mesh(footGeo, mat)
    foot.position.set(spread * s, 0.06, 0.06)
    foot.scale.set(1, 0.55, 1.25)
    g.add(foot)
  }
}

export interface Character {
  id: CharacterId
  label: string
  /** colour for its chip in the menu */
  dot: string
  build(): THREE.Group
}

export const CHARACTERS: Character[] = [
  {
    id: 'hamster', label: '햄찌', dot: '#f2b36d',
    build() {
      // a round golden hamster with the white muzzle and chubby cheeks hamsters have, and a cream belly
      const g = new THREE.Group()
      const fur = new THREE.MeshStandardMaterial({ color: '#f6c27f', roughness: 0.75, emissive: '#eea24a', emissiveIntensity: 0.12 })
      const cream = new THREE.MeshStandardMaterial({ color: '#fff6ea', roughness: 0.8, emissive: '#fff6ea', emissiveIntensity: 0.12 })
      const pink = new THREE.MeshStandardMaterial({ color: '#ffb3c6', roughness: 0.6 })
      const profile = [[0, 0], [0.27, 0.02], [0.39, 0.12], [0.44, 0.3], [0.45, 0.48], [0.42, 0.68], [0.34, 0.86], [0.21, 0.98], [0, 1.03]]
        .map(([x, y]) => new THREE.Vector2(x, y))
      g.add(new THREE.Mesh(new THREE.LatheGeometry(profile, 40), fur))
      // the white snout with chubby cheeks sits in front of the face; nose, mouth and blush go on it
      const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 16), cream)
      muzzle.position.set(0, 0.62, 0.36)
      muzzle.scale.set(1.5, 0.8, 0.6)
      const belly = new THREE.Mesh(new THREE.SphereGeometry(0.24, 20, 14), cream)
      belly.position.set(0, 0.3, 0.33)
      belly.scale.set(1, 0.85, 0.6)
      g.add(muzzle, belly)
      for (const side of [-1, 1]) {
        const ear = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 10), fur)
        ear.position.set(0.25 * side, 0.98, 0)
        ear.scale.set(1, 1, 0.45)
        const earIn = new THREE.Mesh(new THREE.SphereGeometry(0.065, 12, 8), pink)
        earIn.position.set(0.25 * side, 0.97, 0.04)
        earIn.scale.set(1, 1, 0.3)
        const cheek = new THREE.Mesh(cheekGeo, blush)
        cheek.position.set(0.2 * side, 0.64, 0.445)
        cheek.scale.set(0.9, 0.5, 0.3)
        g.add(ear, earIn, cheek)
      }
      addFace(g, 0.84, 0.355, 0.13, false, false)
      const nose = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 8), pink)
      nose.position.set(0, 0.72, 0.475)
      nose.scale.set(1.2, 0.85, 1)
      const mouth = new THREE.Mesh(smileGeo, ink)
      mouth.position.set(0, 0.655, 0.476)
      mouth.rotation.z = Math.PI
      mouth.scale.setScalar(0.8)
      g.add(nose, mouth)
      const tail = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), fur)
      tail.position.set(0, 0.22, -0.43)
      g.add(tail)
      addFeet(g, '#ffb3c6', 0.16)
      return g
    },
  },
  {
    id: 'rabbit', label: '깡충이', dot: '#ffc2d6',
    build() {
      // a white rabbit: long ears with pink insides, a pink nose and a fluffy tail that shows from behind
      const g = new THREE.Group()
      const fur = new THREE.MeshStandardMaterial({ color: '#fffafc', roughness: 0.75, emissive: '#fff1f6', emissiveIntensity: 0.2 })
      const pink = new THREE.MeshStandardMaterial({ color: '#ffc2d6', roughness: 0.6 })
      const profile = [[0, 0], [0.25, 0.02], [0.36, 0.12], [0.4, 0.3], [0.41, 0.48], [0.38, 0.68], [0.31, 0.85], [0.19, 0.97], [0, 1.02]]
        .map(([x, y]) => new THREE.Vector2(x, y))
      g.add(new THREE.Mesh(new THREE.LatheGeometry(profile, 40), fur))
      const earGeo = new THREE.CapsuleGeometry(0.085, 0.42, 6, 16)
      const earInGeo = new THREE.CapsuleGeometry(0.045, 0.32, 4, 12)
      for (const side of [-1, 1]) {
        const ear = new THREE.Group()
        // flattened like a real rabbit ear, so the pink inside sits on its front face
        const outer = new THREE.Mesh(earGeo, fur)
        outer.scale.z = 0.55
        const inner = new THREE.Mesh(earInGeo, pink)
        inner.position.z = 0.036
        inner.scale.z = 0.3
        ear.add(outer, inner)
        ear.position.set(0.13 * side, 1.2, -0.02)
        // tipped outward and a little back, the left one a touch floppier
        ear.rotation.set(-0.12, 0, -0.18 * side - (side < 0 ? 0.12 : 0))
        g.add(ear)
      }
      addFace(g, 0.74, 0.37, 0.12)
      const nose = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), pink)
      nose.position.set(0, 0.68, 0.41)
      nose.scale.set(1.2, 0.8, 1)
      g.add(nose)
      const tail = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), fur)
      tail.position.set(0, 0.3, -0.39)
      g.add(tail)
      addFeet(g, '#ffd6e4', 0.15)
      return g
    },
  },
  {
    id: 'chick', label: '삐약이', dot: '#ffd23f',
    build() {
      // an egg-shaped yellow chick: beak in front, a tuft on top, wing nubs and a tail tip that read from behind
      const g = new THREE.Group()
      // a little self-glow keeps the yellow sunny on the shaded side the camera often sees
      const down = new THREE.MeshStandardMaterial({ color: '#ffd84d', roughness: 0.7, emissive: '#ffb81c', emissiveIntensity: 0.22 })
      const deep = new THREE.MeshStandardMaterial({ color: '#ffc21f', roughness: 0.7, emissive: '#ff9f1a', emissiveIntensity: 0.15 })
      const orange = new THREE.MeshStandardMaterial({ color: '#ff9f43', roughness: 0.5 })
      const profile = [[0, 0], [0.24, 0.02], [0.35, 0.12], [0.41, 0.3], [0.42, 0.5], [0.39, 0.72], [0.32, 0.92], [0.2, 1.06], [0, 1.13]]
        .map(([x, y]) => new THREE.Vector2(x, y))
      g.add(new THREE.Mesh(new THREE.LatheGeometry(profile, 40), down))
      addFace(g, 0.78, 0.35, 0.12, false)
      const beak = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.15, 12), orange)
      beak.rotation.x = Math.PI / 2
      beak.position.set(0, 0.68, 0.43)
      beak.scale.set(1.25, 1, 0.8)
      g.add(beak)
      const featherGeo = new THREE.SphereGeometry(0.05, 10, 8)
      for (const [x, tilt] of [[-0.05, 0.45], [0.02, -0.1], [0.08, -0.55]]) {
        const feather = new THREE.Mesh(featherGeo, deep)
        feather.position.set(x, 1.17, 0)
        feather.scale.set(0.7, 2, 0.7)
        feather.rotation.z = tilt
        g.add(feather)
      }
      const wingGeo = new THREE.SphereGeometry(0.2, 16, 12)
      for (const side of [-1, 1]) {
        const wing = new THREE.Mesh(wingGeo, deep)
        wing.position.set(0.38 * side, 0.52, -0.02)
        wing.scale.set(0.35, 0.75, 0.85)
        wing.rotation.z = 0.35 * side
        g.add(wing)
      }
      const tail = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.22, 10), deep)
      tail.position.set(0, 0.42, -0.4)
      tail.rotation.x = -Math.PI / 2 - 0.6
      g.add(tail)
      addFeet(g, '#ff9f43', 0.14)
      return g
    },
  },
  {
    id: 'cat', label: '냥냥', dot: '#b9a4ff',
    build() {
      const g = new THREE.Group()
      const fur = new THREE.MeshStandardMaterial({ color: '#cbb8ff', roughness: 0.6 })
      const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.37, 0.58, 8, 24), fur)
      torso.position.y = 0.69
      g.add(torso)
      const inner = new THREE.MeshBasicMaterial({ color: '#ffc2dc' })
      for (const s of [-1, 1]) {
        const ear = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.26, 16), fur)
        ear.position.set(0.19 * s, 1.3, 0)
        ear.rotation.z = -0.35 * s
        const earIn = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.15, 12), inner)
        earIn.position.set(0.19 * s, 1.28, 0.05)
        earIn.rotation.z = -0.35 * s
        g.add(ear, earIn)
      }
      const tail = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.055, 8, 24, Math.PI * 1.2), fur)
      tail.position.set(0, 0.55, -0.4)
      tail.rotation.y = Math.PI / 2
      g.add(tail)
      addFace(g, 1.04, 0.355)
      const nose = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), new THREE.MeshBasicMaterial({ color: '#ff7aa8' }))
      nose.position.set(0, 0.99, 0.37)
      g.add(nose)
      addFeet(g, '#b9a4ff')
      return g
    },
  },
]
