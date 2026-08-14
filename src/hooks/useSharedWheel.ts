import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore'
import {
  onValue,
  ref as rtdbRef,
  set as rtdbSet,
} from 'firebase/database'
import { useCallback, useEffect, useRef, useState } from 'react'
import { db, rtdb, syncRoomId, toFirestoreData } from '../lib/firebase'
import { withBumpedVersion } from '../lib/gameCommit'
import { updateSyncSource } from '../lib/syncStatus'
import {
  createInitialWheel,
  normalizeWheel,
  wheelToDoc,
  type WheelRoomState,
} from '../lib/wheel'
import { useFirebaseAuth } from './firebaseAuthContext'

function wheelFirestoreRef() {
  return doc(db, 'rooms', syncRoomId, 'wheel', 'current')
}

function wheelRtdbPath() {
  return `rooms/${syncRoomId}/wheel/current`
}

export function useSharedWheel() {
  const { user } = useFirebaseAuth()
  const [wheel, setWheel] = useState<WheelRoomState>(() => createInitialWheel())
  const [ready, setReady] = useState(false)
  const wheelRef = useRef(wheel)
  wheelRef.current = wheel
  const pendingVersionRef = useRef<number | null>(null)
  const liveEnabled = Boolean(rtdb)

  useEffect(() => {
    if (!user) {
      setReady(true)
      updateSyncSource('wheel', null)
      return
    }

    // Prefer RTDB for live option edits + spin sync; Firestore if RTDB unset.
    if (rtdb) {
      const path = rtdbRef(rtdb, wheelRtdbPath())
      let seeded = false

      const unsub = onValue(
        path,
        (snap) => {
          updateSyncSource('wheel', {
            pending: false,
            fromCache: false,
          })

          if (!snap.exists()) {
            if (seeded) {
              setReady(true)
              return
            }
            seeded = true
            void (async () => {
              try {
                const fs = await getDoc(wheelFirestoreRef())
                const seed = fs.exists()
                  ? normalizeWheel(fs.data())
                  : createInitialWheel()
                await rtdbSet(path, wheelToDoc(seed))
                wheelRef.current = seed
                setWheel(seed)
              } catch (error) {
                console.error('Could not seed wheel RTDB', error)
                const seed = createInitialWheel()
                await rtdbSet(path, wheelToDoc(seed)).catch(() => {})
                wheelRef.current = seed
                setWheel(seed)
              } finally {
                setReady(true)
              }
            })()
            return
          }

          const remote = normalizeWheel(snap.val())
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
          console.error('wheel RTDB sync', error)
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
    }

    const unsub = onSnapshot(
      wheelFirestoreRef(),
      { includeMetadataChanges: true },
      (snap) => {
        updateSyncSource('wheel', {
          pending: snap.metadata.hasPendingWrites,
          fromCache: snap.metadata.fromCache,
        })
        if (!snap.exists()) {
          const seed = createInitialWheel()
          void setDoc(wheelFirestoreRef(), toFirestoreData(wheelToDoc(seed)))
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
      const payload = wheelToDoc(resolved)
      try {
        if (rtdb) {
          await rtdbSet(rtdbRef(rtdb, wheelRtdbPath()), payload)
        } else {
          await setDoc(wheelFirestoreRef(), toFirestoreData(payload))
        }
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
    /** True when Realtime Database is configured for live sync. */
    liveEnabled,
  }
}
