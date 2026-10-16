import { describe, it, expect } from 'vitest'
import { hashPin, checkPin, isValidPin, newSalt } from './pin'

describe('pin', () => {
  it('hashes deterministically with a salt', async () => {
    const h = await hashPin('1234', 'salt')
    expect(h).toMatch(/^[0-9a-f]{64}$/)
    expect(await hashPin('1234', 'salt')).toBe(h)
    expect(await hashPin('1234', 'other')).not.toBe(h)
  })
  it('checks a pin', async () => {
    const pinSalt = newSalt()
    const pinHash = await hashPin('2468', pinSalt)
    expect(await checkPin('2468', { pinHash, pinSalt })).toBe(true)
    expect(await checkPin('1111', { pinHash, pinSalt })).toBe(false)
  })
  it('validates 4 digits', () => {
    expect(isValidPin('0123')).toBe(true)
    expect(isValidPin('123')).toBe(false)
    expect(isValidPin('12a4')).toBe(false)
  })
})
