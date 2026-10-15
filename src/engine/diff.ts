export interface AlignStep {
  a: number | null
  b: number | null
}

/** Levenshtein alignment; prefers diagonal (match/sub), then deletion from a, then insertion from b. */
export function alignSequences<T>(a: readonly T[], b: readonly T[], eq: (x: T, y: T) => boolean): AlignStep[] {
  const n = a.length
  const m = b.length
  const dp: number[][] = Array.from({ length: n + 1 }, (_, i) =>
    Array.from({ length: m + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  )
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      dp[i][j] = Math.min(dp[i - 1][j - 1] + (eq(a[i - 1], b[j - 1]) ? 0 : 1), dp[i - 1][j] + 1, dp[i][j - 1] + 1)
    }
  }
  const steps: AlignStep[] = []
  let i = n
  let j = m
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + (eq(a[i - 1], b[j - 1]) ? 0 : 1)) {
      steps.push({ a: i - 1, b: j - 1 })
      i--
      j--
    } else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
      steps.push({ a: i - 1, b: null })
      i--
    } else {
      steps.push({ a: null, b: j - 1 })
      j--
    }
  }
  return steps.reverse()
}

export type LetterOp =
  | { kind: 'match'; expected: string; typed: string }
  | { kind: 'sub'; expected: string; typed: string }
  | { kind: 'missing'; expected: string }
  | { kind: 'extra'; typed: string }

export function diffLetters(expected: string, typed: string, opts: { foldCase?: boolean } = {}): LetterOp[] {
  const a = [...expected]
  const b = [...typed]
  const eq = opts.foldCase ? (x: string, y: string) => x.toLowerCase() === y.toLowerCase() : (x: string, y: string) => x === y
  return alignSequences(a, b, eq).map((s): LetterOp => {
    if (s.a !== null && s.b !== null) {
      return eq(a[s.a], b[s.b]) ? { kind: 'match', expected: a[s.a], typed: b[s.b] } : { kind: 'sub', expected: a[s.a], typed: b[s.b] }
    }
    if (s.a !== null) return { kind: 'missing', expected: a[s.a] }
    return { kind: 'extra', typed: b[s.b!] }
  })
}
