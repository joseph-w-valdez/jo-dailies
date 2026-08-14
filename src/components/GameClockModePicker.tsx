import { useEffect, useState } from 'react'
import {
  parseClockControl,
  type ClockControl,
  type ClockPreset,
} from '../lib/gameClock'

const choiceClass =
  'rounded-xl border border-border bg-surface/80 px-4 py-8 text-left hover:border-muted'

export function useClockNow(running: boolean): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [running])
  return now
}

/** Wordle-style picker: I Touch Grass vs Sweaty, then time control. */
export function GameClockSetupPicker({
  presets,
  customPlaceholder,
  onGrass,
  onSweaty,
}: {
  presets: ClockPreset[]
  customPlaceholder: string
  onGrass: () => void
  onSweaty: (control: ClockControl) => void
}) {
  const [sweaty, setSweaty] = useState(false)
  if (!sweaty) {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <button type="button" onClick={onGrass} className={choiceClass}>
          <span className="block font-semibold text-white">I Touch Grass</span>
          <span className="mt-1 block text-xs text-muted">
            No clock — take as long as you like.
          </span>
        </button>
        <button
          type="button"
          onClick={() => setSweaty(true)}
          className={choiceClass}
        >
          <span className="block font-semibold text-white">Sweaty</span>
          <span className="mt-1 block text-xs text-muted">
            A clock. Flag and you lose.
          </span>
        </button>
      </div>
    )
  }
  return (
    <GameClockTimePicker
      presets={presets}
      customPlaceholder={customPlaceholder}
      onBack={() => setSweaty(false)}
      onPick={onSweaty}
    />
  )
}

function GameClockTimePicker({
  presets,
  customPlaceholder,
  onBack,
  onPick,
}: {
  presets: ClockPreset[]
  customPlaceholder: string
  onBack: () => void
  onPick: (control: ClockControl) => void
}) {
  const [custom, setCustom] = useState('')
  const [invalid, setInvalid] = useState(false)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="text-xs text-muted hover:text-white"
        >
          ← Back
        </button>
        <p className="text-xs text-muted">Sweaty · time control</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {presets.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => onPick(preset)}
            className={choiceClass}
          >
            <span className="block font-semibold text-white">{preset.label}</span>
            <span className="mt-1 block text-xs text-muted">{preset.blurb}</span>
          </button>
        ))}
      </div>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          const parsed = parseClockControl(custom)
          if (!parsed) {
            setInvalid(true)
            return
          }
          onPick(parsed)
        }}
      >
        <input
          value={custom}
          onChange={(e) => {
            setCustom(e.target.value)
            setInvalid(false)
          }}
          placeholder={customPlaceholder}
          className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-white"
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={!custom.trim()}
          className="rounded-lg border border-emerald-500/55 bg-emerald-500/20 px-3 py-2 text-sm text-app-text disabled:opacity-40"
        >
          Start
        </button>
      </form>
      <p
        className={[
          'text-center text-xs',
          invalid ? 'text-rose-300' : 'text-muted',
        ].join(' ')}
      >
        {invalid
          ? 'Try minutes, or chess-style 3+2.'
          : 'Custom: minutes, or minutes+increment (seconds).'}
      </p>
    </div>
  )
}

export function GameClockReadout({
  ms,
  active,
}: {
  ms: number
  active?: boolean
}) {
  const low = ms <= 30_000
  return (
    <span
      className={[
        'tabular-nums font-semibold',
        low ? 'text-rose-300' : active ? 'text-golden' : 'text-white/80',
      ].join(' ')}
    >
      {formatClockDisplay(ms)}
    </span>
  )
}

function formatClockDisplay(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}
