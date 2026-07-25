import {
  collection,
  deleteField,
  doc,
  onSnapshot,
  setDoc,
} from 'firebase/firestore'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { EXTRA_IDS } from '../extras'
import { GAMES, GAME_IDS } from '../games'
import { db, syncRoomId } from '../lib/firebase'
import type { DayEntryId, GameId, Store } from '../types'
import { todayKey } from '../lib/date'
import { computeStreaks } from '../lib/streaks'
import { completedCount, isDone, load, save, setGameDone } from '../lib/storage'
import { updateSyncSource } from '../lib/syncStatus'
import { useFirebaseAuth } from './firebaseAuthContext'

const MIGRATION_KEY = 'jo-dailies:firestore-days-migrated:v1'
const ENTRY_IDS = new Set<DayEntryId>([...GAME_IDS, ...EXTRA_IDS])

export function useDailies() {
  const [store, setStore] = useState<Store>(() => load())
  const storeRef = useRef(store)
  const { user } = useFirebaseAuth()
  const today = todayKey()

  useEffect(() => {
    storeRef.current = store
  }, [store])

  useEffect(() => {
    if (!user) return

    const daysRef = collection(db, 'rooms', syncRoomId, 'days')
    const hadMigrated = localStorage.getItem(MIGRATION_KEY) === '1'
    const local = load()

    const unsubscribe = onSnapshot(
      daysRef,
      { includeMetadataChanges: true },
      (snapshot) => {
        updateSyncSource('dailies', {
          pending: snapshot.metadata.hasPendingWrites,
          fromCache: snapshot.metadata.fromCache,
        })

        if (
          snapshot.empty &&
          !hadMigrated &&
          Object.keys(local.days).length > 0
        ) {
          return
        }

        const days: Store['days'] = {}
        for (const dayDoc of snapshot.docs) {
          const data = dayDoc.data()
          const log: NonNullable<Store['days'][string]> = {}
          for (const [entryId, value] of Object.entries(data)) {
            if (value === true && ENTRY_IDS.has(entryId as DayEntryId)) {
              log[entryId as DayEntryId] = true
            }
          }
          if (Object.keys(log).length > 0) days[dayDoc.id] = log
        }
        const next: Store = { version: 1, days }
        save(next)
        storeRef.current = next
        setStore(next)
      },
      (error) => {
        updateSyncSource('dailies', {
          pending: false,
          fromCache: false,
          error: true,
        })
        console.error('Dailies sync failed', error)
      },
    )

    if (!hadMigrated) {
      const uploads = Object.entries(local.days).map(([dateKey, log]) =>
        setDoc(doc(daysRef, dateKey), log, { merge: true }),
      )
      void Promise.all(uploads)
        .then(() => localStorage.setItem(MIGRATION_KEY, '1'))
        .catch((error: unknown) => {
          console.error('Could not migrate local dailies', error)
        })
    }

    return () => {
      unsubscribe()
      updateSyncSource('dailies', null)
    }
  }, [user])

  const persistDone = useCallback(
    (dateKey: string, entryId: DayEntryId, done: boolean) => {
      const next = setGameDone(storeRef.current, dateKey, entryId, done)
      storeRef.current = next
      save(next)
      setStore(next)

      const dayRef = doc(db, 'rooms', syncRoomId, 'days', dateKey)
      void setDoc(
        dayRef,
        { [entryId]: done ? true : deleteField() },
        { merge: true },
      ).catch((error: unknown) => {
        console.error('Could not save daily', error)
      })
    },
    [],
  )

  const toggle = useCallback(
    (dateKey: string, entryId: DayEntryId) => {
      const done = !isDone(storeRef.current.days[dateKey], entryId)
      persistDone(dateKey, entryId, done)
    },
    [persistDone],
  )

  const setDone = useCallback(
    (dateKey: string, gameId: GameId, done: boolean) => {
      persistDone(dateKey, gameId, done)
    },
    [persistDone],
  )

  const openAndComplete = useCallback(
    (gameId: GameId) => {
      persistDone(today, gameId, true)
    },
    [persistDone, today],
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
