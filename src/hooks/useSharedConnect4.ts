import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  createInitialConnect4,
  normalizeConnect4,
  type Connect4State,
} from '../lib/connect4'
import { db, syncRoomId, toFirestoreData } from '../lib/firebase'
import { withBumpedVersion } from '../lib/gameCommit'
import { JENGA_PLAYER_UIDS } from '../lib/jenga'
import { updateSyncSource } from '../lib/syncStatus'
import { useFirebaseAuth } from './firebaseAuthContext'

function gameDocRef() {
  return doc(db, 'rooms', syncRoomId, 'connect4', 'current')
}

export function useSharedConnect4() {
  const { user } = useFirebaseAuth()
  const fallbackUid = user?.uid ?? 'local'
  const [game, setGame] = useState<Connect4State>(() =>
    createInitialConnect4(fallbackUid),
  )
  const [ready, setReady] = useState(false)
  const gameRef = useRef(game)
  gameRef.current = game
  const pendingVersionRef = useRef<number | null>(null)

  useEffect(() => {
    if (!user) {
      setReady(true)
      updateSyncSource('connect4', null)
      return
    }
    const unsub = onSnapshot(
      gameDocRef(),
      { includeMetadataChanges: true },
      (snap) => {
        updateSyncSource('connect4', {
          pending: snap.metadata.hasPendingWrites,
          fromCache: snap.metadata.fromCache,
        })
        if (!snap.exists()) {
          const seed = createInitialConnect4(user.uid)
          void setDoc(gameDocRef(), toFirestoreData(seed))
          setGame(seed)
          gameRef.current = seed
          setReady(true)
          return
        }
        const remote = normalizeConnect4(snap.data(), user.uid)
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
        console.error('connect4 sync', error)
        updateSyncSource('connect4', {
          pending: false,
          fromCache: false,
          error: true,
        })
        setReady(true)
      },
    )
    return () => {
      unsub()
      updateSyncSource('connect4', null)
    }
  }, [user])

  const commitGame = useCallback(
    async (
      next: Connect4State | ((prev: Connect4State) => Connect4State),
    ) => {
      const base = typeof next === 'function' ? next(gameRef.current) : next
      const resolved = withBumpedVersion(base, gameRef.current.version)
      gameRef.current = resolved
      pendingVersionRef.current = resolved.version
      setGame(resolved)
      try {
        await setDoc(gameDocRef(), toFirestoreData(resolved))
      } catch (error) {
        console.error('Could not save connect4', error)
      }
    },
    [],
  )

  const resetGame = useCallback(
    async (opts?: { hotseat?: boolean }) => {
      const turnUid = user?.uid ?? gameRef.current.turnUid
      await commitGame({
        ...createInitialConnect4(turnUid, {
          hotseat: Boolean(opts?.hotseat),
        }),
        version: gameRef.current.version + 1,
        updatedAt: Date.now(),
      })
    },
    [commitGame, user?.uid],
  )

  const uid = user?.uid ?? null
  const signedIn = Boolean(uid)
  const actorUid = game.hotseat ? game.turnUid : (uid ?? 'local')
  const mySeat =
    uid && JENGA_PLAYER_UIDS.includes(uid as (typeof JENGA_PLAYER_UIDS)[number])
      ? (JENGA_PLAYER_UIDS.indexOf(uid as (typeof JENGA_PLAYER_UIDS)[number]) as
          | 0
          | 1)
      : uid
        ? 0
        : null

  return {
    game,
    ready,
    uid: uid ?? 'local',
    /** Seat whose disc you drop (turn seat in hotseat). */
    actorUid,
    mySeat,
    canPlay:
      signedIn &&
      game.status === 'playing' &&
      (game.hotseat || game.turnUid === uid),
    commitGame,
    resetGame,
  }
}
