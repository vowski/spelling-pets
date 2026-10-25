// Dev-only: runs the real model in this browser over every evaluation case and exposes the results for
// scripts/tip-eval.mjs, which writes the parent's review document.
import { TIP_MODEL, TIP_VERSION } from '../../src/ai/tipModel'
import { createWorkerTipModel } from '../../src/ai/workerTipModel'
import { BUILTIN_BANK as bank } from '../../src/content'
import { isBlockedWord } from '../../src/content/dictionary'
import { HOMOPHONE_GLOSSES, MEMORY_TRICKS } from '../../src/content/tipContent'
import { checkTip } from '../../src/engine/tips/checks'
import { classifyMistake } from '../../src/engine/tips/classify'
import { TIP_PROMPT_VERSION, rewordMessages, tipFromReply } from '../../src/engine/tips/prompt'
import { EVAL_CASES } from './cases'

const out = document.getElementById('log')!
const log = (line: string) => { console.log(line); out.textContent += line + '\n' }
const g = globalThis as unknown as Record<string, unknown>

async function main() {
  const model = createWorkerTipModel()
  const support = await model.checkSupport()
  if (!support.ok) throw new Error(support.reason)
  let t0 = performance.now()
  let last = -10
  await model.download(p => { if (p - last >= 10) { last = p; log(`download ${Math.round(p)}%`) } })
  const loadSeconds = (performance.now() - t0) / 1000
  const results = []
  for (const c of EVAL_CASES) {
    const word = bank.words.get(c.wordId)!
    const m = classifyMistake(word, c.typed, bank)!
    t0 = performance.now()
    const reply = tipFromReply(m, await model.generate(rewordMessages(m.reword)))
    const seconds = (performance.now() - t0) / 1000
    const problems = checkTip(reply, m, { isBlocked: isBlockedWord })
    results.push({ ...c, target: m.target, type: m.type, template: m.template, reply, problems, seconds })
    log(`${m.type.padEnd(10)} ${m.target} ← ${c.typed}: ${seconds.toFixed(1)}s ${problems.length ? '✗ ' + problems.join('; ') : '✓'} | ${reply}`)
  }
  g.__TIP_EVAL__ = {
    when: new Date().toISOString(), userAgent: navigator.userAgent, model: TIP_MODEL, tipVersion: TIP_VERSION, promptVersion: TIP_PROMPT_VERSION,
    loadSeconds, results, glosses: HOMOPHONE_GLOSSES, tricks: Object.fromEntries(Object.entries(MEMORY_TRICKS).map(([id, t]) => [bank.words.get(id)?.text ?? id, t])),
  }
  log('Done.')
}

main().catch(e => { log(`FAILED: ${e instanceof Error ? e.message : String(e)}`); g.__TIP_EVAL_ERROR__ = String(e instanceof Error ? e.message : e) })
