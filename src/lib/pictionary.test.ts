import { describe, expect, it } from 'vitest'
import {
  addPictionaryCustomCard,
  createInitialPictionary,
  dealPictionaryChoices,
  markPictionaryGotIt,
  nextPictionaryRound,
  normalizePictionary,
  pickPictionaryCard,
  pickPictionaryDeck,
  pictionaryGuesserUid,
  pictionaryGuessIsClose,
  pictionaryGuessMatches,
  pictionaryRoundPoints,
  pictionaryWordMask,
  playPictionaryAgain,
  resolvePictionaryTimeout,
  revealPictionaryHint,
  selectPictionaryFirst,
  skipPictionaryChoices,
  submitPictionaryGuess,
  surrenderPictionary,
  PICTIONARY_TOTAL_ROUNDS,
  PICTIONARY_TURN_MS,
  type PictionaryState,
} from './pictionary'
import { PICTIONARY_THEMES, pictionaryDeckPool } from './pictionaryDeck'
import { JENGA_PLAYER_UIDS } from './jenga'

const [A, B] = JENGA_PLAYER_UIDS

/** Deterministic rand that never deals a modifier (0.99 ≥ chance). */
function seq(...values: number[]) {
  let i = 0
  return () => values[i++ % values.length]!
}
const noMod = () => 0.99

function startRound(deck: 'animals' | 'all' = 'animals'): PictionaryState {
  const seated = selectPictionaryFirst(createInitialPictionary(A), A)!
  const dealt = pickPictionaryDeck(seated, deck, noMod)!
  return pickPictionaryCard(dealt, A, dealt.choices[0]!.id, 1_000)!
}

