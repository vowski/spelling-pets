// Dev-only: `npm run tip-eval`. Runs the real spelling-tip model in Edge on this laptop over every evaluation case and
// writes the parent's review document to private/tip-review/ (never committed).
// `npm run tip-eval -- --from private/tip-review/<date>-results.json` rewrites the document from saved results.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { chromium } from '@playwright/test'
import { createServer } from 'vite'

const KINDS = {
  homophone: 'Sound-alike words', tricky: 'Tricky letters', capital: 'Capital letters', apostrophe: 'Apostrophes',
  doubling: 'Double the last letter', dropE: 'Drop the e', yToI: 'Y changes to i', ending: 'Word endings',
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

function review(data) {
  const results = data.results
  const passed = results.filter(r => r.problems.length === 0)
  const failed = results.filter(r => r.problems.length > 0)
  const times = results.map(r => r.seconds).sort((a, b) => a - b)
  const median = times[Math.floor(times.length / 2)]
  const esc = s => String(s).replace(/\|/g, '\\|')
  const kind = t => KINDS[t] ?? t
  const byType = new Map()
  for (const r of results) { if (!byType.has(r.type)) byType.set(r.type, []); byType.get(r.type).push(r) }

  const lines = [
    `# Spelling tips: review for the grown-up (${data.when.slice(0, 10)})`,
    '',
    'Please read every sentence below. Mark anything that is wrong, unclear or unkind, and say what it should be.',
    'Tips only reach her after you approve this document.',
    '',
    'How a tip is made: fixed rules work out what kind of mistake it is and write the plain tip, which is always correct.',
    'The AI only rewords the plain tip so it sounds friendlier. It never sees or changes the memory tricks, which are added back',
    'word for word. Automatic checks read every AI tip; if one fails, or the AI takes longer than 6 seconds, she sees the plain tip.',
    '',
    '## Summary',
    '',
    `- Model: ${data.model.id} (revision ${data.model.revision.slice(0, 7)}, ${data.model.dtype}); prompt version ${data.promptVersion}`,
    `- Browser: ${data.userAgent}`,
    `- AI tips passing every automatic check: **${passed.length} of ${results.length}** (${Math.round((passed.length / results.length) * 100)}%). The others would show the plain tip instead.`,
    `- Time per AI tip: median **${median.toFixed(1)} s**, slowest ${times.at(-1).toFixed(1)} s (the app waits at most 6 s, then shows the plain tip)`,
    `- Model load: ${data.loadSeconds.toFixed(0)} s (already downloaded on this laptop)`,
    '',
    '## 1. Plain tips (always correct, shown when AI tips are off or a check fails)',
    '',
    'Three examples of each kind. Section 4 has the plain tip for every mistake tested.',
    '',
  ]
  for (const [type, rs] of byType) {
    lines.push(`**${kind(type)}**`, '')
    for (const r of rs.slice(0, 3)) lines.push(`- ${r.target} ← she wrote "${r.typed}": ${r.template}`)
    lines.push('')
  }
  lines.push('## 2. Word meanings used in sound-alike tips', '', '| Word | Means |', '|---|---|')
  for (const [w, g] of Object.entries(data.glosses)) lines.push(`| ${esc(w)} | ${esc(g)} |`)
  lines.push('', '## 3. Memory tricks', '')
  for (const [w, t] of Object.entries(data.tricks)) lines.push(`- **${w}**: ${t}`)
  lines.push('', '## 4. Every AI tip from this laptop', '')
  if (failed.length) {
    lines.push('These failed a check, so she would see the plain tip instead:', '')
    for (const r of failed) lines.push(`- ${r.target} ← "${r.typed}": ${r.problems.join('; ')}`)
    lines.push('')
  }
  lines.push('| # | Kind | Word | She wrote | Plain tip | AI tip | Checks | Time |', '|---|---|---|---|---|---|---|---|')
  results.forEach((r, i) => lines.push(`| ${i + 1} | ${kind(r.type)} | ${esc(r.target)} | ${esc(r.typed)} | ${esc(r.template)} | ${esc(r.reply)} | ${r.problems.length ? '✗ ' + esc(r.problems.join('; ')) : '✓'} | ${r.seconds.toFixed(1)} s |`))
  lines.push('')
  return { text: lines.join('\n'), passed: passed.length, total: results.length, median }
}

const fromArg = process.argv.indexOf('--from')
const data = fromArg > 0 ? JSON.parse(readFileSync(process.argv[fromArg + 1], 'utf8')) : await runModel()
if (data.error) throw new Error(`Evaluation failed: ${data.error}`)
const date = data.when.slice(0, 10)
mkdirSync('private/tip-review', { recursive: true })
const file = `private/tip-review/${date}-review.md`
const doc = review(data)
writeFileSync(file, doc.text)
if (fromArg < 0) writeFileSync(`private/tip-review/${date}-results.json`, JSON.stringify(data, null, 2))
console.log(`wrote ${file}: ${doc.passed}/${doc.total} pass, median ${doc.median.toFixed(1)} s`)
