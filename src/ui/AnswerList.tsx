import type { Word } from '../content/types'
import { checkWord } from '../engine/checker'
import { LetterDiff } from './LetterDiff'

export interface Answer { word: Word; typed: string; correct: boolean }

/** Her answers next to the right spellings, in the app's errorless style: a tick when right, the letter diff when not. */
export function AnswerList({ answers }: { answers: readonly Answer[] }) {
  return (
    <ul aria-label="Your answers" className="hunt-answers">
      {answers.map((a, k) => (
        <li key={`${a.word.id}-${k}`}>
          {a.correct
            ? <span className="hunt-right">✓ {a.word.text}</span>
            : <LetterDiff ops={checkWord(a.word, a.typed).ops} />}
        </li>
      ))}
    </ul>
  )
}
