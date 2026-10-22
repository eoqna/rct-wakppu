// The starter tower: the prototype's keyboard stairs, wax balls and soda jelly, grown longer.

import type { StepDef, TowerDef } from '../types.ts'
import { checkpoint, COMMON_SKINS, goal, hops, keys } from './kit.ts'

const PASTEL = ['#ffb3cf', '#ffc9a8', '#ffe59a', '#b8ecc9', '#a9dcff', '#cdb8ff']
const RAINBOW = ['#ff9aa2', '#ffb7a0', '#ffe08a', '#b8ecc9', '#a9dcff', '#c7b8ff', '#f3b4f5']
const SODA = ['#a6dcff', '#bdf0db']
const ZIGZAG = [-0.25, 0.35]

const ball = (n: number, arc = 2.3, rise = 0.75): StepDef[] => hops('waxBall', n, { arc, rise, r: ZIGZAG, colors: PASTEL })
const soda = (n: number, arc = 2.6, rise = 0.85): StepDef[] => hops('sodaJelly', n, { arc, rise, colors: SODA })
const mixed = (n: number, skins: string[]): StepDef[] => hops(skins, n, { arc: 2.4, rise: 0.75, r: [0, 0.3, -0.2], colors: PASTEL })
const white = (text: string, first = 2.0, rise = 0.3): StepDef[] => keys('whiteKey', text, { first, rise })
const colour = (text: string, first = 2.0, rise = 0): StepDef[] => keys('colorKey', text, { first, rise, colors: RAINBOW })

export const rainbow: TowerDef = {
  id: 'rainbow',
  name: '무지개 탑',
  blurb: '처음 오르기 좋은 탑. 키보드 계단, 왁뿌볼, 탄산 젤리를 밟아요.',
  theme: {
    sky: ['#ffd6ec', '#dcecff'],
    fog: '#f7e3f1',
    pattern: 'checker',
    decal: 'flower',
    pillar: ['#f8e6f2', '#eed3e7'],
    floor: ['#fbe8d8', '#f2d9c6'],
    accent: '#ff6fa8',
    palette: PASTEL,
  },
  skins: {
    ...COMMON_SKINS,
    whiteKey: {
      action: 'key', shape: 'key', hx: 0.65, hz: 0.65, topRest: 0.55, botRest: 0, color: '#fffaf2',
      cues: { enter: 'shared/blue-press-low', leave: 'shared/blue-release-low' },
    },
    colorKey: {
      action: 'key', shape: 'key', hx: 0.65, hz: 0.65, topRest: 0.55, botRest: 0,
      cues: { enter: 'shared/blue-press-high', leave: 'shared/blue-release-high' },
    },
    waxBall: {
      action: 'breakable', shape: 'waxBall', hx: 0.66, hz: 0.66, topRest: 1.7, botRest: 0.32,
      cracked: { topRest: 1.56, botRest: 0.25 }, squash: 0.8,
      cues: { crack: 'shared/wax-crunch', enter: 'rainbow/wax-squish', collapse: 'shared/wax-crumble' },
    },
    sodaJelly: {
      action: 'stay', shape: 'sodaJelly', hx: 0.9, hz: 0.9, topRest: 0.75, botRest: 0, squash: 0.9, kick: 2.8, soft: 8,
      cues: { enter: 'rainbow/jelly-land', loop: 'rainbow/fizz-loop' },
    },
  },
  steps: [
    // the prototype's opening: ASMR~! stairs, five wax balls, the WAKPPU bridge, soda jelly
    ...white('ASMR~!', 1.95),
    ...ball(5),
    ...colour('WAKPPU'),
    ...soda(4),
    ...mixed(4, ['waxBall', 'sodaJelly']),
    ...keys('colorKey', 'ㅋㅋㅋ', { first: 2.25, rise: 0.3, colors: RAINBOW.slice(2) }),
    ...ball(3),
    checkpoint(3, 2.5, 0.6),

    ...colour('RAINBOW'),
    ...soda(5, 2.55, 0.8),
    ...white('HAPPY', 2.1),
    ...ball(6, 2.35, 0.7),
    ...keys('colorKey', 'POP', { first: 2.0, rise: 0.25, colors: RAINBOW.slice(4) }),
    ...mixed(6, ['sodaJelly', 'waxBall']),
    checkpoint(2, 2.6, 0.6),

    ...white('TYPING'),
    ...ball(4, 2.5, 0.8),
    ...colour('BRIDGE', 2.2),
    ...soda(6, 2.6, 0.8),
    ...white('ABC'),
    ...mixed(6, ['waxBall', 'waxBall', 'sodaJelly']),
    checkpoint(3, 2.6, 0.6),

    ...colour('WAKPPU'),
    ...ball(6, 2.4),
    ...white('CLICK', 2.1),
    ...soda(5),
    ...keys('colorKey', 'ASMR', { first: 2.0, rise: 0.3, colors: RAINBOW }),
    ...mixed(6, ['sodaJelly', 'waxBall']),
    checkpoint(1, 2.6, 0.6),

    ...keys('colorKey', 'RAINBOW', { first: 2.0, rise: 0.3, colors: RAINBOW }),
    ...ball(5),
    ...white('TOP!', 2.05),
    goal(2.75, 0.6),
  ],
}
