import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  pictionaryCardSlug,
  PICTIONARY_DIFFICULTIES,
  PICTIONARY_DIFFICULTY_LABEL,
  type PictionaryCard,
  type PictionaryDifficulty,
} from '../lib/pictionaryDeck'

/** Add / remove the shared custom cards. */
export function PictionaryDeckEditor({
  open,
  cards,
  onAdd,
  onRemove,
  onClose,
}: {
  open: boolean
  cards: PictionaryCard[]
  onAdd: (word: string, difficulty: PictionaryDifficulty) => void
  onRemove: (cardId: string) => void
  onClose: () => void
}) {
  const [word, setWord] = useState('')
  const [difficulty, setDifficulty] = useState<PictionaryDifficulty>('medium')

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

  const slug = pictionaryCardSlug(word)
  const duplicate = Boolean(slug) && cards.some((c) => c.id === `custom:${slug}`)
  const canAdd = Boolean(slug) && !duplicate

  const add = () => {
    if (!canAdd) return
    onAdd(word, difficulty)
    setWord('')
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Custom cards"
        className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl border border-border bg-surface-raised p-4 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-white">Custom cards</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-xs text-muted hover:text-white"
          >
            Done
          </button>
        </div>
        <p className="mt-1 text-[11px] text-muted">
          Shared between you two. They show up as the Custom deck and get mixed
          into All themes.
        </p>

        <form
          className="mt-3 flex flex-wrap items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            add()
          }}
        >
          <label className="min-w-[12rem] flex-1 text-xs text-muted">
            Word or phrase
            <input
              value={word}
              onChange={(e) => setWord(e.target.value)}
              maxLength={60}
              placeholder="our first apartment…"
              className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-white outline-none focus:border-sky-400/60"
            />
          </label>
          <div className="flex overflow-hidden rounded-lg border border-border">
            {PICTIONARY_DIFFICULTIES.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDifficulty(d)}
                aria-pressed={difficulty === d}
                className={[
                  'px-2.5 py-2 text-xs font-medium',
                  difficulty === d
                    ? 'bg-sky-500/25 text-white'
                    : 'bg-surface text-muted hover:text-white',
                ].join(' ')}
              >
                {PICTIONARY_DIFFICULTY_LABEL[d]}
              </button>
            ))}
          </div>
          <button
            type="submit"
            disabled={!canAdd}
            className="rounded-lg border border-sky-400/40 bg-sky-500/20 px-3 py-2 text-sm font-medium text-sky-50 enabled:hover:bg-sky-500/30 disabled:opacity-40"
          >
            Add
          </button>
        </form>
        {duplicate ? (
          <p className="mt-1 text-[11px] text-amber-200">Already in the deck.</p>
        ) : null}

        <div className="jo-scroll mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
          {cards.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted">No custom cards yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {cards.map((card) => (
                <li
                  key={card.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2"
                >
                  <span className="min-w-0 truncate text-sm text-white">{card.word}</span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="text-[11px] text-muted">
                      {PICTIONARY_DIFFICULTY_LABEL[card.difficulty]}
                    </span>
                    <button
                      type="button"
                      onClick={() => onRemove(card.id)}
                      aria-label={`Remove ${card.word}`}
                      className="rounded-md px-1.5 text-sm text-muted hover:text-rose-200"
                    >
                      ×
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>,
    document.fullscreenElement ?? document.body,
  )
}
