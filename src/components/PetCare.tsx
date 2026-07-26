import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useSharedPet } from "../hooks/useSharedPet";
import {
  FURNITURE_ASSETS,
  FURNITURE_CATEGORIES,
  furnitureByCategory,
  getFurnitureAsset,
  MAX_FURNITURE,
  MAX_FURNITURE_SCALE,
  MIN_FURNITURE_SCALE,
  normalizeRotation,
  type FurnitureCategory,
  type PlacedFurniture,
} from "../lib/furniture";
import {
  daysAliveCount,
  moodLabel,
  PET_SPECIES,
  petMood,
  type PetMood,
  type SharedPet,
} from "../lib/pet";
import { petQuote, type PetQuoteNeeds } from "../lib/petQuotes";
import { getRoomSky, type RoomSky } from "../lib/petRoomSky";

const PANEL_COLLAPSE_KEY = 'jo-dailies:pet-panel-collapsed:v1'
const FOOTER_COLLAPSE_KEY = 'jo-dailies:pet-footer-collapsed:v1'
const FURNITURE_COLLAPSE_KEY = 'jo-dailies:furniture-panel-collapsed:v1'
const HATCH_COLLAPSE_KEY = 'jo-dailies:hatch-panel-collapsed:v1'

function loadCollapsed(key: string): boolean {
  try {
    return localStorage.getItem(key) === '1'
  } catch {
    return false
  }
}

function saveCollapsed(key: string, value: boolean) {
  try {
    localStorage.setItem(key, value ? '1' : '0')
  } catch {
    /* ignore */
  }
}

function loadPanelCollapsed(): boolean {
  try {
    return localStorage.getItem(PANEL_COLLAPSE_KEY) === '1'
  } catch {
    return false
  }
}

function savePanelCollapsed(value: boolean) {
  try {
    localStorage.setItem(PANEL_COLLAPSE_KEY, value ? '1' : '0')
  } catch {
    /* ignore */
  }
}

type FooterCollapsedMap = Record<string, boolean>

