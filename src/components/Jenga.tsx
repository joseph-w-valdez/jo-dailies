import { Canvas, useFrame, useLoader, useThree, type ThreeEvent } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import {
  BallCollider,
  CuboidCollider,
  interactionGroups,
  Physics,
  RigidBody,
  type RapierRigidBody,
} from '@react-three/rapier'
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react'
import { useSharedJenga } from '../hooks/useSharedJenga'
import { useThemeCssColor } from '../hooks/useThemeCssColor'
import { ArcadeStage, ArcadeStatus } from './ArcadeStage'
import { GameSeatPicker } from './GameSeatPicker'
import { ThemeClearColor } from './ThemeClearColor'
import {
  BRICK_H,
  BRICK_L,
  BRICK_W,
  COLLIDER_FIT,
  detectCollapse,
  JENGA_CAT_THEMES,
  jengaCatSlotForBrick,
  jengaRemainingScore,
  markFieldDebris,
  nextTurnUid,
  selectJengaFirst,
  type JengaBrick,
  type JengaEndReason,
  type JengaGameState,
  type JengaLiveGhost,
  type JengaPose,
} from '../lib/jenga'
import { petIdleSrc } from '../lib/petAssets'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import * as THREE from 'three'

const CAT_THEME_BY_ICON = new Map<string, { src: string; color: string }>(
  JENGA_CAT_THEMES.map((theme) => [
    theme.icon,
    { src: petIdleSrc(theme.icon), color: theme.color },
  ]),
)

function themesForGame(cats: [string, string]) {
  const fallback = CAT_THEME_BY_ICON.get(JENGA_CAT_THEMES[0]!.icon)!
  return [
    CAT_THEME_BY_ICON.get(cats[0]) ?? fallback,
    CAT_THEME_BY_ICON.get(cats[1]) ?? fallback,
  ] as const
}

function catThemeForBrick(
  brickId: string,
  pair: ReturnType<typeof themesForGame>,
) {
  return pair[jengaCatSlotForBrick(brickId)]!
}

function poseFromBody(body: RapierRigidBody): JengaPose {
  const t = body.translation()
  const r = body.rotation()
  return { x: t.x, y: t.y, z: t.z, qx: r.x, qy: r.y, qz: r.z, qw: r.w }
}

/** Average world center of live bricks; falls back to mid-tower. */
function averageBrickCenter(
  bricks: { x: number; y: number; z: number }[],
): { x: number; y: number; z: number } {
  if (bricks.length === 0) return { x: 0, y: 1.1, z: 0 }
  let sx = 0
  let sy = 0
  let sz = 0
  for (const b of bricks) {
    sx += b.x
    sy += b.y
    sz += b.z
  }
  const n = bricks.length
  return { x: sx / n, y: sy / n, z: sz / n }
}

/** Outward blast from origin. `strength` 1 = full explode. */
function blastBodies(
  bodies: Iterable<RapierRigidBody>,
  origin: { x: number; y: number; z: number },
  strength: number,
) {
  for (const body of bodies) {
    body.setBodyType(0, true) // Dynamic
    body.wakeUp()
    const t = body.translation()
    let dx = t.x - origin.x
    let dz = t.z - origin.z
    const lateral = Math.hypot(dx, dz)
    if (lateral < 0.05) {
      const angle = Math.random() * Math.PI * 2
      dx = Math.cos(angle)
      dz = Math.sin(angle)
    } else {
      dx /= lateral
      dz /= lateral
    }
    const outward = (1.2 + Math.random() * 1.1 + lateral * 0.45) * 1.2 * strength
    const up = (12 + Math.random() * 6 + Math.max(0, t.y) * 0.5) * strength
    body.setLinvel(
      {
        x: dx * outward,
        y: up,
        z: dz * outward,
      },
      true,
    )
    body.setAngvel(
      {
        x: (Math.random() - 0.5) * 10 * strength,
        y: (Math.random() - 0.5) * 8 * strength,
        z: (Math.random() - 0.5) * 10 * strength,
      },
      true,
    )
  }
}

/**
 * IRL: steady medium pulls are safest; jerky/fast yanks vibrate the stack.
 * World-units/sec along the pull axis — tuned to the 0.004 screen→world scale.
 */
const PULL_STEADY_SPEED = 0.45
const PULL_YANK_SPEED = 2.2

function pullYankFactor(peakSpeed: number): number {
  return Math.max(
    0,
    Math.min(1, (peakSpeed - PULL_STEADY_SPEED) / (PULL_YANK_SPEED - PULL_STEADY_SPEED)),
  )
}

/** Hand tremor + speed shake while the brick is kinematic. */
function pullWiggleOffset(
  peakSpeed: number,
  speed: number,
): { perp: number; y: number } {
  const yank = pullYankFactor(Math.max(peakSpeed, speed))
  // Always a little human noise; yanks amplify it.
  const amp = 0.0012 + yank * 0.01 + speed * 0.0025 + Math.random() * 0.0008
  return {
    perp: (Math.random() - 0.5) * 2 * amp,
    y: (Math.random() - 0.5) * 2 * amp * 0.55,
  }
}

/**
 * When the pull releases and the tower goes dynamic, seed a small shake.
 * Calm clears barely nudge; yanks + unlucky slips can topple.
 */
function shockTowerFromPull(
  bodies: Map<string, RapierRigidBody>,
  pulledId: string,
  peakSpeed: number,
) {
  const yank = pullYankFactor(peakSpeed)
  // Even steady hands can slip; yanks get much riskier.
  const slipChance = 0.05 + yank * 0.38
  const slipped = Math.random() < slipChance
  const shake =
    0.01 +
    yank * yank * 0.11 +
    (slipped ? 0.045 + Math.random() * 0.07 : Math.random() * 0.018)

  for (const [id, body] of bodies) {
    if (id === pulledId) continue
    const t = body.translation()
    if (Math.hypot(t.x, t.z) > 1.15) continue
    body.setLinvel(
      {
        x: (Math.random() - 0.5) * shake,
        y: Math.random() * shake * 0.35,
        z: (Math.random() - 0.5) * shake,
      },
      true,
    )
    body.setAngvel(
      {
        x: (Math.random() - 0.5) * shake * 3.2,
        y: (Math.random() - 0.5) * shake * 2.2,
        z: (Math.random() - 0.5) * shake * 3.2,
      },
      true,
    )
  }
}

