import { useEffect, useState } from 'react'
import { loadAvailableSpeakFrames } from '../lib/petAssets'

const NONE: readonly string[] = []

/**
 * Speak frames that actually exist on disk for this species (may be empty).
 * Disabled callers skip the probe entirely so static sprites don't fire
 * requests for talking art they will never show.
 */
export function usePetSpeakFrames(
  species: string,
  enabled = true,
): readonly string[] {
  const [frames, setFrames] = useState<readonly string[]>(NONE)

  useEffect(() => {
    if (!enabled) {
      setFrames(NONE)
      return
    }
    let cancelled = false
    void loadAvailableSpeakFrames(species).then((available) => {
      if (!cancelled) setFrames(available)
    })
    return () => {
      cancelled = true
    }
  }, [species, enabled])

  return frames
}
