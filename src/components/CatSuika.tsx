import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber'
import {
  BallCollider,
  CuboidCollider,
  Physics,
  RigidBody,
  type RapierRigidBody,
} from '@react-three/rapier'
import {
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MutableRefObject,
} from 'react'
import * as THREE from 'three'
import { useSharedSuika } from '../hooks/useSharedSuika'
import { useThemeCssColor } from '../hooks/useThemeCssColor'
import { ArcadeStage, ArcadeStatus } from './ArcadeStage'
import { ThemeClearColor } from './ThemeClearColor'
import { petIdleSrc } from '../lib/petAssets'
import {
  advanceDropQueue,
  BOWL_FLOOR_Y,
  BOWL_HALF_W,
  BOWL_WALL_H,
  BOWL_WALL_T,
  clampDropX,
  countPiecesOfTier,
  createPiece,
  DANGER_Y,
  DROP_Y,
  flipPiecesVertical,
  SUIKA_FINAL_MERGE_SCORE,
  SUIKA_LOOP_SIZE,
  SUIKA_MAX_TIER,
  SUIKA_SKILLS_UNLIMITED,
  SUIKA_TIERS,
  snipeLowestTier,
  suikaViewBounds,
  swapTwoPiecePositions,
  withHighScore,
  withSkillScoreRefresh,
  type SuikaGameState,
  type SuikaLivePose,
  type SuikaPiece,
} from '../lib/suika'

type LocalPiece = SuikaPiece & { merging?: boolean }
type SkillKind =
  | 'shake'
  | 'float'
  | 'snipe'
  | 'flip'
  | 'magnet'
  | 'compress'
  | 'swap'

const SUIKA_VIEW = suikaViewBounds()
const SUIKA_CANVAS_ASPECT =
  (SUIKA_VIEW.xMax - SUIKA_VIEW.xMin) / (SUIKA_VIEW.yMax - SUIKA_VIEW.yMin)


/** Z angle from a Rapier quaternion (we only enable Z rotation). */
function rotFromBody(body: RapierRigidBody): number {
  const q = body.rotation()
  return Math.atan2(2 * q.w * q.z, q.w * q.w - q.z * q.z)
}

/** Frame the jar exactly — canvas CSS aspect matches these bounds. */
function BowlCamera() {
  const size = useThree((s) => s.size)
  const camera = useThree((s) => s.camera) as THREE.OrthographicCamera & {
    manual?: boolean
  }

  const fit = useCallback(() => {
    const { xMin, xMax, yMin, yMax } = suikaViewBounds()
    const midX = (xMin + xMax) / 2
    const midY = (yMin + yMax) / 2
    const jarHalfW = (xMax - xMin) / 2
    const jarHalfH = (yMax - yMin) / 2
    const aspect = size.width / Math.max(size.height, 1)
    // Tiny pad so walls aren't clipped by AA; canvas aspect matches jar.
    const pad = 1.01
    let halfW = jarHalfW * pad
    let halfH = jarHalfH * pad
    if (halfW / halfH < aspect) halfW = halfH * aspect
    else halfH = halfW / aspect
    camera.manual = true
    camera.left = -halfW
    camera.right = halfW
    camera.top = halfH
    camera.bottom = -halfH
    camera.zoom = 1
    camera.near = 0.1
    camera.far = 50
    camera.position.set(midX, midY, 12)
    camera.lookAt(midX, midY, 0)
    camera.updateProjectionMatrix()
  }, [camera, size.height, size.width])

  useLayoutEffect(() => {
    fit()
  }, [fit])

  useFrame(() => {
    fit()
  })

  return null
}

function PieceVisual({
  tier,
  radius,
}: {
  tier: number
  radius: number
}) {
  const theme = SUIKA_TIERS[tier]!
  const texture = useLoader(THREE.TextureLoader, petIdleSrc(theme.icon))
  texture.colorSpace = THREE.SRGBColorSpace
  const face = radius * 1.55
  const isFinal = tier === SUIKA_MAX_TIER
  const secondLoop = tier >= SUIKA_LOOP_SIZE
  return (
    <group>
      {/* Colored disc body */}
      <mesh raycast={() => null}>
        <circleGeometry args={[radius, 36]} />
        <meshStandardMaterial
          color={theme.color}
          roughness={0.55}
          metalness={isFinal ? 0.35 : secondLoop ? 0.14 : 0.05}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Soft rim */}
      <mesh position={[0, 0, 0.005]} raycast={() => null}>
        <ringGeometry args={[radius * 0.88, radius, 36]} />
        <meshStandardMaterial
          color={isFinal ? '#fff4c2' : '#ffffff'}
          roughness={0.7}
          transparent
          opacity={isFinal ? 0.45 : secondLoop ? 0.3 : 0.22}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      {/* White badge + cat face */}
      <mesh position={[0, 0, 0.01]} raycast={() => null}>
        <circleGeometry args={[face * 0.48, 28]} />
        <meshStandardMaterial
          color="#ffffff"
          roughness={0.85}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0, 0, 0.015]} raycast={() => null}>
        <planeGeometry args={[face, face]} />
        <meshStandardMaterial
          map={texture}
          transparent
          roughness={0.45}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}

function StaticPiece({ piece }: { piece: SuikaPiece }) {
  const r = SUIKA_TIERS[piece.tier]?.radius ?? 0.3
  return (
    <group position={[piece.x, piece.y, 0]} rotation={[0, 0, piece.rot ?? 0]}>
      <Suspense fallback={null}>
        <PieceVisual tier={piece.tier} radius={r} />
      </Suspense>
    </group>
  )
}

function DynamicPiece({
  piece,
  bodyRef,
  onMerge,
  locked,
}: {
  piece: LocalPiece
  bodyRef: (id: string, body: RapierRigidBody | null) => void
  onMerge: (a: string, b: string) => void
  locked: boolean
}) {
  const r = SUIKA_TIERS[piece.tier]?.radius ?? 0.3
  const mergingRef = useRef(piece.merging)
  mergingRef.current = piece.merging

  const setRefs = useCallback(
    (body: RapierRigidBody | null) => {
      bodyRef(piece.id, body)
    },
    [bodyRef, piece.id],
  )

  useEffect(() => {
    return () => bodyRef(piece.id, null)
  }, [bodyRef, piece.id])

  return (
    <RigidBody
      ref={setRefs}
      colliders={false}
      position={[piece.x, piece.y, 0]}
      rotation={[0, 0, piece.rot ?? 0]}
      enabledTranslations={[true, true, false]}
      enabledRotations={[false, false, true]}
      // Heavier + bouncier + free Z-spin so pieces tip/roll off peaks.
      mass={1.1 + piece.tier * 0.65}
      linearDamping={0.05}
      angularDamping={0.28}
      ccd
      type={locked ? 'fixed' : 'dynamic'}
      onCollisionEnter={({ other }) => {
        if (locked || mergingRef.current) return
        const otherId = other.rigidBodyObject?.name
        if (typeof otherId === 'string' && otherId.startsWith('suika-')) {
          onMerge(piece.id, otherId.slice('suika-'.length))
        }
      }}
      name={`suika-${piece.id}`}
      userData={{ pieceId: piece.id, tier: piece.tier }}
    >
      <BallCollider args={[r]} friction={0.22} restitution={0.28} />
      <Suspense fallback={null}>
        <PieceVisual tier={piece.tier} radius={r} />
      </Suspense>
    </RigidBody>
  )
}

