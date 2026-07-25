import { GAME_COUNT } from '../games'
import type { DayLog, Streaks, Store } from '../types'
import { addDaysKey } from './date'
import { completedCount } from './storage'

function hasAny(log: DayLog | undefined): boolean {
  return completedCount(log) > 0
}

function isGolden(log: DayLog | undefined): boolean {
  return completedCount(log) >= GAME_COUNT
}

/**
 * Walks backward from today.
 * Empty today does not break a streak (grace) — count runs through yesterday.
 */
export function computeStreaks(
  days: Store['days'],
  today: string,
): Streaks {
  const current = walkStreak(days, today, hasAny)
  const golden = walkStreak(days, today, isGolden)
  const { best, goldenBest } = scanBests(days)

  return {
    current,
    best: Math.max(best, current),
    golden,
    goldenBest: Math.max(goldenBest, golden),
  }
}

function walkStreak(
  days: Store['days'],
  today: string,
  predicate: (log: DayLog | undefined) => boolean,
): number {
  let key = today

  // Grace: skip empty today so an unfinished day doesn't reset the streak.
  if (!predicate(days[key])) {
    key = addDaysKey(key, -1)
  }

  let count = 0
  // Cap walk to avoid infinite loops on bad data
  for (let i = 0; i < 10000; i++) {
    if (!predicate(days[key])) break
    count += 1
    key = addDaysKey(key, -1)
  }
  return count
}

/** Historical personal bests by scanning all recorded consecutive runs. */
function scanBests(days: Store['days']): { best: number; goldenBest: number } {
  const keys = Object.keys(days).sort()
  if (keys.length === 0) return { best: 0, goldenBest: 0 }

  let best = 0
  let goldenBest = 0
  let anyRun = 0
  let goldenRun = 0
  let prevKey: string | null = null

  for (const key of keys) {
    const contiguous = prevKey !== null && addDaysKey(prevKey, 1) === key
    const any = hasAny(days[key])
    const golden = isGolden(days[key])

    if (any) {
      anyRun = contiguous && anyRun > 0 ? anyRun + 1 : 1
      best = Math.max(best, anyRun)
    } else {
      anyRun = 0
    }

    if (golden) {
      goldenRun = contiguous && goldenRun > 0 ? goldenRun + 1 : 1
      goldenBest = Math.max(goldenBest, goldenRun)
    } else {
      goldenRun = 0
    }

    prevKey = key
  }

  return { best, goldenBest }
}
