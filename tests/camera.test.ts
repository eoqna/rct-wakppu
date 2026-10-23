import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { CAMERA } from '../src/game/config.ts'
import { CameraRig, fovFor } from '../src/game/render/cameraRig.ts'

const rig = () => new CameraRig(new THREE.PerspectiveCamera())

describe('moving relative to the screen', () => {
  it('a stick pushed half way forward runs forward at half speed', () => {
    const r = rig()
    r.yaw = 0
    // at yaw 0 the camera sits on +z looking toward -z, so forward is -z
    const [mx, mz] = r.moveDir(0, 0.5)
    expect(mx).toBeCloseTo(0, 6)
    expect(mz).toBeCloseTo(-0.5, 6)
  })

  it('a keyboard diagonal still runs at full speed', () => {
    const r = rig()
    r.yaw = 0.7
    const [mx, mz] = r.moveDir(1, 1)
    expect(Math.hypot(mx, mz)).toBeCloseTo(1, 6)
  })
})

describe('pinch zoom', () => {
  it('spreading two fingers to twice the gap brings the camera twice as close, within limits', () => {
    const r = rig()
    r.dist = 10
    r.pinch(2)
    expect(r.dist).toBeCloseTo(5, 6)
    r.pinch(4)
    expect(r.dist).toBe(CAMERA.minDist)
    r.pinch(0.01)
    expect(r.dist).toBe(CAMERA.maxDist)
  })
})

describe('view angle for the screen shape', () => {
  it('a landscape or square screen keeps the tuned angle', () => {
    expect(fovFor(16 / 9)).toBe(CAMERA.fov)
    expect(fovFor(1)).toBe(CAMERA.fov)
  })

  it('a portrait screen widens it so the view is as wide as on a square screen', () => {
    const v = fovFor(0.75)
    const across = 2 * Math.atan(Math.tan((v * Math.PI) / 360) * 0.75) * (180 / Math.PI)
    expect(across).toBeCloseTo(CAMERA.fov, 4)
  })

  it('a tall phone screen widens it only up to a limit', () => {
    expect(fovFor(390 / 844)).toBe(CAMERA.maxFov)
  })
})
