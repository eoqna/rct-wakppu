import { useEffect, useRef, useState } from 'react'
import { Game } from './game/Game.ts'
import { getBrowserStorage } from './game/save.ts'
import { ClearScreen } from './ui/ClearScreen.tsx'
import { Hud } from './ui/Hud.tsx'
import { StartScreen } from './ui/StartScreen.tsx'
import { TouchControls } from './ui/TouchControls.tsx'
import { useGameState } from './ui/useGame.ts'
import { useTouchMode } from './ui/useTouch.ts'
import './ui/ui.css'

export default function App() {
  const host = useRef<HTMLDivElement>(null)
  const [game, setGame] = useState<Game | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    // StrictMode mounts twice; a game created after its effect was cleaned up is thrown away
    let alive = true
    let made: Game | null = null
    // an Artifact link passes no query string, only a plain #anchor
    const debug = new URLSearchParams(window.location.search).has('debug') || window.location.hash === '#debug'
    Game.create(host.current!, { storage: getBrowserStorage(), debug, baseUrl: import.meta.env.BASE_URL })
      .then((g) => {
        if (alive) { made = g; setGame(g) } else g.dispose()
      })
      .catch(() => { if (alive) setFailed(true) })
    return () => {
      alive = false
      made?.dispose()
    }
  }, [])

  return (
    <>
      <div ref={host} className="stage" />
      {game ? <Screens game={game} /> : <Waiting failed={failed} />}
    </>
  )
}

function Screens({ game }: { game: Game }) {
  const state = useGameState(game)
  const touch = useTouchMode()
  return (
    <>
      {state.screen === 'menu' && <StartScreen game={game} state={state} touch={touch} />}
      {state.screen !== 'menu' && <Hud game={game} state={state} touch={touch} />}
      {state.screen === 'playing' && touch && <TouchControls game={game} />}
      {state.screen === 'cleared' && state.clear && <ClearScreen game={game} clear={state.clear} />}
    </>
  )
}

function Waiting({ failed }: { failed: boolean }) {
  return (
    <div className="overlay center">
      <div className="card">
        <p className="eyebrow">ASMR 탑 오르기</p>
        <h1><span>왁뿌</span> 타워</h1>
        {failed
          ? <p className="note error">이 브라우저에서는 3D 화면을 켤 수 없어요. 최신 Chrome이나 Edge에서 열어 주세요.</p>
          : <p className="note">탑을 쌓는 중이에요…</p>}
      </div>
    </div>
  )
}
