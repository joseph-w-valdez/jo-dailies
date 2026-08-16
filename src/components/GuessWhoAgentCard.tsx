import { roleMeta, type ValorantAgent } from '../lib/valorantAgents'

/** Card fills its slot; caps at 140 so the 3-row board can shrink on small viewports. */
export const GW_CARD_MAX_PX = 140
export const GW_CARD_MIN_PX = 72
export const GW_CARD_GAP_PX = 6
export const GW_CARD_BORDER_PX = 6
/** Name + role + single origin — kind line. */
export const GW_INFO_STRIP_PX = 62
/** Reclaim the old second meta line as breathing room above the bust. */
export const GW_PORTRAIT_TOP_PX = 11
export const GW_PORTRAIT_MIN_PX = 48
export const GW_PORTRAIT_RATIO = 5 / 4

export function idealGuessWhoPortraitH(sizePx: number): number {
  return Math.max(0, sizePx - GW_CARD_BORDER_PX) * GW_PORTRAIT_RATIO
}

/** Approximate laid-out height for Html / preview sizing. */
export function guessWhoCardHeightPx(
  sizePx: number,
  portraitH = idealGuessWhoPortraitH(sizePx),
): number {
  return portraitH + GW_PORTRAIT_TOP_PX + GW_INFO_STRIP_PX
}

/**
 * Shared Valorant agent face — pick grid, 3D flaps, and hover preview.
 */
export function GuessWhoAgentCard({
  agent,
  sizePx = GW_CARD_MAX_PX,
  portraitH = idealGuessWhoPortraitH(sizePx),
  flipped,
  selected,
  secret,
  disabled,
  guessArmed,
  blinded,
  interactive = true,
  /** Stretch to parent (flap Html aperture). */
  fill = false,
  onClick,
}: {
  agent: ValorantAgent
  sizePx?: number
  portraitH?: number
  flipped?: boolean
  selected?: boolean
  secret?: boolean
  disabled?: boolean
  guessArmed?: boolean
  /** Phoenix flash — blank orange face. */
  blinded?: boolean
  /** false for preview / Html flaps (div, no hover lift). */
  interactive?: boolean
  fill?: boolean
  onClick?: () => void
}) {
  const theme = roleMeta(agent.role)
  const compact = !fill && sizePx < 120
  const capMax = !fill && sizePx <= GW_CARD_MAX_PX

  const shellClass = [
    'group relative flex flex-col gap-0 overflow-hidden rounded-md border-[3px] text-left shadow-sm transition duration-150',
    fill ? 'h-full w-full' : 'w-full justify-self-center',
    capMax ? 'max-w-[140px]' : '',
    interactive
      ? 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-golden/60'
      : '',
    flipped
      ? 'border-[#1e3a5f]/80 opacity-55'
      : selected
        ? 'border-amber-300 shadow-[0_0_0_2px_rgba(251,191,36,0.45)]'
        : secret
          ? 'border-emerald-400'
          : guessArmed
            ? 'border-rose-400'
            : blinded
              ? 'border-orange-300'
              : 'border-white/90',
    interactive && disabled && !flipped ? 'cursor-not-allowed opacity-50' : '',
    interactive && !disabled && !flipped
      ? 'hover:-translate-y-0.5 hover:shadow-md'
      : '',
  ].join(' ')

  const shellStyle = fill
    ? { width: '100%', height: '100%', maxWidth: 'none' as const }
    : ({
        width: sizePx,
        maxWidth: capMax ? GW_CARD_MAX_PX : sizePx,
      } as const)

  if (blinded) {
    const h = fill ? '100%' : guessWhoCardHeightPx(sizePx, portraitH)
    const flashStyle = {
      ...shellStyle,
      height: h,
      background:
        'linear-gradient(180deg, #fff7ed 0%, #fdba74 45%, #fb923c 100%)',
    } as const
    const flashClass = [shellClass, 'items-center justify-center'].join(' ')
    const mark = <span className="text-6xl font-black text-white/90">?</span>
    if (interactive && onClick) {
      return (
        <button
          type="button"
          disabled={disabled}
          onClick={onClick}
          className={flashClass}
          style={flashStyle}
        >
          {mark}
        </button>
      )
    }
    return (
      <div className={flashClass} style={flashStyle}>
        {mark}
      </div>
    )
  }

  const body = (
    <>
      <div
        className={[
          'relative w-full overflow-hidden',
          fill ? 'min-h-0 flex-1' : 'shrink-0',
        ].join(' ')}
        style={{
          ...(fill
            ? { paddingTop: GW_PORTRAIT_TOP_PX }
            : {
                height: portraitH + GW_PORTRAIT_TOP_PX,
                paddingTop: GW_PORTRAIT_TOP_PX,
              }),
          background: flipped
            ? theme.bar
            : 'linear-gradient(180deg, #cfcfcf 0%, #ffffff 6%, #ffffff 94%, #cfcfcf 100%)',
        }}
      >
        <img
          src={agent.icon}
          alt=""
          className={[
            'absolute inset-x-0 bottom-0 h-[108%] w-full origin-bottom object-contain object-bottom transition duration-200',
            'scale-[1.08]',
            flipped
              ? 'opacity-25 grayscale'
              : interactive
                ? 'group-hover:scale-[1.12]'
                : '',
          ].join(' ')}
          draggable={false}
          loading="lazy"
        />
        {secret && !flipped ? (
          <span className="absolute left-1 top-1 z-[1] rounded bg-emerald-500 px-1 py-px text-[8px] font-bold tracking-wide text-white shadow">
            YOU
          </span>
        ) : null}
        {flipped ? (
          <span
            className="absolute inset-0 z-[1] flex items-center justify-center text-2xl font-black text-white/35"
            style={{ backgroundColor: `${theme.bar}b3` }}
          >
            ?
          </span>
        ) : null}
      </div>

      <div
        className={compact ? 'shrink-0 px-0.5 py-1' : 'shrink-0 px-1 py-1.5'}
        style={{ backgroundColor: theme.bar }}
      >
        <div
          className={[
            'truncate text-center font-bold uppercase tracking-wide',
            compact ? 'text-[9px]' : 'text-[11px] sm:text-xs',
          ].join(' ')}
          style={{ color: '#ffffff' }}
        >
          {agent.name}
        </div>
        <div className="mt-0.5 flex items-center justify-center gap-1">
          <img
            src={theme.icon}
            alt=""
            className="size-3 shrink-0 object-contain opacity-95"
            draggable={false}
          />
          <span
            className="truncate text-[8px] font-semibold uppercase tracking-wider"
            style={{ color: theme.accent }}
          >
            {agent.role}
          </span>
        </div>
        <div
          className={[
            'border-t border-white/15',
            compact ? 'mt-0.5 pt-0.5' : 'mt-1 pt-1',
          ].join(' ')}
        >
          <div
            className="truncate text-center text-[8px] leading-tight"
            style={{ color: '#ffffff' }}
          >
            {agent.origin} — {agent.kind}
          </div>
        </div>
      </div>
    </>
  )

  if (interactive && onClick) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        style={shellStyle}
        className={shellClass}
      >
        {body}
      </button>
    )
  }

  return (
    <div style={shellStyle} className={shellClass}>
      {body}
    </div>
  )
}
