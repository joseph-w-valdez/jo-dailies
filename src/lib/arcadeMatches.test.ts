import { describe, expect, it } from 'vitest'
import {
  arcadeMatchDocId,
  arcadeMatchSummary,
  computeArcadeStats,
  matchFromGameTransition,
  type ArcadeMatch,
} from './arcadeMatches'
import { JENGA_PLAYER_UIDS } from './jenga'

const a = JENGA_PLAYER_UIDS[0]!
const b = JENGA_PLAYER_UIDS[1]!

const sampleMatches: ArcadeMatch[] = [
  {
    id: 'scrabble_r1',
    gameId: 'scrabble',
    roundId: 'r1',
    endedAt: 2_000,
    winnerUid: a,
    result: 'win',
    detail: '187–142',
    players: [a, b],
    hotseat: false,
    scrabble: {
      bestByUid: {
        [a]: { highTurn: 72, highTurnWords: 'QUARTZY', longestWord: 'QUARTZY' },
        [b]: { highTurn: 48, highTurnWords: 'OXIDE', longestWord: 'OXIDE' },
      },
      bingos: 1,
      plays: 18,
      passes: 1,
      exchanges: 2,
      skills: 3,
      margin: 45,
    },
  },
  {
    id: 'chess_r1',
    gameId: 'chess',
    roundId: 'r1',
    endedAt: 1_000,
    winnerUid: b,
    result: 'win',
    detail: 'Checkmate',
    players: [a, b],
    hotseat: false,
  },
]

describe('arcadeMatches', () => {
  it('records scrabble finish once', () => {
    const prev = {
      status: 'playing',
      roundId: 'r1',
      hotseat: false,
      scores: { [a]: 10, [b]: 20 },
    }
    const next = {
      status: 'finished',
      roundId: 'r1',
      hotseat: false,
      winnerUid: b,
      scores: { [a]: 40, [b]: 90 },
      updatedAt: 1000,
      moveLog: [
        {
          uid: a,
          kind: 'play',
          words: ['CAT'],
          score: 10,
          tilesPlayed: 3,
        },
        {
          uid: b,
          kind: 'play',
          words: ['QUARTZY'],
          score: 78,
          tilesPlayed: 7,
          note: 'Meowtiply ×3',
        },
        { uid: a, kind: 'pass', words: [], score: 0 },
      ],
    }
    const match = matchFromGameTransition('scrabble', prev, next)
    expect(match).toMatchObject({
      gameId: 'scrabble',
      roundId: 'r1',
      winnerUid: b,
      result: 'win',
      detail: '40–90',
      id: arcadeMatchDocId('scrabble', 'r1'),
      scrabble: {
        bestByUid: {
          [a]: {
            highTurn: 10,
            highTurnWords: 'CAT',
            longestWord: 'CAT',
          },
          [b]: {
            highTurn: 78,
            highTurnWords: 'QUARTZY',
            longestWord: 'QUARTZY',
          },
        },
        bingos: 1,
        plays: 2,
        passes: 1,
        margin: 50,
      },
    })
    expect(matchFromGameTransition('scrabble', next, next)).toBeNull()
  })

  it('skips hotseat and suika', () => {
    expect(
      matchFromGameTransition(
        'chess',
        { status: 'playing', roundId: 'c1' },
        {
          status: 'checkmate',
          roundId: 'c1',
          hotseat: true,
          winnerUid: a,
        },
      ),
    ).toBeNull()
    expect(
      matchFromGameTransition(
        'suika',
        { status: 'playing' },
        { status: 'over' },
      ),
    ).toBeNull()
  })

  it('labels jenga collapse and coop loss', () => {
    const jenga = matchFromGameTransition(
      'jenga',
      { status: 'playing', roundId: 'j1' },
      {
        status: 'collapsed',
        roundId: 'j1',
        winnerUid: a,
        removedCount: 4,
        endReason: 'topple',
        updatedAt: 2,
      },
    )
    expect(jenga?.result).toBe('collapsed')
    expect(arcadeMatchSummary(jenga!)).toContain('Collapsed')
    expect(arcadeMatchSummary(jenga!)).toContain('Joseph')

    const lost = matchFromGameTransition(
      'codenames',
      { status: 'playing', phase: 'guess', roundId: 'cn1' },
      {
        status: 'lost',
        phase: 'finished',
        roundId: 'cn1',
        wordPack: 'standard',
        winnerUid: null,
      },
    )
    expect(lost?.result).toBe('loss')
    expect(arcadeMatchSummary(lost!)).toBe('Lost')
  })

  it('records chess timeout and connect4 draw', () => {
    expect(
      matchFromGameTransition(
        'chess',
        { status: 'playing', roundId: 'ch1' },
        { status: 'timeout', roundId: 'ch1', winnerUid: b },
      )?.detail,
    ).toBe('On time')
    expect(
      matchFromGameTransition(
        'connect4',
        { status: 'playing', roundId: 'c41' },
        { status: 'draw', roundId: 'c41', winnerUid: null },
      )?.result,
    ).toBe('draw')
  })

  it('computes household stats from finished matches', () => {
    const stats = computeArcadeStats(sampleMatches)
    expect(stats.totalMatches).toBe(2)
    expect(
      (stats.winsByUid[a] ?? 0) + (stats.winsByUid[b] ?? 0),
    ).toBe(2)
    expect(stats.mostPlayed?.gameId).toBeTruthy()
    expect(stats.flavor.length).toBeGreaterThan(0)
    expect(stats.scrabbleHighScore).toBe(187)
    expect(stats.scrabbleBestTurnByUid[a]?.score).toBe(72)
    expect(stats.scrabbleBestTurnByUid[b]?.score).toBe(48)
    expect(stats.scrabbleLongestWordByUid[a]).toBe('QUARTZY')
    expect(stats.scrabbleBingos).toBe(1)
    expect(Object.keys(stats.winRateByUid)).toContain(a)
  })
})
