// The player's character on screen: follows the physics body, turns toward where it
// runs, squashes on jumps and landings, and casts a contact shadow on what is below.

import * as THREE from 'three'
import type { PlayerState } from '../physics.ts'
import type { CharacterId } from '../types.ts'
import { clamp, damp, lerpAngle } from '../util.ts'
import { CHARACTERS } from './characters.ts'

export class Avatar {
  private readonly root = new THREE.Group()
  private readonly body = new THREE.Group()
  private readonly variants = new Map<CharacterId, THREE.Group>()
  private readonly shadow: THREE.Mesh
  private readonly shadowMat: THREE.MeshBasicMaterial
  private facing = Math.PI
  private sy = 1
  private svy = 0

  constructor(scene: THREE.Scene) {
    this.root.add(this.body)
    scene.add(this.root)
    for (const ch of CHARACTERS) {
      const g = ch.build()
      g.visible = false
      this.body.add(g)
      this.variants.set(ch.id, g)
    }
    this.shadowMat = new THREE.MeshBasicMaterial({
      color: '#3a2947', transparent: true, opacity: 0.3, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4,
    })
    this.shadow = new THREE.Mesh(new THREE.CircleGeometry(0.42, 28).rotateX(-Math.PI / 2), this.shadowMat)
    scene.add(this.shadow)
  }

  setCharacter(id: CharacterId) {
    for (const [key, g] of this.variants) g.visible = key === id
  }

  /** Stretch (>1) on a jump, squash (<1) on a hard landing. */
  pop(sy: number) {
    this.sy = sy
    this.svy = 0
  }

  face(angle: number) {
    this.facing = angle
  }

  update(dt: number, time: number, p: PlayerState, stand: number, below: { top: number; lift: number } | null) {
    this.root.position.set(p.x, p.y + stand, p.z)
    const speed = Math.hypot(p.vx, p.vz)
    if (speed > 0.4) this.facing = lerpAngle(this.facing, Math.atan2(p.vx, p.vz), damp(14, dt))
    this.root.rotation.y = this.facing
    this.svy += (260 * (1 - this.sy) - 15 * this.svy) * dt
    this.sy += this.svy * dt
    const sx = 1 + (1 - this.sy) * 0.5
    this.body.scale.set(sx, this.sy, sx)
    this.body.position.y = p.grounded && speed > 0.6 ? Math.abs(Math.sin(time * 11)) * 0.06 : 0

    this.shadow.visible = below !== null
    if (below) {
      const gap = p.y - below.top
      this.shadow.position.set(p.x, below.top + below.lift + 0.012, p.z)
      this.shadow.scale.setScalar(clamp(1 - gap * 0.07, 0.45, 1))
      this.shadowMat.opacity = clamp(0.34 - gap * 0.025, 0.1, 0.34)
    }
  }
}
