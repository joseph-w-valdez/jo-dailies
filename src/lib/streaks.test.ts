import { describe, expect, it } from 'vitest'
import type { DayLog, Store } from '../types'
import { computeStreaks } from './streaks'

const allFour: DayLog = {
  connections: true,
  stackdown: true,
  chess: true,
  waffle: true,
}

const partial: DayLog = {
  connections: true,
  waffle: true,
}

function days(
  entries: Record<string, DayLog>,
): Store['days'] {
  return entries
}

describe('computeStreaks', () => {
  it('counts golden of 1 for a single all-four day', () => {
    const result = computeStreaks(
      days({ '2026-07-24': allFour }),
      '2026-07-24',
    )
    expect(result.current).toBe(1)
    expect(result.golden).toBe(1)
    expect(result.best).toBe(1)
    expect(result.goldenBest).toBe(1)
  })

  it('does not break streak when today is empty (grace)', () => {
    const result = computeStreaks(
      days({
        '2026-07-23': partial,
        '2026-07-22': partial,
      }),
      '2026-07-24',
    )
    expect(result.current).toBe(2)
    expect(result.golden).toBe(0)
  })

  it('breaks general streak on a gap', () => {
    const result = computeStreaks(
      days({
        '2026-07-24': partial,
        '2026-07-22': partial,
      }),
      '2026-07-24',
    )
    expect(result.current).toBe(1)
    expect(result.best).toBe(1)
  })

  it('keeps general streak on partial days and grants golden grace for incomplete today', () => {
    const result = computeStreaks(
      days({
        '2026-07-24': partial,
        '2026-07-23': allFour,
        '2026-07-22': allFour,
      }),
      '2026-07-24',
    )
    expect(result.current).toBe(3)
    // Incomplete today is not golden yet — grace skips to yesterday
    expect(result.golden).toBe(2)
    expect(result.goldenBest).toBe(2)
  })

  it('counts consecutive golden days including today', () => {
    const result = computeStreaks(
      days({
        '2026-07-24': allFour,
        '2026-07-23': allFour,
        '2026-07-22': allFour,
      }),
      '2026-07-24',
    )
    expect(result.current).toBe(3)
    expect(result.golden).toBe(3)
    expect(result.goldenBest).toBe(3)
  })

  it('tracks historical bests higher than current', () => {
    const result = computeStreaks(
      days({
        '2026-07-10': allFour,
        '2026-07-11': allFour,
        '2026-07-12': allFour,
        '2026-07-24': partial,
      }),
      '2026-07-24',
    )
    expect(result.current).toBe(1)
    expect(result.golden).toBe(0)
    expect(result.best).toBe(3)
    expect(result.goldenBest).toBe(3)
  })
})
