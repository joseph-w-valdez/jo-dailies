import { describe, expect, it } from 'vitest'
import {
  buildStaffPrompt,
  checkNoteAnswer,
  ledgerStepsFor,
  noteFrequencyHz,
  noteMidi,
  notePoolForHand,
  notePoolForMode,
  pickStaffPrompt,
  staffStepFor,
} from './notes'

describe('notes', () => {
  it('places treble bottom line on E4 and bass on G2', () => {
    expect(staffStepFor('right', 'E', 4)).toBe(0)
    expect(staffStepFor('right', 'C', 4)).toBe(-2)
    expect(staffStepFor('right', 'F', 5)).toBe(8)
    expect(staffStepFor('left', 'G', 2)).toBe(0)
    expect(staffStepFor('left', 'C', 4)).toBe(10)
  })

  it('pools cover left and right ranges', () => {
    expect(notePoolForHand('right').some((n) => n.letter === 'C' && n.octave === 4)).toBe(
      true,
    )
    expect(notePoolForHand('left').some((n) => n.letter === 'C' && n.octave === 4)).toBe(
      true,
    )
    expect(notePoolForMode('both').length).toBe(
      notePoolForHand('left').length + notePoolForHand('right').length,
    )
  })

  it('checks letter answers', () => {
    const prompt = buildStaffPrompt('right', 'G', 4)
    expect(checkNoteAnswer(prompt, 'G')).toBe(true)
    expect(checkNoteAnswer(prompt, 'A')).toBe(false)
  })

  it('pickStaffPrompt can exclude the previous id', () => {
    const first = pickStaffPrompt('right', () => 0)
    const second = pickStaffPrompt('right', () => 0, first.id)
    expect(second.id).not.toBe(first.id)
  })

  it('ledgerStepsFor covers below and above the staff', () => {
    expect(ledgerStepsFor(0)).toEqual([])
    expect(ledgerStepsFor(-1)).toEqual([-2])
    expect(ledgerStepsFor(-2)).toEqual([-2])
    expect(ledgerStepsFor(9)).toEqual([])
    expect(ledgerStepsFor(10)).toEqual([10])
    expect(ledgerStepsFor(11)).toEqual([10])
  })

  it('maps scientific pitch to MIDI / Hz', () => {
    expect(noteMidi('A', 4)).toBe(69)
    expect(noteMidi('C', 4)).toBe(60)
    expect(noteFrequencyHz('A', 4)).toBeCloseTo(440, 5)
    expect(noteFrequencyHz('C', 4)).toBeCloseTo(261.63, 1)
  })
})
