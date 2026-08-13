import { describe, expect, it } from 'vitest'
import {
  buildWheelSegments,
  createWheelEntry,
  pickWeightedIndex,
  rotationForWinner,
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

  it('rotation lands in the winner segment under the top pointer', () => {
    const entries = [
      createWheelEntry('a', { weight: 1 }),
      createWheelEntry('b', { weight: 1 }),
    ]
    const segs = buildWheelSegments(entries)
    const rot = rotationForWinner(10, segs, 1, 3, () => 0.5)
    const underPointer = ((-rot) % 360 + 360) % 360
    expect(underPointer).toBeGreaterThanOrEqual(segs[1]!.startDeg)
    expect(underPointer).toBeLessThan(segs[1]!.endDeg)
  })

  it('draws a full-circle path for a single slice', () => {
    const path = wheelSlicePath(0, 0, 10, 0, 360)
    expect(path).toContain('A 10 10')
  })
})
