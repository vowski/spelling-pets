import type { Mistake } from './classify'
import type { LetterChunk } from './letters'
import { FEEDBACK_EXAMPLE_WORDS } from './prompt'

const AMERICAN = /\b(color|colors|colored|favorite|favorites|realize[sd]?|recognize[sd]?|center|centers|theater|mom|gray|honor|neighbor|neighbors|organize[sd]?|apologize[sd]?)\b|\b\w{3,}iz(e|es|ed|ing)\b|\b(mr|mrs|ms|dr)\./i
const PRAISE = /\b(great|brilliant|amazing|well done|good job|clever|fantastic|nice|super|perfect|excellent|awesome|good try)\b/i
const FIRST_PERSON = /\bI\b|\bI'm\b|\bI'll\b/
// Words a reply may only use when its plain tip uses them too (it almost never does):
/** ...that can turn a rule round ("do not double", "keep the e"); */
const NEGATIONS = /\b(not|never|no|don't|doesn't|isn't|aren't|keep|without)\b/g
/** ...that tell her she was right, or are harsh ("you got the 'ie' right", "Wrong!", "silly"); */
const VERDICTS = /\b(right|correct|correctly|perfect|wrong|mistakes?|silly|oops|fail|failed)\b/g
/** ...that can teach the wrong spelling ("take the 'e' off", "use 'i'", "a double 's'", "three 'p' letters"); */
const INSTRUCTIONS = /\b(take|leave|remove|drop|change|use|swap|should be|double|twice|two|three)\b/g
/** ...or make up a rule the notes never give ("the h is silent", "a vowel sound"). */
const RULES = /\b(silent|vowels?|consonants?|rule)\b/g
/** Spelling a word out letter by letter ("w-i-c-h") can spell out her misspelling. */
const SPELLED_OUT = /\b[a-z](?:-[a-z]){2,}\b|\b[a-z](?: [a-z]){2,}\b/

const straighten = (s: string) => s.replace(/[“”]/g, '"').replace(/[‘’]/g, "'")
/** Single-quoted text ('ei') becomes double-quoted, so every check sees it; apostrophes inside words (can't) stay. */
const singleToDouble = (s: string) => s.replace(/(^|[\s(])'([^']+)'(?=[\s.,!?;:)]|$)/g, '$1"$2"')
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const quotedIn = (s: string) => [...s.matchAll(/"([^"]+)"/g)].map(q => q[1])

/**
 * The automatic checks a reworded tip must pass before she sees it. Returns the reasons it fails; [] means it passes.
 * The plain template is shown whenever this returns anything.
 */
