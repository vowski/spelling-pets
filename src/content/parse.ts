export function wordId(text: string): string {
  const slug = text
    .toLowerCase()
    .replace(/[’‘']/g, '-')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `w-${slug}`
}

export interface ParsedSpec {
  text: string
  syllables: string[]
  tricky: [number, number][]
}

export function parseWordSpec(spec: string): ParsedSpec {
  let text = ''
  let current = ''
  let trickyStart: number | null = null
  const syllables: string[] = []
  const tricky: [number, number][] = []
  for (const ch of spec) {
    if (ch === '|') {
      if (!current) throw new Error(`Empty syllable in "${spec}"`)
      syllables.push(current)
      current = ''
    } else if (ch === '[') {
      if (trickyStart !== null) throw new Error(`Nested [ in "${spec}"`)
      trickyStart = text.length
    } else if (ch === ']') {
      if (trickyStart === null || trickyStart === text.length) throw new Error(`Bad ] in "${spec}"`)
      tricky.push([trickyStart, text.length])
      trickyStart = null
    } else {
      text += ch
      current += ch
    }
  }
  if (trickyStart !== null) throw new Error(`Unclosed [ in "${spec}"`)
  if (!current) throw new Error(`Empty syllable in "${spec}"`)
  syllables.push(current)
  return { text, syllables, tricky }
}
