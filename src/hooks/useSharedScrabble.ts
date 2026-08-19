import {
  createInitialScrabble,
  normalizeScrabble,
  startNewScrabble,
  type ScrabbleState,
} from '../lib/scrabble'
import { useSharedGameDoc } from './useSharedGameDoc'

export function useSharedScrabble() {
  const shared = useSharedGameDoc<ScrabbleState>({
    collectionId: 'scrabble',
    createInitial: (uid) =>
      createInitialScrabble(uid, { clockMode: null, firstUid: null }),
    normalize: (raw, uid) => normalizeScrabble(raw, uid),
    buildReset: (prev, uid, opts) =>
      startNewScrabble(prev, uid, { hotseat: Boolean(opts?.hotseat) }),
  })

  const { game, uid, signedIn, user } = shared
  const actorUid = game.hotseat ? game.turnUid : uid
  const myRack = game.racks[actorUid] ?? []

  return {
    game: shared.game,
    ready: shared.ready,
    uid,
    actorUid,
    myRack,
    canAct:
      signedIn &&
      game.clockMode != null &&
      game.firstUid != null &&
      game.cheatsEnabled != null &&
      game.status === 'playing' &&
      (game.hotseat || game.turnUid === user?.uid),
    commitGame: shared.commitGame,
    resetGame: shared.resetGame,
  }
}
