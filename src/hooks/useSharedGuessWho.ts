import {
  createInitialGuessWho,
  guessWhoToDoc,
  normalizeGuessWho,
  type GuessWhoState,
} from '../lib/guessWho'
import { JENGA_PLAYER_UIDS } from '../lib/jenga'
import { useSharedGameDoc } from './useSharedGameDoc'

export function useSharedGuessWho() {
  const shared = useSharedGameDoc<GuessWhoState>({
    collectionId: 'guesswho',
    createInitial: (uid) => createInitialGuessWho(uid),
    normalize: (raw, uid) => normalizeGuessWho(raw, uid),
    toDoc: (state) => guessWhoToDoc(state),
    buildReset: (_prev, uid, opts) =>
      createInitialGuessWho(uid, { hotseat: Boolean(opts?.hotseat) }),
  })

  const { game, uid, signedIn } = shared
  const actorUid = game.hotseat ? game.turnUid : uid
  const mySeat =
    uid && JENGA_PLAYER_UIDS.includes(uid as (typeof JENGA_PLAYER_UIDS)[number])
      ? (JENGA_PLAYER_UIDS.indexOf(uid as (typeof JENGA_PLAYER_UIDS)[number]) as
          | 0
          | 1)
      : uid === 'local'
        ? 0
        : null

  const bothPicked = Boolean(
    game.seats[0].secretId && game.seats[1].secretId,
  )
  const awaitingFirst = bothPicked && game.firstUid == null

  return {
    game: shared.game,
    ready: shared.ready,
    uid,
    actorUid,
    mySeat,
    bothPicked,
    awaitingFirst,
    canPick:
      signedIn &&
      game.phase === 'picking' &&
      game.firstUid == null &&
      (game.hotseat
        ? !bothPicked
        : mySeat != null && !game.seats[mySeat].secretId),
    canFlip: signedIn && game.phase === 'playing',
    canGuess:
      signedIn &&
      game.phase === 'playing' &&
      game.status === 'playing' &&
      (game.hotseat || game.turnUid === uid),
    canPass:
      signedIn &&
      game.phase === 'playing' &&
      game.status === 'playing' &&
      (game.hotseat || game.turnUid === uid) &&
      game.turnUid === actorUid,
    commitGame: shared.commitGame,
    resetGame: shared.resetGame,
  }
}