describe('pictionary deck', () => {
  it('has every theme with 20 cards per difficulty and no duplicate ids', () => {
    for (const theme of PICTIONARY_THEMES) {
      for (const d of ['easy', 'medium', 'hard'] as const) {
        expect(theme.cards.filter((c) => c.difficulty === d).length, `${theme.id} ${d}`).toBe(20)
      }
    }
    for (const classic of ['objects', 'people', 'actions', 'animals', 'places', 'difficult']) {
      expect(PICTIONARY_THEMES.some((t) => t.id === classic)).toBe(true)
    }
    const ids = pictionaryDeckPool('all', []).map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('deals one card per difficulty and avoids used cards', () => {
    const first = dealPictionaryChoices('food', {
      customCards: [],
      usedCardIds: [],
      recentCardIds: [],
    })
    expect(first.map((c) => c.difficulty)).toEqual(['easy', 'medium', 'hard'])
    const again = dealPictionaryChoices('food', {
      customCards: [],
      usedCardIds: first.map((c) => c.id),
      recentCardIds: [],
    })
    expect(again.some((c) => first.some((f) => f.id === c.id))).toBe(false)
  })
})

describe('pictionary guessing', () => {
  it('matches loosely on case, spacing, punctuation, articles and plurals', () => {
    expect(pictionaryGuessMatches('Hot Dog', 'hot dog')).toBe(true)
    expect(pictionaryGuessMatches('hotdog', 'hot dog')).toBe(true)
    expect(pictionaryGuessMatches('lion king', 'The Lion King')).toBe(true)
    expect(pictionaryGuessMatches('smores', "s'mores")).toBe(true)
    expect(pictionaryGuessMatches('pinata', 'piñata')).toBe(true)
    expect(pictionaryGuessMatches('pancake', 'pancakes')).toBe(true)
    expect(pictionaryGuessMatches('cats', 'cat')).toBe(true)
    expect(pictionaryGuessMatches('dog', 'cat')).toBe(false)
  })

  it('flags near misses as close', () => {
    expect(pictionaryGuessIsClose('girafe', 'giraffe')).toBe(true)
    expect(pictionaryGuessIsClose('elefant', 'elephant')).toBe(true)
    expect(pictionaryGuessIsClose('giraffe', 'giraffe')).toBe(false)
    expect(pictionaryGuessIsClose('zebra', 'giraffe')).toBe(false)
  })

  it('masks letters but keeps spaces and punctuation', () => {
    const mask = pictionaryWordMask("s'mores", null)
    expect(mask.map((c) => (c.hidden ? '_' : c.ch)).join('')).toBe("_'_____")
    const hinted = pictionaryWordMask('hot dog', 0)
    expect(hinted.map((c) => (c.hidden ? '_' : c.ch)).join('')).toBe('h__ ___')
  })
})

describe('pictionary scoring', () => {
  it('scales the guesser by speed and gives the drawer half', () => {
    expect(pictionaryRoundPoints({ difficulty: 'hard', elapsedMs: 0 })).toEqual({
      guesser: 300,
      drawer: 150,
    })
    expect(
      pictionaryRoundPoints({ difficulty: 'hard', elapsedMs: PICTIONARY_TURN_MS / 2 }),
    ).toEqual({ guesser: 225, drawer: 115 })
    expect(
      pictionaryRoundPoints({ difficulty: 'easy', elapsedMs: PICTIONARY_TURN_MS }),
    ).toEqual({ guesser: 50, drawer: 25 })
  })

  it('applies the hint penalty and modifier multiplier', () => {
    expect(
      pictionaryRoundPoints({ difficulty: 'medium', elapsedMs: 0, hintUsed: true }),
    ).toEqual({ guesser: 150, drawer: 75 })
    expect(
      pictionaryRoundPoints({ difficulty: 'easy', elapsedMs: 0, multiplier: 2 }),
    ).toEqual({ guesser: 200, drawer: 100 })
  })
})

describe('pictionary flow', () => {
  it('runs setup → card → correct guess → reveal with both scores', () => {
    const drawing = startRound()
    expect(drawing.phase).toBe('drawing')
    expect(drawing.drawEndsAt).toBe(1_000 + PICTIONARY_TURN_MS)
    expect(pictionaryGuesserUid(drawing)).toBe(B)

    // Drawer can't guess; wrong guesses are kept in the feed.
    expect(submitPictionaryGuess(drawing, A, 'x', 2_000)).toBeNull()
    const wrong = submitPictionaryGuess(drawing, B, 'nope', 2_000)!
    expect(wrong.phase).toBe('drawing')
    expect(wrong.guesses).toHaveLength(1)

    const right = submitPictionaryGuess(wrong, B, drawing.card!.word, 1_000)!
    expect(right.phase).toBe('reveal')
    const round = right.rounds[0]!
    expect(round.guessed).toBe(true)
    expect(right.scores[B]).toBe(round.guesserPoints)
    expect(right.scores[A]).toBe(round.drawerPoints)
    expect(round.guesserPoints).toBeGreaterThan(round.drawerPoints)
  })

  it('lets the drawer confirm a spoken guess', () => {
    const drawing = startRound()
    const done = markPictionaryGotIt(drawing, A, 31_000)!
    expect(done.phase).toBe('reveal')
    expect(done.rounds[0]!.guessed).toBe(true)
    expect(markPictionaryGotIt(drawing, B, 31_000)).toBeNull()
  })

  it('times out with no points and rejects late guesses', () => {
    const drawing = startRound()
    const end = drawing.drawEndsAt!
    expect(resolvePictionaryTimeout(drawing, end - 1)).toBeNull()
    expect(submitPictionaryGuess(drawing, B, drawing.card!.word, end)).toBeNull()
    const timedOut = resolvePictionaryTimeout(drawing, end + 500)!
    expect(timedOut.phase).toBe('reveal')
    expect(timedOut.rounds[0]!.guessed).toBe(false)
    expect(timedOut.scores[A]).toBe(0)
    expect(timedOut.scores[B]).toBe(0)
  })

  it('unlocks the hint at half time for the guesser only', () => {
    const drawing = startRound()
    const half = drawing.drawStartedAt! + PICTIONARY_TURN_MS / 2
    expect(revealPictionaryHint(drawing, B, half - 1)).toBeNull()
    expect(revealPictionaryHint(drawing, A, half)).toBeNull()
    const hinted = revealPictionaryHint(drawing, B, half, () => 0)!
    expect(hinted.hintIndex).not.toBeNull()
    expect(revealPictionaryHint(hinted, B, half)).toBeNull()
  })

  it('allows one skip per player', () => {
    const seated = selectPictionaryFirst(createInitialPictionary(A), A)!
    const dealt = pickPictionaryDeck(seated, 'cats', noMod)!
    const skipped = skipPictionaryChoices(dealt, A, noMod)!
    expect(skipped.choices.some((c) => dealt.choices.some((d) => d.id === c.id))).toBe(false)
    expect(skipPictionaryChoices(skipped, A, noMod)).toBeNull()
  })

  it('alternates drawers and finishes after all rounds with a winner', () => {
    let state = startRound()
    for (let i = 0; i < PICTIONARY_TOTAL_ROUNDS; i += 1) {
      expect(state.drawerUid).toBe(i % 2 === 0 ? A : B)
      // Only Joseph's drawings get guessed → Joha banks guesser points.
      state =
        state.drawerUid === A
          ? markPictionaryGotIt(state, A, state.drawStartedAt!)!
          : resolvePictionaryTimeout(state, state.drawEndsAt!)!
      state = nextPictionaryRound(state, noMod)!
      if (state.phase === 'finished') break
      state = pickPictionaryCard(state, state.drawerUid, state.choices[0]!.id, 1_000)!
    }
    expect(state.phase).toBe('finished')
    expect(state.rounds).toHaveLength(PICTIONARY_TOTAL_ROUNDS)
    expect(state.winnerUid).toBe(B)
    expect(state.status).toBe('won')
    expect(state.recentCardIds.length).toBe(PICTIONARY_TOTAL_ROUNDS)
  })

  it('play again keeps the deck, swaps the first drawer and history', () => {
    const finished = surrenderPictionary(startRound(), A)!
    expect(finished.winnerUid).toBe(B)
    const again = playPictionaryAgain(finished, noMod)!
    expect(again.phase).toBe('pickCard')
    expect(again.deck).toBe('animals')
    expect(again.firstUid).toBe(B)
    expect(again.drawerUid).toBe(B)
    expect(again.roundId).not.toBe(finished.roundId)
    expect(again.scores[A]).toBe(0)
  })

  it('applies speed-round timing from the modifier', () => {
    const seated = selectPictionaryFirst(createInitialPictionary(A), A)!
    // rand: first < chance (modifier on), then index into modifiers → last (speed).
    const dealt = pickPictionaryDeck(seated, 'animals', seq(0, 0, 0, 0.1, 0.999))!
    expect(dealt.modifierId).toBe('speed')
    const drawing = pickPictionaryCard(dealt, A, dealt.choices[0]!.id, 0)!
    expect(drawing.drawEndsAt).toBe(30_000)
  })
})

describe('pictionary custom deck', () => {
  it('adds unique cards and can deal a custom-only deck', () => {
    let state = selectPictionaryFirst(createInitialPictionary(A), A)!
    state = addPictionaryCustomCard(state, 'our first date', 'hard')!
    expect(addPictionaryCustomCard(state, 'Our First Date', 'easy')).toBeNull()
    state = addPictionaryCustomCard(state, 'mochi', 'easy')!
    const dealt = pickPictionaryDeck(state, 'custom', noMod)!
    expect(dealt.choices).toHaveLength(2)
    expect(dealt.choices.every((c) => c.theme === 'custom')).toBe(true)
  })

  it('refuses an empty custom deck', () => {
    const state = selectPictionaryFirst(createInitialPictionary(A), A)!
    expect(pickPictionaryDeck(state, 'custom', noMod)).toBeNull()
  })
})

describe('pictionary normalize', () => {
  it('survives garbage and keeps valid fields', () => {
    expect(normalizePictionary(null, A).phase).toBe('pickDeck')
    expect(normalizePictionary({ phase: 'drawing', firstUid: A }, A).phase).toBe(
      'pickDeck',
    )
    const round = startRound()
    const back = normalizePictionary(JSON.parse(JSON.stringify(round)), A)
    expect(back.phase).toBe('drawing')
    expect(back.card).toEqual(round.card)
    expect(back.drawEndsAt).toBe(round.drawEndsAt)
  })
})
