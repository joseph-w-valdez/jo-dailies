import { describe, expect, it } from 'vitest'
import {
  addWheelTab,
  buildWheelSegments,
  createInitialWheel,
  createWheelEntry,
  getActiveWheelTab,
  normalizeWheel,
  pickWheelColor,
  pickWeightedIndex,
  removeWheelTab,
  rotationForWinner,
  wheelSlicePath,
  WHEEL_COLORS,
  WHEEL_DEFAULT_TAB_NAME,
  WHEEL_OUTCOME_HOLD_MS,
  WHEEL_TAB_MAX,
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

  it('migrates legacy single-wheel docs into a Main tab', () => {
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
    expect(remote.tabs).toHaveLength(1)
    expect(remote.tabs[0]!.name).toBe(WHEEL_DEFAULT_TAB_NAME)
    expect(remote.activeTabId).toBe(remote.tabs[0]!.id)
    expect(getActiveWheelTab(remote).entries.map((e) => e.label)).toEqual([
      'watch anime',
      'play a game',
    ])
    expect(getActiveWheelTab(remote).rotation).toBe(90)
    expect(remote.version).toBe(4)
  })

  it('keeps an empty options list instead of inventing a default', () => {
    const empty = normalizeWheel({ entries: [], version: 2 })
    expect(getActiveWheelTab(empty).entries).toEqual([])
    expect(getActiveWheelTab(createInitialWheel()).entries).toEqual([])
  })

  it('keeps labels as typed', () => {
    expect(createWheelEntry('play valorant').label).toBe('play valorant')
    expect(createWheelEntry('  Say hi  ').label).toBe('Say hi')
  })

  it('picks unused then maximally distinct colors', () => {
    expect(pickWheelColor([])).toBe(WHEEL_COLORS[0])
    expect(pickWheelColor([WHEEL_COLORS[0]!])).not.toBe(WHEEL_COLORS[0])
    const withBlue = pickWheelColor(['#3d6ea8'])
    // Prefer something far from blue over another cool/green-blue neighbor
    expect(withBlue.toLowerCase()).not.toBe('#3d6ea8')
    const used = [WHEEL_COLORS[0]!, WHEEL_COLORS[3]!, WHEEL_COLORS[6]!]
    const next = pickWheelColor(used)
    expect(used.map((c) => c.toLowerCase())).not.toContain(next.toLowerCase())
  })

  it('expires stale finish state before UI can show it', () => {
    const fresh = normalizeWheel({
      entries: [{ id: 'a', label: 'Play Valorant', weight: 1, enabled: true }],
      winnerId: 'a',
      spinId: 'ws-1',
      version: 3,
      updatedAt: Date.now(),
    })
    const freshTab = getActiveWheelTab(fresh)
    expect(freshTab.winnerId).toBe('a')
    expect(freshTab.spinId).toBe('ws-1')

    const stale = normalizeWheel({
      entries: [{ id: 'a', label: 'Play Valorant', weight: 1, enabled: true }],
      winnerId: 'a',
      spinId: 'ws-1',
      version: 3,
      updatedAt: Date.now() - WHEEL_OUTCOME_HOLD_MS - 1_000,
    })
    const staleTab = getActiveWheelTab(stale)
    expect(staleTab.winnerId).toBeNull()
    expect(staleTab.spinId).toBeNull()
    expect(staleTab.entries).toHaveLength(1)
  })

  it('adds and removes extra wheel tabs', () => {
    let state = createInitialWheel()
    expect(state.tabs).toHaveLength(1)

    const withExtra = addWheelTab(state, 'Movies')
    expect(withExtra).not.toBeNull()
    state = withExtra!
    expect(state.tabs).toHaveLength(2)
    expect(state.tabs[1]!.name).toBe('Movies')
    expect(state.activeTabId).toBe(state.tabs[1]!.id)

    const removed = removeWheelTab(state, state.tabs[1]!.id)
    expect(removed).not.toBeNull()
    state = removed!
    expect(state.tabs).toHaveLength(1)
    expect(removeWheelTab(state, state.tabs[0]!.id)).toBeNull()

    for (let i = 1; i < WHEEL_TAB_MAX; i += 1) {
      const next = addWheelTab(state)
      expect(next).not.toBeNull()
      state = next!
    }
    expect(state.tabs).toHaveLength(WHEEL_TAB_MAX)
    expect(addWheelTab(state)).toBeNull()
  })

  it('reads multi-tab docs without wrapping again', () => {
    const remote = normalizeWheel({
      tabs: [
        {
          id: 't1',
          name: 'Main',
          entries: [{ id: 'a', label: 'one', weight: 1, enabled: true }],
          rotation: 0,
        },
        {
          id: 't2',
          name: 'Food',
          entries: [{ id: 'b', label: 'pizza', weight: 2, enabled: true }],
          rotation: 45,
        },
      ],
      activeTabId: 't2',
      version: 5,
      updatedAt: Date.now(),
    })
    expect(remote.tabs).toHaveLength(2)
    expect(remote.activeTabId).toBe('t2')
    expect(getActiveWheelTab(remote).entries[0]!.label).toBe('pizza')
  })
})
