// Web Audio playback: a gentle master chain, recorded slices per cue, continuous
// sounds for stay platforms, and a synthesized stand-in wherever a file is missing.

import type { CueId } from '../types.ts'
import { CUES, pickVariant, resolveCue, type CueDef } from './cues.ts'
import { LoopSet } from './loops.ts'
import { createSynth, makeRoom, type Synth } from './synth.ts'

// keeps sharp transients from stabbing the ears (design doc 9.1)
const COMPRESSOR = { threshold: -20, knee: 10, ratio: 8, attack: 0.002, release: 0.12 }
const ROOM = { seconds: 0.35, tau: 0.06, gain: 0.12 }
const LOOP_FADE_IN = 0.08
const LOOP_FADE_OUT = 0.15

export class AudioEngine {
  private readonly baseUrl: string
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private synth: Synth | null = null
  private readonly fetched = new Map<string, Promise<ArrayBuffer | null>>()
  private readonly loaded = new Map<string, AudioBuffer | null>()
  private readonly decoding = new Set<string>()
  private readonly lastSlice = new Map<CueId, number>()
  private readonly loops = new LoopSet<() => void>()
  private volume = 0.7
  private muted = false

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  /** Call from a user gesture (click or key press); browsers keep audio off until then. */
  unlock() {
    if (!this.ctx) {
      try {
        const ctx = new AudioContext()
        const comp = ctx.createDynamicsCompressor()
        comp.threshold.value = COMPRESSOR.threshold; comp.knee.value = COMPRESSOR.knee; comp.ratio.value = COMPRESSOR.ratio
        comp.attack.value = COMPRESSOR.attack; comp.release.value = COMPRESSOR.release
        const master = ctx.createGain()
        master.gain.value = this.muted ? 0 : this.volume
        master.connect(comp); comp.connect(ctx.destination)
        const room = ctx.createConvolver(), roomGain = ctx.createGain()
        room.buffer = makeRoom(ctx, ROOM.seconds, ROOM.tau); roomGain.gain.value = ROOM.gain
        master.connect(room); room.connect(roomGain); roomGain.connect(comp)
        this.ctx = ctx
        this.master = master
        this.synth = createSynth(ctx, master)
        for (const file of this.fetched.keys()) void this.decode(file)
      } catch {
        this.ctx = null
        return
      }
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => { /* retried on the next gesture */ })
  }

  get state(): AudioContextState | 'none' {
    return this.ctx?.state ?? 'none'
  }

  get loopCount() {
    return this.loops.size
  }

  /** decoded files and files that failed to load or decode, for the debug view */
  get files() {
    let ok = 0, failed = 0
    for (const b of this.loaded.values()) { if (b) ok++; else failed++ }
    return { ok, failed }
  }

  setVolume(v: number) {
    this.volume = v
    this.applyGain()
  }

  setMuted(m: boolean) {
    this.muted = m
    this.applyGain()
  }

  /** Fetches (and once audio is unlocked, decodes) every file the cues use. */
  async preload(cues: CueId[]) {
    const files = new Set(cues.flatMap((c) => CUES[c]?.files ?? []))
    await Promise.all([...files].map((f) => this.decode(f)))
  }

  play(cue: CueId) {
    if (!this.running()) return
    const def = CUES[cue]
    if (!def) return
    const r = resolveCue(def, this.loaded)
    try {
      if (r.kind === 'buffers') this.playSlice(cue, def, r.buffers)
      else if (r.kind === 'synth') this.synth?.play(r.id)
    } catch { /* a dropped sound is fine */ }
  }

  /** Idempotent: a loop already running under this key keeps playing. */
  startLoop(key: string, cue: CueId) {
    if (this.loops.has(key) || !this.running()) return
    const def = CUES[cue]
    if (!def) return
    const r = resolveCue(def, this.loaded)
    if (r.kind === 'none') return
    this.loops.start(
      key,
      () => (r.kind === 'buffers' ? this.loopBuffer(r.buffers[0], def.gain) : this.synth!.loop(r.id)),
      (stop) => stop(),
    )
  }

  stopLoop(key: string) {
    this.loops.stop(key)
  }

  stopAllLoops() {
    this.loops.stopAll()
  }

  suspend() {
    this.stopAllLoops()
    if (this.ctx?.state === 'running') this.ctx.suspend().catch(() => { /* already closing */ })
  }

  resume() {
    if (this.ctx?.state === 'suspended') this.ctx.resume().catch(() => { /* retried on the next gesture */ })
  }

  private running() {
    return !!this.ctx && !!this.master && this.ctx.state === 'running'
  }

  private applyGain() {
    if (this.ctx && this.master) this.master.gain.setTargetAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime, 0.03)
  }

  private fetchBytes(file: string) {
    let p = this.fetched.get(file)
    if (!p) {
      p = fetch(this.baseUrl + file).then((r) => (r.ok ? r.arrayBuffer() : null)).catch(() => null)
      this.fetched.set(file, p)
    }
    return p
  }

  private async decode(file: string) {
    const bytes = this.fetchBytes(file)
    const ctx = this.ctx
    if (!ctx || this.loaded.has(file) || this.decoding.has(file)) {
      await bytes
      return
    }
    this.decoding.add(file)
    const b = await bytes
    try {
      this.loaded.set(file, b ? await ctx.decodeAudioData(b.slice(0)) : null)
    } catch {
      this.loaded.set(file, null)
    }
    this.decoding.delete(file)
  }

  private playSlice(cue: CueId, def: CueDef, buffers: AudioBuffer[]) {
    const ctx = this.ctx!, master = this.master!
    const i = pickVariant(buffers.length, this.lastSlice.get(cue) ?? -1)
    this.lastSlice.set(cue, i)
    const src = ctx.createBufferSource()
    src.buffer = buffers[i]
    const [lo, hi] = def.rate ?? [1, 1]
    src.playbackRate.value = lo + Math.random() * (hi - lo)
    const g = ctx.createGain()
    g.gain.value = def.gain
    src.connect(g)
    if (def.pan) {
      const sp = ctx.createStereoPanner()
      sp.pan.value = (Math.random() * 2 - 1) * def.pan
      g.connect(sp); sp.connect(master)
    } else g.connect(master)
    src.start(ctx.currentTime + 0.004 + (def.delay ?? 0))
  }

  private loopBuffer(buf: AudioBuffer, gain: number) {
    const ctx = this.ctx!, master = this.master!
    const src = ctx.createBufferSource()
    src.buffer = buf
    src.loop = true
    const g = ctx.createGain()
    g.gain.value = 0
    src.connect(g); g.connect(master)
    src.start(ctx.currentTime, Math.random() * buf.duration)
    g.gain.setTargetAtTime(gain, ctx.currentTime, LOOP_FADE_IN)
    return () => {
      const t = ctx.currentTime
      g.gain.cancelScheduledValues(t)
      g.gain.setValueAtTime(g.gain.value, t)
      g.gain.setTargetAtTime(0, t, LOOP_FADE_OUT)
      src.stop(t + LOOP_FADE_OUT * 6)
    }
  }
}
