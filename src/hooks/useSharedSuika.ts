import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { useCallback, useEffect, useRef, useState } from 'react'
import { db, syncRoomId } from '../lib/firebase'
import { withBumpedVersion } from '../lib/gameCommit'
import { updateSyncSource } from '../lib/syncStatus'
import {
  applyRoomBest,
  createInitialSuika,
  normalizeSuikaRoomBest,
  resetSuikaRun,
  type SuikaGameState,
  type SuikaLiveGhost,
  type SuikaLivePose,
  type SuikaRoomBest,
} from '../lib/suika'
import { playerFirstName } from '../lib/playerLabel'
import { useFirebaseAuth } from './firebaseAuthContext'

function bestDocRef() {
  return doc(db, 'rooms', syncRoomId, 'suika', 'best')
}

/**
 * Cat Suika — bowl lives in memory only (fresh each visit).
 * Room high score (+ who set it) is the only thing synced to Firestore.
 */
export function useSharedSuika() {
  const { user } = useFirebaseAuth()
  const [game, setGame] = useState<SuikaGameState>(() => createInitialSuika())
  const [ready, setReady] = useState(true)
  const gameRef = useRef(game)
  gameRef.current = game
  const roomBestRef = useRef<SuikaRoomBest>({
    highScore: 0,
    highScoreUid: null,
    highScoreName: null,
    highScoreAt: null,
  })

  useEffect(() => {
    if (!user) {
      updateSyncSource('suika', null)
      setReady(true)
      return
    }

    const unsubscribe = onSnapshot(
      bestDocRef(),
      { includeMetadataChanges: true },
      (snapshot) => {
        updateSyncSource('suika', {
          pending: snapshot.metadata.hasPendingWrites,
          fromCache: snapshot.metadata.fromCache,
        })
        const best = snapshot.exists()
          ? normalizeSuikaRoomBest(snapshot.data())
          : {
              highScore: 0,
              highScoreUid: null,
              highScoreName: null,
              highScoreAt: null,
            }
        roomBestRef.current = best
        setGame((prev) => {
          const next = applyRoomBest(prev, best)
          if (next === prev) return prev
          gameRef.current = next
          return next
        })
        setReady(true)
      },
      (error) => {
        updateSyncSource('suika', {
          pending: false,
          fromCache: false,
          error: true,
        })
        console.error('Suika high score sync failed', error)
        setReady(true)
      },
    )

    return () => {
      unsubscribe()
      updateSyncSource('suika', null)
    }
  }, [user])

  const pushRoomBestIfNeeded = useCallback(
    async (state: SuikaGameState) => {
      if (!user?.uid) return
      if (state.highScore <= roomBestRef.current.highScore) return
      const best: SuikaRoomBest = {
        highScore: state.highScore,
        highScoreUid: state.highScoreUid,
        highScoreName: state.highScoreName,
        highScoreAt: state.highScoreAt,
      }
      roomBestRef.current = best
      try {
        await setDoc(bestDocRef(), best)
      } catch (error: unknown) {
        console.error('Could not save suika high score', error)
      }
    },
    [user?.uid],
  )

  const commitGame = useCallback(
    async (
      next: SuikaGameState | ((prev: SuikaGameState) => SuikaGameState),
    ) => {
      const base = typeof next === 'function' ? next(gameRef.current) : next
      const resolved = withBumpedVersion(base, gameRef.current.version)
      gameRef.current = resolved
      setGame(resolved)
      void pushRoomBestIfNeeded(resolved)
    },
    [pushRoomBestIfNeeded],
  )

  const resetGame = useCallback(async () => {
    await commitGame((prev) => resetSuikaRun(prev))
  }, [commitGame])

  const publishLive = useCallback((_pieces: SuikaLivePose[] | null) => {
    /* in-memory gameplay — no live ghosts */
  }, [])

  const clearLive = useCallback(() => {
    publishLive(null)
  }, [publishLive])

  const uid = user?.uid ?? 'local'
  const playerName = playerFirstName(user?.displayName, user?.email)
  const bowlIdle = game.status === 'playing' && !game.busyUid
  const iAmBusy = Boolean(game.busyUid)
  const partnerBusy = false
  const ghosts: SuikaLiveGhost[] = []

  return {
    game,
    ghosts,
    ready,
    liveEnabled: Boolean(user),
    uid,
    playerName,
    bowlIdle,
    iAmBusy,
    partnerBusy,
    commitGame,
    resetGame,
    publishLive,
    clearLive,
  }
}
