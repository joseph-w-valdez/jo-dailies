import {
  TOKON_NOTATION,
  isNotationToken,
  type TokonNotationTokenId,
} from '../data/tokonNotation'

export function TokonNotationChip({
  tokenId,
  size = 'md',
}: {
  tokenId: string
  size?: 'sm' | 'md'
}) {
  if (!isNotationToken(tokenId)) {
    return (
      <span className="rounded border border-border bg-surface px-1 text-[10px] text-muted">
        {tokenId}
      </span>
    )
  }

  const def = TOKON_NOTATION[tokenId as TokonNotationTokenId]
  const imgClass = size === 'sm' ? 'h-5 w-auto' : 'h-6 w-auto'

  if (def.src) {
    return (
      <img
        src={def.src}
        alt={def.label}
        title={def.label}
        className={['inline-block shrink-0', imgClass].join(' ')}
        loading="lazy"
      />
    )
  }

  const textClass =
    def.kind === 'flow'
      ? 'border-sky-400/45 bg-sky-500/15 text-sky-100'
      : def.kind === 'modifier'
        ? 'border-violet-400/45 bg-violet-500/15 text-violet-100'
        : 'border-border bg-surface text-white'

  return (
    <span
      className={[
        'inline-flex shrink-0 items-center justify-center rounded border font-mono font-semibold',
        textClass,
        size === 'sm' ? 'min-w-[1.25rem] px-1 text-[10px]' : 'min-w-[1.5rem] px-1.5 text-xs',
        def.label.length > 4 ? 'px-1.5' : '',
      ].join(' ')}
      title={def.label}
    >
      {def.label}
    </span>
  )
}

export function TokonNotationSequence({
  sequence,
  size = 'md',
}: {
  sequence: string[]
  size?: 'sm' | 'md'
}) {
  if (sequence.length === 0) {
    return <span className="text-xs italic text-muted">Empty sequence</span>
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-0.5">
      {sequence.map((tokenId, index) => (
        <TokonNotationChip key={`${tokenId}-${index}`} tokenId={tokenId} size={size} />
      ))}
    </span>
  )
}
