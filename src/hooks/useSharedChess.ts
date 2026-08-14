import {
  chessToDoc,
  createInitialChess,
  normalizeChess,
  startNewChess,
  type ChessState,
} from '../lib/chess'
import { useSharedGameDoc } from './useSharedGameDoc'

export function useSharedChess() {
  const shared = useSharedGameDoc<ChessState>({
    collectionId: 'chess',
    createInitial: (uid) => createInitialChess(uid),
    normalize: (raw, uid) => normalizeChess(raw, uid),
    toDoc: (state) => chessToDoc(state),
    buildReset: (prev, _uid, opts) =>
      startNewChess(prev, { hotseat: Boolean(opts?.hotseat) }),
  })

  const { game, uid, signedIn, user } = shared
  const actorUid = game.hotseat ? game.turnUid : uid

  return {
    game: shared.game,
    ready: shared.ready,
    uid,
    actorUid,
    canPlay:
      signedIn &&
      game.status === 'playing' &&
      (game.hotseat || game.turnUid === user?.uid),
    canUndo:
      signedIn &&
      game.undoStack.length > 0 &&
      (game.hotseat || game.turnUid === user?.uid),
    commitGame: shared.commitGame,
    resetGame: shared.resetGame,
  }
}
