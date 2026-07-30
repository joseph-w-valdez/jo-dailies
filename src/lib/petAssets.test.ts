import { describe, expect, it } from 'vitest'
import {
  buildSpeakSequence,
  petAssetBundle,
  petIdleSrc,
} from './petAssets'

describe('pet assets', () => {
  it('resolves cat-4 from its legacy identity to its asset bundle', () => {
    expect(petAssetBundle('/cats/cat-4.png')).toEqual({
      idle: '/cats/cat-4/idle.png',
      speak: ['/cats/cat-4/speak-1.png', '/cats/cat-4/speak-2.png'],
    })
  })

  it('resolves every migrated species to its directory', () => {
    expect(petIdleSrc('/cats/cat-3.png')).toBe('/cats/cat-3/idle.png')
    expect(petAssetBundle('/cats/extra-sage.png').speak).toEqual([
      '/cats/extra-sage/speak-1.png',
      '/cats/extra-sage/speak-2.png',
    ])
  })

  it('falls back to a static path for unknown species', () => {
    expect(petIdleSrc('/custom/cat.png')).toBe('/custom/cat.png')
    expect(petAssetBundle('/custom/cat.png').speak).toEqual([])
  })

  it('builds a speak loop from whatever frames exist', () => {
    expect(buildSpeakSequence('/idle.png', [])).toEqual(['/idle.png'])
    expect(buildSpeakSequence('/idle.png', ['/s1.png'])).toEqual([
      '/idle.png',
      '/s1.png',
    ])
    expect(buildSpeakSequence('/idle.png', ['/s1.png', '/s2.png'])).toEqual([
      '/idle.png',
      '/s1.png',
      '/s2.png',
      '/s1.png',
    ])
  })
})
