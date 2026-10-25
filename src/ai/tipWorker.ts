// Web Worker: runs Gemma 3 1B with Transformers.js on WebGPU, off the main thread.
import { env, pipeline } from '@huggingface/transformers'
import { clearAiCaches, hasModelFiles, notEnoughSpace } from './modelCache'
import { MODEL_MISSING, MODEL_NOT_SAVED, TIP_MODEL } from './tipModel'
import type { WorkerReply, WorkerRequest } from './workerTipModel'

type Generate = ((messages: unknown, options: Record<string, unknown>) => Promise<{ generated_text: unknown }[]>) & { dispose?: () => Promise<void> }

let loading: Promise<Generate> | null = null
const reply = (r: WorkerReply) => (self as unknown as { postMessage(m: WorkerReply): void }).postMessage(r)

function load(id: number, ortBase: string, allowDownload: boolean): Promise<Generate> {
  if (loading) return loading
  env.allowLocalModels = false
  env.allowRemoteModels = allowDownload // warm-up loads the cached files only, never the network
  const onnx = env.backends.onnx as { wasm?: { wasmPaths?: string } }
  if (onnx.wasm) onnx.wasm.wasmPaths = ortBase // served by the app, so Hugging Face is the only outside download
  const files = new Map<string, { loaded: number; total: number }>()
  const p = pipeline('text-generation', TIP_MODEL.id, {
    device: 'webgpu',
    dtype: TIP_MODEL.dtype, // full-precision maths: half precision is broken on this laptop's GPU
    revision: TIP_MODEL.revision,
    progress_callback: (e: { status: string; file?: string; loaded?: number; total?: number }) => {
      if (e.status !== 'progress' || !e.file || !e.total) return
      files.set(e.file, { loaded: e.loaded ?? 0, total: e.total })
      let loaded = 0
      let total = 0
      for (const f of files.values()) { loaded += f.loaded; total += f.total }
      reply({ type: 'progress', id, percent: Math.min(100, (loaded / total) * 100) })
    },
  }) as unknown as Promise<Generate>
  loading = p
  p.catch(() => { if (loading === p) loading = null }) // allow a retry after a failed download
  return p
}

async function unload() {
  if (!loading) return
  try { await (await loading).dispose?.() } catch { /* already gone */ }
  loading = null
}

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const req = e.data
  try {
    if (req.type === 'support') {
      const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown> } }).gpu
      const adapter = await gpu?.requestAdapter()
      reply({ id: req.id, ok: true, value: adapter ? { ok: true } : { ok: false, reason: "This computer's graphics can't run the AI (no WebGPU)." } })
    } else if (req.type === 'load') {
      // A missing model is reported, never fetched: the grown-up chose the 0.9 GB download once, not on every start.
      if (!loading && !(await hasModelFiles(caches))) { reply({ id: req.id, ok: false, error: MODEL_MISSING, missing: true }); return }
      await load(req.id, req.ortBase, false)
      reply({ id: req.id, ok: true })
    } else if (req.type === 'download') {
      const full = loading ? null : await notEnoughSpace(navigator.storage)
      if (full) throw new Error(full)
      await load(req.id, req.ortBase, true)
      // Transformers.js only warns when it can't save a file, so check that the files really were kept.
      if (!(await hasModelFiles(caches))) { await unload(); throw new Error(MODEL_NOT_SAVED) }
      reply({ id: req.id, ok: true })
    } else if (req.type === 'generate') {
      if (!loading) throw new Error('The AI model is not loaded.')
      const generate = await loading
      const out = await generate(req.messages, { max_new_tokens: 60, do_sample: false, repetition_penalty: 1.05 })
      const text = out[0]?.generated_text
      const value = Array.isArray(text) ? String((text.at(-1) as { content?: string } | undefined)?.content ?? '') : String(text ?? '')
      reply({ id: req.id, ok: true, value: value.trim() })
    } else if (req.type === 'remove') {
      await unload()
      await clearAiCaches(caches)
      reply({ id: req.id, ok: true })
    }
  } catch (err) {
    reply({ id: req.id, ok: false, error: err instanceof Error ? err.message : String(err) })
  }
}
