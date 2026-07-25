import { useEffect, useRef, useState } from 'react'
import type { GameDef } from '../types'

interface GameFrameProps {
  game: GameDef
  onClose: () => void
  onOpenExternal: () => void
}

const ZOOM_MIN = 0.5
const ZOOM_MAX = 2
const ZOOM_STEP = 0.05
const ZOOM_DEFAULT = 1.25

export function GameFrame({ game, onClose, onOpenExternal }: GameFrameProps) {
  const [loading, setLoading] = useState(true)
  const [theater, setTheater] = useState(true)
  const [fullscreen, setFullscreen] = useState(false)
  const [zoom, setZoom] = useState(ZOOM_DEFAULT)
  const frameRef = useRef<HTMLElement>(null)

  const clampZoom = (value: number) =>
    Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(value * 100) / 100))
  const zoomIn = () => setZoom((z) => clampZoom(z + ZOOM_STEP))
  const zoomOut = () => setZoom((z) => clampZoom(z - ZOOM_STEP))
  const resetZoom = () => setZoom(1)
  const zoomPercent = Math.round(zoom * 100)
  const atDefaultZoom = zoomPercent === 100

  // Remount iframe when game changes so loading state resets cleanly
  useEffect(() => {
    setLoading(true)
  }, [game.id, game.url])

  useEffect(() => {
    const handleFullscreenChange = () => {
      setFullscreen(document.fullscreenElement === frameRef.current)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && theater && !document.fullscreenElement) {
        setTheater(false)
      }
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('keydown', handleKeyDown)
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
      // Fullscreen can be denied by browser or OS policy; keep the embed usable.
    }
  }

  return (
    <section
      ref={frameRef}
      className={[
        'overflow-hidden border bg-surface-raised shadow-[0_20px_60px_-30px_rgba(0,0,0,0.8)]',
        theater
          ? 'fixed inset-0 z-50 flex flex-col rounded-none'
          : 'rounded-2xl',
        fullscreen ? 'flex h-screen flex-col rounded-none' : '',
      ].join(' ')}
      style={{ borderColor: `${game.accent}66` }}
      aria-label={`${game.label} player`}
    >
      <header
        className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-1.5"
        style={{
          background: `linear-gradient(90deg, ${game.accent}22, transparent 55%)`,
        }}
      >
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="size-2 shrink-0 rounded-full"
            style={{ backgroundColor: game.accent }}
          />
          <h2 className="truncate text-xs font-semibold text-white">
            Playing {game.label}
          </h2>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="flex items-center overflow-hidden rounded-md border border-border bg-surface">
            <button
              type="button"
              onClick={zoomOut}
              disabled={zoomPercent <= ZOOM_MIN * 100}
              className="px-2 py-1 text-xs font-medium text-white hover:bg-white/10 disabled:opacity-40"
              aria-label="Zoom out"
            >
              −
            </button>
            <button
              type="button"
              onClick={resetZoom}
              disabled={atDefaultZoom}
              className="min-w-[2.75rem] border-x border-border px-1.5 py-1 text-center text-[11px] font-medium tabular-nums text-white hover:bg-white/10 disabled:text-muted disabled:hover:bg-transparent"
              aria-label="Reset zoom to 100%"
            >
              {zoomPercent}%
            </button>
            <button
              type="button"
              onClick={zoomIn}
              disabled={zoomPercent >= ZOOM_MAX * 100}
              className="px-2 py-1 text-xs font-medium text-white hover:bg-white/10 disabled:opacity-40"
              aria-label="Zoom in"
            >
              +
            </button>
          </div>
          <button
            type="button"
            onClick={onOpenExternal}
            className="rounded-md border border-border bg-surface px-2 py-1 text-[11px] font-medium text-white hover:border-white/30"
          >
            Pop out
          </button>
          <button
            type="button"
            onClick={() => setTheater((active) => !active)}
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
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border px-2 py-1 text-[11px] text-muted hover:bg-surface hover:text-white"
            aria-label="Close embedded game"
          >
            Close
          </button>
        </div>
      </header>

      <div
        className={[
          'relative bg-[#0b1220]',
          theater || fullscreen ? 'min-h-0 flex-1' : '',
        ].join(' ')}
      >
        {loading && (
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-0.5 overflow-hidden">
            <div
              className="h-full w-1/3 animate-pulse"
              style={{ backgroundColor: game.accent }}
            />
          </div>
        )}

        <iframe
          key={game.id}
          title={game.label}
          src={game.url}
          className={[
            'block w-full border-0',
            theater || fullscreen ? 'h-full' : 'h-[min(80vh,860px)]',
            game.darkEmbed ? 'bg-[#0b1220]' : 'bg-white',
          ].join(' ')}
          style={{
            ...(game.darkEmbed
              ? { filter: 'invert(1) hue-rotate(180deg)' }
              : undefined),
            // CSS zoom scales only the embedded game, not the page chrome
            zoom,
          }}
          onLoad={() => setLoading(false)}
          referrerPolicy="no-referrer-when-downgrade"
          allow="clipboard-write; fullscreen; autoplay"
        />
      </div>
    </section>
  )
}
