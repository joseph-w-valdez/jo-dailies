import { useEffect, useMemo, useRef, useState } from 'react'
import { usePetFace } from '../hooks/usePetFace'
import { faceBackgroundImage } from '../lib/petAssets'
import {
  petDragQuote,
  petQuoteDetailed,
  petShakeQuote,
  type PetQuoteResult,
} from '../lib/petQuotes'
import { speakDurationMs, SPEAK_FRAME_MS } from '../lib/petSpeak'
import { PetSprite } from './PetSprite'

/** Soft decorative wallpaper icons (cats + a couple extras). */
export const WALLPAPER_ICONS = [
  '/cats/cat-1.png',
  '/cats/cat-2.png',
  '/cats/cat-3.png',
  '/cats/cat-4.png',
  '/cats/cat-5.png',
  '/cats/cat-6.png',
  '/cats/cat-7.png',
  '/cats/cat-8.png',
  '/cats/cat-9.png',
  '/cats/extra-sage.png',
  '/cats/extra-bulba.png',
] as const

const COUNT = 120
const QUOTE_SHOW_MS = 3_500
const DRAG_THRESHOLD_PX = 30
/** Path length while dragging before a shake protest fires. */
const SHAKE_TRAVEL_PX = 320
/** Pause after drop before the cat starts drifting again. */
const DRIFT_RESUME_MS = 2_000
/** Quiet beat after a held drag protest before the next drag line. */
const DRAG_CYCLE_GAP_MS = 750
/** Quiet beat after a held shake protest before the next shake line. */
const SHAKE_CYCLE_GAP_MS = 1_250
const WALLPAPER_NEEDS = { hungry: false, dirty: false, bored: false } as const

type Floater = {
  id: number
  src: string
  top: string
  size: number
  opacity: number
  rotate: number
  duration: number
  delay: number
  direction: 1 | -1
  drift: number
}

function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function buildFloaters(seed = 42): Floater[] {
  const rand = mulberry32(seed)
  return Array.from({ length: COUNT }, (_, id) => {
    const src = WALLPAPER_ICONS[Math.floor(rand() * WALLPAPER_ICONS.length)]!
    return {
      id,
      src,
      top: `${rand() * 92}%`,
      size: 36 + Math.floor(rand() * 56),
      opacity: 0.1 + rand() * 0.16,
      rotate: -28 + rand() * 56,
      duration: 18 + rand() * 28,
      delay: -rand() * 40,
      direction: (rand() > 0.5 ? 1 : -1) as 1 | -1,
      drift: 8 + rand() * 18,
    }
  })
}

function bumpWiggle(icon: HTMLElement) {
  icon.classList.remove('is-wiggling')
  // Force a reflow so removing/re-adding the class restarts the keyframes.
  void icon.offsetWidth
  icon.classList.add('is-wiggling')
}

/**
 * Map a drop X back onto the infinite drift path so the cat continues from
 * that spot instead of jumping to the start of the keyframes.
 */
function delayForDropX(
  x: number,
  direction: 1 | -1,
  durationSec: number,
): number {
  const vw = window.innerWidth / 100
  const start = (direction === 1 ? -20 : 110) * vw
  const end = (direction === 1 ? 110 : -20) * vw
  const progress = Math.min(1, Math.max(0, (x - start) / (end - start)))
  return -progress * durationSec
}

function clampDrop(x: number, y: number, size: number) {
  const maxX = Math.max(0, window.innerWidth - size)
  const maxY = Math.max(0, window.innerHeight - size)
  return {
    x: Math.min(maxX, Math.max(0, x)),
    y: Math.min(maxY, Math.max(0, y)),
  }
}

