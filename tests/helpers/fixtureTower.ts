import { checkpoint, COMMON_SKINS, goal, hops, keys } from '../../src/game/towers/kit.ts'
import type { SkinDef, StepDef, TowerDef } from '../../src/game/types.ts'

export const fixtureSkins: Record<string, SkinDef> = {
  ...COMMON_SKINS,
  key: { action: 'key', shape: 'key', hx: 0.65, hz: 0.65, topRest: 0.55, botRest: 0, cues: { enter: 'fx/press', leave: 'fx/release' } },
  ball: {
    action: 'breakable', shape: 'ball', hx: 0.66, hz: 0.66, topRest: 1.7, botRest: 0.32,
    cracked: { topRest: 1.56, botRest: 0.25 }, cues: { crack: 'fx/crunch', enter: 'fx/squish' },
  },
  jelly: {
    action: 'stay', shape: 'jelly', hx: 0.9, hz: 0.9, topRest: 0.75, botRest: 0, squash: 0.9,
    cues: { enter: 'fx/land', loop: 'fx/fizz' },
  },
}

export function towerWith(steps: StepDef[]): TowerDef {
  return {
    id: 'rainbow',
    name: '시험 탑',
    blurb: '',
    theme: { sky: ['#fff', '#fff'], fog: '#fff', pattern: 'checker', pillar: ['#fff', '#eee'], floor: ['#fff', '#eee'], accent: '#f6a', palette: ['#f6a'] },
    skins: fixtureSkins,
    steps,
  }
}

// platform indices: 0 start · 1-4 keys A B C D · 5 checkpoint(tier 3) · 6-7 balls
// · 8 checkpoint(tier 2) · 9 ball · 10 checkpoint(tier 1) · 11 goal
export const fixtureTower = towerWith([
  ...keys('key', 'ABCD', { first: 1.95, rise: 0.3 }),
  checkpoint(3, 2.4, 0.6),
  ...hops('ball', 2, { arc: 2.3, rise: 0.75 }),
  checkpoint(2, 2.4, 0.6),
  ...hops('ball', 1, { arc: 2.3, rise: 0.75 }),
  checkpoint(1, 2.4, 0.6),
  goal(2.75, 0.6),
])
