import { describe, expect, it } from 'vitest'
import {
  formatDisplayAmount,
  fromCanonical,
  scaleAmount,
  toCanonical,
} from './units'

describe('units', () => {
  it('converts lb to grams and back', () => {
    const canon = toCanonical(1, 'lb', 'mass')
    expect(canon.unit).toBe('g')
    expect(canon.amount).toBeCloseTo(453.592, 2)
    const us = fromCanonical(canon.amount, 'mass', 'us')
    expect(us.unit).toBe('lb')
    expect(us.amount).toBeCloseTo(1, 3)
  })

  it('converts cups to ml', () => {
    const canon = toCanonical(1, 'cup', 'volume')
    expect(canon.unit).toBe('ml')
    expect(canon.amount).toBe(240)
  })

  it('does not convert count', () => {
    const canon = toCanonical(2, 'onion', 'count')
    expect(canon).toEqual({ amount: 2, unit: 'onion' })
    const shown = fromCanonical(2, 'count', 'us', 'onion')
    expect(shown).toEqual({ amount: 2, unit: 'onion' })
  })

  it('scaleAmount respects scalable flag', () => {
    expect(scaleAmount(100, true, 2)).toBe(200)
    expect(scaleAmount(100, false, 2)).toBe(100)
  })

  it('formats US cup fractions', () => {
    expect(formatDisplayAmount(0.5, 'cup', 'volume', 'us')).toContain('½')
  })
})