function loadFooterCollapsed(): FooterCollapsedMap {
  try {
    const raw = localStorage.getItem(FOOTER_COLLAPSE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object') return {}
    return parsed as FooterCollapsedMap
  } catch {
    return {}
  }
}

function saveFooterCollapsed(map: FooterCollapsedMap) {
  try {
    localStorage.setItem(FOOTER_COLLAPSE_KEY, JSON.stringify(map))
  } catch {
    /* ignore */
  }
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 12 12"
      className={[
        "size-3 shrink-0 transition-transform duration-200",
        open ? "rotate-90" : "rotate-0",
      ].join(" ")}
      aria-hidden="true"
    >
      <path
        d="M4 2.5 L8.5 6 L4 9.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function moodClass(mood: PetMood): string {
  switch (mood) {
    case "happy":
      return "pet-care-sprite pet-care-happy";
    case "hungry":
      return "pet-care-sprite pet-care-hungry";
    case "dirty":
      return "pet-care-sprite pet-care-dirty";
    case "neglected":
      return "pet-care-sprite pet-care-neglected";
    case "dead":
      return "pet-care-sprite pet-care-dead";
    default:
      return "pet-care-sprite";
  }
}

interface RoamPosition {
  x: number;
  y: number;
  direction: 1 | -1;
  duration: number;
}

function useRoomSky(): RoomSky {
  const [sky, setSky] = useState(() => getRoomSky());

  useEffect(() => {
    const tick = () => setSky(getRoomSky());
    tick();
    const id = window.setInterval(tick, 60_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return sky;
}

function WanderingPet({
  src,
  name,
  mood,
  index,
  count,
  quoteNeeds,
  valorantStoreDone,
}: {
  src: string;
  name: string;
  mood: PetMood;
  index: number;
  count: number;
  quoteNeeds: PetQuoteNeeds;
  valorantStoreDone: boolean;
}) {
  // Spread pets out a bit horizontally on their initial position
  const initialX = count > 1 ? 12 + (index / Math.max(1, count - 1)) * 56 : 39;
  const [position, setPosition] = useState<RoamPosition>({
    x: initialX,
    y: 52 + (index % 2) * 12,
    direction: index % 2 === 0 ? 1 : -1,
    duration: 1800,
  });
  const timeoutRef = useRef(0);

  useEffect(() => {
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reducedMotion) return;

    let cancelled = false;

    const roam = () => {
      if (cancelled) return;
      setPosition((previous) => {
        const x = 5 + Math.random() * 72;
        const y = 8 + Math.random() * 68;
        return {
          x,
          y,
          direction: x >= previous.x ? 1 : -1,
          duration: 1200 + Math.round(Math.random() * 1600),
        };
      });
      timeoutRef.current = window.setTimeout(
        roam,
        1900 + Math.round(Math.random() * 1700),
      );
    };

    timeoutRef.current = window.setTimeout(
      roam,
      500 + index * 400 + Math.round(Math.random() * 600),
    );
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutRef.current);
    };
  }, [index]);

  const style = {
    left: `${position.x}%`,
    top: `${position.y}%`,
    transitionDuration: `${position.duration}ms`,
    zIndex: 3 + Math.round(position.y),
  } satisfies CSSProperties;

  const width = count >= 3 ? "w-[19%]" : count === 2 ? "w-[21%]" : "w-[23%]";

  // One explicit cycle: show → fade → next. No shared interval + hide race.
  const QUOTE_SHOW_MS = 5_000;
  const QUOTE_FADE_MS = 700;
  const QUOTE_GAP_MS = 1_500; // blank air after fade before the next line
  const [quote, setQuote] = useState(() =>
    petQuote(src, quoteNeeds, undefined, 'room', valorantStoreDone),
  );
  const [quoteShown, setQuoteShown] = useState(true);
  const [quoteKey, setQuoteKey] = useState(0);
  const quoteRef = useRef(quote);
  quoteRef.current = quote;
  const needsRef = useRef(quoteNeeds);
  needsRef.current = quoteNeeds;
  const valorantDoneRef = useRef(valorantStoreDone);
  valorantDoneRef.current = valorantStoreDone;

  useEffect(() => {
    let cancelled = false;
    let timer = 0;

    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        timer = window.setTimeout(resolve, ms);
      });

    const cycle = async () => {
      // Stagger pets so they don't all speak in lockstep.
      await wait(index * 400);
      while (!cancelled) {
        setQuote(
          petQuote(
            src,
            needsRef.current,
            quoteRef.current,
            'room',
            valorantDoneRef.current,
          ),
        );
        setQuoteKey((k) => k + 1);
        setQuoteShown(true);
        await wait(QUOTE_SHOW_MS);
        if (cancelled) break;
        setQuoteShown(false);
        await wait(QUOTE_FADE_MS + QUOTE_GAP_MS);
      }
    };

    void cycle();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [src, index, valorantStoreDone]);

  return (
    <div
      className={`pointer-events-none absolute ${width} transition-[left,top] ease-in-out`}
      style={style}
    >
      <span
        key={quoteKey}
        className="pet-care-quote pointer-events-none absolute -right-1 z-[2] w-max max-w-[10.5rem] rounded-full border border-border bg-surface px-2.5 py-1 text-center text-[11px] font-medium leading-snug text-muted shadow-lg"
        style={{
          bottom: 'calc(88% + 10px)',
          opacity: quoteShown ? 1 : 0,
          transition: `opacity ${QUOTE_FADE_MS}ms ease-out`,
        }}
      >
        {quote}
      </span>
      <div
        className="relative"
        style={{ transform: `scaleX(${position.direction})` }}
      >
        <span className="absolute bottom-0 left-1/2 h-[12%] w-[70%] -translate-x-1/2 rounded-full bg-black/25 blur-sm" />
        <img
          src={src}
          alt={name}
          draggable={false}
          className={[
            "relative aspect-square w-full object-contain drop-shadow-xl",
            moodClass(mood),
          ].join(" ")}
        />
      </div>
    </div>
  );
}

const PUFF_COLOR = '#facc15'

interface PuffParticle {
  left: number
  top: number
  dx: number
  dy: number
  delay: number
  size: number
  color: string
}

/** Dense fine powder: tiny motes spawn across the whole piece and fly outward fast. */
function makePuffParticles(count: number): PuffParticle[] {
  return Array.from({ length: count }, () => {
    // Spawn anywhere over the piece, biased toward the edges for a puff feel.
    const angle = Math.random() * Math.PI * 2
    const spawnR = 20 + Math.sqrt(Math.random()) * 32
    const left = 50 + Math.cos(angle) * spawnR
    const top = 50 + Math.sin(angle) * spawnR
    // Fly radially outward from center.
    const nx = (left - 50) / 50
    const ny = (top - 50) / 50
    const norm = Math.max(0.15, Math.hypot(nx, ny))
    const dist = 55 + Math.random() * 75
    return {
      left,
      top,
      dx: (nx / norm) * dist,
      dy: (ny / norm) * dist,
      // Tight stagger so the powder erupts as dense fast bursts.
      delay: Math.random() * 1150,
      size: 1 + Math.random() * 2,
      color: PUFF_COLOR,
    }
  })
}

