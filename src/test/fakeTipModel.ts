import { ModelMissingError, type TipModel } from '../ai/tipModel'
import type { Services } from '../app/services'
import { createTipService, type TipService } from '../app/tips'
import { isBlockedWord } from '../content/dictionary'
import type { ChatMessage } from '../engine/tips/prompt'

export interface FakeTipModelOptions {
  /** Fixed reply, or a function of the prompt. Default: echo the template being reworded (always passes the checks). */
  reply?: string | ((messages: ChatMessage[]) => string)
  delayMs?: number
  fail?: boolean
  unsupported?: string
  downloadFails?: string
  /** load() reports that the model files are no longer cached. */
  missing?: boolean
}

/** A stand-in for the in-browser model, so tips can be tested without a GPU. */
export function fakeTipModel(o: FakeTipModelOptions = {}): TipModel & { calls: number; downloads: number; options: FakeTipModelOptions } {
  const model = {
    calls: 0,
    downloads: 0,
    options: o,
    async checkSupport() {
      return model.options.unsupported ? { ok: false as const, reason: model.options.unsupported } : { ok: true as const }
    },
    async download(onProgress: (percent: number) => void) {
      model.downloads++
      if (model.options.downloadFails) throw new Error(model.options.downloadFails)
      onProgress(50)
      onProgress(100)
    },
    async load() {
      if (model.options.missing) throw new ModelMissingError()
    },
    async generate(messages: ChatMessage[]) {
      model.calls++
      if (model.options.delayMs) await new Promise(r => setTimeout(r, model.options.delayMs))
      if (model.options.fail) throw new Error('model failed')
      const { reply } = model.options
      if (typeof reply === 'function') return reply(messages)
      return reply ?? messages.at(-1)!.content.replace(/^Tip to reword: /, '')
    },
    async remove() {},
  }
  return model
}

/** Test services with spelling tips switched on, backed by a fake model (self-test passes, then `o` applies). */
export async function servicesWithTips<S extends Services>(services: S, o: FakeTipModelOptions = {}, timeoutMs = 1000): Promise<S & { tips: TipService; model: ReturnType<typeof fakeTipModel> }> {
  const model = fakeTipModel()
  const tips = createTipService({ repo: services.repo, bank: services.bank, model, clock: services.clock, timeoutMs, isBlocked: isBlockedWord })
  await tips.enable()
  Object.assign(model.options, o)
  model.calls = 0
  return { ...services, tips, model }
}