function seededUnit(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

function CatMeteor({
  strikeId,
  roundId,
  aim,
  onImpact,
  onExpire,
}: {
  strikeId: number
  roundId: string
  aim: { x: number; y: number; z: number }
  onImpact: (origin: { x: number; y: number; z: number }) => void
  onExpire: (strikeId: number) => void
}) {
  const bodyRef = useRef<RapierRigidBody>(null)
  const faceRef = useRef<THREE.Group>(null)
  const trailMats = useRef<(THREE.MeshStandardMaterial | null)[]>([])
  const trailMeshes = useRef<(THREE.Mesh | null)[]>([])
  const history = useRef<THREE.Vector3[]>([])
  const lookScratch = useMemo(() => new THREE.Vector3(), [])
  const zAxis = useMemo(() => new THREE.Vector3(0, 0, 1), [])
  const hitRef = useRef(false)
  const expireRef = useRef(onExpire)
  expireRef.current = onExpire
  const impactRef = useRef(onImpact)
  impactRef.current = onImpact
  const camera = useThree((s) => s.camera)

  const seedBase =
    strikeId * 9973 +
    [...roundId].reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
  const u0 = seededUnit(seedBase)
  const u1 = seededUnit(seedBase + 1)
  const u2 = seededUnit(seedBase + 2)
  const theme = JENGA_CAT_THEMES[Math.floor(u0 * JENGA_CAT_THEMES.length)]!
  const texture = useLoader(THREE.TextureLoader, petIdleSrc(theme.icon))
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4

  // Spawn above / beside the brick mass so the path isn't blocked by the wall.
  const angle = u1 * Math.PI * 2
  const dist = 1.5 + u2 * 1.1 // ~1.5–2.6 (wall sits ~3.15)
  const startY = 7.5 + u0 * 3.5
  const start: [number, number, number] = [
    aim.x + Math.cos(angle) * dist,
    startY,
    aim.z + Math.sin(angle) * dist,
  ]
  const target = aim
  const dir = {
    x: target.x - start[0],
    y: target.y - start[1],
    z: target.z - start[2],
  }
  const len = Math.hypot(dir.x, dir.y, dir.z) || 1
  const speed = 16 + u2 * 6
  const linearVelocity: [number, number, number] = [
    (dir.x / len) * speed,
    (dir.y / len) * speed,
    (dir.z / len) * speed,
  ]
  const radius = 0.62
  const faceSize = radius * 1.9
  const trailColor = theme.color
  const TRAIL_LEN = 22

  useEffect(() => {
    const t = window.setTimeout(() => expireRef.current(strikeId), 2_000)
    return () => window.clearTimeout(t)
  }, [strikeId])

  const handleCollision = () => {
    if (hitRef.current) return
    hitRef.current = true
    const body = bodyRef.current
    const t = body?.translation()
    const origin = t ? { x: t.x, y: t.y, z: t.z } : aim
    impactRef.current(origin)
    // Kick on the floor plane — usually toward camera, otherwise random.
    if (body && t) {
      let dx: number
      let dz: number
      if (Math.random() < 0.6) {
        dx = camera.position.x - t.x
        dz = camera.position.z - t.z
        // Fan ±~35° around the camera direction so paths vary.
        const base = Math.atan2(dz, dx)
        const spread = (Math.random() - 0.5) * (Math.PI * 0.4)
        const angled = base + spread
        dx = Math.cos(angled)
        dz = Math.sin(angled)
      } else {
        const angle = Math.random() * Math.PI * 2
        dx = Math.cos(angle)
        dz = Math.sin(angle)
      }
      const len = Math.hypot(dx, dz) || 1
      const kick = 4.5 + Math.random() * 2.5
      body.setLinvel(
        {
          x: (dx / len) * kick,
          y: 0.6 + Math.random() * 0.7,
          z: (dz / len) * kick,
        },
        true,
      )
      body.setAngvel(
        {
          x: (Math.random() - 0.5) * 4,
          y: (Math.random() - 0.5) * 4,
          z: (Math.random() - 0.5) * 4,
        },
        true,
      )
    }
  }

  useFrame(() => {
    const body = bodyRef.current
    if (!body) return
    const t = body.translation()
    const next = new THREE.Vector3(t.x, t.y, t.z)
    const hist = history.current
    const last = hist[0]
    if (!last || last.distanceToSquared(next) > 0.0025) {
      hist.unshift(next)
      if (hist.length > TRAIL_LEN) hist.length = TRAIL_LEN
    }
    for (let i = 0; i < TRAIL_LEN; i += 1) {
      const mesh = trailMeshes.current[i]
      const mat = trailMats.current[i]
      const p = hist[i]
      if (!mesh || !mat) continue
      if (!p) {
        mesh.visible = false
        continue
      }
      mesh.visible = true
      mesh.position.copy(p)
      const fade = 1 - i / TRAIL_LEN
      const s = radius * (0.18 + 0.72 * fade * fade)
      mesh.scale.setScalar(s)
      mat.opacity = 0.75 * fade * fade
    }

    // Face on the leading side: local +Z follows travel (trail is behind).
    const face = faceRef.current
    if (!face) return
    face.position.set(t.x, t.y, t.z)
    const v = body.linvel()
    const speedNow = Math.hypot(v.x, v.y, v.z)
    if (speedNow > 0.2) {
      lookScratch.set(v.x, v.y, v.z).normalize()
      face.quaternion.setFromUnitVectors(zAxis, lookScratch)
    } else if (hist.length >= 2) {
      const prev = hist[1]!
      lookScratch.set(t.x - prev.x, t.y - prev.y, t.z - prev.z)
      if (lookScratch.lengthSq() > 1e-6) {
        lookScratch.normalize()
        face.quaternion.setFromUnitVectors(zAxis, lookScratch)
      }
    }
  })

  return (
    <>
      <RigidBody
        ref={bodyRef}
        colliders={false}
        position={start}
        linearVelocity={linearVelocity}
        angularVelocity={[u0 * 1.2 - 0.6, u1 * 2 - 1, u2 * 1.2 - 0.6]}
        mass={12}
        friction={0.55}
        restitution={0.15}
        linearDamping={0.05}
        angularDamping={0.12}
        ccd
        onCollisionEnter={handleCollision}
      >
        <BallCollider
          args={[radius]}
          // Group 2: hits bricks/floor (0), ignores arena wall (1).
          collisionGroups={interactionGroups(2, [0])}
        />
        <mesh castShadow>
          <sphereGeometry args={[radius, 36, 36]} />
          <meshStandardMaterial
            color={theme.color}
            roughness={0.65}
            metalness={0.04}
          />
        </mesh>
      </RigidBody>

      <group ref={faceRef} position={start}>
        <mesh position={[0, 0, radius + 0.02]} raycast={() => null}>
          <circleGeometry args={[faceSize * 0.58, 28]} />
          <meshStandardMaterial
            color="#ffffff"
            roughness={0.85}
            metalness={0}
            depthWrite={false}
            polygonOffset
            polygonOffsetFactor={-1}
          />
        </mesh>
        <mesh position={[0, 0, radius + 0.035]} raycast={() => null}>
          <planeGeometry args={[faceSize, faceSize]} />
          <meshStandardMaterial
            map={texture}
            transparent
            roughness={0.45}
            metalness={0}
            depthWrite={false}
            polygonOffset
            polygonOffsetFactor={-2}
          />
        </mesh>
      </group>

      {Array.from({ length: TRAIL_LEN }, (_, i) => (
        <mesh
          key={i}
          ref={(node) => {
            trailMeshes.current[i] = node
          }}
          visible={false}
          raycast={() => null}
        >
          <sphereGeometry args={[1, 10, 10]} />
          <meshStandardMaterial
            ref={(node) => {
              trailMats.current[i] = node
            }}
            color={trailColor}
            transparent
            opacity={0}
            roughness={0.4}
            metalness={0.1}
            emissive={trailColor}
            emissiveIntensity={0.45}
            depthWrite={false}
          />
        </mesh>
      ))}
    </>
  )
}

function BrickCatFaces({ src }: { src: string }) {
  const texture = useLoader(THREE.TextureLoader, src)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4

  // Square sticker centered on the long face (local ±Z).
  const size = BRICK_H * 0.88
  const badge = size * 1.18
  const z = BRICK_W / 2 + 0.0015

  return (
    <>
      {([-1, 1] as const).map((side) => (
        <group
          key={side}
          position={[0, 0, side * z]}
          rotation={[0, side === 1 ? 0 : Math.PI, 0]}
        >
          <mesh position={[0, 0, -0.0004]} raycast={() => null}>
            <circleGeometry args={[badge / 2, 28]} />
            <meshStandardMaterial
              color="#ffffff"
              roughness={0.85}
              metalness={0}
              depthWrite={false}
              polygonOffset
              polygonOffsetFactor={-1}
            />
          </mesh>
          <mesh raycast={() => null}>
            <planeGeometry args={[size, size]} />
            <meshStandardMaterial
              map={texture}
              transparent
              roughness={0.55}
              metalness={0}
              depthWrite={false}
              polygonOffset
              polygonOffsetFactor={-2}
            />
          </mesh>
        </group>
      ))}
    </>
  )
}

function BrickMesh({
  brick,
  selected,
  ghost,
  lastMove,
  catPair,
  onPointerDown,
}: {
  brick: JengaBrick
  selected?: boolean
  ghost?: boolean
  lastMove?: boolean
  catPair: ReturnType<typeof themesForGame>
  onPointerDown?: (event: ThreeEvent<PointerEvent>) => void
}) {
  const theme = catThemeForBrick(brick.id, catPair)
  const color = ghost
    ? '#38bdf8'
    : selected
      ? '#e8c27a'
      : lastMove
        ? '#f0c14a'
        : theme.color
  return (
    <group>
      <mesh
        castShadow
        receiveShadow
        onPointerDown={onPointerDown}
      >
        <boxGeometry args={[BRICK_L, BRICK_H, BRICK_W]} />
        <meshStandardMaterial
          color={color}
          roughness={0.7}
          metalness={0.05}
          transparent={ghost}
          opacity={ghost ? 0.55 : 1}
          emissive={lastMove && !ghost ? '#fbbf24' : '#000000'}
          emissiveIntensity={lastMove && !ghost ? 0.55 : 0}
        />
      </mesh>
      {lastMove && !ghost ? (
        <mesh>
          <boxGeometry args={[BRICK_L * 1.08, BRICK_H * 1.22, BRICK_W * 1.14]} />
          <meshBasicMaterial
            color="#fbbf24"
            transparent
            opacity={0.32}
            depthWrite={false}
          />
        </mesh>
      ) : null}
      {!ghost ? (
        <Suspense fallback={null}>
          <BrickCatFaces src={theme.src} />
        </Suspense>
      ) : null}
    </group>
  )
}

function PhysicsBrick({
  brick,
  selected,
  lastMove,
  bodyRef,
  pulling,
  interactive,
  catPair,
  onSelect,
  onPullStart,
}: {
  brick: JengaBrick
  selected: boolean
  lastMove?: boolean
  bodyRef: (id: string, body: RapierRigidBody | null) => void
  pulling: boolean
  interactive: boolean
  catPair: ReturnType<typeof themesForGame>
  onSelect: (id: string) => void
  onPullStart: (id: string, clientX: number, clientY: number) => void
}) {
  const ref = useRef<RapierRigidBody>(null)
  const hx = (BRICK_L / 2) * COLLIDER_FIT
  const hy = (BRICK_H / 2) * COLLIDER_FIT
  const hz = (BRICK_W / 2) * COLLIDER_FIT

  useEffect(() => {
    bodyRef(brick.id, ref.current)
    return () => bodyRef(brick.id, null)
  }, [brick.id, bodyRef])

  return (
    <RigidBody
      ref={ref}
      colliders={false}
      // Initial pose only — after mount, transforms come from the physics world.
      position={[brick.x, brick.y, brick.z]}
      quaternion={[brick.qx, brick.qy, brick.qz, brick.qw]}
      type="fixed"
      mass={0.4}
      friction={0.9}
      restitution={0}
      linearDamping={0.6}
      angularDamping={0.7}
      canSleep
    >
      <CuboidCollider
        args={[hx, hy, hz]}
        // While pulling, skip collision so the brick slides free of the stack.
        sensor={pulling && selected}
      />
      <BrickMesh
        brick={brick}
        selected={selected}
        lastMove={lastMove}
        catPair={catPair}
        onPointerDown={
          interactive
            ? (event) => {
                event.stopPropagation()
                const ne = event.nativeEvent
                if (selected) {
                  onPullStart(brick.id, ne.clientX, ne.clientY)
                } else {
                  onSelect(brick.id)
                }
              }
            : undefined
        }
      />
    </RigidBody>
  )
}

function ExplosionCamera({
  active,
  bodies,
  controlsRef,
}: {
  active: boolean
  bodies: Map<string, RapierRigidBody>
  controlsRef: RefObject<OrbitControlsImpl | null>
}) {
  const { camera } = useThree()
  const scratch = useRef(new THREE.Vector3())
  const ysRef = useRef<number[]>([])
  const targetYRef = useRef(0.9)

  useFrame((_, dt) => {
    if (!active) return
    const controls = controlsRef.current
    if (!controls) return
    if (!(camera instanceof THREE.PerspectiveCamera)) return

    const ys = ysRef.current
    ys.length = 0

    let minX = Infinity
    let maxX = -Infinity
    let minZ = Infinity
    let maxZ = -Infinity
    let maxUp = 0

    for (const body of bodies.values()) {
      const t = body.translation()
      const v = body.linvel()
      ys.push(t.y)
      minX = Math.min(minX, t.x)
      maxX = Math.max(maxX, t.x)
      minZ = Math.min(minZ, t.z)
      maxZ = Math.max(maxZ, t.z)
      maxUp = Math.max(maxUp, v.y)
    }
    if (ys.length === 0) return

    // Drop the extreme top/bottom outliers so one rocket brick doesn't frame us.
    ys.sort((a, b) => a - b)
    const lo = Math.floor(ys.length * 0.08)
    const hi = Math.max(lo, Math.ceil(ys.length * 0.92) - 1)
    const yBottom = ys[lo]!
    const yTop = ys[hi]!
    // Nudge top with upward speed so we start pulling back before peak.
    const yTopPredict = yTop + Math.max(0, maxUp) * 0.15

    // Look a little below the mass so bricks sit with padding under them.
    const desiredTargetY = THREE.MathUtils.clamp(yBottom - 0.3, 0.9, 9)
    const prevTargetY = targetYRef.current
    targetYRef.current = THREE.MathUtils.lerp(
      prevTargetY,
      desiredTargetY,
      1 - Math.exp(-4.5 * dt),
    )
    const lift = targetYRef.current - prevTargetY
    controls.target.set(0, targetYRef.current, 0)
    camera.position.y += lift

    // Fit the debris sphere to the camera FOV — no magic zoom multipliers.
    const cx = (minX + maxX) * 0.5
    const cy = (yBottom + yTopPredict) * 0.5
    const cz = (minZ + maxZ) * 0.5
    const radius = Math.max(
      0.8,
      Math.hypot(maxX - cx, yTopPredict - cy, maxZ - cz),
      Math.hypot(minX - cx, yBottom - cy, minZ - cz),
      Math.abs(yTopPredict - targetYRef.current),
    )
    const vFov = THREE.MathUtils.degToRad(camera.fov)
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect)
    const fitFov = Math.min(vFov, hFov)
    const padding = 1.02
    const desired = THREE.MathUtils.clamp(
      (radius * padding) / Math.sin(fitFov / 2),
      4.5,
      22,
    )

    const offset = scratch.current
      .copy(camera.position)
      .sub(controls.target)
    const dist = offset.length()
    if (dist > 0.001) {
      const rate = desired > dist ? 5.5 : 2.2
      offset.setLength(
        THREE.MathUtils.lerp(dist, desired, 1 - Math.exp(-rate * dt)),
      )
      camera.position.copy(controls.target).add(offset)
    }
    controls.update()
  })

  useEffect(() => {
    if (!active) targetYRef.current = 0.9
  }, [active])

  return null
}

