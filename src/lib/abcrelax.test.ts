import { describe, expect, it, vi } from 'vitest'
import {
  ABCRELAX_CARDS_TO_WIN,
  ABCRELAX_LETTERS,
  ABCRELAX_TURN_MS,
  acceptAbcrelaxAnswer,
  challengeAbcrelaxAnswer,
  continueAbcrelaxRound,
  createInitialAbcrelax,
  normalizeAbcrelax,
  resolveAbcrelaxTimeout,
  selectAbcrelaxFirst,
  submitAbcrelaxAnswer,
  surrenderAbcrelax,
  wordMatchesLetter,
  type AbcrelaxState,
} from './abcrelax'
import { JENGA_PLAYER_UIDS } from './jenga'

const jo = JENGA_PLAYER_UIDS[0]!
const joha = JENGA_PLAYER_UIDS[1]!

function primed(patch?: Partial<AbcrelaxState>): AbcrelaxState {
  const s = selectAbcrelaxFirst(createInitialAbcrelax(jo), jo)!
  return { ...s, ...patch }
}

describe('abcrelax', () => {
  it('wordMatchesLetter is case-insensitive', () => {
    expect(wordMatchesLetter('Apple', 'a')).toBe(true)
    expect(wordMatchesLetter('banana', 'B')).toBe(true)
    expect(wordMatchesLetter('cat', 'D')).toBe(false)
  })

  it('selectFirst starts the timer immediately', () => {
    const s = selectAbcrelaxFirst(createInitialAbcrelax(jo), jo)!
    expect(s.firstUid).toBe(jo)
    expect(s.phase).toBe('playing')
    expect(s.turnUid).toBe(jo)
    expect(s.deadlineAt).toBeGreaterThan(Date.now())
  })

  it('submit → pending for opponent; accept locks letter', () => {
    const s0 = primed()
    const s1 = submitAbcrelaxAnswer(s0, jo, 'A', 'Ant')!
    expect(s1.phase).toBe('pending')
    expect(s1.turnUid).toBe(joha)
    expect(s1.pending).toEqual({ uid: jo, letter: 'A', word: 'Ant' })
    expect(s1.usedLetters).not.toContain('A')

    const s2 = acceptAbcrelaxAnswer(s1, joha)!
    expect(s2.phase).toBe('playing')
    expect(s2.usedLetters).toContain('A')
    expect(s2.turnUid).toBe(joha)
    expect(s2.pending).toBeNull()
  })

  it('challenge eliminates submitter and awards card', () => {
    const s0 = primed()
    const s1 = submitAbcrelaxAnswer(s0, jo, 'Z', 'Zebra')!
    const s2 = challengeAbcrelaxAnswer(s1, joha)!
    expect(s2.phase).toBe('roundOver')
    expect(s2.roundWinnerUid).toBe(joha)
    expect(s2.scores[joha]).toBe(1)
    expect(s2.alive[jo]).toBe(false)
  })

  it('timeout eliminates current player', () => {
    vi.useFakeTimers()
    const now = Date.now()
    vi.setSystemTime(now)
    const s0 = primed({ deadlineAt: now - 1 })
    const s1 = resolveAbcrelaxTimeout(s0)!
    expect(s1.phase).toBe('roundOver')
    expect(s1.roundWinnerUid).toBe(joha)
    vi.useRealTimers()
  })

  it('rejects used letter and mismatched word', () => {
    const s0 = primed({ usedLetters: ['A'] })
    expect(submitAbcrelaxAnswer(s0, jo, 'A', 'Ant')).toBeNull()
    expect(submitAbcrelaxAnswer(s0, jo, 'B', 'Apple')).toBeNull()
  })

  it('continue starts the next round immediately', () => {
    const s0 = primed({
      phase: 'roundOver',
      roundWinnerUid: joha,
      scores: { [jo]: 0, [joha]: 1 },
      deadlineAt: null,
    })
    const s1 = continueAbcrelaxRound(s0, jo)!
    expect(s1.phase).toBe('playing')
    expect(s1.roundStarterUid).toBe(jo)
    expect(s1.deadlineAt).toBeGreaterThan(Date.now())
    expect(s1.alive[jo]).toBe(true)
    expect(s1.alive[joha]).toBe(true)
    expect(s1.usedLetters).toEqual([])
  })

  it('reaches gameOver at cards-to-win', () => {
    const s3 = primed({
      scores: { [jo]: ABCRELAX_CARDS_TO_WIN - 1, [joha]: 0 },
      turnUid: joha,
      deadlineAt: Date.now() - 1,
    })
    const s4 = resolveAbcrelaxTimeout(s3)!
    expect(s4.phase).toBe('gameOver')
    expect(s4.status).toBe('won')
    expect(s4.winnerUid).toBe(jo)
    expect(s4.scores[jo]).toBe(ABCRELAX_CARDS_TO_WIN)
  })

  it('surrender ends the match', () => {
    const s = surrenderAbcrelax(primed(), jo)!
    expect(s.phase).toBe('gameOver')
    expect(s.winnerUid).toBe(joha)
  })

  it('normalize recovers bad docs', () => {
    const n = normalizeAbcrelax({ version: 'x', usedLetters: ['aa', 'B'] }, jo)
    expect(n.version).toBe(1)
    expect(n.usedLetters).toEqual(['B'])
    expect(ABCRELAX_LETTERS).toHaveLength(26)
    expect(ABCRELAX_TURN_MS).toBe(10_000)
  })
})
