/** Rough talking pace used to size the mouth animation. */
export const SPEAK_MS_PER_CHAR = 80
/** Shortest mouth-flap window for a tiny quote. */
export const SPEAK_DURATION_MIN_MS = 1_200
/** Per-frame hold while the mouth is moving during a quote. */
export const SPEAK_FRAME_MS = 85

/** Map quote length → how long the mouth should keep flapping. */
export function speakDurationMs(text: string, maxMs: number): number {
  const raw = text.trim().length * SPEAK_MS_PER_CHAR
  return Math.min(maxMs, Math.max(SPEAK_DURATION_MIN_MS, raw))
}
