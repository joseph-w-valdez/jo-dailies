import { describe, expect, it } from 'vitest'
import { JENGA_PLAYER_UIDS } from './jenga'
import {
  applyWordleGuess,
  createInitialWordle,
  selectWordleLength,
  selectWordleMode,
  startWordleCoop,
  startWordleVersus,
  submitVersusWord,
} from './wordle'
import { markWordleGuess } from './wordleWords'
import {
  createInitialCodenames,
  dealCodenames,
  submitCodenamesClue,
  teamForUid,
} from './codenames'
import {
  applyHangmanGuess,
  createInitialHangman,
  selectHangmanLength,
  selectHangmanMode,
  startHangmanCoop,
} from './hangman'

describe('wordle', () => {
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

  it('co-op accepts any letter probe of the answer length', () => {
    let s = createInitialWordle(JENGA_PLAYER_UIDS[0]!)
    s = startWordleCoop(s, () => 0)
    expect(s.answer).toBeTruthy()
    expect(s.answer!.length).toBe(5)
    const probe = 'xxxxx'
    const probed = applyWordleGuess(s, JENGA_PLAYER_UIDS[0]!, probe)
    expect(probed?.status).toBe('playing')
    expect(probed?.guessesByUid[JENGA_PLAYER_UIDS[0]!]?.[0]?.word).toBe(probe)
    const won = applyWordleGuess(probed!, JENGA_PLAYER_UIDS[1]!, s.answer!)
    expect(won?.status).toBe('won')
  })

  it('picks length after mode', () => {
    let s = selectWordleMode(createInitialWordle(JENGA_PLAYER_UIDS[0]!), 'coop')
    expect(s.phase).toBe('pickLength')
    s = selectWordleLength(s, 'variable', () => 0)!
    expect(s.phase).toBe('playing')
    expect(s.lengthMode).toBe('variable')
    expect(s.answer).toBeTruthy()
  })

  it('versus locks both words before play', () => {
    let s = startWordleVersus(createInitialWordle(JENGA_PLAYER_UIDS[0]!))
    expect(s.lengthMode).toBe('standard')
    s = submitVersusWord(s, JENGA_PLAYER_UIDS[0]!, 'apple')!
    expect(s.phase).toBe('versusSetup')
    s = submitVersusWord(s, JENGA_PLAYER_UIDS[1]!, 'beach')!
    expect(s.phase).toBe('playing')
    expect(s.answersByUid[JENGA_PLAYER_UIDS[1]!]).toBe('apple')
    expect(s.answersByUid[JENGA_PLAYER_UIDS[0]!]).toBe('beach')
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
  it('deals 25 cards with assassin', () => {
    const cards = dealCodenames(() => 0.5)
    expect(cards).toHaveLength(25)
    expect(cards.some((c) => c.team === 'assassin')).toBe(true)
  })

  it('maps seats to teams', () => {
    expect(teamForUid(JENGA_PLAYER_UIDS[0]!)).toBe('red')
    expect(teamForUid(JENGA_PLAYER_UIDS[1]!)).toBe('blue')
  })

  it('clue moves to guess phase', () => {
    let s = createInitialCodenames({ random: () => 0.2 })
    s = submitCodenamesClue(s, JENGA_PLAYER_UIDS[0]!, 'animal', 2)!
    expect(s.phase).toBe('guess')
    expect(s.guessesLeft).toBe(3)
  })
})
