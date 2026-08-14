import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
} from 'firebase/storage'
import { useCallback, useEffect, useState } from 'react'
import { db, storage, syncRoomId, toFirestoreData } from '../lib/firebase'
import {
  normalizeRecipe,
  recipeToDoc,
  type Recipe,
} from '../lib/recipes'
import { updateSyncSource } from '../lib/syncStatus'
import { useFirebaseAuth } from './firebaseAuthContext'

const MAX_IMAGE_EDGE = 1600
const JPEG_QUALITY = 0.85

async function resizeImageFile(file: File): Promise<Blob> {
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    // Fallback for formats createImageBitmap rejects (some HEIC / odd MIME).
    const url = URL.createObjectURL(file)
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image()
        el.onload = () => resolve(el)
        el.onerror = () => reject(new Error('Could not read image'))
        el.src = url
      })
      bitmap = await createImageBitmap(img)
    } finally {
      URL.revokeObjectURL(url)
    }
  }
  const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height))
  const w = Math.max(1, Math.round(bitmap.width * scale))
  const h = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not resize image')
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close()
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('encode failed'))),
      'image/jpeg',
      JPEG_QUALITY,
    )
  })
}

function recipesCol() {
  return collection(db, 'rooms', syncRoomId, 'recipes')
}

export function useRecipes() {
  const { user } = useFirebaseAuth()
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!user) {
      setRecipes([])
      setReady(false)
      return
    }

    const unsubscribe = onSnapshot(
      recipesCol(),
      { includeMetadataChanges: true },
      (snapshot) => {
        updateSyncSource('recipes', {
          pending: snapshot.metadata.hasPendingWrites,
          fromCache: snapshot.metadata.fromCache,
        })
        const next = snapshot.docs
          .map((d) => normalizeRecipe({ ...d.data(), id: d.id }))
          .filter((r): r is Recipe => r !== null)
        setRecipes(next)
        setReady(true)
      },
      (error) => {
        updateSyncSource('recipes', {
          pending: false,
          fromCache: false,
          error: true,
        })
        console.error('Recipes sync failed', error)
        setReady(true)
      },
    )

    return () => {
      unsubscribe()
      updateSyncSource('recipes', null)
    }
  }, [user])

  const saveRecipe = useCallback(async (recipe: Recipe) => {
    const next = { ...recipe, updatedAt: Date.now() }
    await setDoc(doc(recipesCol(), next.id), recipeToDoc(next))
    return next
  }, [])

  const deleteRecipe = useCallback(async (recipe: Recipe) => {
    if (recipe.storagePath) {
      try {
        await deleteObject(ref(storage, recipe.storagePath))
      } catch (error) {
        console.error('Could not delete recipe image', error)
      }
    }
    try {
      for (const sub of ['notes', 'cooks'] as const) {
        const snap = await getDocs(
          collection(db, 'rooms', syncRoomId, 'recipes', recipe.id, sub),
        )
        await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)))
      }
    } catch (error) {
      console.error('Could not clear recipe subcollections', error)
    }
    await deleteDoc(doc(recipesCol(), recipe.id))
  }, [])

  const uploadRecipeImage = useCallback(
    async (recipeId: string, file: File) => {
      const blob = await resizeImageFile(file)
      const storagePath = `rooms/${syncRoomId}/recipes/${recipeId}.jpg`
      const storageRef = ref(storage, storagePath)
      await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' })
      const imageUrl = await getDownloadURL(storageRef)
      return { imageUrl, storagePath }
    },
    [],
  )

  const deleteRecipeImage = useCallback(async (storagePath: string) => {
    try {
      await deleteObject(ref(storage, storagePath))
    } catch (error) {
      console.error('Could not delete recipe image', error)
    }
  }, [])

  const toggleFavorite = useCallback(
    async (recipe: Recipe, uid: string) => {
      const has = recipe.favoriteUids.includes(uid)
      const favoriteUids = has
        ? recipe.favoriteUids.filter((id) => id !== uid)
        : [...recipe.favoriteUids, uid]
      const favRef = doc(
        db,
        'rooms',
        syncRoomId,
        'users',
        uid,
        'favorites',
        recipe.id,
      )
      if (has) {
        await deleteDoc(favRef)
      } else {
        await setDoc(favRef, { createdAt: Date.now() })
      }
      await updateDoc(doc(recipesCol(), recipe.id), toFirestoreData({
        favoriteUids,
        updatedAt: Date.now(),
      }))
    },
    [],
  )

  return {
    recipes,
    ready,
    saveRecipe,
    deleteRecipe,
    uploadRecipeImage,
    deleteRecipeImage,
    toggleFavorite,
  }
}
