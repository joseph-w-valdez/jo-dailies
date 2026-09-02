import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { useCallback, useEffect, useRef, useState } from 'react'
import { db, syncRoomId, toFirestoreData } from '../lib/firebase'
import {
  createInitialTokon,
  normalizeTokon,
  type TokonData,
} from '../lib/tokon'
import { updateSyncSource } from '../lib/syncStatus'
import { useFirebaseAuth } from './firebaseAuthContext'

const SYNC_ID = 'tokon'

function tokonDoc() {
  return doc(db, 'rooms', syncRoomId, 'tokon', 'data')
}

export function useTokon() {
  const { user } = useFirebaseAuth()
  const [data, setData] = useState<TokonData>(() => createInitialTokon())
  const [ready, setReady] = useState(false)
  const dataRef = useRef(data)
  dataRef.current = data

  useEffect(() => {
    if (!user) {
      setData(createInitialTokon())
      setReady(false)
      updateSyncSource(SYNC_ID, null)
      return
    }

    const ref = tokonDoc()
    const unsub = onSnapshot(
      ref,
      { includeMetadataChanges: true },
      (snap) => {
        updateSyncSource(SYNC_ID, {
          pending: snap.metadata.hasPendingWrites,
          fromCache: snap.metadata.fromCache,
        })
        if (!snap.exists()) {
          const seed = createInitialTokon()
          void setDoc(ref, toFirestoreData(seed))
          setData(seed)
          dataRef.current = seed
          setReady(true)
          return
        }
        const next = normalizeTokon(snap.data())
        dataRef.current = next
        setData(next)
        setReady(true)
      },
      (error) => {
        console.error('tokon sync', error)
        updateSyncSource(SYNC_ID, { pending: false, fromCache: false, error: true })
        setReady(true)
      },
    )

    return () => {
      unsub()
      updateSyncSource(SYNC_ID, null)
    }
  }, [user])

  const commit = useCallback(
    async (next: TokonData | ((prev: TokonData) => TokonData)) => {
      if (!user) return
      const base = typeof next === 'function' ? next(dataRef.current) : next
      const resolved = {
        ...base,
        version: base.version + 1,
        updatedAt: Date.now(),
      }
      dataRef.current = resolved
      setData(resolved)
      try {
        await setDoc(tokonDoc(), toFirestoreData(resolved))
      } catch (error) {
        console.error('Could not save tokon', error)
      }
    },
    [user],
  )

  return { data, ready, signedIn: Boolean(user), commit }
}
