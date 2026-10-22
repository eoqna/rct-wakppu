import { useEffect, useRef } from 'react'
import type { Game, UiState } from '../game/Game.ts'
import { fmtTime } from '../game/util.ts'

export function ClearScreen({ game, clear }: { game: Game; clear: NonNullable<UiState['clear']> }) {
  const card = useRef<HTMLDivElement>(null)
  // the card itself takes focus, not a button: players often still have Space down
  // from the last jump, and that press must not restart the run and throw the result away
  useEffect(() => { card.current?.focus() }, [])

  return (
    <div className="overlay center">
      <div ref={card} className="card" role="dialog" aria-labelledby="clear-title" tabIndex={-1}>
        <p className="eyebrow">꼭대기 도착</p>
        <h2 id="clear-title">클리어!</h2>
        <dl className="stats">
          <div><dt>걸린 시간</dt><dd className="num">{fmtTime(clear.time)}</dd></div>
          <div><dt>밟은 발판</dt><dd className="num">{clear.steps}번</dd></div>
        </dl>
        <p className="best">{clear.newBest ? '이 난이도 최고 기록이에요!' : `최고 기록은 ${fmtTime(clear.bestTime)}이에요.`}</p>
        <div className="row">
          <button type="button" className="keycap" onClick={() => game.restart()}>처음부터 다시</button>
          <button type="button" className="keycap" onClick={() => game.openMenu()}>탑 고르기</button>
          <button type="button" className="keycap ghost" onClick={() => game.dismissClear()}>계속 둘러보기</button>
        </div>
      </div>
    </div>
  )
}
