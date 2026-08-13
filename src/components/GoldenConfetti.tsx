import { useMemo, type CSSProperties } from 'react'
import { petIdleSrc } from '../lib/petAssets'
import { WALLPAPER_ICONS } from './CatWallpaper'

const WHEEL_CAT_QUOTES = [
  'Why me?',
  'Joha is always right',
  "I'm falling!",
  'Call an ambulance!',
  'I have 9 lives. This is fine.',
  'I always land on my feet.',
  'Not again…',
  'Tell Joha I said hi!',
] as const

function winnerQuotes(winner: string): string[] {
  const choice = winner.trim()
  if (!choice) return []
  return [
    `Go ${choice}!`,
    `Have fun — ${choice}!`,
    `Time to ${choice}.`,
  ]
}

function pickWheelCatQuotes(winner: string | null | undefined): string[] {
  const choice = winner?.trim() ?? ''
  const winnerPool = choice ? winnerQuotes(choice) : []
  const generalPool = [...WHEEL_CAT_QUOTES]
  for (let i = generalPool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[generalPool[i], generalPool[j]] = [generalPool[j]!, generalPool[i]!]
  }

  const quotes: string[] = [
    generalPool[0] ?? 'Why me?',
    generalPool[1] ?? "I'm falling!",
    generalPool[2] ?? 'Call an ambulance!',
  ]

  if (winnerPool.length > 0) {
    const winnerLine =
      winnerPool[Math.floor(Math.random() * winnerPool.length)]!
    const slot = Math.floor(Math.random() * 3)
    quotes[slot] = winnerLine
  }

  return quotes
}

/** Full-screen golden streak confetti (home golden day + wheel win). */
export function GoldenConfetti({
  rainCats = false,
  winnerLabel = null,
}: {
  /** Wheel-only: also drop a few randomly rotated cats. */
  rainCats?: boolean
  /** Winning wheel option — used for a couple present-tense cat lines. */
  winnerLabel?: string | null
}) {
  const colors = ['bg-golden', 'bg-orange-400', 'bg-streak', 'bg-pink-400']
  const cats = useMemo(() => {
    if (!rainCats) return []
    const pool = [...WALLPAPER_ICONS]
    for (let i = pool.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[pool[i], pool[j]] = [pool[j]!, pool[i]!]
    }
    const quotes = pickWheelCatQuotes(winnerLabel)
    return pool.slice(0, 3).map((species, index) => ({
      src: petIdleSrc(species),
      quote: quotes[index] ?? WHEEL_CAT_QUOTES[index % WHEEL_CAT_QUOTES.length]!,
      left: 10 + index * 30 + Math.random() * 14,
      delay: 40 + index * 160 + Math.floor(Math.random() * 120),
      duration: 2800 + Math.floor(Math.random() * 700),
      rot: Math.floor(Math.random() * 360) - 180,
      fallX: Math.floor(Math.random() * 180) - 90,
    }))
  }, [rainCats, winnerLabel])

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[60] overflow-hidden"
      aria-hidden="true"
    >
      {Array.from({ length: 60 }, (_, index) => (
        <span
          key={index}
          className={[
            'golden-confetti absolute -top-4 size-2 rounded-sm',
            colors[index % colors.length],
          ].join(' ')}
          style={{
            left: `${(index * 37) % 100}%`,
            animationDelay: `${(index % 10) * 90}ms`,
            animationDuration: `${2200 + (index % 5) * 300}ms`,
          }}
        />
      ))}
      {cats.map((cat, index) => (
        <div
          key={`${cat.src}-${index}`}
          className="cat-confetti-bit absolute top-0 z-[1] flex w-28 flex-col items-center sm:w-32"
          style={
            {
              left: `${cat.left}%`,
              animationDelay: `${cat.delay}ms`,
              animationDuration: `${cat.duration}ms`,
              '--cat-fall-x': `${cat.fallX}px`,
            } as CSSProperties
          }
        >
          <span className="mb-1 w-max max-w-[11rem] rounded-full border border-border bg-surface px-2.5 py-1 text-center text-[11px] font-medium leading-snug text-muted shadow-lg">
            {cat.quote}
          </span>
          <img
            src={cat.src}
            alt=""
            draggable={false}
            className="cat-confetti-spin w-24 object-contain drop-shadow-lg sm:w-28"
            style={
              {
                animationDelay: `${cat.delay}ms`,
                animationDuration: `${cat.duration}ms`,
                '--cat-rot': `${cat.rot}deg`,
              } as CSSProperties
            }
          />
        </div>
      ))}
    </div>
  )
}
