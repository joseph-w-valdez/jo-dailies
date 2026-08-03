import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
} from 'firebase/firestore'
import { useCallback, useEffect, useRef, useState } from 'react'
import { db, syncRoomId } from '../lib/firebase'
import { updateSyncSource } from '../lib/syncStatus'
import {
  loadTogetherTodos,
  newTogetherTodoId,
  normalizeTogetherTodo,
  saveTogetherTodos,
  sortTogetherTodos,
  type TogetherTodo,
} from '../lib/togetherTodos'
import { useFirebaseAuth } from './firebaseAuthContext'

const MIGRATION_KEY = 'jo-dailies:firestore-together-todos-migrated:v1'

export function useTogetherTodos() {
  const { user } = useFirebaseAuth()
  const [items, setItems] = useState<TogetherTodo[]>(() => loadTogetherTodos())
  const itemsRef = useRef(items)
  itemsRef.current = items

  useEffect(() => {
    if (!user) return

    const todosRef = collection(db, 'rooms', syncRoomId, 'togetherTodos')
    const hadMigrated = localStorage.getItem(MIGRATION_KEY) === '1'
    const local = loadTogetherTodos()

    const unsubscribe = onSnapshot(
      todosRef,
      { includeMetadataChanges: true },
      (snapshot) => {
        updateSyncSource('together-todos', {
          pending: snapshot.metadata.hasPendingWrites,
          fromCache: snapshot.metadata.fromCache,
        })

        if (snapshot.empty && !hadMigrated && local.length > 0) return

        const next = sortTogetherTodos(
          snapshot.docs
            .map((itemDoc, index) =>
              normalizeTogetherTodo(
                { ...itemDoc.data(), id: itemDoc.id },
                index * 1024,
              ),
            )
            .filter((item): item is TogetherTodo => item !== null),
        )
        saveTogetherTodos(next)
        setItems(next)
      },
      (error) => {
        updateSyncSource('together-todos', {
          pending: false,
          fromCache: false,
          error: true,
        })
        console.error('Together todos sync failed', error)
      },
    )

    if (!hadMigrated) {
      const uploads = local.map((item) => setDoc(doc(todosRef, item.id), item))
      void Promise.all(uploads)
        .then(() => localStorage.setItem(MIGRATION_KEY, '1'))
        .catch((error: unknown) => {
          console.error('Could not migrate local together todos', error)
        })
    }

    return () => {
      unsubscribe()
      updateSyncSource('together-todos', null)
    }
  }, [user])

  useEffect(() => {
    saveTogetherTodos(items)
  }, [items])

  const add = useCallback((text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return
    const prev = itemsRef.current
    const item: TogetherTodo = {
      id: newTogetherTodoId(),
      text: trimmed,
      done: false,
      order:
        prev.length === 0
          ? 0
          : Math.min(...prev.map((existing) => existing.order)) - 1024,
      createdAt: Date.now(),
    }
    setItems((current) => sortTogetherTodos([item, ...current]))
    void setDoc(
      doc(db, 'rooms', syncRoomId, 'togetherTodos', item.id),
      item,
    ).catch((error: unknown) => {
      console.error('Could not add together todo', error)
    })
  }, [])

  const toggle = useCallback((id: string) => {
    const current = itemsRef.current.find((item) => item.id === id)
    if (!current) return
    const done = !current.done
    setItems((prev) =>
      sortTogetherTodos(
        prev.map((item) => (item.id === id ? { ...item, done } : item)),
      ),
    )
    void setDoc(
      doc(db, 'rooms', syncRoomId, 'togetherTodos', id),
      { done },
      { merge: true },
    ).catch((error: unknown) => {
      console.error('Could not toggle together todo', error)
    })
  }, [])

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id))
    void deleteDoc(doc(db, 'rooms', syncRoomId, 'togetherTodos', id)).catch(
      (error: unknown) => {
        console.error('Could not remove together todo', error)
      },
    )
  }, [])

  return { items, add, toggle, remove }
}
