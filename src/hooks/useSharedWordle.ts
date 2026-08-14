import {
  createInitialWordle,
  normalizeWordle,
  type WordleState,
} from '../lib/wordle'
import { useSharedGameDoc } from './useSharedGameDoc'

export function useSharedWordle() {
  const shared = useSharedGameDoc<WordleState>({
    collectionId: 'wordle',
    createInitial: (uid) => createInitialWordle(uid),
    normalize: (raw, uid) => normalizeWordle(raw, uid),
    buildReset: (_prev, uid, opts) =>
      createInitialWordle(uid, { hotseat: Boolean(opts?.hotseat) }),
  })

  const { game, uid, signedIn } = shared
  const actorUid = game.hotseat ? game.turnUid : uid
  const canAct =
    signedIn &&
    (game.phase === 'pickMode' ||
      game.phase === 'pickLength' ||
      game.phase === 'versusSetup' ||
      game.phase === 'finished' ||
      ((game.phase === 'playing' || game.status === 'playing') &&
        (game.hotseat || game.turnUid === uid)))

  return {
    game: shared.game,
    ready: shared.ready,
    uid,
    actorUid,
    canAct,
    commitGame: shared.commitGame,
    resetGame: shared.resetGame,
  }
}
