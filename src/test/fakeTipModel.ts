import type { TipModel } from '../ai/tipModel'
import type { ChatMessage } from '../engine/tips/prompt'

export interface FakeTipModelOptions {
  /** Fixed reply, or a function of the prompt. Default: echo the template being reworded (always passes the checks). */
  reply?: string | ((messages: ChatMessage[]) => string)
  delayMs?: number
  fail?: boolean
  unsupported?: string
  downloadFails?: string
}

/** A stand-in for the in-browser model, so tips can be tested without a GPU. */
export function fakeTipModel(o: FakeTipModelOptions = {}): TipModel & { calls: number; options: FakeTipModelOptions } {
  const model = {
    calls: 0,
    options: o,
    async checkSupport() {
      return model.options.unsupported ? { ok: false as const, reason: model.options.unsupported } : { ok: true as const }
    },
    async download(onProgress: (percent: number) => void) {
      if (model.options.downloadFails) throw new Error(model.options.downloadFails)
      onProgress(50)
      onProgress(100)
    },
    async load() {},
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
