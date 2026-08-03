import { createPortal } from 'react-dom'
import { isDebugEnabled } from '../lib/debugFlags'

/** Shared Arcade new-game confirm (optional debug hotseat). */
export function NewGameConfirm({
  open,
  onClose,
  onConfirm,
  blurb,
}: {
  open: boolean
  onClose: () => void
  onConfirm: (opts: { hotseat: boolean }) => void
  blurb: string
}) {
  if (!open || typeof document === 'undefined') return null
  const debug = isDebugEnabled()
  // Portal above Arcade theater (z-60). Prefer the fullscreen element when active.
  const mount = document.fullscreenElement ?? document.body
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface-raised p-4 shadow-xl">
        <h3 className="text-sm font-semibold text-white">New game?</h3>
        <p className="mt-1 text-[11px] text-muted">
          {blurb}
          {debug ? ' Debug is on — choose a mode below.' : ''}
        </p>
        <div className="mt-4 flex flex-col gap-2">
          {debug ? (
            <>
              <button
                type="button"
                onClick={() => {
                  onClose()
                  onConfirm({ hotseat: false })
                }}
                className="rounded-lg border border-border bg-surface px-3 py-2 text-left text-sm text-white hover:border-muted"
              >
                Confirm — Normal (2P)
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose()
                  onConfirm({ hotseat: true })
                }}
                className="rounded-lg border border-amber-400/40 bg-amber-500/15 px-3 py-2 text-left text-sm text-amber-50 hover:bg-amber-500/25"
              >
                Confirm — Debug hotseat
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => {
                onClose()
                onConfirm({ hotseat: false })
              }}
              className="rounded-lg border border-rose-400/40 bg-rose-500/15 px-3 py-2 text-sm font-medium text-rose-100 hover:bg-rose-500/25"
            >
              Confirm new game
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-xs text-muted hover:text-white"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>,
    mount,
  )
}
