import { useCallback, useEffect, useRef, useState } from 'react'
import { appHour } from '../lib/date'
import { type ThemeId } from '../lib/themes'
import type { Streaks } from '../types'
import { ThemePicker } from './ThemePicker'
import {
  CALCIFER_BURST_MS,
  FireIcon,
  type CalciferBurst,
  type CalciferMood,
} from './FireIcon'

/** Quotes keyed by today's progress mood. */
const CALCIFER_QUOTES: Record<CalciferMood, string[]> = {
  sleepy: [
    'Light me with a daily…',
    'Still cold…',
    'Zzz… puzzles?',
    'Need a spark…',
    'Don’t leave me dim…',
  ],
  normal: ['Feed me puzzles!', 'Warm me up!', 'Got a daily?', 'Remember to say hi to Joha'],
  happy: [
    'Feed me puzzles!',
    'Getting warmer…',
    'More, please!',
    'Nice burn going…',
    'Keep ’em coming!',
  ],
  excited: [
    'Just one more!',
    'So close!',
    'One spark left!',
    'Almost blazing!',
    'Finish me off!',
    'Oh my lord!'
  ],
  golden: [
    'I’m blazing!',
    'Golden glow!',
    'Peak flame!',
    'Fully fed!',
    'Best day ever!',
  ],
}

/** Random expressive ticks — eye-based ones skipped while sleepy. */
const BURSTS_AWAKE: CalciferBurst[] = [
  'blink',
  'flick',
  'giggle',
  'pout',
  'smack',
  'blush',
  'shyPeek',
  'sparkle',
  'squint',
  'surprise',
  'smug',
  'whoosh',
  'bounce',
  'flare',
  'sputter',
  'stretch',
  'heart',
  'sparks',
  'wiggle',
  'spinTip',
  'sneeze',
  'hiccup',
  'lookAround',
  'waveTip',
  'emberRain',
  'contentSigh',
]

const BURSTS_SLEEPY: CalciferBurst[] = [
  'flick',
  'giggle',
  'pout',
  'smack',
  'blush',
  'smug',
  'whoosh',
  'bounce',
  'flare',
  'sputter',
  'stretch',
  'heart',
  'sparks',
  'wiggle',
  'spinTip',
  'napNod',
  'contentSigh',
  'sneeze',
  'hiccup',
]

const IDLE_AWAKE: CalciferBurst[] = [
  'blink',
  'stretch',
  'sneeze',
  'hiccup',
  'lookAround',
  'waveTip',
  'contentSigh',
]

const IDLE_SLEEPY: CalciferBurst[] = ['napNod', 'stretch', 'contentSigh']

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function pickQuote(mood: CalciferMood, avoid?: string): string {
  const pool = CALCIFER_QUOTES[mood]
  if (pool.length === 1) return pool[0]!
  let next = pool[Math.floor(Math.random() * pool.length)]!
  if (avoid && pool.length > 1) {
    let guard = 0
    while (next === avoid && guard < 6) {
      next = pool[Math.floor(Math.random() * pool.length)]!
      guard += 1
    }
  }
  return next
}

function pickRandomBurst(mood: CalciferMood, avoid?: CalciferBurst): CalciferBurst {
  const pool = mood === 'sleepy' ? BURSTS_SLEEPY : BURSTS_AWAKE
  // Blush is weighted ~25% so it shows up more often than the rest.
  const BLUSH_WEIGHT = Math.max(1, Math.round(pool.length / 3))
  const weighted: CalciferBurst[] = [
    ...pool,
    ...Array.from({ length: BLUSH_WEIGHT }, () => 'blush' as const),
  ]

  // Rare celebratory spin when excited/golden (~10%).
  if (
    (mood === 'excited' || mood === 'golden') &&
    !prefersReducedMotion() &&
    Math.random() < 0.1
  ) {
    return 'spin720'
  }

  let next = weighted[Math.floor(Math.random() * weighted.length)]!
  if (avoid && pool.length > 1) {
    let guard = 0
    while (next === avoid && guard < 8) {
      next = weighted[Math.floor(Math.random() * weighted.length)]!
      guard += 1
    }
  }
  return next
}

function pickIdleBurst(mood: CalciferMood): CalciferBurst {
  const pool = mood === 'sleepy' ? IDLE_SLEEPY : IDLE_AWAKE
  return pool[Math.floor(Math.random() * pool.length)]!
}

