import { useEffect, useMemo, useState } from 'react'
import {
  buildFaceFrames,
  loadFaceLayers,
  type FaceFrame,
  type FaceLayerAvailability,
} from '../lib/petAssets'
import type { FaceMood } from '../lib/petQuotes'
import { usePetSpeakFrames } from './usePetSpeakFrames'

/** Layered art for this species once probed, or `null` while absent. */
export function useFaceLayers(species: string): FaceLayerAvailability | null {
  const [layers, setLayers] = useState<FaceLayerAvailability | null>(null)

  useEffect(() => {
    let cancelled = false
    setLayers(null)
    void loadFaceLayers(species).then((found) => {
      if (!cancelled) setLayers(found)
    })
    return () => {
      cancelled = true
    }
  }, [species])

  return layers
}

/** Eyes shut for a beat, then a long random pause. */
const BLINK_HOLD_MS = 180
const BLINK_MIN_GAP_MS = 1_800
const BLINK_MAX_GAP_MS = 3_500
/** Odds a blink is followed straight away by a second one. */
const DOUBLE_BLINK_CHANCE = 0.2
const DOUBLE_BLINK_GAP_MS = 160

function nextBlinkGap(): number {
  return (
    BLINK_MIN_GAP_MS + Math.random() * (BLINK_MAX_GAP_MS - BLINK_MIN_GAP_MS)
  )
}

/** True while the eyes should be shut. Random gaps keep pets out of sync. */
function useBlinking(enabled: boolean): boolean {
  const [closed, setClosed] = useState(false)

  useEffect(() => {
    setClosed(false)
    if (!enabled) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let timer = 0
    const scheduleBlink = (delay: number) => {
      timer = window.setTimeout(() => {
        setClosed(true)
        timer = window.setTimeout(() => {
          setClosed(false)
          scheduleBlink(
            Math.random() < DOUBLE_BLINK_CHANCE
              ? DOUBLE_BLINK_GAP_MS
              : nextBlinkGap(),
          )
        }, BLINK_HOLD_MS)
      }, delay)
    }

    scheduleBlink(nextBlinkGap())
    return () => window.clearTimeout(timer)
  }, [enabled])

  return closed
}

export interface PetFace {
  /** Resting frame, shown whenever the pet isn't talking. */
  idle: FaceFrame
  /** Frames to cycle through while talking. */
  speaking: readonly FaceFrame[]
  /** False when this species has no talking art at all. */
  canSpeak: boolean
  /** False when this species has no closed-eye art. */
  canBlink: boolean
}

export function usePetFace({
  species,
  mood,
  eyes,
  mouth,
  effect,
  speech = false,
  blink = false,
}: {
  species: string
  mood: FaceMood
  eyes?: string
  mouth?: string
  effect?: string | readonly string[]
  /** Set by callers that animate talking, so they load the speaking art. */
  speech?: boolean
  /** Set by callers that want idle blinking, so they run the blink timer. */
  blink?: boolean
}): PetFace {
  const speakFrames = usePetSpeakFrames(species, speech)
  const layers = useFaceLayers(species)
  const canBlink = layers?.eyes.has('blink') ?? false
  // Annoyed is an eye-roll — blinking would wipe the expression.
  const eyesPose = eyes ?? (mood === 'annoyed' ? 'annoyed' : undefined)
  const allowBlink = blink && canBlink && eyesPose !== 'annoyed'
  const blinking = useBlinking(allowBlink)

  return useMemo(() => {
    const shared = {
      species,
      mood,
      overrides: { eyes: blinking ? 'blink' : eyes, mouth, effect },
      layers,
      speakFrames,
    }
    const idle = buildFaceFrames({ ...shared, speaking: false })
    const speaking = buildFaceFrames({ ...shared, speaking: true })
    return {
      idle: idle[0]!,
      speaking,
      canSpeak: speaking.length > 1,
      canBlink: allowBlink,
    }
  }, [
    species,
    mood,
    eyes,
    mouth,
    effect,
    layers,
    speakFrames,
    blinking,
    allowBlink,
  ])
}
