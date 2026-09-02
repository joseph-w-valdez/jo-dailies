import {
  DndContext,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useEffect, useRef, useState } from 'react'
import type { TokonNotationTokenId } from '../data/tokonNotation'
import { newTokonId, type TokonComboEntry } from '../lib/tokon'
import { TokonNotationChip, TokonNotationSequence } from './TokonNotationChip'

type DraftToken = { id: string; token: string }

function makeDraftToken(token: string): DraftToken {
  return { id: newTokonId('tok'), token }
}

function CursorCaret({ active }: { active: boolean }) {
  return (
    <span
      aria-hidden
      className={[
        'mx-0.5 inline-flex h-6 w-1.5 shrink-0 items-center justify-center rounded-sm transition',
        active
          ? 'bg-sky-400 shadow-[0_0_0_1px_rgba(56,189,248,0.5)]'
          : 'bg-transparent hover:bg-white/25',
      ].join(' ')}
    />
  )
}

function SortableToken({
  item,
  index,
  selected,
  onSelect,
}: {
  item: DraftToken
  index: number
  selected: boolean
  onSelect: (index: number) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id })

  return (
    <button
      ref={setNodeRef}
      type="button"
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      {...attributes}
      {...listeners}
      onClick={() => onSelect(index)}
      title="Select · drag to reorder"
      aria-pressed={selected}
      className={[
        'cursor-grab touch-none rounded-sm active:cursor-grabbing',
        isDragging ? 'z-10 opacity-80' : '',
        selected ? 'bg-sky-500/25 ring-2 ring-sky-400/70' : 'hover:bg-white/10',
      ].join(' ')}
    >
      <TokonNotationChip tokenId={item.token} />
    </button>
  )
}

