import { describe, expect, it } from 'vitest'
import { JENGA_PLAYER_UIDS } from './jenga'
import {
  algToIndex,
  applyChessMove,
  applyChessPromo,
  chessCol,
  chessPieceSrc,
  chessRow,
  createInitialChess,
  chessToDoc,
  indexToAlg,
  legalDests,
  normalizeChess,
  startNewChess,
  undoChessMove,
  type ChessKind,
  type ChessState,
} from './chess'

const white = JENGA_PLAYER_UIDS[0]!
const black = JENGA_PLAYER_UIDS[1]!

function play(
  state: ChessState,
  uid: string,
  from: string,
  to: string,
  promo?: ChessKind,
): ChessState {
  const next = applyChessMove(state, uid, algToIndex(from), algToIndex(to), promo)
  expect(next, `${from}${to}`).not.toBeNull()
  return next!
}

describe('chess', () => {
  it('only requests piece pngs that exist on disk', () => {
    expect(chessPieceSrc('white', 'q', 'pink')).toBe(
      '/chess/pink/white-queen.png',
    )
    expect(chessPieceSrc('black', 'q', 'pink')).toBe(
      '/chess/pink/black-queen.png',
    )
    expect(chessPieceSrc('white', 'k', 'pink')).toBe(
      '/chess/pink/white-king.png',
    )
    expect(chessPieceSrc('white', 'n', 'pink')).toBe(
      '/chess/pink/white-horse.png',
    )
    expect(chessPieceSrc('black', 'r', 'pink')).toBe(
      '/chess/pink/black-tower.png',
    )
    expect(chessPieceSrc('white', 'r', 'pink')).toBe(
      '/chess/pink/white-tower.png',
    )
    expect(chessPieceSrc('white', 'b', 'pink')).toBe(
      '/chess/pink/white-bishop.png',
    )
    expect(chessPieceSrc('white', 'q', 'blue')).toBeNull()
  })

  it('maps algebraic squares', () => {
    expect(indexToAlg(algToIndex('a1'))).toBe('a1')
    expect(indexToAlg(algToIndex('h8'))).toBe('h8')
    expect(indexToAlg(algToIndex('e4'))).toBe('e4')
    expect(chessRow(algToIndex('a1'))).toBe(7)
    expect(chessCol(algToIndex('h1'))).toBe(7)
  })

  it('starts with white to move and 20 legal pawn/knight dests from e2/g1', () => {
    const s = createInitialChess(white)
    expect(s.turn).toBe('white')
    expect(s.turnUid).toBe(white)
    expect(legalDests(s, algToIndex('e2')).sort()).toEqual(
      [algToIndex('e3'), algToIndex('e4')].sort(),
    )
    expect(legalDests(s, algToIndex('g1')).sort()).toEqual(
      [algToIndex('f3'), algToIndex('h3')].sort(),
    )
    expect(applyChessMove(s, black, algToIndex('e7'), algToIndex('e5'))).toBeNull()
  })

  it('plays a pawn and switches to black', () => {
    const s = play(createInitialChess(white), white, 'e2', 'e4')
    expect(s.turn).toBe('black')
    expect(s.turnUid).toBe(black)
    expect(s.board[algToIndex('e4')]?.kind).toBe('p')
    expect(s.board[algToIndex('e2')]).toBeNull()
    expect(s.lastFrom).toBe(algToIndex('e2'))
    expect(s.lastTo).toBe(algToIndex('e4'))
    expect(s.moveLog.at(-1)).toMatchObject({
      kind: 'move',
      san: 'Moved pawn from E2 to E4',
      color: 'white',
    })
  })

  it('rejects moving into check', () => {
    let s = createInitialChess(white)
    s = play(s, white, 'f2', 'f3')
    s = play(s, black, 'e7', 'e5')
    s = play(s, white, 'g2', 'g4')
    const doomed = applyChessMove(s, black, algToIndex('d8'), algToIndex('h4'))
    expect(doomed).not.toBeNull()
    expect(doomed!.status).toBe('checkmate')
    expect(doomed!.winnerUid).toBe(black)
  })

  it('castles kingside when path is clear', () => {
    let s = createInitialChess(white)
    s = play(s, white, 'e2', 'e4')
    s = play(s, black, 'e7', 'e5')
    s = play(s, white, 'g1', 'f3')
    s = play(s, black, 'b8', 'c6')
    s = play(s, white, 'f1', 'c4')
    s = play(s, black, 'g8', 'f6')
    s = play(s, white, 'e1', 'g1')
    expect(s.board[algToIndex('g1')]?.kind).toBe('k')
    expect(s.board[algToIndex('f1')]?.kind).toBe('r')
    expect(s.castleWK).toBe(false)
    expect(s.moveLog.at(-1)?.san).toBe('Castled kingside')
  })

  it('captures en passant', () => {
    let s = createInitialChess(white)
    s = play(s, white, 'e2', 'e4')
    s = play(s, black, 'a7', 'a6')
    s = play(s, white, 'e4', 'e5')
    s = play(s, black, 'd7', 'd5')
    s = play(s, white, 'e5', 'd6')
    expect(s.board[algToIndex('d6')]?.color).toBe('white')
    expect(s.board[algToIndex('d5')]).toBeNull()
    expect(s.moveLog.at(-1)?.san).toBe(
      'Moved pawn from E5 to D6 and captured enemy pawn (en passant)',
    )
  })

  it('promotes a pawn', () => {
    let s = createInitialChess(white)
    s = play(s, white, 'a2', 'a4')
    s = play(s, black, 'h7', 'h5')
    s = play(s, white, 'a4', 'a5')
    s = play(s, black, 'h5', 'h4')
    s = play(s, white, 'a5', 'a6')
    s = play(s, black, 'h4', 'h3')
    s = play(s, white, 'a6', 'b7')
    s = play(s, black, 'h3', 'g2')
    const pending = applyChessMove(s, white, algToIndex('b7'), algToIndex('a8'))
    expect(pending).not.toBeNull()
    expect(pending!.pendingPromo).toEqual({
      from: algToIndex('b7'),
      to: algToIndex('a8'),
      captured: 'r',
    })
    const promoted = applyChessPromo(pending!, white, 'q')
    expect(promoted).not.toBeNull()
    expect(promoted!.board[algToIndex('a8')]).toEqual({
      color: 'white',
      kind: 'q',
    })
    expect(promoted!.pendingPromo).toBeNull()
    expect(promoted!.turn).toBe('black')
    expect(promoted!.moveLog.at(-1)?.san).toBe(
      'Moved pawn from B7 to A8 and captured enemy rook, became a queen',
    )
  })

  it('current player can undo the opponent last move', () => {
    const afterWhite = play(createInitialChess(white), white, 'e2', 'e4')
    expect(afterWhite.undoStack).toHaveLength(1)
    expect(undoChessMove(afterWhite, white)).toBeNull()
    const undone = undoChessMove(afterWhite, black)
    expect(undone).not.toBeNull()
    expect(undone!.turn).toBe('white')
    expect(undone!.board[algToIndex('e2')]?.kind).toBe('p')
    expect(undone!.board[algToIndex('e4')]).toBeNull()
    expect(undone!.moveLog).toHaveLength(0)
    expect(undone!.undoStack).toHaveLength(0)
  })

  it('normalizes a Firestore-shaped doc', () => {
    const s = play(createInitialChess(white), white, 'e2', 'e4')
    const raw = {
      ...s,
      board: s.board.map((p) =>
        p ? `${p.color === 'white' ? 'w' : 'b'}${p.kind}` : '',
      ),
    }
    const n = normalizeChess(raw, white)
    expect(n.board[algToIndex('e4')]?.kind).toBe('p')
    expect(n.turn).toBe('black')
    expect(n.moveLog.at(-1)?.san).toBe('Moved pawn from E2 to E4')
  })

  it('startNewChess keeps history and logs a new-game marker', () => {
    const s = play(createInitialChess(white), white, 'e2', 'e4')
    const next = startNewChess(s)
    expect(next.board[algToIndex('e2')]?.kind).toBe('p')
    expect(next.moveLog.some((e) => e.san.includes('E2 to E4'))).toBe(true)
    expect(next.moveLog.at(-1)?.kind).toBe('newGame')
    expect(next.lastFrom).toBeNull()
    expect(next.lastTo).toBeNull()
  })

  it('normalizeChess does not treat null last-move as a8', () => {
    const s = createInitialChess(white)
    const n = normalizeChess(
      {
        ...chessToDoc(s),
        lastFrom: null,
        lastTo: null,
        epIndex: null,
      },
      white,
    )
    expect(n.lastFrom).toBeNull()
    expect(n.lastTo).toBeNull()
    expect(n.epIndex).toBeNull()
  })
})
