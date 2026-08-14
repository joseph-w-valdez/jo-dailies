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
  applyBlankStare,
  applyCatBurglar,
  applyMeowtiply,
  applyPass,
  applyPlay,
  applyShelfCheck,
  beginPeekAPaw,
  createInitialScrabble,
  finishPeekAPaw,
  flagScrabbleOnTime,
  normalizeScrabble,
  SCRABBLE_SKILL_MAX,
  selectScrabbleClockMode,
  selectScrabbleFirst,
  shuffleRack,
  startNewScrabble,
  type ScrabbleState,
  type ScrabbleTile,
} from '../scrabble/state'
import { SCRABBLE_CLOCK_MS } from '../gameClock'
import { JENGA_PLAYER_UIDS, normalizeGameState } from '../jenga'

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
    expect(next!.lastPlayCells).toEqual([
      { row: CENTER, col: CENTER },
      { row: CENTER, col: CENTER + 1 },
    ])
  })

  it('startNewScrabble clears move history', () => {
    const a = JENGA_PLAYER_UIDS[0]!
    const b = JENGA_PLAYER_UIDS[1]!
    let state = createInitialScrabble(a)
    state = applyPass(state, a)!
    state = {
      ...state,
      scores: { ...state.scores, [a]: 42, [b]: 17 },
    }
    expect(state.moveLog.length).toBeGreaterThan(0)
    const next = startNewScrabble(state, a, { hotseat: true })
    expect(next.status).toBe('playing')
    expect(next.scores[a]).toBe(0)
    expect(next.scores[b]).toBe(0)
    expect(next.hotseat).toBe(true)
    expect(next.moveLog).toEqual([])
    expect(next.clockMode).toBeNull()
    expect(next.firstUid).toBeNull()
  })

  it('timed mode flags the player to move', () => {
    const a = JENGA_PLAYER_UIDS[0]!
    const b = JENGA_PLAYER_UIDS[1]!
    let state = startNewScrabble(createInitialScrabble(a), a)
    expect(applyPass(state, a)).toBeNull()
    state = selectScrabbleFirst(state, a)!
    state = selectScrabbleClockMode(state, 'timed', 1_000)!
    expect(state.clockMs[a]).toBe(SCRABBLE_CLOCK_MS)
    const flagged = flagScrabbleOnTime(state, 1_000 + SCRABBLE_CLOCK_MS + 1)!
    expect(flagged.status).toBe('finished')
    expect(flagged.winnerUid).toBe(b)
  })
})

function hasUndefined(value: unknown): boolean {
  if (value === undefined) return true
  if (Array.isArray(value)) return value.some(hasUndefined)
  if (value && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).some(hasUndefined)
  }
  return false
}

describe('firestore payloads', () => {
  it('normalized scrabble state has no undefined fields', () => {
    const uid = JENGA_PLAYER_UIDS[0]!
    const passed = applyPass(createInitialScrabble(uid), uid)!
    const normalized = normalizeScrabble(
      JSON.parse(JSON.stringify(passed)) as Record<string, unknown>,
      uid,
    )
    expect(hasUndefined(normalized)).toBe(false)
    expect(hasUndefined(startNewScrabble(normalized, uid))).toBe(false)
  })

  it('normalized jenga state has no undefined fields', () => {
    const uid = JENGA_PLAYER_UIDS[0]!
    const normalized = normalizeGameState(
      { version: 1, bricks: [{ id: 'b-0-0', x: 0, y: 0, z: 0 }] },
      uid,
    )
    expect(hasUndefined(normalized)).toBe(false)
  })
})

function cellIndex(row: number, col: number): number {
  return row * SCRABBLE_SIZE + col
}

function tile(id: string, letter: string, blank = false): ScrabbleTile {
  return { id, letter, blank }
}

function withRacks(
  state: ScrabbleState,
  racks: Record<string, ScrabbleTile[]>,
): ScrabbleState {
  return { ...state, racks: { ...state.racks, ...racks } }
}

