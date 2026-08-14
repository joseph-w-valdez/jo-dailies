import {
  createInitialWheel,
  normalizeWheel,
  wheelToDoc,
  type WheelRoomState,
} from '../lib/wheel'
import { useSharedGameDoc } from './useSharedGameDoc'

/** Shared wheel options + spin — Firestore `rooms/{id}/wheel/current`. */
export function useSharedWheel() {
  const shared = useSharedGameDoc<WheelRoomState>({
    collectionId: 'wheel',
    createInitial: () => createInitialWheel(),
    normalize: (raw) => normalizeWheel(raw),
    toDoc: (state) => wheelToDoc(state),
  })

  return {
    wheel: shared.game,
    ready: shared.ready,
    commitWheel: shared.commitGame,
  }
}
