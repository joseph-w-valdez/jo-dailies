import { doc, onSnapshot, runTransaction, setDoc } from 'firebase/firestore'
import { useCallback, useEffect, useRef, useState } from 'react'
import { db, syncRoomId } from '../lib/firebase'
import { updateSyncSource } from '../lib/syncStatus'
import {
  capWhiteboardStrokes,
  loadWhiteboard,
  mergeWhiteboardStrokes,
  normalizeWhiteboardStrokes,
  saveWhiteboard,
  whiteboardStrokeIdsEqual,
  type WhiteboardStroke,
} from '../lib/whiteboard'
import { useFirebaseAuth } from './firebaseAuthContext'

const MIGRATION_KEY = 'jo-dailies:firestore-whiteboard-migrated:v1'

function whiteboardDocRef() {
  return doc(db, 'rooms', syncRoomId, 'whiteboard', 'current')
}

export function useWhiteboard() {
  const { user } = useFirebaseAuth()
  const [strokes, setStrokes] = useState<WhiteboardStroke[]>(() =>
    loadWhiteboard(),
  )
  const strokesRef = useRef(strokes)
  strokesRef.current = strokes
  /** Stroke ids we appended locally that may not appear in the server snapshot yet. */
  const pendingIdsRef = useRef<Set<string>>(new Set())
  /** Blocks snapshot merges from resurrecting strokes after a local clear. */
  const clearingRef = useRef(false)

  useEffect(() => {
    if (!user) return

    const ref = whiteboardDocRef()
    const hadMigrated = localStorage.getItem(MIGRATION_KEY) === '1'
    const local = loadWhiteboard()

    const unsubscribe = onSnapshot(
      ref,
      { includeMetadataChanges: true },
      (snapshot) => {
        updateSyncSource('whiteboard', {
          pending: snapshot.metadata.hasPendingWrites,
          fromCache: snapshot.metadata.fromCache,
        })

        if (!snapshot.exists()) {
          if (!hadMigrated && local.length > 0) return
          pendingIdsRef.current.clear()
          clearingRef.current = false
          if (strokesRef.current.length === 0) return
          saveWhiteboard([])
          setStrokes([])
          return
        }

        const remote = normalizeWhiteboardStrokes(snapshot.data())

        // Authoritative empty board (partner or local clear landed).
        if (remote.length === 0) {
          pendingIdsRef.current.clear()
          clearingRef.current = false
          if (strokesRef.current.length === 0) return
          saveWhiteboard([])
          setStrokes([])
          return
        }

        if (clearingRef.current) {
          // Local clear in flight; ignore non-empty snapshots until empty arrives
          // or the clear write fails (handled in clear()).
          return
        }

        // Drop pending ids the server already has.
        for (const stroke of remote) {
          pendingIdsRef.current.delete(stroke.id)
        }

        const merged = mergeWhiteboardStrokes(
          remote,
          strokesRef.current,
          pendingIdsRef.current,
        )

        if (whiteboardStrokeIdsEqual(merged, strokesRef.current)) return

        saveWhiteboard(merged)
        setStrokes(merged)
      },
      (error) => {
        updateSyncSource('whiteboard', {
          pending: false,
          fromCache: false,
          error: true,
        })
        console.error('Whiteboard sync failed', error)
      },
    )

    if (!hadMigrated && local.length > 0) {
      void setDoc(ref, { strokes: local, updatedAt: Date.now() })
        .then(() => localStorage.setItem(MIGRATION_KEY, '1'))
        .catch((error: unknown) => {
          console.error('Could not migrate local whiteboard', error)
        })
    } else if (!hadMigrated) {
      localStorage.setItem(MIGRATION_KEY, '1')
    }

    return () => {
      unsubscribe()
      updateSyncSource('whiteboard', null)
    }
  }, [user])

  useEffect(() => {
    saveWhiteboard(strokes)
  }, [strokes])

  const appendStroke = useCallback((stroke: WhiteboardStroke) => {
    pendingIdsRef.current.add(stroke.id)
    clearingRef.current = false
    setStrokes((prev) => {
      if (prev.some((existing) => existing.id === stroke.id)) return prev
      const next = capWhiteboardStrokes([...prev, stroke])
      strokesRef.current = next
      return next
    })

    void runTransaction(db, async (tx) => {
      const ref = whiteboardDocRef()
      const snapshot = await tx.get(ref)
      const remote = snapshot.exists()
        ? normalizeWhiteboardStrokes(snapshot.data())
        : []
      if (remote.some((existing) => existing.id === stroke.id)) {
        tx.set(ref, { strokes: remote, updatedAt: Date.now() })
        return
      }
      tx.set(ref, {
        strokes: capWhiteboardStrokes([...remote, stroke]),
        updatedAt: Date.now(),
      })
    }).catch((error: unknown) => {
      console.error('Could not save whiteboard stroke', error)
    })
  }, [])

  const clear = useCallback(() => {
    clearingRef.current = true
    pendingIdsRef.current.clear()
    strokesRef.current = []
    setStrokes([])
    void setDoc(whiteboardDocRef(), {
      strokes: [],
      updatedAt: Date.now(),
    })
      .then(() => {
        clearingRef.current = false
      })
      .catch((error: unknown) => {
        clearingRef.current = false
        console.error('Could not clear whiteboard', error)
      })
  }, [])

  return { strokes, appendStroke, clear }
}
