import {
  createInitialSpike,
  normalizeSpike,
  type SpikeMatch,
} from '../lib/spike'
import { JENGA_PLAYER_UIDS } from '../lib/jenga'
import { useSharedGameDoc } from './useSharedGameDoc'

export function useSharedSpike() {
  const shared = useSharedGameDoc<SpikeMatch>({
    collectionId: 'spike',
    createInitial: (uid) => createInitialSpike(uid),
    normalize: (raw, uid) => normalizeSpike(raw, uid),
    buildReset: (_prev, uid, opts) =>
      createInitialSpike(uid, { hotseat: Boolean(opts?.hotseat) }),
  })

  const { game, uid, signedIn } = shared
  const actorUid = game.hotseat ? game.turnUid : uid
  const mySeat =
    uid && JENGA_PLAYER_UIDS.includes(uid as (typeof JENGA_PLAYER_UIDS)[number])
      ? (JENGA_PLAYER_UIDS.indexOf(uid as (typeof JENGA_PLAYER_UIDS)[number]) as
          | 0
          | 1)
      : uid !== 'local'
        ? 0
        : null

  const me = actorUid ? game.fighters[actorUid] : null

  return {
    game: shared.game,
    ready: shared.ready,
    uid,
    actorUid,
    mySeat,
    me,
    canPlay:
      signedIn &&
      game.firstUid != null &&
      game.phase === 'playing' &&
      (game.hotseat || game.turnUid === uid),
    canBuy:
      signedIn &&
      game.firstUid != null &&
      game.phase === 'buy' &&
      (game.hotseat || Boolean(uid && game.fighters[uid])),
    commitGame: shared.commitGame,
    resetGame: shared.resetGame,
  }
}
