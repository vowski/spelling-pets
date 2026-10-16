import { shuffle, type Rng } from '../../engine/rng'

export function scramble(text: string, rng: Rng): string[] {
  const letters = [...text]
  if (letters.length < 2 || new Set(letters).size < 2) return letters
  let out = shuffle(letters, rng)
  if (out.join('') === text) out = [...out.slice(1), out[0]]
  return out
}
