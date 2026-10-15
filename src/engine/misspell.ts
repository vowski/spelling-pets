import { diffLetters } from './diff'
import { shuffle, type Rng } from './rng'

const VOWELS = 'aeiou'
const SWAPS: [string, string][] = [
  ['ai', 'ay'], ['ay', 'ai'], ['ee', 'ea'], ['ea', 'ee'], ['oa', 'ow'], ['ow', 'oa'], ['ou', 'ow'], ['ow', 'ou'],
  ['ir', 'ur'], ['ur', 'ir'], ['er', 'ur'], ['or', 'aw'], ['aw', 'or'], ['au', 'aw'], ['ie', 'ei'], ['ei', 'ie'],
  ['oi', 'oy'], ['oy', 'oi'], ['ue', 'ew'], ['ew', 'ue'], ['ck', 'k'], ['ck', 'c'], ['k', 'c'], ['c', 'k'],
  ['ph', 'f'], ['f', 'ph'], ['tion', 'sion'], ['tion', 'shun'], ['sion', 'tion'], ['ssion', 'tion'],
  ['cian', 'tion'], ['dge', 'ge'], ['ge', 'dge'], ['tch', 'ch'], ['ch', 'tch'], ['ture', 'cher'], ['sure', 'zure'],
  ['ous', 'us'], ['le', 'el'], ['el', 'le'], ['al', 'le'], ['ey', 'y'], ['ough', 'uff'], ['ough', 'o'],
  ['eigh', 'ay'], ['ight', 'ite'], ['ear', 'er'], ['our', 'or'], ['au', 'or'], ['s', 'z'], ['se', 'ze'],
]

function replaceEach(w: string, from: string, to: string): string[] {
  const out: string[] = []
  let i = w.indexOf(from)
  while (i !== -1) {
    out.push(w.slice(0, i) + to + w.slice(i + from.length))
    i = w.indexOf(from, i + 1)
  }
  return out
}

function ruleCandidates(w: string): string[] {
  const out: string[] = []
  for (const [from, to] of SWAPS) out.push(...replaceEach(w, from, to))
  // undouble any doubled letter
  for (let i = 1; i < w.length; i++) if (w[i] === w[i - 1] && /[a-z]/.test(w[i])) out.push(w.slice(0, i) + w.slice(i + 1))
  // double a single consonant that sits after a vowel
  for (let i = 1; i < w.length; i++) {
    const c = w[i]
    if (!VOWELS.includes(c) && /[bdfglmnprst]/.test(c) && VOWELS.includes(w[i - 1]) && w[i + 1] !== c && w[i - 1] !== c) {
      out.push(w.slice(0, i + 1) + c + w.slice(i + 1))
    }
  }
  // silent letters
  if (/^kn/.test(w)) out.push(w.slice(1))
  if (/^wr/.test(w)) out.push(w.slice(1))
  if (/^gn/.test(w)) out.push(w.slice(1))
  if (/^wh/.test(w)) out.push('w' + w.slice(2))
  if (/mb$/.test(w)) out.push(w.slice(0, -1))
  out.push(...replaceEach(w, 'gh', ''))
  out.push(...replaceEach(w, 'gu', 'g'))
  out.push(...replaceEach(w, 'bui', 'bi'))
  // final e
  out.push(w.endsWith('e') ? w.slice(0, -1) : w + 'e')
  // unstressed vowel confusion (not the first letter)
  for (let i = 1; i < w.length; i++) {
    const swap: Record<string, string> = { a: 'e', e: 'a', o: 'u', u: 'o', i: 'e' }
    if (swap[w[i]]) out.push(w.slice(0, i) + swap[w[i]] + w.slice(i + 1))
  }
  return out
}

function swapCandidates(w: string): string[] {
  const out: string[] = []
  for (let i = 1; i < w.length - 1; i++) {
    if (w[i] !== w[i + 1]) out.push(w.slice(0, i) + w[i + 1] + w[i] + w.slice(i + 2))
  }
  return out
}

const matchCase = (candidate: string, original: string) =>
  /^[A-Z]/.test(original) ? candidate.charAt(0).toUpperCase() + candidate.slice(1) : candidate

export function misspellingCandidates(text: string): { rules: string[]; swaps: string[] } {
  const lower = text.toLowerCase()
  const uniq = (xs: string[]) => [...new Set(xs)].filter(x => x && x !== lower).map(x => matchCase(x, text))
  return { rules: uniq(ruleCandidates(lower)), swaps: uniq(swapCandidates(lower)) }
}

export function makeDistractors(
  text: string,
  opts: { history?: readonly string[]; reject: (w: string) => boolean; rng: Rng; count: number },
): string[] {
  const seen = new Set<string>([text.toLowerCase()])
  const out: string[] = []
  const accept = (c: string): void => {
    if (out.length >= opts.count) return
    const k = c.toLowerCase()
    if (!c || c.includes(' ') || seen.has(k) || opts.reject(c)) return
    seen.add(k)
    out.push(c)
  }
  const closeEnough = (h: string) => {
    const changes = diffLetters(text.toLowerCase(), h.toLowerCase()).filter(o => o.kind !== 'match').length
    return changes > 0 && changes <= Math.max(2, Math.ceil(text.length / 2))
  }
  for (const h of opts.history ?? []) {
    const t = h.trim()
    if (t && closeEnough(t)) accept(matchCase(t, text))
  }
  const { rules, swaps } = misspellingCandidates(text)
  for (const c of shuffle(rules, opts.rng)) accept(c)
  for (const c of shuffle(swaps, opts.rng)) accept(c)
  return out
}
