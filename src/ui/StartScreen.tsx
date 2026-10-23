import type { CSSProperties } from 'react'
import { DIFFICULTY } from '../game/config.ts'
import { progressKey, type Game, type UiState } from '../game/Game.ts'
import { CHARACTERS } from '../game/render/characters.ts'
import { TOWERS } from '../game/towers/index.ts'
import type { DifficultyKey } from '../game/types.ts'
import { fmtTime } from '../game/util.ts'
import { Credits } from './Credits.tsx'

const DIFFICULTIES = Object.keys(DIFFICULTY) as DifficultyKey[]
const CREDIT_PACKS = ['shared', ...TOWERS.map((t) => t.id)]

export function StartScreen({ game, state, touch }: { game: Game; state: UiState; touch: boolean }) {
  const key = progressKey(state.towerId, state.difficulty)
  const progress = state.progress[key]
  const record = state.records[key]

  return (
    <div className="overlay start">
      <div className="card">
        <p className="eyebrow">ASMR 탑 오르기</p>
        <h1><span>왁뿌</span> 타워</h1>
        <p className="lede">발판을 밟을 때마다 나는 ASMR 소리를 들으며 꼭대기 트로피까지 올라가 보세요.</p>

        <div role="radiogroup" aria-labelledby="tower-title">
          <h3 id="tower-title" className="section-title">탑</h3>
          <div className="towers">
            {TOWERS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={t.id === state.towerId}
                className="tower"
                title={t.blurb}
                onClick={() => game.selectTower(t.id)}
              >
                <span className="swatch" style={{ background: `linear-gradient(135deg, ${t.theme.palette.join(', ')})` }} aria-hidden="true" />
                <span className="tower-name">{t.name}</span>
                <span className="marks">
                  {DIFFICULTIES.map((d) => {
                    const done = !!state.records[progressKey(t.id, d)]
                    return (
                      <span key={d} className={done ? 'mark done' : 'mark'} title={done ? `${DIFFICULTY[d].label} 클리어` : DIFFICULTY[d].label}>
                        {DIFFICULTY[d].label}{done ? ' ✓' : ''}
                      </span>
                    )
                  })}
                </span>
                {/* only the chosen tower describes itself, so five towers still fit a laptop screen */}
                {t.id === state.towerId && <span className="tower-blurb">{t.blurb}</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="pickers">
          <div className="pick" role="radiogroup" aria-labelledby="char-title">
            <h3 id="char-title" className="section-title">캐릭터</h3>
            <div className="chips">
              {CHARACTERS.map((c) => (
                <button key={c.id} type="button" role="radio" aria-checked={c.id === state.characterId} className="chip" onClick={() => game.selectCharacter(c.id)}>
                  <span className="dot" style={{ '--dot': c.dot } as CSSProperties} aria-hidden="true" />
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          <div className="pick" role="radiogroup" aria-labelledby="diff-title">
            <h3 id="diff-title" className="section-title">난이도</h3>
            <div className="chips">
              {DIFFICULTIES.map((d) => (
                <button key={d} type="button" role="radio" aria-checked={d === state.difficulty} className="chip" onClick={() => game.selectDifficulty(d)}>
                  {DIFFICULTY[d].label}
                </button>
              ))}
            </div>
            <p className="note">{DIFFICULTY[state.difficulty].note}</p>
          </div>
        </div>


        {touch && <p className="note portrait-only">휴대폰은 가로로 돌리면 더 넓게 보여요.</p>}
        <details className="more">
          <summary>조작법</summary>
          {touch ? (
            <ul className="keys">
              <li><span>왼쪽 아래 밀기</span>이동 (엄지를 대고 미는 쪽으로)</li>
              <li><span>점프 버튼</span>점프 (오른쪽 아래)</li>
              <li><span>화면 드래그</span>시점 돌리기, 두 손가락을 벌리면 줌</li>
              <li><span>위쪽 버튼</span>체크포인트로, 소리 끄기, 처음 화면</li>
            </ul>
          ) : (
            <ul className="keys">
              <li><span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></span>이동 (방향키도 돼요)</li>
              <li><span><kbd className="wide">Space</kbd></span>점프</li>
              <li><span>마우스 드래그</span>시점 돌리기, 휠은 줌</li>
              <li><span><kbd>R</kbd></span>마지막 체크포인트로</li>
              <li><span><kbd>M</kbd></span>소리 끄기</li>
              <li><span><kbd>Esc</kbd></span>처음 화면</li>
            </ul>
          )}
          <p className="note">카메라는 {touch ? '손가락으로' : '마우스로'} 돌릴 때만 움직이고, 이동은 화면 기준이에요. 이어폰을 끼면 소리가 더 잘 들려요.</p>
        </details>
        <details className="more">
          <summary>소리 출처</summary>
          <Credits packs={CREDIT_PACKS} />
        </details>

        <div className="start-row">
          {progress ? (
            <>
              <button type="button" className="keycap big" onClick={() => game.start('resume')}>이어서 하기</button>
              <button type="button" className="keycap" onClick={() => game.start('fresh')}>처음부터</button>
              <p className="note resume-note">
                {progress.checkpoint ? `체크포인트 ${progress.checkpoint}번` : '출발점'}에서 이어서 · {fmtTime(progress.elapsed)} 지남
              </p>
            </>
          ) : (
            <>
              <button type="button" className="keycap big" onClick={() => game.start('fresh')}>시작하기</button>
              {touch
                ? <span className="note">왼쪽 아래를 밀어 이동, 오른쪽 아래 버튼으로 점프</span>
                : <span className="note">또는 <kbd>Enter</kbd> · <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> 이동, <kbd className="wide">Space</kbd> 점프</span>}
            </>
          )}
          {record && <p className="note resume-note">이 난이도 최고 기록 {fmtTime(record.bestTime)} · 클리어 {record.clears}번</p>}
        </div>
      </div>
    </div>
  )
}
