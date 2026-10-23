// Ties the pieces together: builds a tower, runs the frame loop, turns platform
// events into sound and effects, keeps progress, and tells the React screens what changed.

import * as THREE from 'three'
import { cuesForTower } from './audio/cues.ts'
import { AudioEngine } from './audio/engine.ts'
import { DIFFICULTY, PHYSICS, TOWER } from './config.ts'
import { GAME_KEYS, Input } from './input.ts'
import { buildLayout } from './layout.ts'
import { createPlayer, FLOOR, horizDist2, makeCollider, requestJump, resetPlayer, stepPlayer, type Collider, type World } from './physics.ts'
import { createPlatformState, enterPlatform, leavePlatform, resetPlatform, updatePlatform, type Emit, type PlatformState } from './platform.ts'
import { Avatar } from './render/avatar.ts'
import { CameraRig } from './render/cameraRig.ts'
import { CHARACTERS } from './render/characters.ts'
import { Effects } from './render/effects.ts'
import './render/shapes/choco.ts'
import './render/shapes/common.ts'
import './render/shapes/honey.ts'
import './render/shapes/icecola.ts'
import './render/shapes/keyboard.ts'
import './render/shapes/rainbow.ts'
import { Stage } from './render/stage.ts'
import { createView, type PlatformView } from './render/views.ts'
import { createSave, sanitizeProgress, type Progress, type RecordEntry, type Save, type StorageLike } from './save.ts'
import { getTower, TOWERS } from './towers/index.ts'
import type { CharacterId, DifficultyKey, Layout, TowerDef, TowerId } from './types.ts'
import { rand } from './util.ts'

export type Screen = 'menu' | 'playing' | 'cleared'

export interface UiState {
  screen: Screen
  towerId: TowerId
  characterId: CharacterId
  difficulty: DifficultyKey
  volume: number
  muted: boolean
  toast: { text: string; id: number } | null
  clear: { time: number; steps: number; newBest: boolean; bestTime: number } | null
  /** keyed `${tower}.${difficulty}` */
  progress: Record<string, Progress | undefined>
  records: Record<string, RecordEntry | undefined>
}

export interface HudFrame {
  height: number
  goalHeight: number
  steps: number
  elapsed: number
  fps: number | null
  worstMs: number | null
}

export interface GameOptions {
  storage: StorageLike | null
  debug: boolean
  /** prefix for sound files, './' for a build that runs from any folder */
  baseUrl: string
}

export const progressKey = (t: TowerId, d: DifficultyKey) => `${t}.${d}`

const DIFFICULTIES: DifficultyKey[] = ['easy', 'normal', 'hard']
/** platforms further above or below the view than this are not drawn */
const DRAW_RANGE = 48
/** the start screen looks at the foot of the tower */
const MENU_VIEW_Y = 8
const TOAST_MS = 1400
const CLEAR_DELAY_MS = 700

export class Game {
  /** Waits briefly for the key-label font, then builds the game into `container`. Throws WebGLUnavailableError. */
  static async create(container: HTMLElement, opts: GameOptions): Promise<Game> {
    try {
      await Promise.race([document.fonts.load('64px Jua'), new Promise((r) => setTimeout(r, 1500))])
    } catch { /* system font fallback */ }
    return new Game(container, opts)
  }

  private readonly canvas: HTMLCanvasElement
  private readonly stage: Stage
  private readonly audio: AudioEngine
  private readonly save: Save
  private readonly effects: Effects
  private readonly avatar: Avatar
  private readonly rig: CameraRig
  private readonly input: Input
  private readonly debug: boolean
  private readonly listeners = new Set<() => void>()
  private readonly frameListeners = new Set<(h: HudFrame) => void>()
  private readonly cleanup: (() => void)[] = []
  private state: UiState

