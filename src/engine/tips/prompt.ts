import type { Mistake, MistakeType } from './classify'
import type { LetterChunk } from './letters'

export interface ChatMessage { role: 'system' | 'user' | 'assistant'; content: string }

/** Bump whenever the prompt changes: it is part of the tip cache key, so old tips are regenerated. */
export const TIP_PROMPT_VERSION = 4

/**
 * The model writes the feedback itself, about what she actually wrote. It gets notes, never a finished tip: the correct
 * word, the kind of mistake, what she did (worked out exactly from her letters) and the rule's facts. Laptop test of
 * 2026-10-26: one worked example of the same kind of mistake took Gemma 3 1B from 47 to 5 wrong tips out of 78.
 */
export const FEEDBACK_SYSTEM = [
  'You help a 7-year-old child in England learn from a spelling mistake.',
  'Using only the notes, write one or two short sentences of feedback to her: say what she did, then explain the correct spelling, so she understands why.',
  'She got it wrong, so never tell her that what she wrote was right or correct.',
  'Speak to her as "you". Use British English, such as spelt rather than spelled. Never write her misspelling.',
  'Do not add any fact, rule, letter, sound or example that is not in the notes, and copy every word in quotation marks exactly.',
  'Do not praise her and never say "I". Keep it under 25 words.',
  'Reply with the feedback only, with no lists, headings or line breaks. Follow the example closely.',
].join(' ')

const KIND: Record<MistakeType, string> = {
  homophone: 'a sound-alike word', capital: 'a missing capital letter', apostrophe: 'a missing apostrophe',
  doubling: 'doubling the last letter before an ending', dropE: 'dropping the "e" before an ending',
  yToI: 'changing "y" to "i" before an ending', ending: 'the spelling of a word ending', tricky: 'a tricky part of the word',
  letters: 'some wrong letters',
}

const describeLetters = (chunks: LetterChunk[]) =>
  chunks.map(c => (!c.wrote ? `She missed out "${c.has}".` : !c.has ? `She added "${c.wrote}".` : `She wrote "${c.wrote}" where the word has "${c.has}".`)).join(' ')

/** What she did, as the app knows it for certain: from how the mistake was classified, or from her actual letters. */
function whatSheDid(m: Mistake): string {
  if (m.letters?.length) return describeLetters(m.letters)
  const q = m.quotable
  if (m.type === 'ending') {
    // An ending she didn't spell the way it sounds ("stasion") carries her letters, handled above.
    return q[2] && m.attempt.toLowerCase().endsWith(q[2]) ? 'She spelt the end of the word the way it sounds.' : 'She spelt the end of the word wrongly.'
  }
  switch (m.type) {
    case 'homophone': return `She wrote "${m.attempt.toLowerCase()}", a real word that sounds the same but means something else.`
    case 'capital': return m.target === 'I' ? 'She wrote a small "i".' : 'She started it with a small letter.'
    case 'apostrophe': return 'She left out the apostrophe.'
    case 'doubling': return `She wrote only one "${q[1]}" before "${q[2]}".`
    case 'dropE': return `She kept the "e" before "${q[2]}".`
    case 'yToI': return `She kept the "y" before "${q[1]}".`
    default: return 'She got the tricky part of the word wrong.'
  }
}

function notes(target: string, kind: MistakeType, did: string, facts: string[]): string {
  return [
    `The correct word: "${target}"`, `Kind of mistake: ${KIND[kind]}`, `What she did: ${did}`,
    ...(facts.length ? ['Facts to use:', ...facts.map(f => `- ${f}`)] : []), 'Write your feedback to her.',
  ].join('\n')
}

/** The notes for one mistake. A letters mistake's facts are her letters; a memory trick stays out (tipFromReply adds it). */
export function feedbackNotes(m: Mistake): string {
  const facts = m.type === 'homophone' ? m.facts : m.type === 'letters' ? [] : [m.reword]
  return notes(m.target, m.type, whatSheDid(m), facts)
}

/** One worked example per kind of mistake, with words that are not in her word bank (so none can leak into her tips). */
export const FEEDBACK_EXAMPLES: Record<MistakeType, [notes: string, answer: string]> = {
  homophone: [notes('flower', 'homophone', 'She wrote "flour", a real word that sounds the same but means something else.', ['"flour" means powder for baking', '"flower" means the colourful part of a plant']),
    'You wrote "flour", which is powder for baking. This word is "flower", the colourful part of a plant.'],
  capital: [notes('Scotland', 'capital', 'She started it with a small letter.', ['Names start with a capital letter: "Scotland".']),
    'You started with a small letter, but "Scotland" is a name, and names start with a capital letter.'],
  apostrophe: [notes("wasn't", 'apostrophe', 'She left out the apostrophe.', ['"wasn\'t" is short for "was not". The apostrophe shows where letters are missing.']),
    'You left out the apostrophe. "wasn\'t" is short for "was not", and the apostrophe shows where letters are missing.'],
  doubling: [notes('skipping', 'doubling', 'She wrote only one "p" before "ing".', ['"skip" has a short sound and ends in one consonant, so double the "p" before "ing": "skipping".']),
    'You wrote only one "p", but "skip" has a short sound and ends in one consonant, so you double the "p" before "ing": "skipping".'],
  dropE: [notes('smiling', 'dropE', 'She kept the "e" before "ing".', ['"smile" ends in "e", so drop the "e" before "ing": "smiling".']),
    'You kept the "e", but "smile" ends in "e", so you drop the "e" before "ing": "smiling".'],
  yToI: [notes('spies', 'yToI', 'She kept the "y" before "es".', ['When "spy" gets "es", the "y" changes to "i": "spies".']),
    'You kept the "y", but when "spy" gets "es", the "y" changes to "i": "spies".'],
  ending: [notes('potion', 'ending', 'She spelt the end of the word the way it sounds.', ['The "shun" sound at the end of "potion" is spelt "tion".']),
    'You spelt the end the way it sounds, but the "shun" sound at the end of "potion" is spelt "tion".'],
  tricky: [notes('yoghurt', 'tricky', 'She missed out "h".', ['The tricky bit in "yoghurt" is "gh".']),
    'You missed out the "h". The tricky bit in "yoghurt" is "gh", so look carefully at that part.'],
  letters: [notes('basket', 'letters', 'She wrote "i" where the word has "e".', []),
    'You wrote "i", but "basket" has an "e" there.'],
}

/** The worked examples' own words: a reply that uses one (other than her word) has copied the example ("just like basket"). */
export const FEEDBACK_EXAMPLE_WORDS = ['flower', 'flour', 'scotland', "wasn't", 'skip', 'skipping', 'smile', 'smiling', 'spy', 'spies', 'potion', 'yoghurt', 'basket']

/** The model's whole prompt for one mistake: the rules, a worked example of the same kind, then her notes. */
export function feedbackMessages(m: Mistake): ChatMessage[] {
  const [exampleNotes, exampleAnswer] = FEEDBACK_EXAMPLES[m.type]
  return [
    { role: 'system', content: FEEDBACK_SYSTEM },
    { role: 'user', content: exampleNotes },
    { role: 'assistant', content: exampleAnswer },
    { role: 'user', content: feedbackNotes(m) },
  ]
}

/** The tip she sees: the model's feedback, then the reviewed memory trick (if any) word for word. */
export function tipFromReply(m: Mistake, reply: string): string {
  const text = reply.trim()
  return m.keep ? `${text} ${m.keep}` : text
}
