import { describe, expect, it } from 'vitest'
import { parsePastedShoppingLines } from './pantry'

describe('parsePastedShoppingLines', () => {
  it('splits lines and commas', () => {
    const rows = parsePastedShoppingLines('milk\neggs, butter')
    expect(rows.map((r) => r.name)).toEqual(['milk', 'eggs', 'butter'])
  })

  it('parses leading qty', () => {
    const rows = parsePastedShoppingLines('2 lb chicken\nsalt')
    expect(rows[0]).toMatchObject({ name: 'chicken', quantity: 2, unit: 'lb' })
    expect(rows[1]).toEqual({ name: 'salt' })
  })
})