function pickProgressBurst(reduced: boolean): CalciferBurst {
  if (reduced) return 'flare'
  return Math.random() < 0.5 ? 'flare' : 'emberRain'
}

function pickGoldenBurst(reduced: boolean): CalciferBurst {
  return reduced ? 'flare' : 'spin720'
}

/** Rotate tier-appropriate quotes; caller reacts to changes for mouth chirps. */
function useCalciferQuotes(mood: CalciferMood, progressKey: number): string {
  const [quote, setQuote] = useState(() => pickQuote(mood))
  const moodRef = useRef(mood)
  const progressRef = useRef(progressKey)

  useEffect(() => {
    const moodChanged = moodRef.current !== mood
    const progressChanged = progressRef.current !== progressKey
    moodRef.current = mood
    progressRef.current = progressKey
    if (!moodChanged && !progressChanged) return
    setQuote((prev) => pickQuote(mood, prev))
  }, [mood, progressKey])

  useEffect(() => {
    let cancelled = false
    let timer: number | undefined

    const schedule = () => {
      timer = window.setTimeout(() => {
        if (cancelled) return
        setQuote((prev) => pickQuote(mood, prev))
        schedule()
      }, 20_000)
    }

    schedule()
    return () => {
      cancelled = true
      if (timer) window.clearTimeout(timer)
    }
  }, [mood])

  return quote
}

/**
 * Quote change → 1s talk, then a random expressive burst.
 * Click also plays a random burst. Idle gentle ticks every 20–40s.
 */
function useCalciferBursts(quote: string, mood: CalciferMood) {
  const [talking, setTalking] = useState(false)
  const [burst, setBurst] = useState<CalciferBurst>('none')
  const [burstKey, setBurstKey] = useState(0)
  const firstQuote = useRef(true)
  const clearBurst = useRef<number | undefined>(undefined)
  const talkTimer = useRef<number | undefined>(undefined)
  const lastBurst = useRef<CalciferBurst>('none')
  const prevMood = useRef(mood)

  const playBurst = useCallback((kind: CalciferBurst) => {
    if (kind === 'none') return
    if (talkTimer.current) {
      window.clearTimeout(talkTimer.current)
      talkTimer.current = undefined
    }
    if (clearBurst.current) window.clearTimeout(clearBurst.current)
    setTalking(false)
    lastBurst.current = kind
    setBurst(kind)
    setBurstKey((k) => k + 1)
    clearBurst.current = window.setTimeout(() => {
      setBurst('none')
    }, CALCIFER_BURST_MS[kind])
  }, [])

  const playRandom = useCallback(() => {
    playBurst(pickRandomBurst(mood, lastBurst.current))
  }, [mood, playBurst])

  useEffect(() => {
    if (firstQuote.current) {
      firstQuote.current = false
      return
    }

    if (clearBurst.current) window.clearTimeout(clearBurst.current)
    setBurst('none')
    setTalking(true)

    talkTimer.current = window.setTimeout(() => {
      talkTimer.current = undefined
      setTalking(false)
      playBurst(pickRandomBurst(mood, lastBurst.current))
    }, 1000)

    return () => {
      if (talkTimer.current) window.clearTimeout(talkTimer.current)
    }
  }, [quote, mood, playBurst])

  // Steam puff when leaving sleepy.
  useEffect(() => {
    const was = prevMood.current
    prevMood.current = mood
    if (was === 'sleepy' && mood !== 'sleepy') {
      playBurst('steamPuff')
    }
  }, [mood, playBurst])

  // Idle ambient ticks.
  useEffect(() => {
    if (prefersReducedMotion()) return
    let cancelled = false
    let timer: number | undefined

    const schedule = () => {
      const delay = 20_000 + Math.floor(Math.random() * 20_000)
      timer = window.setTimeout(() => {
        if (cancelled) return
        playBurst(pickIdleBurst(mood))
        schedule()
      }, delay)
    }

    schedule()
    return () => {
      cancelled = true
      if (timer) window.clearTimeout(timer)
    }
  }, [mood, playBurst])

  useEffect(
    () => () => {
      if (clearBurst.current) window.clearTimeout(clearBurst.current)
      if (talkTimer.current) window.clearTimeout(talkTimer.current)
    },
    [],
  )

  return { talking, burst, burstKey, playRandom, playBurst }
}

