import type { SharedWordLengthMode } from '../lib/wordBank'

type LengthMode = Extract<SharedWordLengthMode, 'standard' | 'variable'>

const choiceClass =
  'rounded-xl border border-border bg-surface/80 px-4 py-8 text-left hover:border-muted'

export function WordGameModePicker({
  onCoop,
  onVersus,
  coopBlurb,
  versusBlurb,
}: {
  onCoop: () => void
  onVersus: () => void
  coopBlurb: string
  versusBlurb: string
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <button type="button" onClick={onCoop} className={choiceClass}>
        <span className="block font-semibold text-white">Co-op</span>
        <span className="mt-1 block text-xs text-muted">{coopBlurb}</span>
      </button>
      <button type="button" onClick={onVersus} className={choiceClass}>
        <span className="block font-semibold text-white">Versus</span>
        <span className="mt-1 block text-xs text-muted">{versusBlurb}</span>
      </button>
    </div>
  )
}

export function WordGameLengthPicker({
  modeLabel,
  onStandard,
  onVariable,
}: {
  modeLabel: string
  onStandard: () => void
  onVariable: () => void
}) {
  return (
    <div className="space-y-3">
      <p className="text-center text-xs text-muted">{modeLabel} · word length</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <button type="button" onClick={onStandard} className={choiceClass}>
          <span className="block font-semibold text-white">Standard</span>
          <span className="mt-1 block text-xs text-muted">
            Classic 5-letter words.
          </span>
        </button>
        <button type="button" onClick={onVariable} className={choiceClass}>
          <span className="block font-semibold text-white">Variable</span>
          <span className="mt-1 block text-xs text-muted">
            Valorant terms — any length.
          </span>
        </button>
      </div>
    </div>
  )
}

export function WordGameSecretSetup({
  otherName,
  lengthMode,
  submitted,
  draft,
  onDraftChange,
  onLock,
  canLock,
  maxLen,
}: {
  otherName: string
  lengthMode: LengthMode
  submitted: boolean
  draft: string
  onDraftChange: (value: string) => void
  onLock: () => void
  canLock: boolean
  maxLen: number
}) {
  return (
    <div className="mx-auto max-w-sm space-y-3 rounded-xl border border-border bg-surface/60 p-4">
      <p className="text-sm text-muted">
        Secret word for {otherName} (they won’t see it)
        {lengthMode === 'standard'
          ? ' — 5 letters:'
          : ' — any length (Valorant ok):'}
      </p>
      {submitted ? (
        <p className="text-sm text-emerald-300">Word locked in. Waiting…</p>
      ) : (
        <>
          <input
            value={draft}
            onChange={(e) =>
              onDraftChange(
                e.target.value
                  .toLowerCase()
                  .replace(/[^a-z]/g, '')
                  .slice(0, maxLen),
              )
            }
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-center text-lg uppercase tracking-[0.2em] text-white"
            placeholder={lengthMode === 'standard' ? '_____' : 'e.g. killjoy'}
          />
          <button
            type="button"
            disabled={!canLock}
            onClick={onLock}
            className="w-full rounded-lg border border-emerald-500/55 bg-emerald-500/20 px-3 py-2 text-sm text-app-text disabled:opacity-40"
          >
            Lock word
          </button>
        </>
      )}
    </div>
  )
}
