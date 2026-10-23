import { useEffect, useRef, type PointerEvent } from 'react'
import { TOUCH } from '../game/config.ts'
import type { Game } from '../game/Game.ts'
import { stickAxis } from '../game/input.ts'

/** Thumb controls for touch screens: a stick that comes to wherever the left thumb lands, and a jump button. */
export function TouchControls({ game }: { game: Game }) {
  const stick = useRef<HTMLDivElement>(null)
  const knob = useRef<HTMLSpanElement>(null)
  const thumb = useRef<{ id: number; x: number; y: number } | null>(null)

  // controls that leave the screen let go of the stick, even with a thumb still on it
  useEffect(() => () => game.setStick(0, 0), [game])

  const press = (e: PointerEvent<HTMLDivElement>) => {
    if (thumb.current) return
    e.currentTarget.setPointerCapture(e.pointerId)
    thumb.current = { id: e.pointerId, x: e.clientX, y: e.clientY }
    const box = e.currentTarget.getBoundingClientRect(), s = stick.current
    if (!s) return
    s.style.setProperty('--x', `${e.clientX - box.left}px`)
    s.style.setProperty('--y', `${e.clientY - box.top}px`)
    s.classList.add('held')
  }

  const drag = (e: PointerEvent<HTMLDivElement>) => {
    const t = thumb.current
    if (!t || t.id !== e.pointerId) return
    const dx = e.clientX - t.x, dy = e.clientY - t.y
    game.setStick(...stickAxis(dx, dy))
    const d = Math.hypot(dx, dy), k = d > TOUCH.stickRadius ? TOUCH.stickRadius / d : 1
    if (knob.current) knob.current.style.transform = `translate(${dx * k}px, ${dy * k}px)`
  }

  const release = (e: PointerEvent<HTMLDivElement>) => {
    if (thumb.current?.id !== e.pointerId) return
    thumb.current = null
    game.setStick(0, 0)
    stick.current?.style.removeProperty('--x')
    stick.current?.style.removeProperty('--y')
    stick.current?.classList.remove('held')
    if (knob.current) knob.current.style.transform = ''
    game.wake()
  }

  return (
    <div className="touch-pad">
      <div
        className="stick-zone"
        onPointerDown={press}
        onPointerMove={drag}
        onPointerUp={release}
        onPointerCancel={release}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div ref={stick} className="stick" aria-hidden="true"><span ref={knob} className="knob" /></div>
      </div>
      <button
        type="button"
        className="jump"
        onPointerDown={() => game.jump()}
        onPointerUp={() => game.wake()}
        onContextMenu={(e) => e.preventDefault()}
      >
        점프
      </button>
    </div>
  )
}
