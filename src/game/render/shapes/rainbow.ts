// Keycaps, wax balls and soda jelly, as in the prototype.

import * as THREE from 'three'
import { rand } from '../../util.ts'
import { regrowScale, softBlock } from '../geometry.ts'
import { letterTexture } from '../textures.ts'
import { baseView, cachedMaterial, registerShape, squashSync } from '../views.ts'

const KEY = { w: 1.3, h: 0.55 }
const keyGeo = softBlock(KEY.w, KEY.h, KEY.w)
const letterGeo = new THREE.PlaneGeometry(0.78, 0.78).rotateX(-Math.PI / 2)

export function keyMaterial(color: string) {
  return cachedMaterial(`key:${color}`, () => new THREE.MeshStandardMaterial({ color, roughness: 0.6 }))
}

export function labelMaterial(ch: string, ink: string) {
  return cachedMaterial(`label:${ch}:${ink}`, () => new THREE.MeshBasicMaterial({
    map: letterTexture(ch, ink), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2,
  }))
}

/** A keycap with an optional letter; coloured caps get darker ink than the white ones. */
export function addKeycap(body: THREE.Object3D, color: string, label: string | undefined, ink: string) {
  const mesh = new THREE.Mesh(keyGeo, keyMaterial(color))
  body.add(mesh)
  if (label) {
    const text = new THREE.Mesh(letterGeo, labelMaterial(label, ink))
    text.position.y = KEY.h + 0.003
    body.add(text)
  }
  return mesh
}

registerShape('key', (placed) => {
  const { root, body } = baseView(placed)
  const color = placed.color ?? placed.skin.color ?? '#fffaf2'
  const mesh = addKeycap(body, color, placed.label, placed.color ? '#5b4668' : '#9b89a8')
  return {
    root,
    occluders: [mesh],
    sync(p) { squashSync(body, p) },
    surface: (p) => ({ stand: p.press, shadow: p.press }),
    dispose() {},
  }
})

const SHELL_R = 0.92, CORE_R = 0.8
const shellGeo = new THREE.SphereGeometry(SHELL_R, 36, 24).translate(0, SHELL_R, 0)
const coreGeo = new THREE.SphereGeometry(CORE_R, 28, 18).translate(0, CORE_R, 0)

/** Glossy shell that bursts on the first step, with a paler, softer core inside. */
export function ballView(shellColor: string, coreColor: string, kind: string) {
  registerShape(kind, (placed, ctx) => {
    const { root, body } = baseView(placed)
    const color = placed.color ?? placed.skin.color ?? shellColor
    const shellMat = cachedMaterial(`${kind}-shell:${color}`, () => new THREE.MeshPhysicalMaterial({
      color, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.18, side: THREE.DoubleSide,
    }))
    const coreMat = cachedMaterial(`${kind}-core:${color}`, () => new THREE.MeshStandardMaterial({
      color: new THREE.Color(color).lerp(new THREE.Color(coreColor), 0.55), roughness: 0.8,
    }))
    const shell = new THREE.Mesh(shellGeo, shellMat)
    const core = new THREE.Mesh(coreGeo, coreMat)
    body.add(core, shell)
    return {
      root,
      occluders: [shell, core],
      sync(p) {
        squashSync(body, p)
        shell.visible = !p.cracked
        shell.scale.setScalar(!p.cracked && p.grow < 1 ? regrowScale(p.grow) : 1)
        if (p.collapsed) {
          core.scale.setScalar(Math.max(0.001, p.shrink))
          core.visible = p.shrink > 0
        } else {
          core.scale.setScalar(1)
          core.visible = true
        }
      },
      crack(p) {
        const cy = p.baseY + SHELL_R * p.sy
        ctx.effects.shellBurst(placed.x, cy, placed.z, SHELL_R, shellMat)
        ctx.effects.shards(placed.x, p.collider.top, placed.z, color)
      },
      // the visual top of the ball sits above its standing height
      surface: (p) => ({ stand: 0, shadow: ((p.cracked ? 2 * CORE_R : 2 * SHELL_R) - p.topRest) * p.sy }),
      dispose() {},
    }
  })
}

ballView('#ffb3cf', '#ffffff', 'waxBall')

const sodaGeo = softBlock(1.8, 0.75, 1.8, 0.35, 0.16)

registerShape('sodaJelly', (placed, ctx) => {
  const { root, body } = baseView(placed)
  const color = placed.color ?? placed.skin.color ?? '#a6dcff'
  const mesh = new THREE.Mesh(sodaGeo, cachedMaterial(`soda:${color}`, () => new THREE.MeshPhysicalMaterial({
    color, roughness: 0.12, clearcoat: 1, transparent: true, opacity: 0.8,
  })))
  body.add(mesh)
  let fizz = 0
  return {
    root,
    occluders: [mesh],
    sync(p, _time, dt) {
      squashSync(body, p)
      // bubbles rise around the feet while someone stands on it
      if (!p.standing) { fizz = 0; return }
      fizz -= dt
      while (fizz <= 0) {
        fizz += rand(0.03, 0.07)
        ctx.effects.bubble(placed.x + rand(-0.65, 0.65), p.collider.top - rand(0.15, 0.6), placed.z + rand(-0.65, 0.65))
      }
    },
    dispose() {},
  }
})
