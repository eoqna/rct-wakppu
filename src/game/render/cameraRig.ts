// Orbiting view for the start screen, and the play camera: it never turns by itself,
// the mouse turns it, the wheel zooms, and it pulls in when something blocks the view.

import * as THREE from 'three'
import { CAMERA } from '../config.ts'
import { clamp, damp } from '../util.ts'

const MENU = { radius: 18, height: 11, targetY: 7, spin: 0.12 }

export class CameraRig {
  yaw = 0
  pitch: number = CAMERA.pitch
  dist: number = CAMERA.dist
  private curDist: number = CAMERA.dist
  private settleFrom = 0
  private readonly camera: THREE.PerspectiveCamera
  private readonly target = new THREE.Vector3(0, MENU.targetY, 0)
  private readonly want = new THREE.Vector3()
  private readonly wantPos = new THREE.Vector3()
  private readonly dir = new THREE.Vector3()
  private readonly ray = new THREE.Raycaster()

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera
  }

  /** Slow turn around the foot of the tower behind the start screen. */
  orbit(time: number, dt: number) {
    const a = time * MENU.spin
    this.want.set(0, MENU.targetY, 0)
    this.target.lerp(this.want, damp(3, dt))
    this.camera.position.set(Math.sin(a) * MENU.radius, MENU.height + Math.sin(time * 0.3) * 1.2, Math.cos(a) * MENU.radius)
    this.camera.lookAt(this.target)
  }

  /** Start of a run: ease in from wherever the camera is for a moment. */
  begin(time: number) {
    this.settleFrom = time
    this.curDist = this.dist
  }

  follow(x: number, y: number, z: number, dt: number, time: number, occluders: THREE.Object3D[]) {
    this.want.set(x, y + 1.15, z)
    this.target.lerp(this.want, damp(12, dt))
    const cp = Math.cos(this.pitch)
    this.dir.set(Math.sin(this.yaw) * cp, Math.sin(this.pitch), Math.cos(this.yaw) * cp)
    this.ray.set(this.target, this.dir)
    this.ray.far = this.dist
    const hit = this.ray.intersectObjects(occluders, false)[0]
    const want = hit ? Math.max(CAMERA.minPull, hit.distance - 0.3) : this.dist
    this.curDist = want < this.curDist ? want : this.curDist + (want - this.curDist) * damp(3, dt)
    this.wantPos.copy(this.target).addScaledVector(this.dir, this.curDist)
    const settle = clamp((time - this.settleFrom) / CAMERA.settle, 0, 1)
    this.camera.position.lerp(this.wantPos, damp(3 + 30 * settle, dt))
    this.camera.lookAt(this.target)
  }

  drag(dx: number, dy: number) {
    this.yaw -= dx * CAMERA.yawPerPx
    this.pitch = clamp(this.pitch + dy * CAMERA.pitchPerPx, CAMERA.minPitch, CAMERA.maxPitch)
  }

  zoom(deltaY: number) {
    this.dist = clamp(this.dist + deltaY * CAMERA.zoomPerDelta, CAMERA.minDist, CAMERA.maxDist)
  }

  /** Look from outside the tower toward this spot; the one turn the camera makes on its own. */
  faceFrom(x: number, z: number) {
    this.yaw = Math.atan2(x, z) + CAMERA.startOffset
  }

  /** World direction for screen-relative input: ix right, iz forward. */
  moveDir(ix: number, iz: number): [number, number] {
    if (!ix && !iz) return [0, 0]
    const s = Math.sin(this.yaw), c = Math.cos(this.yaw)
    const mx = c * ix - s * iz, mz = -s * ix - c * iz
    const len = Math.hypot(mx, mz)
    return [mx / len, mz / len]
  }
}
