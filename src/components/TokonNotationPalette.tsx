import type { ReactNode } from 'react'
import {
  TOKON_CANCEL_TOKENS,
  TOKON_FLOW_TOKENS,
  TOKON_MOTIONS,
  TOKON_PROMPTS,
  TOKON_STATE_TOKENS,
  type TokonNotationTokenId,
} from '../data/tokonNotation'
import { TokonNotationChip } from './TokonNotationChip'

function PaletteButton({
  tokenId,
  onPick,
}: {
  tokenId: TokonNotationTokenId
  onPick: (tokenId: TokonNotationTokenId) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onPick(tokenId)}
      className="rounded-md border border-border bg-surface/80 p-1 transition hover:border-muted hover:bg-surface"
      title={`Add ${tokenId}`}
    >
      <TokonNotationChip tokenId={tokenId} size="sm" />
    </button>
  )
}

function PaletteSection({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: ReactNode
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
        {title}
      </p>
      {hint ? <p className="mt-0.5 text-[10px] text-muted/80">{hint}</p> : null}
      <div className="mt-1 flex flex-wrap gap-1">{children}</div>
    </div>
  )
}

export function TokonNotationPalette({
  onPick,
}: {
  onPick: (tokenId: TokonNotationTokenId) => void
}) {
  return (
    <div className="space-y-3">
      <PaletteSection title="Buttons">
        {TOKON_PROMPTS.map((tokenId) => (
          <PaletteButton key={tokenId} tokenId={tokenId} onPick={onPick} />
        ))}
      </PaletteSection>

      <PaletteSection title="Directions">
        <div className="grid max-w-[16rem] grid-cols-3 gap-1">
          {(['7', '8', '9', '4', '5', '6', '1', '2', '3'] as const).map((tokenId) => (
            <PaletteButton key={tokenId} tokenId={tokenId} onPick={onPick} />
          ))}
        </div>
      </PaletteSection>

      <PaletteSection title="Motions">
        {TOKON_MOTIONS.map((tokenId) => (
          <PaletteButton key={tokenId} tokenId={tokenId} onPick={onPick} />
        ))}
      </PaletteSection>

      <PaletteSection
        title="Flow"
        hint="+ · ~ · land · jump · dash · superjump · super 1/2 · tokon assemble"
      >
        {TOKON_FLOW_TOKENS.map((tokenId) => (
          <PaletteButton key={tokenId} tokenId={tokenId} onPick={onPick} />
        ))}
      </PaletteSection>

      <PaletteSection
        title="State"
        hint="j. air · c./f. range · dl. delay · [ ] hold"
      >
        {TOKON_STATE_TOKENS.map((tokenId) => (
          <PaletteButton key={tokenId} tokenId={tokenId} onPick={onPick} />
        ))}
      </PaletteSection>

      <PaletteSection
        title="Cancels & movement"
        hint="jc · dj · IAD · 66 dash/airdash · CH counter hit"
      >
        {TOKON_CANCEL_TOKENS.map((tokenId) => (
          <PaletteButton key={tokenId} tokenId={tokenId} onPick={onPick} />
        ))}
      </PaletteSection>
    </div>
  )
}

/** Sticky right-rail shell matching the roster rail. */
export function TokonNotationPaletteRail({
  onPick,
}: {
  onPick: (tokenId: TokonNotationTokenId) => void
}) {
  return (
    <aside className="w-full max-w-[28rem] shrink-0 lg:h-[calc(100dvh-5.5rem)]">
      <section className="flex h-full flex-col rounded-2xl border border-border bg-surface-raised p-3 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.8)] sm:p-4">
        <h2 className="shrink-0 text-sm font-semibold text-white">Inputs</h2>
        <p className="mt-0.5 shrink-0 text-[11px] text-muted">
          Tap to insert at the caret
        </p>
        <div className="mt-2 min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-lg border border-border bg-surface/40 p-2">
          <TokonNotationPalette onPick={onPick} />
        </div>
      </section>
    </aside>
  )
}
