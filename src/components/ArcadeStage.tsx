import { useEffect, useRef, useState, type ReactNode } from 'react'

export interface ArcadeStageContext {
  /** Theater or browser fullscreen — hide bulky instructions, stretch playfield. */
  immersive: boolean
  theater: boolean
  fullscreen: boolean
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
  const [theater, setTheater] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const frameRef = useRef<HTMLElement>(null)
  const immersive = theater || fullscreen

  useEffect(() => {
    const onFullscreenChange = () => {
      setFullscreen(document.fullscreenElement === frameRef.current)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && theater && !document.fullscreenElement) {
        setTheater(false)
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
            className="rounded-md border border-border bg-surface px-2 py-1 text-[11px] font-medium text-muted hover:border-white/30 hover:text-white"
          >
            Back
          </button>
          <h2 className="truncate text-sm font-semibold text-white">{title}</h2>
          {meta}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setTheater((v) => !v)}
            className="rounded-md border border-border bg-surface px-2 py-1 text-[11px] font-medium text-white hover:border-white/30"
            aria-pressed={theater}
          >
            {theater ? 'Exit theater' : 'Theater'}
          </button>
          <button
            type="button"
            onClick={() => void toggleFullscreen()}
            className="rounded-md border border-border bg-surface px-2 py-1 text-[11px] font-medium text-white hover:border-white/30"
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
