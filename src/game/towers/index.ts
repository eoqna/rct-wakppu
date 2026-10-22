import type { TowerDef, TowerId } from '../types.ts'
import { choco } from './choco.ts'
import { honey } from './honey.ts'
import { icecola } from './icecola.ts'
import { keyboard } from './keyboard.ts'
import { rainbow } from './rainbow.ts'

/** Towers in the order the start screen shows them. */
export const TOWERS: TowerDef[] = [rainbow, icecola, honey, choco, keyboard]

export function getTower(id: TowerId): TowerDef {
  return TOWERS.find((t) => t.id === id) ?? TOWERS[0]
}
