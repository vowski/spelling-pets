import { diffLetters } from '../diff'

/** One run of letters she got wrong: what the word has there ('' when she added letters) and what she wrote ('' when she missed them out). */
export interface LetterChunk { has: string; wrote: string }

/** Every run of wrong letters in her attempt, lowercase, ignoring capitals. */
export function letterChunks(expected: string, typed: string): LetterChunk[] {
  // A part-typed word ("be" for "because") misses out the end; the alignment alone would match her "e" to the last "e".
  const [e, t] = [expected.toLowerCase(), typed.toLowerCase()]
  if (t && t.length < e.length && e.startsWith(t)) return [{ has: e.slice(t.length), wrote: '' }]
  const out: LetterChunk[] = []
  let run: LetterChunk | null = null
  for (const op of diffLetters(expected, typed, { foldCase: true })) {
    if (op.kind === 'match') {
      if (run) out.push(run)
      run = null
      continue
    }
    run ??= { has: '', wrote: '' }
    if (op.kind !== 'extra') run.has += op.expected.toLowerCase()
    if (op.kind !== 'missing') run.wrote += op.typed.toLowerCase()
  }
  if (run) out.push(run)
  return out
}