function SettleWatcher({
  active,
  bodies,
  onSettled,
}: {
  active: boolean
  bodies: Map<string, RapierRigidBody>
  onSettled: () => void
}) {
  const quietMs = useRef(0)
  const fired = useRef(false)

  useEffect(() => {
    if (!active) {
      quietMs.current = 0
      fired.current = false
    }
  }, [active])

  useFrame((_, dt) => {
    if (!active || fired.current) return
    let loud = false
    for (const body of bodies.values()) {
      const v = body.linvel()
      const a = body.angvel()
      if (
        Math.hypot(v.x, v.y, v.z) > 0.08 ||
        Math.hypot(a.x, a.y, a.z) > 0.25
      ) {
        loud = true
        break
      }
    }
    if (loud) {
      quietMs.current = 0
      return
    }
    quietMs.current += dt
    if (quietMs.current > 0.55) {
      fired.current = true
      onSettled()
    }
  })

  return null
}

/** Past the floor plate / under the world — safe to despawn after a beat. */
function isOffMap(x: number, y: number, z: number): boolean {
  return y < -1.5 || Math.hypot(x, z) > 4.75
}

/** Unmount bricks that stay off-map (stops endless free-fall physics). */
function FallenCullWatcher({
  active,
  bodies,
  protectedIdRef,
  culled,
  onCull,
}: {
  active: boolean
  bodies: Map<string, RapierRigidBody>
  protectedIdRef: RefObject<string | null>
  culled: ReadonlySet<string>
  onCull: (id: string) => void
}) {
  const outSince = useRef(new Map<string, number>())

  useEffect(() => {
    if (!active) outSince.current.clear()
  }, [active])

  useFrame((_, dt) => {
    if (!active) return
    const protectedId = protectedIdRef.current
    for (const [id, body] of bodies) {
      if (culled.has(id) || id === protectedId) continue
      const t = body.translation()
      if (!isOffMap(t.x, t.y, t.z)) {
        outSince.current.delete(id)
        continue
      }
      const next = (outSince.current.get(id) ?? 0) + dt
      outSince.current.set(id, next)
      if (next >= 1) onCull(id)
    }
  })

  return null
}