function Bowl() {
  const wallT = BOWL_WALL_T
  const floorT = BOWL_WALL_T
  const depth = 1.6
  const innerH = BOWL_WALL_H
  const rim = 0.12
  const wallColor = useThemeCssColor('--color-muted', '#6b5f7a')
  const floorColor = useThemeCssColor('--color-surface-raised', '#8a7c9a')
  const backColor = useThemeCssColor('--color-app-bg', '#241c30')
  const rimColor = useThemeCssColor('--color-app-text', '#a899b8')

  return (
    <group>
      <mesh position={[0, innerH / 2, -depth * 0.45]} receiveShadow>
        <boxGeometry args={[BOWL_HALF_W * 2 + wallT * 2, innerH + floorT, 0.06]} />
        <meshStandardMaterial
          color={backColor}
          roughness={0.9}
          transparent
          opacity={0.55}
        />
      </mesh>

      {/* Thick floor — top face at y=0 so drops don't tunnel through */}
      <RigidBody type="fixed" colliders={false} position={[0, BOWL_FLOOR_Y - floorT / 2, 0]}>
        <CuboidCollider args={[BOWL_HALF_W + wallT, floorT / 2, depth / 2]} friction={0.4} restitution={0.12} />
        <mesh castShadow receiveShadow>
          <boxGeometry args={[BOWL_HALF_W * 2 + wallT * 2, floorT, depth]} />
          <meshStandardMaterial color={floorColor} roughness={0.75} metalness={0.08} />
        </mesh>
      </RigidBody>

      <RigidBody
        type="fixed"
        colliders={false}
        position={[-BOWL_HALF_W - wallT / 2, innerH / 2, 0]}
      >
        <CuboidCollider args={[wallT / 2, innerH / 2 + 0.4, depth / 2]} friction={0.35} restitution={0.15} />
        <mesh castShadow receiveShadow>
          <boxGeometry args={[wallT, innerH, depth]} />
          <meshStandardMaterial color={wallColor} roughness={0.7} metalness={0.06} />
        </mesh>
        <mesh position={[0, innerH / 2 + rim / 2, 0]}>
          <boxGeometry args={[wallT + 0.06, rim, depth + 0.08]} />
          <meshStandardMaterial color={rimColor} roughness={0.55} />
        </mesh>
      </RigidBody>

      <RigidBody
        type="fixed"
        colliders={false}
        position={[BOWL_HALF_W + wallT / 2, innerH / 2, 0]}
      >
        <CuboidCollider args={[wallT / 2, innerH / 2 + 0.4, depth / 2]} friction={0.35} restitution={0.15} />
        <mesh castShadow receiveShadow>
          <boxGeometry args={[wallT, innerH, depth]} />
          <meshStandardMaterial color={wallColor} roughness={0.7} metalness={0.06} />
        </mesh>
        <mesh position={[0, innerH / 2 + rim / 2, 0]}>
          <boxGeometry args={[wallT + 0.06, rim, depth + 0.08]} />
          <meshStandardMaterial color={rimColor} roughness={0.55} />
        </mesh>
      </RigidBody>

      <mesh position={[0, BOWL_FLOOR_Y + 0.02, depth / 2 + 0.02]}>
        <boxGeometry args={[BOWL_HALF_W * 2 + wallT * 2, 0.04, 0.04]} />
        <meshStandardMaterial color={rimColor} roughness={0.55} />
      </mesh>

      {/* Flush with the inner wall faces (playable width). */}
      <mesh position={[0, DANGER_Y, depth / 2 + 0.01]}>
        <boxGeometry args={[BOWL_HALF_W * 2, 0.045, 0.03]} />
        <meshStandardMaterial
          color="#fb7185"
          emissive="#be123c"
          emissiveIntensity={0.35}
          transparent
          opacity={0.85}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}

function DropIndicator({
  x,
  tier,
  visible,
}: {
  x: number
  tier: number
  visible: boolean
}) {
  const r = SUIKA_TIERS[tier]?.radius ?? 0.3
  if (!visible) return null
  const holderY = DROP_Y + r + 0.55
  return (
    <group position={[x, 0, 0.2]}>
      <mesh position={[0, (DROP_Y + BOWL_FLOOR_Y) / 2, -0.15]}>
        <boxGeometry args={[0.035, DROP_Y - BOWL_FLOOR_Y, 0.01]} />
        <meshStandardMaterial
          color="#ffffff"
          transparent
          opacity={0.12}
          depthWrite={false}
        />
      </mesh>
      <group position={[0, holderY, 0]}>
        <mesh position={[0, 0.05, 0]}>
          <circleGeometry args={[0.28, 24]} />
          <meshStandardMaterial color="#f5e6c8" roughness={0.55} />
        </mesh>
        <mesh position={[-0.18, -0.02, 0.01]}>
          <circleGeometry args={[0.16, 20]} />
          <meshStandardMaterial color="#f5e6c8" roughness={0.55} />
        </mesh>
        <mesh position={[0.18, -0.02, 0.01]}>
          <circleGeometry args={[0.16, 20]} />
          <meshStandardMaterial color="#f5e6c8" roughness={0.55} />
        </mesh>
        <mesh position={[-0.08, 0.06, 0.02]}>
          <circleGeometry args={[0.025, 10]} />
          <meshStandardMaterial color="#3b2f2f" />
        </mesh>
        <mesh position={[0.08, 0.06, 0.02]}>
          <circleGeometry args={[0.025, 10]} />
          <meshStandardMaterial color="#3b2f2f" />
        </mesh>
        <mesh position={[0, 0.0, 0.02]}>
          <circleGeometry args={[0.045, 12]} />
          <meshStandardMaterial color="#3b2f2f" />
        </mesh>
      </group>
      <mesh position={[0, (holderY + DROP_Y) / 2, 0.01]}>
        <boxGeometry args={[0.04, Math.max(0.15, holderY - DROP_Y - r), 0.01]} />
        <meshStandardMaterial color="#d4c4a8" roughness={0.6} />
      </mesh>
      <group position={[0, DROP_Y, 0]}>
        <Suspense fallback={null}>
          <PieceVisual tier={tier} radius={r} />
        </Suspense>
      </group>
    </group>
  )
}

function SettleAndLive({
  active,
  bodies,
  piecesRef,
  onSettle,
  publishLive,
  dangerArmed,
  onGameOver,
  skillSafe,
}: {
  active: boolean
  bodies: Map<string, RapierRigidBody>
  piecesRef: MutableRefObject<LocalPiece[]>
  onSettle: (pieces: SuikaPiece[], scoreDelta: number) => void
  publishLive: (pieces: SuikaLivePose[] | null) => void
  dangerArmed: boolean
  onGameOver: () => void
  /** Shake/Float — never end the run from skill motion. */
  skillSafe: boolean
}) {
  /** Hard max sim time — skills get longer so shake/float can finish. */
  const MAX_SIM_S = skillSafe ? 5 : 2.5
  /** Don't commit a drop before the new ball has had time to exist + fall. */
  const MIN_DROP_SIM_S = 0.35
  const quietMs = useRef(0)
  const dangerMs = useRef(0)
  const elapsed = useRef(0)
  const settled = useRef(false)
  const liveAcc = useRef(0)
  const startedCount = useRef(0)

  const capturePieces = () => {
    const out: SuikaPiece[] = []
    for (const p of piecesRef.current) {
      if (p.merging) continue
      const body = bodies.get(p.id)
      const r = SUIKA_TIERS[p.tier]?.radius ?? 0.3
      // Skills must leave every disc fully under the danger line.
      const maxY = skillSafe ? DANGER_Y - r - 0.04 : Infinity
      if (body) {
        // Freeze in place so a rolling ball can't keep drifting past the cutoff.
        body.setLinvel({ x: 0, y: 0, z: 0 }, true)
        body.setAngvel({ x: 0, y: 0, z: 0 }, true)
        const t = body.translation()
        const y = Math.min(t.y < r * 0.5 ? r : t.y, maxY)
        const x = clampDropX(t.x, p.tier)
        out.push({
          id: p.id,
          tier: p.tier,
          x,
          y,
          rot: rotFromBody(body),
        })
      } else {
        out.push({
          id: p.id,
          tier: p.tier,
          x: clampDropX(p.x, p.tier),
          y: Math.min(Math.max(p.y, r), maxY),
          rot: p.rot ?? 0,
        })
      }
    }
    return out
  }

  const commitSettle = () => {
    let out = capturePieces()
    // Never wipe the bowl if capture glitched empty while we still had pieces.
    if (out.length === 0 && startedCount.current > 0) {
      out = piecesRef.current
        .filter((p) => !p.merging)
        .map((p) => {
          const r = SUIKA_TIERS[p.tier]?.radius ?? 0.3
          return {
            id: p.id,
            tier: p.tier,
            x: clampDropX(p.x, p.tier),
            y: Math.max(p.y, r),
            rot: p.rot ?? 0,
          }
        })
    }
    settled.current = true
    onSettle(out, 0)
  }

  useEffect(() => {
    quietMs.current = 0
    dangerMs.current = 0
    elapsed.current = 0
    settled.current = false
    startedCount.current = piecesRef.current.filter((p) => !p.merging).length
  }, [active, piecesRef])

  useFrame((_, dt) => {
    if (!active || settled.current) return

    elapsed.current += dt
    // Brief mount window only — hard cutoff still owns the clock.
    const inMountGrace = elapsed.current < 0.25

    liveAcc.current += dt
    if (liveAcc.current > 0.08) {
      liveAcc.current = 0
      const poses: SuikaLivePose[] = []
      for (const p of piecesRef.current) {
        if (p.merging) continue
        const body = bodies.get(p.id)
        if (!body) continue
        const t = body.translation()
        poses.push({ id: p.id, tier: p.tier, x: t.x, y: t.y })
      }
      publishLive(poses)
    }

    // Keep started count in case pieces arrive a frame late after claim.
    startedCount.current = Math.max(
      startedCount.current,
      piecesRef.current.filter((p) => !p.merging).length,
    )

    const expected = piecesRef.current.filter((p) => !p.merging).length
    let mounted = 0
    let loud = false
    let danger = false
    let spinOnly = false
    for (const p of piecesRef.current) {
      if (p.merging) {
        loud = true
        continue
      }
      const body = bodies.get(p.id)
      if (!body) continue
      mounted += 1
      const v = body.linvel()
      const a = body.angvel()
      const lin = Math.hypot(v.x, v.y, v.z)
      const ang = Math.hypot(a.x, a.y, a.z)
      const translating = lin > 0.16
      // Translation keeps the sim alive; leftover spin alone can settle early.
      if (translating) loud = true
      else if (ang > 0.35) {
        spinOnly = true
        // Bleed residual spin so we don't babysit a twirl until the hard cap.
        body.setAngvel({ x: 0, y: 0, z: a.z * 0.72 }, true)
      }
      const t = body.translation()
      const r = SUIKA_TIERS[p.tier]?.radius ?? 0.3
      const insideBowl = Math.abs(t.x) <= BOWL_HALF_W - r * 0.25
      // Classic Suika: only punish pieces resting above the line, not mid-fall.
      // Skills never count — shake/float can't end the run.
      // Escaped sideways pieces also don't count (containment should pull them back).
      if (
        dangerArmed &&
        !skillSafe &&
        !translating &&
        insideBowl &&
        t.y - r > DANGER_Y
      ) {
        danger = true
      }
    }

    // Hard cutoff — freeze + commit. Never game-over from a mid-air snapshot
    // (that was wiping drops that hadn't finished falling).
    if (elapsed.current >= MAX_SIM_S) {
      commitSettle()
      return
    }

    if (inMountGrace || mounted < expected || expected === 0) {
      quietMs.current = 0
      dangerMs.current = 0
      return
    }

    if (danger) {
      dangerMs.current += dt
      if (dangerMs.current > 1) {
        settled.current = true
        onGameOver()
        return
      }
    } else {
      dangerMs.current = 0
    }

    if (loud) {
      quietMs.current = 0
      return
    }
    quietMs.current += dt
    // Settle once translation dies; spin-only → shorter wait. Caps: drop 2.5s / skill 5s.
    const minSim = skillSafe
      ? spinOnly
        ? 1.2
        : 1.8
      : spinOnly
        ? 0.4
        : MIN_DROP_SIM_S
    const quietNeed = spinOnly ? 0.12 : skillSafe ? 0.28 : 0.22
    if (quietMs.current > quietNeed && elapsed.current >= minSim) {
      commitSettle()
    }
  })

  return null
}

function AimController({
  enabled,
  dropXRef,
  tier,
  onDrop,
  onAimChange,
}: {
  enabled: boolean
  dropXRef: MutableRefObject<number>
  tier: number
  onDrop: () => void
  onAimChange: (x: number) => void
}) {
  const { gl, camera } = useThree()
  const dragging = useRef(false)

  useEffect(() => {
    if (!enabled) return
    const el = gl.domElement
    el.style.cursor = 'grab'

    const toWorldX = (clientX: number) => {
      const rect = el.getBoundingClientRect()
      const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1
      const cam = camera as THREE.OrthographicCamera
      const halfW = (cam.right - cam.left) / (2 * cam.zoom)
      return clampDropX(ndcX * halfW, tier)
    }

    const aimAt = (clientX: number) => {
      const x = toWorldX(clientX)
      dropXRef.current = x
      onAimChange(x)
    }

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return
      dragging.current = true
      el.setPointerCapture(e.pointerId)
      el.style.cursor = 'grabbing'
      aimAt(e.clientX)
    }
    const onMove = (e: PointerEvent) => {
      aimAt(e.clientX)
    }
    const onUp = (e: PointerEvent) => {
      if (e.button !== 0) return
      aimAt(e.clientX)
      if (dragging.current) {
        dragging.current = false
        el.style.cursor = 'grab'
        onDrop()
      }
    }
    const onCancel = () => {
      dragging.current = false
      el.style.cursor = 'grab'
    }

    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointercancel', onCancel)
    return () => {
      el.style.cursor = ''
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointercancel', onCancel)
    }
  }, [camera, dropXRef, enabled, gl, onAimChange, onDrop, tier])

  return null
}

