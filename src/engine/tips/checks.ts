import type { Mistake } from './classify'
import type { LetterChunk } from './letters'

const AMERICAN = /\b(color|colors|colored|favorite|favorites|realize[sd]?|recognize[sd]?|center|centers|theater|mom|gray|honor|neighbor|neighbors|organize[sd]?|apologize[sd]?)\b|\b\w{3,}iz(e|es|ed|ing)\b|\b(mr|mrs|ms|dr)\./i
const PRAISE = /\b(great|brilliant|amazing|well done|good job|clever|fantastic)\b/i
const FIRST_PERSON = /\bI\b|\bI'm\b|\bI'll\b/
/** Words that can turn a rule round ("do not double", "keep the e"); a reply may only use ones its plain tip uses. */
const NEGATIONS = /\b(not|never|no|don't|doesn't|isn't|aren't|keep|without)\b/g

const straighten = (s: string) => s.replace(/[“”]/g, '"').replace(/[‘’]/g, "'")
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * The automatic checks a reworded tip must pass before she sees it. Returns the reasons it fails; [] means it passes.
 * The plain template is shown whenever this returns anything.
 */
export function checkTip(text: string, m: Mistake, deps: { isBlocked: (word: string) => boolean }): string[] {
  const t = straighten(text).trim()
  const lower = t.toLowerCase()
  const target = straighten(m.target).toLowerCase()
  const attempt = straighten(m.attempt).toLowerCase()
  const problems: string[] = []

  if (!lower.includes(target)) problems.push('leaves out the correct word')
  if (m.type !== 'homophone' && attempt !== target && new RegExp(`(^|[^a-z'])${escape(attempt)}($|[^a-z'])`).test(lower)) problems.push('shows her misspelling')
  // The memory trick is reviewed text added after the AI's part, so only the AI's part counts towards the length.
  const body = m.keep && t.endsWith(m.keep) ? t.slice(0, -m.keep.length).trim() : t
  const words = body.split(/\s+/).filter(Boolean).length
  const sentences = (body.match(/[.!?](?=\s|$)/g) ?? []).length
  if (words > 25 || sentences > 2) problems.push('too long')
  if (/[\n<*#]/.test(t)) problems.push('stray formatting')
  if (AMERICAN.test(t)) problems.push('American spelling')
  if (FIRST_PERSON.test(t) && !/^i($|')/.test(target)) problems.push('says "I"')
  if (PRAISE.test(t.replace(/"[^"]*"/g, ''))) problems.push('praise') // a quoted word can be the spelling word itself ("great")
  // Single quotes count too ('ei'), but not apostrophes inside words (can't).
  const quoted = [...t.matchAll(/"([^"]+)"/g), ...t.matchAll(/(?:^|[\s(])'([^']+)'(?=[\s.,!?;:)]|$)/g)].map(q => q[1].toLowerCase())
  const stray = quoted.filter(q => !m.quotable.includes(q))
  if (stray.length) problems.push(`quotes something new: ${stray.join(', ')}`)
  // The tip's own facts are curriculum words ("fat" in fatter); only words the AI adds are screened.
  if (t.split(/[^A-Za-z']+/).filter(Boolean).some(w => deps.isBlocked(w) && !m.quotable.includes(w.toLowerCase()))) problems.push('unsuitable word')
  const template = straighten(m.template).toLowerCase()
  const added = [...new Set(lower.replace(/"[^"]*"/g, '').match(NEGATIONS) ?? [])].filter(w => !new RegExp(`\\b${w}\\b`).test(template))
  if (added.length) problems.push(`adds ${added.join(', ')}`)
  if (m.meanings && mixesUpMeanings(lower, m.meanings)) problems.push('mixes up the meanings')
  if (m.letters) {
    if (getsLettersBackwards(lower, m.letters)) problems.push('gets her letters backwards')
    if (m.type === 'letters' && !m.letters.some(c => lower.includes(`"${c.has || c.wrote}"`))) problems.push('says nothing about her letters')
  }
  const missing = m.mustMention.filter(token => !lower.includes(token))
  if (missing.length) problems.push(`drops the key fact: ${missing.join(', ')}`)
  return problems
}

/** Where a word is first named in the tip: quoted if possible, otherwise as a whole word; -1 if it isn't. */
function findWord(text: string, word: string): number {
  const q = text.indexOf(`"${word}"`)
  if (q >= 0) return q
  const r = new RegExp(`(^|[^a-z'])${escape(word)}($|[^a-z'])`).exec(text)
  return r ? r.index + r[1].length : -1
}

/** True when a tip says she wrote the word's letters, or that the word has the letters she wrote (or that she missed them). */
function getsLettersBackwards(text: string, chunks: LetterChunk[]): boolean {
  const wrote = new Set(chunks.map(c => c.wrote).filter(Boolean))
  const has = new Set(chunks.map(c => c.has).filter(Boolean))
  const says = (verbs: string, letters: string) => new RegExp(`\\b(${verbs})\\s+(the\\s+|an?\\s+|only\\s+one\\s+)?(letters?\\s+)?"${escape(letters)}"`).test(text)
  return [...has].some(h => !wrote.has(h) && says('wrote|write|added|add|put|typed', h))
    || [...wrote].some(w => !has.has(w) && says('has|have|needs|need|missed out|missed|left out|forgot', w))
}

/** True when a sound-alike tip gives a word's meaning after the other word instead of after its own. */
function mixesUpMeanings(text: string, meanings: { word: string; token: string }[]): boolean {
  const named = meanings.map(x => ({ ...x, at: findWord(text, x.word) })).sort((a, b) => a.at - b.at)
  if (named.some(x => x.at < 0)) return false // nothing to mix up; the other checks cover a missing correct word
  const [first, second] = named
  const before = text.slice(0, second.at)
  const after = text.slice(second.at)
  return (!before.includes(first.token) && after.includes(first.token)) || (!after.includes(second.token) && before.includes(second.token))
}
