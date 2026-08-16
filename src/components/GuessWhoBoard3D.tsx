import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import {
  createContext,
  Suspense,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as THREE from "three";
import { useThemeCssColor } from "../hooks/useThemeCssColor";
import { agentById, roleMeta, type ValorantAgent } from "../lib/valorantAgents";
import { GUESS_WHO_BOARD_COLS } from "../lib/guessWho";

/** World units — table-top board, cards stand on Y. */
const CARD_W = 0.72;
const CARD_H = 1.12;
const CARD_D = 0.05;
const FRAME = 0.045;
const FLAP_W = CARD_W + FRAME * 2;
const FLAP_H = CARD_H + FRAME * 2;
/**
 * Real Guess Who: hinge-to-hinge depth well above flap height so a flipped
 * card lies flat with a clear gap before the next row.
 */
const ROW_PITCH = FLAP_H * 1.55;
/** ~18% of card width — gutters between columns. */
const COL_PITCH = FLAP_W + CARD_W * 0.18;
/** Stadium step — each back row sits higher so faces stay readable. */
const ROW_RISE = 0.18;
/** Terrace slab thickness / well inset (keep flaps glued to this surface). */
const TERRACE_Y = 0.01;
const TERRACE_H = 0.05;
const WELL_Y = 0.035;
const WELL_H = 0.04;
/** Hairline clearance above the well so flaps don't z-fight the plastic. */
const FLAP_LIFT = 0.02;
/** Upright = straight up (no lean). Flipped = flat into the well. */
const UPRIGHT_LEAN = 0;
/** Classic-ish columns (real game is 6×4; wider for our agent roster). */
const COLS = GUESS_WHO_BOARD_COLS;

/** Default seated view — keep Canvas `camera` + reset button in sync. */
const DEFAULT_CAMERA_POS: [number, number, number] = [0, 3.7, 9.1];
const DEFAULT_CAMERA_FOV = 36;
const DEFAULT_CONTROLS_TARGET: [number, number, number] = [0, 0.55, 0.15];

/** Piece colors — distinct like the toy, driven by the shared site theme. */
type BoardPalette = {
  /** Main tray / outer plastic (classic blue board → theme streak). */
  tray: string;
  /** Row platforms. */
  terrace: string;
  /** Recessed flip wells. */
  well: string;
  /** Front lip / accents. */
  lip: string;
  /** Flap frames (classic yellow plastic → theme golden). */
  flap: string;
  /** Flap rim highlight. */
  flapHi: string;
  /** Mystery stand pedestal. */
  mystery: string;
};

const BoardPaletteContext = createContext<BoardPalette | null>(null);

function useBoardPalette(): BoardPalette {
  const ctx = useContext(BoardPaletteContext);
  if (!ctx) throw new Error("BoardPalette missing");
  return ctx;
}

type PlasticMaps = {
  /** Multiplies with material `color` — mottled so plastics aren't flat fills. */
  colorMap: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
};

const PlasticMapsContext = createContext<PlasticMaps | null>(null);

function usePlasticMaps(): PlasticMaps {
  const ctx = useContext(PlasticMapsContext);
  if (!ctx) throw new Error("PlasticMaps missing");
  return ctx;
}

function plasticSurfaceProps(maps: PlasticMaps, bumpScale = 0.06) {
  return {
    map: maps.colorMap,
    bumpMap: maps.bumpMap,
    bumpScale,
    roughnessMap: maps.roughnessMap,
    roughness: 0.62,
    metalness: 0.02,
  } as const;
}

function shadeHex(hex: string, deltaL: number): string {
  const c = new THREE.Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  return `#${c
    .setHSL(hsl.h, hsl.s, THREE.MathUtils.clamp(hsl.l + deltaL, 0, 1))
    .getHexString()}`;
}

/** Map site theme tokens → Guess Who piece roles. */
function useGuessWhoPalette(): BoardPalette {
  const streak = useThemeCssColor("--color-streak", "#38bdf8");
  const golden = useThemeCssColor("--color-golden", "#fbbf24");
  const goldenGlow = useThemeCssColor("--color-golden-glow", "#f59e0b");
  const boardFrame = useThemeCssColor("--color-board-frame", "#1a2740");
  const boardCell = useThemeCssColor("--color-board-cell", "#3d5678");
  const chessFrame = useThemeCssColor("--color-chess-frame", "#5b7eab");

  return useMemo(
    () => ({
      tray: shadeHex(streak, -0.18),
      terrace: shadeHex(streak, -0.06),
      well: boardFrame,
      lip: chessFrame,
      flap: golden,
      flapHi: goldenGlow,
      mystery: boardCell,
    }),
    [streak, golden, goldenGlow, boardFrame, boardCell, chessFrame],
  );
}

/** Soft injection-mold plastic — light mottle, gentle bump (not rocky). */
function usePlasticSurfaceMaps(repeatX = 3.2, repeatY = 2.6): PlasticMaps {
  const maps = useMemo(() => {
    const size = 256;

    const paintData = (
      mode: "albedo" | "bump" | "rough",
      contrast: number,
      ridges: boolean,
    ) => {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return canvas;

      if (mode === "albedo") {
        // Near-white multiply base — keeps theme colors clean
        ctx.fillStyle = "#eceae6";
        ctx.fillRect(0, 0, size, size);

        for (let i = 0; i < 12; i++) {
          const x = Math.random() * size;
          const y = Math.random() * size;
          const r = 60 + Math.random() * 100;
          const g = ctx.createRadialGradient(x, y, 0, x, y, r);
          const dark = Math.random() > 0.5;
          g.addColorStop(
            0,
            dark ? "rgba(40,36,32,0.07)" : "rgba(255,255,252,0.1)",
          );
          g.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
        }

        const img = ctx.getImageData(0, 0, size, size);
        for (let i = 0; i < img.data.length; i += 4) {
          const px = (i / 4) % size;
          const py = Math.floor(i / 4 / size);
          const n =
            (Math.random() - 0.5) * 10 +
            Math.sin(px * 0.04 + py * 0.03) * 4 +
            Math.sin(px * 0.015 - py * 0.02) * 5;
          img.data[i] = Math.max(0, Math.min(255, img.data[i]! + n));
          img.data[i + 1] = Math.max(
            0,
            Math.min(255, img.data[i + 1]! + n * 0.95),
          );
          img.data[i + 2] = Math.max(
            0,
            Math.min(255, img.data[i + 2]! + n * 0.9),
          );
        }
        ctx.putImageData(img, 0, 0);

        for (let i = 0; i < 180; i++) {
          const x = Math.random() * size;
          const y = Math.random() * size;
          ctx.fillStyle =
            Math.random() > 0.5
              ? "rgba(20,18,15,0.06)"
              : "rgba(255,255,255,0.08)";
          ctx.beginPath();
          ctx.arc(x, y, 0.4 + Math.random() * 1.1, 0, Math.PI * 2);
          ctx.fill();
        }

        return canvas;
      }

      ctx.fillStyle = "#808080";
      ctx.fillRect(0, 0, size, size);
      const img = ctx.getImageData(0, 0, size, size);
      for (let i = 0; i < img.data.length; i += 4) {
        const fine = (Math.random() - 0.5) * contrast;
        const px = (i / 4) % size;
        const py = Math.floor(i / 4 / size);
        const peel =
          Math.sin(px * 0.12 + py * 0.09) * contrast * 0.22 +
          Math.sin(px * 0.05 - py * 0.07) * contrast * 0.18;
        const v = Math.max(0, Math.min(255, 128 + fine + peel));
        img.data[i] = v;
        img.data[i + 1] = v;
        img.data[i + 2] = v;
      }
      ctx.putImageData(img, 0, 0);

      if (ridges) {
        for (let y = 8; y < size; y += 28) {
          ctx.strokeStyle = "rgba(255,255,255,0.12)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(0, y);
          for (let x = 0; x <= size; x += 6) {
            ctx.lineTo(x, y + Math.sin(x * 0.08 + y * 0.03) * 2);
          }
          ctx.stroke();
        }
      }

      for (let i = 0; i < 120; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        ctx.fillStyle =
          Math.random() > 0.5
            ? "rgba(0,0,0,0.08)"
            : "rgba(255,255,255,0.07)";
        ctx.beginPath();
        ctx.arc(x, y, 0.5 + Math.random() * 1.4, 0, Math.PI * 2);
        ctx.fill();
      }

      return canvas;
    };

    const colorMap = new THREE.CanvasTexture(paintData("albedo", 0, false));
    colorMap.wrapS = colorMap.wrapT = THREE.RepeatWrapping;
    colorMap.repeat.set(repeatX, repeatY);
    colorMap.anisotropy = 4;
    colorMap.colorSpace = THREE.SRGBColorSpace;
    colorMap.needsUpdate = true;

    const bumpMap = new THREE.CanvasTexture(paintData("bump", 28, true));
    bumpMap.wrapS = bumpMap.wrapT = THREE.RepeatWrapping;
    bumpMap.repeat.set(repeatX * 1.1, repeatY * 1.1);
    bumpMap.anisotropy = 4;
    bumpMap.colorSpace = THREE.NoColorSpace;
    bumpMap.needsUpdate = true;

    const roughnessMap = new THREE.CanvasTexture(paintData("rough", 32, false));
    roughnessMap.wrapS = roughnessMap.wrapT = THREE.RepeatWrapping;
    roughnessMap.repeat.set(repeatX * 1.2, repeatY * 1.2);
    roughnessMap.anisotropy = 4;
    roughnessMap.colorSpace = THREE.NoColorSpace;
    roughnessMap.needsUpdate = true;

    return { colorMap, bumpMap, roughnessMap };
  }, [repeatX, repeatY]);

  useLayoutEffect(() => {
    return () => {
      maps.colorMap.dispose();
      maps.bumpMap.dispose();
      maps.roughnessMap.dispose();
    };
  }, [maps]);

  return maps;
}

type GridMeta = {
  cols: number;
  rows: number;
  gridW: number;
  gridD: number;
};

function gridMeta(count: number): GridMeta {
  const cols = Math.min(COLS, Math.max(1, count));
  const rows = Math.ceil(count / cols);
  return {
    cols,
    rows,
    gridW: cols * COL_PITCH,
    gridD: rows * ROW_PITCH,
  };
}

/** Slot on the table. Row 0 = closest to player (+Z). */
function slotPos(
  i: number,
  count: number,
): { x: number; y: number; z: number; row: number } {
  const { cols, rows, gridW, gridD } = gridMeta(count);
  const col = i % cols;
  const row = Math.floor(i / cols); // 0 = front
  const rowCount = row === rows - 1 ? count - cols * (rows - 1) : cols;
  const rowW = rowCount * COL_PITCH;
  const x0 = -gridW / 2 + COL_PITCH / 2;
  const z0 = gridD / 2 - ROW_PITCH / 2; // front row toward +Z
  const rowOffsetX = (gridW - rowW) / 2;
  return {
    x: x0 + rowOffsetX + col * COL_PITCH,
    // Sit on the well surface (same clearance every row)
    y: row * ROW_RISE + WELL_Y + WELL_H / 2 + FLAP_LIFT,
    z: z0 - row * ROW_PITCH,
    row,
  };
}

function CardFace({
  agent,
  selected,
  guessArmed,
  compact,
  large,
}: {
  agent: ValorantAgent;
  selected?: boolean;
  guessArmed?: boolean;
  compact?: boolean;
  /** Fill more of the preview pane. */
  large?: boolean;
}) {
  const theme = roleMeta(agent.role);
  const w = large ? 248 : compact ? 124 : 140;
  const h = large ? 396 : compact ? 192 : 225;
  const portraitH = large ? 272 : compact ? 128 : 152;
  const nameSize = large ? 13 : 10;
  const metaSize = large ? 10 : 7;
  return (
    <div
      className={[
        "flex h-full w-full flex-col overflow-hidden rounded-[5px] border-[3px] shadow-sm",
        selected
          ? "border-amber-300"
          : guessArmed
            ? "border-rose-400"
            : "border-white/90",
      ].join(" ")}
      style={{ width: w, height: h }}
    >
      <div
        className="relative w-full shrink-0 overflow-hidden"
        style={{
          height: portraitH,
          background:
            "linear-gradient(180deg, #cfcfcf 0%, #ffffff 6%, #ffffff 94%, #cfcfcf 100%)",
        }}
      >
        <img
          src={agent.icon}
          alt=""
          className="absolute inset-0 h-full w-full object-contain object-bottom"
          draggable={false}
        />
      </div>
      <div
        className="flex min-h-0 flex-1 flex-col justify-center px-1.5 py-1.5"
        style={{ backgroundColor: theme.bar }}
      >
        <div
          className="truncate text-center font-bold uppercase tracking-wide"
          style={{ color: "#ffffff", fontSize: nameSize }}
        >
          {agent.name}
        </div>
        <div className="mt-0.5 flex items-center justify-center gap-1">
          <img
            src={theme.icon}
            alt=""
            className={[
              "shrink-0 object-contain opacity-95",
              large ? "size-4" : "size-2.5",
            ].join(" ")}
            draggable={false}
          />
          <span
            className="truncate font-semibold uppercase tracking-wider"
            style={{ color: theme.accent, fontSize: metaSize }}
          >
            {agent.role}
          </span>
        </div>
        <div className="mt-0.5 border-t border-white/15 pt-0.5">
          <div
            className="truncate text-center leading-tight"
            style={{ color: "#ffffff", fontSize: metaSize }}
          >
            {agent.origin} — {agent.kind}
          </div>
        </div>
      </div>
    </div>
  );
}

const FACE_TEX_W = 288;
const FACE_TEX_H = 448;
/** Pixel rim matching FRAME / outer flap so plastic + face are one texture. */
const FACE_TEX_RIM = Math.round(FACE_TEX_W * (FRAME / (CARD_W + FRAME * 2)));

/** Full flap front (theme plastic rim + card) as one mesh-locked canvas texture. */
function useFlapFaceTexture(
  agent: ValorantAgent,
  selected?: boolean,
  guessArmed?: boolean,
  blinded?: boolean,
) {
  const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null);
  const role = roleMeta(agent.role);
  const palette = useBoardPalette();
  const cardEdge = selected ? "#fcd34d" : guessArmed ? "#fb7185" : "#ffffff";

  useLayoutEffect(() => {
    let cancelled = false;
    const canvas = document.createElement("canvas");
    canvas.width = FACE_TEX_W;
    canvas.height = FACE_TEX_H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // One texture for this effect — redraw canvas + needsUpdate (never
    // dispose a texture still bound to the material; that shows as white).
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 4;
    map.flipY = true;

    const paint = (portrait: HTMLImageElement | null) => {
      if (cancelled) return;
      const W = FACE_TEX_W;
      const H = FACE_TEX_H;
      const rim = FACE_TEX_RIM;
      ctx.clearRect(0, 0, W, H);

      // Yellow-ish plastic frame (golden) with a brighter highlight edge
      ctx.fillStyle = palette.flap;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = palette.flapHi;
      ctx.fillRect(2, 2, W - 4, H - 4);
      ctx.fillStyle = palette.flap;
      ctx.fillRect(5, 5, W - 10, H - 10);

      const x0 = rim;
      const y0 = rim;
      const cw = W - rim * 2;
      const ch = H - rim * 2;
      ctx.fillStyle = cardEdge;
      ctx.fillRect(x0, y0, cw, ch);
      const inset = 5;
      const ix = x0 + inset;
      const iy = y0 + inset;
      const iw = cw - inset * 2;
      const ih = ch - inset * 2;

      if (blinded) {
        // Phoenix flash — blank face plate, no portrait / name
        const flash = ctx.createLinearGradient(0, iy, 0, iy + ih);
        flash.addColorStop(0, "#fff7ed");
        flash.addColorStop(0.45, "#fdba74");
        flash.addColorStop(1, "#fb923c");
        ctx.fillStyle = flash;
        ctx.fillRect(ix, iy, iw, ih);
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.font = "bold 120px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("?", W / 2, iy + ih * 0.48, iw - 16);
        map.needsUpdate = true;
        return;
      }

      const portraitH = Math.floor(ih * 0.68);

      const grad = ctx.createLinearGradient(0, iy, 0, iy + portraitH);
      grad.addColorStop(0, "#cfcfcf");
      grad.addColorStop(0.08, "#ffffff");
      grad.addColorStop(0.92, "#ffffff");
      grad.addColorStop(1, "#cfcfcf");
      ctx.fillStyle = grad;
      ctx.fillRect(ix, iy, iw, portraitH);

      if (portrait && portrait.naturalWidth > 0) {
        const scale = Math.min(
          iw / portrait.naturalWidth,
          portraitH / portrait.naturalHeight,
        );
        const dw = portrait.naturalWidth * scale;
        const dh = portrait.naturalHeight * scale;
        const dx = ix + (iw - dw) / 2;
        const dy = iy + portraitH - dh;
        ctx.drawImage(portrait, dx, dy, dw, dh);
      }

      ctx.fillStyle = role.bar;
      ctx.fillRect(ix, iy + portraitH, iw, ih - portraitH);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 26px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const nameY = iy + portraitH + 32;
      ctx.fillText(agent.name.toUpperCase(), W / 2, nameY, iw - 12);

      ctx.fillStyle = role.accent;
      ctx.font = "600 15px system-ui, sans-serif";
      ctx.fillText(agent.role.toUpperCase(), W / 2, nameY + 26, iw - 12);

      ctx.strokeStyle = "rgba(255,255,255,0.2)";
      ctx.beginPath();
      ctx.moveTo(ix + 10, nameY + 40);
      ctx.lineTo(ix + iw - 10, nameY + 40);
      ctx.stroke();

      ctx.fillStyle = "#ffffff";
      ctx.font = "13px system-ui, sans-serif";
      ctx.fillText(
        `${agent.origin} — ${agent.kind}`,
        W / 2,
        nameY + 56,
        iw - 12,
      );

      map.needsUpdate = true;
    };

    paint(null);
    setTexture(map);

    if (blinded) {
      return () => {
        cancelled = true;
        setTexture(null);
        map.dispose();
      };
    }

    const img = new Image();
    img.decoding = "async";
    img.crossOrigin = "anonymous";
    img.onload = () => paint(img);
    img.onerror = () => paint(null);
    img.src = agent.icon;

    return () => {
      cancelled = true;
      img.onload = null;
      img.onerror = null;
      setTexture(null);
      map.dispose();
    };
  }, [
    agent.id,
    agent.name,
    agent.icon,
    agent.origin,
    agent.kind,
    agent.role,
    cardEdge,
    role.accent,
    role.bar,
    palette.flap,
    palette.flapHi,
    blinded,
  ]);

  return texture;
}

