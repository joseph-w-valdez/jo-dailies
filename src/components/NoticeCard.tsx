import { useEffect, useState } from 'react'
import { msUntilNextAppMidnight } from '../lib/date'
import {
  NOTICE_CARD_HEIGHT_PX,
  NOTICE_SIDE_PX,
} from '../hooks/useShellLayout'
import {
  noticeCountdownLabel,
  type NoticeCardData,
} from '../lib/notices'

export function NoticeCard({
  eyebrow,
  title,
  body,
  when,
  date,
  image,
  accent = 'bg-surface-raised text-muted',
}: NoticeCardData) {
  const [countdown, setCountdown] = useState(() =>
    date ? noticeCountdownLabel(date) : null,
  )

  useEffect(() => {
    if (!date) {
      setCountdown(null)
      return
    }

    let timeoutId = 0

    const refresh = () => {
      setCountdown(noticeCountdownLabel(date))
      timeoutId = window.setTimeout(refresh, msUntilNextAppMidnight())
    }

    refresh()

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        window.clearTimeout(timeoutId)
        refresh()
      }
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      window.clearTimeout(timeoutId)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [date])

  return (
    <article
      className="relative shrink-0 overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-lg shadow-black/30"
      style={{ width: NOTICE_SIDE_PX, height: NOTICE_CARD_HEIGHT_PX }}
    >
      {image ? (
        <img
          src={image}
          alt=""
          draggable={false}
          className="pointer-events-none absolute inset-0 size-full object-cover object-top"
        />
      ) : null}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/45" />

      <div className="relative flex h-full flex-col justify-between p-6 text-center">
        {eyebrow ? (
          <span
            className={[
              'mx-auto w-fit rounded-md px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] shadow-lg',
              accent,
            ].join(' ')}
          >
            {eyebrow}
          </span>
        ) : (
          <span />
        )}

        <div className="mx-auto w-full max-w-[24rem] space-y-3 pb-2 drop-shadow-lg">
          <h3 className="text-3xl font-black uppercase leading-none tracking-[0.08em] text-white">
            {title}
          </h3>
          <p className="text-sm font-semibold uppercase leading-snug tracking-[0.12em] text-white/90">
            {body}
          </p>
          {when ? (
            <div className="space-y-2">
              <p className="text-3xl font-black uppercase leading-none tracking-wide text-streak">
                {when}
              </p>
              {countdown ? (
                <p
                  className={[
                    'mx-auto w-fit rounded-md px-4 py-1.5 text-sm font-bold uppercase tracking-[0.18em] shadow-lg',
                    accent,
                  ].join(' ')}
                >
                  {countdown}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  )
}
