import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  setDoc,
  writeBatch,
} from 'firebase/firestore'
import {
  onDisconnect,
  onValue,
  ref as rtdbRef,
  remove,
  set,
  update,
} from 'firebase/database'
import { useCallback, useEffect, useRef, useState } from 'react'
import { db, rtdb, syncRoomId, toFirestoreData } from '../lib/firebase'
import { updateSyncSource } from '../lib/syncStatus'
import {
  capWhiteboardStrokes,
  loadWhiteboard,
  mergeWhiteboardStrokes,
  normalizeWhiteboardStroke,
  normalizeWhiteboardStrokes,
  saveWhiteboard,
  sortWhiteboardStrokes,
  whiteboardStrokesContentEqual,
  type WhiteboardPoint,
  type WhiteboardStroke,
} from '../lib/whiteboard'
import { useFirebaseAuth } from './firebaseAuthContext'

const STROKES_MIGRATION_KEY = 'jo-dailies:firestore-whiteboard-strokes-v2:v1'
const LEGACY_MIGRATION_KEY = 'jo-dailies:firestore-whiteboard-migrated:v1'
/** Max undo/redo steps kept in memory. */
export const WHITEBOARD_HISTORY_LIMIT = 50

function strokesCollection() {
  return collection(db, 'rooms', syncRoomId, 'whiteboardStrokes')
}

function legacyDocRef() {
  return doc(db, 'rooms', syncRoomId, 'whiteboard', 'current')
}

function liveUserPath(uid: string) {
  return `rooms/${syncRoomId}/wbLive/${uid}`
}

export interface WhiteboardLivePeer {
  uid: string
  cursor: WhiteboardPoint | null
  draft: WhiteboardStroke | null
}

