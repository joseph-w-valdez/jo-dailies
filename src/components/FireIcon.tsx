import { useId } from 'react'

export type CalciferMood = 'sleepy' | 'normal' | 'happy' | 'excited' | 'golden'

/** One-shot expressive ticks (quote follow-up / click). */
export type CalciferBurst =
  | 'none'
  | 'blink'
  | 'flick'
  | 'giggle'
  | 'pout'
  | 'smack'
  | 'blush'
  | 'shyPeek'
  | 'sparkle'
  | 'squint'
  | 'surprise'
  | 'smug'
  | 'whoosh'
  | 'bounce'
  | 'flare'
  | 'sputter'
  | 'stretch'
  | 'heart'
  | 'sparks'
  | 'wiggle'
  | 'spinTip'

export const CALCIFER_BURST_MS: Record<CalciferBurst, number> = {
  none: 0,
  blink: 380,
  flick: 420,
  giggle: 620,
  pout: 520,
  smack: 480,
  blush: 2800,
  shyPeek: 650,
  sparkle: 560,
  squint: 500,
  surprise: 580,
  smug: 700,
  whoosh: 520,
  bounce: 560,
  flare: 640,
  sputter: 700,
  stretch: 780,
  heart: 980,
  sparks: 1000,
  wiggle: 550,
  spinTip: 680,
}

interface FireIconProps {
  className?: string
  title?: string
  variant?: 'streak' | 'golden'
  mood?: CalciferMood
  /** Set false for static rendering (legends, tiny calendar marks). */
  animated?: boolean
  /** Offsets animation timing so multiple Calcifers don't move in lockstep. */
  seed?: number
  /** Quote-talk mouth loop (separate from short random bursts). */
  talking?: boolean
  /** One-shot expressive tick. */
  burst?: CalciferBurst
  /** Remount key so the same burst can replay back-to-back. */
  burstKey?: number
}

/**
 * Cute symmetrical fire-spirit mark (Calcifer-inspired, original drawing).
 * Reads clearly at calendar size and in the streak bar.
 */
