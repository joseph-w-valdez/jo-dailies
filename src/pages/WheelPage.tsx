import { useEffect, useMemo, useRef, useState } from 'react'
import { ArcadeStatus } from '../components/ArcadeStage'
import { CatWallpaper } from '../components/CatWallpaper'
import { GoldenConfetti } from '../components/GoldenConfetti'
import { useSharedWheel } from '../hooks/useSharedWheel'
import {
  activeWheelEntries,
  buildWheelSegments,
  createWheelEntry,
  formatWeight,
  newWheelSpinId,
  normalizeWeight,
  pickWeightedIndex,
  rotationForWinner,
  wheelLabelPose,
  wheelSlicePath,
  titleCaseLabel,
  WHEEL_COLORS,
  WHEEL_QUICK_ADDS,
  WHEEL_WEIGHT_MAX,
  WHEEL_WEIGHT_MIN,
  WHEEL_WEIGHT_SLIDER_MAX,
  WHEEL_WEIGHT_STEP,
  type WheelEntry,
} from '../lib/wheel'

const SPIN_MS = 4800
const CONFETTI_MS = 4500
/** How long the winner highlight / status sticks before resetting to Ready. */
const OUTCOME_HOLD_MS = 15_000
const CX = 160
const CY = 160
const RADIUS = 148

function OptionColorButton({
  color,
  label,
  disabled,
  onChange,
}: {
  color: string
  label: string
  disabled?: boolean
  onChange: (color: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => inputRef.current?.click()}
      className="relative size-3.5 shrink-0 rounded-full ring-1 ring-white/25 transition hover:ring-white/50 disabled:cursor-not-allowed disabled:opacity-40"
      style={{ backgroundColor: color }}
      title="Change color"
      aria-label={`Color for ${label}`}
    >
      <input
        ref={inputRef}
        type="color"
        value={/^#[0-9a-fA-F]{6}$/.test(color) ? color : '#888888'}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        onClick={(event) => event.stopPropagation()}
        className="pointer-events-none absolute inset-0 size-full cursor-pointer opacity-0"
        tabIndex={-1}
        aria-hidden
      />
    </button>
  )
}

function WeightControl({
  label,
  weight,
  onChange,
  disabled = false,
}: {
  label: string
  weight: number
  onChange: (weight: number) => void
  disabled?: boolean
}) {
  const [draft, setDraft] = useState(() => formatWeight(weight))
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    if (!editing) setDraft(formatWeight(weight))
  }, [weight, editing])

  const sliderValue = Math.min(
    WHEEL_WEIGHT_SLIDER_MAX,
    Math.max(WHEEL_WEIGHT_MIN, weight),
  )

  const commitDraft = () => {
    setEditing(false)
    if (draft.trim() === '' || !Number.isFinite(Number(draft))) {
      setDraft(formatWeight(weight))
      return
    }
    onChange(normalizeWeight(draft))
  }

  return (
    <div className="mt-1.5 flex items-center gap-2 pl-5">
      <input
        type="range"
        min={WHEEL_WEIGHT_MIN}
        max={WHEEL_WEIGHT_SLIDER_MAX}
        step={WHEEL_WEIGHT_STEP}
        value={sliderValue}
        disabled={disabled}
        onChange={(event) => {
          const next = normalizeWeight(event.target.value)
          setDraft(formatWeight(next))
          onChange(next)
        }}
        className="wheel-weight-slider min-w-0 flex-1 disabled:cursor-not-allowed disabled:opacity-40"
        aria-label={`Weight slider for ${label}`}
      />
      <input
        type="text"
        inputMode="decimal"
        value={editing ? draft : formatWeight(weight)}
        disabled={disabled}
        onFocus={() => {
          setEditing(true)
          setDraft(formatWeight(weight))
        }}
        onChange={(event) => {
          const raw = event.target.value
          if (raw !== '' && !/^\d*\.?\d*$/.test(raw)) return
          setDraft(raw)
          if (raw !== '' && Number.isFinite(Number(raw)) && Number(raw) > 0) {
            onChange(normalizeWeight(raw))
          }
        }}
        onBlur={commitDraft}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            ;(event.target as HTMLInputElement).blur()
          }
        }}
        title={`Weight (${WHEEL_WEIGHT_MIN}–${WHEEL_WEIGHT_MAX})`}
        className="w-12 shrink-0 rounded-md border border-border bg-surface px-1.5 py-1 text-center text-xs text-white focus:border-muted focus:outline-none disabled:cursor-not-allowed disabled:opacity-40"
        aria-label={`Weight for ${label}`}
      />
    </div>
  )
}

