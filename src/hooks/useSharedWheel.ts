import { useEffect, useRef } from 'react'
import {
  createInitialWheel,
  expireStaleWheelOutcome,
  parseWheelState,
  wheelToDoc,
  type WheelRoomState,
} from '../lib/wheel'
import { useSharedGameDoc } from './useSharedGameDoc'

/** Shared wheel options + spin — Firestore `rooms/{id}/wheel/current`. */
export function useSharedWheel() {
  const sweepOutcomeRef = useRef(false)

  const shared = useSharedGameDoc<WheelRoomState>({
    collectionId: 'wheel',
    createInitial: () => createInitialWheel(),
    normalize: (raw) => {
      const parsed = parseWheelState(raw)
      const next = expireStaleWheelOutcome(parsed)
      if (
        (parsed.winnerId || parsed.spinId) &&
        !next.winnerId &&
        !next.spinId
      ) {
        // Doc still has a finish past the hold window — queue a durable clear.
        sweepOutcomeRef.current = true
      }
      return next
    },
    toDoc: (state) => wheelToDoc(state),
  })

  useEffect(() => {
    if (!shared.ready || !sweepOutcomeRef.current) return
    sweepOutcomeRef.current = false
    void shared.commitGame((prev) => ({
      ...prev,
      winnerId: null,
      spinId: null,
    }))
  }, [shared.ready, shared.game.version, shared.commitGame])

  return {
    wheel: shared.game,
    ready: shared.ready,
    commitWheel: shared.commitGame,
  }
}
