import { useState } from 'react'
import { ArcadeStage } from './ArcadeStage'

const KRILLION_URL = 'https://playdaily.org/krillion'

/**
 * Playdaily Krillion Unlimited in Arcade theater.
 * Site chrome is hidden by the local Tampermonkey "Krillion Theater Mode"
 * script (runs inside the iframe). This wrapper stays full-bleed.
 */
export function Krillion({ onClose }: { onClose: () => void }) {
  const [loading, setLoading] = useState(true)

  return (
    <ArcadeStage
      title="Krillion"
      ariaLabel="Krillion"
      onClose={onClose}
      startInTheater
      meta={
        <a
          href={KRILLION_URL}
          target="_blank"
          rel="noreferrer"
          className="rounded-md border border-border bg-surface px-2 py-1 text-[11px] font-medium text-white hover:border-muted"
        >
          Pop out
        </a>
      }
    >
      {({ immersive }) => (
        <div
          className={[
            'relative mt-3 overflow-hidden rounded-xl border border-border bg-[#091b30]',
            immersive ? 'mt-0 min-h-0 flex-1' : 'h-[min(80vh,860px)]',
          ].join(' ')}
        >
          {loading ? (
            <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-0.5 overflow-hidden">
              <div className="h-full w-1/3 animate-pulse bg-cyan-400/80" />
            </div>
          ) : null}
          <iframe
            title="Krillion Unlimited"
            src={KRILLION_URL}
            className="absolute inset-0 h-full w-full border-0 bg-[#091b30]"
            onLoad={() => setLoading(false)}
            referrerPolicy="no-referrer-when-downgrade"
            allow="clipboard-write; fullscreen; autoplay"
          />
        </div>
      )}
    </ArcadeStage>
  )
}
