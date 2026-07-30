import type { PetMood } from './pet'
import type { FaceMood, FaceOverrides } from './petQuotes'

export interface PetAssetBundle {
  idle: string
  speak: readonly string[]
}

const BUNDLED_SPECIES = new Set([
  'cat-1',
  'cat-2',
  'cat-3',
  'cat-4',
  'cat-5',
  'cat-6',
  'cat-7',
  'cat-8',
  'cat-9',
  'extra-sage',
  'extra-bulba',
])

const speakProbeCache = new Map<string, Promise<readonly string[]>>()

/**
 * Firestore and quote personalities keep using the legacy `/cats/x.png` path as
 * a stable species identity; only visual asset resolution changes.
 */
function speciesStem(species: string): string | null {
  const stem = /^\/cats\/([^/]+)\.png$/.exec(species)?.[1]
  return stem && BUNDLED_SPECIES.has(stem) ? stem : null
}

function speciesRoot(species: string): string | null {
  const stem = speciesStem(species)
  return stem ? `/cats/${stem}` : null
}

export function petAssetBundle(species: string): PetAssetBundle {
  const root = speciesRoot(species)
  if (!root) {
    return { idle: species, speak: [] }
  }
  return {
    idle: `${root}/idle.png`,
    speak: [`${root}/speak-1.png`, `${root}/speak-2.png`],
  }
}

export function petIdleSrc(species: string): string {
  return petAssetBundle(species).idle
}

/** Closed → open → closed… using whatever speak frames actually exist. */
export function buildSpeakSequence(
  idle: string,
  speakFrames: readonly string[],
): readonly string[] {
  if (speakFrames.length === 0) return [idle]
  return [
    idle,
    ...speakFrames,
    ...speakFrames.slice(0, -1).reverse(),
  ]
}

/**
 * Probed frames are held onto deliberately. Animation swaps between them every
 * few frames, and a decoded image that stays referenced won't be re-fetched
 * mid-cycle — which would show up as a flicker.
 */
const warmFrames = new Set<HTMLImageElement>()

function probeImage(src: string): Promise<string | null> {
  return new Promise((resolve) => {
    if (typeof Image === 'undefined') {
      resolve(null)
      return
    }
    const img = new Image()
    img.onload = () => {
      warmFrames.add(img)
      resolve(src)
    }
    img.onerror = () => resolve(null)
    img.src = src
  })
}

/** Returns only speak frames that successfully load. Missing files are skipped. */
export function loadAvailableSpeakFrames(
  species: string,
): Promise<readonly string[]> {
  const cached = speakProbeCache.get(species)
  if (cached) return cached

  const pending = Promise.all(
    petAssetBundle(species).speak.map((src) => probeImage(src)),
  ).then((results) =>
    results.filter((src): src is string => typeof src === 'string'),
  )
  speakProbeCache.set(species, pending)
  return pending
}

/** Test helper — drop a cached probe so new frames can be re-detected. */
export function clearSpeakFrameCache(species?: string): void {
  if (species) speakProbeCache.delete(species)
  else speakProbeCache.clear()
}

/* ------------------------------------------------------------------ *
 * Layered faces
 *
 * A layered species keeps `base.png` (head with the face removed) plus
 * full-canvas transparent overlays under `eyes/`, `mouth/`, and `effects/`,
 * all aligned to `idle.png`. Every overlay is optional: whatever is missing
 * falls back to the layer's idle pose, and a species with no `base.png` keeps
 * rendering the original full-head frames.
 * ------------------------------------------------------------------ */

/** Species opted in to layered art. Others always use the full-head frames. */
const LAYERED_SPECIES = new Set(['cat-2', 'cat-4'])

const EYE_POSES = [
  'idle',
  'happy',
  'sad',
  'blink',
  'cheeky',
  'annoyed',
  'angry',
  'panicked',
] as const
const MOUTH_POSES = [
  'idle',
  'happy',
  'sad',
  'tongue',
  'smile',
  'cheeky',
  'angry',
  'speak-1',
  'speak-2',
] as const
/**
 * Free-standing extras that stack over the face. Unlike eyes and mouth these
 * have no idle pose — each one is simply present or absent, so they can be
 * mixed freely (blush plus tears, sparkle plus hearts, and so on).
 */
