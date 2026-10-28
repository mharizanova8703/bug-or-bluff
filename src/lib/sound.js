// Tiny WebAudio synth: no audio files to load, and nothing plays while muted.
import { muted } from './prefs'

let ctx = null
function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    ctx = new AC()
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  return ctx
}

function tone(freq, start, dur, { type = 'sine', gain = 0.12, slideTo } = {}) {
  const c = audio()
  if (!c) return
  const t0 = c.currentTime + start
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t0)
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur)
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.02)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  osc.connect(g).connect(c.destination)
  osc.start(t0)
  osc.stop(t0 + dur + 0.05)
}

const sounds = {
  join: () => {
    tone(520, 0, 0.12, { type: 'triangle' })
    tone(780, 0.1, 0.16, { type: 'triangle' })
  },
  start: () => [262, 330, 392, 523].forEach((f, i) => tone(f, i * 0.09, 0.2, { type: 'square', gain: 0.07 })),
  lock: () => tone(660, 0, 0.12, { type: 'triangle' }),
  tick: () => tone(880, 0, 0.07, { type: 'square', gain: 0.05 }),
  correct: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.08, 0.18, { type: 'triangle' })),
  wrong: () => tone(330, 0, 0.5, { type: 'sawtooth', gain: 0.08, slideTo: 90 }),
  reveal: () => tone(300, 0, 0.35, { type: 'sine', slideTo: 600 }),
  win: () =>
    [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.12, 0.25, { type: 'triangle', gain: 0.1 })),
  pop: () => tone(700, 0, 0.08, { type: 'sine', slideTo: 1200, gain: 0.06 })
}

export function play(name) {
  if (muted.value) return
  try {
    sounds[name]?.()
  } catch {
    /* audio is a nicety; never break the game */
  }
}

// Browsers only allow audio after a gesture: prime the context on first touch.
export function primeAudio() {
  if (!muted.value) audio()
}