  private tower!: TowerDef
  private layout!: Layout
  private platforms: PlatformState[] = []
  private views: PlatformView[] = []
  private occluders: THREE.Object3D[] = []
  private world: World = { colliders: [], pillarTop: 0 }
  private readonly player = createPlayer()
  /** platform the player stands on; -1 for the air or the floor */
  private ground = -1
  private currentCp = 0
  private steps = 0
  private elapsed = 0
  private cleared = false
  private paused = false
  private readonly pauseReasons = new Set<'hidden' | 'blur'>()
  /** play time in seconds; stands still while paused */
  private clock = 0
  private readonly checkpointCounts = new Map<string, number>()
  private stayTick = 0
  /** the landing right after a respawn is not a step the player took */
  private skipStep = false
  private raf = 0
  private last = 0
  private toastId = 0
  private toastTimer = 0
  private clearTimer = 0
  private readonly perf = { frames: 0, since: 0, fps: null as number | null, worst: 0, worstSince: 0, worstMs: null as number | null, slow: 0 }

  private constructor(container: HTMLElement, opts: GameOptions) {
    this.debug = opts.debug
    this.canvas = document.createElement('canvas')
    this.canvas.className = 'scene'
    this.canvas.tabIndex = 0
    this.canvas.setAttribute('aria-label', '왁뿌 타워 3D 화면')
    container.append(this.canvas)
    try {
      this.stage = new Stage(this.canvas)
    } catch (err) {
      this.canvas.remove()
      throw err
    }
    this.audio = new AudioEngine(opts.baseUrl)
    this.save = createSave(opts.storage, { towers: TOWERS.map((t) => t.id), characters: CHARACTERS.map((c) => c.id) })
    this.effects = new Effects(this.stage.scene)
    this.avatar = new Avatar(this.stage.scene)
    this.rig = new CameraRig(this.stage.camera)

    const prefs = this.save.loadPrefs()
    this.state = {
      screen: 'menu', towerId: prefs.tower, characterId: prefs.character, difficulty: prefs.difficulty,
      volume: prefs.volume, muted: prefs.muted, toast: null, clear: null, ...this.saved(),
    }
    this.audio.setVolume(prefs.volume)
    this.audio.setMuted(prefs.muted)
    this.avatar.setCharacter(prefs.character)
    this.loadTower()

    this.input = new Input(this.canvas, {
      key: (e) => this.onKey(e),
      drag: (dx, dy) => { if (this.state.screen !== 'menu') this.rig.drag(dx, dy) },
      zoom: (dy) => { if (this.state.screen !== 'menu') this.rig.zoom(dy) },
      pinch: (s) => { if (this.state.screen !== 'menu') this.rig.pinch(s) },
      wake: () => this.wake(),
    })
    const onResize = () => this.stage.resize()
    const onVisibility = () => this.setPaused('hidden', document.hidden)
    // a player who switches to another app is not playing, even if the game stays on screen
    const onBlur = () => { if (this.state.screen === 'playing') this.setPaused('blur', true) }
    const onFocus = () => this.setPaused('blur', false)
    const onPageHide = () => this.saveProgress()
    window.addEventListener('resize', onResize)
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('blur', onBlur)
    window.addEventListener('focus', onFocus)
    window.addEventListener('pagehide', onPageHide)
    this.cleanup.push(
      () => window.removeEventListener('resize', onResize),
      () => document.removeEventListener('visibilitychange', onVisibility),
      () => window.removeEventListener('blur', onBlur),
      () => window.removeEventListener('focus', onFocus),
      () => window.removeEventListener('pagehide', onPageHide),
    )
    if (this.debug) this.exposeDebug()
    this.raf = requestAnimationFrame((t) => {
      this.last = t
      this.frame(t)
    })
  }

  // ---------- for the React screens ----------

  getState = (): UiState => this.state

  subscribe = (fn: () => void) => {
    this.listeners.add(fn)
    return () => { this.listeners.delete(fn) }
  }

  onFrame(fn: (h: HudFrame) => void) {
    this.frameListeners.add(fn)
    return () => { this.frameListeners.delete(fn) }
  }

  selectTower(id: TowerId) {
    if (id === this.state.towerId || this.state.screen !== 'menu') return
    this.setState({ towerId: id })
    this.savePrefs()
    this.loadTower()
  }

  selectDifficulty(d: DifficultyKey) {
    if (d === this.state.difficulty || this.state.screen !== 'menu') return
    this.setState({ difficulty: d })
    this.savePrefs()
    this.loadTower()
  }

  selectCharacter(id: CharacterId) {
    this.avatar.setCharacter(id)
    this.setState({ characterId: id })
    this.savePrefs()
  }

