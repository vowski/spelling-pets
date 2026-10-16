export interface Placed { word: string; row: number; col: number; dir: 'across' | 'down' }
export interface Layout { placed: Placed[]; rows: number; cols: number }

const key = (r: number, c: number) => `${r},${c}`

export function cellsOf(p: Placed): { r: number; c: number; ch: string }[] {
  return [...p.word].map((ch, i) => ({ r: p.row + (p.dir === 'down' ? i : 0), c: p.col + (p.dir === 'across' ? i : 0), ch }))
}

interface Cell { ch: string; dirs: Set<'across' | 'down'> }

function buildGrid(placed: readonly Placed[]): Map<string, Cell> {
  const grid = new Map<string, Cell>()
  for (const p of placed) for (const c of cellsOf(p)) {
    const k = key(c.r, c.c)
    const cell = grid.get(k) ?? { ch: c.ch, dirs: new Set() }
    cell.dirs.add(p.dir)
    grid.set(k, cell)
  }
  return grid
}

function bounds(placed: readonly Placed[]) {
  const cells = placed.flatMap(cellsOf)
  const rs = cells.map(c => c.r)
  const cs = cells.map(c => c.c)
  return { minR: Math.min(...rs), maxR: Math.max(...rs), minC: Math.min(...cs), maxC: Math.max(...cs) }
}

function crossingsIfLegal(grid: Map<string, Cell>, p: Placed): number {
  const dr = p.dir === 'down' ? 1 : 0
  const dc = p.dir === 'across' ? 1 : 0
  const before = grid.get(key(p.row - dr, p.col - dc))
  const end = cellsOf(p).at(-1)!
  const after = grid.get(key(end.r + dr, end.c + dc))
  if (before || after) return -1
  let crossings = 0
  for (const c of cellsOf(p)) {
    const cell = grid.get(key(c.r, c.c))
    if (cell) {
      if (cell.ch !== c.ch || cell.dirs.has(p.dir)) return -1
      crossings++
    } else {
      const side1 = grid.get(key(c.r + dc, c.c + dr))
      const side2 = grid.get(key(c.r - dc, c.c - dr))
      if (side1 || side2) return -1
    }
  }
  return crossings
}

export function layoutCrossword(anchor: string, candidates: readonly string[], opts: { maxSize: number; maxWords: number }): Layout {
  const placed: Placed[] = [{ word: anchor, row: 0, col: 0, dir: 'across' }]
  for (const word of candidates) {
    if (placed.length >= opts.maxWords) break
    if (word === anchor || placed.some(p => p.word === word)) continue
    const grid = buildGrid(placed)
    let best: Placed | null = null
    let bestScore = 0
    for (const p of placed) {
      const dir = p.dir === 'across' ? 'down' : 'across'
      for (const pc of cellsOf(p)) {
        for (let i = 0; i < word.length; i++) {
          if (word[i] !== pc.ch) continue
          const cand: Placed = dir === 'down'
            ? { word, row: pc.r - i, col: pc.c, dir }
            : { word, row: pc.r, col: pc.c - i, dir }
          const score = crossingsIfLegal(grid, cand)
          if (score <= 0) continue
          const b = bounds([...placed, cand])
          if (b.maxR - b.minR + 1 > opts.maxSize || b.maxC - b.minC + 1 > opts.maxSize) continue
          if (score > bestScore) { best = cand; bestScore = score }
        }
      }
    }
    if (best) placed.push(best)
  }
  const b = bounds(placed)
  return {
    placed: placed.map(p => ({ ...p, row: p.row - b.minR, col: p.col - b.minC })),
    rows: b.maxR - b.minR + 1,
    cols: b.maxC - b.minC + 1,
  }
}

export function validateLayout(layout: Layout): string[] {
  const errors: string[] = []
  const owner = new Map<string, { ch: string; across?: string; down?: string }>()
  for (const p of layout.placed) {
    for (const c of cellsOf(p)) {
      if (c.r < 0 || c.c < 0 || c.r >= layout.rows || c.c >= layout.cols) errors.push(`${p.word} goes outside the grid`)
      const k = key(c.r, c.c)
      const cell = owner.get(k) ?? { ch: c.ch }
      if (cell.ch !== c.ch) errors.push(`clash at ${k}: ${cell.ch} vs ${c.ch}`)
      if (cell[p.dir]) errors.push(`${p.word} overlaps ${cell[p.dir]} in the same direction`)
      cell[p.dir] = p.word
      owner.set(k, cell)
    }
  }
  for (const [k, cell] of owner) {
    const [r, c] = k.split(',').map(Number)
    const right = owner.get(key(r, c + 1))
    if (right && (!cell.across || cell.across !== right.across)) errors.push(`side-by-side letters at ${k} → ${r},${c + 1}`)
    const below = owner.get(key(r + 1, c))
    if (below && (!cell.down || cell.down !== below.down)) errors.push(`stacked letters at ${k} → ${r + 1},${c}`)
  }
  return errors
}
