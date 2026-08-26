import {
  createInitialAbcrelax,
  normalizeAbcrelax,
  type AbcrelaxState,
} from '../lib/abcrelax'
import { JENGA_PLAYER_UIDS } from '../lib/jenga'
import { useSharedGameDoc } from './useSharedGameDoc'

export function useSharedAbcrelax() {
  const shared = useSharedGameDoc<AbcrelaxState>({
    collectionId: 'abcrelax',
    createInitial: (uid) => createInitialAbcrelax(uid),
    normalize: (raw, uid) => normalizeAbcrelax(raw, uid),
    buildReset: (_prev, uid, opts) =>
      createInitialAbcrelax(uid, { hotseat: Boolean(opts?.hotseat) }),
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

  const canAct =
    signedIn &&
    game.firstUid != null &&
    game.status === 'playing' &&
    (game.hotseat || game.turnUid === uid)

  return {
    game: shared.game,
    ready: shared.ready,
    uid,
    actorUid,
    mySeat,
    canAct,
    commitGame: shared.commitGame,
    resetGame: shared.resetGame,
  }
}
