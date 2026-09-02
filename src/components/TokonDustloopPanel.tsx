import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { tokonDustloopUrl, type TokonRosterEntry } from '../data/tokonRoster'

const COLLAPSE_KEY = 'jo-dailies:tokon-dustloop-collapsed:v1'
const HEIGHT_KEY = 'jo-dailies:tokon-dustloop-height:v1'
const DEFAULT_HEIGHT = 440
const MIN_HEIGHT = 240
const MAX_HEIGHT = 960

function loadCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === '1'
  } catch {
    return false
  }
}

function saveCollapsed(value: boolean): void {
  try {
    localStorage.setItem(COLLAPSE_KEY, value ? '1' : '0')
  } catch {
    /* ignore */
  }
}

function loadHeight(): number {
  try {
    const raw = localStorage.getItem(HEIGHT_KEY)
    if (!raw) return DEFAULT_HEIGHT
    const n = Number.parseInt(raw, 10)
    if (!Number.isFinite(n)) return DEFAULT_HEIGHT
    return Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, n))
  } catch {
    return DEFAULT_HEIGHT
  }
}

function saveHeight(value: number): void {
  try {
    localStorage.setItem(HEIGHT_KEY, String(value))
  } catch {
    /* ignore */
  }
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 12 12"
      className={[
        'size-3 shrink-0 transition-transform duration-200',
        open ? 'rotate-90' : 'rotate-0',
      ].join(' ')}
      aria-hidden="true"
    >
      <path
        d="M4 2.5 L8.5 6 L4 9.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function DustloopFrame({
  entry,
  className,
}: {
  entry: TokonRosterEntry
  className?: string
}) {
  return (
    <iframe
      key={entry.id}
      title={`${entry.name} on Dustloop`}
      src={tokonDustloopUrl(entry)}
      className={['block w-full border-0 bg-white', className].filter(Boolean).join(' ')}
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
    />
  )
}

export function TokonDustloopPanel({
  entry,
  embedded = false,
}: {
  entry: TokonRosterEntry
  /** When true, always expanded (used on Dustloop tab). */
  embedded?: boolean
}) {
  const [collapsed, setCollapsed] = useState(() => (embedded ? false : loadCollapsed()))
  const [height, setHeight] = useState(() => loadHeight())
  const [theater, setTheater] = useState(false)
  const resizeRef = useRef<{
    pointerId: number
    startY: number
    startHeight: number
  } | null>(null)
  const dustloopUrl = tokonDustloopUrl(entry)

  useEffect(() => {
    if (embedded) return
    saveCollapsed(collapsed)
  }, [collapsed, embedded])

  useEffect(() => {
    saveHeight(height)
  }, [height])

  useEffect(() => {
    if (!theater) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setTheater(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [theater])

  const onResizePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return
    event.preventDefault()
    resizeRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startHeight: height,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const onResizePointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    const resize = resizeRef.current
    if (!resize || resize.pointerId !== event.pointerId) return
    const next = Math.min(
      MAX_HEIGHT,
      Math.max(MIN_HEIGHT, resize.startHeight + (event.clientY - resize.startY)),
    )
    setHeight(next)
  }

  const endResize = (event: React.PointerEvent<HTMLButtonElement>) => {
    const resize = resizeRef.current
    if (!resize || resize.pointerId !== event.pointerId) return
    resizeRef.current = null
    try {
      event.currentTarget.releasePointerCapture(event.pointerId)
    } catch {
      /* ignore */
    }
  }

  const theaterOverlay =
    theater && typeof document !== 'undefined'
      ? createPortal(
          <div
            className="fixed inset-0 z-[70] flex flex-col bg-surface-raised"
            role="dialog"
            aria-modal="true"
            aria-label={`${entry.name} on Dustloop`}
          >
            <div className="flex shrink-0 flex-wrap items-center gap-x-2 gap-y-1 border-b border-border px-2 py-1">
              <button
                type="button"
                onClick={() => setTheater(false)}
                className="rounded-md border border-border bg-surface px-2 py-0.5 text-[11px] font-medium text-muted hover:border-muted hover:text-white"
              >
                Back
              </button>
              <p className="min-w-0 flex-1 truncate text-[11px]">
                <span className="font-semibold text-white">{entry.name}</span>
                <span className="text-muted"> · Dustloop</span>
              </p>
              <a
                href={dustloopUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 rounded-md border border-border bg-surface px-2 py-0.5 text-[11px] font-medium text-white hover:border-muted"
              >
                Open
              </a>
            </div>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-surface">
              <DustloopFrame entry={entry} className="min-h-0 flex-1" />
            </div>
          </div>,
          document.body,
        )
      : null

  const showFrame = embedded || !collapsed

  return (
    <>
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          {embedded ? (
            <p className="text-sm font-medium text-muted">Dustloop reference</p>
          ) : (
            <button
              type="button"
              onClick={() => setCollapsed((value) => !value)}
              aria-expanded={!collapsed}
              className="flex min-w-0 items-center gap-1.5 text-left transition hover:opacity-90"
            >
              <ChevronIcon open={!collapsed} />
              <p className="text-sm font-medium text-muted">Dustloop</p>
            </button>
          )}
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => setTheater(true)}
              className="rounded-md border border-border bg-surface px-2 py-1 text-[11px] font-medium text-white hover:border-muted"
            >
              Theater
            </button>
            <a
              href={dustloopUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-sky-300/90 hover:text-sky-200"
            >
              Open full page ↗
            </a>
          </div>
        </div>

        {showFrame ? (
          <div className="mt-1 overflow-hidden rounded-lg border border-border bg-white">
            <div style={{ height }}>
              <DustloopFrame entry={entry} className="h-full" />
            </div>
            <button
              type="button"
              aria-label="Resize Dustloop panel"
              title="Drag to resize"
              onPointerDown={onResizePointerDown}
              onPointerMove={onResizePointerMove}
              onPointerUp={endResize}
              onPointerCancel={() => {
                resizeRef.current = null
              }}
              className="flex w-full cursor-ns-resize items-center justify-center border-t border-border bg-surface/80 py-1.5 touch-none hover:bg-surface"
            >
              <span className="h-1 w-10 rounded-full bg-border" aria-hidden />
            </button>
          </div>
        ) : null}
      </div>
      {theaterOverlay}
    </>
  )
}
