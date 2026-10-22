// Particles: shards from breaking platforms, curved shell flakes, rising bubbles, soft puffs.

import * as THREE from 'three'
import { rand } from '../util.ts'

interface Particle { m: THREE.Mesh; v: THREE.Vector3; spin: THREE.Vector3; life: number; seed: number }
interface Flake { m: THREE.Mesh; v: THREE.Vector3; spin: THREE.Vector3; life: number; delay: number }

const WHITE = new THREE.Color('#ffffff')

// a unit shell pre-cut into curved flakes (4 bands x 7 slices), each centred on its own origin
const SHELL_PIECES = (() => {
  const pieces: { g: THREE.BufferGeometry; dir: THREE.Vector3 }[] = []
  for (let b = 0; b < 4; b++) {
    for (let s = 0; s < 7; s++) {
      const thetaStart = (b / 4) * Math.PI, thetaLength = Math.PI / 4
      const phiStart = (s / 7) * Math.PI * 2 + (b % 2) * 0.45, phiLength = (Math.PI * 2) / 7
      const g = new THREE.SphereGeometry(1, 5, 3, phiStart, phiLength, thetaStart, thetaLength)
      const tc = thetaStart + thetaLength / 2, pc = phiStart + phiLength / 2
      const dir = new THREE.Vector3(-Math.cos(pc) * Math.sin(tc), Math.cos(tc), Math.sin(pc) * Math.sin(tc))
      g.translate(-dir.x, -dir.y, -dir.z)
      pieces.push({ g, dir })
    }
  }
  return pieces
})()

export class Effects {
  private readonly scene: THREE.Scene
  private readonly shardPool: Particle[]
  private readonly bubblePool: Particle[]
  private readonly puffPool: Particle[]
  private readonly flakes: Flake[] = []

