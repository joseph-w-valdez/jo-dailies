import { useState, type CSSProperties } from 'react'
import { ConfirmDialog } from './ConfirmDialog'

/** Shared Arcade surrender control with confirm. */
export function SurrenderButton({
  disabled,
  onSurrender,
  className,
  style,
  body = 'You lose this game. Your opponent wins.',
}: {
  disabled?: boolean
  onSurrender: () => void
  className?: string
  style?: CSSProperties
  body?: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={
          className ??
          'rounded-lg border border-rose-500/40 bg-rose-500/10 px-2.5 py-1 text-xs font-medium text-rose-100 hover:bg-rose-500/20 disabled:opacity-40'
        }
        style={style}
      >
        Surrender
      </button>
      <ConfirmDialog
        open={open}
        title="Surrender?"
        body={body}
        confirmLabel="Surrender"
        danger
        onConfirm={onSurrender}
        onClose={() => setOpen(false)}
      />
    </>
  )
}
