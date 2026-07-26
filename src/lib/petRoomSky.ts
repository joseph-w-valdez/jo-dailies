/** Local-time sky for the pet room window. */
export type SkyPhase = 'dawn' | 'day' | 'dusk' | 'night'

export interface RoomSky {
  phase: SkyPhase
  /** 0–100 inside the window */
  celestialX: number
  celestialY: number
  skyTop: string
  skyBottom: string
  glow: string
  isNight: boolean
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

/**
 * Maps local hour to a sun/moon arc across the window.
 * Day/dawn/dusk use the sun; night uses the moon on a complementary arc.
 */
export function getRoomSky(now = new Date()): RoomSky {
  const hour = now.getHours() + now.getMinutes() / 60

  if (hour >= 5 && hour < 8) {
    const t = (hour - 5) / 3
    return {
      phase: 'dawn',
      celestialX: 18 + t * 28,
      celestialY: 72 - t * 42,
      skyTop: '#f9a8d4',
      skyBottom: '#fdba74',
      glow: 'rgba(251, 146, 60, 0.55)',
      isNight: false,
    }
  }

  if (hour >= 8 && hour < 17) {
    const t = (hour - 8) / 9
    return {
      phase: 'day',
      celestialX: 22 + t * 56,
      celestialY: clamp(28 + Math.sin(t * Math.PI) * -16, 10, 55),
      skyTop: '#7dd3fc',
      skyBottom: '#bae6fd',
      glow: 'rgba(250, 204, 21, 0.65)',
      isNight: false,
    }
  }

  if (hour >= 17 && hour < 20) {
    const t = (hour - 17) / 3
    return {
      phase: 'dusk',
      celestialX: 68 + t * 22,
      celestialY: 22 + t * 48,
      skyTop: '#fb7185',
      skyBottom: '#fdba74',
      glow: 'rgba(251, 113, 133, 0.5)',
      isNight: false,
    }
  }

  // Night: moon drifts the other way
  const nightHour = hour >= 20 ? hour - 20 : hour + 4
  const t = nightHour / 9
  return {
    phase: 'night',
    celestialX: 78 - t * 56,
    celestialY: clamp(24 + Math.sin(t * Math.PI) * -14, 12, 58),
    skyTop: '#0f172a',
    skyBottom: '#1e3a5f',
    glow: 'rgba(226, 232, 240, 0.55)',
    isNight: true,
  }
}
