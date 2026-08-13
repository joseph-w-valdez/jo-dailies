import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  createInitialScrabble,
  startNewScrabble,
  normalizeScrabble,
  type ScrabbleState,
} from '../lib/scrabble'
import { db, syncRoomId, toFirestoreData } from '../lib/firebase'
import { withBumpedVersion } from '../lib/gameCommit'
import { updateSyncSource } from '../lib/syncStatus'
import { useFirebaseAuth } from './firebaseAuthContext'

function gameDocRef() {
  return doc(db, 'rooms', syncRoomId, 'scrabble', 'current')
}

export function useSharedScrabble() {
  const { user } = useFirebaseAuth()
  const fallbackUid = user?.uid ?? 'local'
  const [game, setGame] = useState<ScrabbleState>(() =>
    createInitialScrabble(fallbackUid),
  )
  const [ready, setReady] = useState(false)
  const gameRef = useRef(game)
  gameRef.current = game
  const pendingVersionRef = useRef<number | null>(null)

  useEffect(() => {
    if (!user) {
      setReady(true)
      updateSyncSource('scrabble', null)
      return
    }
    const unsub = onSnapshot(
      gameDocRef(),
      { includeMetadataChanges: true },
      (snap) => {
        updateSyncSource('scrabble', {
          pending: snap.metadata.hasPendingWrites,
          fromCache: snap.metadata.fromCache,
        })
        if (!snap.exists()) {
          const seed = createInitialScrabble(user.uid)
          void setDoc(gameDocRef(), toFirestoreData(seed))
          setGame(seed)
          gameRef.current = seed
          setReady(true)
          return
        }
        const remote = normalizeScrabble(snap.data(), user.uid)
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
        console.error('scrabble sync', error)
        updateSyncSource('scrabble', {
          pending: false,
          fromCache: false,
          error: true,
        })
        setReady(true)
      },
    )
    return () => {
      unsub()
      updateSyncSource('scrabble', null)
    }
  }, [user])

  const commitGame = useCallback(
    async (
      next: ScrabbleState | ((prev: ScrabbleState) => ScrabbleState),
    ) => {
      const base = typeof next === 'function' ? next(gameRef.current) : next
      const resolved = withBumpedVersion(base, gameRef.current.version)
      gameRef.current = resolved
      pendingVersionRef.current = resolved.version
      setGame(resolved)
      try {
        await setDoc(gameDocRef(), toFirestoreData(resolved))
      } catch (error) {
        console.error('Could not save scrabble', error)
      }
    },
    [],
  )

  const resetGame = useCallback(
    async (opts?: { hotseat?: boolean }) => {
      const turnUid = user?.uid ?? gameRef.current.turnUid
      await commitGame({
        ...startNewScrabble(gameRef.current, turnUid, {
          hotseat: Boolean(opts?.hotseat),
        }),
        version: gameRef.current.version + 1,
        updatedAt: Date.now(),
      })
    },
    [commitGame, user?.uid],
  )

  const uid = user?.uid ?? 'local'
  const actorUid = game.hotseat ? game.turnUid : uid
  const myRack = game.racks[actorUid] ?? []
  const signedIn = Boolean(user?.uid)

  return {
    game,
    ready,
    uid,
    /** Seat whose rack/actions you control (turn seat in hotseat). */
    actorUid,
    myRack,
    canAct:
      signedIn &&
      game.status === 'playing' &&
      (game.hotseat || game.turnUid === user?.uid),
    commitGame,
    resetGame,
  }
}
