// Synthesized sounds, ported from the prototype. They stand in for a recording that
// is still loading or failed, and voice the small effects (jump, landing, checkpoint, clear).

import { rand } from '../util.ts'
import type { SynthId } from './cues.ts'

export interface Synth {
  play(id: SynthId): void
  /** starts a continuous sound and returns its stop function */
  loop(id: SynthId): () => void
}

interface Mode { f: number; a: number; tau: number }
interface HitEvent { t0: number; click: number; clickTau: number; modes: Mode[] }
type KeyBank = Record<'thock' | 'thockUp' | 'clicky' | 'clickyUp', AudioBuffer[]>

/** A short stereo noise tail, so dry hits sound recorded rather than electronic. */
export function makeRoom(ctx: BaseAudioContext, len: number, tau: number) {
  const sr = ctx.sampleRate, n = Math.floor(sr * len), buf = ctx.createBuffer(2, n, sr)
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c)
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / sr / tau)
  }
  return buf
}

export function createSynth(ctx: AudioContext, out: AudioNode): Synth {
  const len = ctx.sampleRate * 2
  const noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate)
  const nd = noiseBuf.getChannelData(0)
  for (let i = 0; i < len; i++) nd[i] = Math.random() * 2 - 1
  const now = () => ctx.currentTime + 0.004

  function env(g: GainNode, t: number, peak: number, attack: number, decay: number) {
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(peak, t + attack)
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay)
  }

  function noise(t: number, decay: number, o: { type?: BiquadFilterType; freq?: number; Q?: number; gain?: number; attack?: number; sweepTo?: number; pan?: number } = {}) {
    const { type = 'bandpass', freq = 2000, Q = 1, gain = 0.3, attack = 0.001, sweepTo = 0, pan = 0 } = o
    const src = ctx.createBufferSource(); src.buffer = noiseBuf
    const f = ctx.createBiquadFilter(); f.type = type; f.Q.value = Q
    f.frequency.setValueAtTime(freq, t)
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + attack + decay)
    const g = ctx.createGain(); env(g, t, gain, attack, decay)
    src.connect(f); f.connect(g)
    if (pan) {
      const sp = ctx.createStereoPanner(); sp.pan.value = pan
      g.connect(sp); sp.connect(out)
    } else g.connect(out)
    src.start(t, rand(0, 1.6)); src.stop(t + attack + decay + 0.03)
  }

  function tone(t: number, decay: number, o: { type?: OscillatorType; from?: number; to?: number; sweep?: number; gain?: number; attack?: number } = {}) {
    const { type = 'sine', from = 440, to = 0, sweep = 0, gain = 0.3, attack = 0.002 } = o
    const osc = ctx.createOscillator(); osc.type = type
    osc.frequency.setValueAtTime(from, t)
    if (to) osc.frequency.exponentialRampToValueAtTime(to, t + (sweep || decay))
    const g = ctx.createGain(); env(g, t, gain, attack, decay)
    osc.connect(g); g.connect(out)
    osc.start(t); osc.stop(t + attack + decay + 0.03)
  }

  // Keystrokes are rendered once into buffers: a contact click plus a few short
  // plastic resonances that ring and die without any pitch glide.
  function renderHit(events: HitEvent[], seconds: number) {
    const sr = ctx.sampleRate, n = Math.floor(sr * seconds)
    const buf = ctx.createBuffer(1, n, sr), d = buf.getChannelData(0)
    for (const ev of events) {
      const i0 = Math.floor(ev.t0 * sr)
      for (const m of ev.modes) {
        const w = 2 * Math.PI * m.f
        for (let i = i0; i < n; i++) { const t = (i - i0) / sr; d[i] += m.a * Math.exp(-t / m.tau) * Math.sin(w * t) }
      }
      const end = Math.min(n, i0 + Math.ceil(sr * ev.clickTau * 8))
      let prev = 0
      for (let i = i0; i < end; i++) {
        const t = (i - i0) / sr, wn = Math.random() * 2 - 1
        d[i] += ev.click * (wn - prev) * Math.exp(-t / ev.clickTau)
        prev = wn
      }
    }
    let peak = 0
    for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(d[i]))
    const g = 0.9 / (peak || 1), fade = Math.floor(sr * 0.004)
    for (let i = 0; i < n; i++) d[i] *= g * (i > n - fade ? (n - i) / fade : 1)
    return buf
  }

  const set = (make: (k: number) => AudioBuffer) => Array.from({ length: 6 }, () => make(rand(0.93, 1.07)))
  const keyBank: KeyBank = {
    // deep, muted bottom-out ("도각")
    thock: set((k) => renderHit([{ t0: 0, click: 0.5, clickTau: 0.0006, modes: [
      { f: 340 * k, a: 0.55, tau: 0.016 }, { f: 615 * k, a: 0.35, tau: 0.011 }, { f: 1180 * k, a: 0.3, tau: 0.007 },
      { f: 2250 * k, a: 0.2, tau: 0.004 }, { f: 3600 * k, a: 0.1, tau: 0.0025 }] }], 0.12)),
    thockUp: set((k) => renderHit([{ t0: 0, click: 0.35, clickTau: 0.0004, modes: [
      { f: 880 * k, a: 0.25, tau: 0.006 }, { f: 2050 * k, a: 0.22, tau: 0.004 }, { f: 3900 * k, a: 0.1, tau: 0.002 }] }], 0.06)),
    // click jacket snaps first, the keycap bottoms out a few ms later ("찰칵")
    clicky: set((k) => renderHit([
      { t0: 0, click: 0.6, clickTau: 0.0004, modes: [{ f: 4300 * k, a: 0.45, tau: 0.0018 }, { f: 6900 * k, a: 0.25, tau: 0.0012 }] },
      { t0: 0.009 * k, click: 0.4, clickTau: 0.0006, modes: [
        { f: 760 * k, a: 0.25, tau: 0.009 }, { f: 1650 * k, a: 0.4, tau: 0.006 }, { f: 2900 * k, a: 0.3, tau: 0.004 }] },
    ], 0.1)),
    clickyUp: set((k) => renderHit([
      { t0: 0, click: 0.5, clickTau: 0.0004, modes: [{ f: 4700 * k, a: 0.4, tau: 0.0015 }, { f: 7400 * k, a: 0.2, tau: 0.001 }] },
      { t0: 0.006, click: 0.2, clickTau: 0.0004, modes: [{ f: 2300 * k, a: 0.2, tau: 0.003 }] },
    ], 0.05)),
  }

  function playHit(name: keyof KeyBank, gain: number, delay: number, rate: number) {
    const list = keyBank[name], src = ctx.createBufferSource()
    src.buffer = list[Math.floor(Math.random() * list.length)]
    src.playbackRate.value = rate * rand(0.97, 1.03)
    const g = ctx.createGain(); g.gain.value = gain
    const sp = ctx.createStereoPanner(); sp.pan.value = rand(-0.2, 0.2)
    src.connect(g); g.connect(sp); sp.connect(out)
    src.start(now() + delay)
  }

  const squish = () => {
    const t = now(), p = rand(0.9, 1.1)
    noise(t, 0.2, { type: 'lowpass', freq: 1500 * p, sweepTo: 320, Q: 5, gain: 0.3, attack: 0.018 })
    tone(t, 0.15, { from: 210 * p, to: 115, gain: 0.12, attack: 0.01 })
  }

  const play: Record<SynthId, () => void> = {
    thock: () => playHit('thock', 0.7, 0, 0.94),
    thockUp: () => playHit('thockUp', 0.32, 0.06, 0.94),
    clicky: () => playHit('clicky', 0.7, 0, 1.04),
    clickyUp: () => playHit('clickyUp', 0.32, 0.05, 1.04),
    crunch: () => {
      // a snap and crackles running across both ears
      const t = now(), n = 16 + Math.floor(rand(0, 8)), span = rand(0.22, 0.34)
      noise(t, 0.008, { type: 'highpass', freq: 2200, Q: 0.8, gain: 0.45 })
      tone(t, 0.09, { from: 140, to: 70, gain: 0.22 })
      noise(t, 0.2, { type: 'highpass', freq: 2600, Q: 0.7, gain: 0.05 })
      for (let i = 0; i < n; i++) {
        const k = i / n
        noise(t + 0.01 + Math.pow(k, 1.4) * span + rand(0, 0.01), rand(0.004, 0.014),
          { freq: rand(1600, 7000), Q: rand(1.5, 4), gain: rand(0.12, 0.42) * (1 - k * 0.5), pan: rand(-0.6, 0.6) })
      }
    },
    crumble: squish,
    squish,
    blub: () => tone(now(), 0.09, { from: rand(230, 320), to: rand(720, 980), sweep: 0.06, gain: 0.24 }),
    fizzTick: () => tone(now() + rand(0, 0.02), rand(0.018, 0.035), { from: rand(1500, 2700), to: rand(3000, 4600), sweep: 0.015, gain: rand(0.02, 0.055) }),
    fizzBed: () => { /* continuous only, see loop() */ },
    chime: () => {
      const t = now()
      tone(t, 1.1, { from: 1318.5, gain: 0.16, attack: 0.004 })
      tone(t + 0.09, 1.3, { from: 1975.5, gain: 0.12, attack: 0.004 })
      tone(t, 0.5, { type: 'triangle', from: 659.3, gain: 0.05 })
    },
    jump: () => tone(now(), 0.07, { from: 300, to: 520, gain: 0.04 }),
    thud: () => {
      const t = now()
      tone(t, 0.1, { from: 140, to: 70, gain: 0.14 })
      noise(t, 0.05, { type: 'lowpass', freq: 600, gain: 0.08 })
    },
    fanfare: () => {
      const t = now()
      ;[523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(t + i * 0.12, 0.6, { type: 'triangle', from: f, gain: 0.16, attack: 0.01 }))
      tone(t + 0.5, 1.4, { from: 1318.5, gain: 0.08, attack: 0.01 })
    },
  }

  function fizzLoop() {
    // high-passed noise bed, the prototype's soda fizz
    const bed = ctx.createBufferSource(); bed.buffer = noiseBuf; bed.loop = true
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 5200
    const g = ctx.createGain(); g.gain.value = 0
    bed.connect(hp); hp.connect(g); g.connect(out)
    bed.start()
    g.gain.setTargetAtTime(0.045, ctx.currentTime, 0.08)
    return () => {
      const t = ctx.currentTime
      g.gain.cancelScheduledValues(t)
      g.gain.setValueAtTime(g.gain.value, t)
      g.gain.setTargetAtTime(0, t, 0.15)
      bed.stop(t + 1)
    }
  }

  return {
    play: (id) => play[id](),
    loop: () => fizzLoop(),
  }
}
