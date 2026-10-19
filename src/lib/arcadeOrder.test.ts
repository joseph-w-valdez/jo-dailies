import { describe, expect, it } from 'vitest'
import {
  placePinned,
  playWeight,
  sortByFrecency,
  ARCADE_FRECENCY_HALF_LIFE_DAYS,
} from './arcadeOrder'

const DAY = 86_400_000
const NOW = 1_000 * DAY
const tiles = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]

describe('arcade frecency', () => {
  it('halves a play’s weight every half-life', () => {
    expect(playWeight(NOW, NOW)).toBe(1)
    expect(playWeight(NOW - ARCADE_FRECENCY_HALF_LIFE_DAYS * DAY, NOW)).toBeCloseTo(0.5)
  })

  it('ranks recent plays above a pile of old ones', () => {
    const old = Array.from({ length: 6 }, () => ({ gameId: 'a', at: NOW - 90 * DAY }))
    const recent = [
      { gameId: 'b', at: NOW - DAY },
      { gameId: 'b', at: NOW - 2 * DAY },
    ]
    expect(sortByFrecency(tiles, [...old, ...recent], NOW).map((t) => t.id)).toEqual([
      'b',
      'a',
      'c',
    ])
  })

  it('still rewards playing more often in the same window', () => {
    const plays = [
      { gameId: 'c', at: NOW - DAY },
      { gameId: 'c', at: NOW - DAY },
      { gameId: 'b', at: NOW - DAY },
    ]
    expect(sortByFrecency(tiles, plays, NOW).map((t) => t.id)).toEqual(['c', 'b', 'a'])
  })

  it('keeps the listed order with no plays', () => {
    expect(sortByFrecency(tiles, [], NOW).map((t) => t.id)).toEqual(['a', 'b', 'c'])
  })
})

describe('placePinned', () => {
  it('keeps pinned items at their slot and flows the rest around them', () => {
    const items = [
      { id: 'a' },
      { id: 'pin', pinnedIndex: 3 },
      { id: 'b' },
      { id: 'c' },
      { id: 'd' },
      { id: 'e' },
    ]
    expect(placePinned(items).map((t) => t.id)).toEqual(['a', 'b', 'c', 'pin', 'd', 'e'])
  })

  it('clamps a pin past the end of a short list', () => {
    expect(placePinned([{ id: 'a' }, { id: 'pin', pinnedIndex: 9 }]).map((t) => t.id)).toEqual([
      'a',
      'pin',
    ])
  })
})
