import * as THREE from 'three'
import type { DecalKind, PillarPattern } from '../types.ts'

let anisotropy = 1

export function setAnisotropy(max: number) {
  anisotropy = Math.min(4, max)
}

export function canvasTexture(w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const g = c.getContext('2d')
  if (g) draw(g, w, h)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = anisotropy
  return tex
}

export function checkerTexture(a: string, b: string) {
  const tex = canvasTexture(128, 128, (g) => {
    g.fillStyle = a; g.fillRect(0, 0, 128, 128)
    g.fillStyle = b; g.fillRect(0, 0, 64, 64); g.fillRect(64, 64, 64, 64)
  })
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  return tex
}

/** Vertical gradient, first colour at the top. */
export function gradientTexture(stops: string[]) {
  return canvasTexture(4, 256, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, 0, h)
    stops.forEach((c, i) => grd.addColorStop(stops.length > 1 ? i / (stops.length - 1) : 0, c))
    g.fillStyle = grd
    g.fillRect(0, 0, w, h)
  })
}

const letters = new Map<string, THREE.CanvasTexture>()

export function letterTexture(ch: string, color: string) {
  const key = ch + color
  let tex = letters.get(key)
  if (!tex) {
    tex = canvasTexture(128, 128, (g, w, h) => {
      g.fillStyle = color
      g.font = '76px Jua, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif'
      g.textAlign = 'center'
      g.textBaseline = 'middle'
      g.fillText(ch, w / 2, h / 2 + 4)
    })
    letters.set(key, tex)
  }
  return tex
}

let flower: THREE.CanvasTexture | null = null

export function flowerTexture() {
  flower ??= canvasTexture(256, 256, (g, w, h) => {
    g.translate(w / 2, h / 2)
    g.fillStyle = '#ff9cc4'
    for (let i = 0; i < 8; i++) {
      g.save(); g.rotate((i / 8) * Math.PI * 2)
      g.beginPath(); g.ellipse(0, -62, 30, 46, 0, 0, Math.PI * 2); g.fill()
      g.restore()
    }
    g.fillStyle = '#ffd86b'; g.beginPath(); g.arc(0, 0, 40, 0, Math.PI * 2); g.fill()
  })
  return flower
}

const words = new Map<string, THREE.CanvasTexture>()

/** A short word on a 2:1 label, shrunk to fit. */
export function wordTexture(text: string, color: string) {
  const key = text + color
  let tex = words.get(key)
  if (!tex) {
    tex = canvasTexture(256, 128, (g, w, h) => {
      let size = 72
      g.font = `${size}px Jua, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif`
      while (g.measureText(text).width > w * 0.86 && size > 20) {
        size -= 4
        g.font = `${size}px Jua, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif`
      }
      g.fillStyle = color
      g.textAlign = 'center'
      g.textBaseline = 'middle'
      g.fillText(text, w / 2, h / 2 + 4)
    })
    words.set(key, tex)
  }
  return tex
}

/** Honeycomb cells on a transparent background, for the top of a comb. */
export function hexTexture(fill: string, line: string) {
  return canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = fill
    g.fillRect(0, 0, w, h)
    g.strokeStyle = line
    g.lineWidth = 6
    const r = 26, dx = r * Math.sqrt(3), dy = r * 1.5
    for (let row = -1; row * dy < h + r; row++) {
      for (let col = -1; col * dx < w + r; col++) {
        const cx = col * dx + (row % 2 ? dx / 2 : 0), cy = row * dy
        g.beginPath()
        for (let k = 0; k < 6; k++) {
          const a = Math.PI / 6 + (k * Math.PI) / 3
          const x = cx + r * Math.cos(a), y = cy + r * Math.sin(a)
          if (k) g.lineTo(x, y); else g.moveTo(x, y)
        }
        g.closePath()
        g.stroke()
      }
    }
  })
}