function EditableSequence({
  items,
  cursor,
  selectedIndex,
  onSetCursor,
  onSelectToken,
  onReorder,
}: {
  items: DraftToken[]
  cursor: number
  selectedIndex: number | null
  onSetCursor: (index: number) => void
  onSelectToken: (index: number) => void
  onReorder: (from: number, to: number) => void
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  )

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const from = items.findIndex((item) => item.id === active.id)
    const to = items.findIndex((item) => item.id === over.id)
    if (from < 0 || to < 0) return
    onReorder(from, to)
  }

  if (items.length === 0) {
    return (
      <button
        type="button"
        onClick={() => onSetCursor(0)}
        className="flex min-h-[2.5rem] w-full items-center gap-1 px-1 text-left"
      >
        <CursorCaret active={cursor === 0} />
        <span className="text-xs italic text-muted">
          Click palette buttons to build — click gaps to place cursor
        </span>
      </button>
    )
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext
        items={items.map((item) => item.id)}
        strategy={horizontalListSortingStrategy}
      >
        <div className="flex min-h-[2.5rem] flex-wrap items-center gap-y-1 px-1 py-0.5">
          <button
            type="button"
            onClick={() => onSetCursor(0)}
            aria-label="Insert at start"
            className="inline-flex"
          >
            <CursorCaret active={cursor === 0 && selectedIndex === null} />
          </button>
          {items.map((item, index) => (
            <span key={item.id} className="inline-flex items-center">
              <SortableToken
                item={item}
                index={index}
                selected={selectedIndex === index}
                onSelect={onSelectToken}
              />
              <button
                type="button"
                onClick={() => onSetCursor(index + 1)}
                aria-label={`Insert after token ${index + 1}`}
                className="inline-flex"
              >
                <CursorCaret active={cursor === index + 1 && selectedIndex === null} />
              </button>
            </span>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}

export function TokonComboBuilder({
  entries,
  onChange,
  onInsertToken,
}: {
  entries: TokonComboEntry[]
  onChange: (entries: TokonComboEntry[]) => void
  /** Publish insert handler so the right-rail palette can drive this editor. */
  onInsertToken?: (insert: ((tokenId: TokonNotationTokenId) => void) | null) => void
}) {
  const [draftTitle, setDraftTitle] = useState('')
  const [draftItems, setDraftItems] = useState<DraftToken[]>([])
  const [cursor, setCursor] = useState(0)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const editorRef = useRef<HTMLDivElement>(null)

  const resetDraft = () => {
    setDraftTitle('')
    setDraftItems([])
    setCursor(0)
    setSelectedIndex(null)
    setEditingId(null)
  }

  const setCursorOnly = (index: number) => {
    setCursor(index)
    setSelectedIndex(null)
  }

  const selectToken = (index: number) => {
    setSelectedIndex(index)
    setCursor(index + 1)
  }

  const insertToken = (tokenId: TokonNotationTokenId) => {
    setDraftItems((prev) => {
      const next = [...prev]
      next.splice(cursor, 0, makeDraftToken(tokenId))
      return next
    })
    setCursor((c) => c + 1)
    setSelectedIndex(null)
  }

  const insertTokenRef = useRef(insertToken)
  insertTokenRef.current = insertToken

  useEffect(() => {
    if (!onInsertToken) return
    onInsertToken((tokenId) => insertTokenRef.current(tokenId))
    return () => onInsertToken(null)
  }, [onInsertToken])

  const deleteSelected = () => {
    if (selectedIndex == null) return
    const index = selectedIndex
    setDraftItems((prev) => {
      const next = prev.filter((_, i) => i !== index)
      setCursor(Math.min(index, next.length))
      return next
    })
    setSelectedIndex(null)
  }

  const backspace = () => {
    if (selectedIndex != null) {
      deleteSelected()
      return
    }
    if (draftItems.length === 0 || cursor <= 0) return
    const removeIndex = cursor - 1
    setDraftItems((prev) => prev.filter((_, i) => i !== removeIndex))
    setCursor((c) => Math.max(0, c - 1))
  }

  const clearSequence = () => {
    setDraftItems([])
    setCursor(0)
    setSelectedIndex(null)
  }

  const moveSelected = (delta: -1 | 1) => {
    if (selectedIndex == null) return
    const to = selectedIndex + delta
    if (to < 0 || to >= draftItems.length) return
    setDraftItems((prev) => arrayMove(prev, selectedIndex, to))
    setSelectedIndex(to)
    setCursor(to + 1)
  }

  const nudgeCursor = (delta: -1 | 1) => {
    if (selectedIndex != null) {
      moveSelected(delta)
      return
    }
    setCursor((c) => Math.max(0, Math.min(draftItems.length, c + delta)))
  }

  const reorder = (from: number, to: number) => {
    setDraftItems((prev) => arrayMove(prev, from, to))
    setSelectedIndex(to)
    setCursor(to + 1)
  }

  const saveDraft = () => {
    if (draftItems.length === 0) return
    const title = draftTitle.trim() || `Combo ${entries.length + 1}`
    const sequence = draftItems.map((item) => item.token)

    if (editingId) {
      onChange(
        entries.map((entry) =>
          entry.id === editingId ? { ...entry, title, sequence } : entry,
        ),
      )
    } else {
      onChange([
        ...entries,
        {
          id: newTokonId('combo'),
          title,
          sequence,
          notes: '',
        },
      ])
    }
    resetDraft()
  }

  const startEdit = (entry: TokonComboEntry) => {
    setEditingId(entry.id)
    setDraftTitle(entry.title)
    setDraftItems(entry.sequence.map((token) => makeDraftToken(token)))
    setCursor(entry.sequence.length)
    setSelectedIndex(null)
  }

  const deleteEntry = (id: string) => {
    if (!window.confirm('Delete this combo?')) return
    onChange(entries.filter((entry) => entry.id !== id))
    if (editingId === id) resetDraft()
  }

  const updateEntryNotes = (id: string, notes: string) => {
    onChange(entries.map((entry) => (entry.id === id ? { ...entry, notes } : entry)))
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        nudgeCursor(-1)
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        nudgeCursor(1)
      } else if (event.key === 'Backspace') {
        if (selectedIndex != null || cursor > 0) {
          event.preventDefault()
          backspace()
        }
      } else if (event.key === 'Delete' && selectedIndex != null) {
        event.preventDefault()
        deleteSelected()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selectedIndex, cursor, draftItems])

  const canMoveLeft =
    selectedIndex != null ? selectedIndex > 0 : cursor > 0
  const canMoveRight =
    selectedIndex != null
      ? selectedIndex < draftItems.length - 1
      : cursor < draftItems.length

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-border bg-surface/50 p-3 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-white">
            {editingId ? 'Edit combo' : 'New combo'}
          </h3>
        </div>

        <label className="mt-3 block text-xs text-muted">
          Title
          <input
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            placeholder="Midscreen bnb, corner carry…"
            className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-white outline-none focus:border-muted"
          />
        </label>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => nudgeCursor(-1)}
            disabled={!canMoveLeft}
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-white hover:border-muted disabled:opacity-40"
            title={selectedIndex != null ? 'Move token left' : 'Move caret left'}
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => nudgeCursor(1)}
            disabled={!canMoveRight}
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-white hover:border-muted disabled:opacity-40"
            title={selectedIndex != null ? 'Move token right' : 'Move caret right'}
          >
            →
          </button>
          <button
            type="button"
            onClick={backspace}
            disabled={selectedIndex == null && cursor <= 0}
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-white hover:border-muted disabled:opacity-40"
          >
            Backspace
          </button>
          <button
            type="button"
            onClick={deleteSelected}
            disabled={selectedIndex == null}
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-white hover:border-muted disabled:opacity-40"
          >
            Delete
          </button>
          <button
            type="button"
            onClick={clearSequence}
            disabled={draftItems.length === 0}
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-white hover:border-muted disabled:opacity-40"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={saveDraft}
            disabled={draftItems.length === 0}
            className="rounded-lg border border-sky-400/40 bg-sky-500/15 px-3 py-1.5 text-xs font-medium text-sky-50 hover:bg-sky-500/25 disabled:opacity-40"
          >
            {editingId ? 'Save changes' : 'Save combo'}
          </button>
          {editingId ? (
            <button
              type="button"
              onClick={resetDraft}
              className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-100 hover:bg-rose-500/20"
            >
              Cancel
            </button>
          ) : null}
        </div>

        <div
          ref={editorRef}
          tabIndex={0}
          className="mt-3 rounded-lg border border-dashed border-border bg-surface/40 outline-none focus-visible:border-sky-400/50"
        >
          <EditableSequence
            items={draftItems}
            cursor={cursor}
            selectedIndex={selectedIndex}
            onSetCursor={setCursorOnly}
            onSelectToken={selectToken}
            onReorder={reorder}
          />
        </div>
        <p className="mt-1.5 text-[10px] text-muted">
          ← → move caret or selected token · drag tokens to reorder · Delete removes
          selection · use the Inputs panel to add tokens
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-white">
          Saved combos ({entries.length})
        </h3>
        {entries.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted">
            Build a sequence above and save it.
          </p>
        ) : (
          <ul className="space-y-2">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="rounded-xl border border-border bg-surface/50 p-3 sm:p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-white">{entry.title}</p>
                    <div className="mt-2">
                      <TokonNotationSequence sequence={entry.sequence} />
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => startEdit(entry)}
                      className="rounded-md border border-border bg-surface px-2 py-1 text-[11px] text-white hover:border-muted"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteEntry(entry.id)}
                      className="rounded-md border border-border bg-surface px-2 py-1 text-[11px] text-rose-300/90 hover:border-rose-400/40"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <label className="mt-3 block text-xs text-muted">
                  Notes
                  <textarea
                    value={entry.notes}
                    onChange={(e) => updateEntryNotes(entry.id, e.target.value)}
                    rows={2}
                    placeholder="Damage, meter, positioning…"
                    className="mt-1 w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 text-sm leading-relaxed text-white outline-none focus:border-muted"
                  />
                </label>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