  start(mode: 'resume' | 'fresh') {
    this.audio.unlock()
    void this.audio.preload(cuesForTower(this.tower))
    clearTimeout(this.clearTimer)
    const saved = mode === 'resume'
      ? sanitizeProgress(this.save.loadProgress(this.tower.id, this.state.difficulty), this.layout.checkpoints.length)
      : null
    if (mode === 'fresh') this.save.clearProgress(this.tower.id, this.state.difficulty)
    this.resetRun()
    if (saved) {
      for (let i = 1; i <= saved.checkpoint; i++) this.platforms[this.layout.checkpoints[i]].active = true
      this.currentCp = saved.checkpoint
      this.elapsed = saved.elapsed
      this.steps = saved.steps
      this.respawn()
    }
    this.input.clear()
    this.rig.begin(performance.now() / 1000)
    this.perf.slow = 0
    this.setState({ screen: 'playing', clear: null, ...this.saved() })
    this.canvas.focus()
  }

  openMenu() {
    if (this.state.screen === 'menu') return
    this.saveProgress()
    clearTimeout(this.clearTimer)
    this.input.clear()
    this.audio.stopAllLoops()
    // the climb freezes behind the start screen; the next start resets every platform,
    // so the one underfoot is dropped without its leave sound
    this.ground = -1
    this.setPaused('blur', false)
    this.setState({ screen: 'menu', clear: null })
  }

  /** Back to the last checkpoint. */
  respawn() {
    const cp = this.layout.platforms[this.layout.checkpoints[this.currentCp]]
    this.leaveGround()
    resetPlayer(this.player, cp.x, cp.top + 0.02, cp.z)
    this.stayTick = 0
    this.skipStep = true
    this.avatar.face(Math.atan2(-Math.sin(cp.t), -Math.cos(cp.t)))
    this.rig.faceFrom(cp.x, cp.z)
  }

  restart() {
    this.start('fresh')
  }

  /** Close the clear card and keep looking around; the clock stays stopped. */
  dismissClear() {
    if (this.state.screen === 'cleared') this.setState({ screen: 'playing' })
    this.canvas.focus()
  }

  setVolume(v: number) {
    this.audio.setVolume(v)
    this.setState({ volume: v })
    this.savePrefs()
  }

  toggleMute() {
    const muted = !this.state.muted
    this.audio.setMuted(muted)
    this.setState({ muted })
    this.savePrefs()
  }

  focus() {
    this.canvas.focus()
  }

  /** The on-screen stick: ix to the right, iz forward, length 0 to 1; [0, 0] lets go. */
  setStick(ix: number, iz: number) {
    this.input.setStick(ix, iz)
  }

  /** The on-screen jump button. */
  jump() {
    if (this.state.screen === 'playing') requestJump(this.player)
  }

  /** A key press or a finger lifting: the player is back, and the gesture lets a stalled audio start again. */
  wake() {
    if (this.state.screen === 'menu') return
    this.setPaused('blur', false)
    this.audio.unlock()
  }

  dispose() {
    cancelAnimationFrame(this.raf)
    clearTimeout(this.toastTimer)
    clearTimeout(this.clearTimer)
    this.input.dispose()
    for (const f of this.cleanup) f()
    this.audio.stopAllLoops()
    for (const v of this.views) v.dispose()
    this.stage.dispose()
    this.canvas.remove()
    this.listeners.clear()
    this.frameListeners.clear()
    if (this.debug) delete (window as unknown as Record<string, unknown>).__wakppu
  }

  // ---------- building a tower ----------