/** Front plane sized to the full plastic flap — texture includes the rim. */
function FlapFace({
  agent,
  selected,
  guessArmed,
  blinded,
  width,
  height,
}: {
  agent: ValorantAgent;
  selected?: boolean;
  guessArmed?: boolean;
  blinded?: boolean;
  width: number;
  height: number;
}) {
  const map = useFlapFaceTexture(agent, selected, guessArmed, blinded);
  const { flap } = useBoardPalette();
  return (
    <mesh position={[0, 0, CARD_D / 2 + 0.001]}>
      <planeGeometry args={[width, height]} />
      {map ? (
        <meshBasicMaterial
          key={map.uuid}
          map={map}
          toneMapped={false}
          onUpdate={(m) => {
            if (m.map) m.map.needsUpdate = true;
          }}
        />
      ) : (
        <meshBasicMaterial color={flap} toneMapped={false} />
      )}
    </mesh>
  );
}

/**
 * Real Guess Who flap: hinged at the BOTTOM, stands upright facing the player,
 * flips ~90° away into the tray (plastic back up).
 */
function FlipFlap({
  agent,
  position,
  flipped,
  selected,
  guessArmed,
  blinded,
  disabled,
  onClick,
  onHover,
}: {
  agent: ValorantAgent;
  position: [number, number, number];
  flipped: boolean;
  selected?: boolean;
  guessArmed?: boolean;
  blinded?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  onHover?: (id: string | null) => void;
}) {
  const hinge = useRef<THREE.Group>(null);
  const { flap } = useBoardPalette();
  const frameColor = useMemo(() => new THREE.Color(flap), [flap]);

  useFrame((_, dt) => {
    if (!hinge.current) return;
    const target = flipped ? Math.PI / 2 : UPRIGHT_LEAN;
    hinge.current.rotation.x = THREE.MathUtils.damp(
      hinge.current.rotation.x,
      target,
      12,
      dt,
    );
  });

  const fw = FLAP_W;
  const fh = FLAP_H;

  const bindHover = {
    onPointerOver: (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      onHover?.(agent.id);
      if (!disabled) document.body.style.cursor = "pointer";
    },
    onPointerOut: () => {
      onHover?.(null);
      document.body.style.cursor = "auto";
    },
  };

  return (
    <group position={position}>
      <group ref={hinge} position={[0, 0, 0]}>
        {/* Hinge at flap bottom — body center is half flap height up */}
        <group position={[0, fh / 2, 0]}>
          <mesh
            castShadow
            onClick={(e) => {
              e.stopPropagation();
              if (!disabled) onClick?.();
            }}
            onPointerDown={(e) => e.stopPropagation()}
            {...bindHover}
          >
            <boxGeometry args={[fw, fh, CARD_D]} />
            <meshStandardMaterial
              color={frameColor}
              roughness={0.55}
              metalness={0.02}
            />
          </mesh>

          {/* Same size as plastic box front — rim is painted in the texture */}
          <FlapFace
            agent={agent}
            selected={selected}
            guessArmed={guessArmed}
            blinded={blinded}
            width={fw}
            height={fh}
          />
        </group>
      </group>
    </group>
  );
}

