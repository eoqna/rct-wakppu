// The keyboard tower: rows of keys with a different switch in each colour, long spacebars,
// heaps of loose keycaps and keys that keep typing while you stand on them.

import type { StepDef, TowerDef } from '../types.ts'
import { checkpoint, COMMON_SKINS, goal, hops, keys } from './kit.ts'

const CAPS = ['#bfe3ff', '#ffe6a8', '#ffc2c7', '#c8f0d8', '#d9cbff']
const key = (skin: string, color: string) => ({
  action: 'key' as const, shape: 'key', hx: 0.65, hz: 0.65, topRest: 0.55, botRest: 0, color,
  cues: { enter: `keyboard/${skin}-press`, leave: `keyboard/${skin}-release` },
})

const row = (skin: 'blueKey' | 'brownKey' | 'redKey', text: string, rise = 0.3, first = 2.0): StepDef[] => keys(skin, text, { first, rise })
// a spacebar is 3.6 long: closer spacing on and off a run, so the jump from a small key stays fair
const space = (n: number, rise = 0.85): StepDef[] => [
  ...hops('spaceBar', 1, { arc: 2.9, rise }),
  ...hops('spaceBar', n - 1, { arc: 3.95, rise }),
  ...hops('blueKey', 1, { arc: 2.9, rise: 0.4 }),
]
const piles = (n: number): StepDef[] => hops('keycapPile', n, { arc: 2.4, rise: 0.75, r: [-0.2, 0.3] })
const rapid = (n: number): StepDef[] => hops('rapidKey', n, { arc: 2.3, rise: 0.7, labels: ['타', '다', '닥'], colors: ['#ffe6a8', '#ffd0a8'] })
const mixed = (n: number): StepDef[] => hops(['keycapPile', 'rapidKey', 'keycapPile', 'spaceBar'], n, { arc: 2.6, rise: 0.7, labels: ['탁'] })

export const keyboard: TowerDef = {
  id: 'keyboard',
  name: '키보드 탑',
  blurb: '청축, 갈축, 적축 키를 밟아요. 축마다 타건 소리가 달라요.',
  theme: {
    sky: ['#4a4f8f', '#f3d9ff'],
    fog: '#d9cbff',
    pattern: 'keys',
    pillar: ['#dcd7f2', '#c9c2ea'],
    floor: ['#eeeaff', '#dfd8fb'],
    accent: '#7cc8ff',
    palette: CAPS,
  },
  skins: {
    ...COMMON_SKINS,
    checkpoint: { ...COMMON_SKINS.checkpoint, shape: 'enterKey', cues: { enter: 'keyboard/enter-press' } },
    blueKey: {
      action: 'key', shape: 'key', hx: 0.65, hz: 0.65, topRest: 0.55, botRest: 0, color: '#bfe3ff',
      cues: { enter: 'shared/blue-press-high', leave: 'shared/blue-release-high' },
    },
    brownKey: key('brown', '#ecd2b4'),
    redKey: key('red', '#ffc2c7'),
    spaceBar: {
      action: 'key', shape: 'spaceBar', hx: 1.8, hz: 0.65, topRest: 0.55, botRest: 0, color: '#f4f1ff',
      cues: { enter: 'keyboard/space-press', leave: 'keyboard/space-release' },
    },
    keycapPile: {
      action: 'breakable', shape: 'keycapPile', hx: 0.75, hz: 0.75, topRest: 0.9, botRest: 0,
      cracked: { topRest: 0.45, botRest: 0 }, squash: 0.92,
      cues: { crack: 'keyboard/keycap-scatter', enter: 'keyboard/brown-press', collapse: 'keyboard/keycap-scatter-low' },
    },
    rapidKey: {
      action: 'stay', shape: 'rapidKey', hx: 0.65, hz: 0.65, topRest: 0.55, botRest: 0, squash: 0.97,
      cues: { enter: 'shared/blue-press-high', tick: { cue: 'keyboard/rapid', every: [0.07, 0.12] } },
    },
  },
  steps: [
    ...row('blueKey', 'QWERTY', 0.3, 1.95),
    ...piles(4),
    ...row('brownKey', 'ASDF'),
    ...space(2),
    ...row('redKey', 'ZXCV'),
    ...rapid(3),
    ...piles(3),
    ...row('blueKey', 'ENTER', 0),
    ...mixed(4),
    checkpoint(3, 2.6, 0.6),

    ...row('brownKey', 'TYPING'),
    ...space(3),
    ...piles(4),
    ...row('redKey', 'SHIFT', 0),
    ...rapid(4),
    ...row('blueKey', 'CLICK'),
    ...mixed(5),
    checkpoint(2, 2.6, 0.6),

    ...row('redKey', 'HELLO'),
    ...piles(5),
    ...row('brownKey', 'CTRL', 0),
    ...space(3),
    ...rapid(3),
    ...row('blueKey', 'ALT'),
    ...mixed(5),
    checkpoint(3, 2.6, 0.6),

    ...row('blueKey', 'ESCAPE'),
    ...rapid(4),
    ...row('redKey', 'TAB', 0),
    ...piles(5),
    ...space(3),
    ...row('brownKey', 'CAPS'),
    ...mixed(4),
    checkpoint(1, 2.6, 0.6),

    ...row('brownKey', 'DELETE'),
    ...piles(4),
    ...row('blueKey', 'HOME', 0),
    ...space(3),
    ...rapid(3),
    ...row('redKey', 'PAGE'),
    ...mixed(5),
    checkpoint(3, 2.6, 0.6),

    ...row('redKey', 'KEYCAP'),
    ...space(3),
    ...piles(4),
    ...row('blueKey', 'SWITCH', 0),
    ...rapid(4),
    ...row('brownKey', 'THOCK'),
    ...mixed(4),
    checkpoint(2, 2.6, 0.6),

    ...row('blueKey', 'ASMR~!'),
    ...piles(4),
    ...row('brownKey', 'WAKPPU'),
    ...space(2),
    ...rapid(3),
    ...row('redKey', 'TOP!'),
    goal(2.75, 0.6),
  ],
}
