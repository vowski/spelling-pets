// Dev-only: `npm run tip-eval`. Runs the real spelling-tip model in Edge on this laptop over every evaluation case and
// writes the parent's review document to private/tip-review/ (never committed).
// `npm run tip-eval -- --from private/tip-review/<date>-results.json [--grades <grades.json>]` rewrites the document from saved
// results, with my hand read of every AI tip ({ "wordId|typed": ["correct" | "weak" | "wrong", "reason"] }).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { chromium } from '@playwright/test'
import { createServer } from 'vite'

const KINDS = {
  homophone: 'Sound-alike words', tricky: 'Tricky letters', capital: 'Capital letters', apostrophe: 'Apostrophes',
  doubling: 'Double the last letter', dropE: 'Drop the e', yToI: 'Y changes to i', ending: 'Word endings',
  letters: 'Wrong letters',
}

async function runModel() {
  const PORT = 5181
  process.env.VITE_TIPS = 'on'
  // The Edge profile lives in private/; keep Vite's file watcher out of it (Edge locks its files).
  const server = await createServer({ server: { port: PORT, strictPort: true, watch: { ignored: ['**/private/**'] } }, logLevel: 'warn' })
  await server.listen()
  const ctx = await chromium.launchPersistentContext('private/.tip-eval-profile', { channel: 'msedge', headless: false, viewport: { width: 1100, height: 800 } })
  try {
    const page = ctx.pages()[0] ?? (await ctx.newPage())
    page.on('console', m => console.log(`[eval] ${m.text()}`))
    await page.goto(`http://localhost:${PORT}/tip-eval.html`)
    await page.waitForFunction(() => globalThis.__TIP_EVAL__ || globalThis.__TIP_EVAL_ERROR__, null, { timeout: 60 * 60 * 1000, polling: 2000 })
    return await page.evaluate(() => globalThis.__TIP_EVAL__ ?? { error: globalThis.__TIP_EVAL_ERROR__ })
  } finally {
    await ctx.close()
    await server.close()
  }
}