  private loadTower() {
    this.tower = getTower(this.state.towerId)
    this.layout = buildLayout(this.tower, this.state.difficulty)
    this.audio.stopAllLoops()
    this.effects.clear()
    for (const v of this.views) {
      this.stage.scene.remove(v.root)
      v.dispose()
    }
    this.platforms = []
    this.views = []
    this.occluders = [this.stage.pillar]
    this.ground = -1
    const ctx = { theme: this.tower.theme, effects: this.effects }
    for (const placed of this.layout.platforms) {
      const s = placed.skin
      const collider = makeCollider(placed.index, placed.x, placed.z, placed.yaw, s.hx, s.hz, placed.top, placed.top - s.topRest + s.botRest)
      this.platforms.push(createPlatformState(placed.index, s, collider))
      const view = createView(placed, ctx)
      this.stage.scene.add(view.root)
      this.views.push(view)
      this.occluders.push(...view.occluders)
    }
    this.stage.setTheme(this.tower.theme, this.layout.goalTop)
    this.world = { colliders: this.platforms.map((p) => p.collider), pillarTop: this.stage.pillarTop }
    this.resetRun()
    void this.audio.preload(cuesForTower(this.tower))
  }

  private resetRun() {
    this.leaveGround()
    for (const p of this.platforms) resetPlatform(p)
    this.platforms[this.layout.checkpoints[0]].active = true
    this.currentCp = 0
    this.steps = 0
    this.elapsed = 0
    this.cleared = false
    this.respawn()
  }

  // ---------- the frame loop ----------

  private frame(nowMs: number) {
    this.raf = requestAnimationFrame((t) => this.frame(t))
    const rawMs = nowMs - this.last
    this.last = nowMs
    if (this.paused) return
    const dt = Math.min(PHYSICS.maxDt, Math.max(0, rawMs / 1000))
    const time = nowMs / 1000
    // platform deadlines (regrow, collapse) run on play time, which stands still while paused
    this.clock += dt
    if (this.debug) this.measure(nowMs, rawMs)

    const onMenu = this.state.screen === 'menu'
    const playing = this.state.screen === 'playing'
    if (!onMenu) {
      const [mx, mz] = playing ? this.rig.moveDir(...this.input.axis()) : [0, 0]
      if (playing && !this.cleared) this.elapsed += dt
      const ev = stepPlayer(this.player, this.world, mx, mz, dt)
      for (const c of ev.groundChanges) this.onGround(c, this.clock)
      if (ev.jumped) {
        this.avatar.pop(1.18)
        this.audio.play('synth:jump')
      }
      if (ev.landingSpeed !== null) {
        this.avatar.pop(0.76)
        if (this.player.ground === FLOOR) this.audio.play('synth:thud')
      }
      if (this.player.y < PHYSICS.respawnBelow) this.respawn()
      this.keepStaySound(dt)
    }

    const viewY = onMenu ? MENU_VIEW_Y : this.player.y
    for (let i = 0; i < this.platforms.length; i++) {
      updatePlatform(this.platforms[i], dt, this.clock, this.emit)
      const view = this.views[i]
      view.root.visible = Math.abs(this.layout.platforms[i].top - viewY) < DRAW_RANGE
      if (view.root.visible) view.sync(this.platforms[i], time, dt)
    }
    this.effects.update(dt, time)
    const stand = this.ground >= 0 ? (this.views[this.ground].surface?.(this.platforms[this.ground]).stand ?? 0) : 0
    this.avatar.update(dt, time, this.player, stand, this.findBelow())
    if (this.state.screen === 'menu') this.rig.orbit(time, dt)
    else this.rig.follow(this.player.x, this.player.y, this.player.z, dt, time, this.occluders)
    this.stage.spinClouds(dt)
    this.stage.render()

    const hud: HudFrame = {
      height: Math.max(0, this.player.y), goalHeight: this.layout.goalTop, steps: this.steps, elapsed: this.elapsed,
      fps: this.perf.fps, worstMs: this.perf.worstMs,
    }
    for (const fn of this.frameListeners) fn(hud)
  }

  private onGround(c: Collider | null, now: number) {
    this.leaveGround()
    this.ground = c && c.id >= 0 ? c.id : -1
    this.stayTick = 0
    if (this.ground < 0) return
    if (this.skipStep) this.skipStep = false
    else if (this.state.screen === 'playing' && !this.cleared) this.steps++
    enterPlatform(this.platforms[this.ground], now, DIFFICULTY[this.state.difficulty].collapse, this.emit)
  }

  private leaveGround() {
    if (this.ground >= 0) leavePlatform(this.platforms[this.ground], this.emit)
    this.ground = -1
  }