function SuikaWorld({
  game,
  ghosts,
  simActive,
  partnerBusy,
  bowlIdle,
  localPieces,
  dropTier,
  aiming,
  dropXRef,
  onAimDrop,
  onMerge,
  onSettle,
  onGameOver,
  publishLive,
  skillMode,
  magnetTier,
  bodiesRef,
}: {
  game: SuikaGameState
  ghosts: ReturnType<typeof useSharedSuika>['ghosts']
  simActive: boolean
  partnerBusy: boolean
  bowlIdle: boolean
  localPieces: LocalPiece[]
  dropTier: number
  aiming: boolean
  dropXRef: MutableRefObject<number>
  onAimDrop: () => void
  onMerge: (a: string, b: string) => void
  onSettle: (pieces: SuikaPiece[]) => void
  onGameOver: () => void
  publishLive: (pieces: SuikaLivePose[] | null) => void
  skillMode: SkillKind | null
  magnetTier: number
  bodiesRef: MutableRefObject<Map<string, RapierRigidBody>>
}) {
  const piecesRef = useRef(localPieces)
  piecesRef.current = localPieces
  const [guideX, setGuideX] = useState(0)
  const floatUntil = useRef(0)
  const shakeUntil = useRef(0)
  const magnetUntil = useRef(0)
  const compressUntil = useRef(0)
  const shakePulse = useRef(0)
  /** Alternating jar slam: -1 = left+fall, +1 = right+lift. */
  const shakeDir = useRef<-1 | 1>(-1)
  const onAimChange = useCallback((x: number) => {
    setGuideX(x)
  }, [])

  const setBody = useCallback((id: string, body: RapierRigidBody | null) => {
    if (body) bodiesRef.current.set(id, body)
    else bodiesRef.current.delete(id)
  }, [bodiesRef])

  useFrame((_, dt) => {
    if (!simActive) return
    const now = performance.now()

    if (skillMode === 'shake' && now < shakeUntil.current) {
      shakePulse.current += dt
      // Slow enough that pieces can travel toward a wall before the reverse.
      if (shakePulse.current >= 0.3) {
        shakePulse.current = 0
        const dir = shakeDir.current
        shakeDir.current = dir === -1 ? 1 : -1
        for (const p of piecesRef.current) {
          const body = bodiesRef.current.get(p.id)
          if (!body) continue
          body.wakeUp()
          // Slam hard toward one side; left sweeps fall, right sweeps hop higher.
          const slam = dir * (8.5 + Math.random() * 5)
          const vertical =
            dir < 0
              ? -(1.0 + Math.random() * 4.5) // fall while going left
              : 3.2 + Math.random() * 6.5 // bigger random lift on the reverse
          body.setLinvel({ x: slam, y: vertical, z: 0 }, true)
          body.setAngvel(
            { x: 0, y: 0, z: dir * (3 + Math.random() * 8) },
            true,
          )
        }
      }
    }

    // Magnet: pull next-tier pieces toward their subgroup centroid.
    let magnetCx = 0
    let magnetCy = 0
    let magnetN = 0
    if (skillMode === 'magnet' && now < magnetUntil.current) {
      for (const p of piecesRef.current) {
        if (p.tier !== magnetTier || p.merging) continue
        const body = bodiesRef.current.get(p.id)
        const t = body?.translation() ?? { x: p.x, y: p.y }
        magnetCx += t.x
        magnetCy += t.y
        magnetN += 1
      }
      if (magnetN > 0) {
        magnetCx /= magnetN
        magnetCy /= magnetN
      }
    }

    for (const p of piecesRef.current) {
      const body = bodiesRef.current.get(p.id)
      if (!body) continue
      const r = SUIKA_TIERS[p.tier]?.radius ?? 0.3
      const maxY = DANGER_Y - r - 0.04
      const maxX = BOWL_HALF_W - r - 0.06

      if (skillMode === 'float' && now < floatUntil.current) {
        // All pieces rise; smaller tiers get more lift / higher hover target.
        const sizeWeight =
          (SUIKA_MAX_TIER - p.tier) / Math.max(SUIKA_MAX_TIER, 1)
        const targetY =
          r + 0.45 + (maxY - r - 0.45) * (0.3 + sizeWeight * 0.7)
        const t = body.translation()
        const v = body.linvel()
        const err = targetY - t.y
        body.wakeUp()
        if (err > 0.04) {
          const rise = Math.min(
            7 + sizeWeight * 12,
            Math.max(2.2, err * (5 + sizeWeight * 9)),
          )
          body.setLinvel({ x: v.x * 0.65, y: Math.max(v.y, rise), z: 0 }, true)
        } else {
          // Soft hover once they reach their band.
          body.setLinvel(
            { x: v.x * 0.8, y: Math.min(v.y, 0.6 + sizeWeight), z: 0 },
            true,
          )
        }
      }

      if (
        skillMode === 'magnet' &&
        now < magnetUntil.current &&
        magnetN >= 2 &&
        p.tier === magnetTier
      ) {
        const t = body.translation()
        const v = body.linvel()
        const dx = magnetCx - t.x
        const dy = magnetCy - t.y
        const dist = Math.hypot(dx, dy)
        body.wakeUp()
        if (dist > 0.08) {
          const pull = Math.min(9, 3.5 + dist * 4)
          body.setLinvel(
            {
              x: v.x * 0.55 + (dx / dist) * pull,
              y: v.y * 0.55 + (dy / dist) * pull,
              z: 0,
            },
            true,
          )
        }
      }

      if (skillMode === 'compress' && now < compressUntil.current) {
        const t = body.translation()
        const v = body.linvel()
        body.wakeUp()
        // Toward center-X and slightly down.
        const pullX = -t.x * 4.2
        const pullY = -1.6
        body.setLinvel(
          {
            x: v.x * 0.7 + pullX * dt * 18,
            y: v.y * 0.75 + pullY,
            z: 0,
          },
          true,
        )
      }

      // Keep pieces inside the jar — side tunnels were causing false game overs.
      const t = body.translation()
      let x = t.x
      let y = t.y
      let v = body.linvel()
      let bumped = false
      if (x > maxX) {
        x = maxX
        // Soft wall hit — keep vertical motion so the next slam can scoop them.
        v = { x: Math.min(v.x, 0) * 0.2, y: v.y, z: 0 }
        bumped = true
      } else if (x < -maxX) {
        x = -maxX
        v = { x: Math.max(v.x, 0) * 0.2, y: v.y, z: 0 }
        bumped = true
      }
      if (skillMode && y > maxY) {
        y = maxY
        if (v.y > 0) v = { x: v.x, y: -Math.abs(v.y) * 0.35, z: 0 }
        bumped = true
      }
      if (y < r * 0.45) {
        y = r
        if (v.y < 0) v = { x: v.x, y: 0, z: 0 }
        bumped = true
      }
      if (bumped) {
        body.setTranslation({ x, y, z: 0 }, true)
        body.setLinvel(v, true)
      }
    }
  })

  useEffect(() => {
    if (!skillMode) return
    const timer = window.setTimeout(() => {
      if (skillMode === 'shake') {
        shakeUntil.current = performance.now() + 2000
        shakePulse.current = 0.3 // fire first slam immediately on next frame
        shakeDir.current = -1
        for (const p of piecesRef.current) {
          const body = bodiesRef.current.get(p.id)
          if (!body) continue
          body.setBodyType(0, true)
          body.wakeUp()
        }
      }
      if (skillMode === 'float') {
        floatUntil.current = performance.now() + 1800
        for (const p of piecesRef.current) {
          const body = bodiesRef.current.get(p.id)
          if (!body) continue
          body.setBodyType(0, true)
          body.wakeUp()
          const sizeWeight =
            (SUIKA_MAX_TIER - p.tier) / Math.max(SUIKA_MAX_TIER, 1)
          // Kick every ball up; smaller ones get a much stronger burst.
          body.setLinvel(
            {
              x: (Math.random() - 0.5) * 1.2,
              y: 4.5 + sizeWeight * 9,
              z: 0,
            },
            true,
          )
        }
      }
      if (skillMode === 'magnet') {
        magnetUntil.current = performance.now() + 1100
        for (const p of piecesRef.current) {
          const body = bodiesRef.current.get(p.id)
          if (!body) continue
          body.setBodyType(0, true)
          body.wakeUp()
        }
      }
      if (skillMode === 'compress') {
        compressUntil.current = performance.now() + 900
        for (const p of piecesRef.current) {
          const body = bodiesRef.current.get(p.id)
          if (!body) continue
          body.setBodyType(0, true)
          body.wakeUp()
          body.setLinvel(
            {
              x: -p.x * 2.5 + (Math.random() - 0.5) * 0.8,
              y: -2.2 + (Math.random() - 0.5) * 1.2,
              z: 0,
            },
            true,
          )
        }
      }
      if (skillMode === 'flip' || skillMode === 'swap' || skillMode === 'snipe') {
        for (const p of piecesRef.current) {
          const body = bodiesRef.current.get(p.id)
          if (!body) continue
          body.setBodyType(0, true)
          body.wakeUp()
          body.setLinvel({ x: 0, y: 0, z: 0 }, true)
          body.setAngvel({ x: 0, y: 0, z: 0 }, true)
        }
      }
    }, 80)
    return () => window.clearTimeout(timer)
  }, [bodiesRef, skillMode])

  // simActive is set synchronously on claim so the dropped cat appears before
  // Firestore busyUid round-trips (iAmBusy alone caused an instant "unload").
  const showSim = simActive
  const ghostPieces = partnerBusy ? (ghosts[0]?.pieces ?? []) : []

  return (
    <>
      <BowlCamera />
      <ambientLight intensity={0.7} />
      <directionalLight castShadow intensity={1.05} position={[3, 8, 4]} />
      <Physics gravity={[0, -30.9, 0]} key={game.roundId}>
        <Bowl />
        {showSim
          ? localPieces.map((p) =>
              p.merging ? null : (
                <DynamicPiece
                  key={p.id}
                  piece={p}
                  bodyRef={setBody}
                  onMerge={onMerge}
                  locked={false}
                />
              ),
            )
          : partnerBusy
            ? ghostPieces.map((p) => (
                <StaticPiece
                  key={p.id}
                  piece={{ id: p.id, tier: p.tier, x: p.x, y: p.y, rot: 0 }}
                />
              ))
            : game.pieces.map((p) => <StaticPiece key={p.id} piece={p} />)}

        {showSim ? (
          <SettleAndLive
            active
            bodies={bodiesRef.current}
            piecesRef={piecesRef}
            publishLive={publishLive}
            dangerArmed={localPieces.length > 0}
            skillSafe={skillMode !== null}
            onSettle={(pieces) => onSettle(pieces)}
            onGameOver={onGameOver}
          />
        ) : null}
      </Physics>

      <DropIndicator
        x={clampDropX(guideX, dropTier)}
        tier={dropTier}
        visible={aiming && bowlIdle}
      />
      <AimController
        enabled={aiming && bowlIdle}
        dropXRef={dropXRef}
        tier={dropTier}
        onDrop={onAimDrop}
        onAimChange={onAimChange}
      />
    </>
  )
}

