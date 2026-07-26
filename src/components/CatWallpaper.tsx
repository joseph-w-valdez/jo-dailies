import { useEffect, useMemo, useState } from 'react'
import { petQuote } from '../lib/petQuotes'

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
const QUOTE_SHOW_MS = 3_500
const WALLPAPER_NEEDS = { hungry: false, dirty: false, bored: false } as const

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

type SpeechBubble = {
  id: number
  text: string
  key: number
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

function bumpWiggle(icon: HTMLElement) {
  icon.classList.remove('is-wiggling')
  // Force a reflow so removing/re-adding the class restarts the keyframes.
  void icon.offsetWidth
  icon.classList.add('is-wiggling')
}

/** Dense field of icons drifting horizontally across the page. */
export function CatWallpaper() {
  const floaters = useMemo(() => buildFloaters(), [])
  const [speech, setSpeech] = useState<SpeechBubble | null>(null)

  useEffect(() => {
    if (!speech) return
    const hide = window.setTimeout(() => setSpeech(null), QUOTE_SHOW_MS)
    return () => window.clearTimeout(hide)
  }, [speech])

  return (
    // Behind the page content. The dashboard exposes only its empty gutters
    // to pointer events, so cats stay decorative over actual panels.
    <div
      className="cat-wallpaper pointer-events-none fixed inset-0 z-[1] overflow-hidden"
      aria-hidden="true"
    >
      {floaters.map((f) => (
        <div
          key={f.id}
          className="cat-floater pointer-events-none absolute"
          style={{
            top: f.top,
            left: 0,
            width: f.size,
            height: f.size,
            ['--cat-drift' as string]: `${f.drift}px`,
            animationName:
              f.direction === 1 ? 'cat-drift-right' : 'cat-drift-left',
            animationDuration: `${f.duration}s`,
            animationDelay: `${f.delay}s`,
            animationTimingFunction: 'linear',
            animationIterationCount: 'infinite',
          }}
        >
          {speech?.id === f.id ? (
            <span
              key={speech.key}
              className="pet-care-quote pointer-events-none absolute bottom-[calc(100%+6px)] left-1/2 z-[2] w-max max-w-[10.5rem] -translate-x-1/2 rounded-full border border-border bg-surface px-2.5 py-1 text-center text-[11px] font-medium leading-snug text-muted shadow-lg"
            >
              {speech.text}
            </span>
          ) : null}
          <img
            src={f.src}
            alt=""
            draggable={false}
            className="cat-wallpaper-icon pointer-events-auto size-full"
            style={{
              opacity: f.opacity,
              ['--cat-rot' as string]: `${f.rotate}deg`,
              transform: `rotate(${f.rotate}deg)`,
            }}
            onPointerEnter={(e) => {
              const floater = e.currentTarget.parentElement
              if (floater) {
                floater.style.animationPlayState = 'paused'
                // Keep this cat on top so neighbors sliding under the cursor
                // can't steal hover and unpause it.
                floater.style.zIndex = '5'
              }
              bumpWiggle(e.currentTarget)
            }}
            onPointerLeave={(e) => {
              const floater = e.currentTarget.parentElement
              if (floater) {
                floater.style.animationPlayState = 'running'
                floater.style.zIndex = ''
              }
            }}
            onClick={(e) => {
              bumpWiggle(e.currentTarget)
              setSpeech((prev) => ({
                id: f.id,
                text: petQuote(
                  f.src,
                  WALLPAPER_NEEDS,
                  prev?.id === f.id ? prev.text : undefined,
                  'wallpaper',
                ),
                key: (prev?.key ?? 0) + 1,
              }))
            }}
            onAnimationEnd={(e) => {
              if (e.animationName === 'cat-icon-wiggle') {
                e.currentTarget.classList.remove('is-wiggling')
              }
            }}
          />
        </div>
      ))}
    </div>
  )
}
