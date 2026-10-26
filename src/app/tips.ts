import type { Bank } from '../content'
import { wordId } from '../content/parse'
import type { Word } from '../content/types'
import { checkTip } from '../engine/tips/checks'
import { classifyMistake, type Mistake } from '../engine/tips/classify'
import { feedbackMessages, tipFromReply } from '../engine/tips/prompt'
import { ModelMissingError, TIP_VERSION, type ModelStatus, type TipModel } from '../ai/tipModel'
import type { Repo } from '../storage/repo'
import type { Clock } from './clock'

export interface TipResult { text: string; source: 'ai' | 'plain' }

export interface TipService {
  /** Null when the mistake can't be classified (no tip box at all). */
  prepare(word: Word, typed: string): { mistake: Mistake; result: Promise<TipResult> } | null
  /** The screen calls this once the tip is actually on screen, so the Words tab shows only tips she saw. */
  recordShown(word: Word, mistake: Mistake, result: TipResult): Promise<void>
  status(): ModelStatus
  subscribe(listener: () => void): () => void
  /** Support check → download with progress → self-test → AI tips on. */
  enable(): Promise<void>
  disable(): Promise<void>
  /** Turn off, delete the model files and forget cached tips. */
  remove(): Promise<void>
  /** If AI tips are on, load the model in the background so the first tip isn't slow. */
  warmUp(): void
}

export interface TipServiceDeps {
  repo: Repo
  bank: Bank
  model: TipModel | null
  clock: Clock
  timeoutMs: number
  isBlocked: (word: string) => boolean
}

/** A short fingerprint of a text (FNV-1a), so a cache key changes whenever the plain tip's wording does. */
function fingerprint(s: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0
  return h.toString(36)
}

/** Where an AI tip is cached: per word, attempt, model + prompt version, and the plain tip it rewords. */
export const tipCacheKey = (word: Word, m: Mistake) => `${word.id}|${m.attempt.toLowerCase()}|${TIP_VERSION}|${fingerprint(m.template)}`

/** Two known rewordings the model must get right before AI tips can be switched on. */
const SELF_TEST: [target: string, typed: string][] = [['here', 'hear'], ['patting', 'pating']]
const MAX_FAILURES = 3

export function createTipService(deps: TipServiceDeps): TipService {
  const { repo, model } = deps
  let status: ModelStatus = { kind: 'off' }
  let failures = 0
  const listeners = new Set<() => void>()
  const now = () => deps.clock.now().getTime()
  const set = (s: ModelStatus) => { status = s; for (const l of listeners) l() }
  const attemptKey = (word: Word, attempt: string) => `${word.id}|${attempt.toLowerCase()}`
  const checkDeps = { isBlocked: deps.isBlocked }

  const reword = async (word: Word, m: Mistake): Promise<TipResult | null> => {
    try {
      const text = tipFromReply(m, await model!.generate(feedbackMessages(m)))
      failures = 0
      const problems = checkTip(text, m, checkDeps)
      if (problems.length) {
        await repo.logError('tips', `${m.target} / ${m.attempt}: ${problems.join('; ')}`, now())
        return null
      }
      // Cached even if it arrived after the time limit, so the same mistake gets it instantly next time.
      await repo.putTip({ key: tipCacheKey(word, m), wordId: word.id, attempt: m.attempt, text, source: 'ai', at: now() })
      return { text, source: 'ai' }
    } catch (e) {
      failures++
      await repo.logError('tips', e instanceof Error ? e.message : String(e), now())
      if (failures >= MAX_FAILURES) set({ kind: 'error', message: 'The AI stopped working, so she is getting plain tips.' })
      return null
    }
  }

  const resolve = async (word: Word, m: Mistake): Promise<TipResult> => {
    const plain: TipResult = { text: m.template, source: 'plain' }
    const settings = await repo.getSettings()
    if (!model || !settings.aiTipsOn || status.kind !== 'ready' || m.plainOnly || settings.plainTipWordIds?.includes(word.id)) return plain
    const cached = await repo.getTip(tipCacheKey(word, m))
    // Checked again: the checks may have been tightened since it was cached.
    if (cached && !checkTip(cached.text, m, checkDeps).length) return { text: cached.text, source: 'ai' }
    const timeLimit = new Promise<null>(r => setTimeout(() => r(null), deps.timeoutMs))
    return (await Promise.race([reword(word, m), timeLimit])) ?? plain
  }

  const selfTest = async (): Promise<boolean> => {
    for (const [target, typed] of SELF_TEST) {
      const m = classifyMistake(deps.bank.words.get(wordId(target))!, typed, deps.bank)!
      const reply = tipFromReply(m, await model!.generate(feedbackMessages(m)))
      if (checkTip(reply, m, checkDeps).length) return false
    }
    return true
  }

  return {
    prepare(word, typed) {
      const mistake = classifyMistake(word, typed, deps.bank)
      if (!mistake) return null
      return { mistake, result: resolve(word, mistake) }
    },
    async recordShown(word, mistake, res) {
      await repo.putTip({ key: `${attemptKey(word, mistake.attempt)}|shown`, wordId: word.id, attempt: mistake.attempt, text: res.text, source: res.source, at: now() })
    },
    status: () => status,
    subscribe(listener) {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    async enable() {
      if (!model) return
      const support = await model.checkSupport()
      if (!support.ok) {
        set({ kind: 'unsupported', reason: support.reason })
        await repo.updateSettings({ aiTipsOn: false })
        return
      }
      try {
        set({ kind: 'downloading', percent: 0 })
        await model.download(p => set({ kind: 'downloading', percent: Math.round(p) }))
        set({ kind: 'loading' })
        if (!(await selfTest())) {
          set({ kind: 'unsupported', reason: 'self-test failed' })
          await repo.updateSettings({ aiTipsOn: false })
          return
        }
        failures = 0
        await repo.updateSettings({ aiTipsOn: true })
        set({ kind: 'ready' })
      } catch (e) {
        await repo.updateSettings({ aiTipsOn: false })
        set({ kind: 'error', message: e instanceof Error ? e.message : String(e) })
      }
    },
    async disable() {
      await repo.updateSettings({ aiTipsOn: false })
      set({ kind: 'off' })
    },
    async remove() {
      await repo.updateSettings({ aiTipsOn: false })
      await model?.remove()
      await repo.clearTips()
      set({ kind: 'off' })
    },
    warmUp() {
      if (!model || status.kind !== 'off') return
      void repo.getSettings().then(async s => {
        if (!s.aiTipsOn || status.kind !== 'off') return
        set({ kind: 'loading' })
        try {
          await model.load()
          failures = 0
          set({ kind: 'ready' })
        } catch (e) {
          await repo.logError('tips', e instanceof Error ? e.message : String(e), now())
          // The browser lost the model (or a backup was restored on another laptop): switch off rather than re-download.
          if (e instanceof ModelMissingError) await repo.updateSettings({ aiTipsOn: false })
          set({ kind: 'error', message: e instanceof Error ? e.message : String(e) })
        }
      })
    },
  }
}