function PreviewCat({ tier, label }: { tier: number; label: string }) {
  const theme = SUIKA_TIERS[tier]!
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[10px] font-medium uppercase tracking-wide text-muted">
        {label}
      </span>
      <div
        className="flex size-14 items-center justify-center overflow-hidden rounded-full border-2 border-white/25 shadow-lg"
        style={{ backgroundColor: theme.color }}
      >
        <div className="flex size-[68%] items-center justify-center overflow-hidden rounded-full bg-white">
          <img
            src={petIdleSrc(theme.icon)}
            alt=""
            className="size-[135%] object-contain"
            draggable={false}
          />
        </div>
      </div>
    </div>
  )
}

function EvolutionGuide() {
  const cats = SUIKA_TIERS.slice(0, SUIKA_LOOP_SIZE)
  return (
    <div className="rounded-xl border border-border bg-surface/70 p-2.5">
      <p className="mb-2 text-center text-[10px] font-semibold uppercase tracking-wide text-muted">
        Cat evolution
      </p>
      <div className="flex flex-wrap items-center justify-center gap-1">
        {cats.map((theme, i) => (
          <div key={theme.icon} className="flex items-center gap-0.5">
            <div
              className={`flex size-7 items-center justify-center overflow-hidden rounded-full border ${
                i === cats.length - 1
                  ? 'border-amber-300/80 ring-1 ring-amber-200/40'
                  : 'border-white/25'
              }`}
              style={{ backgroundColor: theme.color }}
              title={`Tier ${i + 1}`}
            >
              <div className="flex size-[68%] items-center justify-center overflow-hidden rounded-full bg-white">
                <img
                  src={petIdleSrc(theme.icon)}
                  alt=""
                  className="size-[135%] object-contain"
                  draggable={false}
                />
              </div>
            </div>
            {i < cats.length - 1 ? (
              <span className="text-[9px] text-muted">›</span>
            ) : (
              <span className="text-[9px] text-muted" title="Then the set repeats bigger">
                ›✨
              </span>
            )}
          </div>
        ))}
      </div>
      <p className="mt-1.5 text-center text-[9px] text-muted">
        Full set ×2 › two final Bulbas poof (+{SUIKA_FINAL_MERGE_SCORE})
      </p>
    </div>
  )
}

