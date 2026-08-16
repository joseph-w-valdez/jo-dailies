import { useEffect, useRef } from 'react'
import {
  createInitialWheel,
  expireStaleWheelOutcome,
  parseWheelState,
  wheelNeedsOutcomeSweep,
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
      if (wheelNeedsOutcomeSweep(parsed, next)) {
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
      tabs: prev.tabs.map((tab) =>
        tab.winnerId || tab.spinId
          ? { ...tab, winnerId: null, spinId: null }
          : tab,
      ),
      updatedAt: Date.now(),
    }))
  }, [shared.ready, shared.game.version, shared.commitGame])

  return {
    wheel: shared.game,
    ready: shared.ready,
    commitWheel: shared.commitGame,
  }
}