function JengaWorld({
  game,
  ghosts,
  canPlay,
  resetNonce,
  keepPhysics,
  onCommitMove,
  publishGhost,
  clearGhost,
}: {
  game: JengaGameState
  ghosts: JengaLiveGhost[]
  canPlay: boolean
  resetNonce: number
  keepPhysics: boolean
  onCommitMove: (
    bricks: JengaBrick[],
    collapsed: boolean,
    movedId: string | null,
    endReason: JengaEndReason,
    /** Successful clear that did not topple — bumps the remaining-brick score. */
    scoredRemoval: boolean,
  ) => void
  publishGhost: ReturnType<typeof useSharedJenga>['publishGhost']
  clearGhost: () => void
}) {
  const floorColor = useThemeCssColor('--color-surface-raised', '#2a2430')
  const catPair = useMemo(() => themesForGame(game.cats), [game.cats])
  const bodiesRef = useRef(new Map<string, RapierRigidBody>())
  const metaRoundIdRef = useRef(game.roundId)
  const brickMetaRef = useRef(new Map(game.bricks.map((b) => [b.id, b])))
  {
    // Brick ids reuse across rounds (`b-0-0`…) — never carry loose flags
    // from a previous tower into a reset.
    if (metaRoundIdRef.current !== game.roundId) {
      metaRoundIdRef.current = game.roundId
      brickMetaRef.current = new Map(game.bricks.map((b) => [b.id, b]))
    } else {
      const prev = brickMetaRef.current
      brickMetaRef.current = new Map(
        game.bricks.map((b) => {
          const old = prev.get(b.id)
          const loose = Boolean(b.loose || old?.loose)
          return [b.id, loose ? { ...b, loose: true } : b]
        }),
      )
    }
  }

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [pulling, setPulling] = useState(false)
  const [settling, setSettling] = useState(false)
  const [exploding, setExploding] = useState(false)
  const [wideShot, setWideShot] = useState(false)
  const [orbitEnabled, setOrbitEnabled] = useState(true)
  const [meteorStrikes, setMeteorStrikes] = useState<
    { id: number; aim: { x: number; y: number; z: number } }[]
  >([])
  const [culledBrickIds, setCulledBrickIds] = useState(() => new Set<string>())
  const clearedThisMoveRef = useRef(false)
  const expireMeteor = useCallback((strikeId: number) => {
    setMeteorStrikes((prev) => prev.filter((s) => s.id !== strikeId))
  }, [])
  const cullBrick = useCallback((id: string) => {
    setCulledBrickIds((prev) => {
      if (prev.has(id)) return prev
      const next = new Set(prev)
      next.add(id)
      return next
    })
  }, [])

  const controlsRef = useRef<OrbitControlsImpl | null>(null)
  const beforeRef = useRef<JengaBrick[]>(game.bricks)
  const movedIdRef = useRef<string | null>(null)
  const forceCollapseRef = useRef(false)
  const settleDoneRef = useRef(false)
  const lastExplodeCountRef = useRef(0)
  const lastMeteorCountRef = useRef(0)
  const pullRef = useRef<{
    id: string
    alongX: boolean
    startClientX: number
    startClientY: number
    origin: JengaPose
    lastClientX: number
    lastClientY: number
    lastTime: number
    lastDelta: number
    peakSpeed: number
  } | null>(null)
  const pullPeakSpeedRef = useRef(0)
  const cullProtectRef = useRef<string | null>(null)
  cullProtectRef.current = pullRef.current?.id ?? selectedId

  const setBody = useCallback((id: string, body: RapierRigidBody | null) => {
    if (body) bodiesRef.current.set(id, body)
    else bodiesRef.current.delete(id)
  }, [])

  const readBricks = useCallback((): JengaBrick[] => {
    const out: JengaBrick[] = []
    for (const brick of game.bricks) {
      if (culledBrickIds.has(brick.id)) continue
      const body = bodiesRef.current.get(brick.id)
      const meta = brickMetaRef.current.get(brick.id) ?? brick
      if (!body) {
        out.push(meta.loose ? { ...brick, ...meta, loose: true } : { ...brick, ...meta })
        continue
      }
      out.push({
        ...meta,
        ...poseFromBody(body),
        ...(meta.loose === true ? { loose: true as const } : {}),
      })
    }
    return out
  }, [culledBrickIds, game.bricks])
  const readBricksRef = useRef(readBricks)
  readBricksRef.current = readBricks

  const beginSettle = useCallback(
    (movedId: string | null) => {
      movedIdRef.current = movedId
      settleDoneRef.current = false
      forceCollapseRef.current = false
      setSettling(true)
      setPulling(false)
      setSelectedId(null)
      setOrbitEnabled(true)
      clearGhost()
      for (const body of bodiesRef.current.values()) {
        body.setBodyType(0, true) // Dynamic
        body.wakeUp()
      }
      // Yanky / unlucky pulls disturb the rest of the tower as physics starts.
      if (movedId) {
        shockTowerFromPull(
          bodiesRef.current,
          movedId,
          pullPeakSpeedRef.current,
        )
      }
      pullPeakSpeedRef.current = 0
    },
    [clearGhost],
  )

  const onSettled = useCallback(() => {
    if (settleDoneRef.current) return
    settleDoneRef.current = true
    // Detect topple before marking field debris — otherwise fallen tower
    // bricks are already `loose` and get skipped by detectCollapse.
    const settled = readBricks()
    const collapsed =
      forceCollapseRef.current ||
      detectCollapse(beforeRef.current, settled, movedIdRef.current)
    const after = markFieldDebris(settled)
    // Keep meta in sync so selection stays correct until Firestore lands.
    for (const brick of after) {
      const meta = brickMetaRef.current.get(brick.id)
      if (meta && brick.loose) meta.loose = true
    }
    const endReason: JengaEndReason = collapsed ? 'topple' : null
    const scoredRemoval = Boolean(clearedThisMoveRef.current) && !collapsed
    clearedThisMoveRef.current = false
    forceCollapseRef.current = false
    // Freeze after a normal pull settle (not explode chaos).
    for (const body of bodiesRef.current.values()) {
      body.setLinvel({ x: 0, y: 0, z: 0 }, true)
      body.setAngvel({ x: 0, y: 0, z: 0 }, true)
      body.setBodyType(1, true) // Fixed
    }
    setSettling(false)
    setPulling(false)
    setSelectedId(null)
    onCommitMove(
      after,
      collapsed,
      movedIdRef.current,
      endReason,
      scoredRemoval,
    )
  }, [onCommitMove, readBricks])

  useEffect(() => {
    setCulledBrickIds(new Set())
    setMeteorStrikes([])
    clearedThisMoveRef.current = false
  }, [game.roundId])

  const appliedResetRef = useRef(0)

  useEffect(() => {
    if (!resetNonce || resetNonce === appliedResetRef.current) return
    // Wait until the playable physics view is up so OrbitControls is mounted.
    if (!(canPlay && game.status === 'playing')) return
    pullRef.current = null
    forceCollapseRef.current = false
    settleDoneRef.current = false
    lastExplodeCountRef.current = 0
    lastMeteorCountRef.current = 0
    setMeteorStrikes([])
    setCulledBrickIds(new Set())
    setPulling(false)
    setSelectedId(null)
    setOrbitEnabled(true)
    setExploding(false)
    setWideShot(false)
    setSettling(false)
    let cancelled = false
    let inner = 0
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => {
        if (cancelled) return
        appliedResetRef.current = resetNonce
        const controls = controlsRef.current
        if (!controls) return
        controls.target.set(0, 0.9, 0)
        controls.object.position.set(2.6, 2.4, 3.4)
        controls.update()
      })
    })
    return () => {
      cancelled = true
      cancelAnimationFrame(outer)
      cancelAnimationFrame(inner)
    }
  }, [canPlay, game.status, game.version, resetNonce])

  useEffect(() => {
    // Sync remote/local explode pulses — every client replays the blast.
    if (!game.explodeCount) return
    if (game.explodeCount <= lastExplodeCountRef.current) return
    if (!canPlay && !keepPhysics) return

    const target = game.explodeCount
    let cancelled = false
    let waits = 0

    const blast = () => {
      if (cancelled) return
      // Wait until rigid bodies are mounted (partner just flipped into physics).
      if (bodiesRef.current.size === 0 && waits < 120) {
        waits += 1
        requestAnimationFrame(blast)
        return
      }
      lastExplodeCountRef.current = target

      pullRef.current = null
      setPulling(false)
      setSelectedId(null)
      setOrbitEnabled(true)
      clearGhost()
      setExploding(true)
      setWideShot(true)

      blastBodies(bodiesRef.current.values(), { x: 0, y: 0, z: 0 }, 1)
    }

    requestAnimationFrame(() => requestAnimationFrame(blast))
    return () => {
      cancelled = true
    }
  }, [canPlay, clearGhost, game.explodeCount, keepPhysics])

  useEffect(() => {
    if (!game.meteorCount) return
    if (game.meteorCount <= lastMeteorCountRef.current) return
    if (!canPlay && !keepPhysics) return

    const target = game.meteorCount
    let cancelled = false
    let waits = 0

    const spawn = () => {
      if (cancelled) return
      if (bodiesRef.current.size === 0 && waits < 120) {
        waits += 1
        requestAnimationFrame(spawn)
        return
      }
      lastMeteorCountRef.current = target

      // Loosen the tower so the impact can scatter bricks.
      for (const body of bodiesRef.current.values()) {
        body.setBodyType(0, true)
        body.wakeUp()
      }
      pullRef.current = null
      setPulling(false)
      setSelectedId(null)
      setOrbitEnabled(true)
      clearGhost()
      const aim = averageBrickCenter(readBricksRef.current())
      setMeteorStrikes((prev) =>
        prev.some((s) => s.id === target)
          ? prev
          : [...prev, { id: target, aim }],
      )
    }

    requestAnimationFrame(() => requestAnimationFrame(spawn))
    return () => {
      cancelled = true
    }
  }, [canPlay, clearGhost, game.meteorCount, keepPhysics])

  const onMeteorImpact = useCallback(
    (origin: { x: number; y: number; z: number }) => {
      // ~70% land in 0.5–0.8×; the rest stretch up to 1.5×.
      const strength =
        Math.random() < 0.7
          ? 0.5 + Math.random() * 0.3
          : 0.8 + Math.random() * 0.7
      blastBodies(bodiesRef.current.values(), origin, strength)
    },
    [],
  )

  const onSelect = (id: string) => {
    if (!canPlay || settling || game.status !== 'playing') return
    const meta = brickMetaRef.current.get(id)
    if (meta?.loose) return
    setSelectedId(id)
  }

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const pull = pullRef.current
      if (!pull) return
      const body = bodiesRef.current.get(pull.id)
      if (!body) return
      const now = performance.now()
      const dt = Math.max(0.008, (now - pull.lastTime) / 1000)
      const dx = (event.clientX - pull.startClientX) * 0.004
      const dy = (event.clientY - pull.startClientY) * 0.004
      // Screen X/Y → world pull along brick long axis (approx).
      const delta = dx - dy * 0.35
      const speed = Math.abs(delta - pull.lastDelta) / dt
      pull.peakSpeed = Math.max(pull.peakSpeed, speed)
      pullPeakSpeedRef.current = pull.peakSpeed
      pull.lastDelta = delta
      pull.lastClientX = event.clientX
      pull.lastClientY = event.clientY
      pull.lastTime = now

      const wig = pullWiggleOffset(pull.peakSpeed, speed)
      const next = {
        x:
          pull.origin.x +
          (pull.alongX ? delta : wig.perp),
        y: pull.origin.y + wig.y,
        z:
          pull.origin.z +
          (pull.alongX ? wig.perp : delta),
      }
      body.setNextKinematicTranslation(next)
      publishGhost({
        brickId: pull.id,
        phase: 'pulling',
        pose: {
          ...pull.origin,
          x: next.x,
          y: next.y,
          z: next.z,
        },
      })
    }

    const onUp = () => {
      const pull = pullRef.current
      if (!pull) return
      pullRef.current = null
      setOrbitEnabled(true)

      const body = bodiesRef.current.get(pull.id)
      const meta = brickMetaRef.current.get(pull.id)
      if (!body || !meta) {
        setPulling(false)
        clearGhost()
        pullPeakSpeedRef.current = 0
        return
      }

      const pose = poseFromBody(body)
      const travel = pull.alongX
        ? Math.abs(pose.x - pull.origin.x)
        : Math.abs(pose.z - pull.origin.z)
      const cleared = travel > BRICK_L * 0.52
      pullPeakSpeedRef.current = pull.peakSpeed

      // Carry a bit of yank into the free brick when physics takes over.
      const sign =
        (pull.alongX ? pose.x - pull.origin.x : pose.z - pull.origin.z) >= 0
          ? 1
          : -1
      const fling = Math.min(1.4, pull.peakSpeed * 0.35) * sign
      body.setLinvel(
        {
          x: pull.alongX ? fling : (Math.random() - 0.5) * 0.05,
          y: 0,
          z: pull.alongX ? (Math.random() - 0.5) * 0.05 : fling,
        },
        true,
      )

      if (cleared) {
        // Leave the brick on the field as debris — still physics, not selectable.
        meta.loose = true
        clearedThisMoveRef.current = true
        publishGhost({
          brickId: pull.id,
          phase: 'placing',
          pose,
        })
      } else {
        clearedThisMoveRef.current = false
      }

      beginSettle(pull.id)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [beginSettle, clearGhost, publishGhost])

  const startPull = (id: string, clientX: number, clientY: number) => {
    if (!canPlay || settling || pulling) return
    const body = bodiesRef.current.get(id)
    const meta = brickMetaRef.current.get(id)
    if (!body || !meta || meta.loose) return
    clearedThisMoveRef.current = false
    beforeRef.current = readBricks()
    const origin = poseFromBody(body)
    body.setBodyType(2, true) // KinematicPositionBased
    const now = performance.now()
    pullRef.current = {
      id,
      alongX: meta.alongX,
      startClientX: clientX,
      startClientY: clientY,
      origin,
      lastClientX: clientX,
      lastClientY: clientY,
      lastTime: now,
      lastDelta: 0,
      peakSpeed: 0,
    }
    pullPeakSpeedRef.current = 0
    setPulling(true)
    setOrbitEnabled(false)
    publishGhost({ brickId: id, phase: 'pulling', pose: origin })
  }

  const physicsOn = canPlay || keepPhysics

  const arenaWall = useMemo(() => {
    const radius = 3.15
    const height = 6
    const segments = 28
    const thickness = 0.18
    const arc = (Math.PI * 2 * radius) / segments
    const panels: ReactNode[] = []
    for (let i = 0; i < segments; i += 1) {
      const angle = (i / segments) * Math.PI * 2
      panels.push(
        <RigidBody
          key={i}
          type="fixed"
          colliders={false}
          position={[Math.cos(angle) * radius, height / 2, Math.sin(angle) * radius]}
          rotation={[0, -angle, 0]}
        >
          <CuboidCollider
            args={[thickness / 2, height / 2, arc / 2 + 0.02]}
            // Group 1: keep bricks in, let catsteroids (group 2) pass.
            collisionGroups={interactionGroups(1, [0])}
          />
        </RigidBody>,
      )
    }
    return panels
  }, [])

  // Partner / waiting view — static meshes only.
  if (!physicsOn) {
    return (
      <>
        <ambientLight intensity={0.65} />
        <directionalLight
          castShadow
          intensity={1.1}
          position={[4, 8, 3]}
          shadow-mapSize={[1024, 1024]}
        />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
          <circleGeometry args={[3.2, 48]} />
          <meshStandardMaterial color={floorColor} roughness={0.95} />
        </mesh>
        {game.bricks.map((brick) => {
          const ghost = ghosts.find((g) => g.brickId === brick.id)
          const shown: JengaBrick = ghost
            ? { ...brick, ...ghost.pose }
            : brick
          return (
            <group
              key={brick.id}
              position={[shown.x, shown.y, shown.z]}
              quaternion={[shown.qx, shown.qy, shown.qz, shown.qw]}
            >
              <BrickMesh
                brick={shown}
                ghost={Boolean(ghost)}
                lastMove={game.lastBrickId === brick.id}
                catPair={catPair}
              />
            </group>
          )
        })}
        <OrbitControls
          ref={controlsRef}
          makeDefault
          enablePan={false}
          minDistance={2.2}
          maxDistance={wideShot ? 32 : 9}
          maxPolarAngle={Math.PI * 0.49}
          {...(wideShot ? {} : { target: [0, 0.9, 0] as [number, number, number] })}
        />
      </>
    )
  }

  return (
    <>
      <ambientLight intensity={0.65} />
      <directionalLight
        castShadow
        intensity={1.1}
        position={[4, 8, 3]}
        shadow-mapSize={[1024, 1024]}
      />
      <Physics gravity={[0, -9.81, 0]} key={game.roundId}>
        <RigidBody type="fixed" colliders={false} position={[0, -0.05, 0]}>
          <CuboidCollider args={[4, 0.05, 4]} />
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, 0.05, 0]}
            receiveShadow
          >
            <circleGeometry args={[3.2, 48]} />
            <meshStandardMaterial color={floorColor} roughness={0.95} />
          </mesh>
        </RigidBody>

        {arenaWall}

        {meteorStrikes.map((strike) => (
          <Suspense key={`meteor-${strike.id}`} fallback={null}>
            <CatMeteor
              strikeId={strike.id}
              roundId={game.roundId}
              aim={strike.aim}
              onImpact={onMeteorImpact}
              onExpire={expireMeteor}
            />
          </Suspense>
        ))}

        {game.bricks
          .filter((brick) => !culledBrickIds.has(brick.id))
          .map((brick) => {
            const meta = brickMetaRef.current.get(brick.id)
            const loose = Boolean(meta?.loose ?? brick.loose)
            return (
          <PhysicsBrick
            key={brick.id}
            brick={loose ? { ...brick, loose: true } : brick}
            selected={selectedId === brick.id}
            lastMove={game.lastBrickId === brick.id}
            bodyRef={setBody}
            pulling={pulling && selectedId === brick.id}
            interactive={
              !loose &&
              !pulling &&
              !settling &&
              game.status === 'playing'
            }
            catPair={catPair}
            onSelect={onSelect}
            onPullStart={startPull}
          />
            )
          })}

        <FallenCullWatcher
          // Despawn off-map bricks in normal play too (not only explode/meteor),
          // so the header count tracks what’s still in the scene.
          active
          bodies={bodiesRef.current}
          protectedIdRef={cullProtectRef}
          culled={culledBrickIds}
          onCull={cullBrick}
        />

        <SettleWatcher
          active={settling}
          bodies={bodiesRef.current}
          onSettled={onSettled}
        />
      </Physics>

      <ExplosionCamera
        active={exploding}
        bodies={bodiesRef.current}
        controlsRef={controlsRef}
      />

      <OrbitControls
        ref={controlsRef}
        makeDefault
        enabled={orbitEnabled}
        enablePan={false}
        minDistance={2.2}
        maxDistance={wideShot ? 32 : 9}
        maxPolarAngle={Math.PI * 0.49}
        {...(wideShot ? {} : { target: [0, 0.9, 0] as [number, number, number] })}
      />
    </>
  )
}