function WallpaperCat({
  floater,
  speaking,
  speechKey,
  blocked,
  raised,
  onHoverStart,
  onHoverEnd,
  onSpeak,
  onHoldEnd,
}: {
  floater: Floater
  speaking: PetQuoteResult | null
  speechKey: number
  /** Another cat holds the pointer lock — ignore hits. */
  blocked: boolean
  /** Keep this cat above neighbors while hovered/dragged. */
  raised: boolean
  onHoverStart: () => void
  onHoverEnd: () => void
  onSpeak: (quote: PetQuoteResult, hold: boolean) => void
  /** Release a held drag/shake line so the hide timer can start. */
  onHoldEnd: () => void
}) {
  const quoting = speaking !== null
  const [speakFrame, setSpeakFrame] = useState(0)
  const [mouthSpeaking, setMouthSpeaking] = useState(false)
  // Path overrides after a drag so the cat resumes mid-lane from the drop.
  const [path, setPath] = useState({
    top: floater.top,
    delay: floater.delay,
  })
  const [placed, setPlaced] = useState<{ x: number; y: number } | null>(null)
  const [dragging, setDragging] = useState(false)
  const face = usePetFace({
    species: floater.src,
    speech: quoting,
    // Held protest lines keep their face locked for the whole bubble —
    // no blink flashing back toward idle mid-hold or between cycle beats.
    blink: quoting && speaking?.speech !== 'hold',
    mood: speaking?.mood ?? 'neutral',
    eyes: speaking?.eyes,
    mouth: speaking?.mouth,
    effect: speaking?.effect,
  })
  const resumeTimerRef = useRef(0)
  const cycleTimerRef = useRef(0)
  /** Drop point while the cat waits out its post-drag pause. */
  const parkedRef = useRef<{ x: number; y: number } | null>(null)
  const protestModeRef = useRef<'none' | 'drag' | 'shake'>('none')
  const floaterRef = useRef<HTMLDivElement | null>(null)
  const hoveringRef = useRef(false)
  const quotingRef = useRef(quoting)
  quotingRef.current = quoting
  /** Holds pause across the pointerup → click gap for a tap quote. */
  const tapPauseRef = useRef(false)
  const dragRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    hostX: number
    hostY: number
    lastX: number
    lastY: number
    travel: number
    moved: boolean
  } | null>(null)
  const didDragRef = useRef(false)
  const speakingTextRef = useRef(speaking?.text)
  speakingTextRef.current = speaking?.text
  const onSpeakRef = useRef(onSpeak)
  onSpeakRef.current = onSpeak
  const canAnimateSpeak = face.canSpeak && speaking?.speech !== 'hold'

  /** Pause drift while hovered, held, parked, or mid-quote/wiggle. */
  const syncDriftPlayState = () => {
    const host = floaterRef.current
    if (!host) return
    if (parkedRef.current || placed) {
      host.style.animationPlayState = 'paused'
      return
    }
    const pause =
      hoveringRef.current ||
      tapPauseRef.current ||
      dragRef.current !== null ||
      quotingRef.current
    host.style.animationPlayState = pause ? 'paused' : 'running'
  }

  useEffect(() => {
    return () => {
      window.clearTimeout(resumeTimerRef.current)
      window.clearTimeout(cycleTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (quoting) tapPauseRef.current = false
    syncDriftPlayState()
  }, [quoting, dragging, placed])

  const stopProtestCycle = () => {
    protestModeRef.current = 'none'
    window.clearTimeout(cycleTimerRef.current)
  }

  /** Keep delivering protest lines while the pointer is held. */
  const startProtestCycle = (kind: 'drag' | 'shake') => {
    protestModeRef.current = kind
    window.clearTimeout(cycleTimerRef.current)
    const quote =
      kind === 'drag'
        ? petDragQuote(speakingTextRef.current)
        : petShakeQuote(speakingTextRef.current)
    speakingTextRef.current = quote.text
    onSpeakRef.current(quote, true)
    const holdMs = speakDurationMs(quote.text, QUOTE_SHOW_MS)
    cycleTimerRef.current = window.setTimeout(() => {
      if (protestModeRef.current !== kind) return
      cycleTimerRef.current = window.setTimeout(() => {
        if (protestModeRef.current !== kind) return
        startProtestCycle(kind)
      }, kind === 'shake' ? SHAKE_CYCLE_GAP_MS : DRAG_CYCLE_GAP_MS)
    }, holdMs)
  }

  const parkThenResumeDrift = (drop: { x: number; y: number }) => {
    window.clearTimeout(resumeTimerRef.current)
    parkedRef.current = drop
    setPlaced(drop)
    resumeTimerRef.current = window.setTimeout(() => {
      parkedRef.current = null
      setPath({
        top: `${(drop.y / window.innerHeight) * 100}%`,
        delay: delayForDropX(drop.x, floater.direction, floater.duration),
      })
      setPlaced(null)
      // Play state syncs from quoting/hover after `placed` clears.
    }, DRIFT_RESUME_MS)
  }

  /**
   * A tap that never became a drag. Clearing `placed` here would drop the cat
   * back onto its pre-drag lane, so a still-parked cat just re-arms its wait.
   */
  const settleAfterTap = () => {
    if (parkedRef.current) {
      parkThenResumeDrift(parkedRef.current)
      return
    }
    setPlaced(null)
    // Keep paused through pointerup → click so the quote can take over.
    tapPauseRef.current = true
    syncDriftPlayState()
    window.setTimeout(() => {
      if (quotingRef.current) return
      tapPauseRef.current = false
      syncDriftPlayState()
    }, 500)
  }

  useEffect(() => {
    setSpeakFrame(0)
    if (!quoting || !canAnimateSpeak || !speaking) {
      setMouthSpeaking(false)
      return
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setMouthSpeaking(false)
      return
    }

    setMouthSpeaking(true)
    const stop = window.setTimeout(() => {
      setMouthSpeaking(false)
      setSpeakFrame(0)
    }, speakDurationMs(speaking.text, QUOTE_SHOW_MS))
    const tick = window.setInterval(() => {
      setSpeakFrame((frame) => (frame + 1) % face.speaking.length)
    }, SPEAK_FRAME_MS)
    return () => {
      window.clearTimeout(stop)
      window.clearInterval(tick)
    }
  }, [quoting, canAnimateSpeak, face.speaking.length, speaking])

  const displayFrame =
    mouthSpeaking && canAnimateSpeak
      ? (face.speaking[speakFrame] ?? face.idle)
      : face.idle

  return (
    <div
      ref={floaterRef}
      className="cat-floater pointer-events-none absolute"
      style={{
        top: placed ? `${placed.y}px` : path.top,
        left: placed ? `${placed.x}px` : 0,
        width: floater.size,
        height: floater.size,
        ['--cat-drift' as string]: `${floater.drift}px`,
        animationName: placed
          ? 'none'
          : floater.direction === 1
            ? 'cat-drift-right'
            : 'cat-drift-left',
        animationDuration: `${floater.duration}s`,
        animationDelay: `${path.delay}s`,
        animationTimingFunction: 'linear',
        animationIterationCount: 'infinite',
        transform: placed ? 'none' : undefined,
        // Raised in React style so re-renders don't wipe an imperative z-index.
        zIndex: raised || dragging ? 6 : undefined,
      }}
    >
      {speaking ? (
        <span
          key={speechKey}
          className="pet-care-quote pointer-events-none absolute bottom-[calc(100%+6px)] left-1/2 z-[2] w-max max-w-[10.5rem] -translate-x-1/2 rounded-full border border-border bg-surface px-2.5 py-1 text-center text-[11px] font-medium leading-snug text-muted shadow-lg"
        >
          {speaking.text}
        </span>
      ) : null}
      <div
        className={[
          'cat-wallpaper-icon relative size-full',
          blocked ? 'pointer-events-none' : 'pointer-events-auto',
        ].join(' ')}
        style={{
          opacity: floater.opacity,
          ['--cat-rot' as string]: `${floater.rotate}deg`,
          transform: `rotate(${floater.rotate}deg)`,
          cursor: dragging ? 'grabbing' : 'grab',
          touchAction: 'none',
        }}
        onPointerEnter={(e) => {
          if (blocked) return
          hoveringRef.current = true
          onHoverStart()
          const host = e.currentTarget.parentElement
          if (host) host.style.animationPlayState = 'paused'
          bumpWiggle(e.currentTarget)
        }}
        onPointerLeave={(e) => {
          // Keep the lock while dragging so a neighbor can't steal mid-hold.
          if (dragRef.current) return
          // Swapping idle → PetSprite can fake a leave; stay locked if the
          // cursor is still over this cat.
          const under = document.elementFromPoint(e.clientX, e.clientY)
          if (under && e.currentTarget.contains(under)) return
          hoveringRef.current = false
          onHoverEnd()
          const host = e.currentTarget.parentElement
          if (host) syncDriftPlayState()
        }}
        onPointerDown={(e) => {
          if (e.button !== 0 || blocked) return
          const host = e.currentTarget.parentElement
          if (!host) return
          window.clearTimeout(resumeTimerRef.current)
          const rect = host.getBoundingClientRect()
          host.style.animationPlayState = 'paused'
          hoveringRef.current = true
          onHoverStart()
          dragRef.current = {
            pointerId: e.pointerId,
            startX: e.clientX,
            startY: e.clientY,
            hostX: rect.left,
            hostY: rect.top,
            lastX: e.clientX,
            lastY: e.clientY,
            travel: 0,
            moved: false,
          }
          didDragRef.current = false
          setDragging(true)
          e.currentTarget.setPointerCapture(e.pointerId)
        }}
        onPointerMove={(e) => {
          const drag = dragRef.current
          if (!drag || drag.pointerId !== e.pointerId) return
          const dx = e.clientX - drag.startX
          const dy = e.clientY - drag.startY
          if (!drag.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return

          drag.travel += Math.hypot(
            e.clientX - drag.lastX,
            e.clientY - drag.lastY,
          )
          drag.lastX = e.clientX
          drag.lastY = e.clientY

          if (!drag.moved) {
            drag.moved = true
            didDragRef.current = true
            startProtestCycle('drag')
          }

          setPlaced(clampDrop(drag.hostX + dx, drag.hostY + dy, floater.size))

          // Each shake chunk restarts the shake protest cycle.
          if (drag.travel >= SHAKE_TRAVEL_PX) {
            drag.travel = 0
            bumpWiggle(e.currentTarget)
            startProtestCycle('shake')
          }
        }}
        onPointerUp={(e) => {
          if (dragRef.current?.pointerId !== e.pointerId) return
          const drag = dragRef.current
          dragRef.current = null
          setDragging(false)
          e.currentTarget.releasePointerCapture(e.pointerId)

          if (drag.moved) {
            const drop = clampDrop(
              drag.hostX + (e.clientX - drag.startX),
              drag.hostY + (e.clientY - drag.startY),
              floater.size,
            )
            stopProtestCycle()
            // Stay parked for a beat, then resume mid-path drift.
            parkThenResumeDrift(drop)
            // Face/quote stay until release; only then start the hide timer.
            onHoldEnd()
            // Drop may leave the cursor; unlock unless still over this cat.
            if (!hoveringRef.current) onHoverEnd()
            return
          }

          settleAfterTap()
        }}
        onPointerCancel={(e) => {
          if (dragRef.current?.pointerId !== e.pointerId) return
          const drag = dragRef.current
          dragRef.current = null
          didDragRef.current = false
          setDragging(false)
          if (drag.moved) {
            stopProtestCycle()
            parkThenResumeDrift(
              clampDrop(
                drag.hostX + (e.clientX - drag.startX),
                drag.hostY + (e.clientY - drag.startY),
                floater.size,
              ),
            )
            onHoldEnd()
          } else {
            settleAfterTap()
          }
          hoveringRef.current = false
          onHoverEnd()
        }}
        onClick={(e) => {
          if (didDragRef.current) {
            didDragRef.current = false
            tapPauseRef.current = false
            syncDriftPlayState()
            return
          }
          bumpWiggle(e.currentTarget)
          const host = e.currentTarget.parentElement
          if (host) host.style.animationPlayState = 'paused'
          onSpeak(
            petQuoteDetailed(
              floater.src,
              WALLPAPER_NEEDS,
              speaking?.text,
              'wallpaper',
            ),
            false,
          )
        }}
        onAnimationEnd={(e) => {
          if (e.animationName === 'cat-icon-wiggle') {
            e.currentTarget.classList.remove('is-wiggling')
          }
        }}
      >
        {quoting ? (
          <PetSprite
            frame={displayFrame}
            alt=""
            className="absolute inset-0 size-full"
          />
        ) : (
          <div
            className="absolute inset-0 size-full"
            style={{
              backgroundImage: faceBackgroundImage(face.idle),
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center',
              backgroundSize: 'contain',
            }}
          />
        )}
      </div>
    </div>
  )
}

/** Dense field of icons drifting horizontally across the page. */
export function CatWallpaper() {
  const floaters = useMemo(() => buildFloaters(), [])
  const [speech, setSpeech] = useState<{
    id: number
    quote: PetQuoteResult
    /** Drag/shake lines stay up until the pointer is released. */
    held: boolean
    key: number
  } | null>(null)
  /** While set, only this cat receives pointer hits — neighbors can't steal hover. */
  const [hoverLockId, setHoverLockId] = useState<number | null>(null)

  useEffect(() => {
    if (!speech || speech.held) return
    const hide = window.setTimeout(() => setSpeech(null), QUOTE_SHOW_MS)
    return () => window.clearTimeout(hide)
  }, [speech])

  return (
    // Behind the page content. The dashboard exposes only its empty gutters
    // to pointer events, so cats stay decorative over actual panels.
    <div
      className="cat-wallpaper pointer-events-none fixed inset-0 z-[1] overflow-hidden"
      aria-hidden="true"
    >
      {floaters.map((f) => (
        <WallpaperCat
          key={f.id}
          floater={f}
          speaking={speech?.id === f.id ? speech.quote : null}
          speechKey={speech?.id === f.id ? speech.key : 0}
          blocked={hoverLockId !== null && hoverLockId !== f.id}
          raised={hoverLockId === f.id}
          onHoverStart={() => setHoverLockId(f.id)}
          onHoverEnd={() =>
            setHoverLockId((current) => (current === f.id ? null : current))
          }
          onSpeak={(quote, hold) =>
            setSpeech((prev) => ({
              id: f.id,
              quote,
              held: hold,
              key: (prev?.key ?? 0) + 1,
            }))
          }
          onHoldEnd={() =>
            setSpeech((prev) =>
              prev?.id === f.id && prev.held
                ? { ...prev, held: false }
                : prev,
            )
          }
        />
      ))}
    </div>
  )
}