export function useWhiteboard() {
  const { user } = useFirebaseAuth()
  const [strokes, setStrokes] = useState<WhiteboardStroke[]>(() =>
    loadWhiteboard(),
  )
  const [livePeers, setLivePeers] = useState<WhiteboardLivePeer[]>([])
  const [canRedo, setCanRedo] = useState(false)
  const [undoDepth, setUndoDepth] = useState(0)

  const strokesRef = useRef(strokes)
  strokesRef.current = strokes
  const pendingIdsRef = useRef<Set<string>>(new Set())
  const clearingRef = useRef(false)
  const redoStackRef = useRef<WhiteboardStroke[]>([])
  const lastLiveWriteRef = useRef(0)

  const canUndo =
    strokes.length > 0 && undoDepth < WHITEBOARD_HISTORY_LIMIT

  useEffect(() => {
    if (!user) return

    const col = strokesCollection()
    const hadStrokesMigrated =
      localStorage.getItem(STROKES_MIGRATION_KEY) === '1'
    const local = loadWhiteboard()

    const unsubscribe = onSnapshot(
      col,
      { includeMetadataChanges: true },
      (snapshot) => {
        updateSyncSource('whiteboard', {
          pending: snapshot.metadata.hasPendingWrites,
          fromCache: snapshot.metadata.fromCache,
        })

        if (clearingRef.current && !snapshot.empty) return

        const remote = sortWhiteboardStrokes(
          snapshot.docs
            .map((itemDoc) =>
              normalizeWhiteboardStroke({
                ...itemDoc.data(),
                id: itemDoc.id,
              }),
            )
            .filter((item): item is WhiteboardStroke => item !== null),
        )

        if (snapshot.empty && !hadStrokesMigrated && local.length > 0) return

        if (remote.length === 0) {
          pendingIdsRef.current.clear()
          clearingRef.current = false
          if (strokesRef.current.length === 0) return
          saveWhiteboard([])
          setStrokes([])
          return
        }

        const localById = new Map(
          strokesRef.current.map((stroke) => [stroke.id, stroke]),
        )
        for (const stroke of remote) {
          const local = localById.get(stroke.id)
          // Keep in-flight local edits (group moves) until Firestore matches.
          if (
            pendingIdsRef.current.has(stroke.id) &&
            local &&
            !whiteboardStrokesContentEqual([local], [stroke])
          ) {
            continue
          }
          pendingIdsRef.current.delete(stroke.id)
        }

        const merged = mergeWhiteboardStrokes(
          remote,
          strokesRef.current,
          pendingIdsRef.current,
        )

        if (whiteboardStrokesContentEqual(merged, strokesRef.current)) return

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

    if (!hadStrokesMigrated) {
      void (async () => {
        try {
          const existing = await getDocs(col)
          if (!existing.empty) {
            localStorage.setItem(STROKES_MIGRATION_KEY, '1')
            localStorage.setItem(LEGACY_MIGRATION_KEY, '1')
            return
          }

          let toUpload = local
          if (toUpload.length === 0) {
            const legacy = await getDoc(legacyDocRef())
            if (legacy.exists()) {
              toUpload = normalizeWhiteboardStrokes(legacy.data())
            }
          }

          if (toUpload.length > 0) {
            const batch = writeBatch(db)
            for (const stroke of toUpload) {
              batch.set(
                doc(col, stroke.id),
                toFirestoreData({
                  ...stroke,
                  createdAt: stroke.createdAt || Date.now(),
                }),
              )
            }
            await batch.commit()
          }
          localStorage.setItem(STROKES_MIGRATION_KEY, '1')
          localStorage.setItem(LEGACY_MIGRATION_KEY, '1')
        } catch (error: unknown) {
          console.error('Could not migrate whiteboard strokes', error)
        }
      })()
    }

    return () => {
      unsubscribe()
      updateSyncSource('whiteboard', null)
    }
  }, [user])

  useEffect(() => {
    if (!user || !rtdb) {
      setLivePeers([])
      return
    }

    const roomLive = rtdbRef(rtdb, `rooms/${syncRoomId}/wbLive`)
    const selfRef = rtdbRef(rtdb, liveUserPath(user.uid))
    void onDisconnect(selfRef).remove()

    const unsubscribe = onValue(roomLive, (snapshot) => {
      const value = snapshot.val() as Record<
        string,
        {
          cursor?: WhiteboardPoint
          stroke?: WhiteboardStroke
        }
      > | null
      if (!value) {
        setLivePeers([])
        return
      }
      const peers: WhiteboardLivePeer[] = []
      for (const [uid, payload] of Object.entries(value)) {
        if (uid === user.uid) continue
        const draft = payload.stroke
          ? normalizeWhiteboardStroke(payload.stroke)
          : null
        const cursor =
          payload.cursor &&
          typeof payload.cursor.x === 'number' &&
          typeof payload.cursor.y === 'number'
            ? {
                x: Math.min(1, Math.max(0, payload.cursor.x)),
                y: Math.min(1, Math.max(0, payload.cursor.y)),
              }
            : null
        peers.push({ uid, cursor, draft })
      }
      setLivePeers(peers)
    })

    return () => {
      unsubscribe()
      void remove(selfRef).catch(() => {})
    }
  }, [user])

  useEffect(() => {
    saveWhiteboard(strokes)
  }, [strokes])

  const clearLiveStroke = useCallback(() => {
    if (!user || !rtdb) return
    void set(rtdbRef(rtdb, `${liveUserPath(user.uid)}/stroke`), null).catch(
      () => {},
    )
  }, [user])

  const publishLive = useCallback(
    (payload: {
      cursor?: WhiteboardPoint | null
      stroke?: WhiteboardStroke | null
    }) => {
      if (!user || !rtdb) return
      const now = Date.now()
      if (payload.stroke && now - lastLiveWriteRef.current < 40) return
      if (payload.stroke) lastLiveWriteRef.current = now
      const path = rtdbRef(rtdb, liveUserPath(user.uid))
      const data: Record<string, unknown> = {}
      if (payload.cursor !== undefined) data.cursor = payload.cursor
      if (payload.stroke !== undefined) data.stroke = payload.stroke
      void update(path, data).catch((error: unknown) => {
        console.error('Could not publish live whiteboard', error)
      })
    },
    [user],
  )

  const appendStroke = useCallback(
    (stroke: WhiteboardStroke, options?: { fromRedo?: boolean }) => {
      const withMeta: WhiteboardStroke = {
        ...stroke,
        createdAt: stroke.createdAt || Date.now(),
      }
      pendingIdsRef.current.add(withMeta.id)
      clearingRef.current = false
      if (!options?.fromRedo) {
        redoStackRef.current = []
        setCanRedo(false)
        setUndoDepth(0)
      }
      setStrokes((prev) => {
        if (prev.some((existing) => existing.id === withMeta.id)) return prev
        const next = capWhiteboardStrokes([...prev, withMeta])
        strokesRef.current = next
        return next
      })
      clearLiveStroke()

      void setDoc(
        doc(strokesCollection(), withMeta.id),
        toFirestoreData(withMeta),
      ).catch((error: unknown) => {
        console.error('Could not save whiteboard stroke', error)
      })
    },
    [clearLiveStroke],
  )

  const removeStroke = useCallback(async (id: string) => {
    pendingIdsRef.current.delete(id)
    setStrokes((prev) => {
      const next = prev.filter((stroke) => stroke.id !== id)
      strokesRef.current = next
      return next
    })
    try {
      await deleteDoc(doc(strokesCollection(), id))
    } catch (error: unknown) {
      console.error('Could not remove whiteboard stroke', error)
    }
  }, [])

  const updateStroke = useCallback((stroke: WhiteboardStroke) => {
    const withMeta: WhiteboardStroke = {
      ...stroke,
      createdAt: stroke.createdAt || Date.now(),
    }
    pendingIdsRef.current.add(withMeta.id)
    setStrokes((prev) => {
      const next = prev.map((existing) =>
        existing.id === withMeta.id ? withMeta : existing,
      )
      strokesRef.current = next
      return next
    })
    void setDoc(
      doc(strokesCollection(), withMeta.id),
      toFirestoreData(withMeta),
    ).catch((error: unknown) => {
      console.error('Could not update whiteboard stroke', error)
    })
  }, [])

  const updateStrokes = useCallback((nextStrokes: WhiteboardStroke[]) => {
    if (nextStrokes.length === 0) return
    const byId = new Map<string, WhiteboardStroke>()
    for (const stroke of nextStrokes) {
      const withMeta: WhiteboardStroke = {
        ...stroke,
        createdAt: stroke.createdAt || Date.now(),
      }
      pendingIdsRef.current.add(withMeta.id)
      byId.set(withMeta.id, withMeta)
    }
    setStrokes((prev) => {
      const next = prev.map((existing) => byId.get(existing.id) ?? existing)
      strokesRef.current = next
      return next
    })
    void (async () => {
      try {
        const list = [...byId.values()]
        for (let i = 0; i < list.length; i += 400) {
          const batch = writeBatch(db)
          for (const stroke of list.slice(i, i + 400)) {
            batch.set(
              doc(strokesCollection(), stroke.id),
              toFirestoreData(stroke),
            )
          }
          await batch.commit()
        }
      } catch (error: unknown) {
        console.error('Could not update whiteboard strokes', error)
      }
    })()
  }, [])

  /** Optimistic local edit while dragging — does not write until updateStroke. */
  const patchStrokeLocal = useCallback((stroke: WhiteboardStroke) => {
    pendingIdsRef.current.add(stroke.id)
    setStrokes((prev) => {
      const next = prev.map((existing) =>
        existing.id === stroke.id ? stroke : existing,
      )
      strokesRef.current = next
      return next
    })
  }, [])

  const undo = useCallback(() => {
    const list = strokesRef.current
    if (list.length === 0) return
    if (redoStackRef.current.length >= WHITEBOARD_HISTORY_LIMIT) return
    const last = list[list.length - 1]!
    redoStackRef.current.push(last)
    if (redoStackRef.current.length > WHITEBOARD_HISTORY_LIMIT) {
      redoStackRef.current.shift()
    }
    setCanRedo(true)
    setUndoDepth((depth) => Math.min(WHITEBOARD_HISTORY_LIMIT, depth + 1))
    void removeStroke(last.id)
  }, [removeStroke])

  const redo = useCallback(() => {
    const stroke = redoStackRef.current.pop()
    setCanRedo(redoStackRef.current.length > 0)
    if (!stroke) return
    setUndoDepth((depth) => Math.max(0, depth - 1))
    appendStroke(stroke, { fromRedo: true })
  }, [appendStroke])

  const clear = useCallback(() => {
    clearingRef.current = true
    pendingIdsRef.current.clear()
    redoStackRef.current = []
    setCanRedo(false)
    setUndoDepth(0)
    strokesRef.current = []
    setStrokes([])
    clearLiveStroke()

    void (async () => {
      try {
        const snapshot = await getDocs(strokesCollection())
        const docs = snapshot.docs
        for (let i = 0; i < docs.length; i += 400) {
          const batch = writeBatch(db)
          for (const item of docs.slice(i, i + 400)) {
            batch.delete(item.ref)
          }
          await batch.commit()
        }
        await setDoc(legacyDocRef(), { strokes: [], updatedAt: Date.now() })
        clearingRef.current = false
      } catch (error: unknown) {
        clearingRef.current = false
        console.error('Could not clear whiteboard', error)
      }
    })()
  }, [clearLiveStroke])

  return {
    strokes,
    livePeers,
    liveEnabled: Boolean(rtdb),
    canUndo,
    canRedo,
    appendStroke,
    updateStroke,
    updateStrokes,
    patchStrokeLocal,
    removeStroke,
    undo,
    redo,
    clear,
    publishLive,
    clearLiveStroke,
  }
}
