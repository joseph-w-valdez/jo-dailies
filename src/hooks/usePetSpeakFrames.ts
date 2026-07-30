import { useEffect, useState } from 'react'
import { loadAvailableSpeakFrames } from '../lib/petAssets'

/** Speak frames that actually exist on disk for this species (may be empty). */
export function usePetSpeakFrames(species: string): readonly string[] {
  const [frames, setFrames] = useState<readonly string[]>([])

  useEffect(() => {
    let cancelled = false
    void loadAvailableSpeakFrames(species).then((available) => {
      if (!cancelled) setFrames(available)
    })
    return () => {
      cancelled = true
    }
  }, [species])

  return frames
}
