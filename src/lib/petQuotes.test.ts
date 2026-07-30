import { describe, expect, it } from 'vitest'
import {
  petDragQuote,
  petQuote,
  petQuoteDetailed,
  petShakeQuote,
  type FaceMood,
  type PetQuoteNeeds,
} from './petQuotes'

const CAT = '/cats/cat-4.png'
const CONTENT: PetQuoteNeeds = { hungry: false, dirty: false, bored: false }

/**
 * Rolls enough quotes to see every line of every active pool, then indexes the
 * mood each line was delivered with.
 */
function sampleMoods(needs: PetQuoteNeeds): Map<string, FaceMood> {
  const seen = new Map<string, FaceMood>()
  for (let i = 0; i < 5_000; i += 1) {
    const quote = petQuoteDetailed(CAT, needs, undefined, 'room', true)
    seen.set(quote.text, quote.mood)
  }
  return seen
}

describe('pet quote moods', () => {
  it('always returns a non-empty line with a mood', () => {
    const quote = petQuoteDetailed(CAT, CONTENT)
    expect(quote.text.length).toBeGreaterThan(0)
    expect(quote.mood).toBeTruthy()
  })

  it('keeps a text-only wrapper for callers that do not render faces', () => {
    expect(typeof petQuote(CAT, CONTENT)).toBe('string')
  })

  it('delivers content care lines happily', () => {
    expect(sampleMoods(CONTENT).get('I could purr a whole symphony.')).toBe(
      'happy',
    )
  })

  it('delivers hunger and grime sadly', () => {
    const moods = sampleMoods({ hungry: true, dirty: false, bored: false })
    expect(moods.get('Hunger makes me dramatic.')).toBe('sad')
    expect(
      sampleMoods({ hungry: false, dirty: true, bored: false }).get(
        'I demand bubble rights.',
      ),
    ).toBe('sad')
  })

  it('delivers full neglect sadly', () => {
    expect(
      sampleMoods({ hungry: true, dirty: true, bored: false }).get(
        'I am a tiny abandoned opera.',
      ),
    ).toBe('sad')
  })

  it('delivers boredom playfully', () => {
    expect(
      sampleMoods({ hungry: false, dirty: false, bored: true }).get(
        'Zoomies available upon request.',
      ),
    ).toBe('playful')
  })

  it('carries mood on personality and Valorant lines', () => {
    const moods = sampleMoods(CONTENT)
    expect(moods.get('I have several opinions.')).toBe('blush')
    expect(moods.get('That furniture moved. I saw it.')).toBe('blush')
    expect(moods.get("I'm checking my store")).toBe('neutral')
    expect(moods.get('Turn around~')).toBe('excited')
    expect(moods.get('Get me out of this game')).toBe('sad')
    expect(moods.get('This Jett is throwing')).toBe('angry')
    expect(moods.get('This Jett is cracked')).toBe('annoyed')
    expect(moods.get('Can we get ONE smoke please')).toBe('sad')
    expect(moods.get('Heal me, Sova')).toBe('sad')
    expect(moods.get('*shoots floor repeatedly*')).toBe('cheeky')
  })

  it('holds speech for grin moods', () => {
    const quote = (() => {
      for (let i = 0; i < 5_000; i += 1) {
        const next = petQuoteDetailed(CAT, CONTENT, undefined, 'room', true)
        if (next.text === 'Turn around~') return next
      }
      throw new Error('never saw Turn around~')
    })()
    expect(quote.speech).toBe('hold')
  })

  it('avoids repeating the previous line', () => {
    const first = petQuoteDetailed(CAT, CONTENT)
    for (let i = 0; i < 50; i += 1) {
      expect(petQuoteDetailed(CAT, CONTENT, first.text).text).not.toBe(
        first.text,
      )
    }
  })

  it('delivers wallpaper drag sadly and shake protests as panicked', () => {
    const drag = new Set<string>()
    const shake = new Set<string>()
    for (let i = 0; i < 100; i += 1) {
      const grabbed = petDragQuote()
      expect(grabbed.mood).toBe('sad')
      drag.add(grabbed.text)
      const shaken = petShakeQuote()
      expect(shaken.mood).toBe('panicked')
      shake.add(shaken.text)
    }
    expect(drag.has('What did I do, mother?')).toBe(true)
    expect(drag.has('What did I do, father?')).toBe(true)
    expect(shake.has('aaaaaaaa')).toBe(true)
    expect(shake.has("Don't bully me!")).toBe(true)
  })
})
