import { describe, it, expect } from 'vitest'
import { checkStorage } from './storageCheck'

describe('checkStorage', () => {
  it('is ok with a working IndexedDB', async () => {
    expect(await checkStorage()).toBe('ok')
  })
  it('reports unavailable when IndexedDB throws or errors', async () => {
    const throwing = { open: () => { throw new Error('denied') } } as unknown as IDBFactory
    expect(await checkStorage(throwing)).toBe('unavailable')
    const erroring = { open: () => { const req: { onerror?: () => void; onsuccess?: () => void } = {}; setTimeout(() => req.onerror?.(), 0); return req } } as unknown as IDBFactory
    expect(await checkStorage(erroring)).toBe('unavailable')
  })
})