export function checkTip(text: string, m: Mistake, deps: { isBlocked: (word: string) => boolean }): string[] {
  const t = singleToDouble(straighten(text).trim())
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
  const stray = quotedIn(lower).filter(q => !m.quotable.includes(q))
  if (stray.length) problems.push(`quotes something new: ${stray.join(', ')}`)
  // The tip's own facts are curriculum words ("fat" in fatter); only words the AI adds are screened.
  if (t.split(/[^A-Za-z']+/).filter(Boolean).some(w => deps.isBlocked(w) && !m.quotable.includes(w.toLowerCase()))) problems.push('unsuitable word')
  const template = straighten(m.template).toLowerCase()
  // The words she reads outside quotes; the spelling word itself ("because", "right") never counts as one of them.
  const plainWords = (s: string) => s.replace(/"[^"]*"/g, ' ').replace(new RegExp(`\\b${escape(target)}\\b`, 'g'), ' ')
  const unquotedTip = plainWords(lower)
  const unquotedTemplate = plainWords(template)
  const newWords = (re: RegExp, s = unquotedTip) => [...new Set(s.match(re) ?? [])].filter(w => !new RegExp(`\\b${escape(w)}\\b`).test(unquotedTemplate))
  const added = newWords(NEGATIONS)
  if (added.length) problems.push(`adds ${added.join(', ')}`)
  if (m.meanings && mixesUpMeanings(lower, m.meanings)) problems.push('mixes up the meanings')
  // Reasons are where a small model makes things up ("'do' is tricky because it's a vowel sound"): only the notes' own.
  if (newWords(/\bbecause\b/g).length) problems.push('adds a reason')
  if (newWords(VERDICTS).length) problems.push('tells her she was right or wrong')
  // "where "ai" should be" is how a checked letter claim is often phrased; any other "should be" is an instruction.
  const instructions = newWords(INSTRUCTIONS, plainWords(lower.replace(/\bwhere\s+(?:the\s+|an?\s+)?"[^"]+"\s+should be\b/g, ' ')))
  if (instructions.length) problems.push(`tells her to ${instructions.join(', ')}`)
  if (newWords(RULES).length) problems.push('makes up a rule')
  if (SPELLED_OUT.test(plainWords(body.toLowerCase()))) problems.push('spells a word out')
  const copied = FEEDBACK_EXAMPLE_WORDS.filter(w => w !== target && new RegExp(`\\b${escape(w)}\\b`).test(lower))
  if (copied.length) problems.push(`copies the worked example: ${copied.join(', ')}`)
  if (m.letters) {
    const claim = letterClaims(lower, m, m.letters, target)
    if (claim) problems.push(claim)
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

type Role = 'wrote' | 'missed' | 'has' | 'pair' | 'look' | 'none'
const ART = String.raw`(?:\s+(?:the|an?|only one|letters?|a tricky|tricky))*`
/** The role a sentence gives the quoted letters that come next, from the words just before them. */
function roleBefore(ctx: string, previous: Role): Role {
  if (/\band\s*(?:the\s+|an?\s+)?$/.test(ctx) && previous !== 'none' && previous !== 'look') return previous === 'pair' ? 'wrote' : previous // "…, and "o" where…"
  if (new RegExp(String.raw`\b(?:wrote|typed|put|used)\b.*\b(?:instead of|in place of|where|but)\s+(?:(?:"[^"]+"|it|the word)\s+(?:has|needs)\b${ART}\s*)?${ART}\s*$`).test(ctx)) return 'pair'
  if (new RegExp(String.raw`\b(?:wrote|typed|put|used|added)${ART}\s*$`).test(ctx)) return 'wrote'
  if (/\b(?:missed out|missed|left out|forgot)(?:\s+(?:the|an?|letters?|end,?))*\s*$/.test(ctx)) return 'missed'
  if (new RegExp(String.raw`\b(?:has|have|needs|need)${ART}\s*$`).test(ctx)) return 'has'
  if (/\blook(?:\s+carefully)?\s+at(?:\s+(?:the|an?))*\s*$/.test(ctx)) return 'look'
  return 'none'
}

/**
 * Every letter claim must be one the app can check against what she actually wrote: "you wrote/added X" (her letters),
 * "you missed X" and "… has X" (the word's letters), "you wrote X where/instead of … Y" (a real pair), "look at X".
 * Quoted letters anywhere else must be the plain tip's own facts (a tricky bit, an ending). Returns the problem, or null.
 */
function letterClaims(text: string, m: Mistake, chunks: LetterChunk[], target: string): string | null {
  const hers = new Set(chunks.map(c => c.wrote).filter(Boolean))
  const its = new Set(chunks.map(c => c.has).filter(Boolean))
  const facts = new Set(m.type === 'letters' ? [] : quotedIn(straighten(m.reword).toLowerCase()))
  let previous: Role = 'none'
  let lastWrote: string | null = null
  for (const q of text.matchAll(/"([^"]+)"/g)) {
    const before = text.slice(0, q.index)
    const ctx = before.slice(Math.max(before.lastIndexOf('.'), before.lastIndexOf('!'), before.lastIndexOf('?')) + 1)
    if (ctx.trim() === '') { previous = 'none'; lastWrote = null }
    const letters = q[1]
    const after = text.slice(q.index + q[0].length)
    let role = roleBefore(ctx, previous)
    if (letters === target) {
      // "You wrote "po" instead of "people"" is false; "…where "what" has "ha"" names the word and is fine.
      if (role === 'pair' && !/^\s+(?:has|needs)\b/.test(after)) return 'gets her letters wrong'
      continue
    }
    if (role === 'wrote' && /\bput(?:\s+(?:the|an?))*\s*$/.test(ctx) && /^\s+back\b/.test(after)) role = 'missed' // "put the "e" back"
    previous = role
    if (role === 'wrote') {
      lastWrote = letters
      if (!hers.has(letters)) return its.has(letters) ? 'gets her letters backwards' : 'gets her letters wrong'
    } else if (role === 'missed' || role === 'has') {
      if (!its.has(letters) && !(role === 'has' && facts.has(letters))) return hers.has(letters) ? 'gets her letters backwards' : 'gets her letters wrong'
    } else if (role === 'pair') {
      if (!lastWrote || !chunks.some(c => c.wrote === lastWrote && c.has === letters)) return hers.has(letters) && !its.has(letters) ? 'gets her letters backwards' : 'gets her letters wrong'
    } else if (role === 'none' && !facts.has(letters)) {
      return 'gets her letters wrong'
    }
  }
  return null
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