function MysteryStand({
  agent,
  boardDepth,
}: {
  agent: ValorantAgent | null;
  boardDepth: number;
}) {
  const { mystery, flap, lip } = useBoardPalette();
  const plastic = usePlasticMaps();
  const z = boardDepth / 2 + 0.85;
  const fw = FLAP_W;
  const fh = FLAP_H;
  return (
    <group position={[0, 0.08, z]}>
      <mesh position={[0, 0.06, 0]} castShadow>
        <boxGeometry args={[CARD_W + 0.25, 0.12, 0.35]} />
        <meshStandardMaterial
          color={mystery}
          {...plasticSurfaceProps(plastic, 0.055)}
        />
      </mesh>
      <group position={[0, 0.12, 0]}>
        <group rotation={[0, 0, 0]}>
          <group position={[0, fh / 2, 0]}>
            <mesh castShadow>
              <boxGeometry args={[fw, fh, CARD_D]} />
              <meshStandardMaterial
                color={flap}
                roughness={0.55}
                metalness={0.02}
              />
            </mesh>
            {agent ? (
              <FlapFace agent={agent} width={fw} height={fh} />
            ) : (
              <mesh position={[0, 0, CARD_D / 2 + 0.001]}>
                <planeGeometry args={[fw, fh]} />
                <meshStandardMaterial
                  color={lip}
                  {...plasticSurfaceProps(plastic, 0.04)}
                />
              </mesh>
            )}
          </group>
        </group>
      </group>
    </group>
  );
}

