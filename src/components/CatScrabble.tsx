import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { useSharedScrabble } from "../hooks/useSharedScrabble";
import {
  applyExchange,
  applyPass,
  applyPlay,
  applyBust,
  applyCatBurglar,
  applyBlankStare,
  applyShelfCheck,
  applyMeowtiply,
  beginPeekAPaw,
  finishPeekAPaw,
  shuffleRack,
  cellIndex,
  checkWords,
  DICTIONARY_ATTRIBUTION,
  letterValue,
  premiumAt,
  previewPlayWords,
  flagScrabbleOnTime,
  selectScrabbleClockMode,
  selectScrabbleFirst,
  SCRABBLE_SIZE,
  type Placement,
  type Premium,
  type ScrabbleSkillId,
  type ScrabbleTile,
} from "../lib/scrabble";
import { liveClockMs, SCRABBLE_CLOCK_PRESETS } from "../lib/gameClock";
import { JENGA_PLAYER_UIDS, nextTurnUid } from "../lib/jenga";
import { petIdleSrc } from "../lib/petAssets";
import { ArcadeStage, ArcadeStatus } from "./ArcadeStage";
import { TurnPushToggle } from "./TurnPushToggle";
import {
  GameClockReadout,
  GameClockSetupPicker,
  useClockNow,
} from "./GameClockModePicker";
import { NewGameConfirm } from "./NewGameConfirm";
import { GameSeatPicker } from "./GameSeatPicker";

interface DraftCell {
  row: number;
  col: number;
  tile: ScrabbleTile;
  chosenLetter?: string;
}

function premiumClass(p: Premium): string {
  switch (p) {
    case "TW":
      return "bg-rose-700/80 text-pink-200";
    case "DW":
    case "★":
      return "bg-rose-400/70 text-rose-950";
    case "TL":
      return "bg-sky-700/80 text-sky-100";
    case "DL":
      return "bg-sky-400/60 text-sky-950";
    default:
      return "bg-board-cell text-muted/50";
  }
}

function premiumLabel(p: Premium): string {
  if (p === "★") return "★";
  return p ?? "";
}

function TileFace({
  letter,
  blank,
  selected,
  small,
  sizePx,
  recallHint,
}: {
  letter: string;
  blank?: boolean;
  selected?: boolean;
  small?: boolean;
  /** Immersive rack — match board cell size when set. */
  sizePx?: number;
  /** Draft slot on the rack — tap to pull the tile back off the board. */
  recallHint?: boolean;
}) {
  const points = letterValue(letter, Boolean(blank));
  const sized = sizePx != null && sizePx > 0;
  return (
    <span
      className={[
        "relative inline-flex items-center justify-center rounded-md border font-semibold shadow-sm",
        sized
          ? ""
          : small
            ? "h-7 w-7 text-xs"
            : "h-9 w-9 text-sm",
        recallHint
          ? blank
            ? "border-dashed border-rose-700/45 bg-amber-900/70 text-amber-100/70"
            : "border-amber-900/45 bg-amber-900/65 text-amber-100/65"
          : blank
            ? "border-dashed border-amber-700/50 bg-amber-50/90 text-amber-900"
            : "border-amber-800/30 bg-[#f3e6c8] text-amber-950",
        selected ? "ring-2 ring-golden" : "",
      ].join(" ")}
      style={
        sized
          ? {
              width: sizePx,
              height: sizePx,
              fontSize: `${Math.max(11, Math.floor(sizePx * 0.48))}px`,
            }
          : undefined
      }
    >
      <span className="leading-none">{letter || (blank ? "?" : "")}</span>
      <span
        className={[
          "absolute bottom-[0.06em] right-[0.08em] text-[0.42em] font-bold tabular-nums leading-none",
          recallHint ? "text-amber-100/45" : "text-amber-950/70",
        ].join(" ")}
        aria-hidden
      >
        {points}
      </span>
      {recallHint ? (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-[0.92em] w-[0.92em] text-rose-500 drop-shadow-[0_1px_1px_rgba(0,0,0,0.55)]"
            style={{ width: "2.55em", height: "2.55em" }}
          >
            <path
              d="M5 5l14 14M19 5L5 19"
              fill="none"
              stroke="currentColor"
              strokeWidth="3.25"
              strokeLinecap="round"
            />
          </svg>
        </span>
      ) : null}
    </span>
  );
}

function seatLabel(id: string, viewerUid: string, hotseat: boolean): string {
  const seat = JENGA_PLAYER_UIDS.indexOf(
    id as (typeof JENGA_PLAYER_UIDS)[number],
  );
  if (hotseat) return seat === 0 ? "P1" : "P2";
  if (id === viewerUid) return "You";
  return seat === 0 ? "P1" : "P2";
}

function moveHeadline(entry: {
  kind: string;
  words: string[];
  note?: string;
}): string {
  if (entry.kind === "pass") return "Pass";
  if (entry.kind === "exchange") return "Exchange";
  if (entry.kind === "skill") return entry.note ?? "Skill";
  if (entry.kind === "bust") {
    return entry.note ?? `Tried ${entry.words.join(", ")} — not a word`;
  }
  if (entry.kind === "newGame") return "New game";
  if (entry.words.length === 0) return "Play";
  return entry.words.join(", ");
}

function moveCardClass(kind: string): string {
  switch (kind) {
    case "bust":
      return "border-rose-400/30 bg-rose-500/10";
    case "pass":
      return "border-border bg-surface-raised";
    case "exchange":
      return "border-sky-400/25 bg-sky-500/10";
    case "skill":
      return "border-violet-400/25 bg-violet-500/10";
    case "play":
      return "border-emerald-400/25 bg-emerald-500/10";
    default:
      return "border-border bg-surface";
  }
}

const SCRABBLE_MOVE_CATS = [
  "/cats/cat-1.png",
  "/cats/cat-2.png",
  "/cats/cat-3.png",
  "/cats/cat-4.png",
  "/cats/cat-5.png",
  "/cats/cat-6.png",
  "/cats/cat-7.png",
  "/cats/cat-8.png",
  "/cats/cat-9.png",
  "/cats/extra-sage.png",
  "/cats/extra-bulba.png",
] as const;

function catForEntry(at: number, uid: string): string {
  const seed = `${at}-${uid}`
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);

  return petIdleSrc(SCRABBLE_MOVE_CATS[seed % SCRABBLE_MOVE_CATS.length]!);
}

function wiggleDelay(at: number, uid: string): number {
  const seed = `${uid}-${at}`
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);

  return seed % 900;
}

const SKILL_BUTTONS: {
  id: ScrabbleSkillId;
  label: string;
  title: string;
  cls: string;
}[] = [
  {
    id: "catBurglar",
    label: "Cat Burglar",
    title: "Steal a vowel from opponent’s rack",
    cls: "border-amber-500/55 bg-amber-500/20 text-app-text hover:bg-amber-500/30",
  },
  {
    id: "blankStare",
    label: "Blank Stare",
    title: "Turn one of your tiles into a blank",
    cls: "border-zinc-400/55 bg-zinc-500/20 text-app-text hover:bg-zinc-500/30",
  },
  {
    id: "shelfCheck",
    label: "Shelf Check",
    title: "Knock a random tile off opponent’s rack into the bag",
    cls: "border-orange-500/55 bg-orange-500/20 text-app-text hover:bg-orange-500/30",
  },
  {
    id: "peekAPaw",
    label: "Peek-a-Paw",
    title: "Peek at bag tiles and swap one onto your rack",
    cls: "border-sky-500/55 bg-sky-500/20 text-app-text hover:bg-sky-500/30",
  },
  {
    id: "meowtiply",
    label: "Meowtiply",
    title: "Your next valid play scores ×3",
    cls: "border-fuchsia-500/55 bg-fuchsia-500/20 text-app-text hover:bg-fuchsia-500/30",
  },
];