  constructor(scene: THREE.Scene) {
    this.scene = scene
    const shardGeo = new THREE.TetrahedronGeometry(0.09)
    this.shardPool = this.pool(72, () => new THREE.Mesh(shardGeo, new THREE.MeshStandardMaterial({ roughness: 0.4 })))
    const bubbleGeo = new THREE.SphereGeometry(0.05, 10, 8)
    this.bubblePool = this.pool(60, () => new THREE.Mesh(bubbleGeo, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.8, depthWrite: false })))
    const puffGeo = new THREE.SphereGeometry(0.12, 10, 8)
    this.puffPool = this.pool(48, () => new THREE.Mesh(puffGeo, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.85, depthWrite: false })))
  }

  /** Little tetrahedra bursting from a break, tinted from the platform colour. */
  shards(x: number, y: number, z: number, color: THREE.ColorRepresentation, n = 16, spread = 0.45) {
    const base = new THREE.Color(color)
    for (const s of this.shardPool) {
      if (n <= 0) break
      if (s.life > 0) continue
      n--
      ;(s.m.material as THREE.MeshStandardMaterial).color.copy(base).lerp(WHITE, rand(0, 0.45))
      s.m.position.set(x + rand(-spread, spread), y - rand(0, 0.2), z + rand(-spread, spread))
      const a = rand(0, Math.PI * 2), sp = rand(1.4, 3.2)
      s.v.set(Math.cos(a) * sp, rand(2.4, 5), Math.sin(a) * sp)
      s.spin.set(rand(-9, 9), rand(-9, 9), rand(-9, 9))
      s.life = rand(0.6, 1.0)
      s.m.scale.setScalar(rand(0.7, 1.5))
      s.m.visible = true
    }
  }

  bubble(x: number, y: number, z: number, color: THREE.ColorRepresentation = '#ffffff') {
    const b = this.bubblePool.find((item) => item.life <= 0)
    if (!b) return
    ;(b.m.material as THREE.MeshBasicMaterial).color.set(color)
    b.m.position.set(x, y, z)
    b.v.set(0, rand(0.5, 1.1), 0)
    b.life = rand(0.9, 1.5)
    b.seed = rand(0, 10)
    b.m.scale.setScalar(rand(0.6, 1.3))
    b.m.visible = true
  }

  /** Soft spheres that swell and fade, for snow and dust. */
  puff(x: number, y: number, z: number, color: THREE.ColorRepresentation, n = 10) {
    for (const p of this.puffPool) {
      if (n <= 0) break
      if (p.life > 0) continue
      n--
      ;(p.m.material as THREE.MeshBasicMaterial).color.set(color)
      p.m.position.set(x + rand(-0.4, 0.4), y + rand(0, 0.15), z + rand(-0.4, 0.4))
      const a = rand(0, Math.PI * 2), sp = rand(0.4, 1.2)
      p.v.set(Math.cos(a) * sp, rand(0.6, 1.6), Math.sin(a) * sp)
      p.life = rand(0.5, 0.8)
      p.m.scale.setScalar(rand(0.6, 1.1))
      p.m.visible = true
    }
  }

  /** The wax-ball burst: curved shell pieces flying off, cracks running from the top down. */
  shellBurst(cx: number, cy: number, cz: number, radius: number, material: THREE.Material) {
    for (const piece of SHELL_PIECES) {
      const m = new THREE.Mesh(piece.g, material)
      m.scale.setScalar(radius)
      m.position.set(cx + piece.dir.x * radius, cy + piece.dir.y * radius, cz + piece.dir.z * radius)
      const v = piece.dir.clone().multiplyScalar(rand(1.2, 2.6))
      v.y += piece.dir.y > 0 ? rand(1.4, 3.0) : rand(0, 0.8)
      this.scene.add(m)
      this.flakes.push({ m, v, spin: new THREE.Vector3(rand(-6, 6), rand(-6, 6), rand(-6, 6)), life: rand(1.1, 1.6), delay: (1 - piece.dir.y) * 0.04 })
    }
  }

  update(dt: number, time: number) {
    for (const s of this.shardPool) {
      if (s.life <= 0) continue
      s.life -= dt
      s.v.y -= 14 * dt
      s.m.position.addScaledVector(s.v, dt)
      s.m.rotation.x += s.spin.x * dt; s.m.rotation.y += s.spin.y * dt; s.m.rotation.z += s.spin.z * dt
      if (s.life < 0.25) s.m.scale.multiplyScalar(0.9)
      if (s.life <= 0) s.m.visible = false
    }
    for (const b of this.bubblePool) {
      if (b.life <= 0) continue
      b.life -= dt
      b.m.position.y += b.v.y * dt
      b.m.position.x += Math.sin(time * 9 + b.seed) * 0.15 * dt
      if (b.life < 0.3) b.m.scale.multiplyScalar(0.93)
      if (b.life <= 0) b.m.visible = false
    }
    for (const p of this.puffPool) {
      if (p.life <= 0) continue
      p.life -= dt
      p.v.multiplyScalar(1 - 3 * dt)
      p.m.position.addScaledVector(p.v, dt)
      p.m.scale.multiplyScalar(1 + 1.6 * dt)
      ;(p.m.material as THREE.MeshBasicMaterial).opacity = Math.max(0, p.life * 1.2)
      if (p.life <= 0) p.m.visible = false
    }
    for (let i = this.flakes.length - 1; i >= 0; i--) {
      const f = this.flakes[i]
      if (f.delay > 0) { f.delay -= dt; continue }
      f.life -= dt
      f.v.y -= 12 * dt
      f.m.position.addScaledVector(f.v, dt)
      f.m.rotation.x += f.spin.x * dt; f.m.rotation.y += f.spin.y * dt; f.m.rotation.z += f.spin.z * dt
      if (f.life < 0.35) f.m.scale.multiplyScalar(0.88)
      if (f.life <= 0) {
        this.scene.remove(f.m)
        this.flakes.splice(i, 1)
      }
    }
  }

  /** Drop every particle, for a tower change. */
  clear() {
    for (const p of [...this.shardPool, ...this.bubblePool, ...this.puffPool]) { p.life = 0; p.m.visible = false }
    for (const f of this.flakes) this.scene.remove(f.m)
    this.flakes.length = 0
  }

  private pool(n: number, make: () => THREE.Mesh): Particle[] {
    return Array.from({ length: n }, () => {
      const m = make()
      m.visible = false
      this.scene.add(m)
      return { m, v: new THREE.Vector3(), spin: new THREE.Vector3(), life: 0, seed: 0 }
    })
  }
}
