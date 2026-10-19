import {
  onDisconnect,
  onValue,
  ref as rtdbRef,
  remove,
  serverTimestamp,
  set,
} from 'firebase/database'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { rtdb, syncRoomId } from '../lib/firebase'
import { JENGA_PLAYER_UIDS } from '../lib/jenga'
import {
  normalizeWhiteboardStroke,
  sortWhiteboardStrokes,
  type WhiteboardStroke,
} from '../lib/whiteboard'
import { useFirebaseAuth } from './firebaseAuthContext'

const LIVE_ROOT = `rooms/${syncRoomId}/pictionaryLive`
const DRAFT_THROTTLE_MS = 40

/** RTDB keys can't contain . # $ [ ] / */
export function pictionaryRoundKey(roundId: string, roundIndex: number): string {
  return `${roundId.replace(/[.#$[\]/]/g, '-')}_${roundIndex}`
}

function roundPrefix(roundId: string): string {
  return `${roundId.replace(/[.#$[\]/]/g, '-')}_`
}

/** Trim coordinate precision and drop undefined fields before writing. */
function compactStroke(stroke: WhiteboardStroke): WhiteboardStroke {
  const rounded = {
    ...stroke,
    points: stroke.points.map((p) => ({
      x: Math.round(p.x * 10_000) / 10_000,
      y: Math.round(p.y * 10_000) / 10_000,
    })),
  }
  return JSON.parse(JSON.stringify(rounded)) as WhiteboardStroke
}

function parseStrokeMap(raw: unknown): WhiteboardStroke[] {
  if (!raw || typeof raw !== 'object') return []
  return sortWhiteboardStrokes(
    Object.values(raw as Record<string, unknown>)
      .map(normalizeWhiteboardStroke)
      .filter((s): s is WhiteboardStroke => s !== null),
  )
}

/**
 * Live Pictionary canvas over Realtime Database:
 * - `strokes/{roundKey}/{strokeId}` committed strokes per round (kept for the recap)
 * - `draft/{uid}` the drawer's in-progress stroke
 * - `presence/{uid}` online flag, removed on disconnect
 */
