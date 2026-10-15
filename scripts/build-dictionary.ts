import { readFileSync, writeFileSync } from 'node:fs'
import wordlist from 'wordlist-english'

const here = (p: string) => new URL(p, import.meta.url)
const blocked = readFileSync(here('./blocklist.txt'), 'utf8')
  .split(/\r?\n/)
  .map(s => s.trim().toLowerCase())
  .filter(s => s && !s.startsWith('#'))

const words = new Set<string>()
for (const key of ['english/10', 'english/20', 'english/british/10', 'english/british/20']) {
  for (const w of wordlist[key]) {
    const lw = w.toLowerCase()
    if (/^[a-z]{2,}$/.test(lw)) words.add(lw)
  }
}
writeFileSync(here('../src/content/dictionary-words.json'), JSON.stringify([...words].sort()))
writeFileSync(here('../src/content/blocked-words.json'), JSON.stringify([...new Set(blocked)].sort()))
console.log(`dictionary-words.json: ${words.size} words; blocked-words.json: ${blocked.length} words`)