function BoardBase({
  gridW,
  gridD,
  rows,
}: {
  gridW: number;
  gridD: number;
  rows: number;
}) {
  const { tray, terrace, well, lip } = useBoardPalette();
  const plastic = usePlasticMaps();
  const w = gridW + 0.75;
  const d = gridD + 0.7;
  return (
    <group>
      {/* Shallow foundation — keep below wells so flipped flaps don't clip */}
      <mesh position={[0, -0.06, 0]} receiveShadow castShadow>
        <boxGeometry args={[w, 0.12, d]} />
        <meshStandardMaterial
          color={tray}
          {...plasticSurfaceProps(plastic, 0.07)}
        />
      </mesh>

      {/* Per-row terraces + recessed wells (flip landing pads) */}
      {Array.from({ length: rows }, (_, row) => {
        const rise = row * ROW_RISE;
        const z = gridD / 2 - ROW_PITCH / 2 - row * ROW_PITCH;
        return (
          <group key={row}>
            {/* Solid riser under elevated rows (and a pad under row 0) */}
            <mesh
              position={[0, Math.max(rise, 0.02) / 2 - 0.01, z]}
              receiveShadow
              castShadow
            >
              <boxGeometry
                args={[
                  gridW + 0.28,
                  Math.max(rise, 0.02) + 0.02,
                  ROW_PITCH * 0.92,
                ]}
              />
              <meshStandardMaterial
                color={tray}
                {...plasticSurfaceProps(plastic, 0.065)}
              />
            </mesh>
            <mesh position={[0, rise + TERRACE_Y, z]} receiveShadow>
              <boxGeometry args={[gridW + 0.28, TERRACE_H, ROW_PITCH * 0.92]} />
              <meshStandardMaterial
                color={terrace}
                {...plasticSurfaceProps(plastic, 0.06)}
              />
            </mesh>
            <mesh position={[0, rise + WELL_Y, z]} receiveShadow>
              <boxGeometry args={[gridW + 0.12, WELL_H, ROW_PITCH * 0.72]} />
              <meshStandardMaterial
                color={well}
                {...plasticSurfaceProps(plastic, 0.05)}
              />
            </mesh>
          </group>
        );
      })}

      {/* Front lip */}
      <mesh position={[0, 0.05, d / 2 - 0.1]} castShadow>
        <boxGeometry args={[w * 0.98, 0.12, 0.18]} />
        <meshStandardMaterial
          color={lip}
          {...plasticSurfaceProps(plastic, 0.055)}
        />
      </mesh>
    </group>
  );
}

