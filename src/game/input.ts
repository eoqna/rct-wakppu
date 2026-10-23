// Keyboard, pointer and on-screen stick input. The game decides what a key means; this keeps
// track of held keys and the stick, and turns drags, pinches and the wheel into camera moves.

import { TOUCH } from './config.ts'

const MOVE = {
  right: ['KeyD', 'ArrowRight'],
  left: ['KeyA', 'ArrowLeft'],
  forward: ['KeyW', 'ArrowUp'],
  back: ['KeyS', 'ArrowDown'],
}

export const GAME_KEYS = new Set([...MOVE.right, ...MOVE.left, ...MOVE.forward, ...MOVE.back, 'Space'])

/** Thumb offset from where the stick was pressed (CSS px, y down) to a move axis: ix right, iz forward, length 0 to 1. */
export function stickAxis(dx: number, dy: number, radius: number = TOUCH.stickRadius): [number, number] {
  const d = Math.hypot(dx, dy) / radius
  if (d <= TOUCH.stickDead) return [0, 0]
  const k = Math.min(1, (d - TOUCH.stickDead) / (TOUCH.stickFull - TOUCH.stickDead)) / (d * radius)
  return [dx * k, -dy * k]
}

/** Pointers on the 3D view: one drags the camera around, two pinch to zoom. */
export class ViewGesture {
  private readonly points = new Map<number, { x: number; y: number }>()
  private span = 0
  private readonly drag: (dx: number, dy: number) => void
  private readonly pinch: (scale: number) => void

  constructor(drag: (dx: number, dy: number) => void, pinch: (scale: number) => void) {
    this.drag = drag
    this.pinch = pinch
  }

  down(id: number, x: number, y: number) {
    this.points.set(id, { x, y })
    this.span = this.spread()
  }

  move(id: number, x: number, y: number) {
    const pt = this.points.get(id)
    if (!pt) return
    if (this.points.size === 1) this.drag(x - pt.x, y - pt.y)
    pt.x = x; pt.y = y
    if (this.points.size < 2) return
    const s = this.spread()
    if (this.span > 0 && s > 0 && s !== this.span) this.pinch(s / this.span)
    this.span = s
  }

  up(id: number) {
    this.points.delete(id)
    this.span = this.spread()
  }

  /** gap between the first two pointers, 0 with fewer */
  private spread() {
    if (this.points.size < 2) return 0
    const [a, b] = this.points.values()
    return Math.hypot(a.x - b.x, a.y - b.y)
  }
}

export interface InputHandlers {
  key(e: KeyboardEvent): void
  drag(dx: number, dy: number): void
  zoom(deltaY: number): void
  pinch(scale: number): void
  /** a pointer let go of the view: a gesture that may wake the game and its audio */
  wake(): void
}

export class Input {
  private readonly held = new Set<string>()
  private stick: [number, number] = [0, 0]
  private readonly cleanup: (() => void)[] = []

  constructor(canvas: HTMLCanvasElement, handlers: InputHandlers) {
    const listen = <E extends Event>(target: EventTarget, type: string, fn: (e: E) => void, opts?: AddEventListenerOptions) => {
      const f = fn as EventListener
      target.addEventListener(type, f, opts)
      this.cleanup.push(() => target.removeEventListener(type, f, opts))
    }
    listen<KeyboardEvent>(window, 'keydown', (e) => handlers.key(e))
    listen<KeyboardEvent>(window, 'keyup', (e) => this.held.delete(e.code))
    listen(window, 'blur', () => this.held.clear())

    const gesture = new ViewGesture(handlers.drag, handlers.pinch)
    listen<PointerEvent>(canvas, 'pointerdown', (e) => {
      gesture.down(e.pointerId, e.clientX, e.clientY)
      canvas.setPointerCapture(e.pointerId)
      canvas.focus()
    })
    listen<PointerEvent>(canvas, 'pointermove', (e) => gesture.move(e.pointerId, e.clientX, e.clientY))
    // a finger lifting is what browsers count as a gesture for audio, not the finger landing
    listen<PointerEvent>(canvas, 'pointerup', (e) => { gesture.up(e.pointerId); handlers.wake() })
    listen<PointerEvent>(canvas, 'pointercancel', (e) => gesture.up(e.pointerId))
    listen(canvas, 'contextmenu', (e) => e.preventDefault())
    listen<WheelEvent>(canvas, 'wheel', (e) => { e.preventDefault(); handlers.zoom(e.deltaY) }, { passive: false })
  }

  hold(code: string) {
    this.held.add(code)
  }

  /** The on-screen stick, as stickAxis gives it; [0, 0] when the thumb lets go. */
  setStick(ix: number, iz: number) {
    this.stick = [ix, iz]
  }

  /** Screen-relative movement: ix to the right, iz forward. The stick wins while it is pushed. */
  axis(): [number, number] {
    if (this.stick[0] || this.stick[1]) return this.stick
    const on = (codes: string[]) => (codes.some((c) => this.held.has(c)) ? 1 : 0)
    return [on(MOVE.right) - on(MOVE.left), on(MOVE.forward) - on(MOVE.back)]
  }

  clear() {
    this.held.clear()
    this.stick = [0, 0]
  }

  dispose() {
    for (const f of this.cleanup) f()
    this.cleanup.length = 0
  }
}
