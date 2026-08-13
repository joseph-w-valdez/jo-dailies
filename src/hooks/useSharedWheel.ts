import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { useCallback, useEffect, useRef, useState } from 'react'
import { db, syncRoomId, toFirestoreData } from '../lib/firebase'
import { withBumpedVersion } from '../lib/gameCommit'
import { updateSyncSource } from '../lib/syncStatus'
import {
  createInitialWheel,
  normalizeWheel,
  wheelToDoc,
  type WheelRoomState,
} from '../lib/wheel'
import { useFirebaseAuth } from './firebaseAuthContext'

function wheelDocRef() {
  return doc(db, 'rooms', syncRoomId, 'wheel', 'current')
}

export function useSharedWheel() {
  const { user } = useFirebaseAuth()
  const [wheel, setWheel] = useState<WheelRoomState>(() => createInitialWheel())
  const [ready, setReady] = useState(false)
  const wheelRef = useRef(wheel)
  wheelRef.current = wheel
  const pendingVersionRef = useRef<number | null>(null)

  useEffect(() => {
    if (!user) {
      setReady(true)
      updateSyncSource('wheel', null)
      return
    }
    const unsub = onSnapshot(
      wheelDocRef(),
      { includeMetadataChanges: true },
      (snap) => {
        updateSyncSource('wheel', {
          pending: snap.metadata.hasPendingWrites,
          fromCache: snap.metadata.fromCache,
        })
        if (!snap.exists()) {
          const seed = createInitialWheel()
          void setDoc(wheelDocRef(), toFirestoreData(wheelToDoc(seed)))
          setWheel(seed)
          wheelRef.current = seed
          setReady(true)
          return
        }
        const remote = normalizeWheel(snap.data())
        if (
          pendingVersionRef.current !== null &&
          remote.version < pendingVersionRef.current
        ) {
          setReady(true)
          return
        }
        if (
          pendingVersionRef.current !== null &&
          remote.version >= pendingVersionRef.current
        ) {
          pendingVersionRef.current = null
        }
        wheelRef.current = remote
        setWheel(remote)
        setReady(true)
      },
      (error) => {
        console.error('wheel sync', error)
        updateSyncSource('wheel', {
          pending: false,
          fromCache: false,
          error: true,
        })
        setReady(true)
      },
    )
    return () => {
      unsub()
      updateSyncSource('wheel', null)
    }
  }, [user])

  const commitWheel = useCallback(
    async (
      next: WheelRoomState | ((prev: WheelRoomState) => WheelRoomState),
    ) => {
      const base = typeof next === 'function' ? next(wheelRef.current) : next
      const resolved = withBumpedVersion(base, wheelRef.current.version)
      wheelRef.current = resolved
      pendingVersionRef.current = resolved.version
      setWheel(resolved)
      try {
        await setDoc(wheelDocRef(), toFirestoreData(wheelToDoc(resolved)))
      } catch (error) {
        console.error('Could not save wheel', error)
      }
    },
    [],
  )

  return {
    wheel,
    ready,
    commitWheel,
  }
}
