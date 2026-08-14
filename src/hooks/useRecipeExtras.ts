import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  increment,
} from 'firebase/firestore'
import { useCallback, useEffect, useState } from 'react'
import { db, syncRoomId, toFirestoreData } from '../lib/firebase'
import {
  normalizeCookLog,
  normalizeNote,
  clampCookStars,
  type CookingLog,
  type CookRating,
  type RecipeNote,
} from '../lib/recipes'
import { useFirebaseAuth } from './firebaseAuthContext'

export function useRecipeNotes(recipeId: string | undefined) {
  const { user } = useFirebaseAuth()
  const [notes, setNotes] = useState<RecipeNote[]>([])

  useEffect(() => {
    if (!user || !recipeId) {
      setNotes([])
      return
    }
    const col = collection(
      db,
      'rooms',
      syncRoomId,
      'recipes',
      recipeId,
      'notes',
    )
    return onSnapshot(col, (snapshot) => {
      const next = snapshot.docs
        .map((d) => normalizeNote({ ...d.data(), id: d.id }))
        .filter((n): n is RecipeNote => n !== null)
        .sort((a, b) => b.createdAt - a.createdAt)
      setNotes(next)
    })
  }, [user, recipeId])

  const addNote = useCallback(
    async (text: string, authorId: string, authorName: string) => {
      if (!recipeId) return
      const trimmed = text.trim()
      if (!trimmed) return
      const id = crypto.randomUUID()
      const note: RecipeNote = {
        id,
        authorId,
        authorName,
        text: trimmed,
        createdAt: Date.now(),
      }
      await setDoc(
        doc(db, 'rooms', syncRoomId, 'recipes', recipeId, 'notes', id),
        toFirestoreData(note),
      )
    },
    [recipeId],
  )

  const removeNote = useCallback(
    async (noteId: string) => {
      if (!recipeId) return
      await deleteDoc(
        doc(db, 'rooms', syncRoomId, 'recipes', recipeId, 'notes', noteId),
      )
    },
    [recipeId],
  )

  return { notes, addNote, removeNote }
}

export function useRecipeCooks(recipeId: string | undefined) {
  const { user } = useFirebaseAuth()
  const [cooks, setCooks] = useState<CookingLog[]>([])

  useEffect(() => {
    if (!user || !recipeId) {
      setCooks([])
      return
    }
    const col = collection(
      db,
      'rooms',
      syncRoomId,
      'recipes',
      recipeId,
      'cooks',
    )
    return onSnapshot(col, (snapshot) => {
      const next = snapshot.docs
        .map((d) => normalizeCookLog({ ...d.data(), id: d.id }))
        .filter((c): c is CookingLog => c !== null)
        .sort((a, b) => b.date - a.date)
      setCooks(next)
    })
  }, [user, recipeId])

  const logCook = useCallback(
    async (input: {
      cookedBy: string
      servings: number
      notes?: string
      tags?: string[]
      stars?: number
      rating?: CookRating
    }) => {
      if (!recipeId) return
      const id = crypto.randomUUID()
      const now = Date.now()
      const tags: string[] = []
      if (Array.isArray(input.tags)) {
        for (const tag of input.tags) {
          const t = tag.trim()
          if (!t) continue
          if (tags.some((x) => x.toLowerCase() === t.toLowerCase())) continue
          tags.push(t)
        }
      }

      const stars = clampCookStars(input.stars ?? NaN)

      const log: CookingLog = {
        id,
        cookedBy: input.cookedBy,
        date: now,
        servings: input.servings,
        tags,
      }
      if (input.notes?.trim()) log.notes = input.notes.trim()
      if (stars != null) log.stars = stars
      if (input.rating) log.rating = input.rating

      await setDoc(
        doc(db, 'rooms', syncRoomId, 'recipes', recipeId, 'cooks', id),
        toFirestoreData(log),
      )
      await updateDoc(doc(db, 'rooms', syncRoomId, 'recipes', recipeId), {
        cookedCount: increment(1),
        lastCookedAt: now,
        updatedAt: now,
      })
    },
    [recipeId],
  )

  const removeCook = useCallback(
    async (cookId: string) => {
      if (!recipeId) return
      const remaining = cooks
        .filter((c) => c.id !== cookId)
        .sort((a, b) => b.date - a.date)
      await deleteDoc(
        doc(db, 'rooms', syncRoomId, 'recipes', recipeId, 'cooks', cookId),
      )
      await updateDoc(doc(db, 'rooms', syncRoomId, 'recipes', recipeId), {
        cookedCount: remaining.length,
        lastCookedAt: remaining[0]?.date ?? null,
        updatedAt: Date.now(),
      })
    },
    [recipeId, cooks],
  )

  return { cooks, logCook, removeCook }
}
