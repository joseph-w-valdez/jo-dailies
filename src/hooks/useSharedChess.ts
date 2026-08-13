import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  chessToDoc,
  createInitialChess,
  normalizeChess,
  startNewChess,
  type ChessState,
} from '../lib/chess'
import { db, syncRoomId, toFirestoreData } from '../lib/firebase'
import { withBumpedVersion } from '../lib/gameCommit'
import { updateSyncSource } from '../lib/syncStatus'
import { useFirebaseAuth } from './firebaseAuthContext'

function gameDocRef() {
  return doc(db, 'rooms', syncRoomId, 'chess', 'current')
}

export function useSharedChess() {
  const { user } = useFirebaseAuth()
  const fallbackUid = user?.uid ?? 'local'
  const [game, setGame] = useState<ChessState>(() =>
    createInitialChess(fallbackUid),
  )
  const [ready, setReady] = useState(false)
  const gameRef = useRef(game)
  gameRef.current = game
  const pendingVersionRef = useRef<number | null>(null)

  useEffect(() => {
    if (!user) {
      setReady(true)
      updateSyncSource('chess', null)
      return
    }
    const unsub = onSnapshot(
      gameDocRef(),
      { includeMetadataChanges: true },
      (snap) => {
        updateSyncSource('chess', {
          pending: snap.metadata.hasPendingWrites,
          fromCache: snap.metadata.fromCache,
        })
        if (!snap.exists()) {
          const seed = createInitialChess(user.uid)
          void setDoc(gameDocRef(), toFirestoreData(chessToDoc(seed)))
          setGame(seed)
          gameRef.current = seed
          setReady(true)
          return
        }
        const remote = normalizeChess(snap.data(), user.uid)
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
        console.error('chess sync', error)
        updateSyncSource('chess', {
          pending: false,
          fromCache: false,
          error: true,
        })
        setReady(true)
      },
    )
    return () => {
      unsub()
      updateSyncSource('chess', null)
    }
  }, [user])

  const commitGame = useCallback(
    async (next: ChessState | ((prev: ChessState) => ChessState)) => {
      const base = typeof next === 'function' ? next(gameRef.current) : next
      const resolved = withBumpedVersion(base, gameRef.current.version)
      gameRef.current = resolved
      pendingVersionRef.current = resolved.version
      setGame(resolved)
      try {
        await setDoc(gameDocRef(), toFirestoreData(chessToDoc(resolved)))
      } catch (error) {
        console.error('Could not save chess', error)
      }
    },
    [],
  )

  const resetGame = useCallback(
    async (opts?: { hotseat?: boolean }) => {
      await commitGame({
        ...startNewChess(gameRef.current, {
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

  return {
    game,
    ready,
    uid: uid ?? 'local',
    actorUid,
    canPlay:
      signedIn &&
      game.status === 'playing' &&
      (game.hotseat || game.turnUid === uid),
    canUndo:
      signedIn &&
      game.undoStack.length > 0 &&
      (game.hotseat || game.turnUid === uid),
    commitGame,
    resetGame,
  }
}
