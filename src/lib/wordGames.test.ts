import { describe, expect, it } from 'vitest'
import { JENGA_PLAYER_UIDS } from './jenga'
import {
  applyWordleGuess,
  createInitialWordle,
  selectWordleFirst,
  selectWordleLength,
  selectWordleMode,
  startWordleCoop,
  startWordleVersus,
  submitVersusWord,
} from './wordle'
import { markWordleGuess } from './wordleWords'
import {
  applyCodenamesGuess,
  createInitialCodenames,
  dealCodenames,
  remainingAgents,
  remainingForUid,
  roleFor,
  selectCodenamesFirstClue,
  selectCodenamesPack,
  submitCodenamesClue,
} from './codenames'
import {
  applyHangmanGuess,
  createInitialHangman,
  selectHangmanLength,
  selectHangmanMode,
  startHangmanCoop,
} from './hangman'

describe('wordle', () => {
  const jo = JENGA_PLAYER_UIDS[0]!
  const joha = JENGA_PLAYER_UIDS[1]!

  function fresh(first = jo) {
    return selectWordleFirst(createInitialWordle(jo), first)!
  }

  it('marks duplicates like Wordle', () => {
    expect(markWordleGuess('abbbb', 'axxxx')).toEqual([
      'correct',
      'absent',
      'absent',
      'absent',
      'absent',
    ])
  })

  it('marks variable-length words', () => {
    expect(markWordleGuess('jett', 'jett')).toEqual([
      'correct',
      'correct',
      'correct',
      'correct',
    ])
    expect(markWordleGuess('viper', 'valorant').length).toBe(8)
  })

  it('co-op rejects non-words and accepts a dictionary guess', () => {
    let s = startWordleCoop(fresh(), () => 0)
    expect(s.answer).toBeTruthy()
    expect(s.answer!.length).toBe(5)
    expect(applyWordleGuess(s, jo, 'xxxxx')).toBeNull()
    const probed = applyWordleGuess(s, jo, 'apple')
    expect(probed?.status).toBe('playing')
    expect(probed?.guessesByUid[jo]?.[0]?.word).toBe('apple')
    const won = applyWordleGuess(probed!, joha, s.answer!)
    expect(won?.status).toBe('won')
  })

  it('picks length after mode', () => {
    let s = selectWordleMode(fresh(), 'coop')
    expect(s.phase).toBe('pickLength')
    s = selectWordleLength(s, 'variable', () => 0)!
    expect(s.phase).toBe('playing')
    expect(s.lengthMode).toBe('variable')
    expect(s.answer).toBeTruthy()
  })

  it('versus locks both words before play', () => {
    let s = startWordleVersus(fresh(joha))
    expect(s.lengthMode).toBe('standard')
    expect(submitVersusWord(s, jo, 'xxxxx')).toBeNull()
    s = submitVersusWord(s, jo, 'apple')!
    expect(s.phase).toBe('versusSetup')
    s = submitVersusWord(s, joha, 'beach')!
    expect(s.phase).toBe('playing')
    expect(s.answersByUid[joha]).toBe('apple')
    expect(s.answersByUid[jo]).toBe('beach')
    expect(s.turnUid).toBe(joha)
    expect(applyWordleGuess(s, jo, 'zzzzz')).toBeNull()
  })

  it('selectWordleFirst sets the opening seat', () => {
    const s = selectWordleFirst(createInitialWordle(jo), joha)!
    expect(s.firstUid).toBe(joha)
    expect(s.turnUid).toBe(joha)
    expect(selectWordleFirst(s, jo)).toBeNull()
  })
})

describe('hangman', () => {
  it('hangman picks length after mode', () => {
    let s = selectHangmanMode(createInitialHangman(JENGA_PLAYER_UIDS[0]!), 'coop')
    expect(s.phase).toBe('pickLength')
    s = selectHangmanLength(s, 'variable', () => 0)!
    expect(s.phase).toBe('playing')
    expect(s.lengthMode).toBe('variable')
    expect(s.word).toBeTruthy()
  })

  it('co-op solves when all letters guessed', () => {
    let s = startHangmanCoop(createInitialHangman(JENGA_PLAYER_UIDS[0]!), () => 0)
    expect(s.lengthMode).toBe('standard')
    const word = s.word!
    for (const ch of [...new Set(word.split(''))]) {
      s = applyHangmanGuess(s, s.turnUid, ch)!
    }
    expect(s.status).toBe('won')
  })
})

describe('codenames', () => {
  const a = JENGA_PLAYER_UIDS[0]!
  const b = JENGA_PLAYER_UIDS[1]!

  it('deals 15 unique agents and 9 per seat', () => {
    const cards = dealCodenames('standard', () => 0.5)
    expect(cards).toHaveLength(25)
    expect(remainingAgents(cards)).toBe(15)
    expect(remainingForUid(cards, a)).toBe(9)
    expect(remainingForUid(cards, b)).toBe(9)
    expect(cards.some((c) => roleFor(c, a) === 'assassin')).toBe(true)
  })

  it('full pack can deal a valorant name', () => {
    const cards = dealCodenames('full', () => 0.11)
    expect(cards).toHaveLength(25)
    expect(cards.every((c) => c.word.length <= 12)).toBe(true)
  })

  it('clue then guess uses the clue-giver key', () => {
    let s = createInitialCodenames({ hotseat: true })
    s = selectCodenamesPack(s, 'standard', () => 0.2)!
    s = selectCodenamesFirstClue(s, a)!
    s = submitCodenamesClue(s, a, 'animal', 2)!
    expect(s.phase).toBe('guess')
    const agent = s.cards.find(
      (c) => roleFor(c, a) === 'agent' && !c.contacted,
    )!
    s = applyCodenamesGuess(s, b, agent.id)!
    expect(s.cards.find((c) => c.id === agent.id)?.contacted).toBe(true)
    expect(s.status).toBe('playing')
  })

  it('assassin on the clue-giver key loses', () => {
    let s = createInitialCodenames()
    s = selectCodenamesPack(s, 'standard', () => 0.3)!
    s = selectCodenamesFirstClue(s, a)!
    s = submitCodenamesClue(s, a, 'dark', 1)!
    const kill = s.cards.find((c) => roleFor(c, a) === 'assassin')!
    s = applyCodenamesGuess(s, b, kill.id)!
    expect(s.status).toBe('lost')
  })
})