const EFFECT_POSES = [
  'blush',
  'tears',
  'sparkle',
  'sweat',
  'angry',
  'hearts',
  'zzz',
] as const

export interface FaceLayerAvailability {
  root: string
  eyes: ReadonlySet<string>
  mouth: ReadonlySet<string>
  effects: ReadonlySet<string>
}

interface FaceRecipe {
  eyes: string
  mouth: string
  effects: readonly string[]
}

const MOOD_RECIPES: Readonly<Record<FaceMood, FaceRecipe>> = {
  neutral: { eyes: 'idle', mouth: 'idle', effects: [] },
  happy: { eyes: 'happy', mouth: 'happy', effects: [] },
  sad: { eyes: 'sad', mouth: 'sad', effects: ['tears'] },
  // Reuse cheeky until a distinct playful face is worth drawing.
  playful: { eyes: 'cheeky', mouth: 'cheeky', effects: [] },
  blush: { eyes: 'happy', mouth: 'happy', effects: ['blush'] },
  excited: { eyes: 'happy', mouth: 'smile', effects: [] },
  // Dedicated cheeky eyes/mouth; falls back to idle until drawn.
  cheeky: { eyes: 'cheeky', mouth: 'cheeky', effects: [] },
  // Eye-roll carries this one; the sad mouth already reads as unimpressed.
  annoyed: { eyes: 'annoyed', mouth: 'sad', effects: [] },
  angry: { eyes: 'angry', mouth: 'angry', effects: ['angry'] },
  // Shake-only; falls back to idle eyes until panicked art is drawn.
  panicked: { eyes: 'panicked', mouth: 'sad', effects: [] },
}

/** Resting expression a pet wears when it isn't delivering a line. */
export function careMoodFace(mood: PetMood): FaceMood {
  switch (mood) {
    case 'happy':
      return 'happy'
    case 'hungry':
    case 'dirty':
    case 'dead':
    case 'neglected':
      return 'sad'
    default:
      return 'neutral'
  }
}

/** One rendered frame: full-canvas images stacked bottom to top. */
export interface FaceFrame {
  layers: readonly string[]
}

/**
 * A frame as a CSS `background-image` list. CSS paints the first entry on top,
 * so the bottom-first layers are reversed.
 */
export function faceBackgroundImage(frame: FaceFrame): string {
  return frame.layers
    .map((src) => `url("${src}")`)
    .reverse()
    .join(', ')
}

const layerProbeCache = new Map<string, Promise<FaceLayerAvailability | null>>()

async function probeSet(
  root: string,
  folder: string,
  poses: readonly string[],
): Promise<ReadonlySet<string>> {
  const found = await Promise.all(
    poses.map(async (pose) =>
      (await probeImage(`${root}/${folder}/${pose}.png`)) ? pose : null,
    ),
  )
  return new Set(found.filter((pose): pose is string => pose !== null))
}

/**
 * Probes a species' layered art once. Resolves to `null` when the species has
 * no usable layer set, which keeps the full-head animation in play.
 */
export function loadFaceLayers(
  species: string,
): Promise<FaceLayerAvailability | null> {
  const cached = layerProbeCache.get(species)
  if (cached) return cached

  const stem = speciesStem(species)
  const root = stem ? `/cats/${stem}` : null
  const pending: Promise<FaceLayerAvailability | null> =
    root && stem && LAYERED_SPECIES.has(stem)
      ? (async () => {
          if (!(await probeImage(`${root}/base.png`))) return null
          const [eyes, mouth, effects] = await Promise.all([
            probeSet(root, 'eyes', EYE_POSES),
            probeSet(root, 'mouth', MOUTH_POSES),
            probeSet(root, 'effects', EFFECT_POSES),
          ])
          // A base with no mouth would render a faceless cat.
          if (!mouth.has('idle')) return null
          return { root, eyes, mouth, effects }
        })()
      : Promise.resolve(null)

  layerProbeCache.set(species, pending)
  return pending
}

/** Test helper — drop a cached layer probe so new art can be re-detected. */
export function clearFaceLayerCache(species?: string): void {
  if (species) layerProbeCache.delete(species)
  else layerProbeCache.clear()
}