interface StreakBarProps {
  streaks: Streaks
  todayGolden: boolean
  todayCount: number
  gameCount: number
  theme: ThemeId
  onThemeChange: (theme: ThemeId) => void
  cursorTrail: boolean
  onCursorTrailChange: (enabled: boolean) => void
}

export function StreakBar({
  streaks,
  todayGolden,
  todayCount,
  gameCount,
  theme,
  onThemeChange,
  cursorTrail,
  onCursorTrailChange,
}: StreakBarProps) {
  const [celebrating, setCelebrating] = useState(false)
  const wasGolden = useRef(todayGolden)
  const remaining = gameCount - todayCount
  const hour = appHour()
  const greeting =
    hour < 12 ? 'Good morning, Jo' : hour < 18 ? 'Good afternoon, Jo' : 'Good evening, Jo'
  const statusMessage = todayGolden
    ? 'Golden day complete — Calcifer is happy!'
    : todayCount === 0
      ? 'Four tiny quests are waiting for you.'
      : `${remaining} ${remaining === 1 ? 'daily' : 'dailies'} left for a golden day.`
  const calciferVariant = todayGolden || streaks.golden > 0 ? 'golden' : 'streak'
  const calciferMood: CalciferMood = todayGolden
    ? 'golden'
    : todayCount === 0
      ? 'sleepy'
      : remaining === 1
        ? 'excited'
        : 'happy'
  const calciferSays = useCalciferQuotes(calciferMood, todayCount)
  const { talking, burst, burstKey, playRandom, playBurst } = useCalciferBursts(
    calciferSays,
    calciferMood,
  )
  const prevCount = useRef(todayCount)
  const prevGolden = useRef(todayGolden)

  useEffect(() => {
    if (todayGolden && !wasGolden.current) {
      setCelebrating(true)
      const timer = window.setTimeout(() => setCelebrating(false), 3600)
      wasGolden.current = todayGolden
      return () => window.clearTimeout(timer)
    }
    wasGolden.current = todayGolden
  }, [todayGolden])

  // Progress tick / golden / all-done reactions.
  useEffect(() => {
    const reduced = prefersReducedMotion()
    const countUp = todayCount > prevCount.current
    const becameGolden = todayGolden && !prevGolden.current
    prevCount.current = todayCount
    prevGolden.current = todayGolden

    if (becameGolden) {
      playBurst(pickGoldenBurst(reduced))
      const heartTimer = window.setTimeout(() => playBurst('heart'), reduced ? 500 : 1150)
      return () => window.clearTimeout(heartTimer)
    }

    if (countUp) {
      if (todayCount === gameCount && !todayGolden) {
        playBurst(reduced ? 'flare' : 'bounce')
      } else {
        playBurst(pickProgressBurst(reduced))
      }
    }
  }, [todayCount, todayGolden, gameCount, playBurst])

  return (
    <section
      className={[
        'relative rounded-2xl border p-5 transition-colors',
        todayGolden
          ? 'border-golden/60 bg-golden/10 shadow-[0_0_40px_-12px_rgba(251,191,36,0.55)]'
          : 'border-border bg-surface-raised',
      ].join(' ')}
    >
      {celebrating ? <GoldenConfetti /> : null}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="calcifer-buddy group flex min-w-0 items-center gap-6">
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={playRandom}
              className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-orange-300/60"
              aria-label="Poke Calcifer"
              title="Poke Calcifer"
            >
              <FireIcon
                variant={calciferVariant}
                mood={calciferMood}
                talking={talking}
                burst={burst}
                burstKey={burstKey}
                className={[
                  'calcifer-wiggle size-12',
                  calciferVariant === 'golden'
                    ? 'text-golden drop-shadow-[0_0_9px_rgba(251,191,36,0.5)]'
                    : 'text-orange-400',
                ].join(' ')}
                title="Calcifer"
              />
            </button>
            <span
              key={calciferSays}
              className="pointer-events-none absolute -right-2 -top-3 z-30 whitespace-nowrap rounded-full border border-border bg-surface px-2 py-0.5 text-[9px] font-medium text-muted shadow-lg transition-transform group-hover:-translate-y-0.5 calcifer-quote"
            >
              {calciferSays}
            </span>
          </div>

          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted">
              {greeting}
            </p>
            <h1 className="jo-slogan mt-0.5 text-xl font-semibold tracking-tight text-white">
              Make sure to do{' '}
              <span className={todayGolden ? 'text-golden' : 'text-streak'}>
                Jo
              </span>{' '}
              dailies!
            </h1>
            <p className="mt-0.5 text-xs text-muted">{statusMessage}</p>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-stretch gap-2 self-start sm:items-end sm:self-auto">
          <div
            className={[
              'flex items-center gap-3 rounded-full border px-3 py-2',
              todayGolden
                ? 'border-golden/50 bg-golden/10 text-golden'
                : 'border-border bg-surface/70 text-white',
            ].join(' ')}
            aria-label={`Today ${todayCount} of ${gameCount}${todayGolden ? ', golden' : ''}`}
          >
            <span className="text-xs font-medium tabular-nums">
              Today {todayCount}/{gameCount}
            </span>
            <span className="flex gap-1" aria-hidden="true">
              {Array.from({ length: gameCount }, (_, index) => (
                <span
                  key={index}
                  className={[
                    'size-1.5 rounded-full transition-colors',
                    index < todayCount
                      ? todayGolden
                        ? 'bg-golden'
                        : 'bg-streak'
                      : 'bg-border',
                  ].join(' ')}
                />
              ))}
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 self-end">
            <ThemePicker theme={theme} onThemeChange={onThemeChange} />

            <label className="flex cursor-pointer items-center gap-2 rounded-full border border-border bg-surface/70 px-3 py-1.5 text-[11px] text-muted hover:border-white/20 hover:text-white">
              <input
                type="checkbox"
                checked={cursorTrail}
                onChange={(e) => onCursorTrailChange(e.target.checked)}
                className="size-3.5 accent-golden"
              />
              Cursor trail
            </label>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          label="Streak"
          value={streaks.current}
          accent="text-streak"
          hint="any daily"
          fire={streaks.current > 0 ? 'streak' : null}
        />
        <Stat
          label="Best"
          value={streaks.best}
          accent="text-streak"
          hint="personal best"
          fire={streaks.best > 0 ? 'streak' : null}
        />
        <Stat
          label="Golden"
          value={streaks.golden}
          accent="text-golden"
          hint="all four"
          fire={streaks.golden > 0 ? 'golden' : null}
        />
        <Stat
          label="Golden best"
          value={streaks.goldenBest}
          accent="text-golden"
          hint="personal best"
          fire={streaks.goldenBest > 0 ? 'golden' : null}
        />
      </div>
    </section>
  )
}