export function WheelPage() {
  const { wheel, ready, commitWheel } = useSharedWheel()
  const entries = wheel.entries
  const [draft, setDraft] = useState('')
  const [rotation, setRotation] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [announce, setAnnounce] = useState(false)
  const [celebrating, setCelebrating] = useState(false)
  const spinTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const confettiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const outcomeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rotationRef = useRef(0)
  rotationRef.current = rotation
  const seenSpinIdRef = useRef<string | null>(null)
  const localSpinIdRef = useRef<string | null>(null)
  const hydratedRef = useRef(false)

  useEffect(() => {
    return () => {
      if (spinTimerRef.current) clearTimeout(spinTimerRef.current)
      if (confettiTimerRef.current) clearTimeout(confettiTimerRef.current)
      if (outcomeTimerRef.current) clearTimeout(outcomeTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (!ready || spinning) return
    setRotation(wheel.rotation)
  }, [ready, wheel.rotation, spinning])

  useEffect(() => {
    if (!ready) return

    const playCelebrate = () => {
      setCelebrating(true)
      if (confettiTimerRef.current) clearTimeout(confettiTimerRef.current)
      confettiTimerRef.current = setTimeout(() => {
        setCelebrating(false)
        confettiTimerRef.current = null
      }, CONFETTI_MS)
    }

    if (!wheel.spinId) {
      seenSpinIdRef.current = null
      if (!spinning) setAnnounce(false)
      hydratedRef.current = true
      return
    }

    if (wheel.spinId === seenSpinIdRef.current) return
    seenSpinIdRef.current = wheel.spinId

    // First snapshot after load: show winner quietly, no confetti replay.
    if (!hydratedRef.current) {
      hydratedRef.current = true
      setAnnounce(Boolean(wheel.winnerId))
      setRotation(wheel.rotation)
      return
    }

    // We authored this spin — local timer already handles celebrate.
    if (localSpinIdRef.current === wheel.spinId) {
      setAnnounce(Boolean(wheel.winnerId))
      return
    }

    // Peer spun: animate to their final rotation, then celebrate.
    setAnnounce(false)
    setCelebrating(false)
    setSpinning(true)
    setRotation(wheel.rotation)
    if (spinTimerRef.current) clearTimeout(spinTimerRef.current)
    spinTimerRef.current = setTimeout(() => {
      setSpinning(false)
      setAnnounce(Boolean(wheel.winnerId))
      playCelebrate()
      spinTimerRef.current = null
    }, SPIN_MS)
  }, [ready, wheel.spinId, wheel.winnerId, wheel.rotation, spinning])

  // After a finish, drop the winner highlight and shared outcome so the wheel
  // returns to Ready for the next spin. Scoped to this spinId so a late timer
  // cannot clobber a newer spin or an edit that already cleared outcome.
  useEffect(() => {
    if (!ready || spinning || !announce || !wheel.winnerId || !wheel.spinId) {
      return
    }
    const spinIdAtSchedule = wheel.spinId
    if (outcomeTimerRef.current) clearTimeout(outcomeTimerRef.current)
    outcomeTimerRef.current = setTimeout(() => {
      outcomeTimerRef.current = null
      setAnnounce(false)
      setCelebrating(false)
      localSpinIdRef.current = null
      if (seenSpinIdRef.current === spinIdAtSchedule) {
        seenSpinIdRef.current = null
      }
      if (confettiTimerRef.current) {
        clearTimeout(confettiTimerRef.current)
        confettiTimerRef.current = null
      }
      void commitWheel((prev) => {
        if (prev.spinId !== spinIdAtSchedule) return prev
        return { ...prev, winnerId: null, spinId: null }
      })
    }, OUTCOME_HOLD_MS)
    return () => {
      if (outcomeTimerRef.current) {
        clearTimeout(outcomeTimerRef.current)
        outcomeTimerRef.current = null
      }
    }
  }, [ready, spinning, announce, wheel.winnerId, wheel.spinId, commitWheel])

  const segments = useMemo(() => buildWheelSegments(entries), [entries])
  const canSpin = ready && segments.length > 0 && !spinning
  const winnerId = announce ? wheel.winnerId : null

  const clearOutcome = () => {
    setAnnounce(false)
    setCelebrating(false)
    setSpinning(false)
    localSpinIdRef.current = null
    if (spinTimerRef.current) {
      clearTimeout(spinTimerRef.current)
      spinTimerRef.current = null
    }
    if (confettiTimerRef.current) {
      clearTimeout(confettiTimerRef.current)
      confettiTimerRef.current = null
    }
    if (outcomeTimerRef.current) {
      clearTimeout(outcomeTimerRef.current)
      outcomeTimerRef.current = null
    }
  }

  const setEntries = (
    next: WheelEntry[] | ((prev: WheelEntry[]) => WheelEntry[]),
  ) => {
    void commitWheel((prev) => {
      const entriesNext = typeof next === 'function' ? next(prev.entries) : next
      return {
        ...prev,
        entries: entriesNext,
        winnerId: null,
        spinId: null,
      }
    })
    seenSpinIdRef.current = null
  }

  const addEntry = (rawLabel?: string) => {
    if (spinning) return
    const label = (rawLabel ?? draft).trim()
    if (!label) return
    const color = WHEEL_COLORS[entries.length % WHEEL_COLORS.length]!
    clearOutcome()
    setEntries((prev) => [...prev, createWheelEntry(label, { color })])
    if (rawLabel == null) setDraft('')
  }

  const updateEntry = (id: string, patch: Partial<WheelEntry>) => {
    if (spinning) return
    clearOutcome()
    setEntries((prev) =>
      prev.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)),
    )
  }

  const removeEntry = (id: string) => {
    if (spinning) return
    clearOutcome()
    setEntries((prev) => prev.filter((entry) => entry.id !== id))
  }

  const spin = () => {
    if (!canSpin) return
    const winnerIndex = pickWeightedIndex(entries)
    if (winnerIndex < 0) return
    const winner = activeWheelEntries(entries)[winnerIndex]
    if (!winner) return
    const nextRotation = rotationForWinner(
      rotationRef.current,
      segments,
      winnerIndex,
    )
    const spinId = newWheelSpinId()
    localSpinIdRef.current = spinId
    seenSpinIdRef.current = spinId
    setAnnounce(false)
    setCelebrating(false)
    setSpinning(true)
    setRotation(nextRotation)
    void commitWheel((prev) => ({
      ...prev,
      rotation: nextRotation,
      winnerId: winner.id,
      spinId,
    }))
    if (spinTimerRef.current) clearTimeout(spinTimerRef.current)
    spinTimerRef.current = setTimeout(() => {
      setSpinning(false)
      setAnnounce(true)
      setCelebrating(true)
      if (confettiTimerRef.current) clearTimeout(confettiTimerRef.current)
      confettiTimerRef.current = setTimeout(() => {
        setCelebrating(false)
        confettiTimerRef.current = null
      }, CONFETTI_MS)
      spinTimerRef.current = null
    }, SPIN_MS)
  }

  const winnerLabel =
    winnerId != null
      ? (entries.find((e) => e.id === winnerId)?.label ?? null)
      : null
  const statusLabel = !ready
    ? 'Syncing…'
    : spinning
      ? 'Spinning…'
      : winnerLabel
        ? `Winner — ${winnerLabel}`
        : segments.length === 0
          ? 'Add options'
          : 'Ready'

  return (
    <>
      <CatWallpaper />
      {celebrating ? (
        <GoldenConfetti
          rainCats
          winnerLabel={
            winnerId
              ? (entries.find((e) => e.id === winnerId)?.label ?? null)
              : null
          }
        />
      ) : null}
      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <div className="rounded-2xl border border-border bg-surface-raised p-4 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.8)] sm:p-5">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h1 className="truncate text-lg font-semibold text-white">Wheel</h1>
            <ArcadeStatus tone={winnerLabel ? 'win' : 'ready'}>
              {statusLabel}
            </ArcadeStatus>
          </div>

          <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
            <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-surface/60 p-4 sm:p-5">
              <div className="relative aspect-square w-full max-w-[36rem]">
                <svg
                  viewBox="0 0 320 320"
                  className="h-full w-full drop-shadow-[0_12px_28px_rgba(0,0,0,0.35)]"
                  aria-hidden
                >
                  <g
                    style={{
                      transform: `rotate(${rotation}deg)`,
                      transformOrigin: `${CX}px ${CY}px`,
                      transition: spinning
                        ? `transform ${SPIN_MS}ms cubic-bezier(0.12, 0.75, 0.12, 1)`
                        : undefined,
                    }}
                  >
                    {segments.length === 0 ? (
                      <circle
                        cx={CX}
                        cy={CY}
                        r={RADIUS}
                        className="fill-surface-raised stroke-border"
                        strokeWidth={2}
                      />
                    ) : (
                      segments.map((seg) => {
                        const pose = wheelLabelPose(
                          CX,
                          CY,
                          RADIUS,
                          seg.startDeg,
                          seg.endDeg,
                        )
                        const span = seg.endDeg - seg.startDeg
                        const showLabel = span >= 18
                        const isWinner =
                          Boolean(winnerId) &&
                          announce &&
                          !spinning &&
                          seg.entry.id === winnerId
                        const dimOthers =
                          Boolean(winnerId) && announce && !spinning && !isWinner
                        return (
                          <g
                            key={seg.entry.id}
                            className={isWinner ? 'wheel-winner-slice' : undefined}
                            opacity={dimOthers ? 0.38 : 1}
                          >
                            <path
                              d={wheelSlicePath(
                                CX,
                                CY,
                                RADIUS,
                                seg.startDeg,
                                seg.endDeg,
                              )}
                              fill={seg.entry.color}
                              stroke={
                                isWinner
                                  ? 'rgba(251,191,36,0.95)'
                                  : 'rgba(0,0,0,0.35)'
                              }
                              strokeWidth={isWinner ? 3 : 1}
                            />
                            {showLabel ? (
                              <text
                                x={pose.x}
                                y={pose.y}
                                fill="white"
                                fontSize={
                                  isWinner
                                    ? span > 40
                                      ? 15
                                      : 13
                                    : span > 40
                                      ? 13
                                      : 11
                                }
                                fontWeight={700}
                                textAnchor="middle"
                                dominantBaseline="middle"
                                transform={`rotate(${pose.angle}, ${pose.x}, ${pose.y})`}
                                style={{
                                  paintOrder: 'stroke',
                                  stroke: isWinner
                                    ? 'rgba(0,0,0,0.65)'
                                    : 'rgba(0,0,0,0.45)',
                                  strokeWidth: isWinner ? 4 : 3,
                                }}
                              >
                                {seg.entry.label.length > 18
                                  ? `${seg.entry.label.slice(0, 16)}…`
                                  : seg.entry.label}
                              </text>
                            ) : null}
                          </g>
                        )
                      })
                    )}
                    <circle
                      cx={CX}
                      cy={CY}
                      r={RADIUS}
                      fill="none"
                      stroke="rgba(255,255,255,0.12)"
                      strokeWidth={3}
                    />
                  </g>
                </svg>
                <div
                  className={[
                    'group/spin absolute left-1/2 top-1/2 z-20 size-[4.25rem] -translate-x-1/2 -translate-y-1/2',
                    spinning ? 'pointer-events-none' : '',
                  ].join(' ')}
                >
                  {/* Pointer tucked under the spin button’s right edge */}
                  <div
                    aria-hidden
                    className={[
                      'pointer-events-none absolute left-full top-1/2 z-0 -translate-y-1/2 -translate-x-[0.65rem] text-[var(--color-surface-raised)] transition-colors duration-150',
                      spinning
                        ? ''
                        : 'group-hover/spin:text-[color-mix(in_oklab,var(--color-surface-raised)_72%,var(--color-app-text))]',
                    ].join(' ')}
                  >
                    <svg
                      width="29"
                      height="32"
                      viewBox="0 0 20 22"
                      className="block"
                    >
                      <path d="M20 11 L0 0 L0 22 Z" fill="currentColor" />
                    </svg>
                  </div>
                  <button
                    type="button"
                    onClick={spin}
                    disabled={!canSpin}
                    className={[
                      'relative z-10 size-full rounded-full bg-surface-raised text-sm font-bold tracking-wide text-white shadow-lg transition-colors duration-150',
                      !canSpin && !spinning
                        ? 'cursor-not-allowed opacity-40'
                        : '',
                      spinning
                        ? ''
                        : 'group-hover/spin:bg-[color-mix(in_oklab,var(--color-surface-raised)_72%,var(--color-app-text))]',
                    ].join(' ')}
                  >
                    SPIN
                  </button>
                </div>
              </div>
              {segments.length === 0 ? (
                <p className="text-center text-sm text-muted">
                  Add at least one enabled option to spin.
                </p>
              ) : null}
            </div>

            <section
              className={[
                'rounded-xl border border-border bg-surface/60 p-3.5',
                spinning ? 'opacity-70' : '',
              ].join(' ')}
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-white">
                  Options [{entries.length}]
                </h2>
                <button
                  type="button"
                  disabled={spinning || entries.length === 0}
                  onClick={() => {
                    clearOutcome()
                    setEntries([])
                  }}
                  className="text-[11px] text-muted hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Clear all
                </button>
              </div>

              {spinning ? (
                <p className="mt-2 text-[11px] text-muted">
                  Options locked while spinning…
                </p>
              ) : null}

              <div className="mt-3 flex flex-wrap gap-1.5">
                {WHEEL_QUICK_ADDS.map((label) => (
                  <button
                    key={label}
                    type="button"
                    disabled={spinning}
                    onClick={() => addEntry(label)}
                    className="rounded-full border border-border bg-surface-raised px-2.5 py-1 text-[11px] font-medium text-white hover:border-muted disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    + {label}
                  </button>
                ))}
              </div>

              <div className="mt-3 flex gap-2">
                <input
                  value={draft}
                  disabled={spinning}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      addEntry()
                    }
                  }}
                  placeholder="Add an option…"
                  className="min-w-0 flex-1 rounded-lg border border-border bg-surface-raised px-2.5 py-1.5 text-sm text-white placeholder:text-muted focus:border-muted focus:outline-none disabled:cursor-not-allowed disabled:opacity-40"
                />
                <button
                  type="button"
                  onClick={() => addEntry()}
                  disabled={spinning || !draft.trim()}
                  className="rounded-lg border border-border bg-surface-raised px-2.5 py-1.5 text-sm font-medium text-white hover:border-muted disabled:opacity-40"
                >
                  Add
                </button>
              </div>

              <ul className="mt-3 max-h-[28rem] space-y-2 overflow-y-auto pr-0.5">
                {entries.map((entry) => (
                  <li
                    key={entry.id}
                    className={[
                      'rounded-xl border border-border bg-surface-raised/80 px-2.5 py-2',
                      entry.enabled ? '' : 'opacity-50',
                    ].join(' ')}
                  >
                    <div className="flex items-center gap-2">
                      <OptionColorButton
                        color={entry.color}
                        label={entry.label}
                        disabled={spinning}
                        onChange={(next) =>
                          updateEntry(entry.id, { color: next })
                        }
                      />
                      <input
                        value={entry.label}
                        disabled={spinning}
                        onChange={(event) =>
                          updateEntry(entry.id, { label: event.target.value })
                        }
                        onBlur={(event) =>
                          updateEntry(entry.id, {
                            label: titleCaseLabel(event.target.value),
                          })
                        }
                        className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1 py-0.5 text-sm text-white focus:border-border focus:outline-none disabled:cursor-not-allowed"
                        aria-label="Option label"
                      />
                      <button
                        type="button"
                        role="switch"
                        aria-checked={entry.enabled}
                        disabled={spinning}
                        onClick={() =>
                          updateEntry(entry.id, { enabled: !entry.enabled })
                        }
                        className={[
                          'relative h-5 w-8 shrink-0 rounded-full transition disabled:cursor-not-allowed',
                          entry.enabled ? 'bg-emerald-500/70' : 'bg-border',
                        ].join(' ')}
                        title={entry.enabled ? 'Enabled' : 'Disabled'}
                      >
                        <span
                          className={[
                            'absolute top-0.5 size-4 rounded-full bg-white transition',
                            entry.enabled ? 'left-3.5' : 'left-0.5',
                          ].join(' ')}
                        />
                      </button>
                      <button
                        type="button"
                        disabled={spinning}
                        onClick={() => removeEntry(entry.id)}
                        className="shrink-0 rounded-md px-1.5 py-1 text-xs text-muted hover:text-rose-200 disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label={`Remove ${entry.label}`}
                      >
                        ✕
                      </button>
                    </div>
                    <WeightControl
                      label={entry.label}
                      weight={entry.weight}
                      disabled={spinning}
                      onChange={(weight) => updateEntry(entry.id, { weight })}
                    />
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      </div>
    </>
  )
}
