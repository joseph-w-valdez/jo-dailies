import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  increment,
  onSnapshot,
  setDoc,
} from 'firebase/firestore'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { db, syncRoomId, toFirestoreData } from '../lib/firebase'
import {
  normalizeShoppingStat,
  type ShoppingStat,
} from '../lib/pantry'
import {
  guessShoppingCategory,
  groupShoppingItems,
  newShoppingItemId,
  normalizeShoppingItem,
  normalizeShoppingName,
  shoppingItemToDoc,
  type ShoppingCategory,
  type ShoppingItem,
} from '../lib/shopping'
import { updateSyncSource } from '../lib/syncStatus'
import { useFirebaseAuth } from './firebaseAuthContext'

const MIGRATION_KEY_PREFIX = 'jo-dailies:shopping-personal-migrated:v1:'

function userShoppingCol(uid: string) {
  return collection(db, 'rooms', syncRoomId, 'users', uid, 'shoppingItems')
}

function userStatsCol(uid: string) {
  return collection(db, 'rooms', syncRoomId, 'users', uid, 'shoppingStats')
}

/** Legacy shared list (pre–personal shopping). */
function legacyShoppingCol() {
  return collection(db, 'rooms', syncRoomId, 'shoppingItems')
}

export function useShopping() {
  const { user } = useFirebaseAuth()
  const uid = user?.uid
  const [items, setItems] = useState<ShoppingItem[]>([])
  const [stats, setStats] = useState<ShoppingStat[]>([])
  const [ready, setReady] = useState(false)
  const itemsRef = useRef(items)
  itemsRef.current = items

  useEffect(() => {
    if (!uid) {
      setItems([])
      setStats([])
      setReady(false)
      return
    }

    const migrationKey = MIGRATION_KEY_PREFIX + uid
    const migrateOnce = async () => {
      if (localStorage.getItem(migrationKey) === '1') return
      try {
        const personal = await getDocs(userShoppingCol(uid))
        if (!personal.empty) {
          localStorage.setItem(migrationKey, '1')
          return
        }
        const legacy = await getDocs(legacyShoppingCol())
        if (legacy.empty) {
          localStorage.setItem(migrationKey, '1')
          return
        }
        await Promise.all(
          legacy.docs.map((d) => {
            const item = normalizeShoppingItem({ ...d.data(), id: d.id })
            if (!item) return Promise.resolve()
            return setDoc(
              doc(userShoppingCol(uid), item.id),
              shoppingItemToDoc({ ...item, addedBy: uid }),
            )
          }),
        )
        localStorage.setItem(migrationKey, '1')
      } catch (error) {
        console.error('Shopping personal migration failed', error)
      }
    }
    void migrateOnce()

    const unsubItems = onSnapshot(
      userShoppingCol(uid),
      { includeMetadataChanges: true },
      (snapshot) => {
        updateSyncSource('shopping', {
          pending: snapshot.metadata.hasPendingWrites,
          fromCache: snapshot.metadata.fromCache,
        })
        const next = snapshot.docs
          .map((d) => normalizeShoppingItem({ ...d.data(), id: d.id }))
          .filter((i): i is ShoppingItem => i !== null)
        setItems(next)
        setReady(true)
      },
      (error) => {
        updateSyncSource('shopping', {
          pending: false,
          fromCache: false,
          error: true,
        })
        console.error('Shopping sync failed', error)
        setReady(true)
      },
    )
    const unsubStats = onSnapshot(userStatsCol(uid), (snapshot) => {
      const next = snapshot.docs
        .map((d) => normalizeShoppingStat({ ...d.data(), nameKey: d.id }))
        .filter((s): s is ShoppingStat => s !== null)
        .sort(
          (a, b) =>
            b.count - a.count || b.lastCompletedAt - a.lastCompletedAt,
        )
      setStats(next)
    })
    return () => {
      unsubItems()
      unsubStats()
      updateSyncSource('shopping', null)
    }
  }, [uid])

  const bumpStat = useCallback(
    async (name: string) => {
      if (!uid) return
      const nameKey = normalizeShoppingName(name)
      if (!nameKey) return
      const ref = doc(userStatsCol(uid), nameKey.replace(/\//g, '_'))
      await setDoc(
        ref,
        toFirestoreData({
          nameKey,
          name: name.trim(),
          count: increment(1),
          lastCompletedAt: Date.now(),
        }),
        { merge: true },
      )
    },
    [uid],
  )

  const upsert = useCallback(
    async (item: ShoppingItem) => {
      if (!uid) return
      setItems((prev) => {
        const idx = prev.findIndex((p) => p.id === item.id)
        if (idx < 0) return [...prev, item]
        const next = [...prev]
        next[idx] = item
        return next
      })
      await setDoc(doc(userShoppingCol(uid), item.id), shoppingItemToDoc(item))
    },
    [uid],
  )

  const addManual = useCallback(
    async (input: {
      name: string
      quantity?: number
      unit?: string
      category?: ShoppingCategory
      pinned?: boolean
    }) => {
      if (!uid) return null
      const name = input.name.trim()
      if (!name) return null
      const openKeys = new Set(
        itemsRef.current
          .filter((i) => !i.completed)
          .map((i) => normalizeShoppingName(i.name)),
      )
      if (openKeys.has(normalizeShoppingName(name))) return null
      const item: ShoppingItem = {
        id: newShoppingItemId(),
        name,
        category: input.category ?? guessShoppingCategory(name),
        completed: false,
        addedBy: uid,
        source: 'manual',
        createdAt: Date.now(),
      }
      if (input.quantity && input.quantity > 0) item.quantity = input.quantity
      if (input.unit?.trim()) item.unit = input.unit.trim()
      if (input.pinned) item.pinned = true
      await upsert(item)
      return item
    },
    [upsert, uid],
  )

  const toggleComplete = useCallback(
    async (id: string) => {
      const current = itemsRef.current.find((i) => i.id === id)
      if (!current) return
      const completed = !current.completed
      const next: ShoppingItem = { ...current, completed }
      if (completed) {
        next.completedAt = Date.now()
        void bumpStat(current.name)
      } else {
        delete next.completedAt
      }
      await upsert(next)
    },
    [upsert, bumpStat],
  )

  const togglePin = useCallback(
    async (id: string) => {
      const current = itemsRef.current.find((i) => i.id === id)
      if (!current || current.completed) return
      const next: ShoppingItem = { ...current }
      if (current.pinned) delete next.pinned
      else next.pinned = true
      await upsert(next)
    },
    [upsert],
  )

  const updateItem = useCallback(
    async (
      id: string,
      patch: Partial<
        Pick<ShoppingItem, 'name' | 'quantity' | 'unit' | 'category' | 'pinned'>
      >,
    ) => {
      const current = itemsRef.current.find((i) => i.id === id)
      if (!current) return
      const next: ShoppingItem = { ...current, ...patch }
      if (patch.name !== undefined) next.name = patch.name.trim() || current.name
      if (patch.quantity !== undefined) {
        if (patch.quantity > 0) next.quantity = patch.quantity
        else delete next.quantity
      }
      if (patch.unit !== undefined) {
        if (patch.unit.trim()) next.unit = patch.unit.trim()
        else delete next.unit
      }
      if (patch.pinned === false) delete next.pinned
      await upsert(next)
    },
    [upsert],
  )

  const removeItem = useCallback(
    async (id: string) => {
      if (!uid) return
      setItems((prev) => prev.filter((i) => i.id !== id))
      await deleteDoc(doc(userShoppingCol(uid), id))
    },
    [uid],
  )

  const clearDone = useCallback(async () => {
    if (!uid) return
    const done = itemsRef.current.filter((i) => i.completed)
    setItems((prev) => prev.filter((i) => !i.completed))
    await Promise.all(
      done.map((i) => deleteDoc(doc(userShoppingCol(uid), i.id))),
    )
  }, [uid])

  const addFromRecipe = useCallback(
    async (
      rows: { name: string; quantity?: number; unit?: string }[],
      recipeId: string,
    ): Promise<{
      added: string[]
      skipped: string[]
    }> => {
      if (!uid) {
        return { added: [], skipped: [] }
      }
      const openKeys = new Set(
        itemsRef.current
          .filter((i) => !i.completed)
          .map((i) => normalizeShoppingName(i.name)),
      )
      const added: string[] = []
      const skipped: string[] = []
      const writes: Promise<void>[] = []

      for (const row of rows) {
        const name = row.name.trim()
        if (!name) continue
        const key = normalizeShoppingName(name)
        if (openKeys.has(key)) {
          skipped.push(name)
          continue
        }
        openKeys.add(key)
        const item: ShoppingItem = {
          id: newShoppingItemId(),
          name,
          category: guessShoppingCategory(name),
          completed: false,
          addedBy: uid,
          source: 'recipe',
          sourceRecipeId: recipeId,
          createdAt: Date.now(),
        }
        if (row.quantity && row.quantity > 0) item.quantity = row.quantity
        if (row.unit?.trim()) item.unit = row.unit.trim()
        added.push(name)
        writes.push(upsert(item))
      }
      await Promise.all(writes)
      return { added, skipped }
    },
    [upsert, uid],
  )

  const addParsedLines = useCallback(
    async (
      lines: { name: string; quantity?: number; unit?: string }[],
    ): Promise<{ added: string[]; skipped: string[] }> => {
      const added: string[] = []
      const skipped: string[] = []
      for (const line of lines) {
        const result = await addManual(line)
        if (result) added.push(result.name)
        else if (line.name.trim()) skipped.push(line.name.trim())
      }
      return { added, skipped }
    },
    [addManual],
  )

  const frequentChips = useMemo(() => {
    const openKeys = new Set(
      items
        .filter((i) => !i.completed)
        .map((i) => normalizeShoppingName(i.name)),
    )
    return stats
      .filter((s) => s.count >= 1 && !openKeys.has(s.nameKey))
      .slice(0, 8)
  }, [stats, items])

  const grouped = groupShoppingItems(items)

  return {
    items,
    ready,
    grouped,
    frequentChips,
    addManual,
    addParsedLines,
    toggleComplete,
    togglePin,
    updateItem,
    removeItem,
    clearDone,
    addFromRecipe,
  }
}