  private readonly emit: Emit = (index, e) => {
    // nothing behind the start screen makes a sound (a cracked platform can still collapse there)
    if (this.state.screen === 'menu' && (e.type === 'cue' || e.type === 'loopStart')) return
    switch (e.type) {
      case 'cue': this.audio.play(e.cue); break
      case 'crack': this.views[index].crack?.(this.platforms[index]); break
      case 'collapse': this.views[index].collapse?.(this.platforms[index]); break
      case 'restore': this.views[index].restore?.(this.platforms[index]); break
      case 'loopStart': this.audio.startLoop(loopKey(index), e.cue); break
      case 'loopStop': this.audio.stopLoop(loopKey(index)); break
      case 'checkpoint': {
        const cp = this.layout.platforms[index].checkpoint
        if (cp !== undefined && cp > this.currentCp) this.currentCp = cp
        this.toast('체크포인트 저장')
        this.saveProgress()
        break
      }
      case 'goal': this.reachGoal(); break
    }
  }

  /** While standing on a stay platform: keep its loop running (it may have been cut by a hidden tab) and fire its ticks. */
  private keepStaySound(dt: number) {
    if (this.ground < 0 || this.state.screen !== 'playing') return
    const { cues } = this.platforms[this.ground].skin
    if (cues.loop && this.platforms[this.ground].skin.action === 'stay') this.audio.startLoop(loopKey(this.ground), cues.loop)
    if (!cues.tick || this.cleared) return
    this.stayTick -= dt
    while (this.stayTick <= 0) {
      this.stayTick += rand(cues.tick.every[0], cues.tick.every[1])
      this.audio.play(cues.tick.cue)
    }
  }

  /** The highest platform top right under the player, for the contact shadow. */
  private findBelow() {
    const { x, y, z } = this.player
    let top = -Infinity, lift = 0
    for (const p of this.platforms) {
      const c = p.collider
      if (c.off || c.top > y + 0.05 || c.top <= top) continue
      if (horizDist2(c, x, z) > 0.0001) continue
      top = c.top
      lift = this.views[p.index].surface?.(p).shadow ?? 0
    }
    if (top === -Infinity && Math.hypot(x, z) < TOWER.floorRadius && y >= -0.05) return { top: 0, lift: 0 }
    return top === -Infinity ? null : { top, lift }
  }

  private reachGoal() {
    if (this.cleared || this.state.screen !== 'playing') return
    this.cleared = true
    this.input.clear()
    this.audio.play('synth:fanfare')
    const { newBest, record } = this.save.recordClear(this.tower.id, this.state.difficulty, this.elapsed, this.steps)
    this.save.clearProgress(this.tower.id, this.state.difficulty)
    const clear = { time: this.elapsed, steps: this.steps, newBest, bestTime: record.bestTime }
    this.setState(this.saved())
    this.clearTimer = window.setTimeout(() => this.setState({ screen: 'cleared', clear }), CLEAR_DELAY_MS)
  }

  // ---------- input ----------

  private onKey(e: KeyboardEvent) {
    if (e.target instanceof HTMLInputElement) return
    const { screen } = this.state
    this.wake()
    if (screen === 'menu') {
      // a focused button handles Enter and Space on its own
      if ((e.code === 'Enter' || e.code === 'Space') && !(e.target instanceof HTMLButtonElement)) {
        e.preventDefault()
        this.start(this.state.progress[progressKey(this.tower.id, this.state.difficulty)] ? 'resume' : 'fresh')
      }
      return
    }
    if (e.code === 'Escape') {
      this.openMenu()
      return
    }
    if (screen === 'cleared') return
    if (GAME_KEYS.has(e.code)) e.preventDefault()
    if (e.repeat) return
    this.input.hold(e.code)
    if (e.code === 'Space') requestJump(this.player)
    else if (e.code === 'KeyR') this.respawn()
    else if (e.code === 'KeyM') this.toggleMute()
  }

  // ---------- state and saving ----------

  private setState(patch: Partial<UiState>) {
    this.state = { ...this.state, ...patch }
    for (const fn of this.listeners) fn()
  }

  private savePrefs() {
    const { towerId: tower, characterId: character, difficulty, volume, muted } = this.state
    this.save.savePrefs({ tower, character, difficulty, volume, muted })
  }

