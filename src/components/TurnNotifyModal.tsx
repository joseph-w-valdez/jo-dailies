import { useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import { JENGA_CAT_THEMES } from '../lib/jenga'
import { petAssetBundle } from '../lib/petAssets'

const TURN_QUOTES = [
  "It's your turn!",
  "Hey — it's your turn!",
  "Your move, human!",
  "Wakey wakey… your turn!",
  "The board awaits!",
  "I believe this is yours!",
] as const

const SCRABBLE_PATH = '/arcade?game=scrabble'

function pickCatSrc(): string {
  const theme =
    JENGA_CAT_THEMES[Math.floor(Math.random() * JENGA_CAT_THEMES.length)]!
  return petAssetBundle(theme.icon).idle
}

function pickQuote(): string {
  return TURN_QUOTES[Math.floor(Math.random() * TURN_QUOTES.length)]!
}

function isOnScrabble(pathname: string, search: string): boolean {
  if (pathname !== '/arcade') return false
  return new URLSearchParams(search).get('game') === 'scrabble'
}

/** In-app Scrabble turn alert — bouncing cat + quote. */
export function TurnNotifyModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const showOpenScrabble = !isOnScrabble(location.pathname, location.search)
  const catSrc = useMemo(() => (open ? pickCatSrc() : ''), [open])
  const quote = useMemo(() => (open ? pickQuote() : ''), [open])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' && event.key !== 'Enter') return
      event.stopImmediatePropagation()
      onClose()
    }
    document.addEventListener('keydown', onKeyDown, true)
    return () => document.removeEventListener('keydown', onKeyDown, true)
  }, [open, onClose])

  if (!open || typeof document === 'undefined') return null
  const mount = document.fullscreenElement ?? document.body

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="turn-notify-title"
        className="w-full max-w-xs rounded-2xl border border-border bg-surface-raised p-5 text-center shadow-xl"
        onMouseDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative mx-auto inline-block">
          <img
            src={catSrc}
            alt=""
            className="turn-notify-cat size-28 object-contain"
            draggable={false}
          />
          <span
            key={quote}
            className="pointer-events-none absolute -right-2 -top-3 z-10 max-w-[9.5rem] rounded-2xl border border-border bg-surface px-2.5 py-1.5 text-left text-[11px] font-semibold leading-snug text-white shadow-lg"
          >
            {quote}
          </span>
        </div>
        <h3
          id="turn-notify-title"
          className="mt-4 text-base font-semibold text-white"
        >
          Scrabble
        </h3>
        <p className="mt-1 text-sm text-muted">It&apos;s your turn.</p>
        <div className="mt-4 flex flex-col gap-2">
          {showOpenScrabble ? (
            <button
              type="button"
              onClick={() => {
                onClose()
                navigate(SCRABBLE_PATH)
              }}
              className="w-full rounded-lg border border-emerald-500/55 bg-emerald-500/20 px-3 py-2 text-sm font-medium text-app-text hover:bg-emerald-500/30"
            >
              Open Scrabble
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg px-3 py-2 text-xs text-muted hover:text-white"
          >
            Got it
          </button>
        </div>
      </div>
    </div>,
    mount,
  )
}
