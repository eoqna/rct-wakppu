// The strawberry choco tower: chocolate bars that snap, strawberry jelly, marshmallow paths,
// crunchy choco balls and dishes of melted chocolate.

import type { StepDef, TowerDef } from '../types.ts'
import { checkpoint, COMMON_SKINS, goal, hops } from './kit.ts'

const BERRY = ['#ff8fab', '#ffb3c6', '#ff7096']
const MALLOW = ['#fff4f7', '#ffd6e2']
const ZIGZAG = [-0.25, 0.3]

const bars = (n: number): StepDef[] => hops('chocoBar', n, { arc: 2.6, rise: 0.6, r: [0, 0.2, -0.15] })
const jelly = (n: number): StepDef[] => hops('strawberryJelly', n, { arc: 2.5, rise: 0.8, colors: BERRY })
// marshmallows side by side are walked like a path
const mallowPath = (n: number, rise = 0.25): StepDef[] => [
  ...hops('marshmallow', 1, { arc: 2.2, rise: 0.5, colors: MALLOW }),
  ...hops('marshmallow', n - 1, { arc: 1.5, rise, colors: MALLOW.slice(1).concat(MALLOW[0]) }),
]
const balls = (n: number): StepDef[] => hops('chocoBall', n, { arc: 2.3, rise: 0.75, r: ZIGZAG })
const dish = (n: number): StepDef[] => hops('chocoPuddle', n, { arc: 2.6, rise: 0.7 })
const mixed = (n: number): StepDef[] => hops(['chocoBar', 'strawberryJelly', 'chocoBall', 'chocoPuddle'], n, { arc: 2.5, rise: 0.7, colors: BERRY, r: [0, 0.25, -0.2, 0] })

export const choco: TowerDef = {
  id: 'choco',
  name: '딸기 초코 탑',
  blurb: '판 초콜릿이 딱 부러지고, 딸기 젤리와 마시멜로가 말랑해요.',
  theme: {
    sky: ['#ffb8cf', '#fff1e8'],
    fog: '#ffdbe6',
    pattern: 'grid',
    decal: 'strawberry',
    pillar: ['#a0674a', '#8d5940'],
    floor: ['#ffe6ec', '#ffd6e0'],
    accent: '#ff5a7a',
    palette: ['#ff8fab', '#ffc2d1', '#8d5940', '#f6e0c8', '#ff5a7a'],
  },
  skins: {
    ...COMMON_SKINS,
    chocoBar: {
      action: 'breakable', shape: 'chocoBar', hx: 0.9, hz: 0.62, topRest: 0.35, botRest: 0,
      cracked: { topRest: 0.25, botRest: 0 }, squash: 0.95,
      cues: { crack: 'choco/choco-snap', enter: 'choco/choco-snap-soft', collapse: 'choco/choco-snap-soft' },
    },
    strawberryJelly: {
      action: 'squishy', shape: 'jellyCube', hx: 0.8, hz: 0.8, topRest: 0.8, botRest: 0, squash: 0.85, kick: 2.6, soft: 8,
      cues: { enter: 'choco/jelly-squish' },
    },
    marshmallow: {
      action: 'squishy', shape: 'marshmallow', hx: 0.75, hz: 0.75, topRest: 0.9, botRest: 0, squash: 0.72, kick: 1.4, soft: 12,
      cues: { enter: 'choco/mallow-press' },
    },
    chocoBall: {
      action: 'breakable', shape: 'chocoBall', hx: 0.66, hz: 0.66, topRest: 1.7, botRest: 0.32,
      cracked: { topRest: 1.56, botRest: 0.25 }, squash: 0.8,
      cues: { crack: 'choco/ball-crunch', enter: 'choco/mallow-press', collapse: 'shared/wax-crumble' },
    },
    chocoPuddle: {
      action: 'stay', shape: 'chocoPuddle', hx: 0.9, hz: 0.9, topRest: 0.25, botRest: 0, squash: 0.97, kick: 0.6, soft: 10,
      cues: { enter: 'choco/choco-plop', loop: 'choco/choco-bubble-loop' },
    },
  },
  steps: [
    ...bars(4), ...jelly(3), ...mallowPath(5), ...balls(4), ...dish(2), ...mixed(4), ...bars(3),
    checkpoint(3, 2.6, 0.6),
    ...jelly(4), ...balls(3), ...mallowPath(6), ...dish(3), ...bars(4), ...mixed(5),
    checkpoint(2, 2.6, 0.6),
    ...balls(4), ...mallowPath(5), ...bars(4), ...jelly(4), ...dish(2), ...mixed(4),
    checkpoint(3, 2.6, 0.6),
    ...bars(3), ...dish(3), ...balls(4), ...mallowPath(6), ...jelly(3), ...mixed(5),
    checkpoint(1, 2.6, 0.6),
    ...jelly(4), ...bars(4), ...mallowPath(5), ...balls(3), ...dish(3), ...mixed(4),
    checkpoint(3, 2.6, 0.6),
    ...balls(4), ...jelly(3), ...mallowPath(6), ...bars(4), ...dish(2), ...mixed(5),
    checkpoint(2, 2.6, 0.6),
    ...jelly(3), ...mallowPath(5), ...bars(4), ...balls(4), ...dish(3), ...mixed(4),
    checkpoint(3, 2.6, 0.6),
    ...dish(2), ...mallowPath(5), ...bars(3), ...balls(3), ...jelly(2),
    goal(2.75, 0.6),
  ],
}
