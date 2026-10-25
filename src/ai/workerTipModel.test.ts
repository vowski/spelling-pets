import { describe, it, expect } from 'vitest'
import { ModelMissingError } from './tipModel'
import { createWorkerTipModel } from './workerTipModel'

type Msg = { id: number; type: string }
function fakeWorker(handle: (msg: Msg, reply: (res: unknown) => void, crash: (message: string) => void) => void) {
  const w = {
    onmessage: null as ((e: { data: unknown }) => void) | null,
    onerror: null as ((e: { message: string }) => void) | null,
    postMessage(msg: Msg) { handle(msg, res => queueMicrotask(() => w.onmessage?.({ data: res })), m => queueMicrotask(() => w.onerror?.({ message: m }))) },
    terminate() {},
  }
  return w as unknown as Worker
}

describe('createWorkerTipModel', () => {
  it('answers each request with the matching reply', async () => {
    const model = createWorkerTipModel(() => fakeWorker((msg, reply) => reply({ id: msg.id, ok: true, value: msg.type === 'generate' ? 'A tip.' : undefined })))
    const [a, b] = await Promise.all([model.generate([{ role: 'user', content: 'x' }]), model.load()])
    expect(a).toBe('A tip.')
    expect(b).toBeUndefined()
  })

  it('reports download progress, then finishes', async () => {
    const seen: number[] = []
    const model = createWorkerTipModel(() => fakeWorker((msg, reply) => {
      reply({ type: 'progress', id: msg.id, percent: 40 })
      reply({ type: 'progress', id: msg.id, percent: 100 })
      reply({ id: msg.id, ok: true })
    }))
    await model.download(p => seen.push(p))
    expect(seen).toEqual([40, 100])
  })

  it('passes on an error from the worker', async () => {
    const model = createWorkerTipModel(() => fakeWorker((msg, reply) => reply({ id: msg.id, ok: false, error: 'no network' })))
    await expect(model.download(() => {})).rejects.toThrow('no network')
  })

  it('reports a model that is no longer cached as its own error, so nothing downloads by itself (review I3)', async () => {
    const model = createWorkerTipModel(() => fakeWorker((msg, reply) => reply({ id: msg.id, ok: false, error: 'gone', missing: true })))
    await expect(model.load()).rejects.toBeInstanceOf(ModelMissingError)
  })

  it('rejects waiting calls when the worker crashes', async () => {
    const model = createWorkerTipModel(() => fakeWorker((_msg, _reply, crash) => crash('GPU lost')))
    await expect(model.generate([{ role: 'user', content: 'x' }])).rejects.toThrow('GPU lost')
  })
})
