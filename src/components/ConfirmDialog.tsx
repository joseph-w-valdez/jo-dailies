import { useEffect } from 'react'
import { createPortal } from 'react-dom'

/** Generic confirm overlay. Prefer this over one-off `fixed inset-0` copies. */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  onConfirm,
  onClose,
}: {
  open: boolean
  title: string
  body?: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
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
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="w-full max-w-sm rounded-2xl border border-border bg-surface-raised p-4 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 id="confirm-dialog-title" className="text-sm font-semibold text-white">
          {title}
        </h3>
        {body ? (
          <p className="mt-1 text-[11px] text-muted">{body}</p>
        ) : null}
        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => {
              onClose()
              onConfirm()
            }}
            className={
              danger
                ? 'rounded-lg border border-rose-400/40 bg-rose-500/15 px-3 py-2 text-sm font-medium text-rose-100 hover:bg-rose-500/25'
                : 'rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-white hover:border-muted'
            }
          >
            {confirmLabel}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-xs text-muted hover:text-white"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>,
    mount,
  )
}