export function CatSuika({ onClose }: { onClose: () => void }) {
  const {
    game,
    ghosts,
    ready,
    uid,
    playerName,
    bowlIdle,
    iAmBusy,
    partnerBusy,
    commitGame,
    resetGame,
    publishLive,
    clearLive,
  } = useSharedSuika()
  const sceneBg = useThemeCssColor('--color-app-bg', '#1a1620')

  const [localPieces, setLocalPieces] = useState<LocalPiece[]>([])
  const [aiming, setAiming] = useState(true)
  const [skillMode, setSkillMode] = useState<SkillKind | null>(null)
  const [magnetTier, setMagnetTier] = useState(0)
  const [confirmReset, setConfirmReset] = useState(false)
  /** Local sim ownership — true before busyUid syncs so the drop never flashes away. */
  const [simActive, setSimActive] = useState(false)
  const dropXRef = useRef(0)
  const bodiesRef = useRef(new Map<string, RapierRigidBody>())
  const mergeLock = useRef(new Set<string>())
  const scoreBonusRef = useRef(0)
  const busySessionRef = useRef(false)
  /** Piece id of the ball just dropped — gets a tiny random kick so perfect stacks tip. */
  const dropNudgeIdRef = useRef<string | null>(null)
  const localPiecesRef = useRef(localPieces)
  localPiecesRef.current = localPieces

  const endLocalSession = useCallback(() => {
    busySessionRef.current = false
    setSimActive(false)
    setSkillMode(null)
    setAiming(true)
    bodiesRef.current.clear()
    mergeLock.current.clear()
    dropNudgeIdRef.current = null
  }, [])

  // Sync local pile from Firestore when idle / watching — never while we own a drop/skill.
  useEffect(() => {
    if (busySessionRef.current) return
    // Stale claim rewind: queue advanced but piece list shrank vs what we just settled.
    if (
      game.status === 'playing' &&
      game.pieces.length < localPiecesRef.current.length
    ) {
      return
    }
    setLocalPieces(game.pieces.map((p) => ({ ...p })))
    setSkillMode(null)
    setAiming(game.status === 'playing')
    if (!game.busyUid) {
      clearLive()
    }
  }, [clearLive, game.busyUid, game.pieces, game.roundId, game.status, iAmBusy])

  // If Firestore still has our busy lock but we aren't simulating (reload / desync),
  // clear it after a short grace — never immediately, or it races claimDrop.
  useEffect(() => {
    if (!uid || game.busyUid !== uid || busySessionRef.current) return
    const t = window.setTimeout(() => {
      if (busySessionRef.current) return
      void commitGame((g) =>
        g.busyUid === uid ? { ...g, busyUid: null } : g,
      )
    }, 2500)
    return () => window.clearTimeout(t)
  }, [commitGame, game.busyUid, uid])

  // Remote reset while mid-drop — abandon local sim so Reset always recovers.
  const roundIdRef = useRef(game.roundId)
  useEffect(() => {
    if (roundIdRef.current === game.roundId) return
    roundIdRef.current = game.roundId
    if (!busySessionRef.current) return
    endLocalSession()
    setLocalPieces(game.pieces.map((p) => ({ ...p })))
  }, [endLocalSession, game.pieces, game.roundId])

  const finishBusy = useCallback(
    (pieces: SuikaPiece[], over: boolean) => {
      if (!uid) return
      // Guard against a glitched empty capture wiping the bowl after a drop.
      const fallback = localPiecesRef.current
        .filter((p) => !p.merging)
        .map((p) => {
          const body = bodiesRef.current.get(p.id)
          if (!body) {
            return {
              id: p.id,
              tier: p.tier,
              x: p.x,
              y: p.y,
              rot: p.rot ?? 0,
            }
          }
          const t = body.translation()
          return {
            id: p.id,
            tier: p.tier,
            x: clampDropX(t.x, p.tier),
            y: Math.max(t.y, SUIKA_TIERS[p.tier]?.radius ?? 0.3),
            rot: rotFromBody(body),
          }
        })
      const committed =
        pieces.length > 0 ? pieces : fallback.length > 0 ? fallback : pieces
      const bonus = scoreBonusRef.current
      scoreBonusRef.current = 0
      clearLive()
      // End local sim AFTER queueing the commit so a sync effect can't
      // apply a stale smaller pile while busySession is already false.
      void commitGame((g) => {
        const score = g.score + bonus
        // Never shrink below what claim already persisted (unless capture
        // has replacements from merges — extras by new ids are kept).
        const byId = new Map(committed.map((p) => [p.id, p]))
        const mergedAway = bonus > 0
        let nextPieces = committed
        if (!mergedAway && g.pieces.length > committed.length) {
          nextPieces = [
            ...g.pieces.map((p) => byId.get(p.id) ?? p),
            ...committed.filter(
              (p) => !g.pieces.some((gp) => gp.id === p.id),
            ),
          ]
        }
        return withHighScore(
          withSkillScoreRefresh(
            {
              ...g,
              pieces: nextPieces,
              score,
              status: over ? 'over' : 'playing',
              busyUid: null,
            },
            g.score,
          ),
          uid === 'local' ? null : uid,
          uid === 'local' ? null : playerName,
        )
      })
      setLocalPieces(committed.map((p) => ({ ...p })))
      endLocalSession()
    },
    [clearLive, commitGame, endLocalSession, playerName, uid],
  )

  const onSettle = useCallback(
    (pieces: SuikaPiece[]) => {
      finishBusy(pieces, false)
    },
    [finishBusy],
  )

  const onGameOver = useCallback(() => {
    const out: SuikaPiece[] = []
    for (const p of localPiecesRef.current) {
      if (p.merging) continue
      const body = bodiesRef.current.get(p.id)
      if (!body) {
        out.push({
          id: p.id,
          tier: p.tier,
          x: p.x,
          y: p.y,
          rot: p.rot ?? 0,
        })
        continue
      }
      const t = body.translation()
      out.push({
        id: p.id,
        tier: p.tier,
        x: clampDropX(t.x, p.tier),
        y: t.y,
        rot: rotFromBody(body),
      })
    }
    finishBusy(out, true)
  }, [finishBusy])

  const onMerge = useCallback((idA: string, idB: string) => {
    if (idA === idB) return
    const key = [idA, idB].sort().join(':')
    if (mergeLock.current.has(key)) return
    setLocalPieces((prev) => {
      const a = prev.find((p) => p.id === idA && !p.merging)
      const b = prev.find((p) => p.id === idB && !p.merging)
      if (!a || !b || a.tier !== b.tier) return prev
      mergeLock.current.add(key)
      window.setTimeout(() => mergeLock.current.delete(key), 400)

      // Second-loop Bulba is the last rung — two of those poof.
      if (a.tier >= SUIKA_MAX_TIER) {
        scoreBonusRef.current += SUIKA_FINAL_MERGE_SCORE
        return prev.filter((p) => p.id !== idA && p.id !== idB)
      }

      const bodyA = bodiesRef.current.get(a.id)
      const bodyB = bodiesRef.current.get(b.id)
      const ta = bodyA?.translation() ?? { x: a.x, y: a.y, z: 0 }
      const tb = bodyB?.translation() ?? { x: b.x, y: b.y, z: 0 }
      const nextTier = a.tier + 1
      const mid = createPiece(nextTier, (ta.x + tb.x) / 2, (ta.y + tb.y) / 2)
      scoreBonusRef.current += SUIKA_TIERS[nextTier]?.score ?? nextTier + 1
      const next: LocalPiece[] = [
        ...prev.map((p) =>
          p.id === idA || p.id === idB ? { ...p, merging: true } : p,
        ),
        mid,
      ]
      return next.filter((p) => !p.merging)
    })
  }, [])

  const claimDrop = useCallback(() => {
    if (!uid || !bowlIdle || game.status !== 'playing' || busySessionRef.current)
      return
    const tier = game.nextTier
    // Tiny aim jitter so a pixel-perfect stack still tips and rolls.
    const x = clampDropX(
      dropXRef.current + (Math.random() - 0.5) * 0.16,
      tier,
    )
    const piece = createPiece(tier, x, DROP_Y)
    scoreBonusRef.current = 0
    mergeLock.current.clear()
    busySessionRef.current = true
    dropNudgeIdRef.current = piece.id
    setSimActive(true)
    setAiming(false)
    setLocalPieces([...game.pieces.map((p) => ({ ...p })), piece])
    let claimed = false
    let fallback = game.pieces
    void commitGame((g) => {
      if (g.busyUid || g.status !== 'playing') {
        fallback = g.pieces
        return g
      }
      claimed = true
      return {
        ...g,
        // Persist the ball on claim so a stale sync can't rewind to
        // "queue advanced, piece missing" after it lands.
        pieces: [...g.pieces, piece],
        busyUid: uid,
        dropSeq: g.dropSeq + 1,
        ...advanceDropQueue(g),
      }
    })
    if (!claimed) {
      endLocalSession()
      setLocalPieces(fallback.map((p) => ({ ...p })))
    }
  }, [
    bowlIdle,
    commitGame,
    endLocalSession,
    game.nextTier,
    game.pieces,
    game.status,
    uid,
  ])

  const claimSkill = useCallback(
    (kind: SkillKind) => {
      if (
        !uid ||
        !bowlIdle ||
        game.status !== 'playing' ||
        busySessionRef.current
      )
        return

      const chargesLeft = (g: typeof game) => {
        if (SUIKA_SKILLS_UNLIMITED) return true
        if (kind === 'shake') return g.shakeLeft > 0
        if (kind === 'float') return g.floatLeft > 0
        if (kind === 'snipe') return g.snipeLeft > 0
        if (kind === 'flip') return g.flipLeft > 0
        if (kind === 'magnet') return g.magnetLeft > 0
        if (kind === 'compress') return g.compressLeft > 0
        if (kind === 'swap') return g.swapLeft > 0
        return false
      }
      if (!chargesLeft(game)) return
      if (game.pieces.length === 0) return
      if (kind === 'magnet' && countPiecesOfTier(game.pieces, game.nextTier) < 2)
        return
      if (kind === 'swap' && game.pieces.length < 2) return

      scoreBonusRef.current = 0
      mergeLock.current.clear()

      let nextPieces = game.pieces
      if (kind === 'snipe') nextPieces = snipeLowestTier(game.pieces)
      if (kind === 'flip') nextPieces = flipPiecesVertical(game.pieces)
      if (kind === 'swap') {
        const swapped = swapTwoPiecePositions(game.pieces)
        if (!swapped) return
        nextPieces = swapped
      }

      // Snipe cleared the whole bowl — no physics needed, no points.
      if (kind === 'snipe' && nextPieces.length === 0) {
        setLocalPieces([])
        setAiming(true)
        void commitGame((g) => {
          if (g.busyUid || g.status !== 'playing' || !chargesLeft(g)) return g
          return {
            ...g,
            pieces: [],
            skillSeq: g.skillSeq + 1,
            snipeLeft: SUIKA_SKILLS_UNLIMITED ? g.snipeLeft : g.snipeLeft - 1,
            busyUid: null,
          }
        })
        return
      }

      if (kind === 'snipe' && nextPieces.length === game.pieces.length) return

      busySessionRef.current = true
      setSimActive(true)
      setAiming(false)
      setSkillMode(kind)
      if (kind === 'magnet') setMagnetTier(game.nextTier)
      setLocalPieces(nextPieces.map((p) => ({ ...p })))
      let claimed = false
      let fallback = game.pieces
      void commitGame((g) => {
        if (g.busyUid || g.status !== 'playing' || !chargesLeft(g)) {
          fallback = g.pieces
          return g
        }
        claimed = true
        const pieces =
          kind === 'snipe' || kind === 'flip' || kind === 'swap'
            ? nextPieces
            : g.pieces
        const dec = (n: number) => (SUIKA_SKILLS_UNLIMITED ? n : n - 1)
        return {
          ...g,
          pieces,
          busyUid: uid,
          skillSeq: g.skillSeq + 1,
          shakeLeft: kind === 'shake' ? dec(g.shakeLeft) : g.shakeLeft,
          floatLeft: kind === 'float' ? dec(g.floatLeft) : g.floatLeft,
          snipeLeft: kind === 'snipe' ? dec(g.snipeLeft) : g.snipeLeft,
          flipLeft: kind === 'flip' ? dec(g.flipLeft) : g.flipLeft,
          magnetLeft: kind === 'magnet' ? dec(g.magnetLeft) : g.magnetLeft,
          compressLeft:
            kind === 'compress' ? dec(g.compressLeft) : g.compressLeft,
          swapLeft: kind === 'swap' ? dec(g.swapLeft) : g.swapLeft,
        }
      })
      if (!claimed) {
        endLocalSession()
        setLocalPieces(fallback.map((p) => ({ ...p })))
      }
    },
    [
      bowlIdle,
      commitGame,
      endLocalSession,
      game,
      uid,
    ],
  )

  // Wake bodies once the local sim mounts; nudge the fresh drop so it rolls.
  useEffect(() => {
    if (!simActive) return
    const t = window.setTimeout(() => {
      for (const body of bodiesRef.current.values()) {
        body.setBodyType(0, true)
        body.wakeUp()
      }
      const nudgeId = dropNudgeIdRef.current
      if (!nudgeId || skillMode) return
      const body = bodiesRef.current.get(nudgeId)
      if (!body) return
      const kick = (Math.random() - 0.5) * 0.7
      const spin = (Math.random() - 0.5) * 3.2
      const v = body.linvel()
      // Hard downward shove so drops don't float down.
      body.setLinvel({ x: v.x + kick, y: Math.min(v.y, -10.7), z: 0 }, true)
      body.setAngvel({ x: 0, y: 0, z: spin }, true)
      dropNudgeIdRef.current = null
    }, 50)
    return () => window.clearTimeout(t)
  }, [simActive, skillMode])

  const statusHint =
    game.status === 'over'
      ? 'Game over — the bowl overflowed'
      : simActive
        ? skillMode === 'shake'
          ? 'Shaking…'
          : skillMode === 'float'
            ? 'Floating…'
            : skillMode === 'snipe'
              ? 'Sniping…'
              : skillMode === 'flip'
                ? 'Flipping…'
                : skillMode === 'magnet'
                  ? 'Magnet…'
                  : skillMode === 'compress'
                    ? 'Compressing…'
                    : skillMode === 'swap'
                      ? 'Swapping…'
                      : 'Dropping…'
        : 'Drag to aim · release to drop'

  return (
    <ArcadeStage
      title="Cat Suika"
      onClose={onClose}
      meta={<ArcadeStatus>{statusHint}</ArcadeStatus>}
    >
      {({ immersive }) => (
        <>
          {immersive ? null : (
      <div className="mt-2 rounded-xl border border-border bg-surface/60 px-3.5 py-3">
        <p className="text-[11px] leading-relaxed text-muted">
          Drop cats into the jar. Matching cats merge into the next one up the
          ladder. Don&apos;t let any cat sit above the red line. Fresh bowl each
          visit — room best syncs when you&apos;re signed in.
        </p>
        <p className="mt-3 text-[10px] font-semibold uppercase tracking-wide text-muted">
          Skills
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-muted">
          Each skill has 2 uses. Score another 2000 points and they all refill to
          2.
        </p>
        <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
          {(
            [
              ['Shake', 'slam the jar left & right'],
              ['Float', 'lift cats upward'],
              ['Snipe', 'clear all lowest-tier cats (no points)'],
              ['Flip', 'mirror the stack vertically'],
              ['Magnet', 'pull cats matching Next together'],
              ['Compress', 'suck everything toward the center'],
              ['Swap', 'two different cats trade places'],
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
              'mt-3 grid gap-2.5 lg:grid-cols-[5.75rem_minmax(0,1fr)_8.5rem]',
              immersive ? 'min-h-0 flex-1' : '',
            ].join(' ')}
          >
        {/* Score column */}
        <div className="flex flex-row flex-wrap items-stretch gap-2 lg:flex-col lg:items-stretch">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5 lg:flex-none">
            <div className="rounded-lg border border-border bg-surface/80 px-2 py-1.5 text-center shadow-inner">
              <span className="block text-[9px] font-semibold uppercase tracking-wide text-muted">
                Score
              </span>
              <span className="mt-0.5 block text-lg font-semibold tabular-nums leading-none text-white">
                {game.score}
              </span>
            </div>
            <div className="rounded-lg border border-border bg-surface/80 px-2 py-1.5 text-center shadow-inner">
              <span className="block text-[9px] font-semibold uppercase tracking-wide text-muted">
                Best
              </span>
              <span className="mt-0.5 block text-sm font-semibold tabular-nums leading-none text-white/85">
                {game.highScore}
              </span>
              {game.highScore > 0 && game.highScoreName ? (
                <span className="mt-1 block max-w-full truncate text-[9px] text-muted">
                  by {game.highScoreName}
                </span>
              ) : null}
            </div>
          </div>
          <div className="flex flex-1 flex-col gap-1 lg:flex-none">
            <div className="flex flex-col gap-1">
              {(
                [
                  {
                    kind: 'shake' as const,
                    label: 'Shake',
                    left: game.shakeLeft,
                    title: 'Slam the jar left/right',
                    cls: 'border-amber-500/55 bg-amber-500/20 text-app-text hover:bg-amber-500/30',
                    disabledExtra: false,
                  },
                  {
                    kind: 'float' as const,
                    label: 'Float',
                    left: game.floatLeft,
                    title: 'Lift cats upward',
                    cls: 'border-sky-500/55 bg-sky-500/20 text-app-text hover:bg-sky-500/30',
                    disabledExtra: false,
                  },
                  {
                    kind: 'snipe' as const,
                    label: 'Snipe',
                    left: game.snipeLeft,
                    title: 'Remove all lowest-tier cats (no points)',
                    cls: 'border-violet-500/55 bg-violet-500/20 text-app-text hover:bg-violet-500/30',
                    disabledExtra: false,
                  },
                  {
                    kind: 'flip' as const,
                    label: 'Flip',
                    left: game.flipLeft,
                    title: 'Flip the stack vertically',
                    cls: 'border-fuchsia-500/55 bg-fuchsia-500/20 text-app-text hover:bg-fuchsia-500/30',
                    disabledExtra: false,
                  },
                  {
                    kind: 'magnet' as const,
                    label: 'Magnet',
                    left: game.magnetLeft,
                    title: 'Pull cats matching your next drop together',
                    cls: 'border-emerald-500/55 bg-emerald-500/20 text-app-text hover:bg-emerald-500/30',
                    disabledExtra:
                      countPiecesOfTier(game.pieces, game.nextTier) < 2,
                  },
                  {
                    kind: 'compress' as const,
                    label: 'Compress',
                    left: game.compressLeft,
                    title: 'Pull everything toward the center',
                    cls: 'border-orange-500/55 bg-orange-500/20 text-app-text hover:bg-orange-500/30',
                    disabledExtra: false,
                  },
                  {
                    kind: 'swap' as const,
                    label: 'Swap',
                    left: game.swapLeft,
                    title: 'Swap two different cats',
                    cls: 'border-teal-500/55 bg-teal-500/20 text-app-text hover:bg-teal-500/30',
                    disabledExtra: game.pieces.length < 2,
                  },
                ] as const
              ).map((btn) => (
                <button
                  key={btn.kind}
                  type="button"
                  title={btn.title}
                  disabled={
                    !bowlIdle ||
                    game.pieces.length === 0 ||
                    btn.disabledExtra ||
                    (!SUIKA_SKILLS_UNLIMITED && btn.left <= 0)
                  }
                  onClick={() => claimSkill(btn.kind)}
                  className={`rounded-md border px-1.5 py-1.5 text-[10px] font-medium leading-tight transition disabled:opacity-40 ${btn.cls}`}
                >
                  {btn.label} ({SUIKA_SKILLS_UNLIMITED ? '∞' : btn.left})
                </button>
              ))}
            </div>
            {confirmReset ? (
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setConfirmReset(false)
                    endLocalSession()
                    setLocalPieces([])
                    void resetGame()
                  }}
                  className="rounded-md border border-rose-500/55 bg-rose-500/20 px-1.5 py-1.5 text-[10px] font-medium leading-tight text-app-text hover:bg-rose-500/30"
                >
                  Confirm reset
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="rounded-md px-1.5 py-0.5 text-[10px] text-muted hover:text-white"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="rounded-md border border-border bg-surface px-1.5 py-1.5 text-[10px] font-medium leading-tight text-muted hover:text-white"
              >
                Reset
              </button>
            )}
          </div>
        </div>

            {/* Bowl — aspect matches world jar so the camera fills edge-to-edge */}
            <div
              className={[
                'relative w-full overflow-hidden rounded-xl border border-border bg-app-bg',
                immersive ? 'min-h-0 min-w-0' : '',
              ].join(' ')}
              style={immersive ? undefined : { aspectRatio: SUIKA_CANVAS_ASPECT }}
            >
          {ready ? (
            <Canvas
              shadows
              orthographic
              camera={{ position: [0, 3.5, 12], near: 0.1, far: 50 }}
              gl={{ antialias: true, alpha: false }}
            >
              <ThemeClearColor color={sceneBg} />
              <SuikaWorld
                game={game}
                ghosts={ghosts}
                simActive={simActive}
                partnerBusy={partnerBusy}
                bowlIdle={bowlIdle}
                localPieces={localPieces}
                dropTier={game.nextTier}
                aiming={aiming}
                dropXRef={dropXRef}
                onAimDrop={claimDrop}
                onMerge={onMerge}
                onSettle={onSettle}
                onGameOver={onGameOver}
                publishLive={publishLive}
                skillMode={skillMode}
                magnetTier={magnetTier}
                bodiesRef={bodiesRef}
              />
            </Canvas>
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-muted">
              Loading bowl…
            </div>
          )}
        </div>

            <div className="flex flex-row flex-wrap items-start justify-center gap-3 lg:flex-col lg:items-stretch">
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface/80 px-3 py-3">
                <PreviewCat tier={game.nextTier} label="Next" />
                <PreviewCat tier={game.nextNextTier} label="Then" />
              </div>
              <EvolutionGuide />
            </div>
          </div>
        </>
      )}
    </ArcadeStage>
  )
}