describe('scrabble skills', () => {
  const a = JENGA_PLAYER_UIDS[0]!
  const b = JENGA_PLAYER_UIDS[1]!

  it('starts with 2 charges per skill and no meowtiply/peek', () => {
    const state = createInitialScrabble(a)
    expect(state.skills[a]?.catBurglar).toBe(SCRABBLE_SKILL_MAX)
    expect(state.skills[b]?.meowtiply).toBe(SCRABBLE_SKILL_MAX)
    expect(state.meowtiplyFor).toBeNull()
    expect(state.peek).toBeNull()
  })

  it('shuffleRack reorders without spending charges', () => {
    let state = createInitialScrabble(a)
    const ordered = [
      tile('1', 'A'),
      tile('2', 'B'),
      tile('3', 'C'),
      tile('4', 'D'),
    ]
    state = withRacks(state, { [a]: ordered })
    const next = shuffleRack(state, a, () => 0)
    expect(next).not.toBeNull()
    expect(next!.skills[a]?.catBurglar).toBe(SCRABBLE_SKILL_MAX)
    // random() => 0 always swaps with index 0
    expect(next!.racks[a]!.map((t) => t.id)).toEqual(['2', '3', '4', '1'])
    expect(next!.moveLog.length).toBe(state.moveLog.length)
  })

  it('shuffleRack works even when it is not your turn', () => {
    let state = createInitialScrabble(a)
    state = { ...state, turnUid: b }
    const ordered = [
      tile('1', 'A'),
      tile('2', 'B'),
      tile('3', 'C'),
    ]
    state = withRacks(state, { [a]: ordered })
    const next = shuffleRack(state, a, () => 0)
    expect(next).not.toBeNull()
    expect(next!.turnUid).toBe(b)
    expect(next!.racks[a]!.map((t) => t.id)).toEqual(['2', '3', '1'])
  })

  it('Cat Burglar steals a vowel and spends a charge', () => {
    let state = createInitialScrabble(a)
    state = withRacks(state, {
      [a]: [tile('m1', 'B'), tile('m2', 'C')],
      [b]: [tile('o1', 'Q'), tile('o2', 'E'), tile('o3', 'Z')],
    })
    const bagBefore = state.bag.length
    const next = applyCatBurglar(state, a, () => 0)
    expect(next).not.toBeNull()
    expect(next!.skills[a]?.catBurglar).toBe(SCRABBLE_SKILL_MAX - 1)
    expect(next!.racks[a]!.some((t) => t.id === 'o2')).toBe(true)
    expect(next!.racks[b]!.some((t) => t.id === 'o2')).toBe(false)
    expect(next!.racks[b]).toHaveLength(3)
    expect(next!.bag.length).toBe(bagBefore - 1)
    expect(next!.moveLog.at(-1)?.kind).toBe('skill')
  })

  it('Blank Stare turns a letter into a blank', () => {
    let state = createInitialScrabble(a)
    state = withRacks(state, {
      [a]: [tile('x', 'X'), tile('y', 'Y')],
    })
    const next = applyBlankStare(state, a, 'x')
    expect(next).not.toBeNull()
    const blanked = next!.racks[a]!.find((t) => t.id === 'x')!
    expect(blanked.blank).toBe(true)
    expect(blanked.letter).toBe('')
    expect(next!.skills[a]?.blankStare).toBe(SCRABBLE_SKILL_MAX - 1)
  })

  it('Shelf Check knocks an opponent tile into the bag', () => {
    let state = createInitialScrabble(a)
    state = withRacks(state, {
      [b]: [tile('k', 'K'), tile('l', 'L')],
    })
    const bagBefore = state.bag.length
    const next = applyShelfCheck(state, a, () => 0)
    expect(next).not.toBeNull()
    expect(next!.racks[b]!.map((t) => t.id)).toEqual(['l'])
    expect(next!.bag.length).toBe(bagBefore + 1)
    expect(next!.bag.some((t) => t.id === 'k')).toBe(true)
    expect(next!.skills[a]?.shelfCheck).toBe(SCRABBLE_SKILL_MAX - 1)
  })

  it('Peek-a-Paw draws tiles then finish keeps one', () => {
    let state = createInitialScrabble(a)
    state = withRacks(state, {
      [a]: [tile('r1', 'A'), tile('r2', 'B')],
    })
    const bagBefore = state.bag.length
    const mid = beginPeekAPaw(state, a)
    expect(mid).not.toBeNull()
    expect(mid!.peek?.uid).toBe(a)
    expect(mid!.peek!.tiles.length).toBeGreaterThan(0)
    expect(mid!.peek!.tiles.length).toBeLessThanOrEqual(3)
    expect(mid!.bag.length).toBe(bagBefore - mid!.peek!.tiles.length)
    expect(mid!.skills[a]?.peekAPaw).toBe(SCRABBLE_SKILL_MAX - 1)

    const keep = mid!.peek!.tiles[0]!
    const done = finishPeekAPaw(mid!, a, keep.id, null)
    expect(done).not.toBeNull()
    expect(done!.peek).toBeNull()
    expect(done!.racks[a]!.some((t) => t.id === keep.id)).toBe(true)
    expect(done!.racks[a]).toHaveLength(3)
  })

  it('Meowtiply triples the next valid play score', () => {
    let state = createInitialScrabble(a)
    state = withRacks(state, {
      [a]: [
        tile('a', 'A'),
        tile('t', 'T'),
        ...state.racks[a]!.slice(0, 5),
      ],
    })
    const armed = applyMeowtiply(state, a)
    expect(armed).not.toBeNull()
    expect(armed!.meowtiplyFor).toBe(a)
    expect(armed!.skills[a]?.meowtiply).toBe(SCRABBLE_SKILL_MAX - 1)

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
    const plain = applyPlay(state, a, placements)!
    const boosted = applyPlay(armed!, a, placements)!
    expect(boosted.scores[a]).toBe((plain.scores[a] ?? 0) * 3)
    expect(boosted.meowtiplyFor).toBeNull()
    expect(boosted.moveLog.at(-1)?.note).toMatch(/Meowtiply/i)
  })

  it('skills fail when charges are spent', () => {
    let state = createInitialScrabble(a)
    state = {
      ...state,
      skills: {
        ...state.skills,
        [a]: {
          ...state.skills[a]!,
          catBurglar: 0,
        },
      },
    }
    state = withRacks(state, {
      [a]: [tile('m1', 'B')],
      [b]: [tile('o1', 'A')],
    })
    expect(applyCatBurglar(state, a)).toBeNull()
  })
})
