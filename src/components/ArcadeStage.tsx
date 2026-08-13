import { useEffect, useRef, useState, type ReactNode } from 'react'

const THEATER_KEY = 'jo-dailies:arcade-theater:v1'

function readTheaterPref(): boolean {
  try {
    return localStorage.getItem(THEATER_KEY) === '1'
  } catch {
    return false
  }
}

function writeTheaterPref(on: boolean) {
  try {
    localStorage.setItem(THEATER_KEY, on ? '1' : '0')
  } catch {
    /* private mode / quota */
  }
}

export interface ArcadeStageContext {
  /** Theater or browser fullscreen — hide bulky instructions, stretch playfield. */
  immersive: boolean
  theater: boolean
  fullscreen: boolean
}

/** Header status chip — fixed amber so it stays readable on every theme. */
export function ArcadeStatus({
  children,
  tone = 'ready',
}: {
  children: ReactNode
  tone?: 'ready' | 'danger' | 'win'
}) {
  const [alerting, setAlerting] = useState(false)
  const prevText = useRef<string | null>(null)
  const label = String(children ?? '')

  useEffect(() => {
    if (prevText.current === null) {
      prevText.current = label
      return
    }
    if (prevText.current === label) return
    prevText.current = label
    setAlerting(false)
    const frame = requestAnimationFrame(() => setAlerting(true))
    return () => cancelAnimationFrame(frame)
  }, [label])

  return (
    <span
      className={[
        'inline-flex max-w-full truncate rounded-full px-2.5 py-0.5 text-[11px] font-semibold leading-tight',
        tone === 'danger'
          ? 'bg-rose-500 text-white'
          : tone === 'win'
            ? 'bg-golden text-amber-950 shadow-[0_0_0_1px_rgba(251,191,36,0.55),0_0_18px_rgba(251,191,36,0.45)]'
            : 'bg-amber-400 text-amber-950',
        alerting ? 'arcade-status-alert' : '',
      ].join(' ')}
      onAnimationEnd={() => setAlerting(false)}
    >
      {children}
    </span>
  )
}

interface ArcadeStageProps {
  title: string
  ariaLabel?: string
  onClose: () => void
  /** Optional status / brick count on the right of the title. */
  meta?: ReactNode
  children: (ctx: ArcadeStageContext) => ReactNode
}

/** Shared Jenga-style chrome: Back + Theater + Fullscreen (no collapse). */
export function ArcadeStage({
  title,
  ariaLabel,
  onClose,
  meta,
  children,
}: ArcadeStageProps) {
  const [theater, setTheater] = useState(readTheaterPref)
  const [fullscreen, setFullscreen] = useState(false)
  const frameRef = useRef<HTMLElement>(null)
  const immersive = theater || fullscreen

  const setTheaterPref = (on: boolean) => {
    setTheater(on)
    writeTheaterPref(on)
  }

  useEffect(() => {
    const onFullscreenChange = () => {
      const isFs = document.fullscreenElement === frameRef.current
      setFullscreen(isFs)
      // Fullscreen temporarily drops theater chrome; restore the saved pref.
      if (!isFs && readTheaterPref()) setTheater(true)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && theater && !document.fullscreenElement) {
        setTheaterPref(false)
      }
    }
    document.addEventListener('fullscreenchange', onFullscreenChange)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [theater])

  useEffect(() => {
    if (!theater) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [theater])

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
        return
      }
      setTheater(false)
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
      await frameRef.current?.requestFullscreen()
    } catch {
      /* Fullscreen can be denied; keep the module usable. */
    }
  }

  return (
    <section
      ref={frameRef}
      className={[
        'border border-border bg-surface-raised shadow-[0_20px_60px_-30px_rgba(0,0,0,0.8)]',
        theater
          ? 'fixed inset-0 z-[60] flex flex-col rounded-none p-4'
          : 'rounded-2xl p-4',
        fullscreen ? 'flex h-screen flex-col rounded-none p-4' : '',
      ].join(' ')}
      aria-label={ariaLabel ?? title}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border bg-surface px-2 py-1 text-[11px] font-medium text-muted hover:border-muted hover:text-white"
          >
            Back
          </button>
          <h2 className="truncate text-sm font-semibold text-white">{title}</h2>
          {meta ? <div className="min-w-0 shrink">{meta}</div> : null}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setTheaterPref(!theater)}
            className="rounded-md border border-border bg-surface px-2 py-1 text-[11px] font-medium text-white hover:border-muted"
            aria-pressed={theater}
          >
            {theater ? 'Exit theater' : 'Theater'}
          </button>
          <button
            type="button"
            onClick={() => void toggleFullscreen()}
            className="rounded-md border border-border bg-surface px-2 py-1 text-[11px] font-medium text-white hover:border-muted"
            aria-pressed={fullscreen}
          >
            {fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          </button>
        </div>
      </div>

      <div
        className={
          immersive ? 'mt-3 flex min-h-0 flex-1 flex-col' : undefined
        }
      >
        {children({ immersive, theater, fullscreen })}
      </div>
    </section>
  )
}