export function Jenga({ onClose }: { onClose: () => void }) {
  const {
    game,
    ghosts,
    ready,
    liveEnabled,
    canPlay,
    uid,
    commitGame,
    resetGame,
    publishGhost,
    clearGhost,
  } = useSharedJenga()
  const sceneBg = useThemeCssColor('--color-app-bg', '#1a1620')
  const [confirmReset, setConfirmReset] = useState(false)
  const [confirmExplode, setConfirmExplode] = useState(false)
  const [confirmMeteor, setConfirmMeteor] = useState(false)
  const [resetNonce, setResetNonce] = useState(0)
  const [busy, setBusy] = useState(false)
  /** Local explode/meteor chaos — keep physics + allow spam without re-confirm. */
  const [explodeChaos, setExplodeChaos] = useState(false)
  const [chaosKind, setChaosKind] = useState<'explode' | 'meteor' | null>(null)
  const bricksInPlay = jengaRemainingScore(game.removedCount)

  useEffect(() => {
    if (game.status === 'playing') {
      setExplodeChaos(false)
      setChaosKind(null)
    }
  }, [game.roundId, game.status])

  const onCommitMove = useCallback(
    async (
      bricks: JengaBrick[],
      collapsed: boolean,
      _movedId: string | null,
      endReason: JengaEndReason,
      scoredRemoval: boolean,
    ) => {
      if (!uid || busy) return
      setBusy(true)
      try {
        clearGhost()
        const next: JengaGameState = {
          bricks,
          turnUid: uid,
          status: collapsed ? 'collapsed' : 'playing',
          winnerUid: collapsed ? nextTurnUid(uid) : null,
          updatedAt: Date.now(),
          version: game.version + 1,
          cats: game.cats,
          endReason: collapsed ? endReason ?? 'topple' : null,
          roundId: game.roundId,
          explodeCount: game.explodeCount,
          meteorCount: game.meteorCount,
          removedCount: game.removedCount + (scoredRemoval ? 1 : 0),
          lastBrickId: _movedId,
        }
        await commitGame(next)
      } finally {
        setBusy(false)
      }
    },
    [
      busy,
      clearGhost,
      commitGame,
      game.cats,
      game.explodeCount,
      game.meteorCount,
      game.removedCount,
      game.roundId,
      game.version,
      uid,
    ],
  )

  const fireExplode = useCallback(() => {
    setExplodeChaos(true)
    setChaosKind('explode')
    if (!uid) return
    void commitGame((g) => ({
      ...g,
      status: 'collapsed',
      endReason: 'explode',
      winnerUid:
        g.status === 'playing' ? nextTurnUid(uid) : g.winnerUid,
      explodeCount: g.explodeCount + 1,
      updatedAt: Date.now(),
      version: g.version + 1,
    }))
  }, [commitGame, uid])

  const fireMeteor = useCallback(() => {
    setExplodeChaos(true)
    setChaosKind('meteor')
    if (!uid) return
    void commitGame((g) => ({
      ...g,
      status: 'collapsed',
      endReason: 'meteor',
      winnerUid:
        g.status === 'playing' ? nextTurnUid(uid) : g.winnerUid,
      meteorCount: g.meteorCount + 1,
      updatedAt: Date.now(),
      version: g.version + 1,
    }))
  }, [commitGame, uid])

  const confirmFirstExplode = useCallback(() => {
    setConfirmExplode(false)
    setConfirmMeteor(false)
    setConfirmReset(false)
    fireExplode()
  }, [fireExplode])

  const confirmFirstMeteor = useCallback(() => {
    setConfirmMeteor(false)
    setConfirmExplode(false)
    setConfirmReset(false)
    fireMeteor()
  }, [fireMeteor])

  const chaosActive =
    explodeChaos ||
    game.endReason === 'explode' ||
    game.endReason === 'meteor'

  const statusLabel = useMemo(() => {
    if (game.status === 'collapsed' || chaosActive) {
      if (game.endReason === 'meteor' || chaosKind === 'meteor')
        return 'Game over — this is the world you wanted..'
      if (game.endReason === 'explode' || chaosKind === 'explode')
        return 'Game over — you chose this!'
      return 'Game over — the tower has fallen!'
    }
    if (!uid) return 'Sign in to play'
    if (game.firstUid == null) return 'Who goes first?'
    return null
  }, [chaosActive, chaosKind, game.endReason, game.firstUid, game.status, uid])

  // Always available while signed in — after a normal topple they still work,
  // and while playing the first click confirms then flips to game over.
  const canChaos = Boolean(uid)
  const chaosNeedsConfirm = game.status === 'playing' && !chaosActive

  return (
    <ArcadeStage
      title="Jenga"
      onClose={onClose}
      meta={
        <span className="text-[11px] text-muted tabular-nums">
          {bricksInPlay} left
          {liveEnabled ? ' · live' : ''}
        </span>
      }
    >
      {({ immersive }) => (
        <>
          {immersive ? null : (
            <div className="mt-2 rounded-xl border border-border bg-surface/60 px-3.5 py-3">
              <p className="text-[11px] leading-relaxed text-muted">
                Shared tower — either of you can pull anytime. Physics runs on
                whoever&apos;s moving a brick; the result syncs when it settles.
              </p>
              <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
                {(
                  [
                    ['Orbit', 'drag the view'],
                    ['Zoom', 'scroll'],
                    ['Select', 'tap a brick'],
                    ['Pull', 'tap again & drag free'],
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

          <div className="mt-3 flex flex-wrap items-start gap-2">
            {statusLabel ? (
              <ArcadeStatus
                tone={
                  game.status === 'collapsed' || chaosActive
                    ? 'danger'
                    : 'ready'
                }
              >
                {statusLabel}
              </ArcadeStatus>
            ) : (
              <ArcadeStatus>Ready — pick a brick</ArcadeStatus>
            )}
            <div className="flex shrink-0 flex-wrap items-center gap-1.5">
              {confirmExplode && chaosNeedsConfirm ? (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => confirmFirstExplode()}
                    className="rounded-lg border border-amber-500/55 bg-amber-500/20 px-2.5 py-1 text-xs font-medium text-app-text transition hover:bg-amber-500/30"
                  >
                    Do you really want to do this?
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmExplode(false)}
                    className="rounded-lg px-2 py-1 text-xs text-muted transition hover:text-white"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={!canChaos}
                  onClick={() => {
                    setConfirmReset(false)
                    setConfirmMeteor(false)
                    if (chaosNeedsConfirm) {
                      setConfirmExplode(true)
                      return
                    }
                    fireExplode()
                  }}
                  className="rounded-lg border border-amber-500/55 bg-amber-500/20 px-2.5 py-1 text-xs font-medium text-app-text transition hover:border-amber-400/70 hover:bg-amber-500/30 disabled:opacity-40"
                >
                  Explode
                </button>
              )}
              {confirmMeteor && chaosNeedsConfirm ? (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => confirmFirstMeteor()}
                    className="rounded-lg border border-violet-500/55 bg-violet-500/20 px-2.5 py-1 text-xs font-medium text-app-text transition hover:bg-violet-500/30"
                  >
                    You can&apos;t undo this...
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmMeteor(false)}
                    className="rounded-lg px-2 py-1 text-xs text-muted transition hover:text-white"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={!canChaos}
                  onClick={() => {
                    setConfirmReset(false)
                    setConfirmExplode(false)
                    if (chaosNeedsConfirm) {
                      setConfirmMeteor(true)
                      return
                    }
                    fireMeteor()
                  }}
                  className="rounded-lg border border-violet-500/55 bg-violet-500/20 px-2.5 py-1 text-xs font-medium text-app-text transition hover:border-violet-400/70 hover:bg-violet-500/30 disabled:opacity-40"
                >
                  Catsteroid
                </button>
              )}
              {confirmReset ? (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmReset(false)
                      setConfirmExplode(false)
                      setConfirmMeteor(false)
                      setExplodeChaos(false)
                      setChaosKind(null)
                      setResetNonce((n) => n + 1)
                      void resetGame()
                    }}
                    className="rounded-lg border border-rose-500/55 bg-rose-500/20 px-2.5 py-1 text-xs font-medium text-app-text transition hover:bg-rose-500/30"
                  >
                    Confirm reset
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmReset(false)}
                    className="rounded-lg px-2 py-1 text-xs text-muted transition hover:text-white"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setConfirmExplode(false)
                    setConfirmReset(true)
                  }}
                  className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-medium text-muted transition hover:border-white/25 hover:text-white"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {game.firstUid == null && game.status === 'playing' ? (
            <div className="mt-6">
              <GameSeatPicker
                prompt="Who goes first?"
                optionLabel={(name) => `${name} goes first`}
                onPick={(seat) =>
                  void commitGame(
                    (prev) => selectJengaFirst(prev, seat) ?? prev,
                  )
                }
              />
            </div>
          ) : (
          <div
            className={[
              'relative mt-3 overflow-hidden rounded-xl border border-border bg-app-bg',
              immersive ? 'min-h-0 flex-1' : 'h-[28rem] sm:h-[34rem]',
            ].join(' ')}
          >
            {ready ? (
              <Canvas
                shadows
                camera={{ position: [2.6, 2.4, 3.4], fov: 42 }}
                gl={{ antialias: true, alpha: false }}
              >
                <ThemeClearColor color={sceneBg} />
                <JengaWorld
                  game={game}
                  ghosts={ghosts}
                  canPlay={canPlay}
                  resetNonce={resetNonce}
                  keepPhysics={
                    explodeChaos ||
                    game.endReason === 'explode' ||
                    game.endReason === 'meteor'
                  }
                  onCommitMove={onCommitMove}
                  publishGhost={publishGhost}
                  clearGhost={clearGhost}
                />
              </Canvas>
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-muted">
                Loading tower…
              </div>
            )}
          </div>
          )}
        </>
      )}
    </ArcadeStage>
  )
}