function Stat({
  label,
  value,
  accent,
  hint,
  fire,
}: {
  label: string
  value: number
  accent: string
  hint: string
  fire: 'streak' | 'golden' | null
}) {
  const milestone = getMilestone(value)

  return (
    <div className="flex items-center gap-2 rounded-xl border border-border/80 bg-surface/60 px-3 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
          {milestone ? (
            <span
              className="rounded-full border border-golden/30 bg-golden/10 px-1.5 py-0.5 text-[9px] leading-none text-golden"
              title={`${milestone.days}-day milestone`}
            >
              {milestone.icon} {milestone.days}
            </span>
          ) : null}
        </div>
        <p className={`mt-1 text-2xl font-bold tabular-nums ${accent}`}>{value}</p>
        <p className="mt-0.5 text-xs text-muted">{hint}</p>
      </div>
      {fire ? (
        <FireIcon
          variant={fire}
          mood={
            fire === 'golden' ? 'golden' : value >= 7 ? 'excited' : 'happy'
          }
          seed={value}
          className={[
            'size-12 shrink-0',
            fire === 'golden'
              ? 'text-golden drop-shadow-[0_0_8px_rgba(251,191,36,0.55)]'
              : 'text-orange-400',
          ].join(' ')}
          title={fire === 'golden' ? 'Golden streak' : 'Streak'}
        />
      ) : null}
    </div>
  )
}

function getMilestone(value: number) {
  if (value >= 14) return { days: 14, icon: '♛' }
  if (value >= 7) return { days: 7, icon: '♥' }
  if (value >= 3) return { days: 3, icon: '✦' }
  return null
}

function GoldenConfetti() {
  const colors = ['bg-golden', 'bg-orange-400', 'bg-streak', 'bg-pink-400']

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
    </div>
  )
}
