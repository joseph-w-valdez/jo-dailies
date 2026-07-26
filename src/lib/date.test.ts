import { describe, expect, it } from 'vitest'
import {
  APP_TIME_ZONE,
  addDaysKey,
  appTimeParts,
  calendarKey,
  msUntilNextAppMidnight,
  todayKey,
  toKey,
} from './date'

describe('Pacific app calendar', () => {
  it('exposes America/Los_Angeles as the shared zone', () => {
    expect(APP_TIME_ZONE).toBe('America/Los_Angeles')
  })

  it('formats an instant as Pacific YYYY-MM-DD', () => {
    // 2026-07-26 06:30 UTC = 2026-07-25 23:30 PDT (UTC-7)
    const eveningPt = new Date('2026-07-26T06:30:00.000Z')
    expect(toKey(eveningPt)).toBe('2026-07-25')

    // 2026-07-26 07:30 UTC = 2026-07-26 00:30 PDT
    const morningPt = new Date('2026-07-26T07:30:00.000Z')
    expect(toKey(morningPt)).toBe('2026-07-26')
  })

  it('builds calendar keys without timezone shifting', () => {
    expect(calendarKey(2026, 6, 26)).toBe('2026-07-26')
  })

  it('steps day keys on the calendar, not via local Date', () => {
    expect(addDaysKey('2026-07-26', -1)).toBe('2026-07-25')
    expect(addDaysKey('2026-03-01', -1)).toBe('2026-02-28')
  })

  it('schedules the next Pacific midnight after the current Pacific day', () => {
    const beforeMidnight = new Date('2026-07-26T06:59:00.000Z') // 23:59 PDT
    const ms = msUntilNextAppMidnight(beforeMidnight)
    expect(ms).toBeGreaterThan(0)
    expect(ms).toBeLessThanOrEqual(60_000)

    const after = new Date(beforeMidnight.getTime() + ms)
    expect(todayKey(after)).toBe('2026-07-26')
    expect(appTimeParts(after).hour).toBe(0)
  })
})
