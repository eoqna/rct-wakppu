import { useEffect, useRef } from 'react'
import { DIFFICULTY } from '../game/config.ts'
import type { Game, UiState } from '../game/Game.ts'
import { getTower } from '../game/towers/index.ts'
import { clamp, fmtTime } from '../game/util.ts'

/** Hand keyboard control back to the 3D view after using a button or the slider. */
const backToGame = (game: Game, el: EventTarget) => {
  if (el instanceof HTMLElement) el.blur()
  game.focus()
}

export function Hud({ game, state, touch }: { game: Game; state: UiState; touch: boolean }) {
  const height = useRef<HTMLElement>(null)
  const goal = useRef<HTMLSpanElement>(null)
  const bar = useRef<HTMLSpanElement>(null)
  const steps = useRef<HTMLElement>(null)
  const time = useRef<HTMLElement>(null)
  const debug = useRef<HTMLDivElement>(null)

  // numbers change every frame, so they are written straight to the page instead of re-rendering
  useEffect(() => game.onFrame((h) => {
    if (height.current) height.current.textContent = h.height.toFixed(1)
    if (goal.current) goal.current.textContent = h.goalHeight.toFixed(0)
    if (bar.current) bar.current.style.transform = `scaleX(${clamp(h.height / h.goalHeight, 0, 1)})`
    if (steps.current) steps.current.textContent = String(h.steps)
    if (time.current) time.current.textContent = fmtTime(h.elapsed)
    if (debug.current && h.fps !== null) debug.current.textContent = `${h.fps} fps · 가장 느린 프레임 ${h.worstMs ?? '-'} ms`
  }), [game])

  return (
    <div className={touch ? 'hud touch' : 'hud'}>
      <section className="panel meter" aria-label="진행 상황">
        <div className="meter-row">
          <span className="label">높이</span>
          <strong ref={height} className="num height">0.0</strong>
          <span className="unit">m / <span ref={goal}>0</span> m</span>
          <span className="tag">{getTower(state.towerId).name} · {DIFFICULTY[state.difficulty].label}</span>
        </div>
        <div className="bar"><span ref={bar} /></div>
        <div className="meter-row small">
          <span className="label">밟은 발판</span><strong ref={steps} className="num">0</strong>
          <span className="label">시간</span><strong ref={time} className="num">00:00</strong>
        </div>
        <div ref={debug} className="debug" />
      </section>

      <section className="panel controls" aria-label="설정">
        {/* phones have volume buttons; on a small screen the slider only crowds the view */}
        {!touch && (
          <label className="volume">
            <span className="label">소리 크기</span>
            <input
              type="range" min={0} max={100} value={Math.round(state.volume * 100)}
              onChange={(e) => game.setVolume(Number(e.target.value) / 100)}
              onPointerUp={(e) => backToGame(game, e.currentTarget)}
            />
          </label>
        )}
        <button type="button" className="keycap small" onClick={(e) => { game.toggleMute(); backToGame(game, e.currentTarget) }}>
          {state.muted ? '소리 켜기' : '소리 끄기'}{!touch && <kbd>M</kbd>}
        </button>
        <button type="button" className="keycap small" onClick={(e) => { game.respawn(); backToGame(game, e.currentTarget) }}>
          체크포인트로{!touch && <kbd>R</kbd>}
        </button>
        <button type="button" className="keycap small" onClick={() => game.openMenu()}>
          처음 화면{!touch && <kbd>Esc</kbd>}
        </button>
      </section>

      {state.toast && <div key={state.toast.id} className="toast" role="status" aria-live="polite">{state.toast.text}</div>}

      {/* on a touch screen the stick and the jump button explain themselves */}
      {!touch && (
        <section className="panel hints" aria-label="조작법">
          <span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> 이동</span>
          <span><kbd className="wide">Space</kbd> 점프</span>
          <span>마우스 드래그로 시점 돌리기, 휠로 줌</span>
        </section>
      )}
    </div>
  )
}
