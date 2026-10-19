import { useState } from 'react'
import { ArcadeStage } from './ArcadeStage'

const KRILLION_URL = 'https://playdaily.org/krillion'

/**
 * Playdaily Krillion Unlimited in Arcade theater (parked — the tile opens
 * Playdaily in a new tab instead; see `externalUrl` in src/arcade.ts).
 *
 * This wrapper stays full-bleed. Playdaily's site chrome can't be hidden from
 * here (cross-origin iframe), so it relies on the userscript below. It must be
 * installed in a userscript extension (Tampermonkey, Violentmonkey, …) on
 * each browser — it does nothing as part of this app. With it installed it
 * applies both inside this iframe and when Krillion is opened directly.
 *
 * ```js
 * // ==UserScript==
 * // @name         Krillion Theater Mode
 * // @namespace    http://tampermonkey.net/
 * // @version      1.3
 * // @description  Expand Krillion to fill the browser viewport
 * // @match        https://playdaily.org/krillion*
 * // @run-at       document-idle
 * // @grant        none
 * // ==/UserScript==
 *
 * (function () {
 *   "use strict";
 *
 *   const css = `
 *     html, body {
 *       margin: 0 !important;
 *       overflow: hidden !important;
 *       background: #091b30 !important;
 *     }
 *
 *     [data-game-viewport] {
 *       position: fixed !important;
 *       inset: 0 !important;
 *       z-index: 2147483647 !important;
 *       width: 100vw !important;
 *       height: 100dvh !important;
 *       max-width: none !important;
 *       max-height: none !important;
 *       margin: 0 !important;
 *       padding: 0 !important;
 *       display: flex !important;
 *       flex-direction: column !important;
 *       overflow: hidden !important;
 *       background: #091b30 !important;
 *     }
 *
 *     [data-game-viewport] > header {
 *       display: none !important;
 *     }
 *
 *     [data-game-viewport] > div {
 *       width: 100% !important;
 *       max-width: none !important;
 *       height: 100% !important;
 *       min-height: 0 !important;
 *       margin: 0 !important;
 *       padding: 0 !important;
 *       flex: 1 1 0% !important;
 *       display: flex !important;
 *       flex-direction: column !important;
 *     }
 *
 *     [data-game-viewport] .unlimited.krillion {
 *       width: 100% !important;
 *       max-width: none !important;
 *       height: 100% !important;
 *       min-height: 0 !important;
 *       flex: 1 1 0% !important;
 *       border-radius: 0 !important;
 *     }
 *   `;
 *
 *   const style = document.createElement("style");
 *   style.id = "krillion-theater-styles";
 *   style.textContent = css;
 *   (document.head || document.documentElement).appendChild(style);
 * })();
 * ```
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
