import dict from './dictionary-words.json'
import blocked from './blocked-words.json'
import { isBlockedBy } from './blocking'
import { BUILTIN_BANK } from './index'

const DICT = new Set<string>(dict as string[])
const BLOCKED = new Set<string>(blocked as string[])
const BANK_TEXTS = new Set<string>([...BUILTIN_BANK.words.values()].map(w => w.text.toLowerCase()))

export const isDictionaryWord = (w: string): boolean => DICT.has(w.toLowerCase())
export const isBlockedWord = (w: string): boolean => isBlockedBy(w, BLOCKED)
export const isRejectedDistractor = (w: string): boolean => {
  const k = w.toLowerCase()
  return DICT.has(k) || isBlockedBy(k, BLOCKED) || BANK_TEXTS.has(k)
}