function newGameScoreLine(
  finals: Record<string, number> | undefined,
  viewerUid: string,
  hotseat: boolean,
): string {
  return JENGA_PLAYER_UIDS.map((id) => {
    const label = seatLabel(id, viewerUid, hotseat);
    return `${label} ${finals?.[id] ?? 0}`;
  }).join(" · ");
}

const SIDEBAR_STORAGE_KEY = "jo-dailies:scrabble-theater-sidebar:v1";
const SIDEBAR_DEFAULT_PX = 320;
const SIDEBAR_MIN_PX = 180;
const HANDLE_PX = 8;
const PLAY_GAP_PX = 12;
/** Reserved height for score/moves when theater stacks on phones. */
const STACKED_SIDEBAR_H = 200;
const BOARD_MIN_PX = 140;
const TILE_DRAG_THRESHOLD = 6;

/** Narrow phones or short landscape — board above sidebar. */
function useScrabbleStackedLayout(): boolean {
  const [stacked, setStacked] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(
      "(max-width: 639px), (max-height: 520px)",
    ).matches;
  });

  useEffect(() => {
    const mq = window.matchMedia(
      "(max-width: 639px), (max-height: 520px)",
    );
    const sync = () => setStacked(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return stacked;
}

function promptBlankLetter(): string | null {
  const raw = window.prompt("Letter for blank tile?", "A");
  if (!raw) return null;
  const ch = raw.trim().toUpperCase().slice(0, 1);
  if (!/^[A-Z]$/.test(ch)) return null;
  return ch;
}

function cellAtPoint(
  clientX: number,
  clientY: number,
): { row: number; col: number } | null {
  for (const el of document.elementsFromPoint(clientX, clientY)) {
    if (!(el instanceof HTMLElement)) continue;
    const row = el.dataset.scrabbleRow;
    const col = el.dataset.scrabbleCol;
    if (row == null || col == null) continue;
    const r = Number(row);
    const c = Number(col);
    if (
      Number.isInteger(r) &&
      Number.isInteger(c) &&
      r >= 0 &&
      r < SCRABBLE_SIZE &&
      c >= 0 &&
      c < SCRABBLE_SIZE
    ) {
      return { row: r, col: c };
    }
  }
  return null;
}

function pointOverRack(clientX: number, clientY: number): boolean {
  for (const el of document.elementsFromPoint(clientX, clientY)) {
    if (el instanceof HTMLElement && el.dataset.scrabbleRack === "1") {
      return true;
    }
  }
  return false;
}

function readSidebarWidth(): number {
  try {
    const n = Number(localStorage.getItem(SIDEBAR_STORAGE_KEY));
    if (Number.isFinite(n) && n >= SIDEBAR_MIN_PX) return Math.round(n);
  } catch {
    /* ignore */
  }
  return SIDEBAR_DEFAULT_PX;
}

function writeSidebarWidth(px: number) {
  try {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, String(px));
  } catch {
    /* ignore */
  }
}

/** Largest square that fits with rack (+ stacked sidebar in theater). */
function useTheaterBoardPx(
  enabled: boolean,
  stacked: boolean,
  rowRef: RefObject<HTMLDivElement | null>,
  rackRef: RefObject<HTMLDivElement | null>,
  sidebarWidth: number,
): { boardPx: number | null; sideRack: boolean; rackTilePx: number | null } {
  const [px, setPx] = useState<number | null>(null);
  const [sideRack, setSideRack] = useState(false);
  const [rackTilePx, setRackTilePx] = useState<number | null>(null);

  useEffect(() => {
    if (!enabled) {
      setPx(null);
      setSideRack(false);
      setRackTilePx(null);
      return;
    }
    const row = rowRef.current;
    if (!row) return;

    const measure = () => {
      const rackH = rackRef.current?.offsetHeight ?? 72;
      let availableH: number;
      let availableW: number;
      let nextSide = false;
      let nextRackTile: number | null = null;
      if (stacked) {
        availableW = row.clientWidth;
        availableH =
          row.clientHeight - rackH - STACKED_SIDEBAR_H - PLAY_GAP_PX * 2;
      } else {
        availableW =
          row.clientWidth - sidebarWidth - HANDLE_PX - PLAY_GAP_PX;
        // Prefer full-height board; dock rack in the leftover left gutter
        // when that gutter can hold cell-sized tiles (keeps board centered).
        const fullH = row.clientHeight - PLAY_GAP_PX;
        const candidate = Math.max(
          BOARD_MIN_PX,
          Math.floor(Math.min(fullH, availableW)),
        );
        const packW = candidate + sidebarWidth + HANDLE_PX + PLAY_GAP_PX;
        const leftGutter = Math.max(0, (row.clientWidth - packW) / 2);
        const cell = candidate / SCRABBLE_SIZE;
        nextSide = leftGutter >= Math.max(44, cell * 0.9);
        availableH = nextSide
          ? fullH
          : row.clientHeight - rackH - PLAY_GAP_PX;
      }
      const next = Math.max(
        BOARD_MIN_PX,
        Math.floor(Math.min(availableH, availableW)),
      );
      const cell = next / SCRABBLE_SIZE;
      if (!stacked) {
        if (nextSide) {
          const packW = next + sidebarWidth + HANDLE_PX + PLAY_GAP_PX;
          const leftGutter = Math.max(0, (row.clientWidth - packW) / 2);
          nextRackTile = Math.max(
            Math.round(cell),
            Math.min(Math.round(cell * 1.25), Math.floor(leftGutter - 12)),
          );
        } else {
          // Under-board rack: at least match board cells.
          nextRackTile = Math.max(28, Math.round(cell));
        }
      }
      setPx((prev) => (prev === next ? prev : next));
      setSideRack((prev) => (prev === nextSide ? prev : nextSide));
      setRackTilePx((prev) => (prev === nextRackTile ? prev : nextRackTile));
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(row);
    const rack = rackRef.current;
    if (rack) ro.observe(rack);
    return () => ro.disconnect();
  }, [enabled, stacked, rowRef, rackRef, sidebarWidth]);

  return {
    boardPx: enabled ? px : null,
    sideRack: enabled ? sideRack : false,
    rackTilePx: enabled ? rackTilePx : null,
  };
}

function TheaterPlayRow({
  immersive,
  stacked,
  children,
}: {
  immersive: boolean;
  stacked: boolean;
  children: (ctx: {
    boardPx: number | null;
    sideRack: boolean;
    rackTilePx: number | null;
    rowRef: RefObject<HTMLDivElement | null>;
    rackRef: RefObject<HTMLDivElement | null>;
    sidebarWidth: number;
    setSidebarWidth: (px: number) => void;
    onResizePointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
    stacked: boolean;
  }) => ReactNode;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const rackRef = useRef<HTMLDivElement>(null);
  const [sidebarWidth, setSidebarWidth] = useState(readSidebarWidth);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startWidth: number;
  } | null>(null);
  const { boardPx, sideRack, rackTilePx } = useTheaterBoardPx(
    immersive,
    stacked,
    rowRef,
    rackRef,
    sidebarWidth,
  );

  useEffect(() => {
    if (!immersive) return;
    writeSidebarWidth(sidebarWidth);
  }, [immersive, sidebarWidth]);

  const clampSidebar = (px: number) => {
    const row = rowRef.current;
    const maxWidth = row
      ? Math.max(
          SIDEBAR_MIN_PX,
          row.clientWidth - 200 - HANDLE_PX - PLAY_GAP_PX,
        )
      : 640;
    return Math.round(Math.min(maxWidth, Math.max(SIDEBAR_MIN_PX, px)));
  };

  const onResizePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!immersive || stacked) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startWidth: sidebarWidth,
    };
  };

  useEffect(() => {
    if (!immersive || stacked) return;

    const onMove = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      const row = rowRef.current;
      const maxWidth = row
        ? Math.max(
            SIDEBAR_MIN_PX,
            row.clientWidth - 200 - HANDLE_PX - PLAY_GAP_PX,
          )
        : 640;
      // Dragging the handle left widens the sidebar; right narrows it.
      const next = Math.round(
        Math.min(
          maxWidth,
          Math.max(
            SIDEBAR_MIN_PX,
            drag.startWidth - (event.clientX - drag.startX),
          ),
        ),
      );
      setSidebarWidth(next);
    };

    const onUp = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      dragRef.current = null;
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [immersive, stacked]);

  return children({
    boardPx,
    sideRack,
    rackTilePx,
    rowRef,
    rackRef,
    sidebarWidth,
    setSidebarWidth: (px) => setSidebarWidth(clampSidebar(px)),
    onResizePointerDown,
    stacked,
  });
}

