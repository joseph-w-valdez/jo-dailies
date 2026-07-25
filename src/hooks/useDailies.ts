import { useCallback, useMemo, useState } from 'react'
import { GAMES } from '../games'
import type { DayEntryId, GameId, Store } from '../types'
import { todayKey } from '../lib/date'
import { computeStreaks } from '../lib/streaks'
import { completedCount, isDone, load, save, setGameDone } from '../lib/storage'

export function useDailies() {
  const [store, setStore] = useState<Store>(() => load())
  const today = todayKey()

  const persist = useCallback((next: Store) => {
    save(next)
    setStore(next)
  }, [])

  const toggle = useCallback(
    (dateKey: string, entryId: DayEntryId) => {
      const done = !isDone(store.days[dateKey], entryId)
      persist(setGameDone(store, dateKey, entryId, done))
    },
    [persist, store],
  )

  const setDone = useCallback(
    (dateKey: string, gameId: GameId, done: boolean) => {
      persist(setGameDone(store, dateKey, gameId, done))
    },
    [persist, store],
  )

  const openAndComplete = useCallback(
    (gameId: GameId) => {
      persist(setGameDone(store, today, gameId, true))
    },
    [persist, store, today],
  )

  const openExternal = useCallback((gameId: GameId) => {
    const game = GAMES.find((g) => g.id === gameId)
    if (!game) return
    window.open(game.url, '_blank', 'noopener,noreferrer')
  }, [])

  const streaks = useMemo(
    () => computeStreaks(store.days, today),
    [store.days, today],
  )

  const todayLog = store.days[today]
  const todayCount = completedCount(todayLog)
  const todayGolden = todayCount >= GAMES.length

  return {
    store,
    today,
    streaks,
    todayCount,
    todayGolden,
    toggle,
    setDone,
    openAndComplete,
    openExternal,
    isDone: (dateKey: string, entryId: DayEntryId) =>
      isDone(store.days[dateKey], entryId),
    dayCount: (dateKey: string) => completedCount(store.days[dateKey]),
  }
}
