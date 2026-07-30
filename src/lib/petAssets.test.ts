import { describe, expect, it } from 'vitest'
import {
  buildFaceFrames,
  buildSpeakSequence,
  careMoodFace,
  faceBackgroundImage,
  petAssetBundle,
  petIdleSrc,
  type FaceFramesInput,
  type FaceLayerAvailability,
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

const FULL_LAYERS: FaceLayerAvailability = {
  root: '/cats/cat-4',
  eyes: new Set(['idle', 'happy', 'sad']),
  mouth: new Set(['idle', 'happy', 'sad', 'tongue', 'speak-1', 'speak-2']),
  effects: new Set(['blush', 'tears']),
}

function frames(overrides: Partial<FaceFramesInput> = {}) {
  return buildFaceFrames({
    species: '/cats/cat-4.png',
    mood: 'neutral',
    speaking: false,
    layers: FULL_LAYERS,
    speakFrames: [],
    ...overrides,
  }).map((frame) => frame.layers)
}

describe('layered faces', () => {
  it('keeps full-head frames when a species has no layered art', () => {
    expect(frames({ layers: null })).toEqual([['/cats/cat-4/idle.png']])
    expect(
      frames({
        layers: null,
        speaking: true,
        speakFrames: ['/cats/cat-4/speak-1.png', '/cats/cat-4/speak-2.png'],
      }),
    ).toEqual([
      ['/cats/cat-4/idle.png'],
      ['/cats/cat-4/speak-1.png'],
      ['/cats/cat-4/speak-2.png'],
      ['/cats/cat-4/speak-1.png'],
    ])
  })

  it('stacks base, eyes, mouth, then effects', () => {
    expect(frames({ mood: 'sad' })).toEqual([
      [
        '/cats/cat-4/base.png',
        '/cats/cat-4/eyes/sad.png',
        '/cats/cat-4/mouth/sad.png',
        '/cats/cat-4/effects/tears.png',
      ],
    ])
  })

  it('resolves mood-specific layers and effects', () => {
    expect(frames({ mood: 'happy' })[0]).toContain('/cats/cat-4/eyes/happy.png')
    const cheeky: FaceLayerAvailability = {
      ...FULL_LAYERS,
      eyes: new Set([...FULL_LAYERS.eyes, 'cheeky']),
      mouth: new Set([...FULL_LAYERS.mouth, 'cheeky']),
    }
    expect(frames({ mood: 'playful', layers: cheeky })[0]).toContain(
      '/cats/cat-4/mouth/cheeky.png',
    )
    expect(frames({ mood: 'blush' })[0]).toContain(
      '/cats/cat-4/effects/blush.png',
    )
  })

  it('lets a quote override individual layers', () => {
    expect(
      frames({ mood: 'happy', overrides: { eyes: 'sad', effect: 'tears' } }),
    ).toEqual([
      [
        '/cats/cat-4/base.png',
        '/cats/cat-4/eyes/sad.png',
        '/cats/cat-4/mouth/happy.png',
        '/cats/cat-4/effects/tears.png',
      ],
    ])
  })

  it('holds an excited grin on the smile mouth', () => {
    const withSmile: FaceLayerAvailability = {
      ...FULL_LAYERS,
      mouth: new Set([...FULL_LAYERS.mouth, 'smile']),
    }
    expect(frames({ mood: 'excited', layers: withSmile })).toEqual([
      [
        '/cats/cat-4/base.png',
        '/cats/cat-4/eyes/happy.png',
        '/cats/cat-4/mouth/smile.png',
      ],
    ])
  })

  it('uses dedicated cheeky eyes and mouth', () => {
    const cheeky: FaceLayerAvailability = {
      ...FULL_LAYERS,
      eyes: new Set([...FULL_LAYERS.eyes, 'cheeky']),
      mouth: new Set([...FULL_LAYERS.mouth, 'cheeky']),
    }
    expect(frames({ mood: 'cheeky', layers: cheeky })).toEqual([
      [
        '/cats/cat-4/base.png',
        '/cats/cat-4/eyes/cheeky.png',
        '/cats/cat-4/mouth/cheeky.png',
      ],
    ])
  })

  it('adds a teardrop to the sad expression', () => {
    expect(frames({ mood: 'sad' })).toEqual([
      [
        '/cats/cat-4/base.png',
        '/cats/cat-4/eyes/sad.png',
        '/cats/cat-4/mouth/sad.png',
        '/cats/cat-4/effects/tears.png',
      ],
    ])
  })

  it('composes all dedicated angry layers', () => {
    const angry: FaceLayerAvailability = {
      ...FULL_LAYERS,
      eyes: new Set([...FULL_LAYERS.eyes, 'angry']),
      mouth: new Set([...FULL_LAYERS.mouth, 'angry']),
      effects: new Set([...FULL_LAYERS.effects, 'angry']),
    }
    expect(frames({ mood: 'angry', layers: angry })).toEqual([
      [
        '/cats/cat-4/base.png',
        '/cats/cat-4/eyes/angry.png',
        '/cats/cat-4/mouth/angry.png',
        '/cats/cat-4/effects/angry.png',
      ],
    ])
  })

  it('uses dedicated panicked eyes with the sad mouth', () => {
    const panicked: FaceLayerAvailability = {
      ...FULL_LAYERS,
      eyes: new Set([...FULL_LAYERS.eyes, 'panicked']),
    }
    expect(frames({ mood: 'panicked', layers: panicked })).toEqual([
      [
        '/cats/cat-4/base.png',
        '/cats/cat-4/eyes/panicked.png',
        '/cats/cat-4/mouth/sad.png',
      ],
    ])
  })

  it('pairs annoyed eyes with the existing sad mouth', () => {
    const annoyed: FaceLayerAvailability = {
      ...FULL_LAYERS,
      eyes: new Set([...FULL_LAYERS.eyes, 'annoyed']),
    }
    expect(frames({ mood: 'annoyed', layers: annoyed })).toEqual([
      [
        '/cats/cat-4/base.png',
        '/cats/cat-4/eyes/annoyed.png',
        '/cats/cat-4/mouth/sad.png',
      ],
    ])
  })

  it('falls back to idle eyes when annoyed art is missing', () => {
    expect(frames({ mood: 'annoyed', layers: FULL_LAYERS })[0]).toEqual([
      '/cats/cat-4/base.png',
      '/cats/cat-4/eyes/idle.png',
      '/cats/cat-4/mouth/sad.png',
    ])
  })

  it('stacks several effects at once', () => {
    expect(
      frames({ mood: 'happy', overrides: { effect: ['blush', 'tears'] } })[0],
    ).toEqual([
      '/cats/cat-4/base.png',
      '/cats/cat-4/eyes/happy.png',
      '/cats/cat-4/mouth/happy.png',
      '/cats/cat-4/effects/blush.png',
      '/cats/cat-4/effects/tears.png',
    ])
  })

  it('skips effects that have no art, keeping the rest', () => {
    expect(
      frames({ overrides: { effect: ['sparkle', 'blush'] } })[0],
    ).toEqual([
      '/cats/cat-4/base.png',
      '/cats/cat-4/eyes/idle.png',
      '/cats/cat-4/mouth/idle.png',
      '/cats/cat-4/effects/blush.png',
    ])
  })

  it('falls back to the idle pose when a mood has no art yet', () => {
    const sparse: FaceLayerAvailability = {
      root: '/cats/cat-4',
      eyes: new Set(['idle']),
      mouth: new Set(['idle']),
      effects: new Set(),
    }
    expect(frames({ mood: 'sad', layers: sparse })).toEqual([
      [
        '/cats/cat-4/base.png',
        '/cats/cat-4/eyes/idle.png',
        '/cats/cat-4/mouth/idle.png',
      ],
    ])
  })

  it('omits eyes entirely when they are baked into the base art', () => {
    expect(
      frames({
        layers: { ...FULL_LAYERS, eyes: new Set<string>() },
      }),
    ).toEqual([['/cats/cat-4/base.png', '/cats/cat-4/mouth/idle.png']])
  })

  it('animates only the mouth while speaking', () => {
    expect(frames({ mood: 'happy', speaking: true })).toEqual([
      [
        '/cats/cat-4/base.png',
        '/cats/cat-4/eyes/happy.png',
        '/cats/cat-4/mouth/happy.png',
      ],
      [
        '/cats/cat-4/base.png',
        '/cats/cat-4/eyes/happy.png',
        '/cats/cat-4/mouth/speak-1.png',
      ],
      [
        '/cats/cat-4/base.png',
        '/cats/cat-4/eyes/happy.png',
        '/cats/cat-4/mouth/speak-2.png',
      ],
      [
        '/cats/cat-4/base.png',
        '/cats/cat-4/eyes/happy.png',
        '/cats/cat-4/mouth/speak-1.png',
      ],
    ])
  })

  it('holds the mouth still when no speak poses are drawn yet', () => {
    expect(
      frames({
        speaking: true,
        layers: { ...FULL_LAYERS, mouth: new Set(['idle', 'happy']) },
      }),
    ).toHaveLength(1)
  })

  it('keeps effects above the animating mouth', () => {
    for (const layers of frames({ mood: 'sad', speaking: true })) {
      expect(layers.at(-1)).toBe('/cats/cat-4/effects/tears.png')
    }
  })

  it('shuts the eyes for a blink without touching the mouth', () => {
    const blinkable: FaceLayerAvailability = {
      ...FULL_LAYERS,
      eyes: new Set([...FULL_LAYERS.eyes, 'blink']),
    }
    expect(
      frames({ mood: 'happy', layers: blinkable, overrides: { eyes: 'blink' } }),
    ).toEqual([
      [
        '/cats/cat-4/base.png',
        '/cats/cat-4/eyes/blink.png',
        '/cats/cat-4/mouth/happy.png',
      ],
    ])
  })

  it('keeps the mood eyes when blink art is missing', () => {
    expect(
      frames({ mood: 'happy', overrides: { eyes: 'blink' } })[0],
    ).toContain('/cats/cat-4/eyes/idle.png')
  })

  it('paints the topmost layer first for CSS', () => {
    expect(faceBackgroundImage({ layers: frames({ mood: 'sad' })[0]! })).toBe(
      [
        'url("/cats/cat-4/effects/tears.png")',
        'url("/cats/cat-4/mouth/sad.png")',
        'url("/cats/cat-4/eyes/sad.png")',
        'url("/cats/cat-4/base.png")',
      ].join(', '),
    )
  })

  it('maps care state to a resting expression', () => {
    expect(careMoodFace('happy')).toBe('happy')
    expect(careMoodFace('hungry')).toBe('sad')
    expect(careMoodFace('neglected')).toBe('sad')
    expect(careMoodFace('empty')).toBe('neutral')
  })
})
