import {
  buildPictionaryReset,
  createInitialPictionary,
  normalizePictionary,
  type PictionaryState,
} from '../lib/pictionary'
import { useSharedGameDoc } from './useSharedGameDoc'

export function useSharedPictionary() {
  const shared = useSharedGameDoc<PictionaryState>({
    collectionId: 'pictionary',
    createInitial: (uid) => createInitialPictionary(uid),
    normalize: (raw, uid) => normalizePictionary(raw, uid),
    buildReset: (prev, uid, opts) => buildPictionaryReset(prev, uid, opts),
  })

  return {
    game: shared.game,
    ready: shared.ready,
    uid: shared.uid,
    signedIn: shared.signedIn,
    commitGame: shared.commitGame,
    resetGame: shared.resetGame,
  }
}
