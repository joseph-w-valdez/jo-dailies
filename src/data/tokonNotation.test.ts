import { describe, expect, it } from 'vitest'
import { parseLegacyComboText, tokenizeComboString } from '../data/tokonNotation'

describe('tokenizeComboString', () => {
  it('parses numpad + button combos', () => {
    expect(tokenizeComboString('5L > 5M > 236H')).toEqual([
      '5',
      'l',
      '>',
      '5',
      'm',
      '>',
      '236',
      'h',
    ])
  })

  it('parses air and hold notation', () => {
    expect(tokenizeComboString('j.5H > jc > j.2H')).toEqual([
      'j',
      '5',
      'h',
      '>',
      'jc',
      '>',
      'j',
      '2',
      'h',
    ])
  })

  it('parses charge brackets and dash', () => {
    expect(tokenizeComboString('[4]6L 66 j.M')).toEqual([
      '[',
      '4',
      ']',
      '6',
      'l',
      '66',
      'j',
      'm',
    ])
  })
})

describe('parseLegacyComboText', () => {
  it('imports legacy strings', () => {
    const { sequence } = parseLegacyComboText('5L>5M>236H')
    expect(sequence).toContain('l')
    expect(sequence).toContain('236')
  })
})
