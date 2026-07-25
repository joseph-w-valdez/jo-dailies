import { GAME_IDS } from '../games'
import type { DayEntryId, DayLog, Store } from '../types'

export const STORAGE_KEY = 'joha-dailies:v1'

export function emptyStore(): Store {
  return { version: 1, days: {} }
}

export function load(): Store {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyStore()
    const parsed: unknown = JSON.parse(raw)
    if (!isStore(parsed)) return emptyStore()
    return parsed
  } catch {
    return emptyStore()
  }
}

export function save(store: Store): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

function isStore(value: unknown): value is Store {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  if (v.version !== 1) return false
  if (!v.days || typeof v.days !== 'object') return false
  return true
}

/** Only the four puzzle dailies count — fun extras are ignored. */
export function completedCount(log: DayLog | undefined): number {
  if (!log) return 0
  return GAME_IDS.reduce((n, id) => n + (log[id] ? 1 : 0), 0)
}

export function isDone(log: DayLog | undefined, entryId: DayEntryId): boolean {
  return Boolean(log?.[entryId])
}

export function setGameDone(
  store: Store,
  dateKey: string,
  entryId: DayEntryId,
  done: boolean,
): Store {
  const days = { ...store.days }
  const prev = { ...(days[dateKey] ?? {}) }

  if (done) {
    prev[entryId] = true
    days[dateKey] = prev
  } else {
    delete prev[entryId]
    if (Object.keys(prev).length === 0) {
      delete days[dateKey]
    } else {
      days[dateKey] = prev
    }
  }

  return { version: 1, days }
}