function BoardScene({
  agents,
  flippedIds,
  secretId,
  selectedId,
  guessArmed,
  facesBlinded,
  disabled,
  cameraResetNonce,
  onAgentClick,
  onHoverAgent,
}: {
  agents: readonly ValorantAgent[];
  flippedIds: readonly string[];
  secretId?: string | null;
  selectedId?: string | null;
  guessArmed?: boolean;
  facesBlinded?: boolean;
  disabled?: boolean;
  cameraResetNonce: number;
  onAgentClick?: (id: string) => void;
  onHoverAgent?: (id: string | null) => void;
}) {
  const flipped = useMemo(() => new Set(flippedIds), [flippedIds]);
  const meta = gridMeta(agents.length);
  const secret = agentById(secretId ?? null);
  const { lip } = useBoardPalette();
  const { camera } = useThree();
  const controlsRef = useRef<THREE.EventDispatcher & {
    target: THREE.Vector3;
    update: () => void;
  } | null>(null);

  useLayoutEffect(() => {
    if (cameraResetNonce === 0) return;
    camera.position.set(...DEFAULT_CAMERA_POS);
    const controls = controlsRef.current;
    if (controls) {
      controls.target.set(...DEFAULT_CONTROLS_TARGET);
      controls.update();
    }
  }, [cameraResetNonce, camera]);

  return (
    <>
      <ambientLight intensity={0.62} />
      <directionalLight
        castShadow
        intensity={1.15}
        position={[3.5, 10, 6]}
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight intensity={0.35} position={[-4, 5, 2.5]} />
      <hemisphereLight args={[lip, "#0f172a", 0.42]} />

      <BoardBase gridW={meta.gridW} gridD={meta.gridD} rows={meta.rows} />

      {agents.map((agent, i) => {
        const { x, y, z } = slotPos(i, agents.length);
        return (
          <FlipFlap
            key={agent.id}
            agent={agent}
            position={[x, y, z]}
            flipped={flipped.has(agent.id)}
            selected={selectedId === agent.id}
            guessArmed={Boolean(guessArmed) && !flipped.has(agent.id)}
            blinded={facesBlinded}
            disabled={disabled}
            onClick={() => onAgentClick?.(agent.id)}
            onHover={onHoverAgent}
          />
        );
      })}

      <MysteryStand agent={secret} boardDepth={meta.gridD} />

      <OrbitControls
        ref={controlsRef as never}
        makeDefault
        enablePan={false}
        minDistance={6}
        maxDistance={18}
        maxPolarAngle={Math.PI * 0.5}
        minPolarAngle={Math.PI * 0.28}
        target={DEFAULT_CONTROLS_TARGET}
      />
    </>
  );
}