export function FireIcon({
  className = 'size-4',
  title,
  variant = 'streak',
  mood = variant === 'golden' ? 'golden' : 'normal',
  animated = true,
  seed = 0,
  talking = false,
  burst = 'none',
  burstKey = 0,
}: FireIconProps) {
  const uid = useId().replace(/:/g, '')
  const isGolden = variant === 'golden'
  const isSleepy = mood === 'sleepy'
  const isBright = mood === 'golden' || mood === 'excited'

  const tempo =
    mood === 'sleepy'
      ? { flame: '3.6s', core: '3.2s', blink: '7s' }
      : mood === 'excited'
        ? { flame: '0.9s', core: '1.1s', blink: '3.4s' }
        : mood === 'golden'
          ? { flame: '1.4s', core: '1.6s', blink: '4.6s' }
          : { flame: '2.1s', core: '2.4s', blink: '5.2s' }

  const delay = `${(seed % 5) * 210}ms`
  const anim = (name: string, duration: string) =>
    animated
      ? { animationName: name, animationDuration: duration, animationDelay: delay }
      : undefined

  const flameBurst =
    burst === 'flick' || burst === 'whoosh' || burst === 'sputter' || burst === 'spinTip'
      ? `calcifer-burst-${burst}`
      : ''
  const coreBurst = burst === 'flare' ? 'calcifer-burst-flare' : ''
  const eyesBurst =
    burst === 'blink' ||
    burst === 'shyPeek' ||
    burst === 'sparkle' ||
    burst === 'squint' ||
    burst === 'surprise'
      ? `calcifer-burst-${burst}`
      : ''
  const mouthBurst = talking
    ? 'calcifer-burst-talk'
    : burst === 'giggle' ||
        burst === 'pout' ||
        burst === 'smack' ||
        burst === 'surprise'
      ? `calcifer-burst-${burst === 'surprise' ? 'surprise-mouth' : burst}`
      : ''
  const cheekBurst =
    burst === 'blush' || burst === 'smug' ? `calcifer-burst-${burst}-cheeks` : ''
  const bodyBurst =
    burst === 'bounce' ||
    burst === 'smug' ||
    burst === 'wiggle' ||
    burst === 'stretch'
      ? `calcifer-burst-${burst}`
      : ''

  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
    >
      {title ? <title>{title}</title> : null}

      <g key={burstKey} className={['calcifer-body', bodyBurst].filter(Boolean).join(' ')}>
        <g className={isSleepy ? 'calcifer-sleepy-dim' : undefined}>
        {/* Outer flame body — mirrored twin tips */}
        <path
          className={['calcifer-flame', flameBurst].filter(Boolean).join(' ')}
          style={anim('calcifer-flicker', tempo.flame)}
          fill="currentColor"
          d="M16 2.5c1.2 2.2 2.4 3.6 2.4 5.6 0 .9-.2 1.6-.6 2.3 1.8-1.1 3.4-1.2 4.7.2 1.1 1.2 1.2 3 .4 4.6-.5 1-1.3 1.8-2.2 2.4 2 .3 3.6 1.9 3.6 4.2 0 3.4-3.5 6.2-8.3 6.2S5.3 25.2 5.3 21.8c0-2.3 1.6-3.9 3.6-4.2-.9-.6-1.7-1.4-2.2-2.4-.8-1.6-.7-3.4.4-4.6 1.3-1.4 2.9-1.3 4.7-.2-.4-.7-.6-1.4-.6-2.3 0-2 1.2-3.4 2.4-5.6Z"
        />

        {/* Inner glow core */}
        <g
          className={['calcifer-core', coreBurst].filter(Boolean).join(' ')}
          style={anim('calcifer-core-pulse', tempo.core)}
        >
          <ellipse
            cx="16"
            cy="19.2"
            rx="5.2"
            ry="5.6"
            fill={isGolden ? '#fff7d1' : '#ffe8a3'}
            opacity="0.92"
          />
          <ellipse
            cx="16"
            cy="20"
            rx="3.2"
            ry="3.4"
            fill={isGolden ? '#ffec8a' : '#ffd36a'}
            opacity="0.85"
          />
        </g>

        {isSleepy ? (
          <>
            <path
              d="M10.5 17.7c1.2 1 2.4 1 3.5 0M18 17.7c1.1 1 2.3 1 3.5 0"
              fill="none"
              stroke="#1f2937"
              strokeWidth="1.25"
              strokeLinecap="round"
            />
            <ellipse
              className={['calcifer-mouth', mouthBurst].filter(Boolean).join(' ')}
              style={anim('calcifer-yawn', '4.4s')}
              cx="16"
              cy="21"
              rx="1.2"
              ry="0.7"
              fill="#1f2937"
            />
          </>
        ) : (
          <>
            <g
              className={['calcifer-eyes', eyesBurst].filter(Boolean).join(' ')}
              style={anim('calcifer-blink', tempo.blink)}
            >
              {mood === 'happy' && burst !== 'surprise' && burst !== 'sparkle' ? (
                <path
                  d="M10.6 18.2c.9-1.6 3-1.6 3.9 0M17.5 18.2c.9-1.6 3-1.6 3.9 0"
                  fill="none"
                  stroke="#1f2937"
                  strokeWidth="1.35"
                  strokeLinecap="round"
                />
              ) : (
                <>
                  <ellipse
                    cx="12.6"
                    cy="17.4"
                    rx="2.15"
                    ry={
                      burst === 'surprise' || mood === 'excited' ? '2.75' : '2.4'
                    }
                    fill="#1f2937"
                  />
                  <ellipse
                    cx="19.4"
                    cy="17.4"
                    rx="2.15"
                    ry={
                      burst === 'surprise' || mood === 'excited' ? '2.75' : '2.4'
                    }
                    fill="#1f2937"
                  />
                  <circle
                    className="calcifer-glint"
                    cx="13.2"
                    cy="16.7"
                    r={isBright || burst === 'sparkle' ? '0.9' : '0.7'}
                    fill={mood === 'golden' ? '#fde68a' : '#fff'}
                  />
                  <circle
                    className="calcifer-glint"
                    cx="20"
                    cy="16.7"
                    r={isBright || burst === 'sparkle' ? '0.9' : '0.7'}
                    fill={mood === 'golden' ? '#fde68a' : '#fff'}
                  />
                </>
              )}
            </g>

            {mood === 'excited' || mood === 'golden' || burst === 'surprise' ? (
              <ellipse
                className={['calcifer-mouth', mouthBurst].filter(Boolean).join(' ')}
                style={
                  burst === 'surprise'
                    ? undefined
                    : anim('calcifer-chatter', mood === 'excited' ? '0.7s' : '1.2s')
                }
                cx="16"
                cy="21"
                rx={burst === 'surprise' ? '2' : '1.7'}
                ry={burst === 'surprise' ? '2' : '1.5'}
                fill="#1f2937"
              />
            ) : (
              <path
                className={['calcifer-mouth', mouthBurst].filter(Boolean).join(' ')}
                style={anim('calcifer-smile-wobble', '2.8s')}
                d={
                  mood === 'happy'
                    ? 'M13.9 20.4c.9 1.2 1.7 1.6 2.1 1.6s1.2-.4 2.1-1.6'
                    : 'M14.2 20.6c.7.7 1.5 1 1.8 1s1.1-.3 1.8-1'
                }
                fill="none"
                stroke="#1f2937"
                strokeWidth="0.85"
                strokeLinecap="round"
              />
            )}
          </>
        )}

        {/* Rosy cheeks */}
        <circle
          className={['calcifer-cheek calcifer-cheek-l', cheekBurst]
            .filter(Boolean)
            .join(' ')}
          cx="10.4"
          cy="19.3"
          r={isBright ? '1.25' : '1.05'}
          fill={isGolden ? '#f59e0b' : '#fb923c'}
          opacity={isBright ? '0.6' : '0.45'}
        />
        <circle
          className={['calcifer-cheek calcifer-cheek-r', cheekBurst]
            .filter(Boolean)
            .join(' ')}
          cx="21.6"
          cy="19.3"
          r={isBright ? '1.25' : '1.05'}
          fill={isGolden ? '#f59e0b' : '#fb923c'}
          opacity={isBright ? '0.6' : '0.45'}
        />

        {burst === 'blush' ? (
          <g
            className="calcifer-fx calcifer-burst-blush-lines"
            fill="none"
            stroke="#fb7185"
            strokeWidth="0.85"
            strokeLinecap="round"
          >
            {/* Left under-eye hash marks */}
            <path d="M9.6 19.1l1.1 1.35" />
            <path d="M11.1 19.1l1.1 1.35" />
            <path d="M12.6 19.1l1.1 1.35" />
            {/* Right under-eye hash marks */}
            <path d="M18.3 19.1l1.1 1.35" />
            <path d="M19.8 19.1l1.1 1.35" />
            <path d="M21.3 19.1l1.1 1.35" />
          </g>
        ) : null}

        {burst === 'heart' ? (
          <path
            className="calcifer-fx calcifer-burst-heart"
            fill="#fb7185"
            d="M16 8.2c-.6-1.2-2.2-1.4-3-.4-.7.8-.5 2 .4 2.8L16 13l2.6-2.4c.9-.8 1.1-2 .4-2.8-.8-1-2.4-.8-3 .4Z"
          />
        ) : null}

        {burst === 'sparks' ? (
          <g className="calcifer-fx calcifer-burst-sparks" fill="currentColor">
            <circle className="calcifer-spark s1" cx="11" cy="6" r="1.1" />
            <circle className="calcifer-spark s2" cx="21" cy="5.5" r="0.9" />
            <circle className="calcifer-spark s3" cx="16" cy="3.5" r="0.75" />
          </g>
        ) : null}
        </g>

        {isSleepy && animated ? (
          <g className="calcifer-tears" transform="translate(0 1)" aria-hidden="true">
            <defs>
              <clipPath id={`calcifer-tear-clip-l-${uid}`}>
                <rect x="8.8" y="18" width="7" height="8" rx="1.6" />
              </clipPath>
              <clipPath id={`calcifer-tear-clip-r-${uid}`}>
                <rect x="16.2" y="18" width="7" height="8" rx="1.6" />
              </clipPath>
            </defs>
            <g clipPath={`url(#calcifer-tear-clip-l-${uid})`}>
              <path
                className="calcifer-tear-stream ts-l"
                fill="none"
                stroke="#7dd3fc"
                strokeWidth="2.15"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12.3 16.2C14.2 17.1 10.4 18 12.3 18.9C14.2 19.8 10.4 20.7 12.3 21.6C14.2 22.5 10.4 23.4 12.3 24.3C14.2 25.2 10.4 26.1 12.3 27C14.2 27.9 10.4 28.8 12.3 29.7"
              />
            </g>
            <g clipPath={`url(#calcifer-tear-clip-r-${uid})`}>
              <path
                className="calcifer-tear-stream ts-r"
                fill="none"
                stroke="#bae6fd"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.7 16.2C21.6 17.1 17.8 18 19.7 18.9C21.6 19.8 17.8 20.7 19.7 21.6C21.6 22.5 17.8 23.4 19.7 24.3C21.6 25.2 17.8 26.1 19.7 27C21.6 27.9 17.8 28.8 19.7 29.7"
              />
            </g>
          </g>
        ) : null}
      </g>
    </svg>
  )
}
