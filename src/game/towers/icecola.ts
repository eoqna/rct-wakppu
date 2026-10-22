// The ice cola tower: snow paths that crunch, thin ice that cracks, clinking ice cubes
// and fizzing cola puddles. No real brand: just cola.

import type { StepDef, TowerDef } from '../types.ts'
import { checkpoint, COMMON_SKINS, goal, hops } from './kit.ts'

const ZIGZAG = [-0.2, 0.3]

// snow blocks side by side are walked like a path
const snowPath = (n: number, rise = 0.25): StepDef[] => [
  ...hops('snowBlock', 1, { arc: 2.2, rise: 0.5 }),
  ...hops('snowBlock', n - 1, { arc: 1.5, rise }),
]
const ice = (n: number): StepDef[] => hops('thinIce', n, { arc: 2.6, rise: 0.6, r: [0, 0.2, -0.15] })
const cubes = (n: number): StepDef[] => hops('iceCube', n, { arc: 2.3, rise: 0.8, r: ZIGZAG })
const cola = (n: number): StepDef[] => hops('colaPuddle', n, { arc: 2.6, rise: 0.7 })
const mixed = (n: number): StepDef[] => hops(['thinIce', 'iceCube', 'colaPuddle', 'snowBlock'], n, { arc: 2.5, rise: 0.7, r: [0, 0.25, -0.2, 0] })

export const icecola: TowerDef = {
  id: 'icecola',
  name: '얼음 콜라 탑',
  blurb: '뽀드득 눈길, 쩍 갈라지는 살얼음, 달그락 얼음, 치익 탄산 콜라.',
  theme: {
    sky: ['#8fd0ff', '#f1f9ff'],
    fog: '#d6eeff',
    pattern: 'frost',
    decal: 'snowflake',
    pillar: ['#e3f5ff', '#c9e9fb'],
    floor: ['#f6fcff', '#e4f3fc'],
    accent: '#8b4a2f',
    palette: ['#ffffff', '#cdeeff', '#a9dcff', '#7a3b22'],
  },
  skins: {
    ...COMMON_SKINS,
    snowBlock: {
      action: 'squishy', shape: 'snowBlock', hx: 0.75, hz: 0.75, topRest: 0.6, botRest: 0, squash: 0.88, kick: 1.6, soft: 14,
      cues: { enter: 'icecola/snow-step' },
    },
    thinIce: {
      action: 'breakable', shape: 'thinIce', hx: 0.85, hz: 0.85, topRest: 0.3, botRest: 0,
      cracked: { topRest: 0.2, botRest: 0 }, squash: 0.96,
      cues: { crack: 'icecola/ice-crack', enter: 'icecola/snow-step-high', collapse: 'icecola/ice-crack-low' },
    },
    iceCube: {
      action: 'squishy', shape: 'iceCube', hx: 0.6, hz: 0.6, topRest: 0.9, botRest: 0, squash: 1, kick: -1.4, soft: 10,
      cues: { enter: 'icecola/ice-clink' },
    },
    colaPuddle: {
      action: 'stay', shape: 'colaPuddle', hx: 0.9, hz: 0.9, topRest: 0.25, botRest: 0, squash: 0.97, kick: 0.6, soft: 10,
      cues: { enter: 'icecola/cola-land', loop: 'icecola/cola-fizz-loop' },
    },
  },
  steps: [
    ...snowPath(6), ...ice(4), ...cubes(3), ...cola(2), ...mixed(5), ...ice(3),
    checkpoint(3, 2.6, 0.6),
    ...snowPath(5), ...cubes(4), ...ice(4), ...cola(3), ...mixed(6),
    checkpoint(2, 2.6, 0.6),
    ...snowPath(6), ...ice(5), ...cola(2), ...cubes(4), ...mixed(5),
    checkpoint(3, 2.6, 0.6),
    ...snowPath(5), ...cubes(3), ...ice(5), ...cola(3), ...mixed(5),
    checkpoint(1, 2.6, 0.6),
    ...snowPath(6), ...ice(4), ...cubes(4), ...cola(2), ...mixed(6),
    checkpoint(3, 2.6, 0.6),
    ...snowPath(5), ...cola(3), ...ice(4), ...cubes(4), ...mixed(5),
    checkpoint(2, 2.6, 0.6),
    ...snowPath(5), ...ice(4), ...cubes(4), ...cola(3), ...mixed(6),
    checkpoint(3, 2.6, 0.6),
    ...snowPath(6), ...ice(4), ...cubes(3), ...cola(2), ...mixed(4),
    goal(2.75, 0.6),
  ],
}