/**
 * Re-probes a species from disk and reports exactly how its face resolves —
 * why layered art did or didn't engage, and the frames it would play.
 */
export async function describeFace(species = '/cats/cat-4.png') {
  clearFaceLayerCache(species)
  clearSpeakFrameCache(species)

  const stem = speciesStem(species)
  const [layers, speakFrames] = await Promise.all([
    loadFaceLayers(species),
    loadAvailableSpeakFrames(species),
  ])
  const frames = (speaking: boolean) =>
    buildFaceFrames({
      species,
      mood: 'neutral',
      speaking,
      layers,
      speakFrames,
    }).map((frame) => frame.layers.join(' + '))

  const speaking = frames(true)
  return {
    species,
    stem,
    optedIn: stem ? LAYERED_SPECIES.has(stem) : false,
    layered: layers !== null,
    why: !stem
      ? 'species is not a bundled cat path'
      : !LAYERED_SPECIES.has(stem)
        ? 'species is not in LAYERED_SPECIES'
        : layers
          ? 'layered art is active'
          : 'base.png or mouth/idle.png did not load',
    eyes: layers ? [...layers.eyes] : [],
    mouth: layers ? [...layers.mouth] : [],
    effects: layers ? [...layers.effects] : [],
    fullHeadSpeakFrames: [...speakFrames],
    idle: frames(false)[0],
    speaking,
    canSpeak: speaking.length > 1,
  }
}

if (import.meta.env.DEV && typeof window !== 'undefined') {
  Object.assign(window, {
    __joFaces: async (species?: string) => {
      const report = await describeFace(species)
      console.log(report)
      return report
    },
  })
}

/** Requested pose, else the idle pose, else nothing. */
function resolvePose(
  available: ReadonlySet<string>,
  requested: string,
): string | null {
  if (available.has(requested)) return requested
  if (available.has('idle')) return 'idle'
  return null
}

export interface FaceFramesInput {
  species: string
  mood: FaceMood
  /** Per-quote layer overrides that win over the mood recipe. */
  overrides?: FaceOverrides
  speaking: boolean
  /** Probed layered art, or `null` to use the full-head frames. */
  layers: FaceLayerAvailability | null
  /** Full-head speak frames that exist, used only in the fallback path. */
  speakFrames: readonly string[]
}

/**
 * Builds the frame cycle to play. Speaking animates only the mouth on layered
 * art; on unlayered art it swaps the whole head as before.
 */
export function buildFaceFrames({
  species,
  mood,
  overrides,
  speaking,
  layers,
  speakFrames,
}: FaceFramesInput): readonly FaceFrame[] {
  const idle = petIdleSrc(species)

  if (!layers) {
    const frames = speaking ? buildSpeakSequence(idle, speakFrames) : [idle]
    return frames.map((src) => ({ layers: [src] }))
  }

  const recipe = MOOD_RECIPES[mood]
  const eyes = resolvePose(layers.eyes, overrides?.eyes ?? recipe.eyes)
  const restingMouth = overrides?.mouth ?? recipe.mouth

  const below = [`${layers.root}/base.png`]
  if (eyes) below.push(`${layers.root}/eyes/${eyes}.png`)

  // Effects have no idle fallback — undrawn ones are simply skipped.
  const requested = overrides?.effect ?? recipe.effects
  const above = (typeof requested === 'string' ? [requested] : requested)
    .filter((effect) => layers.effects.has(effect))
    .map((effect) => `${layers.root}/effects/${effect}.png`)

  const speakCycle = MOUTH_POSES.filter(
    (pose) => pose.startsWith('speak-') && layers.mouth.has(pose),
  )
  const mouthCycle =
    speaking && speakCycle.length > 0
      ? [restingMouth, ...speakCycle, ...speakCycle.slice(0, -1).reverse()]
      : [restingMouth]

  return mouthCycle.map((pose) => {
    const resolved = resolvePose(layers.mouth, pose)
    return {
      layers: [
        ...below,
        ...(resolved ? [`${layers.root}/mouth/${resolved}.png`] : []),
        ...above,
      ],
    }
  })
}
