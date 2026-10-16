export interface Sfx { correct(): void; gentle(): void; pop(): void; coin(): void; fanfare(): void; setEnabled(on: boolean): void; startMusic(): void; stopMusic(): void }

export function createSfx(enabled = true): Sfx {
  let on = enabled
  let ctx: AudioContext | null = null
  const audio = (): AudioContext | null => {
    if (!on || typeof AudioContext === 'undefined') return null
    ctx ??= new AudioContext()
    return ctx
  }
  const tone = (freq: number, start: number, dur: number, type: OscillatorType = 'sine', level = 0.15) => {
    const c = audio()
    if (!c) return
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.type = type
    osc.frequency.value = freq
    gain.gain.setValueAtTime(level, c.currentTime + start)
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + start + dur)
    osc.connect(gain).connect(c.destination)
    osc.start(c.currentTime + start)
    osc.stop(c.currentTime + start + dur)
  }
  let music: ReturnType<typeof setInterval> | undefined
  const NOTES = [523, 587, 659, 784, 880]
  return {
    correct: () => { tone(660, 0, 0.12); tone(880, 0.1, 0.2) },
    gentle: () => tone(440, 0, 0.25, 'triangle', 0.08),
    pop: () => tone(520 + Math.random() * 200, 0, 0.08, 'square', 0.05),
    coin: () => { tone(988, 0, 0.08); tone(1319, 0.07, 0.16) },
    fanfare: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.28, 'triangle', 0.12)),
    setEnabled: v => { on = v },
    startMusic: () => {
      if (music) return
      music = setInterval(() => tone(NOTES[Math.floor(Math.random() * NOTES.length)], 0, 1.2, 'sine', 0.03), 2400)
    },
    stopMusic: () => { clearInterval(music); music = undefined },
  }
}