export function usePictionaryLive(opts: {
  roundId: string
  roundIndex: number
  /** Game doc has synced — the roundId is real, not a local placeholder. */
  ready: boolean
}) {
  const { user } = useFirebaseAuth()
  const uid = user?.uid ?? null
  const [strokesByKey, setStrokesByKey] = useState<Record<string, WhiteboardStroke[]>>({})
  const [drafts, setDrafts] = useState<Record<string, WhiteboardStroke | null>>({})
  const [presence, setPresence] = useState<Record<string, boolean>>({})
  const [serverOffset, setServerOffset] = useState(0)
  const offsetRef = useRef(0)
  const lastDraftWriteRef = useRef(0)
  const currentKey = pictionaryRoundKey(opts.roundId, opts.roundIndex)
  const currentKeyRef = useRef(currentKey)
  currentKeyRef.current = currentKey

  useEffect(() => {
    if (!uid || !rtdb) return
    const db = rtdb
    const unsubs = [
      onValue(rtdbRef(db, '.info/serverTimeOffset'), (snap) => {
        const v = Number(snap.val() ?? 0)
        offsetRef.current = Number.isFinite(v) ? v : 0
        setServerOffset(offsetRef.current)
      }),
      onValue(rtdbRef(db, `${LIVE_ROOT}/strokes`), (snap) => {
        const value = snap.val() as Record<string, unknown> | null
        const next: Record<string, WhiteboardStroke[]> = {}
        if (value) {
          for (const [key, strokes] of Object.entries(value)) {
            next[key] = parseStrokeMap(strokes)
          }
        }
        setStrokesByKey(next)
      }),
      onValue(rtdbRef(db, `${LIVE_ROOT}/draft`), (snap) => {
        const value = snap.val() as Record<string, unknown> | null
        const next: Record<string, WhiteboardStroke | null> = {}
        if (value) {
          for (const [id, stroke] of Object.entries(value)) {
            next[id] = normalizeWhiteboardStroke(stroke)
          }
        }
        setDrafts(next)
      }),
      onValue(rtdbRef(db, `${LIVE_ROOT}/presence`), (snap) => {
        const value = snap.val() as Record<string, unknown> | null
        const next: Record<string, boolean> = {}
        for (const seat of JENGA_PLAYER_UIDS) next[seat] = Boolean(value?.[seat])
        setPresence(next)
      }),
    ]

    const selfPresence = rtdbRef(db, `${LIVE_ROOT}/presence/${uid}`)
    const selfDraft = rtdbRef(db, `${LIVE_ROOT}/draft/${uid}`)
    void onDisconnect(selfPresence).remove()
    void onDisconnect(selfDraft).remove()
    void set(selfPresence, { online: true, at: serverTimestamp() }).catch(() => {})

    return () => {
      for (const unsub of unsubs) unsub()
      void remove(selfPresence).catch(() => {})
      void remove(selfDraft).catch(() => {})
    }
  }, [uid])

  // Drop strokes left over from earlier games.
  useEffect(() => {
    if (!rtdb || !uid || !opts.ready) return
    const prefix = roundPrefix(opts.roundId)
    for (const key of Object.keys(strokesByKey)) {
      if (key.startsWith(prefix)) continue
      void remove(rtdbRef(rtdb, `${LIVE_ROOT}/strokes/${key}`)).catch(() => {})
    }
  }, [strokesByKey, opts.roundId, opts.ready, uid])

  const serverNow = useCallback(() => Date.now() + offsetRef.current, [])

  const publishDraft = useCallback(
    (stroke: WhiteboardStroke | null) => {
      if (!uid || !rtdb) return
      const now = Date.now()
      if (stroke && now - lastDraftWriteRef.current < DRAFT_THROTTLE_MS) return
      lastDraftWriteRef.current = stroke ? now : 0
      void set(
        rtdbRef(rtdb, `${LIVE_ROOT}/draft/${uid}`),
        stroke ? compactStroke(stroke) : null,
      ).catch(() => {})
    },
    [uid],
  )

  const addStroke = useCallback(
    (stroke: WhiteboardStroke) => {
      if (!uid || !rtdb) return
      const key = currentKeyRef.current
      void set(
        rtdbRef(rtdb, `${LIVE_ROOT}/strokes/${key}/${stroke.id}`),
        compactStroke(stroke),
      ).catch((error: unknown) => console.error('pictionary stroke', error))
      lastDraftWriteRef.current = 0
      void set(rtdbRef(rtdb, `${LIVE_ROOT}/draft/${uid}`), null).catch(() => {})
    },
    [uid],
  )

  const currentStrokes = useMemo(
    () => strokesByKey[currentKey] ?? [],
    [strokesByKey, currentKey],
  )

  const undoLast = useCallback(() => {
    if (!rtdb) return
    const last = currentStrokes[currentStrokes.length - 1]
    if (!last) return
    void remove(
      rtdbRef(rtdb, `${LIVE_ROOT}/strokes/${currentKeyRef.current}/${last.id}`),
    ).catch(() => {})
  }, [currentStrokes])

  const clearCurrent = useCallback(() => {
    if (!rtdb) return
    void remove(rtdbRef(rtdb, `${LIVE_ROOT}/strokes/${currentKeyRef.current}`)).catch(
      () => {},
    )
  }, [])

  const clearAll = useCallback(() => {
    if (!rtdb) return
    void remove(rtdbRef(rtdb, `${LIVE_ROOT}/strokes`)).catch(() => {})
  }, [])

  const strokesForRound = useCallback(
    (roundIndex: number) =>
      strokesByKey[pictionaryRoundKey(opts.roundId, roundIndex)] ?? [],
    [strokesByKey, opts.roundId],
  )

  return {
    liveEnabled: Boolean(rtdb),
    serverOffset,
    serverNow,
    currentStrokes,
    strokesForRound,
    drafts,
    presence,
    publishDraft,
    addStroke,
    undoLast,
    clearCurrent,
    clearAll,
  }
}
