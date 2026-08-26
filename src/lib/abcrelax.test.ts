import { describe, expect, it, vi } from 'vitest'
import {
  ABCRELAX_LETTERS,
  challengeAbcrelaxLast,
  createInitialAbcrelax,
  normalizeAbcrelax,
  pickAbcrelaxTheme,
  pickAbcrelaxTimer,
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
  let s = createInitialAbcrelax(jo)
  s = selectAbcrelaxFirst(s, jo)!
  s = pickAbcrelaxTheme(s, jo, 'Animals')!
  s = pickAbcrelaxTimer(s, jo, 10_000)!
  return { ...s, ...patch }
}

describe('abcrelax', () => {
  it('wordMatchesLetter is case-insensitive', () => {
    expect(wordMatchesLetter('Apple', 'a')).toBe(true)
    expect(wordMatchesLetter('cat', 'D')).toBe(false)
  })

  it('setup: first → theme → timer starts play', () => {
    let s = selectAbcrelaxFirst(createInitialAbcrelax(jo), jo)!
    expect(s.phase).toBe('pickTheme')
    s = pickAbcrelaxTheme(s, jo, 'Movies')!
    expect(s.phase).toBe('pickTimer')
    s = pickAbcrelaxTimer(s, jo, 15_000)!
    expect(s.phase).toBe('playing')
    expect(s.turnMs).toBe(15_000)
  })

  it('submit locks letter and passes turn immediately', () => {
    const s0 = primed()
    const s1 = submitAbcrelaxAnswer(s0, jo, 'A', 'Ant')!
    expect(s1.phase).toBe('playing')
    expect(s1.usedLetters).toContain('A')
    expect(s1.turnUid).toBe(joha)
    expect(s1.lastAnswer).toEqual({ uid: jo, letter: 'A', word: 'Ant' })
    expect(s1.deadlineAt).toBeGreaterThan(Date.now())
  })

  it('optional challenge of last answer wins for challenger', () => {
    const s0 = primed()
    const s1 = submitAbcrelaxAnswer(s0, jo, 'A', 'Ant')!
    const s2 = challengeAbcrelaxLast(s1, joha)!
    expect(s2.status).toBe('won')
    expect(s2.winnerUid).toBe(joha)
  })

  it('timeout makes the other player win', () => {
    vi.useFakeTimers()
    const now = Date.now()
    vi.setSystemTime(now)
    const s0 = primed({ deadlineAt: now - 1 })
    const s1 = resolveAbcrelaxTimeout(s0)!
    expect(s1.status).toBe('won')
    expect(s1.winnerUid).toBe(joha)
    vi.useRealTimers()
  })

  it('clearing the alphabet is a draw', () => {
    const almost = ABCRELAX_LETTERS.slice(0, 25)
    const s0 = primed({ usedLetters: almost, turnUid: jo })
    const s1 = submitAbcrelaxAnswer(s0, jo, 'Z', 'Zebra')!
    expect(s1.status).toBe('draw')
    expect(s1.phase).toBe('finished')
  })

  it('surrender ends the match', () => {
    const s = surrenderAbcrelax(primed(), jo)!
    expect(s.winnerUid).toBe(joha)
  })

  it('normalize recovers bad docs', () => {
    const n = normalizeAbcrelax(
      {
        version: 'x',
        usedLetters: ['aa', 'B'],
        phase: 'pending',
        firstUid: jo,
        status: 'playing',
      },
      jo,
    )
    expect(n.version).toBe(1)
    expect(n.usedLetters).toEqual(['B'])
    expect(n.phase).toBe('playing')
  })
})
