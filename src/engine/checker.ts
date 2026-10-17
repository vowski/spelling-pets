import { alignSequences, diffLetters, type LetterOp } from './diff'

export function normalise(s: string): string {
  return s.replace(/[‘’ʼ`´]/g, "'").replace(/\s+/g, ' ').trim()
}

export interface WordCheck {
  correct: boolean
  capitalOnly: boolean
  typed: string
  ops: LetterOp[]
}

export function checkWord(word: { text: string; caseSensitive: boolean }, rawTyped: string): WordCheck {
  const target = normalise(word.text)
  // A habit from Story Time: one full stop, ! or ? after a single word isn't a spelling mistake.
  const typed = /[.!?]$/.test(target) ? normalise(rawTyped) : normalise(rawTyped).replace(/(?<=\S)[.!?]$/, '')
  const sameIgnoringCase = typed.toLowerCase() === target.toLowerCase() && typed.length > 0
  const capsLock = typed === target.toUpperCase() && typed.length > 0
  const correct = typed === target || (sameIgnoringCase && (!word.caseSensitive || capsLock))
  return {
    correct,
    capitalOnly: !correct && sameIgnoringCase,
    typed,
    ops: diffLetters(target, typed, { foldCase: !word.caseSensitive }),
  }
}

export interface SentenceWordResult {
  expected: string
  typed: string | null
  correct: boolean
}

export interface SentenceCheck {
  words: SentenceWordResult[]
  startsWithCapital: boolean
  endsWithPunctuation: boolean
  wordAccuracy: number
  allCorrect: boolean
}

function tokens(s: string): string[] {
  return normalise(s)
    .split(' ')
    .map(t => t.replace(/^[^A-Za-z0-9']+|[^A-Za-z0-9']+$/g, ''))
    .filter(Boolean)
}

export function checkSentence(expected: string, rawTyped: string, isCaseSensitive: (token: string) => boolean): SentenceCheck {
  const exp = tokens(expected)
  const got = tokens(rawTyped)
  const lower = (x: string) => x.toLowerCase()
  const steps = alignSequences(exp, got, (x, y) => lower(x) === lower(y))
  const words: SentenceWordResult[] = []
  for (const s of steps) {
    if (s.a === null) continue // extra typed word: ignored for scoring
    const e = exp[s.a]
    const t = s.b === null ? null : got[s.b]
    const ok = t !== null && (isCaseSensitive(e) ? t === e || t === e.toUpperCase() : lower(t) === lower(e))
    words.push({ expected: e, typed: t, correct: ok })
  }
  const typedNorm = normalise(rawTyped)
  const expNorm = normalise(expected)
  const endMark = /[.?!]$/.test(expNorm) ? expNorm.slice(-1) : null
  const startsWithCapital = /^[A-Z]/.test(typedNorm)
  const endsWithPunctuation = endMark === null || typedNorm.endsWith(endMark)
  const right = words.filter(x => x.correct).length
  const wordAccuracy = exp.length ? right / exp.length : 1
  return {
    words,
    startsWithCapital,
    endsWithPunctuation,
    wordAccuracy,
    allCorrect: right === exp.length && startsWithCapital && endsWithPunctuation,
  }
}
