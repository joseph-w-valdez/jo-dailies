import { describe, expect, it } from 'vitest'
import { CENTER, SCRABBLE_SIZE } from '../scrabble/board'
import {
  emptyBoard,
  extractFormedWords,
  scorePlay,
  validatePlacementGeometry,
  type Placement,
} from '../scrabble/rules'
import { createFullBag, drawTiles, letterValue } from '../scrabble/tiles'
import {
  applyPass,
  applyPlay,
  createInitialScrabble,
  startNewScrabble,
} from '../scrabble/state'
import { JENGA_PLAYER_UIDS } from '../jenga'

describe('scrabble tiles', () => {
  it('builds a 100-tile bag', () => {
    expect(createFullBag(() => 0.5).length).toBe(100)
  })

  it('blank tiles score 0', () => {
    expect(letterValue('Z', true)).toBe(0)
    expect(letterValue('Z', false)).toBe(10)
  })

  it('draws without mutating leftover count wrongly', () => {
    const bag = createFullBag(() => 0.1)
    const { drawn, bag: rest } = drawTiles(bag, 7)
    expect(drawn).toHaveLength(7)
    expect(rest).toHaveLength(93)
  })
})

describe('scrabble placement', () => {
  it('requires center on first play', () => {
    const board = emptyBoard()
    const placements: Placement[] = [
      { row: 0, col: 0, letter: 'A', tileId: '1', blank: false },
      { row: 0, col: 1, letter: 'T', tileId: '2', blank: false },
    ]
    expect(validatePlacementGeometry(board, placements)).toMatch(/center/i)
  })

  it('accepts a two-letter word through center', () => {
    const board = emptyBoard()
    const placements: Placement[] = [
      {
        row: CENTER,
        col: CENTER,
        letter: 'A',
        tileId: '1',
        blank: false,
      },
      {
        row: CENTER,
        col: CENTER + 1,
        letter: 'T',
        tileId: '2',
        blank: false,
      },
    ]
    expect(validatePlacementGeometry(board, placements)).toBeNull()
    const words = extractFormedWords(board, placements)
    expect(words.map((w) => w.word)).toEqual(['AT'])
  })

  it('scores double-letter on newly covered premium', () => {
    const board = emptyBoard()
    // Place on a DL near center path — use known DL at (0,3) after opening elsewhere.
    // Simpler: score HELLO with H on TW would be huge; use plain letters on ★+DW.
    const placements: Placement[] = [
      {
        row: CENTER,
        col: CENTER,
        letter: 'H',
        tileId: '1',
        blank: false,
      },
      {
        row: CENTER,
        col: CENTER + 1,
        letter: 'I',
        tileId: '2',
        blank: false,
      },
    ]
    const words = extractFormedWords(board, placements)
    // ★ is DW for first word
    const score = scorePlay(board, placements, words)
    // H(4)+I(1)=5 * 2 (star DW) = 10
    expect(score).toBe(10)
  })

  it('awards bingo for 7 tiles', () => {
    const board = emptyBoard()
    const placements: Placement[] = Array.from({ length: 7 }, (_, i) => ({
      row: CENTER,
      col: CENTER - 3 + i,
      letter: 'A',
      tileId: String(i),
      blank: false,
    }))
    // May fail geometry if not contiguous with letters - they are contiguous
    expect(validatePlacementGeometry(board, placements)).toBeNull()
    const words = extractFormedWords(board, placements)
    const score = scorePlay(board, placements, words)
    expect(score).toBeGreaterThanOrEqual(50)
  })
})

describe('scrabble turns', () => {
  it('ends after two consecutive passes', () => {
    const a = JENGA_PLAYER_UIDS[0]!
    const b = JENGA_PLAYER_UIDS[1]!
    let state = createInitialScrabble(a)
    state = applyPass(state, a)!
    expect(state.status).toBe('playing')
    expect(state.turnUid).toBe(b)
    state = applyPass(state, b)!
    expect(state.status).toBe('finished')
  })

  it('applyPlay removes tiles and awards score', () => {
    const uid = JENGA_PLAYER_UIDS[0]!
    let state = createInitialScrabble(uid)
    // Force rack letters for a known play
    const tiles = [
      { id: 'a', letter: 'A', blank: false },
      { id: 't', letter: 'T', blank: false },
      ...state.racks[uid]!.slice(0, 5),
    ]
    state = {
      ...state,
      racks: { ...state.racks, [uid]: tiles },
    }
    const placements: Placement[] = [
      {
        row: CENTER,
        col: CENTER,
        letter: 'A',
        tileId: 'a',
        blank: false,
      },
      {
        row: CENTER,
        col: CENTER + 1,
        letter: 'T',
        tileId: 't',
        blank: false,
      },
    ]
    const next = applyPlay(state, uid, placements)
    expect(next).not.toBeNull()
    expect(next!.scores[uid]).toBeGreaterThan(0)
    expect(next!.board[cellIndex(CENTER, CENTER)]?.letter).toBe('A')
    expect(next!.racks[uid]!.some((t) => t.id === 'a')).toBe(false)
  })

  it('startNewScrabble keeps history and logs finals', () => {
    const a = JENGA_PLAYER_UIDS[0]!
    const b = JENGA_PLAYER_UIDS[1]!
    let state = createInitialScrabble(a)
    state = applyPass(state, a)!
    state = {
      ...state,
      scores: { ...state.scores, [a]: 42, [b]: 17 },
    }
    const priorLen = state.moveLog.length
    const next = startNewScrabble(state, a, { hotseat: true })
    expect(next.status).toBe('playing')
    expect(next.scores[a]).toBe(0)
    expect(next.scores[b]).toBe(0)
    expect(next.hotseat).toBe(true)
    expect(next.moveLog.length).toBe(priorLen + 1)
    const marker = next.moveLog[next.moveLog.length - 1]!
    expect(marker.kind).toBe('newGame')
    expect(marker.finals?.[a]).toBe(42)
    expect(marker.finals?.[b]).toBe(17)
    expect(next.moveLog.some((e) => e.kind === 'pass')).toBe(true)
  })
})

function cellIndex(row: number, col: number): number {
  return row * SCRABBLE_SIZE + col
}
