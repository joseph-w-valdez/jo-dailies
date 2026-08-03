import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import {
  onDisconnect,
  onValue,
  ref as rtdbRef,
  remove,
  update,
} from 'firebase/database'
import { useCallback, useEffect, useRef, useState } from 'react'
import { db, rtdb, syncRoomId } from '../lib/firebase'
import { updateSyncSource } from '../lib/syncStatus'
import {
  createInitialGame,
  loadJengaLocal,
  normalizeGameState,
  saveJengaLocal,
  type JengaGameState,
  type JengaLiveGhost,
  type JengaPose,
} from '../lib/jenga'
import { useFirebaseAuth } from './firebaseAuthContext'

function gameDocRef() {
  return doc(db, 'rooms', syncRoomId, 'jenga', 'current')
}

function liveUserPath(uid: string) {
  return `rooms/${syncRoomId}/jengaLive/${uid}`
}

export function useSharedJenga() {
  const { user } = useFirebaseAuth()
  const fallbackUid = user?.uid ?? 'local'
  const [game, setGame] = useState<JengaGameState>(() =>
    loadJengaLocal(fallbackUid),
  )
  const [ghosts, setGhosts] = useState<JengaLiveGhost[]>([])
  const [ready, setReady] = useState(false)

  const gameRef = useRef(game)
  gameRef.current = game
  const pendingVersionRef = useRef<number | null>(null)
  const lastLiveWriteRef = useRef(0)

  useEffect(() => {
    saveJengaLocal(game)
  }, [game])

  useEffect(() => {
    if (!user) {
      setReady(true)
      return
    }

    const unsubscribe = onSnapshot(
      gameDocRef(),
      { includeMetadataChanges: true },
      (snapshot) => {
        updateSyncSource('jenga', {
          pending: snapshot.metadata.hasPendingWrites,
          fromCache: snapshot.metadata.fromCache,
        })

        if (!snapshot.exists()) {
          const initial = createInitialGame(user.uid)
          setGame(initial)
          setReady(true)
          void setDoc(gameDocRef(), initial).catch((error: unknown) => {
            console.error('Could not seed jenga', error)
          })
          return
        }

        const remote = normalizeGameState(snapshot.data(), user.uid)
        if (
          pendingVersionRef.current !== null &&
          remote.version < pendingVersionRef.current
        ) {
          return
        }
        if (
          pendingVersionRef.current !== null &&
          remote.version >= pendingVersionRef.current
        ) {
          pendingVersionRef.current = null
        }

        setGame((prev) => {
          if (
            prev.version === remote.version &&
            prev.updatedAt === remote.updatedAt &&
            prev.status === remote.status &&
            prev.turnUid === remote.turnUid &&
            prev.endReason === remote.endReason &&
            prev.explodeCount === remote.explodeCount &&
            prev.meteorCount === remote.meteorCount &&
            prev.removedCount === remote.removedCount &&
            prev.roundId === remote.roundId
          ) {
            return prev
          }
          return remote
        })
        setReady(true)
      },
      (error) => {
        updateSyncSource('jenga', {
          pending: false,
          fromCache: false,
          error: true,
        })
        console.error('Jenga sync failed', error)
        setReady(true)
      },
    )

    return () => {
      unsubscribe()
      updateSyncSource('jenga', null)
    }
  }, [user])

  useEffect(() => {
    if (!user || !rtdb) {
      setGhosts([])
      return
    }

    const roomLive = rtdbRef(rtdb, `rooms/${syncRoomId}/jengaLive`)
    const selfRef = rtdbRef(rtdb, liveUserPath(user.uid))
    void onDisconnect(selfRef).remove()

    const unsubscribe = onValue(roomLive, (snapshot) => {
      const value = snapshot.val() as Record<
        string,
        {
          brickId?: string
          pose?: JengaPose
          phase?: 'pulling' | 'placing'
        }
      > | null
      if (!value) {
        setGhosts([])
        return
      }
      const next: JengaLiveGhost[] = []
      for (const [uid, payload] of Object.entries(value)) {
        if (uid === user.uid) continue
        if (
          !payload?.brickId ||
          !payload.pose ||
          (payload.phase !== 'pulling' && payload.phase !== 'placing')
        ) {
          continue
        }
        next.push({
          uid,
          brickId: payload.brickId,
          pose: payload.pose,
          phase: payload.phase,
        })
      }
      setGhosts(next)
    })

    return () => {
      unsubscribe()
      void remove(selfRef).catch(() => {})
    }
  }, [user])

  const commitGame = useCallback(
    async (
      next:
        | JengaGameState
        | ((prev: JengaGameState) => JengaGameState),
    ) => {
      const base = typeof next === 'function' ? next(gameRef.current) : next
      // Always advance past the latest known version so rapid chaos clicks
      // (meteor → explode) can't clobber each other with the same version.
      const resolved: JengaGameState = {
        ...base,
        version: Math.max(base.version, gameRef.current.version + 1),
        updatedAt: Date.now(),
      }
      gameRef.current = resolved
      pendingVersionRef.current = resolved.version
      setGame(resolved)
      saveJengaLocal(resolved)
      try {
        await setDoc(gameDocRef(), resolved)
      } catch (error: unknown) {
        console.error('Could not save jenga', error)
      }
    },
    [],
  )

  const resetGame = useCallback(async () => {
    const turnUid = user?.uid ?? gameRef.current.turnUid
    const next: JengaGameState = {
      ...createInitialGame(turnUid),
      // Must beat the current version or a stale remote snapshot wins.
      version: gameRef.current.version + 1,
      updatedAt: Date.now(),
    }
    await commitGame(next)
  }, [commitGame, user?.uid])

  const publishGhost = useCallback(
    (payload: {
      brickId: string
      pose: JengaPose
      phase: 'pulling' | 'placing'
    } | null) => {
      if (!user || !rtdb) return
      const now = Date.now()
      if (payload && now - lastLiveWriteRef.current < 50) return
      if (payload) lastLiveWriteRef.current = now
      const path = rtdbRef(rtdb, liveUserPath(user.uid))
      if (!payload) {
        void remove(path).catch(() => {})
        return
      }
      void update(path, payload).catch((error: unknown) => {
        console.error('Could not publish jenga ghost', error)
      })
    },
    [user],
  )

  const clearGhost = useCallback(() => {
    publishGhost(null)
  }, [publishGhost])

  /** Either of you can pull anytime while the tower is up. */
  const canPlay = Boolean(user && game.status === 'playing')

  return {
    game,
    ghosts,
    ready,
    liveEnabled: Boolean(rtdb),
    canPlay,
    uid: user?.uid ?? null,
    commitGame,
    resetGame,
    publishGhost,
    clearGhost,
  }
}
