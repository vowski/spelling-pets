import { describe, it, expect, vi, afterEach } from 'vitest'
import { csvFileName, downloadCsv, toCsv } from './csv'

describe('toCsv', () => {
  it('writes rows with CRLF line ends, numbers as numbers and blanks for missing values', () => {
    expect(toCsv([['Word', 'Correct', 'Accuracy (%)'], ['said', 3, 75], ['was', 0, null], []])).toBe('Word,Correct,Accuracy (%)\r\nsaid,3,75\r\nwas,0,\r\n')
  })

  it('quotes commas, quotes and line breaks', () => {
    expect(toCsv([['a, b', 'say "hi"', 'one\ntwo']])).toBe('"a, b","say ""hi""","one\ntwo"')
  })

  // Her typed spellings go into the file, so nothing she types may run as a spreadsheet formula (CSV injection).
  it('stops text that a spreadsheet would treat as a formula', () => {
    expect(toCsv([['=1+1', '+cat', '-dog', '@sum', 'a=b', -3]])).toBe("'=1+1,'+cat,'-dog,'@sum,a=b,-3")
  })
})

describe('downloadCsv', () => {
  afterEach(() => vi.restoreAllMocks())

  it('saves a UTF-8 file Excel opens correctly, with the given name', async () => {
    let blob: Blob | undefined
    Object.assign(URL, { createObjectURL: vi.fn((b: Blob) => { blob = b; return 'blob:csv' }), revokeObjectURL: vi.fn() })
    let name = ''
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { name = this.download })
    downloadCsv('spelling-pets-words-2026-11-09.csv', 'Word\r\nsaid ✓')
    expect(name).toBe('spelling-pets-words-2026-11-09.csv')
    expect(blob!.type).toBe('text/csv;charset=utf-8')
    const bytes = new Uint8Array(await blob!.arrayBuffer())
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]) // byte order mark, so Excel reads it as UTF-8
    expect(new TextDecoder().decode(bytes.slice(3))).toBe('Word\r\nsaid ✓')
  })

  it('names files after what they hold and the day', () => {
    expect(csvFileName('overview', '2026-11-09')).toBe('spelling-pets-overview-2026-11-09.csv')
  })
})
