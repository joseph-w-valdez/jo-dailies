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
  const clueUid = game.clueUid
  const actorUid = (() => {
    if (!game.hotseat || !uid) return uid
    if (game.phase === 'clue' && clueUid) return clueUid
    if (game.phase === 'guess' && clueUid) return guesserUid(clueUid)
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
    clueUid != null &&
    actorUid === clueUid
  const canGuess =
    signedIn &&
    game.status === 'playing' &&
    game.phase === 'guess' &&
    clueUid != null &&
    actorUid === guesserUid(clueUid)
  const canSudden =
    signedIn &&
    game.status === 'playing' &&
    game.phase === 'sudden' &&
    Boolean(actorUid) &&
    remainingForUid(game.cards, otherPlayerUid(actorUid!)) > 0

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
