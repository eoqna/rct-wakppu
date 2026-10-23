// Renderer, camera, lights and the scenery around a tower: sky, pillar, floor, clouds.

import * as THREE from 'three'
import { CAMERA, TOWER } from '../config.ts'
import type { TowerTheme } from '../types.ts'
import { rand } from '../util.ts'
import { fovFor } from './cameraRig.ts'
import { checkerTexture, gradientTexture, pillarTexture, setAnisotropy } from './textures.ts'

export class WebGLUnavailableError extends Error {}

const cloudGeo = new THREE.SphereGeometry(1, 18, 12)
const cloudMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1 })

export class Stage {
  readonly renderer: THREE.WebGLRenderer
  readonly scene = new THREE.Scene()
  readonly camera: THREE.PerspectiveCamera
  readonly pillar: THREE.Mesh
  private readonly canvas: HTMLCanvasElement
  private readonly floor: THREE.Mesh
  private readonly clouds = new THREE.Group()
  private readonly pillarMat: THREE.MeshStandardMaterial
  private readonly floorMat: THREE.MeshStandardMaterial
  private sky: THREE.Texture | null = null

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    try {
      this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
    } catch {
      throw new WebGLUnavailableError('WebGL unavailable')
    }
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    setAnisotropy(this.renderer.capabilities.getMaxAnisotropy())
    this.camera = new THREE.PerspectiveCamera(CAMERA.fov, 1, CAMERA.near, CAMERA.far)

    this.scene.add(new THREE.HemisphereLight(0xfff4fa, 0xcdbbe6, 2.1))
    const sun = new THREE.DirectionalLight(0xffffff, 1.7)
    sun.position.set(8, 16, 6)
    this.scene.add(sun)

    this.pillarMat = new THREE.MeshStandardMaterial({ roughness: 0.9 })
    this.pillar = new THREE.Mesh(new THREE.CylinderGeometry(TOWER.pillarRadius, TOWER.pillarRadius, 1, 48), this.pillarMat)
    this.floorMat = new THREE.MeshStandardMaterial({ roughness: 1 })
    this.floor = new THREE.Mesh(new THREE.CircleGeometry(TOWER.floorRadius, 72), this.floorMat)
    this.floor.rotation.x = -Math.PI / 2
    this.scene.add(this.pillar, this.floor, this.clouds)
    this.resize()
  }

  /** Dress the scene for a tower whose climb ends at `height`. */
  setTheme(theme: TowerTheme, height: number) {
    this.sky?.dispose()
    this.sky = gradientTexture(theme.sky)
    this.scene.background = this.sky
    this.scene.fog = new THREE.Fog(theme.fog, 45, CAMERA.far)

    const pillarH = height + 3
    this.pillar.geometry.dispose()
    this.pillar.geometry = new THREE.CylinderGeometry(TOWER.pillarRadius, TOWER.pillarRadius, pillarH, 48)
    this.pillar.position.y = pillarH / 2
    this.pillarMat.map?.dispose()
    const { tex, around, perMetre } = pillarTexture(theme.pattern, theme.pillar[0], theme.pillar[1])
    tex.repeat.set(around, Math.round(pillarH * perMetre))
    this.pillarMat.map = tex
    this.pillarMat.needsUpdate = true

    this.floorMat.map?.dispose()
    this.floorMat.map = checkerTexture(theme.floor[0], theme.floor[1])
    this.floorMat.map.repeat.set(20, 20)
    this.floorMat.needsUpdate = true

    this.buildClouds(height)
  }

  get pillarTop() {
    return this.pillar.position.y * 2
  }

  resize() {
    const w = this.canvas.clientWidth || window.innerWidth, h = this.canvas.clientHeight || window.innerHeight
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / h
    this.camera.fov = fovFor(w / h)
    this.camera.updateProjectionMatrix()
  }

  render() {
    this.renderer.render(this.scene, this.camera)
  }

  dispose() {
    this.renderer.dispose()
  }

  private buildClouds(height: number) {
    for (const puff of [...this.clouds.children]) this.clouds.remove(puff)
    const count = Math.max(10, Math.round(height / 3))
    for (let i = 0; i < count; i++) {
      const puff = new THREE.Group(), a = (i / count) * Math.PI * 2 * 3 + rand(-0.25, 0.25), r = rand(15, 23)
      puff.position.set(Math.cos(a) * r, rand(1, height + 8), Math.sin(a) * r)
      for (let j = 0; j < 4; j++) {
        const s = new THREE.Mesh(cloudGeo, cloudMat)
        s.position.set(rand(-1.7, 1.7), rand(-0.3, 0.4), rand(-0.7, 0.7))
        s.scale.setScalar(rand(0.8, 1.5))
        puff.add(s)
      }
      this.clouds.add(puff)
    }
  }

  spinClouds(dt: number) {
    this.clouds.rotation.y += dt * 0.01
  }
}