function DraggableFurniture({
  item,
  selected,
  placePuff,
  onPuffDone,
  onSelect,
  onMove,
  onFlip,
  onReshape,
  onDelete,
}: {
  item: PlacedFurniture
  selected: boolean
  placePuff?: boolean
  onPuffDone?: () => void
  onSelect: () => void
  onMove: (x: number, y: number) => void
  onFlip: () => void
  onReshape: (rotation: number, scale: number) => void
  onDelete: () => void
}) {
  const asset = getFurnitureAsset(item.assetId)
  const elRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ x: item.x, y: item.y })
  const posRef = useRef(pos)
  const [rotation, setRotation] = useState(item.rotation)
  const rotationRef = useRef(rotation)
  const [scale, setScale] = useState(item.scale)
  const scaleRef = useRef(scale)
  const [dragging, setDragging] = useState(false)
  const [puffPlaying, setPuffPlaying] = useState(false)
  const puffParticles = useMemo(
    () => (placePuff ? makePuffParticles(320) : []),
    [placePuff],
  )
  const dragRef = useRef<{
    pointerId: number
    offsetX: number
    offsetY: number
  } | null>(null)
  const rotateRef = useRef<{
    pointerId: number
    centerX: number
    centerY: number
    startAngle: number
    startRotation: number
  } | null>(null)
  const resizeRef = useRef<{
    pointerId: number
    centerX: number
    centerY: number
    startDistance: number
    startScale: number
  } | null>(null)

  useEffect(() => {
    posRef.current = pos
  }, [pos])

  useEffect(() => {
    rotationRef.current = rotation
  }, [rotation])

  useEffect(() => {
    scaleRef.current = scale
  }, [scale])

  useEffect(() => {
    if (dragRef.current) return
    setPos({ x: item.x, y: item.y })
  }, [item.x, item.y])

  useEffect(() => {
    if (rotateRef.current) return
    setRotation(item.rotation)
  }, [item.rotation])

  useEffect(() => {
    if (resizeRef.current) return
    setScale(item.scale)
  }, [item.scale])

  // Play the placement puff only once the piece is actually on screen.
  useEffect(() => {
    if (!placePuff) return
    const el = elRef.current
    if (!el) return
    let timer: number | undefined
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return
        io.disconnect()
        setPuffPlaying(true)
        timer = window.setTimeout(() => {
          setPuffPlaying(false)
          onPuffDone?.()
        }, 1700)
      },
      { threshold: 0.4 },
    )
    io.observe(el)
    return () => {
      io.disconnect()
      if (timer) window.clearTimeout(timer)
    }
  }, [placePuff, onPuffDone])

  if (!asset) return null

  const pieceCenter = () => {
    const rect = elRef.current?.getBoundingClientRect()
    if (!rect) return null
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
  }

  const clampToRoom = (xPct: number, yPct: number) => {
    const el = elRef.current
    const room = el?.closest('.pet-care-room') as HTMLElement | null
    if (!el || !room) return { x: xPct, y: yPct }
    const roomRect = room.getBoundingClientRect()
    const pieceRect = el.getBoundingClientRect()
    const maxX = Math.max(
      0,
      ((roomRect.width - pieceRect.width) / roomRect.width) * 100,
    )
    const maxY = Math.max(
      0,
      ((roomRect.height - pieceRect.height) / roomRect.height) * 100,
    )
    return {
      x: Math.min(maxX, Math.max(0, xPct)),
      y: Math.min(maxY, Math.max(0, yPct)),
    }
  }

  const showDelete = dragging || selected

  return (
    <div
      ref={elRef}
      role="button"
      tabIndex={0}
      aria-label={`${asset.label}${selected ? ' (selected)' : ''}`}
      onPointerDown={(e) => {
        if (e.button !== 0) return
        e.preventDefault()
        e.stopPropagation()
        onSelect()
        const el = elRef.current
        const room = el?.closest('.pet-care-room') as HTMLElement | null
        if (!el || !room) return
        const pieceRect = el.getBoundingClientRect()
        dragRef.current = {
          pointerId: e.pointerId,
          offsetX: e.clientX - pieceRect.left,
          offsetY: e.clientY - pieceRect.top,
        }
        setDragging(true)
        el.setPointerCapture(e.pointerId)
      }}
      onPointerMove={(e) => {
        const drag = dragRef.current
        if (!drag || drag.pointerId !== e.pointerId) return
        const room = elRef.current?.closest(
          '.pet-care-room',
        ) as HTMLElement | null
        if (!room) return
        const roomRect = room.getBoundingClientRect()
        const next = clampToRoom(
          ((e.clientX - roomRect.left - drag.offsetX) / roomRect.width) * 100,
          ((e.clientY - roomRect.top - drag.offsetY) / roomRect.height) * 100,
        )
        setPos(next)
      }}
      onPointerUp={(e) => {
        const drag = dragRef.current
        if (!drag || drag.pointerId !== e.pointerId) return
        dragRef.current = null
        setDragging(false)
        try {
          elRef.current?.releasePointerCapture(e.pointerId)
        } catch {
          /* ignore */
        }
        onMove(posRef.current.x, posRef.current.y)
      }}
      onPointerCancel={(e) => {
        const drag = dragRef.current
        if (!drag || drag.pointerId !== e.pointerId) return
        dragRef.current = null
        setDragging(false)
        setPos({ x: item.x, y: item.y })
      }}
      className={[
        'absolute touch-none select-none',
        selected || dragging
          ? 'z-[5] ring-2 ring-streak/80 ring-offset-1 ring-offset-transparent'
          : 'z-[2] hover:brightness-110',
      ].join(' ')}
      style={{
        left: `${pos.x}%`,
        top: `${pos.y}%`,
        width: `${asset.width * scale}%`,
        cursor: dragging ? 'grabbing' : 'grab',
      }}
    >
      <img
        src={asset.src}
        alt=""
        draggable={false}
        className="pointer-events-none h-auto w-full object-contain drop-shadow-md"
        style={{
          transform: `rotate(${rotation}deg) scaleX(${item.flipped ? -1 : 1})`,
        }}
      />
      {puffPlaying ? (
        <span
          className="furniture-place-puff pointer-events-none absolute inset-0 z-[4]"
          aria-hidden="true"
        >
          {puffParticles.map((p, i) => (
            <span
              key={i}
              className="furniture-puff-bit"
              style={{
                left: `${p.left}%`,
                top: `${p.top}%`,
                width: `${p.size}px`,
                height: `${p.size}px`,
                margin: `-${p.size / 2}px`,
                background: p.color,
                animationDelay: `${p.delay}ms`,
                ['--px' as string]: `${p.dx}px`,
                ['--py' as string]: `${p.dy}px`,
              }}
            />
          ))}
        </span>
      ) : null}
      {showDelete ? (
        <button
          type="button"
          aria-label={`Flip ${asset.label} horizontally`}
          title="Flip horizontally"
          onPointerDown={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onFlip()
          }}
          className="absolute -left-1 -top-1 z-[6] flex size-6 items-center justify-center rounded-full border-2 border-white/90 bg-sky-500 text-sm font-bold leading-none text-white shadow-md transition hover:bg-sky-400"
        >
          ↔
        </button>
      ) : null}
      {showDelete ? (
        <button
          type="button"
          aria-label={`Delete ${asset.label}`}
          onPointerDown={(e) => {
            e.preventDefault()
            e.stopPropagation()
            dragRef.current = null
            setDragging(false)
            try {
              elRef.current?.releasePointerCapture(e.pointerId)
            } catch {
              /* ignore */
            }
            onDelete()
          }}
          className="absolute -right-1 -top-1 z-[6] flex size-6 items-center justify-center rounded-full border-2 border-white/90 bg-rose-500 text-sm font-bold leading-none text-white shadow-md transition hover:bg-rose-400"
        >
          ×
        </button>
      ) : null}
      {showDelete ? (
        <button
          type="button"
          aria-label={`Rotate ${asset.label}`}
          title="Hold and drag to rotate"
          onPointerDown={(e) => {
            if (e.button !== 0) return
            e.preventDefault()
            e.stopPropagation()
            const center = pieceCenter()
            if (!center) return
            rotateRef.current = {
              pointerId: e.pointerId,
              centerX: center.x,
              centerY: center.y,
              startAngle:
                (Math.atan2(e.clientY - center.y, e.clientX - center.x) *
                  180) /
                Math.PI,
              startRotation: rotationRef.current,
            }
            e.currentTarget.setPointerCapture(e.pointerId)
          }}
          onPointerMove={(e) => {
            const rot = rotateRef.current
            if (!rot || rot.pointerId !== e.pointerId) return
            const angle =
              (Math.atan2(e.clientY - rot.centerY, e.clientX - rot.centerX) *
                180) /
              Math.PI
            setRotation(
              normalizeRotation(rot.startRotation + angle - rot.startAngle),
            )
          }}
          onPointerUp={(e) => {
            const rot = rotateRef.current
            if (!rot || rot.pointerId !== e.pointerId) return
            rotateRef.current = null
            try {
              e.currentTarget.releasePointerCapture(e.pointerId)
            } catch {
              /* ignore */
            }
            onReshape(rotationRef.current, scaleRef.current)
          }}
          onPointerCancel={(e) => {
            const rot = rotateRef.current
            if (!rot || rot.pointerId !== e.pointerId) return
            rotateRef.current = null
            setRotation(item.rotation)
          }}
          className="absolute -bottom-1 -left-1 z-[6] flex size-6 cursor-grab items-center justify-center rounded-full border-2 border-white/90 bg-violet-500 text-sm font-bold leading-none text-white shadow-md transition hover:bg-violet-400 active:cursor-grabbing"
        >
          ↻
        </button>
      ) : null}
      {showDelete ? (
        <button
          type="button"
          aria-label={`Resize ${asset.label}`}
          title="Hold and drag to resize"
          onPointerDown={(e) => {
            if (e.button !== 0) return
            e.preventDefault()
            e.stopPropagation()
            const center = pieceCenter()
            if (!center) return
            const distance = Math.hypot(
              e.clientX - center.x,
              e.clientY - center.y,
            )
            if (distance < 1) return
            resizeRef.current = {
              pointerId: e.pointerId,
              centerX: center.x,
              centerY: center.y,
              startDistance: distance,
              startScale: scaleRef.current,
            }
            e.currentTarget.setPointerCapture(e.pointerId)
          }}
          onPointerMove={(e) => {
            const resize = resizeRef.current
            if (!resize || resize.pointerId !== e.pointerId) return
            const distance = Math.hypot(
              e.clientX - resize.centerX,
              e.clientY - resize.centerY,
            )
            const next = Math.min(
              MAX_FURNITURE_SCALE,
              Math.max(
                MIN_FURNITURE_SCALE,
                resize.startScale * (distance / resize.startDistance),
              ),
            )
            setScale(next)
          }}
          onPointerUp={(e) => {
            const resize = resizeRef.current
            if (!resize || resize.pointerId !== e.pointerId) return
            resizeRef.current = null
            try {
              e.currentTarget.releasePointerCapture(e.pointerId)
            } catch {
              /* ignore */
            }
            onReshape(rotationRef.current, scaleRef.current)
          }}
          onPointerCancel={(e) => {
            const resize = resizeRef.current
            if (!resize || resize.pointerId !== e.pointerId) return
            resizeRef.current = null
            setScale(item.scale)
          }}
          className="absolute -bottom-1 -right-1 z-[6] flex size-6 cursor-nwse-resize items-center justify-center rounded-full border-2 border-white/90 bg-emerald-500 text-sm font-bold leading-none text-white shadow-md transition hover:bg-emerald-400"
        >
          ⤡
        </button>
      ) : null}
    </div>
  )
}

