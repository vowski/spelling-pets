import type { ChatMessage } from '../engine/tips/prompt'
import { ModelMissingError, type TipModel } from './tipModel'

export type WorkerRequest =
  | { id: number; type: 'support' | 'remove' }
  | { id: number; type: 'download' | 'load'; ortBase: string }
  | { id: number; type: 'generate'; messages: ChatMessage[] }
export type WorkerReply =
  | { id: number; ok: true; value?: unknown }
  | { id: number; ok: false; error: string; missing?: true }
  | { type: 'progress'; id: number; percent: number }

type WithoutId<T> = T extends unknown ? Omit<T, 'id'> : never
type Pending = { resolve: (v: unknown) => void; reject: (e: Error) => void; onProgress?: (percent: number) => void }

/** Runs the model in a Web Worker so the screen never stutters while a tip is written. */
export function createWorkerTipModel(
  makeWorker: () => Worker = () => new Worker(new URL('./tipWorker.ts', import.meta.url), { type: 'module' }),
  // The ONNX Runtime files are served by the app itself (copied to ort/ at build), never from a CDN.
  ortBase: string = new URL('ort/', document.baseURI).href,
): TipModel {
  let worker: Worker | null = null
  let nextId = 1
  const pending = new Map<number, Pending>()

  const failAll = (message: string) => {
    for (const p of pending.values()) p.reject(new Error(message))
    pending.clear()
    worker?.terminate()
    worker = null // a fresh worker is started on the next call
  }
  const ensure = () => {
    if (worker) return worker
    const w = makeWorker()
    w.onmessage = (e: MessageEvent<WorkerReply>) => {
      const r = e.data
      const p = pending.get(r.id)
      if (!p) return
      if ('type' in r) { p.onProgress?.(r.percent); return }
      pending.delete(r.id)
      if (r.ok) p.resolve(r.value)
      else p.reject(r.missing ? new ModelMissingError() : new Error(r.error))
    }
    w.onerror = (e: ErrorEvent) => failAll(e.message || 'The AI stopped working.')
    worker = w
    return w
  }
  const call = <T>(req: WithoutId<WorkerRequest>, onProgress?: (percent: number) => void) =>
    new Promise<T>((resolve, reject) => {
      const id = nextId++
      pending.set(id, { resolve: v => resolve(v as T), reject, onProgress })
      ensure().postMessage({ ...req, id })
    })

  return {
    checkSupport: () => call({ type: 'support' }),
    download: onProgress => call({ type: 'download', ortBase }, onProgress),
    load: () => call({ type: 'load', ortBase }),
    generate: messages => call({ type: 'generate', messages }),
    remove: () => call({ type: 'remove' }),
  }
}
