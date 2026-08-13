import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  createInitialBattleship,
  normalizeBattleship,
  type BattleshipState,
} from '../lib/battleship'
import { db, syncRoomId, toFirestoreData } from '../lib/firebase'
import { withBumpedVersion } from '../lib/gameCommit'
import { updateSyncSource } from '../lib/syncStatus'
import { useFirebaseAuth } from './firebaseAuthContext'

function gameDocRef() {
  return doc(db, 'rooms', syncRoomId, 'battleship', 'current')
}

export function useSharedBattleship() {
  const { user } = useFirebaseAuth()
  const fallbackUid = user?.uid ?? 'local'
  const [game, setGame] = useState<BattleshipState>(() =>
    createInitialBattleship(fallbackUid),
  )
  const [ready, setReady] = useState(false)
  const gameRef = useRef(game)
  gameRef.current = game
  const pendingVersionRef = useRef<number | null>(null)

  useEffect(() => {
    if (!user) {
      setReady(true)
      updateSyncSource('battleship', null)
      return
    }
    const unsub = onSnapshot(
      gameDocRef(),
      { includeMetadataChanges: true },
      (snap) => {
        updateSyncSource('battleship', {
          pending: snap.metadata.hasPendingWrites,
          fromCache: snap.metadata.fromCache,
        })
        if (!snap.exists()) {
          const seed = createInitialBattleship(user.uid)
          void setDoc(gameDocRef(), toFirestoreData(seed))
          setGame(seed)
          gameRef.current = seed
          setReady(true)
          return
        }
        const remote = normalizeBattleship(snap.data(), user.uid)
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
        console.error('battleship sync', error)
        updateSyncSource('battleship', {
          pending: false,
          fromCache: false,
          error: true,
        })
        setReady(true)
      },
    )
    return () => {
      unsub()
      updateSyncSource('battleship', null)
    }
  }, [user])

  const commitGame = useCallback(
    async (
      next: BattleshipState | ((prev: BattleshipState) => BattleshipState),
    ) => {
      const base = typeof next === 'function' ? next(gameRef.current) : next
      const resolved = withBumpedVersion(base, gameRef.current.version)
      gameRef.current = resolved
      pendingVersionRef.current = resolved.version
      setGame(resolved)
      try {
        await setDoc(gameDocRef(), toFirestoreData(resolved))
      } catch (error) {
        console.error('Could not save battleship', error)
      }
    },
    [],
  )

  const resetGame = useCallback(
    async (opts?: { hotseat?: boolean }) => {
      const turnUid = user?.uid ?? gameRef.current.turnUid
      await commitGame({
        ...createInitialBattleship(turnUid, {
          hotseat: Boolean(opts?.hotseat),
        }),
        version: gameRef.current.version + 1,
        updatedAt: Date.now(),
      })
    },
    [commitGame, user?.uid],
  )

  const uid = user?.uid ?? 'local'
  const signedIn = Boolean(user?.uid)
  /** Seat shooting this turn (turn seat in hotseat). */
  const actorUid = game.hotseat ? game.turnUid : uid

  return {
    game,
    ready,
    uid,
    actorUid,
    canShoot:
      signedIn &&
      game.status === 'playing' &&
      (game.hotseat || game.turnUid === user?.uid),
    commitGame,
    resetGame,
  }
}
