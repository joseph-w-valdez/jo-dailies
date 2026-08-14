import {
  createInitialCodenames,
  normalizeCodenames,
  guesserUid,
  remainingForUid,
  type CodenamesState,
} from '../lib/codenames'
import { otherPlayerUid } from '../lib/jenga'
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
  const actorUid = (() => {
    if (!game.hotseat) return uid
    if (game.phase === 'clue' && game.clueUid) return game.clueUid
    if (game.phase === 'guess' && game.clueUid) return guesserUid(game.clueUid)
    if (game.phase === 'sudden') {
      for (const seat of [uid, otherPlayerUid(uid)]) {
        if (remainingForUid(game.cards, otherPlayerUid(seat)) > 0) return seat
      }
    }
    return uid
  })()

  const canClue =
    signedIn &&
    game.status === 'playing' &&
    game.phase === 'clue' &&
    Boolean(game.clueUid) &&
    actorUid === game.clueUid
  const canGuess =
    signedIn &&
    game.status === 'playing' &&
    game.phase === 'guess' &&
    Boolean(game.clueUid) &&
    actorUid === guesserUid(game.clueUid)
  const canSudden =
    signedIn &&
    game.status === 'playing' &&
    game.phase === 'sudden' &&
    remainingForUid(game.cards, otherPlayerUid(actorUid)) > 0

  return {
    game: shared.game,
    ready: shared.ready,
    uid,
    actorUid,
    canClue,
    canGuess,
    canSudden,
    commitGame: shared.commitGame,
    resetGame: shared.resetGame,
  }
}
