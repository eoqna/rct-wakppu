import * as THREE from 'three'

export function roundedRectShape(w: number, d: number, r: number) {
  const s = new THREE.Shape(), x = -w / 2, y = -d / 2
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r)
  s.lineTo(x + w, y + d - r); s.quadraticCurveTo(x + w, y + d, x + w - r, y + d)
  s.lineTo(x + r, y + d); s.quadraticCurveTo(x, y + d, x, y + d - r)
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y)
  return s
}

/** A soft rounded block with its origin at the bottom centre, for keycaps and jelly. */
export function softBlock(w: number, h: number, d: number, corner = 0.2, bevel = 0.09) {
  const g = new THREE.ExtrudeGeometry(roundedRectShape(w - 2 * bevel, d - 2 * bevel, corner), {
    depth: h - 2 * bevel, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 6,
  })
  g.rotateX(-Math.PI / 2)
  g.computeBoundingBox()
  g.translate(0, -g.boundingBox!.min.y, 0)
  return g
}

/** easeOutBack from 0.6 to 1, the prototype's shell regrow pop. */
export function regrowScale(grow: number) {
  const x = grow - 1
  return 0.6 + 0.4 * (1 + 2.70158 * x * x * x + 1.70158 * x * x)
}