export function GuessWhoBoard3D({
  agents,
  flippedIds,
  secretId,
  selectedId,
  guessArmed,
  facesBlinded,
  disabled,
  canGuess,
  canPass,
  canToggleFlip,
  immersive,
  onAgentClick,
  onToggleFlip,
  onToggleGuess,
  onPass,
}: {
  agents: readonly ValorantAgent[];
  flippedIds: readonly string[];
  secretId?: string | null;
  selectedId?: string | null;
  guessArmed?: boolean;
  /** Phoenix flash — hide face textures on this board. */
  facesBlinded?: boolean;
  disabled?: boolean;
  canGuess?: boolean;
  canPass?: boolean;
  /** Checklist can flip even when the 3D board is in guess mode. */
  canToggleFlip?: boolean;
  immersive?: boolean;
  onAgentClick?: (id: string) => void;
  onToggleFlip?: (id: string) => void;
  onToggleGuess?: () => void;
  onPass?: () => void;
}) {
  const palette = useGuessWhoPalette();
  const plasticMaps = usePlasticSurfaceMaps(2.8, 2.2);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [cameraResetNonce, setCameraResetNonce] = useState(0);
  const hovered = agentById(hoveredId);
  const flippedSet = useMemo(() => new Set(flippedIds), [flippedIds]);

  return (
    <BoardPaletteContext.Provider value={palette}>
      <PlasticMapsContext.Provider value={plasticMaps}>
      <div
        className={["mt-2 flex min-h-0 gap-2", immersive ? "flex-1" : ""].join(
          " ",
        )}
      >
        {/* Left — flip checklist */}
        <aside
          className={[
            "flex w-[11.5rem] shrink-0 flex-col overflow-hidden rounded-2xl border border-border/80 bg-surface/40",
            immersive ? "min-h-0" : "h-[32rem] sm:h-[38rem]",
          ].join(" ")}
        >
          <div className="shrink-0 border-b border-border/60 px-2.5 py-2">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-muted">
              Flip list
            </div>
            <div className="text-[10px] text-muted/80">
              {facesBlinded
                ? "Phoenix flash — faces hidden"
                : "Check = flipped down"}
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-1.5 py-1.5">
            {agents.map((agent) => {
              const isFlipped = flippedSet.has(agent.id);
              return (
                <label
                  key={agent.id}
                  className={[
                    "flex cursor-pointer items-center gap-2 rounded-lg px-1.5 py-1 text-[11px] transition hover:bg-white/[0.06]",
                    isFlipped ? "text-muted" : "text-white",
                    !canToggleFlip ? "cursor-not-allowed opacity-50" : "",
                  ].join(" ")}
                  onMouseEnter={() =>
                    facesBlinded ? undefined : setHoveredId(agent.id)
                  }
                  onMouseLeave={() => setHoveredId(null)}
                >
                  <input
                    type="checkbox"
                    className="size-3.5 shrink-0 rounded border-white/20 bg-black/30"
                    checked={isFlipped}
                    disabled={!canToggleFlip}
                    onChange={() => {
                      if (canToggleFlip) onToggleFlip?.(agent.id);
                    }}
                  />
                  {facesBlinded ? (
                    <span
                      className="flex size-5 shrink-0 items-center justify-center rounded bg-orange-400/80 text-[10px] font-bold text-white"
                      aria-hidden
                    >
                      ?
                    </span>
                  ) : (
                    <img
                      src={agent.icon}
                      alt=""
                      className={[
                        "size-5 shrink-0 rounded object-cover",
                        isFlipped ? "opacity-45" : "",
                      ].join(" ")}
                      draggable={false}
                    />
                  )}
                  <span
                    className={[
                      "min-w-0 truncate font-medium",
                      isFlipped
                        ? "line-through decoration-2 decoration-muted"
                        : "",
                    ].join(" ")}
                  >
                    {facesBlinded ? "???" : agent.name}
                  </span>
                </label>
              );
            })}
          </div>
        </aside>

        {/* Center — 3D board */}
        <div
          className={[
            "relative min-w-0 flex-1 overflow-hidden rounded-2xl border-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]",
            immersive ? "min-h-0" : "h-[32rem] sm:h-[38rem]",
          ].join(" ")}
          style={{
            borderColor: `${palette.lip}cc`,
            // Soft plate like the agent card portrait background
            background:
              "linear-gradient(180deg, #cfcfcf 0%, #ffffff 8%, #ffffff 78%, #d0d0d4 100%)",
          }}
        >
          <button
            type="button"
            onClick={() => setCameraResetNonce((n) => n + 1)}
            className="absolute right-2 top-2 z-10 rounded-lg border border-black/15 bg-white/85 px-2.5 py-1.5 text-[11px] font-semibold text-slate-800 shadow-sm backdrop-blur-sm transition hover:bg-white"
            title="Reset camera to default view"
          >
            Reset view
          </button>
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center text-xs text-muted">
                Loading board…
              </div>
            }
          >
            <Canvas
              shadows
              camera={{
                position: DEFAULT_CAMERA_POS,
                fov: DEFAULT_CAMERA_FOV,
              }}
              gl={{ antialias: true, alpha: true }}
              onCreated={({ gl }) => {
                gl.setClearColor(0x000000, 0);
              }}
            >
              <BoardScene
                agents={agents}
                flippedIds={flippedIds}
                secretId={secretId}
                selectedId={selectedId}
                guessArmed={guessArmed}
                facesBlinded={facesBlinded}
                disabled={disabled}
                cameraResetNonce={cameraResetNonce}
                onAgentClick={onAgentClick}
                onHoverAgent={setHoveredId}
              />
            </Canvas>
          </Suspense>
        </div>

        {/* Right — CTAs + hover preview */}
        <aside
          className={[
            "flex w-[17.5rem] shrink-0 flex-col overflow-hidden rounded-2xl border border-border/80 bg-surface/40",
            immersive ? "min-h-0" : "h-[32rem] sm:h-[38rem]",
          ].join(" ")}
        >
          <div className="flex shrink-0 flex-col gap-1.5 border-b border-border/60 p-2">
            <button
              type="button"
              disabled={!canGuess}
              onClick={() => onToggleGuess?.()}
              className="w-full rounded-xl border px-2.5 py-2 text-xs font-bold tracking-wide disabled:opacity-40"
              style={
                guessArmed
                  ? {
                      backgroundColor: "#047857",
                      borderColor: "#6ee7b7",
                      color: "#ffffff",
                    }
                  : {
                      backgroundColor: "#065f46",
                      borderColor: "#34d399",
                      color: "#ffffff",
                    }
              }
            >
              {guessArmed ? "Cancel guess" : "Guess"}
            </button>
            <button
              type="button"
              disabled={!canPass}
              onClick={() => onPass?.()}
              className="w-full rounded-xl border px-2.5 py-2 text-xs font-bold tracking-wide disabled:opacity-40"
              style={{
                backgroundColor: "#0369a1",
                borderColor: "#38bdf8",
                color: "#ffffff",
              }}
            >
              Pass
            </button>
          </div>
          <div className="flex min-h-0 flex-1 items-start justify-center px-2.5 pb-2.5 pt-8">
            {hovered && !facesBlinded ? (
              <CardFace
                agent={hovered}
                large
                guessArmed={
                  Boolean(guessArmed) && !flippedSet.has(hovered.id)
                }
              />
            ) : facesBlinded ? (
              <p className="px-2 pt-6 text-center text-[11px] leading-snug text-muted">
                Flashed — agent faces are hidden until you finish your turn.
              </p>
            ) : null}
          </div>
        </aside>
      </div>
      </PlasticMapsContext.Provider>
    </BoardPaletteContext.Provider>
  );
}
