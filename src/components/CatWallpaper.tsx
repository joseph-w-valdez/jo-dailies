import { useMemo } from 'react'

/** Soft decorative wallpaper icons (cats + a couple extras). */
export const WALLPAPER_ICONS = [
  '/cats/cat-1.png',
  '/cats/cat-2.png',
  '/cats/cat-3.png',
  '/cats/cat-4.png',
  '/cats/cat-5.png',
  '/cats/cat-6.png',
  '/cats/cat-7.png',
  '/cats/cat-8.png',
  '/cats/cat-9.png',
  '/cats/extra-sage.png',
  '/cats/extra-bulba.png',
] as const

const COUNT = 120

type Floater = {
  id: number
  src: string
  top: string
  size: number
  opacity: number
  rotate: number
  duration: number
  delay: number
  direction: 1 | -1
  drift: number
}

function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function buildFloaters(seed = 42): Floater[] {
  const rand = mulberry32(seed)
  return Array.from({ length: COUNT }, (_, id) => {
    const src = WALLPAPER_ICONS[Math.floor(rand() * WALLPAPER_ICONS.length)]!
    return {
      id,
      src,
      top: `${rand() * 92}%`,
      size: 36 + Math.floor(rand() * 56),
      opacity: 0.1 + rand() * 0.16,
      rotate: -28 + rand() * 56,
      duration: 18 + rand() * 28,
      delay: -rand() * 40,
      direction: (rand() > 0.5 ? 1 : -1) as 1 | -1,
      drift: 8 + rand() * 18,
    }
  })
}

/** Dense field of icons drifting horizontally across the page. */
export function CatWallpaper() {
  const floaters = useMemo(() => buildFloaters(), [])

  return (
    <div className="cat-wallpaper pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      {floaters.map((f) => (
        <div
          key={f.id}
          className="cat-floater absolute"
          style={{
            top: f.top,
            left: 0,
            width: f.size,
            height: f.size,
            ['--cat-drift' as string]: `${f.drift}px`,
            animationName: f.direction === 1 ? 'cat-drift-right' : 'cat-drift-left',
            animationDuration: `${f.duration}s`,
            animationDelay: `${f.delay}s`,
            animationTimingFunction: 'linear',
            animationIterationCount: 'infinite',
          }}
        >
          <img
            src={f.src}
            alt=""
            className="cat-wallpaper-icon pointer-events-auto size-full"
            style={{
              opacity: f.opacity,
              ['--cat-rot' as string]: `${f.rotate}deg`,
              transform: `rotate(${f.rotate}deg)`,
            }}
          />
        </div>
      ))}
    </div>
  )
}