/** Repeating pillar patterns, each drawn so its edges meet when tiled. Returns the texture and its tiles per metre. */
export function pillarTexture(pattern: PillarPattern, a: string, b: string): { tex: THREE.CanvasTexture; around: number; perMetre: number } {
  const wrap = (tex: THREE.CanvasTexture, around: number, perMetre: number) => {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping
    return { tex, around, perMetre }
  }
  switch (pattern) {
    case 'checker':
      return wrap(checkerTexture(a, b), 8, 1 / 1.7)
    case 'hex': {
      // five cells across, six rows down: one exact period of the honeycomb
      const W = 260, H = 270, dx = W / 5, dy = H / 6, r = dx / Math.sqrt(3)
      return wrap(canvasTexture(W, H, (g) => {
        g.fillStyle = a; g.fillRect(0, 0, W, H)
        g.strokeStyle = b; g.lineWidth = 7; g.lineJoin = 'round'
        for (let row = -1; row <= 6; row++) {
          for (let col = -1; col <= 5; col++) {
            const cx = col * dx + (row % 2 ? dx / 2 : 0), cy = row * dy
            g.beginPath()
            for (let k = 0; k < 6; k++) {
              const ang = Math.PI / 6 + (k * Math.PI) / 3
              const x = cx + r * Math.cos(ang), y = cy + r * Math.sin(ang)
              if (k) g.lineTo(x, y); else g.moveTo(x, y)
            }
            g.closePath(); g.stroke()
          }
        }
      }), 5, 1 / 2.4)
    }
    case 'grid':
      // chocolate-bar segments with a light top edge
      return wrap(canvasTexture(128, 128, (g) => {
        g.fillStyle = b; g.fillRect(0, 0, 128, 128)
        for (const [x, y] of [[0, 0], [64, 0], [0, 64], [64, 64]]) {
          g.fillStyle = a; g.fillRect(x + 4, y + 4, 56, 56)
          g.fillStyle = 'rgba(255, 255, 255, 0.18)'; g.fillRect(x + 4, y + 4, 56, 6)
          g.fillStyle = 'rgba(0, 0, 0, 0.15)'; g.fillRect(x + 4, y + 54, 56, 6)
        }
      }), 6, 1 / 1.5)
    case 'keys':
      // a keyboard plate: rows of rounded keycaps
      return wrap(canvasTexture(128, 128, (g) => {
        g.fillStyle = b; g.fillRect(0, 0, 128, 128)
        for (const [x, y] of [[0, 0], [64, 0], [0, 64], [64, 64]]) {
          g.fillStyle = a
          g.beginPath(); g.roundRect(x + 6, y + 6, 52, 52, 10); g.fill()
          g.fillStyle = 'rgba(255, 255, 255, 0.35)'
          g.beginPath(); g.roundRect(x + 12, y + 10, 40, 34, 8); g.fill()
        }
      }), 8, 1 / 1.4)
    case 'frost':
      // icy diagonal streaks with a few sparkles
      return wrap(canvasTexture(128, 128, (g) => {
        g.fillStyle = a; g.fillRect(0, 0, 128, 128)
        g.strokeStyle = b; g.lineWidth = 14
        for (let k = -2; k <= 2; k++) {
          g.beginPath(); g.moveTo(k * 64, 128); g.lineTo(k * 64 + 128, 0); g.stroke()
        }
        g.fillStyle = 'rgba(255, 255, 255, 0.9)'
        for (const [x, y] of [[20, 30], [90, 18], [60, 80], [110, 100], [30, 110]]) { g.beginPath(); g.arc(x, y, 3, 0, Math.PI * 2); g.fill() }
      }), 6, 1 / 1.8)
  }
}

const decals = new Map<DecalKind, THREE.CanvasTexture>()

/** The picture on a checkpoint disc. */
export function decalTexture(kind: DecalKind) {
  if (kind === 'flower') return flowerTexture()
  let tex = decals.get(kind)
  if (tex) return tex
  tex = canvasTexture(256, 256, (g, w, h) => {
    g.translate(w / 2, h / 2)
    if (kind === 'snowflake') {
      g.strokeStyle = '#7cc4f2'; g.lineCap = 'round'; g.lineWidth = 12
      for (let i = 0; i < 6; i++) {
        g.save(); g.rotate((i / 6) * Math.PI * 2)
        g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -96); g.stroke()
        for (const [d, l] of [[-46, 30], [-74, 22]]) {
          g.beginPath(); g.moveTo(0, d); g.lineTo(-l, d - l); g.moveTo(0, d); g.lineTo(l, d - l); g.stroke()
        }
        g.restore()
      }
    } else if (kind === 'honeycomb') {
      const r = 34, dx = r * Math.sqrt(3)
      const cells: [number, number][] = [[0, 0], [dx, 0], [-dx, 0], [dx / 2, -1.5 * r], [-dx / 2, -1.5 * r], [dx / 2, 1.5 * r], [-dx / 2, 1.5 * r]]
      for (const [cx, cy] of cells) {
        g.beginPath()
        for (let k = 0; k < 6; k++) {
          const ang = Math.PI / 6 + (k * Math.PI) / 3
          const x = cx + (r - 3) * Math.cos(ang), y = cy + (r - 3) * Math.sin(ang)
          if (k) g.lineTo(x, y); else g.moveTo(x, y)
        }
        g.closePath()
        g.fillStyle = '#ffc23d'; g.fill()
        g.lineWidth = 6; g.strokeStyle = '#d9962a'; g.stroke()
      }
    } else {
      // strawberry: a red berry with seeds under a green cap
      g.fillStyle = '#ff4f6d'
      g.beginPath(); g.moveTo(0, 100)
      g.bezierCurveTo(-110, 20, -90, -70, 0, -60)
      g.bezierCurveTo(90, -70, 110, 20, 0, 100)
      g.fill()
      g.fillStyle = '#ffe28a'
      for (const [x, y] of [[-40, -20], [0, -30], [40, -20], [-55, 20], [-15, 15], [25, 15], [58, 22], [-30, 55], [10, 55], [40, 50], [0, 85]]) {
        g.beginPath(); g.ellipse(x, y, 5, 8, 0, 0, Math.PI * 2); g.fill()
      }
      g.fillStyle = '#4caf6a'
      for (let i = 0; i < 5; i++) {
        g.save(); g.translate(0, -62); g.rotate(-Math.PI / 2 + ((i - 2) * Math.PI) / 5)
        g.beginPath(); g.ellipse(26, 0, 30, 11, 0, 0, Math.PI * 2); g.fill()
        g.restore()
      }
    }
  })
  decals.set(kind, tex)
  return tex
}
