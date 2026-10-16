import type { SettingsRow } from '../storage/db'

export const isValidPin = (pin: string) => /^\d{4}$/.test(pin)

export function newSalt(): string {
  return crypto.randomUUID()
}

export async function hashPin(pin: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${pin}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function checkPin(pin: string, s: Pick<SettingsRow, 'pinHash' | 'pinSalt'>): Promise<boolean> {
  return s.pinHash !== '' && (await hashPin(pin, s.pinSalt)) === s.pinHash
}
