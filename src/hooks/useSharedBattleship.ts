import {
  battleshipToDoc,
  createInitialBattleship,
  normalizeBattleship,
  type BattleshipState,
} from '../lib/battleship'
import { useSharedGameDoc } from './useSharedGameDoc'

export function useSharedBattleship() {
  const shared = useSharedGameDoc<BattleshipState>({
    collectionId: 'battleship',
    createInitial: (uid) => createInitialBattleship(uid),
    normalize: (raw, uid) => normalizeBattleship(raw, uid),
    toDoc: (state) => battleshipToDoc(state),
    buildReset: (_prev, uid, opts) =>
      createInitialBattleship(uid, { hotseat: Boolean(opts?.hotseat) }),
  })

  const { game, uid, signedIn, user } = shared
  const actorUid = game.hotseat ? game.turnUid : uid

  return {
    game: shared.game,
    ready: shared.ready,
    uid,
    actorUid,
    canShoot:
      signedIn &&
      game.status === 'playing' &&
      (game.hotseat || game.turnUid === user?.uid),
    commitGame: shared.commitGame,
    resetGame: shared.resetGame,
  }
}
