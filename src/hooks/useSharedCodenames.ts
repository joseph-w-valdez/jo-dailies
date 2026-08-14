import {
  createInitialCodenames,
  normalizeCodenames,
  teamForUid,
  uidForTeam,
  type CodenamesState,
} from '../lib/codenames'
import { useSharedGameDoc } from './useSharedGameDoc'

export function useSharedCodenames() {
  const shared = useSharedGameDoc<CodenamesState>({
    collectionId: 'codenames',
    createInitial: () => createInitialCodenames(),
    normalize: (raw) => normalizeCodenames(raw),
    buildReset: (_prev, _uid, opts) =>
      createInitialCodenames({ hotseat: Boolean(opts?.hotseat) }),
  })

  const { game, uid, signedIn } = shared
  const myTeam = teamForUid(uid)
  const actorUid = game.hotseat ? uidForTeam(game.turnTeam) : uid
  const actorTeam = teamForUid(actorUid)
  const canAct =
    signedIn && game.status === 'playing' && actorTeam === game.turnTeam

  return {
    game: shared.game,
    ready: shared.ready,
    uid,
    myTeam,
    actorUid,
    actorTeam,
    canAct,
    commitGame: shared.commitGame,
    resetGame: shared.resetGame,
  }
}
