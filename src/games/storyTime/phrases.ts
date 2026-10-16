export function splitPhrases(text: string): string[] {
  const words = text.split(' ')
  if (words.length <= 5) return [text]
  const mid = Math.ceil(words.length / 2)
  return [words.slice(0, mid).join(' '), words.slice(mid).join(' ')]
}
