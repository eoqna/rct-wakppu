// The honey tower: wax honeycomb that crumbles underfoot, sticky honey puddles,
// wobbly honey drops and wooden dipper steps.

import type { StepDef, TowerDef } from '../types.ts'
import { checkpoint, COMMON_SKINS, goal, hops, keys } from './kit.ts'

const WOOD = ['#d9a66b', '#e3b47c', '#cf9a5c']
const DROPS = ['#ffc23d', '#ffb21a', '#ffd166']
const ZIGZAG = [-0.2, 0.3]

const wood = (text: string, rise = 0.3, first = 2.0): StepDef[] => keys('woodStick', text, { first, rise, colors: WOOD })
const combs = (n: number): StepDef[] => hops('honeycomb', n, { arc: 2.45, rise: 0.7, r: ZIGZAG })
const drops = (n: number): StepDef[] => hops('honeyDrop', n, { arc: 2.4, rise: 0.8, colors: DROPS })
const puddles = (n: number): StepDef[] => hops('honeyPuddle', n, { arc: 2.6, rise: 0.7 })
const mixed = (n: number): StepDef[] => hops(['honeycomb', 'honeyDrop', 'honeyPuddle'], n, { arc: 2.5, rise: 0.7, colors: DROPS, r: [0, 0.25, -0.2] })

export const honey: TowerDef = {
  id: 'honey',
  name: '꿀 탑',
  blurb: '바삭한 밀랍 벌집을 부수고, 끈적한 꿀 웅덩이를 지나요.',
  theme: {
    sky: ['#ffc35c', '#fff4dc'],
    fog: '#ffe3a3',
    pattern: 'hex',
    decal: 'honeycomb',
    pillar: ['#f5c04a', '#e8ab2e'],
    floor: ['#fff4d9', '#ffe8b5'],
    accent: '#f2a516',
    palette: ['#ffd36b', '#f5b942', '#ffe9a8', '#c9842b'],
  },
  skins: {
    ...COMMON_SKINS,
    woodStick: {
      action: 'key', shape: 'woodStick', hx: 0.65, hz: 0.65, topRest: 0.55, botRest: 0,
      cues: { enter: 'honey/wood-tap' },
    },
    honeycomb: {
      action: 'breakable', shape: 'hexComb', hx: 0.78, hz: 0.78, topRest: 0.6, botRest: 0,
      cracked: { topRest: 0.4, botRest: 0 }, squash: 0.92,
      cues: { crack: 'honey/comb-crunch', enter: 'honey/drop-squish', collapse: 'honey/comb-crumble' },
    },
    honeyDrop: {
      action: 'squishy', shape: 'honeyDrop', hx: 0.7, hz: 0.7, topRest: 0.85, botRest: 0, squash: 0.82, kick: 2.6, soft: 8,
      cues: { enter: 'honey/drop-squish' },
    },
    honeyPuddle: {
      action: 'stay', shape: 'honeyPuddle', hx: 0.9, hz: 0.9, topRest: 0.25, botRest: 0, squash: 0.97, kick: 0.5, soft: 12,
      cues: { enter: 'honey/drop-squish', leave: 'honey/honey-stick', loop: 'honey/honey-loop' },
    },
  },
  steps: [
    ...wood('꿀꿀꿀', 0.3, 1.95), ...combs(4), ...drops(3), ...wood('HONEY'), ...puddles(2), ...mixed(5), ...combs(3),
    checkpoint(3, 2.6, 0.6),
    ...wood('벌집', 0), ...drops(4), ...combs(4), ...wood('BUZZ'), ...puddles(3), ...mixed(6),
    checkpoint(2, 2.6, 0.6),
    ...wood('달콤해'), ...combs(5), ...puddles(2), ...drops(4), ...wood('STICKY', 0), ...mixed(5),
    checkpoint(3, 2.6, 0.6),
    ...wood('꿀벌'), ...drops(3), ...combs(5), ...wood('DRIP'), ...puddles(3), ...mixed(5),
    checkpoint(1, 2.6, 0.6),
    ...wood('WAX', 0), ...combs(4), ...drops(4), ...wood('꿀단지'), ...puddles(2), ...mixed(6),
    checkpoint(3, 2.6, 0.6),
    ...wood('BEE'), ...puddles(3), ...combs(4), ...wood('붕붕', 0), ...drops(4), ...mixed(5),
    checkpoint(2, 2.6, 0.6),
    ...wood('YUMMY'), ...combs(4), ...drops(4), ...wood('끈적', 0), ...puddles(3), ...mixed(5),
    checkpoint(3, 2.6, 0.6),
    ...wood('SWEET'), ...combs(4), ...drops(3), ...wood('TOP!'),
    goal(2.75, 0.6),
  ],
}
