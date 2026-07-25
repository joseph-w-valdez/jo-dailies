import { useEffect, useRef, useState } from 'react'
import { WALLPAPER_ICONS } from './CatWallpaper'

const TRAIL_KEY = 'jo-dailies:cursor-trail'
const MAX_DOTS = 5
/** Sit the crumb a bit past the tip, toward bottom-right. */
const OFFSET_X = 16
const OFFSET_Y = 18

type Dot = {
  id: number
  x: number
  y: number
  src: string
  size: number
}

function loadEnabled(): boolean {
  try {
    const raw = localStorage.getItem(TRAIL_KEY)
    // Default on; only off when explicitly saved as 0.
    return raw !== '0'
  } catch {
    return true
  }
}

/** Soft icon crumbs that follow the cursor when enabled. */
export function CursorTrail({ enabled }: { enabled: boolean }) {
  const [dots, setDots] = useState<Dot[]>([])
  const idRef = useRef(0)
  const lastRef = useRef(0)

  useEffect(() => {
    if (!enabled) {
      setDots([])
      return
    }

    const onMove = (event: PointerEvent) => {
      const now = performance.now()
      if (now - lastRef.current < 70) return
      lastRef.current = now

      const id = ++idRef.current
      const src = WALLPAPER_ICONS[id % WALLPAPER_ICONS.length]!
      const size = 18 + (id % 4) * 3

      setDots((prev) => {
        const next = [
          ...prev,
          {
            id,
            x: event.clientX + OFFSET_X,
            y: event.clientY + OFFSET_Y,
            src,
            size,
          },
        ]
        return next.length > MAX_DOTS ? next.slice(next.length - MAX_DOTS) : next
      })

      window.setTimeout(() => {
        setDots((prev) => prev.filter((d) => d.id !== id))
      }, 480)
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [enabled])

  if (!enabled) return null

  return (
    <div className="pointer-events-none fixed inset-0 z-[90]" aria-hidden="true">
      {dots.map((d) => (
        <img
          key={d.id}
          src={d.src}
          alt=""
          className="cursor-trail-bit absolute"
          style={{
            left: d.x,
            top: d.y,
            width: d.size,
            height: d.size,
          }}
        />
      ))}
    </div>
  )
}

export function useCursorTrailSetting() {
  const [enabled, setEnabled] = useState(loadEnabled)

  const setTrail = (next: boolean) => {
    setEnabled(next)
    try {
      localStorage.setItem(TRAIL_KEY, next ? '1' : '0')
    } catch {
      /* ignore */
    }
  }

  return { trailEnabled: enabled, setTrailEnabled: setTrail }
}
