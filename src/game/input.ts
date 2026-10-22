// Keyboard and pointer input. The game decides what a key means; this keeps
// track of held keys and turns drags and the wheel into camera moves.

const MOVE = {
  right: ['KeyD', 'ArrowRight'],
  left: ['KeyA', 'ArrowLeft'],
  forward: ['KeyW', 'ArrowUp'],
  back: ['KeyS', 'ArrowDown'],
}

export const GAME_KEYS = new Set([...MOVE.right, ...MOVE.left, ...MOVE.forward, ...MOVE.back, 'Space'])

export interface InputHandlers {
  key(e: KeyboardEvent): void
  drag(dx: number, dy: number): void
  zoom(deltaY: number): void
}

export class Input {
  private readonly held = new Set<string>()
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

    const drag = { active: false, x: 0, y: 0, id: -1 }
    listen<PointerEvent>(canvas, 'pointerdown', (e) => {
      drag.active = true; drag.x = e.clientX; drag.y = e.clientY; drag.id = e.pointerId
      canvas.setPointerCapture(e.pointerId)
      canvas.focus()
    })
    listen<PointerEvent>(canvas, 'pointermove', (e) => {
      if (!drag.active || e.pointerId !== drag.id) return
      handlers.drag(e.clientX - drag.x, e.clientY - drag.y)
      drag.x = e.clientX; drag.y = e.clientY
    })
    const end = (e: PointerEvent) => { if (e.pointerId === drag.id) drag.active = false }
    listen<PointerEvent>(canvas, 'pointerup', end)
    listen<PointerEvent>(canvas, 'pointercancel', end)
    listen(canvas, 'contextmenu', (e) => e.preventDefault())
    listen<WheelEvent>(canvas, 'wheel', (e) => { e.preventDefault(); handlers.zoom(e.deltaY) }, { passive: false })
  }

  hold(code: string) {
    this.held.add(code)
  }

  /** Screen-relative movement: ix to the right, iz forward. */
  axis(): [number, number] {
    const on = (codes: string[]) => (codes.some((c) => this.held.has(c)) ? 1 : 0)
    return [on(MOVE.right) - on(MOVE.left), on(MOVE.forward) - on(MOVE.back)]
  }

  clear() {
    this.held.clear()
  }

  dispose() {
    for (const f of this.cleanup) f()
    this.cleanup.length = 0
  }
}