  private saveProgress() {
    if (this.state.screen === 'menu' || this.cleared || this.steps === 0) return
    this.save.saveProgress(this.tower.id, this.state.difficulty, {
      checkpoint: this.currentCp, elapsed: this.elapsed, steps: this.steps, savedAt: Date.now(),
    })
    this.setState(this.saved())
  }

  private saved(): Pick<UiState, 'progress' | 'records'> {
    const progress: UiState['progress'] = {}, records: UiState['records'] = {}
    for (const t of TOWERS) {
      for (const d of DIFFICULTIES) {
        const k = progressKey(t.id, d)
        // a save from before a tower changed can point at a checkpoint that is gone: forget it
        const raw = this.save.loadProgress(t.id, d)
        const usable = sanitizeProgress(raw, this.checkpointCount(t, d))
        if (raw && !usable) this.save.clearProgress(t.id, d)
        progress[k] = usable ?? undefined
        records[k] = this.save.loadRecord(t.id, d) ?? undefined
      }
    }
    return { progress, records }
  }

  private checkpointCount(t: TowerDef, d: DifficultyKey) {
    const k = progressKey(t.id, d)
    let n = this.checkpointCounts.get(k)
    if (n === undefined) {
      n = buildLayout(t, d).checkpoints.length
      this.checkpointCounts.set(k, n)
    }
    return n
  }

  /** Paused while any reason holds: a hidden tab, or another app in front of the window. */
  private setPaused(reason: 'hidden' | 'blur', on: boolean) {
    const was = this.pauseReasons.size > 0
    if (on) this.pauseReasons.add(reason)
    else this.pauseReasons.delete(reason)
    const now = this.pauseReasons.size > 0
    if (now === was) return
    this.paused = now
    if (now) {
      this.input.clear()
      this.saveProgress()
      this.audio.suspend()
    } else {
      this.last = performance.now()
      this.audio.resume()
    }
  }

  private toast(text: string) {
    clearTimeout(this.toastTimer)
    this.setState({ toast: { text, id: ++this.toastId } })
    this.toastTimer = window.setTimeout(() => this.setState({ toast: null }), TOAST_MS)
  }

  // ---------- debug (?debug) ----------

  private measure(nowMs: number, rawMs: number) {
    const p = this.perf
    p.frames++
    if (nowMs - p.since >= 1000) {
      p.fps = Math.round((p.frames * 1000) / (nowMs - p.since))
      p.frames = 0
      p.since = nowMs
    }
    p.worst = Math.max(p.worst, rawMs)
    if (rawMs > 50 && this.state.screen === 'playing') p.slow++
    if (nowMs - p.worstSince >= 5000) {
      p.worstMs = Math.round(p.worst)
      p.worst = 0
      p.worstSince = nowMs
    }
  }

  private exposeDebug() {
    const info = () => ({
      screen: this.state.screen, tower: this.tower.id, difficulty: this.state.difficulty,
      elapsed: this.elapsed, steps: this.steps, currentCp: this.currentCp, cleared: this.cleared, paused: this.paused,
      player: { x: this.player.x, y: this.player.y, z: this.player.z, grounded: this.player.grounded },
      camera: { yaw: this.rig.yaw, dist: this.rig.dist, fov: this.stage.camera.fov },
      ground: this.ground, groundSkin: this.ground >= 0 ? this.layout.platforms[this.ground].skinId : null,
      loops: this.audio.loopCount, audio: this.audio.state, soundFiles: this.audio.files,
      platforms: this.layout.platforms.length, checkpoints: this.layout.checkpoints, goal: this.layout.goal,
      fps: this.perf.fps, worstMs: this.perf.worstMs, slowFrames: this.perf.slow,
      renderer: { calls: this.stage.renderer.info.render.calls, triangles: this.stage.renderer.info.render.triangles },
    })
    const teleport = (index: number) => {
      const p = this.layout.platforms[index]
      if (!p) return false
      this.leaveGround()
      resetPlayer(this.player, p.x, p.top + 0.05, p.z)
      return true
    }
    ;(window as unknown as Record<string, unknown>).__wakppu = { game: this, info, teleport, layout: () => this.layout }
  }
}

const loopKey = (index: number) => `platform:${index}`
