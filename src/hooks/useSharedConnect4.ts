import {
  createInitialConnect4,
  normalizeConnect4,
  type Connect4State,
} from '../lib/connect4'
import { JENGA_PLAYER_UIDS } from '../lib/jenga'
import { useSharedGameDoc } from './useSharedGameDoc'

export function useSharedConnect4() {
  const shared = useSharedGameDoc<Connect4State>({
    collectionId: 'connect4',
    createInitial: (uid) => createInitialConnect4(uid),
    normalize: (raw, uid) => normalizeConnect4(raw, uid),
    buildReset: (_prev, uid, opts) =>
      createInitialConnect4(uid, { hotseat: Boolean(opts?.hotseat) }),
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

  return {
    game: shared.game,
    ready: shared.ready,
    uid,
    actorUid,
    mySeat,
    canPlay:
      signedIn &&
      game.status === 'playing' &&
      (game.hotseat || game.turnUid === uid),
    commitGame: shared.commitGame,
    resetGame: shared.resetGame,
  }
}
