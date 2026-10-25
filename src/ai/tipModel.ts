import { TIP_PROMPT_VERSION, type ChatMessage } from '../engine/tips/prompt'

/**
 * Gemma 3 1B instruct, 4-bit weights with full-precision maths. Measured on the family laptop (Adreno X1-85):
 * the half-precision builds (q4f16/fp16) produce gibberish there, so never switch dtype to them.
 */
export const TIP_MODEL = {
  id: 'onnx-community/gemma-3-1b-it-ONNX',
  revision: 'a58439f40017d3b99c7d378ff525e54e0ba08ebf',
  dtype: 'q4',
  approxMB: 860,
} as const

/** Part of every cached AI tip's key: changing the model or the prompt makes old tips regenerate. */
export const TIP_VERSION = `${TIP_MODEL.id}@${TIP_MODEL.revision}#p${TIP_PROMPT_VERSION}`

export type ModelStatus =
  | { kind: 'off' }
  | { kind: 'downloading'; percent: number }
  | { kind: 'loading' }
  | { kind: 'ready' }
  | { kind: 'unsupported'; reason: string }
  | { kind: 'error'; message: string }

export const MODEL_MISSING = "The AI model isn't on this laptop any more, so AI tips are off. Turn them on again to download it."
export const MODEL_NOT_SAVED = "The AI model couldn't be saved on this laptop, perhaps because it is short of space, so AI tips are off."

/** load() rejects with this when the model files aren't cached: the app never downloads 0.9 GB without being asked. */
export class ModelMissingError extends Error {
  constructor() {
    super(MODEL_MISSING)
    this.name = 'ModelMissingError'
  }
}

/** The on-device language model, as the tip service sees it. */
export interface TipModel {
  checkSupport(): Promise<{ ok: true } | { ok: false; reason: string }>
  /** Downloads the model files (once; then cached by the browser) and loads them onto the GPU. */
  download(onProgress: (percent: number) => void): Promise<void>
  /** Loads the cached model onto the GPU. Safe to call repeatedly. Never downloads: rejects with ModelMissingError instead. */
  load(): Promise<void>
  generate(messages: ChatMessage[]): Promise<string>
  /** Deletes the cached model files. */
  remove(): Promise<void>
}