export function CatScrabble({ onClose }: { onClose: () => void }) {
  const { game, ready, uid, actorUid, myRack, canAct, commitGame, resetGame } =
    useSharedScrabble();
  const stacked = useScrabbleStackedLayout();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftCell[]>([]);
  const [exchangeMode, setExchangeMode] = useState(false);
  const [exchangeIds, setExchangeIds] = useState<Set<string>>(new Set());
  const [blankStareMode, setBlankStareMode] = useState(false);
  const [peekKeepId, setPeekKeepId] = useState<string | null>(null);
  const [peekSwapId, setPeekSwapId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [newGameOpen, setNewGameOpen] = useState(false);
  const [draggingTileId, setDraggingTileId] = useState<string | null>(null);
  const [hoverCell, setHoverCell] = useState<{
    row: number;
    col: number;
  } | null>(null);
  const [hoverRack, setHoverRack] = useState(false);

  const boardRef = useRef<HTMLDivElement>(null);
  const ghostRef = useRef<HTMLDivElement>(null);
  const suppressClickRef = useRef(false);
  const tileDragRef = useRef<{
    source: "rack" | "board";
    tile: ScrabbleTile;
    chosenLetter?: string;
    pointerId: number;
    startX: number;
    startY: number;
    lastX: number;
    lastY: number;
    dragging: boolean;
    alreadySelected: boolean;
  } | null>(null);

  useEffect(() => {
    setDraft([]);
    setSelectedId(null);
    setExchangeMode(false);
    setExchangeIds(new Set());
    setBlankStareMode(false);
    setMessage(null);
    setDraggingTileId(null);
    setHoverCell(null);
    setHoverRack(false);
    tileDragRef.current = null;
  }, [game.roundId]);

  // Off-turn practice draft returns to the rack when the turn flips — opponent
  // may have covered cells or stolen tiles, so start the real turn clean.
  useEffect(() => {
    setDraft([]);
    setExchangeMode(false);
    setExchangeIds(new Set());
    setBlankStareMode(false);
    setSelectedId(null);
    setMessage(null);
    setDraggingTileId(null);
    setHoverCell(null);
    setHoverRack(false);
    tileDragRef.current = null;
  }, [game.turnUid]);

  // Also prune mid-wait if a skill steals a tile or fills a cell without
  // flipping the turn (shouldn't normally happen on a play, but be safe).
  useEffect(() => {
    const rackIds = new Set(myRack.map((t) => t.id));
    setDraft((prev) => {
      const next = prev.filter(
        (d) =>
          rackIds.has(d.tile.id) && !game.board[cellIndex(d.row, d.col)],
      );
      return next.length === prev.length ? prev : next;
    });
  }, [game.board, myRack]);

  useEffect(() => {
    if (!game.peek) {
      setPeekKeepId(null);
      setPeekSwapId(null);
    }
  }, [game.peek]);

  const clockRunning =
    game.clockMode === "timed" && game.status === "playing";
  const clockNow = useClockNow(clockRunning);

  useEffect(() => {
    if (!clockRunning) return;
    const left = liveClockMs(
      game,
      game.turnUid,
      game.turnUid,
      true,
      clockNow,
    );
    if (left > 0) return;
    void commitGame((prev) => flagScrabbleOnTime(prev) ?? prev);
  }, [
    clockRunning,
    clockNow,
    game.turnUid,
    game.clockMs,
    game.clockTurnStartedAt,
    commitGame,
  ]);

  const opponentUid =
    JENGA_PLAYER_UIDS.find((id) => id === actorUid) !== undefined
      ? nextTurnUid(actorUid)
      : JENGA_PLAYER_UIDS[1]!;

  const draftIds = useMemo(() => new Set(draft.map((d) => d.tile.id)), [draft]);
  const rackVisible = myRack.filter((t) => !draftIds.has(t.id));

  const statusLabel = (() => {
    if (!ready) return "Syncing…";
    if (game.firstUid == null) return "Who goes first?";
    if (game.clockMode == null) return "Sweaty or grass?";
    if (busy) return "Checking words…";
    if (message) return message;
    if (game.peek) {
      if (game.peek.uid === actorUid) return "Peek-a-Paw — pick a tile";
      return "Opponent is peeking…";
    }
    if (game.status === "finished") {
      if (!game.winnerUid) return "Draw";
      if (game.hotseat) {
        const seat = game.winnerUid === JENGA_PLAYER_UIDS[0] ? "P1" : "P2";
        return `${seat} wins`;
      }
      return game.winnerUid === uid ? "You win!" : "Opponent wins";
    }
    if (canAct) {
      if (game.hotseat) {
        const seat = actorUid === JENGA_PLAYER_UIDS[0] ? "P1" : "P2";
        return `Hotseat — ${seat}'s turn`;
      }
      return "Your turn";
    }
    if (draft.length > 0) return "Planning… (waiting)";
    return "Waiting for opponent";
  })();

  /** Local rack→board draft only (no commits). Allowed while waiting. */
  const canDraft =
    game.status === "playing" &&
    game.clockMode != null &&
    game.firstUid != null &&
    !busy &&
    !exchangeMode &&
    !blankStareMode &&
    !game.peek;

  const letterOnBoard = (row: number, col: number): string | null => {
    const d = draft.find((x) => x.row === row && x.col === col);
    if (d) return d.chosenLetter || d.tile.letter || "?";
    return game.board[cellIndex(row, col)]?.letter ?? null;
  };

  const blankOnBoard = (row: number, col: number): boolean => {
    const d = draft.find((x) => x.row === row && x.col === col);
    if (d) return d.tile.blank;
    return Boolean(game.board[cellIndex(row, col)]?.blank);
  };

  const placeTileOnBoard = (
    tile: ScrabbleTile,
    row: number,
    col: number,
    existingChosen?: string,
  ): boolean => {
    if (!canDraft) {
      return false;
    }
    if (game.board[cellIndex(row, col)]) return false;
    if (draft.some((d) => d.row === row && d.col === col && d.tile.id !== tile.id)) {
      return false;
    }

    let chosenLetter = existingChosen;
    if (tile.blank && !chosenLetter) {
      const ch = promptBlankLetter();
      if (!ch) {
        setMessage("Blank needs A–Z");
        return false;
      }
      chosenLetter = ch;
    }

    setDraft((prev) => {
      const without = prev.filter((d) => d.tile.id !== tile.id);
      return [...without, { row, col, tile, chosenLetter }];
    });
    setSelectedId(null);
    setMessage(null);
    return true;
  };

  const placeSelectedAt = (row: number, col: number) => {
    if (!canDraft) return;
    if (game.board[cellIndex(row, col)]) return;

    const draftHere = draft.find((d) => d.row === row && d.col === col);
    if (draftHere) {
      setSelectedId((id) => (id === draftHere.tile.id ? null : draftHere.tile.id));
      return;
    }

    if (!selectedId) return;

    const fromDraft = draft.find((d) => d.tile.id === selectedId);
    if (fromDraft) {
      placeTileOnBoard(fromDraft.tile, row, col, fromDraft.chosenLetter);
      return;
    }

    const tile = rackVisible.find((t) => t.id === selectedId);
    if (!tile) return;
    placeTileOnBoard(tile, row, col);
  };

  const placeGhost = (clientX: number, clientY: number) => {
    const ghost = ghostRef.current;
    const board = boardRef.current;
    if (!ghost || !board) return;
    const size = board.getBoundingClientRect().width / SCRABBLE_SIZE;
    ghost.style.width = `${size}px`;
    ghost.style.height = `${size}px`;
    ghost.style.left = `${clientX}px`;
    ghost.style.top = `${clientY}px`;
  };

  useEffect(() => {
    const drag = tileDragRef.current;
    if (draggingTileId === null || !drag) return;
    placeGhost(drag.lastX, drag.lastY);
  }, [draggingTileId]);

  const onTilePointerDown = (
    event: ReactPointerEvent<HTMLButtonElement>,
    source: "rack" | "board",
    tile: ScrabbleTile,
    chosenLetter?: string,
  ) => {
    if (!canDraft) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    suppressClickRef.current = false;
    tileDragRef.current = {
      source,
      tile,
      chosenLetter,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      dragging: false,
      alreadySelected: selectedId === tile.id,
    };
    setSelectedId(tile.id);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onTilePointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = tileDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    drag.lastX = event.clientX;
    drag.lastY = event.clientY;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.dragging) {
      if (dx * dx + dy * dy < TILE_DRAG_THRESHOLD * TILE_DRAG_THRESHOLD) return;
      drag.dragging = true;
      setDraggingTileId(drag.tile.id);
    }
    placeGhost(event.clientX, event.clientY);
    setHoverCell(cellAtPoint(event.clientX, event.clientY));
    setHoverRack(
      drag.source === "board" && pointOverRack(event.clientX, event.clientY),
    );
  };

  const onTilePointerUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = tileDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    tileDragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    suppressClickRef.current = true;
    if (drag.dragging) {
      const overRack = pointOverRack(event.clientX, event.clientY);
      const cell = cellAtPoint(event.clientX, event.clientY);
      if (drag.source === "board" && overRack) {
        setDraft((prev) => prev.filter((d) => d.tile.id !== drag.tile.id));
        setSelectedId(null);
        setMessage(null);
      } else if (cell) {
        placeTileOnBoard(drag.tile, cell.row, cell.col, drag.chosenLetter);
      }
      setDraggingTileId(null);
      setHoverCell(null);
      setHoverRack(false);
      return;
    }
    if (drag.alreadySelected) setSelectedId(null);
  };

  const onTilePointerCancel = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = tileDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    tileDragRef.current = null;
    setDraggingTileId(null);
    setHoverCell(null);
    setHoverRack(false);
  };

  const recall = () => {
    setDraft([]);
    setSelectedId(null);
    setMessage(null);
  };

  const toPlacements = (): Placement[] | null => {
    return draft.map((d) => ({
      row: d.row,
      col: d.col,
      letter: d.tile.blank
        ? (d.chosenLetter ?? "").toUpperCase()
        : d.tile.letter,
      tileId: d.tile.id,
      blank: d.tile.blank,
    }));
  };

  const play = async () => {
    if (!canAct || busy) return;
    const placements = toPlacements();
    if (!placements || placements.length === 0) {
      setMessage("Place tiles first");
      return;
    }
    const preview = previewPlayWords(game, placements);
    if (preview.error) {
      setMessage(preview.error);
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const check = await checkWords(preview.words);
      if (!check.ok) {
        if (check.reason === "invalid") {
          setMessage(`Not a word: ${check.invalid.join(", ")}`);
          void commitGame(
            (prev) => applyBust(prev, actorUid, check.invalid) ?? prev,
          );
        } else {
          setMessage("Dictionary unreachable — try again");
        }
        return;
      }
      await commitGame(
        (prev) =>
          applyPlay(prev, actorUid, placements, {
            definitions: check.definitions,
          }) ?? prev,
      );
      setDraft([]);
      setSelectedId(null);
    } finally {
      setBusy(false);
    }
  };

  const pass = () => {
    if (!canAct || busy) return;
    recall();
    void commitGame((prev) => applyPass(prev, actorUid) ?? prev);
  };

  const confirmExchange = () => {
    if (!canAct || busy) return;
    if (exchangeIds.size === 0) {
      setMessage("Select tiles to exchange");
      return;
    }
    void commitGame(
      (prev) => applyExchange(prev, actorUid, [...exchangeIds]) ?? prev,
    );
    setExchangeMode(false);
    setExchangeIds(new Set());
    setDraft([]);
  };

  const mySkills = game.skills[actorUid] ?? {
    catBurglar: 0,
    blankStare: 0,
    shelfCheck: 0,
    peekAPaw: 0,
    meowtiply: 0,
  };

  const runSkill = (id: ScrabbleSkillId) => {
    if (!canAct || busy || game.peek) return;
    if (draft.length > 0) {
      setMessage("Recall tiles before using a skill");
      return;
    }
    if ((mySkills[id] ?? 0) <= 0) return;

    if (id === "blankStare") {
      setBlankStareMode(true);
      setExchangeMode(false);
      setSelectedId(null);
      setMessage("Blank Stare — tap a rack tile");
      return;
    }
    if (id === "peekAPaw") {
      void commitGame((prev) => {
        const next = beginPeekAPaw(prev, actorUid);
        if (!next) setMessage("Peek-a-Paw failed (empty bag)");
        return next ?? prev;
      });
      return;
    }
    if (id === "catBurglar") {
      void commitGame((prev) => {
        const next = applyCatBurglar(prev, actorUid);
        if (!next) setMessage("Cat Burglar failed (no vowels / rack full)");
        return next ?? prev;
      });
      return;
    }
    if (id === "shelfCheck") {
      void commitGame((prev) => {
        const next = applyShelfCheck(prev, actorUid);
        if (!next) setMessage("Shelf Check failed (empty rack)");
        return next ?? prev;
      });
      return;
    }
    if (id === "meowtiply") {
      void commitGame((prev) => {
        const next = applyMeowtiply(prev, actorUid);
        if (!next) setMessage("Meowtiply already armed");
        return next ?? prev;
      });
    }
  };

  const onRackTileClick = (tile: ScrabbleTile) => {
    if (busy) return;
    if (blankStareMode) {
      if (!canAct) return;
      if (tile.blank) {
        setMessage("Pick a non-blank tile");
        return;
      }
      void commitGame((prev) => {
        const next = applyBlankStare(prev, actorUid, tile.id);
        if (!next) setMessage("Blank Stare failed");
        return next ?? prev;
      });
      setBlankStareMode(false);
      setMessage(null);
      return;
    }
    if (exchangeMode) {
      if (!canAct) return;
      setExchangeIds((prev) => {
        const next = new Set(prev);
        if (next.has(tile.id)) next.delete(tile.id);
        else next.add(tile.id);
        return next;
      });
      return;
    }
    if (!canDraft) return;
    setSelectedId((id) => (id === tile.id ? null : tile.id));
  };

  const shuffle = () => {
    if (busy || game.status !== "playing") return;
    if (myRack.length < 2) return;
    void commitGame((prev) => shuffleRack(prev, actorUid) ?? prev);
  };

  const peekMine = Boolean(game.peek && game.peek.uid === actorUid);
  const rackFull = myRack.length >= 7;
  const canConfirmPeek =
    peekMine && peekKeepId != null && (!rackFull || peekSwapId != null);

  const confirmPeek = () => {
    if (!canConfirmPeek || !peekKeepId) return;
    void commitGame(
      (prev) => finishPeekAPaw(prev, actorUid, peekKeepId, peekSwapId) ?? prev,
    );
  };

  return (
    <ArcadeStage
      title="Scrabble"
      onClose={onClose}
      meta={<ArcadeStatus>{statusLabel}</ArcadeStatus>}
    >
      {({ immersive }) => (
        <div className={immersive ? "flex min-h-0 flex-1 flex-col" : undefined}>
          {immersive ? null : (
            <div className="mt-2 hidden rounded-xl border border-border bg-surface/60 px-3.5 py-3 sm:block">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                  Skills
                  <span className="ml-2 font-medium normal-case tracking-normal text-muted">
                    — 2 uses each, no refill this game
                  </span>
                </p>
                <TurnPushToggle />
              </div>
              <div className="mt-1.5 grid grid-cols-1 gap-2 sm:grid-cols-3">
                {(
                  [
                    ["Cat Burglar", "steal a vowel from opponent’s rack"],
                    ["Blank Stare", "turn one of your tiles into a blank"],
                    [
                      "Shelf Check",
                      "knock a random opponent tile into the bag",
                    ],
                    ["Peek-a-Paw", "peek at bag tiles and swap one onto your rack"],
                    ["Meowtiply", "your next valid play scores ×3"],
                  ] as const
                ).map(([label, hint]) => (
                  <div
                    key={label}
                    className="flex items-baseline gap-2 text-[11px] leading-snug"
                  >
                    <span className="shrink-0 font-semibold text-white/85">
                      {label}
                    </span>
                    <span className="text-muted">{hint}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div
            className={[
              "mt-2 flex shrink-0 flex-col gap-1.5 sm:mt-3",
              immersive ? "gap-1" : "",
            ].join(" ")}
          >
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-muted sm:gap-3 sm:text-[11px]">
              {!immersive ? (
                <span className="sm:hidden">
                  <TurnPushToggle />
                </span>
              ) : null}
              <span>Bag {game.bag.length}</span>
              {game.hotseat ? (
                <span>
                  Playing as {actorUid === JENGA_PLAYER_UIDS[0] ? "P1" : "P2"}
                </span>
              ) : (
                <span>
                  Opponent rack: {game.racks[opponentUid]?.length ?? 0}
                </span>
              )}
              {game.meowtiplyFor === actorUid ? (
                <span className="rounded-md border border-fuchsia-500/40 bg-fuchsia-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-app-text">
                  Meowtiply armed
                </span>
              ) : null}
            </div>
            {/* One row — scroll horizontally on narrow theater instead of wrapping. */}
            <div className="flex min-w-0 items-center gap-1 overflow-x-auto overscroll-x-contain pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
                {SKILL_BUTTONS.map((btn) => {
                  const left = mySkills[btn.id] ?? 0;
                  return (
                    <button
                      key={btn.id}
                      type="button"
                      title={btn.title}
                      disabled={
                        !canAct ||
                        busy ||
                        left <= 0 ||
                        Boolean(game.peek) ||
                        (btn.id === "meowtiply" &&
                          game.meowtiplyFor === actorUid)
                      }
                      onClick={() => runSkill(btn.id)}
                      className={[
                        "whitespace-nowrap rounded-md border px-1.5 py-1 text-[9px] font-medium leading-tight transition disabled:opacity-40 sm:px-2 sm:text-[10px]",
                        btn.cls,
                      ].join(" ")}
                    >
                      {btn.label} ({left})
                    </button>
                  );
                })}
                {game.hotseat ? (
                  <span className="whitespace-nowrap rounded-md border border-amber-500/55 bg-amber-500/20 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-app-text">
                    Debug hotseat
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={() => setNewGameOpen(true)}
                  className="whitespace-nowrap rounded-lg border border-border bg-surface px-2 py-1 text-[11px] font-medium text-white hover:border-muted sm:px-2.5 sm:text-xs"
                >
                  New game
                </button>
              </div>
            </div>
          </div>

          {game.firstUid == null ? (
            <div className="mt-6">
              <GameSeatPicker
                prompt="Who goes first?"
                optionLabel={(name) => `${name} goes first`}
                onPick={(seat) =>
                  void commitGame(
                    (prev) => selectScrabbleFirst(prev, seat) ?? prev,
                  )
                }
              />
            </div>
          ) : game.clockMode == null ? (
            <div className="mt-6">
              <GameClockSetupPicker
                key={game.roundId}
                presets={SCRABBLE_CLOCK_PRESETS}
                customPlaceholder="e.g. 5 or 3+0"
                onGrass={() =>
                  void commitGame(
                    (prev) => selectScrabbleClockMode(prev, "off") ?? prev,
                  )
                }
                onSweaty={(control) =>
                  void commitGame(
                    (prev) =>
                      selectScrabbleClockMode(
                        prev,
                        "timed",
                        Date.now(),
                        control,
                      ) ?? prev,
                  )
                }
              />
            </div>
          ) : (
          <TheaterPlayRow immersive={immersive} stacked={stacked}>
            {({
              boardPx,
              sideRack,
              rackTilePx,
              rowRef,
              rackRef,
              sidebarWidth,
              setSidebarWidth,
              onResizePointerDown,
              stacked: layoutStacked,
            }) => {
              const rackEl = (
                    <div
                      ref={rackRef}
                      data-scrabble-rack="1"
                      className={[
                        "flex shrink-0 flex-col gap-1.5 rounded-lg p-1 sm:gap-2",
                        sideRack
                          ? "max-h-full items-center justify-center overflow-y-auto"
                          : "mt-2 w-full items-start sm:mt-3",
                        hoverRack ? "ring-2 ring-emerald-400/70" : "",
                      ].join(" ")}
                    >
                      <div
                        className={[
                          "flex items-center gap-1 sm:gap-1.5",
                          sideRack
                            ? "max-h-full flex-col flex-wrap justify-center"
                            : "flex-wrap",
                        ].join(" ")}
                      >
                        {(exchangeMode || blankStareMode
                          ? myRack
                          : rackVisible
                        ).map((tile) => {
                          const selected = exchangeMode
                            ? exchangeIds.has(tile.id)
                            : blankStareMode
                              ? false
                              : selectedId === tile.id;
                          const placeMode =
                            !exchangeMode && !blankStareMode && !game.peek;
                          return (
                            <button
                              key={tile.id}
                              type="button"
                              disabled={
                                (!canDraft && !exchangeMode && !blankStareMode) ||
                                busy ||
                                Boolean(game.peek) ||
                                (!exchangeMode &&
                                  !blankStareMode &&
                                  draftIds.has(tile.id))
                              }
                              className={[
                                "touch-none",
                                placeMode ? "cursor-grab active:cursor-grabbing" : "",
                                draggingTileId === tile.id ? "opacity-0" : "",
                              ].join(" ")}
                              onClick={() => {
                                if (suppressClickRef.current) {
                                  suppressClickRef.current = false;
                                  return;
                                }
                                onRackTileClick(tile);
                              }}
                              onPointerDown={
                                placeMode
                                  ? (event) =>
                                      onTilePointerDown(event, "rack", tile)
                                  : undefined
                              }
                              onPointerMove={
                                placeMode ? onTilePointerMove : undefined
                              }
                              onPointerUp={
                                placeMode ? onTilePointerUp : undefined
                              }
                              onPointerCancel={
                                placeMode ? onTilePointerCancel : undefined
                              }
                            >
                              <TileFace
                                letter={tile.letter}
                                blank={tile.blank}
                                selected={selected && draggingTileId !== tile.id}
                                small={layoutStacked && rackTilePx == null}
                                sizePx={rackTilePx ?? undefined}
                              />
                            </button>
                          );
                        })}
                        {draft.map((d) => (
                          <button
                            key={`draft-${d.tile.id}`}
                            type="button"
                            disabled={!canDraft || busy}
                            title="Return to rack"
                            aria-label={`Recall ${d.chosenLetter || d.tile.letter || "blank"} from board`}
                            onClick={() => {
                              if (suppressClickRef.current) {
                                suppressClickRef.current = false;
                                return;
                              }
                              setDraft((prev) =>
                                prev.filter((x) => x.tile.id !== d.tile.id),
                              );
                            }}
                          >
                            <TileFace
                              letter={d.chosenLetter || d.tile.letter}
                              blank={d.tile.blank}
                              small={rackTilePx == null}
                              sizePx={rackTilePx ?? undefined}
                              recallHint
                            />
                          </button>
                        ))}
                      </div>

                      <div
                        className={[
                          "flex flex-wrap items-center gap-1.5",
                          sideRack ? "max-w-[9rem] justify-center" : "",
                        ].join(" ")}
                      >
                        {exchangeMode ? (
                          <>
                            <button
                              type="button"
                              disabled={
                                !canAct || busy || game.bag.length === 0
                              }
                              onClick={confirmExchange}
                              className="rounded-lg border border-sky-500/55 bg-sky-500/20 px-2.5 py-1 text-xs font-medium text-app-text hover:bg-sky-500/30 disabled:opacity-40"
                            >
                              Confirm exchange
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setExchangeMode(false);
                                setExchangeIds(new Set());
                              }}
                              className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs text-muted hover:text-white"
                            >
                              Cancel
                            </button>
                          </>
                        ) : blankStareMode ? (
                          <button
                            type="button"
                            onClick={() => {
                              setBlankStareMode(false);
                              setMessage(null);
                            }}
                            className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs text-muted hover:text-white"
                          >
                            Cancel Blank Stare
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              disabled={!canAct || busy || draft.length === 0}
                              onClick={() => void play()}
                              className="rounded-lg border border-emerald-500/55 bg-emerald-500/20 px-2.5 py-1 text-xs font-medium text-app-text hover:bg-emerald-500/30 disabled:opacity-40"
                            >
                              Play
                            </button>
                            <button
                              type="button"
                              disabled={
                                busy ||
                                game.status !== "playing" ||
                                myRack.length < 2
                              }
                              onClick={shuffle}
                              className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs text-white hover:border-muted disabled:opacity-40"
                            >
                              Shuffle
                            </button>
                            <button
                              type="button"
                              disabled={!canDraft || busy || draft.length === 0}
                              onClick={recall}
                              className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs text-white hover:border-muted disabled:opacity-40"
                            >
                              Recall
                            </button>
                            <button
                              type="button"
                              disabled={
                                !canAct ||
                                busy ||
                                game.bag.length === 0 ||
                                Boolean(game.peek)
                              }
                              onClick={() => {
                                recall();
                                setBlankStareMode(false);
                                setExchangeMode(true);
                              }}
                              className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs text-white hover:border-muted disabled:opacity-40"
                            >
                              Exchange
                            </button>
                            <button
                              type="button"
                              disabled={!canAct || busy || Boolean(game.peek)}
                              onClick={pass}
                              className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs text-muted hover:text-white disabled:opacity-40"
                            >
                              Pass
                            </button>
                          </>
                        )}
                      </div>
                    </div>
              );

              return (
              <div
                ref={rowRef}
                className={[
                  "mt-2 flex min-h-0 sm:mt-3",
                  immersive
                    ? layoutStacked
                      ? "min-h-0 flex-1 flex-col gap-2 overflow-hidden"
                      : sideRack
                        ? "min-h-0 flex-1 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-stretch gap-2 overflow-hidden"
                        : "min-h-0 flex-1 justify-center overflow-hidden"
                    : layoutStacked
                      ? "flex-col gap-3"
                      : "items-stretch gap-3",
                ].join(" ")}
              >
                {immersive && !layoutStacked && sideRack ? (
                  <div className="flex min-h-0 min-w-0 items-center justify-end overflow-hidden pr-1">
                    {rackEl}
                  </div>
                ) : null}
                {/*
                  Theater desktop: pack board + panel, then center.
                  Theater phone: `contents` so board+rack and aside are direct
                  column siblings (avoids flex-1 board column overlapping aside).
                */}
                <div
                  className={
                    immersive && !layoutStacked
                      ? "flex h-full min-h-0 max-w-full items-stretch gap-2 overflow-hidden"
                      : "contents"
                  }
                >
                  <div
                    className={[
                      "relative z-[1] flex min-h-0 flex-col",
                      layoutStacked
                        ? "w-full max-w-full shrink-0 items-center"
                        : immersive
                          ? // Theater desktop: hug the measured square — never a fixed 36rem column.
                            "shrink-0"
                          : "w-[36rem] max-w-full shrink-0",
                    ].join(" ")}
                  >
                    <div
                      ref={boardRef}
                      className={[
                        "@container/scrabble-board grid shrink-0 gap-0.5 rounded-xl border border-border bg-board-frame p-1 sm:p-1.5",
                        !immersive
                          ? "aspect-square w-full max-w-full"
                          : "",
                      ].join(" ")}
                      style={
                        immersive
                          ? {
                              width: boardPx ?? BOARD_MIN_PX,
                              height: boardPx ?? BOARD_MIN_PX,
                              gridTemplateColumns: `repeat(${SCRABBLE_SIZE}, minmax(0, 1fr))`,
                              gridTemplateRows: `repeat(${SCRABBLE_SIZE}, minmax(0, 1fr))`,
                            }
                          : {
                              containerType: "inline-size",
                              gridTemplateColumns: `repeat(${SCRABBLE_SIZE}, minmax(0, 1fr))`,
                              gridTemplateRows: `repeat(${SCRABBLE_SIZE}, minmax(0, 1fr))`,
                            }
                      }
                      role="grid"
                      aria-label="Scrabble board"
                    >
                      {Array.from(
                        { length: SCRABBLE_SIZE * SCRABBLE_SIZE },
                        (_, i) => {
                          const row = Math.floor(i / SCRABBLE_SIZE);
                          const col = i % SCRABBLE_SIZE;
                          const prem = premiumAt(row, col);
                          const letter = letterOnBoard(row, col);
                          const blank = letter ? blankOnBoard(row, col) : false;
                          const draftCell = draft.find(
                            (d) => d.row === row && d.col === col,
                          );
                          const isDraft = Boolean(draftCell);
                          const isLastPlay = game.lastPlayCells.some(
                            (c) => c.row === row && c.col === col,
                          );
                          const isHover =
                            hoverCell?.row === row && hoverCell?.col === col;
                          const canDropHere =
                            draggingTileId !== null &&
                            !game.board[cellIndex(row, col)] &&
                            (!draftCell || draftCell.tile.id === draggingTileId);
                          const draggingThis =
                            isDraft &&
                            draftCell !== undefined &&
                            draggingTileId === draftCell.tile.id;
                          return (
                            <button
                              key={i}
                              type="button"
                              data-scrabble-row={row}
                              data-scrabble-col={col}
                              disabled={!canDraft}
                              onClick={() => {
                                if (suppressClickRef.current) {
                                  suppressClickRef.current = false;
                                  return;
                                }
                                placeSelectedAt(row, col);
                              }}
                              onPointerDown={
                                isDraft && draftCell
                                  ? (event) =>
                                      onTilePointerDown(
                                        event,
                                        "board",
                                        draftCell.tile,
                                        draftCell.chosenLetter,
                                      )
                                  : undefined
                              }
                              onPointerMove={isDraft ? onTilePointerMove : undefined}
                              onPointerUp={isDraft ? onTilePointerUp : undefined}
                              onPointerCancel={
                                isDraft ? onTilePointerCancel : undefined
                              }
                              className={[
                                "relative flex min-h-0 min-w-0 touch-none items-center justify-center rounded-md border border-black/20 font-semibold uppercase leading-none",
                                // ~0.48 of a cell; points below use em so they track this size.
                                immersive
                                  ? ""
                                  : "text-[max(0.4rem,3.15cqw)]",
                                letter
                                  ? isDraft
                                    ? "cursor-grab border-amber-800/30 bg-[#f3e6c8] text-amber-950 ring-2 ring-golden active:cursor-grabbing"
                                    : "border-amber-800/30 bg-[#f3e6c8] text-amber-950 shadow-sm"
                                  : premiumClass(prem),
                                isLastPlay && !isDraft ? "arcade-last-move" : "",
                                isHover && canDropHere
                                  ? "ring-2 ring-emerald-400/80"
                                  : "",
                                selectedId &&
                                isDraft &&
                                draftCell?.tile.id === selectedId &&
                                draggingTileId === null
                                  ? "ring-2 ring-golden"
                                  : "",
                                draggingThis ? "opacity-0" : "",
                              ].join(" ")}
                              style={
                                immersive && boardPx
                                  ? {
                                      fontSize: `${Math.max(6, Math.floor((boardPx / SCRABBLE_SIZE) * 0.48))}px`,
                                    }
                                  : undefined
                              }
                            >
                              {letter ? (
                                <>
                                  <span className="leading-none">{letter}</span>
                                  <span
                                    className="absolute bottom-[0.06em] right-[0.08em] text-[0.42em] font-bold tabular-nums leading-none text-amber-950/70"
                                    aria-hidden
                                  >
                                    {letterValue(letter, blank)}
                                  </span>
                                </>
                              ) : (
                                <span className="text-[0.42em] font-bold leading-none opacity-80">
                                  {premiumLabel(prem)}
                                </span>
                              )}
                            </button>
                          );
                        },
                      )}
                    </div>

                    {!(immersive && sideRack) ? rackEl : null}
                  </div>

                  {immersive && !layoutStacked ? (
                    <div
                      role="separator"
                      aria-orientation="vertical"
                      aria-label="Resize moves panel"
                      aria-valuenow={sidebarWidth}
                      tabIndex={0}
                      onPointerDown={onResizePointerDown}
                      onKeyDown={(event) => {
                        const step = event.shiftKey ? 32 : 16;
                        if (event.key === "ArrowLeft") {
                          event.preventDefault();
                          setSidebarWidth(sidebarWidth + step);
                        } else if (event.key === "ArrowRight") {
                          event.preventDefault();
                          setSidebarWidth(sidebarWidth - step);
                        }
                      }}
                      className="group relative w-2 shrink-0 cursor-col-resize touch-none"
                    >
                      <span
                        aria-hidden
                        className="absolute inset-y-3 left-1/2 w-0.5 -translate-x-1/2 rounded-full bg-white/15 transition group-hover:bg-golden/70 group-active:bg-golden"
                      />
                    </div>
                  ) : null}

                  <aside
                    className={[
                      "flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-surface/70",
                      immersive && !layoutStacked
                        ? "shrink-0"
                        : "min-w-0 w-full",
                      // Theater phone: fill leftover height under board+rack.
                      immersive && layoutStacked
                        ? "min-h-0 flex-1"
                        : "",
                      !immersive && layoutStacked
                        ? "min-h-[17rem] flex-1"
                        : !immersive
                          ? "flex-1"
                          : "",
                    ].join(" ")}
                    style={
                      immersive && !layoutStacked
                        ? { width: sidebarWidth }
                        : undefined
                    }
                  >
                    <div
                      className={[
                        "shrink-0 border-b border-border px-2.5 py-2 sm:px-3 sm:py-2.5",
                        layoutStacked ? "sm:border-b" : "",
                      ].join(" ")}
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                        Score
                      </p>
                      <div
                        className={[
                          "mt-1.5 gap-1.5 sm:mt-2 sm:space-y-1.5",
                          layoutStacked
                            ? "grid grid-cols-2"
                            : "space-y-1.5",
                        ].join(" ")}
                      >
                        {JENGA_PLAYER_UIDS.map((id) => {
                          const turn =
                            game.turnUid === id && game.status === "playing";
                          return (
                            <div
                              key={id}
                              className={[
                                "flex items-baseline justify-between gap-2 rounded-lg border px-2 py-1.5",
                                turn
                                  ? "border-golden/45 bg-golden/10"
                                  : "border-transparent bg-surface",
                              ].join(" ")}
                            >
                              <span
                                className={[
                                  "text-[11px] font-medium",
                                  turn ? "text-golden" : "text-white/85",
                                ].join(" ")}
                              >
                                {seatLabel(id, uid, game.hotseat)}
                              </span>
                              <span className="flex items-baseline gap-2">
                                {game.clockMode === "timed" ? (
                                  <GameClockReadout
                                    ms={liveClockMs(
                                      game,
                                      id,
                                      game.turnUid,
                                      game.status === "playing",
                                      clockNow,
                                    )}
                                    active={turn}
                                  />
                                ) : null}
                                <span className="text-sm font-semibold tabular-nums text-white">
                                  {game.scores[id] ?? 0}
                                </span>
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div
                      className={[
                        "flex min-h-0 flex-1 flex-col overflow-hidden",
                        layoutStacked ? "min-h-[9.5rem]" : "",
                      ].join(" ")}
                    >
                      <p className="shrink-0 px-3 pt-2.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
                        Moves
                      </p>
                      <div
                        className={[
                          "relative mt-2 min-h-0 flex-1",
                          layoutStacked ? "min-h-[7.5rem]" : "",
                        ].join(" ")}
                      >
                        <ul className="jo-scroll absolute inset-0 space-y-1.5 overflow-y-auto overscroll-contain px-3 pb-2">
                          {game.moveLog.length === 0 ? (
                            <li className="text-[11px] text-muted">
                              No moves yet
                            </li>
                          ) : (
                            [...game.moveLog].reverse().map((entry, i) =>
                              entry.kind === "newGame" ? (
                                <li
                                  key={`${entry.at}-newGame-${i}`}
                                  className="rounded-lg border border-dashed border-border bg-surface px-2.5 py-2"
                                >
                                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                                    New game
                                  </p>
                                  <p className="mt-0.5 text-[11px] tabular-nums text-muted">
                                    {newGameScoreLine(
                                      entry.finals,
                                      uid,
                                      game.hotseat,
                                    )}
                                  </p>
                                </li>
                              ) : (
                                <li
                                  key={`${entry.at}-${entry.uid}-${i}`}
                                  className={[
                                    "overflow-hidden rounded-lg border",
                                    moveCardClass(entry.kind),
                                  ].join(" ")}
                                >
                                  <div className="flex items-center justify-between gap-2 px-2.5 py-2">
                                    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                                      <span className="shrink-0 self-start text-[10px] font-medium text-muted">
                                        {seatLabel(
                                          entry.uid,
                                          uid,
                                          game.hotseat,
                                        )}
                                      </span>
                                      {entry.kind === "bust" ? (
                                        <p className="min-w-0 text-[11px] leading-snug text-rose-200">
                                          {moveHeadline(entry)}
                                        </p>
                                      ) : (
                                        <span
                                          className={[
                                            "text-sm font-semibold leading-none",
                                            entry.kind === "play"
                                              ? "text-white"
                                              : entry.kind === "skill"
                                                ? "text-violet-100"
                                                : "text-muted",
                                          ].join(" ")}
                                        >
                                          {moveHeadline(entry)}
                                        </span>
                                      )}
                                      {entry.kind === "play" &&
                                      entry.score > 0 ? (
                                        <span className="self-start rounded bg-emerald-500 px-1.5 py-0.5 text-sm font-bold tabular-nums leading-none text-white shadow-sm shadow-emerald-900/40">
                                          +{entry.score}
                                        </span>
                                      ) : null}
                                      {entry.kind === "pass" ? (
                                        <span className="self-start rounded bg-zinc-600/80 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-zinc-100">
                                          skip
                                        </span>
                                      ) : null}
                                      {entry.kind === "exchange" ? (
                                        <span className="self-start rounded bg-sky-500/80 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">
                                          swap
                                        </span>
                                      ) : null}
                                      {entry.kind === "skill" ? (
                                        <span className="self-start rounded bg-violet-500/80 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">
                                          skill
                                        </span>
                                      ) : null}
                                    </div>
                                    <div className="flex shrink-0 items-center gap-1 self-start">
                                      <img
                                        src={catForEntry(entry.at, entry.uid)}
                                        alt=""
                                        aria-hidden
                                        className="scrabble-move-cat h-5 w-5 shrink-0 select-none object-contain"
                                        style={{
                                          animationDelay: `${wiggleDelay(
                                            entry.at,
                                            entry.uid,
                                          )}ms`,
                                        }}
                                        draggable={false}
                                      />
                                      <span
                                        className="text-[11px] font-medium tabular-nums text-muted"
                                        title={
                                          entry.kind === "bust"
                                            ? undefined
                                            : "Score after this move"
                                        }
                                      >
                                        {entry.kind === "bust"
                                          ? "lol"
                                          : entry.total}
                                      </span>
                                    </div>
                                  </div>
                                  {entry.kind === "play" &&
                                  entry.definitions.length > 0 ? (
                                    <ul className="space-y-1 border-t border-black/10 bg-white/35 px-2.5 py-1.5">
                                      {entry.definitions.map((d) => (
                                        <li
                                          key={`${entry.at}-${d.word}`}
                                          className="text-[11px] leading-snug text-black"
                                        >
                                          {d.definition}
                                        </li>
                                      ))}
                                    </ul>
                                  ) : null}
                                </li>
                              ),
                            )
                          )}
                        </ul>
                      </div>
                      <p className="shrink-0 border-t border-border px-3 py-2 text-[9px] leading-snug text-muted/80">
                        {DICTIONARY_ATTRIBUTION}
                      </p>
                    </div>
                  </aside>
                </div>
                {immersive && !layoutStacked && sideRack ? (
                  <div aria-hidden className="min-w-0" />
                ) : null}
              </div>
              );
            }}
          </TheaterPlayRow>
          )}

          {peekMine && game.peek ? (
            <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
              <div className="w-full max-w-md rounded-2xl border border-sky-500/40 bg-surface-raised p-4 shadow-xl">
                <h3 className="text-sm font-semibold text-white">Peek-a-Paw</h3>
                <p className="mt-1 text-[11px] text-muted">
                  Pick a tile to keep
                  {rackFull
                    ? ", then choose a rack tile to send back to the bag."
                    : ". Optionally swap a rack tile back into the bag."}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {game.peek.tiles.map((tile) => (
                    <button
                      key={tile.id}
                      type="button"
                      onClick={() => setPeekKeepId(tile.id)}
                    >
                      <TileFace
                        letter={tile.letter}
                        blank={tile.blank}
                        selected={peekKeepId === tile.id}
                      />
                    </button>
                  ))}
                </div>
                <p className="mt-3 text-[10px] font-semibold uppercase tracking-wide text-muted">
                  {rackFull ? "Swap from rack" : "Optional rack swap"}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {myRack.map((tile) => (
                    <button
                      key={tile.id}
                      type="button"
                      onClick={() =>
                        setPeekSwapId((id) => (id === tile.id ? null : tile.id))
                      }
                    >
                      <TileFace
                        letter={tile.letter}
                        blank={tile.blank}
                        selected={peekSwapId === tile.id}
                        small
                      />
                    </button>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={!canConfirmPeek || busy}
                    onClick={confirmPeek}
                    className="rounded-lg border border-sky-500/55 bg-sky-500/20 px-3 py-2 text-sm font-medium text-app-text hover:bg-sky-500/30 disabled:opacity-40"
                  >
                    Keep tile
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {draggingTileId !== null ? (
            <div
              ref={ghostRef}
              className="pointer-events-none fixed z-[80] -translate-x-1/2 -translate-y-1/2"
              style={{
                left: tileDragRef.current?.lastX,
                top: tileDragRef.current?.lastY,
              }}
            >
              {(() => {
                const fromDraft = draft.find((d) => d.tile.id === draggingTileId);
                const tile =
                  fromDraft?.tile ??
                  myRack.find((t) => t.id === draggingTileId);
                if (!tile) return null;
                return (
                  <TileFace
                    letter={fromDraft?.chosenLetter || tile.letter}
                    blank={tile.blank}
                    sizePx={
                      boardRef.current
                        ? Math.max(
                            28,
                            Math.round(
                              boardRef.current.getBoundingClientRect().width /
                                SCRABBLE_SIZE,
                            ),
                          )
                        : undefined
                    }
                  />
                );
              })()}
            </div>
          ) : null}

          <NewGameConfirm
            open={newGameOpen}
            onClose={() => setNewGameOpen(false)}
            onConfirm={(opts) => void resetGame(opts)}
            blurb="Clears the board, racks, and scores. You’ll pick Normal or Timed next."
          />
        </div>
      )}
    </ArcadeStage>
  );
}
