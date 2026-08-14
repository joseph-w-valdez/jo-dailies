import {
  createInitialHangman,
  normalizeHangman,
  type HangmanState,
} from '../lib/hangman'
import { useSharedGameDoc } from './useSharedGameDoc'

export function useSharedHangman() {
  const shared = useSharedGameDoc<HangmanState>({
    collectionId: 'hangman',
    createInitial: (uid) => createInitialHangman(uid),
    normalize: (raw, uid) => normalizeHangman(raw, uid),
    buildReset: (_prev, uid, opts) =>
      createInitialHangman(uid, { hotseat: Boolean(opts?.hotseat) }),
  })

  const { game, uid } = shared
  const actorUid = game.hotseat ? game.turnUid : uid

  return {
    game: shared.game,
    ready: shared.ready,
    uid,
    actorUid,
    commitGame: shared.commitGame,
    resetGame: shared.resetGame,
  }
}