function FurnitureFooter({
  furniture,
  onAdd,
}: {
  furniture: PlacedFurniture[]
  onAdd: (assetId: string) => void
}) {
  const atCap = furniture.length >= MAX_FURNITURE
  const [category, setCategory] = useState<FurnitureCategory | 'all'>('all')
  const [collapsed, setCollapsed] = useState(() =>
    loadCollapsed(FURNITURE_COLLAPSE_KEY),
  )
  const catalog = furnitureByCategory(category)

  useEffect(() => {
    saveCollapsed(FURNITURE_COLLAPSE_KEY, collapsed)
  }, [collapsed])

  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          aria-expanded={!collapsed}
          className="flex min-w-0 items-center gap-2 text-left transition hover:opacity-90"
        >
          <ChevronIcon open={!collapsed} />
          <h3 className="text-sm font-semibold text-white">Add Furniture</h3>
        </button>
        <span className="text-[11px] text-muted tabular-nums">
          {furniture.length}/{MAX_FURNITURE}
        </span>
      </div>

      {collapsed ? null : (
        <>
          <p className="text-sm text-muted">
            Drag pieces around the room. Tap the × on a piece to remove it.
          </p>

          <div className="flex flex-wrap gap-1.5">
            {FURNITURE_CATEGORIES.map((entry) => {
              const active = category === entry.id
              const count =
                entry.id === 'all'
                  ? FURNITURE_ASSETS.length
                  : FURNITURE_ASSETS.filter(
                      (asset) => asset.category === entry.id,
                    ).length
              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => setCategory(entry.id)}
                  className={[
                    'rounded-full border px-2.5 py-1 text-[11px] font-medium transition',
                    active
                      ? 'border-streak bg-streak/10 text-white'
                      : 'border-border bg-surface-raised text-muted hover:border-white/25 hover:text-white',
                  ].join(' ')}
                >
                  {entry.label}
                  <span className="ml-1 tabular-nums opacity-70">{count}</span>
                </button>
              )
            })}
          </div>

          <div className="flex flex-wrap gap-2">
            {catalog.map((asset) => (
              <button
                key={asset.id}
                type="button"
                disabled={atCap}
                onClick={() => onAdd(asset.id)}
                className="flex items-center gap-2 rounded-xl border border-border bg-surface-raised px-3 py-2 text-sm font-medium text-white transition hover:border-white/25 disabled:opacity-40"
                title={atCap ? 'Furniture limit reached' : `Add ${asset.label}`}
              >
                <img
                  src={asset.src}
                  alt=""
                  draggable={false}
                  className="h-8 w-8 object-contain"
                />
                {asset.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function RoomWindow({ sky }: { sky: RoomSky }) {
  const skyStyle = {
    ["--pet-sky-top" as string]: sky.skyTop,
    ["--pet-sky-bottom" as string]: sky.skyBottom,
    ["--pet-celestial-x" as string]: `${sky.celestialX}%`,
    ["--pet-celestial-y" as string]: `${sky.celestialY}%`,
    ["--pet-celestial-glow" as string]: sky.glow,
  } as CSSProperties;

  return (
    <div
      className={[
        "pet-care-window pointer-events-none absolute left-[8%] top-[9%] z-[1] h-[25%] w-[30%] overflow-hidden rounded-xl border-4 border-white/15 shadow-inner",
        sky.isNight ? "pet-care-window-night" : "pet-care-window-day",
      ].join(" ")}
      style={skyStyle}
      data-phase={sky.phase}
    >
      <div className="pet-care-sky absolute inset-0">
        {sky.isNight ? (
          <>
            <span className="pet-care-star absolute left-[18%] top-[22%] size-1 rounded-full bg-white/90" />
            <span className="pet-care-star absolute left-[62%] top-[18%] size-[3px] rounded-full bg-white/80" />
            <span className="pet-care-star absolute left-[40%] top-[48%] size-1 rounded-full bg-white/70" />
            <span className="pet-care-star absolute left-[78%] top-[42%] size-[2px] rounded-full bg-white/85" />
            <span className="pet-care-moon absolute size-[22%] rounded-full" />
          </>
        ) : (
          <span className="pet-care-sun absolute size-[24%] rounded-full" />
        )}
      </div>
      <span className="absolute inset-y-0 left-1/2 z-[1] w-1 -translate-x-1/2 bg-white/15" />
      <span className="absolute inset-x-0 top-1/2 z-[1] h-1 -translate-y-1/2 bg-white/15" />
      <span className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-br from-white/20 via-transparent to-black/10" />
    </div>
  );
}

function HatchForm({
  title,
  description,
  onHatch,
}: {
  title: string;
  description: string;
  onHatch: (species: string, name: string) => void;
}) {
  const [draftName, setDraftName] = useState("");
  const [draftSpecies, setDraftSpecies] = useState<string>(PET_SPECIES[0]!);
  const [collapsed, setCollapsed] = useState(() =>
    loadCollapsed(HATCH_COLLAPSE_KEY),
  );

  useEffect(() => {
    saveCollapsed(HATCH_COLLAPSE_KEY, collapsed);
  }, [collapsed]);

  return (
    <div className="space-y-4 rounded-xl border border-border bg-surface p-4">
      <button
        type="button"
        onClick={() => setCollapsed((value) => !value)}
        aria-expanded={!collapsed}
        className="flex min-w-0 items-center gap-2 text-left transition hover:opacity-90"
      >
        <ChevronIcon open={!collapsed} />
        <h3 className="text-sm font-semibold text-white">{title}</h3>
      </button>

      {collapsed ? null : (
        <>
          <p className="text-sm text-muted">{description}</p>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {PET_SPECIES.map((src) => (
              <button
                key={src}
                type="button"
                onClick={() => setDraftSpecies(src)}
                className={[
                  "rounded-xl border p-2 transition",
                  draftSpecies === src
                    ? "border-streak bg-streak/10"
                    : "border-border bg-surface-raised hover:border-white/25",
                ].join(" ")}
                aria-label={`Choose pet ${src}`}
                aria-pressed={draftSpecies === src}
              >
                <img
                  src={src}
                  alt=""
                  draggable={false}
                  className="mx-auto size-12 object-contain"
                />
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              placeholder="Name (optional)"
              maxLength={24}
              className="min-w-0 flex-1 rounded-xl border border-border bg-surface-raised px-3 py-2 text-sm text-white placeholder:text-muted/70 focus:border-white/25 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => {
                onHatch(draftSpecies, draftName);
                setDraftName("");
              }}
              className="rounded-xl bg-streak px-4 py-2 text-sm font-semibold text-black transition hover:brightness-110"
            >
              Hatch
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function ActionRow({
  label,
  done,
  actionLabel,
  doneLabel,
  onAction,
}: {
  label: ReactNode;
  done: boolean;
  actionLabel: string;
  doneLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="min-w-0 flex-1 text-sm text-muted">{label}</p>
      <button
        type="button"
        onClick={onAction}
        disabled={done}
        className="shrink-0 rounded-xl border border-border bg-surface-raised px-4 py-2 text-sm font-medium text-white transition hover:border-white/25 disabled:opacity-40"
      >
        {done ? doneLabel : actionLabel}
      </button>
    </div>
  );
}

function PetCareFooter({
  pet,
  today,
  onFeed,
  onClean,
  onPlay,
  onRename,
  onDelete,
}: {
  pet: SharedPet
  today: string
  onFeed: () => void
  onClean: () => void
  onPlay: () => void
  onRename: (name: string) => void
  onDelete: () => void
}) {
  const mood = petMood(pet, today)
  const age = daysAliveCount(pet, today)
  const fedToday = pet.lastFedOn === today
  const cleanedToday = pet.lastCleanedOn === today
  const playedToday = pet.lastPlayedOn === today
  const [editing, setEditing] = useState(false)
  const [draftName, setDraftName] = useState(pet.name)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [collapsed, setCollapsed] = useState(
    () => loadFooterCollapsed()[pet.id] === true,
  )

  useEffect(() => {
    if (!editing) setDraftName(pet.name)
  }, [pet.name, editing])

  useEffect(() => {
    const map = loadFooterCollapsed()
    map[pet.id] = collapsed
    saveFooterCollapsed(map)
  }, [collapsed, pet.id])

  const commitRename = () => {
    const next = draftName.trim().slice(0, 24)
    if (next && next !== pet.name) onRename(next)
    setEditing(false)
    setDraftName(next || pet.name)
  }

  const needsCare = !fedToday || !cleanedToday || !playedToday

  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => {
            setCollapsed((v) => {
              const next = !v
              if (next) {
                setEditing(false)
                setConfirmDelete(false)
                setDraftName(pet.name)
              }
              return next
            })
          }}
          aria-expanded={!collapsed}
          className="flex min-w-0 flex-1 items-center gap-2 text-left transition hover:opacity-90"
        >
          <ChevronIcon open={!collapsed} />
          <img
            src={pet.species}
            alt=""
            draggable={false}
            className="size-7 shrink-0 object-contain"
          />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="text-sm font-semibold text-white">{pet.name}</p>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/60">
              {moodLabel(mood)}
              {collapsed && needsCare ? ' · needs care' : ''}
            </p>
          </div>
        </button>
        <p className="shrink-0 text-[11px] text-muted tabular-nums">
          gen {pet.generation} · age {age}d
        </p>
      </div>

      {collapsed ? null : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            {editing ? (
              <form
                className="flex min-w-0 flex-1 flex-wrap items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault()
                  commitRename()
                }}
              >
                <input
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  maxLength={24}
                  autoFocus
                  aria-label={`Rename ${pet.name}`}
                  className="min-w-0 flex-1 rounded-lg border border-border bg-surface-raised px-2 py-1 text-sm font-semibold text-white focus:border-white/25 focus:outline-none"
                />
                <button
                  type="submit"
                  className="rounded-lg border border-border bg-surface-raised px-2.5 py-1 text-xs font-medium text-white transition hover:border-white/25"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false)
                    setDraftName(pet.name)
                  }}
                  className="rounded-lg px-2 py-1 text-xs text-muted transition hover:text-white"
                >
                  Cancel
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setConfirmDelete(false)
                  setEditing(true)
                }}
                className="rounded-lg border border-border bg-surface-raised px-2.5 py-1 text-xs font-medium text-white transition hover:border-white/25"
              >
                Rename
              </button>
            )}
            {confirmDelete ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmDelete(false)
                    onDelete()
                  }}
                  className="rounded-lg border border-rose-400/40 bg-rose-500/15 px-2.5 py-1 text-xs font-medium text-rose-200 transition hover:bg-rose-500/25"
                >
                  Confirm delete
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="rounded-lg px-2 py-1 text-xs text-muted transition hover:text-white"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setEditing(false)
                  setConfirmDelete(true)
                }}
                className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-2.5 py-1 text-xs font-medium text-rose-200 transition hover:border-rose-300/50 hover:bg-rose-500/20"
              >
                Delete
              </button>
            )}
          </div>

          <div className="space-y-2">
            <ActionRow
              done={fedToday}
              actionLabel="Feed"
              doneLabel="Fed"
              onAction={onFeed}
              label={
                fedToday && pet.lastFedBy ? (
                  <>
                    <span className="text-white">{pet.lastFedBy}</span> fed{' '}
                    {pet.name} today
                  </>
                ) : (
                  <>{pet.name} hasn&apos;t been fed today</>
                )
              }
            />
            <ActionRow
              done={cleanedToday}
              actionLabel="Clean"
              doneLabel="Cleaned"
              onAction={onClean}
              label={
                cleanedToday && pet.lastCleanedBy ? (
                  <>
                    <span className="text-white">{pet.lastCleanedBy}</span>{' '}
                    cleaned {pet.name} today
                  </>
                ) : (
                  <>{pet.name} needs a bath today</>
                )
              }
            />
            <ActionRow
              done={playedToday}
              actionLabel="Play"
              doneLabel="Played"
              onAction={onPlay}
              label={
                playedToday && pet.lastPlayedBy ? (
                  <>
                    <span className="text-white">{pet.lastPlayedBy}</span> played
                    with {pet.name} today
                  </>
                ) : (
                  <>{pet.name} wants to play today</>
                )
              }
            />
          </div>
        </>
      )}
    </div>
  )
}

