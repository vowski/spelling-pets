import { describe, it, expect } from 'vitest'
import { MODEL_CACHE, hasModelFiles, modelFileUrls, notEnoughSpace } from './modelCache'
import { TIP_MODEL } from './tipModel'

/** A stand-in for the browser's CacheStorage holding the given addresses under each cache name. */
function fakeCaches(contents: Record<string, string[]>) {
  return {
    has: async (name: string) => name in contents,
    open: async (name: string) => ({ keys: async () => (contents[name] ?? []).map(url => ({ url }) as Request) }) as unknown as Cache,
  }
}

describe('model cache (review I3)', () => {
  it('lists the six files Transformers.js caches for this model and revision', () => {
    const urls = modelFileUrls()
    expect(urls).toHaveLength(6)
    expect(urls).toContain(`https://huggingface.co/${TIP_MODEL.id}/resolve/${TIP_MODEL.revision}/onnx/model_q4.onnx_data`)
    expect(urls.every(u => u.includes(`/resolve/${TIP_MODEL.revision}/`))).toBe(true)
  })

  it('finds the model only when every file is cached', async () => {
    expect(await hasModelFiles(fakeCaches({ [MODEL_CACHE]: modelFileUrls() }))).toBe(true)
    expect(await hasModelFiles(fakeCaches({}))).toBe(false)
    expect(await hasModelFiles(fakeCaches({ [MODEL_CACHE]: modelFileUrls().slice(0, 5) }))).toBe(false)
    const otherRevision = modelFileUrls().map(u => u.replace(TIP_MODEL.revision, 'main'))
    expect(await hasModelFiles(fakeCaches({ [MODEL_CACHE]: otherRevision }))).toBe(false)
  })

  it('stops a download that the browser says there is no room for', async () => {
    const estimate = (quota: number | undefined, usage: number | undefined) => ({ estimate: async () => ({ quota, usage }) })
    expect(await notEnoughSpace(estimate(500e6, 0))).toMatch(/isn't enough free space/)
    expect(await notEnoughSpace(estimate(12e9, 9e8))).toBeNull()
    expect(await notEnoughSpace(estimate(undefined, undefined))).toBeNull() // can't tell: let it try
    expect(await notEnoughSpace(undefined)).toBeNull()
  })
})
