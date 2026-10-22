import { useSyncExternalStore } from 'react'
import type { Game, UiState } from '../game/Game.ts'

export function useGameState(game: Game): UiState {
  return useSyncExternalStore(game.subscribe, game.getState)
}
