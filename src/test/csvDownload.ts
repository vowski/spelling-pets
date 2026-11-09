import { vi } from 'vitest'

/** Captures what a CSV download would save: its file name and its text (without the byte order mark). */
export function catchCsvDownload(): () => Promise<{ name: string; text: string }> {
  let blob: Blob | undefined
  let name = ''
  Object.assign(URL, { createObjectURL: vi.fn((b: Blob) => { blob = b; return 'blob:csv' }), revokeObjectURL: vi.fn() })
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { name = this.download })
  return async () => ({ name, text: (await blob!.text()).replace(/^﻿/, '') })
}
