const SUFFIXES = ['s', 'es', 'd', 'ed', 'r', 'rs', 'ing', 'er', 'ers']

/** Blocked if the word, or the word with a common ending removed, is on the list (beer → beers, moron → morons). */
export function isBlockedBy(word: string, blocked: ReadonlySet<string>): boolean {
  const w = word.toLowerCase()
  if (blocked.has(w)) return true
  return SUFFIXES.some(s => w.length > s.length + 2 && w.endsWith(s) && blocked.has(w.slice(0, -s.length)))
}