/** grades: optional map of `${wordId}|${typed}` → [correct | weak | wrong, reason], from reading every AI tip by hand. */
function review(data, grades) {
  const results = data.results
  const ai = results.filter(r => !r.plainOnly)
  const passed = ai.filter(r => r.problems.length === 0)
  const times = ai.map(r => r.seconds).sort((a, b) => a - b)
  const median = times[Math.floor(times.length / 2)]
  const esc = s => String(s).replace(/\|/g, '\\|')
  const kind = t => KINDS[t] ?? t
  const grade = r => grades?.[`${r.wordId}|${r.typed}`]
  const tally = rs => ['correct', 'weak', 'wrong'].map(g => `${rs.filter(r => grade(r)?.[0] === g).length} ${g}`).join(', ')
  const byType = new Map()
  for (const r of results) { if (!byType.has(r.type)) byType.set(r.type, []); byType.get(r.type).push(r) }

  const lines = [
    `# Spelling tips: review for the grown-up (${data.when.slice(0, 10)})`,
    '',
    'Please read every sentence below. Mark anything that is wrong, unclear or unkind, and say what it should be.',
    'Tips only reach her after you approve this document.',
    '',
    'How feedback is made: when she gets a word wrong, the app works out exactly what she did (which letters she missed,',
    'added or wrote instead, and the spelling rule when one applies). The AI then writes feedback to her about that, in its',
    'own words. Automatic checks read it first; if a check fails, or the AI takes longer than 6 seconds, she sees the plain',
    'tip instead. Memory tricks are added after the AI\'s feedback, word for word. These mistakes are test samples only: in',
    'the app, the AI writes feedback for whatever she types.',
    '',
    '## Summary',
    '',
    `- Model: ${data.model.id} (revision ${data.model.revision.slice(0, 7)}, ${data.model.dtype}); prompt version ${data.promptVersion}`,
    `- Browser: ${data.userAgent}`,
    `- AI feedback passing every automatic check: **${passed.length} of ${ai.length}** (${Math.round((passed.length / ai.length) * 100)}%). The others would show the plain tip instead.`,
    ...(grades ? [
      `- My read of all ${ai.length} AI tips: ${tally(ai)}.`,
      `- **What she would see** (the ${passed.length} that pass the checks): **${tally(passed)}**.`,
      `- Realistic misspellings only (${ai.filter(r => r.realistic).length}): ${tally(ai.filter(r => r.realistic))}; passing the checks: ${tally(passed.filter(r => r.realistic))}.`,
    ] : []),
    `- Time per AI tip: median **${median.toFixed(1)} s**, slowest ${times.at(-1).toFixed(1)} s (the app waits at most 6 s, then shows the plain tip)`,
    `- Model load: ${data.loadSeconds.toFixed(0)} s (already downloaded on this laptop)`,
    '',
    '## 1. Plain tips (shown when AI tips are off, or when the AI\'s feedback fails a check)',
    '',
    'One example of every wording, and at least three of each kind. Section 4 has the plain tip for every mistake tested.',
    '',
  ]
  for (const [type, rs] of byType) {
    lines.push(`**${kind(type)}**`, '')
    // The first mistake of each wording family (review I6), then more until there are three.
    const shown = []
    for (const r of rs) if ((r.families ?? []).some(f => !shown.some(s => s.families.includes(f)))) shown.push(r)
    for (const r of rs) if (shown.length < 3 && !shown.includes(r)) shown.push(r)
    for (const r of rs.filter(r => shown.includes(r))) lines.push(`- ${r.target} ← she wrote "${r.typed}": ${r.template}`)
    lines.push('')
  }
  lines.push('## 2. Word meanings used in sound-alike tips', '', '| Word | Means |', '|---|---|')
  for (const [w, g] of Object.entries(data.glosses)) lines.push(`| ${esc(w)} | ${esc(g)} |`)
  lines.push('', '## 3. Memory tricks', '')
  for (const [w, t] of Object.entries(data.tricks)) lines.push(`- **${w}**: ${t}`)
  const table = rs => {
    lines.push(`| # | Kind | Word | She wrote | AI feedback | Checks |${grades ? ' My read |' : ''} Plain tip instead | Time |`, `|---|---|---|---|---|---|${grades ? '---|' : ''}---|---|`)
    for (const r of rs) {
      const g = grade(r)
      const read = grades ? ` ${r.plainOnly ? '—' : g ? `**${g[0]}**${g[1] ? ': ' + esc(g[1]) : ''}` : '?'} |` : ''
      const fed = r.plainOnly ? '*(nothing like the word: plain tip only)*' : esc(r.reply)
      const checks = r.plainOnly ? '—' : r.problems.length ? '✗ ' + esc(r.problems.join('; ')) : '✓'
      lines.push(`| ${results.indexOf(r) + 1} | ${kind(r.type)} | ${esc(r.target)} | ${esc(r.typed)} | ${fed} | ${checks} |${read} ${esc(r.template)} | ${r.plainOnly ? '—' : r.seconds.toFixed(1) + ' s'} |`)
    }
    lines.push('')
  }
  lines.push('', '## 4. AI feedback for every test mistake', '', '### 4a. Realistic misspellings', '')
  table(results.filter(r => r.realistic))
  lines.push('### 4b. One of every kind of mistake the rules know', '')
  table(results.filter(r => !r.realistic))
  return { text: lines.join('\n'), passed: passed.length, total: ai.length, median }
}

const fromArg = process.argv.indexOf('--from')
const data = fromArg > 0 ? JSON.parse(readFileSync(process.argv[fromArg + 1], 'utf8')) : await runModel()
if (data.error) throw new Error(`Evaluation failed: ${data.error}`)
const date = data.when.slice(0, 10)
mkdirSync('private/tip-review', { recursive: true })
const file = `private/tip-review/${date}-review.md`
const gradesArg = process.argv.indexOf('--grades')
const grades = gradesArg > 0 ? JSON.parse(readFileSync(process.argv[gradesArg + 1], 'utf8')) : undefined
const doc = review(data, grades)
writeFileSync(file, doc.text)
if (fromArg < 0) writeFileSync(`private/tip-review/${date}-results.json`, JSON.stringify(data, null, 2))
console.log(`wrote ${file}: ${doc.passed}/${doc.total} pass, median ${doc.median.toFixed(1)} s`)
