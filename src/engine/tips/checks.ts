import type { Mistake } from './classify'

const AMERICAN = /\b(color|colors|colored|favorite|favorites|realize[sd]?|recognize[sd]?|center|centers|theater|mom|gray|honor|neighbor|neighbors|organize[sd]?|apologize[sd]?)\b|\b\w{3,}iz(e|es|ed|ing)\b/i
const PRAISE = /\b(great|brilliant|amazing|well done|good job|clever|fantastic)\b/i
const FIRST_PERSON = /\bI\b|\bI'm\b|\bI'll\b/

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
  const words = t.split(/\s+/).filter(Boolean).length
  const sentences = (t.match(/[.!?](?=\s|$)/g) ?? []).length
  if (words > 25 || sentences > 2) problems.push('too long')
  if (/[\n<*#]/.test(t)) problems.push('stray formatting')
  if (AMERICAN.test(t)) problems.push('American spelling')
  if (FIRST_PERSON.test(t) && !/^i($|')/.test(target)) problems.push('says "I"')
  if (PRAISE.test(t.replace(/"[^"]*"/g, ''))) problems.push('praise') // a quoted word can be the spelling word itself ("great")
  const quoted = [...t.matchAll(/"([^"]+)"/g)].map(q => q[1].toLowerCase())
  const stray = quoted.filter(q => !m.quotable.includes(q))
  if (stray.length) problems.push(`quotes something new: ${stray.join(', ')}`)
  // The tip's own facts are curriculum words ("fat" in fatter); only words the AI adds are screened.
  if (t.split(/[^A-Za-z']+/).filter(Boolean).some(w => deps.isBlocked(w) && !m.quotable.includes(w.toLowerCase()))) problems.push('unsuitable word')
  const missing = m.mustMention.filter(token => !lower.includes(token))
  if (missing.length) problems.push(`drops the key fact: ${missing.join(', ')}`)
  return problems
}
