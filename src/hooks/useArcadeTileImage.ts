import { useEffect, useState } from 'react'
import {
  arcadeTileImageCandidates,
  type ArcadeGameId,
} from '../arcade'

/** Survives remounts for tiles that already found art. */
const resolvedArt = new Map<ArcadeGameId, string>()

/** Resolves `public/arcade/{id}.*` at runtime (no Vite public/ glob). */
export function useArcadeTileImage(id: ArcadeGameId): string | null {
  const [src, setSrc] = useState<string | null>(() => resolvedArt.get(id) ?? null)

  useEffect(() => {
    const cached = resolvedArt.get(id)
    if (cached) {
      setSrc(cached)
      return
    }

    let cancelled = false
    const candidates = arcadeTileImageCandidates(id)

    const tryAt = (index: number) => {
      if (cancelled) return
      if (index >= candidates.length) {
        setSrc(null)
        return
      }
      const url = candidates[index]!
      const img = new Image()
      img.onload = () => {
        if (cancelled) return
        resolvedArt.set(id, url)
        setSrc(url)
      }
      img.onerror = () => tryAt(index + 1)
      img.src = url
    }

    tryAt(0)
    return () => {
      cancelled = true
    }
  }, [id])

  return src
}
