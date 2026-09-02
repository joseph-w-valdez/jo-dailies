import { describe, expect, it } from 'vitest'
import { normalizeTokon } from './tokon'

describe('normalizeTokon', () => {
  it('migrates legacy combos string into combo entries', () => {
    const data = normalizeTokon({
      characterNotes: {
        'iron-man': {
          notes: 'neutral tips',
          combos: '5L > 5M > 236H',
        },
      },
    })
    const iron = data.characterNotes['iron-man']!
    expect(iron.notes).toBe('neutral tips')
    expect(iron.comboEntries).toHaveLength(1)
    expect(iron.comboEntries[0]?.title).toBe('Imported')
    expect(iron.comboEntries[0]?.sequence.length).toBeGreaterThan(0)
  })

  it('keeps structured combo entries', () => {
    const data = normalizeTokon({
      characterNotes: {
        hulk: {
          notes: '',
          comboEntries: [
            {
              id: 'combo-1',
              title: 'Bnb',
              sequence: ['5', 'l', '5', 'm'],
              notes: 'works midscreen',
            },
          ],
        },
      },
    })
    expect(data.characterNotes.hulk?.comboEntries).toHaveLength(1)
    expect(data.characterNotes.hulk?.comboEntries[0]?.title).toBe('Bnb')
  })
})
