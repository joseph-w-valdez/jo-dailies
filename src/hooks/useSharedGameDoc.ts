import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { useCallback, useEffect, useRef, useState } from 'react'
import { db, syncRoomId, toFirestoreData } from '../lib/firebase'
import { withBumpedVersion } from '../lib/gameCommit'
import { updateSyncSource } from '../lib/syncStatus'
import { useFirebaseAuth } from './firebaseAuthContext'

export type VersionedGame = {
  version: number
  updatedAt: number
}

export type SharedGameDocOptions<T extends VersionedGame> = {
  /** Firestore collection under rooms/{syncRoomId}/ — doc is always `current`. */
  collectionId: string
  /** Sync status key; defaults to collectionId. */
  syncId?: string
  createInitial: (uid: string) => T
  normalize: (raw: unknown, uid: string) => T
  /** Serialize before write (e.g. chess strips non-Firestore fields). */
  toDoc?: (state: T) => unknown
  /**
   * Build a reset state from current (version/updatedAt overwritten by hook).
   * Defaults to createInitial(uid).
   */
  buildReset?: (
    prev: T,
    uid: string,
    opts?: { hotseat?: boolean },
  ) => T
}

export function useSharedGameDoc<T extends VersionedGame>(
  options: SharedGameDocOptions<T>,
) {
  const collectionId = options.collectionId
  const syncId = options.syncId ?? collectionId

  const createInitialRef = useRef(options.createInitial)
  const normalizeRef = useRef(options.normalize)
  const toDocRef = useRef(options.toDoc)
  const buildResetRef = useRef(options.buildReset)
  createInitialRef.current = options.createInitial
  normalizeRef.current = options.normalize
  toDocRef.current = options.toDoc
  buildResetRef.current = options.buildReset

  const { user } = useFirebaseAuth()
  const fallbackUid = user?.uid ?? 'local'
  const [game, setGame] = useState<T>(() =>
    createInitialRef.current(fallbackUid),
  )
  const [ready, setReady] = useState(false)
  const gameRef = useRef(game)
  gameRef.current = game
  const pendingVersionRef = useRef<number | null>(null)

  useEffect(() => {
    if (!user) {
      setReady(true)
      updateSyncSource(syncId, null)
      return
    }
    const ref = doc(db, 'rooms', syncRoomId, collectionId, 'current')

    const write = async (state: T) => {
      const payload = toDocRef.current ? toDocRef.current(state) : state
      await setDoc(ref, toFirestoreData(payload))
    }

    const unsub = onSnapshot(
      ref,
      { includeMetadataChanges: true },
      (snap) => {
        updateSyncSource(syncId, {
          pending: snap.metadata.hasPendingWrites,
          fromCache: snap.metadata.fromCache,
        })
        if (!snap.exists()) {
          const seed = createInitialRef.current(user.uid)
          void write(seed)
          setGame(seed)
          gameRef.current = seed
          setReady(true)
          return
        }
        const remote = normalizeRef.current(snap.data(), user.uid)
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
        gameRef.current = remote
        setGame(remote)
        setReady(true)
      },
      (error) => {
        console.error(`${syncId} sync`, error)
        updateSyncSource(syncId, {
          pending: false,
          fromCache: false,
          error: true,
        })
        setReady(true)
      },
    )
    return () => {
      unsub()
      updateSyncSource(syncId, null)
    }
  }, [user, collectionId, syncId])

  const commitGame = useCallback(async (next: T | ((prev: T) => T)) => {
    const base = typeof next === 'function' ? next(gameRef.current) : next
    const resolved = withBumpedVersion(base, gameRef.current.version)
    gameRef.current = resolved
    pendingVersionRef.current = resolved.version
    setGame(resolved)
    try {
      const ref = doc(db, 'rooms', syncRoomId, collectionId, 'current')
      const payload = toDocRef.current ? toDocRef.current(resolved) : resolved
      await setDoc(ref, toFirestoreData(payload))
    } catch (error) {
      console.error(`Could not save ${syncId}`, error)
    }
  }, [collectionId, syncId])

  const resetGame = useCallback(
    async (opts?: { hotseat?: boolean }) => {
      const uid = user?.uid ?? fallbackUid
      const seeded = buildResetRef.current
        ? buildResetRef.current(gameRef.current, uid, opts)
        : createInitialRef.current(uid)
      await commitGame({
        ...seeded,
        version: gameRef.current.version + 1,
        updatedAt: Date.now(),
      })
    },
    [commitGame, fallbackUid, user?.uid],
  )

  return {
    game,
    ready,
    user,
    uid: user?.uid ?? 'local',
    signedIn: Boolean(user?.uid),
    gameRef,
    commitGame,
    resetGame,
  }
}