function DeadPetCard({
  pet,
  today,
  onRemove,
}: {
  pet: SharedPet;
  today: string;
  onRemove: () => void;
}) {
  const age = daysAliveCount(pet, today);

  return (
    <div className="mx-auto flex w-full max-w-[44rem] flex-col items-center gap-4 rounded-xl border border-border bg-surface p-4 text-center sm:flex-row sm:text-left">
      <div className="flex w-full flex-col items-center justify-center sm:w-44">
        <img
          src={pet.species}
          alt=""
          draggable={false}
          className={["size-24 object-contain", moodClass("dead")].join(" ")}
        />
        <p className="mt-2 text-base font-bold text-white">{pet.name}</p>
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-rose-300">
          {moodLabel("dead")}
        </p>
      </div>
      <div className="min-w-0 flex-1 space-y-3">
        <p className="text-sm text-muted">
          {pet.name} made it {age} day{age === 1 ? "" : "s"} (gen{" "}
          {pet.generation}). Missed a feed or bath, and the run ended.
        </p>
        <button
          type="button"
          onClick={onRemove}
          className="rounded-xl bg-streak px-4 py-2 text-sm font-semibold text-black transition hover:brightness-110"
        >
          Clear pet
        </button>
      </div>
    </div>
  );
}

export function PetCare({
  valorantStoreDone = false,
}: {
  valorantStoreDone?: boolean
}) {
  const {
    pets,
    furniture,
    today,
    canAddPet,
    maxPets,
    hatch,
    feed,
    clean,
    play,
    remove,
    rename,
    placeFurniture,
    deleteFurniture,
    relocateFurniture,
    mirrorFurniture,
    reshapeFurniture,
  } = useSharedPet();
  const sky = useRoomSky();
  const [selectedFurnitureId, setSelectedFurnitureId] = useState<string | null>(
    null,
  );
  const [placePuffId, setPlacePuffId] = useState<string | null>(null);
  const [panelCollapsed, setPanelCollapsed] = useState(() =>
    loadPanelCollapsed(),
  );

  const alivePets = pets.filter((pet) => pet.status === "alive");
  const deadPets = pets.filter((pet) => pet.status === "dead");

  useEffect(() => {
    savePanelCollapsed(panelCollapsed);
  }, [panelCollapsed]);

  useEffect(() => {
    if (
      selectedFurnitureId &&
      !furniture.some((item) => item.id === selectedFurnitureId)
    ) {
      setSelectedFurnitureId(null);
    }
  }, [furniture, selectedFurnitureId]);

  const handleAddFurniture = (assetId: string) => {
    const id = placeFurniture(assetId);
    if (id) {
      setPlacePuffId(id);
      setSelectedFurnitureId(id);
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-surface-raised p-4">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setPanelCollapsed((v) => !v)}
          aria-expanded={!panelCollapsed}
          className="flex min-w-0 items-center gap-1.5 text-left text-muted transition hover:opacity-90"
        >
          <ChevronIcon open={!panelCollapsed} />
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            Catomagotchi
          </h2>
        </button>
        <span className="shrink-0 text-[11px] text-muted tabular-nums">
          {pets.length}/{maxPets}
        </span>
      </div>

      {panelCollapsed ? null : (
        <div className="mx-auto mt-3 w-full max-w-[44rem] space-y-4">
          <div
            className="pet-care-room relative aspect-square w-full overflow-hidden rounded-2xl border border-border bg-surface shadow-inner"
            onPointerDown={() => setSelectedFurnitureId(null)}
          >
            <RoomWindow sky={sky} />
            {furniture.map((item) => (
              <DraggableFurniture
                key={item.id}
                item={item}
                selected={selectedFurnitureId === item.id}
                placePuff={placePuffId === item.id}
                onPuffDone={() => setPlacePuffId(null)}
                onSelect={() => setSelectedFurnitureId(item.id)}
                onMove={(x, y) => relocateFurniture(item.id, x, y)}
                onFlip={() => mirrorFurniture(item.id)}
                onReshape={(rotation, scale) =>
                  reshapeFurniture(item.id, rotation, scale)
                }
                onDelete={() => {
                  deleteFurniture(item.id)
                  setSelectedFurnitureId(null)
                }}
              />
            ))}
            {alivePets.map((pet, index) => (
              <WanderingPet
                key={`${pet.id}:${pet.generation}:${pet.species}`}
                src={pet.species}
                name={pet.name}
                mood={petMood(pet, today)}
                index={index}
                count={alivePets.length}
                quoteNeeds={{
                  hungry: pet.lastFedOn !== today,
                  dirty: pet.lastCleanedOn !== today,
                  bored: pet.lastPlayedOn !== today,
                }}
                valorantStoreDone={valorantStoreDone}
              />
            ))}
          </div>

          {alivePets.map((pet) => (
            <PetCareFooter
              key={pet.id}
              pet={pet}
              today={today}
              onFeed={() => feed(pet.id)}
              onClean={() => clean(pet.id)}
              onPlay={() => play(pet.id)}
              onRename={(name) => rename(pet.id, name)}
              onDelete={() => remove(pet.id)}
            />
          ))}

          <FurnitureFooter
            furniture={furniture}
            onAdd={handleAddFurniture}
          />

          {deadPets.map((pet) => (
            <DeadPetCard
              key={pet.id}
              pet={pet}
              today={today}
              onRemove={() => remove(pet.id)}
            />
          ))}

          {canAddPet ? (
            <HatchForm
              title={pets.length === 0 ? "Hatch a pet" : "Add another pet"}
              description={
                pets.length === 0
                  ? "Hatch a cat you and Jo will care for together. Feed and clean every day — miss a day and it's gone. Up to 3 pets."
                  : `Room for ${maxPets - pets.length} more. Feed and clean each one every day.`
              }
              onHatch={hatch}
            />
          ) : null}
        </div>
      )}
    </section>
  );
}
