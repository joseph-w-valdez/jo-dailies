import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  createInitialBattleship,
  normalizeBattleship,
  type BattleshipState,
} from '../lib/battleship'
import { db, syncRoomId } from '../lib/firebase'
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
          void setDoc(gameDocRef(), seed)
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
      const resolved: BattleshipState = {
        ...base,
        version: Math.max(base.version, gameRef.current.version + 1),
        updatedAt: Date.now(),
      }
      gameRef.current = resolved
      pendingVersionRef.current = resolved.version
      setGame(resolved)
      try {
        await setDoc(gameDocRef(), resolved)
      } catch (error) {
        console.error('Could not save battleship', error)
      }
    },
    [],
  )

  const resetGame = useCallback(async () => {
    const turnUid = user?.uid ?? gameRef.current.turnUid
    await commitGame({
      ...createInitialBattleship(turnUid),
      version: gameRef.current.version + 1,
      updatedAt: Date.now(),
    })
  }, [commitGame, user?.uid])

  const uid = user?.uid ?? 'local'

  return {
    game,
    ready,
    uid,
    canShoot:
      Boolean(user?.uid) &&
      game.status === 'playing' &&
      game.turnUid === user?.uid,
    commitGame,
    resetGame,
  }
}
