import { describe, expect, it, vi } from 'vitest'
import {
  ABCRELAX_LETTERS,
  ABCRELAX_THEMES,
  challengeAbcrelaxLast,
  createInitialAbcrelax,
  msLeft,
  normalizeAbcrelax,
  pickAbcrelaxTheme,
  pickAbcrelaxThemeRandom,
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

  it('random theme picks from the list', () => {
    const s0 = selectAbcrelaxFirst(createInitialAbcrelax(jo), jo)!
    const s1 = pickAbcrelaxThemeRandom(s0, jo, () => 0)!
    expect(s1.phase).toBe('pickTimer')
    expect(s1.theme).toBe(ABCRELAX_THEMES[0])
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

  it('pickTimer starts a full turnMs clock', () => {
    vi.useFakeTimers()
    const now = 1_700_000_000_000
    vi.setSystemTime(now)
    let s = selectAbcrelaxFirst(createInitialAbcrelax(jo), jo)!
    s = pickAbcrelaxTheme(s, jo, 'Animals')!
    s = pickAbcrelaxTimer(s, jo, 20_000)!
    expect(s.turnMs).toBe(20_000)
    expect(s.turnStartedAt).toBe(now)
    expect(s.deadlineAt).toBe(now + 20_000)
    expect(msLeft(s, now)).toBe(20_000)
    expect(msLeft(s, now + 5_000)).toBe(15_000)
    expect(resolveAbcrelaxTimeout(s, joha)).toBeNull()
    vi.setSystemTime(now + 20_000)
    expect(resolveAbcrelaxTimeout(s, jo)?.status).toBe('won')
    vi.useRealTimers()
  })

  it('opponent cannot resolve timeout before grace', () => {
    vi.useFakeTimers()
    const now = 1_700_000_000_000
    vi.setSystemTime(now)
    let s = pickAbcrelaxTheme(
      selectAbcrelaxFirst(createInitialAbcrelax(jo), jo)!,
      jo,
      'Animals',
    )!
    s = pickAbcrelaxTimer(s, jo, 20_000)!
    vi.setSystemTime(now + 20_000)
    expect(resolveAbcrelaxTimeout(s, joha)).toBeNull()
    vi.setSystemTime(now + 20_000 + 2_500)
    expect(resolveAbcrelaxTimeout(s, joha)?.winnerUid).toBe(joha)
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
