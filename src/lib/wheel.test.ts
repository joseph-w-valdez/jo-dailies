import { describe, expect, it } from 'vitest'
import {
  buildWheelSegments,
  createInitialWheel,
  createWheelEntry,
  normalizeWheel,
  pickWeightedIndex,
  rotationForWinner,
  titleCaseLabel,
  wheelSlicePath,
  WHEEL_COLORS,
} from './wheel'

describe('wheel', () => {
  it('builds weighted segments that sum to 360', () => {
    const entries = [
      createWheelEntry('a', { weight: 4, color: WHEEL_COLORS[0] }),
      createWheelEntry('b', { weight: 1, color: WHEEL_COLORS[1] }),
      createWheelEntry('c', { weight: 1, color: WHEEL_COLORS[2] }),
    ]
    const segs = buildWheelSegments(entries)
    expect(segs).toHaveLength(3)
    expect(segs[0]!.endDeg - segs[0]!.startDeg).toBeCloseTo(240, 5)
    expect(segs[2]!.endDeg).toBeCloseTo(360, 5)
  })

  it('skips disabled entries', () => {
    const entries = [
      createWheelEntry('a', { weight: 1 }),
      createWheelEntry('b', { weight: 1, enabled: false }),
    ]
    expect(buildWheelSegments(entries)).toHaveLength(1)
  })

  it('picks by weight', () => {
    const entries = [
      createWheelEntry('heavy', { weight: 9 }),
      createWheelEntry('light', { weight: 1 }),
    ]
    expect(pickWeightedIndex(entries, () => 0)).toBe(0)
    expect(pickWeightedIndex(entries, () => 0.95)).toBe(1)
  })

  it('rotation lands in the winner segment under the right pointer', () => {
    const entries = [
      createWheelEntry('a', { weight: 1 }),
      createWheelEntry('b', { weight: 1 }),
    ]
    const segs = buildWheelSegments(entries)
    const rot = rotationForWinner(10, segs, 1, 3, () => 0.5)
    const underPointer = ((90 - rot) % 360 + 360) % 360
    expect(underPointer).toBeGreaterThanOrEqual(segs[1]!.startDeg)
    expect(underPointer).toBeLessThan(segs[1]!.endDeg)
  })

  it('draws a full-circle path for a single slice', () => {
    const path = wheelSlicePath(0, 0, 10, 0, 360)
    expect(path).toContain('A 10 10')
  })

  it('normalizes RTDB object-map entries', () => {
    const remote = normalizeWheel({
      entries: {
        0: {
          id: 'a',
          label: 'watch anime',
          weight: 1,
          enabled: true,
          color: '#fff',
        },
        1: {
          id: 'b',
          label: 'play a game',
          weight: 2,
          enabled: true,
          color: '#000',
        },
      },
      rotation: 90,
      version: 4,
      updatedAt: 1,
    })
    expect(remote.entries.map((e) => e.label)).toEqual([
      'Watch Anime',
      'Play a Game',
    ])
    expect(remote.rotation).toBe(90)
    expect(remote.version).toBe(4)
  })

  it('keeps an empty options list instead of inventing a default', () => {
    expect(normalizeWheel({ entries: [], version: 2 }).entries).toEqual([])
    expect(createInitialWheel().entries).toEqual([])
  })

  it('title-cases labels', () => {
    expect(titleCaseLabel('play valorant')).toBe('Play Valorant')
    expect(titleCaseLabel('watch a movie')).toBe('Watch a Movie')
    expect(titleCaseLabel('say hi to Joha')).toBe('Say Hi to Joha')
    expect(createWheelEntry('play a game').label).toBe('Play a Game')
  })
})
