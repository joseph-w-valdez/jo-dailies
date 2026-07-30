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

export function petAssetBundle(species: string): PetAssetBundle {
  // Firestore and quote personalities keep using the legacy path as a stable
  // species identity; only visual asset resolution changes.
  const stem = /^\/cats\/([^/]+)\.png$/.exec(species)?.[1]
  if (!stem || !BUNDLED_SPECIES.has(stem)) {
    return { idle: species, speak: [] }
  }
  const root = `/cats/${stem}`
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

function probeImage(src: string): Promise<string | null> {
  return new Promise((resolve) => {
    if (typeof Image === 'undefined') {
      resolve(null)
      return
    }
    const img = new Image()
    img.onload = () => resolve(src)
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
