import { describe, expect, it } from 'vitest'
import { JENGA_PLAYER_UIDS } from './jenga'
import {
  applyClockAfterTurn,
  parseClockControl,
  startClockFields,
} from './gameClock'

const a = JENGA_PLAYER_UIDS[0]!
const b = JENGA_PLAYER_UIDS[1]!

describe('parseClockControl', () => {
  it('parses minutes and chess-style increment', () => {
    expect(parseClockControl('10')).toEqual({
      initialMs: 10 * 60_000,
      incrementMs: 0,
    })
    expect(parseClockControl('3+2')).toEqual({
      initialMs: 3 * 60_000,
      incrementMs: 2_000,
    })
    expect(parseClockControl('25 min')).toEqual({
      initialMs: 25 * 60_000,
      incrementMs: 0,
    })
    expect(parseClockControl(' 10 + 0 ')).toEqual({
      initialMs: 10 * 60_000,
      incrementMs: 0,
    })
  })

  it('rejects empty or nonsense', () => {
    expect(parseClockControl('')).toBeNull()
    expect(parseClockControl('blitz')).toBeNull()
    expect(parseClockControl('0')).toBeNull()
    expect(parseClockControl('999')).toBeNull()
  })
})

describe('applyClockAfterTurn', () => {
  it('adds Fischer increment when the turn switches', () => {
    const prev = {
      turnUid: a as string,
      ...startClockFields('timed', 180_000, 1_000, 2_000),
    }
    const { next, timedOutUid } = applyClockAfterTurn(
      prev,
      { ...prev, turnUid: b as string },
      6_000,
    )
    expect(timedOutUid).toBeNull()
    expect(next.clockMs[a]).toBe(180_000 - 5_000 + 2_000)
    expect(next.clockTurnStartedAt).toBe(6_000)
    expect(next.clockIncrementMs).toBe(2_000)
  })

  it('does not add increment on a flag', () => {
    const prev = {
      turnUid: a as string,
      ...startClockFields('timed', 5_000, 1_000, 2_000),
    }
    const { next, timedOutUid } = applyClockAfterTurn(
      prev,
      { ...prev, turnUid: b as string },
      7_000,
    )
    expect(timedOutUid).toBe(a)
    expect(next.clockMs[a]).toBe(0)
  })
})
