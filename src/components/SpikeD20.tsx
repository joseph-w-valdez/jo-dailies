import { Canvas, useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'

type FaceMeta = {
  center: THREE.Vector3
  normal: THREE.Vector3
  quat: THREE.Quaternion
}

/** Camera sits on +Z looking at origin — land the winning face toward +Z. */
const CAMERA_DIR = new THREE.Vector3(0, 0, 1)

function buildFaces(radius: number): FaceMeta[] {
  const geo = new THREE.IcosahedronGeometry(radius, 0)
  const nonIndexed = geo.toNonIndexed()
  geo.dispose()
  const pos = nonIndexed.attributes.position
  const faces: FaceMeta[] = []
  for (let f = 0; f < 20; f += 1) {
    const a = new THREE.Vector3().fromBufferAttribute(pos, f * 3)
    const b = new THREE.Vector3().fromBufferAttribute(pos, f * 3 + 1)
    const c = new THREE.Vector3().fromBufferAttribute(pos, f * 3 + 2)
    const center = a.clone().add(b).add(c).multiplyScalar(1 / 3)
    const normal = new THREE.Vector3()
      .crossVectors(b.clone().sub(a), c.clone().sub(a))
      .normalize()
    if (normal.dot(center) < 0) normal.negate()
    const quat = new THREE.Quaternion().setFromUnitVectors(normal, CAMERA_DIR)
    faces.push({ center, normal, quat })
  }
  nonIndexed.dispose()
  return faces
}

function DieMesh({
  faces,
  highlight,
}: {
  faces: FaceMeta[]
  /** Winning face — sky accent; others stay white. */
  highlight?: number
}) {
  return (
    <>
      <mesh>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial
          color="#0f172a"
          roughness={0.35}
          metalness={0.25}
          flatShading
        />
      </mesh>
      <mesh>
        <icosahedronGeometry args={[1.01, 0]} />
        <meshBasicMaterial
          color="#94a3b8"
          wireframe
          transparent
          opacity={0.35}
        />
      </mesh>
      {faces.map((face, i) => {
        const n = i + 1
        const pos = face.center.clone().multiplyScalar(1.08)
        const q = new THREE.Quaternion().setFromUnitVectors(
          new THREE.Vector3(0, 0, 1),
          face.normal,
        )
        return (
          <Text
            key={n}
            position={[pos.x, pos.y, pos.z]}
            quaternion={q}
            fontSize={0.42}
            color={n === highlight ? '#38bdf8' : '#f8fafc'}
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.03}
            outlineColor="#020617"
          >
            {String(n)}
          </Text>
        )
      })}
    </>
  )
}

function IdleDie({ faces }: { faces: FaceMeta[] }) {
  const group = useRef<THREE.Group>(null)
  useFrame((_, dt) => {
    const g = group.current
    if (!g) return
    g.rotation.y += dt * 0.35
    g.rotation.x = Math.sin(performance.now() / 1800) * 0.15
  })
  return (
    <group ref={group}>
      <DieMesh faces={faces} />
    </group>
  )
}

function SpinDie({
  result,
  spinKey,
  faces,
  onSettled,
}: {
  result: number
  spinKey: number
  faces: FaceMeta[]
  onSettled?: () => void
}) {
  const group = useRef<THREE.Group>(null)
  const startedAt = useRef(0)
  const fromQ = useRef(new THREE.Quaternion())
  const wobble = useRef(new THREE.Euler())
  const done = useRef(false)
  const settledRef = useRef(onSettled)
  settledRef.current = onSettled
  const duration = 1.05

  const finish = () => {
    if (done.current) return
    done.current = true
    if (group.current) {
      const target = faces[Math.max(0, Math.min(19, result - 1))]!.quat
      group.current.quaternion.copy(target)
    }
    settledRef.current?.()
  }

  useEffect(() => {
    startedAt.current = performance.now() / 1000
    done.current = false
    if (group.current) fromQ.current.copy(group.current.quaternion)
    else fromQ.current.identity()
    wobble.current.set(
      (Math.random() - 0.5) * 16,
      8 + Math.random() * 10,
      (Math.random() - 0.5) * 14,
    )
    // Failsafe: if the canvas frameloop stalls, still unlock the queue.
    const failsafe = window.setTimeout(finish, (duration + 0.35) * 1000)
    return () => window.clearTimeout(failsafe)
  }, [spinKey, result])

  useFrame(() => {
    const g = group.current
    if (!g || done.current) return
    const u = Math.min(
      1,
      (performance.now() / 1000 - startedAt.current) / duration,
    )
    const ease = 1 - (1 - u) ** 3
    const target = faces[Math.max(0, Math.min(19, result - 1))]!.quat
    const spin = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(
        wobble.current.x * (1 - ease),
        wobble.current.y * (1 - ease),
        wobble.current.z * (1 - ease),
      ),
    )
    g.quaternion.copy(fromQ.current).slerp(target, ease).premultiply(spin)
    if (u >= 1) finish()
  })

  return (
    <group ref={group}>
      <DieMesh faces={faces} highlight={result} />
    </group>
  )
}

export type SpikeDiceRoll = {
  result: number
  key: number
}

/** Compact d20 panel — always mounted; spins when `roll` is set. */
export function SpikeD20({
  roll,
  onSettled,
  className = '',
}: {
  roll: SpikeDiceRoll | null
  onSettled?: () => void
  className?: string
}) {
  const faces = useMemo(() => buildFaces(1), [])

  return (
    <div
      className={[
        'pointer-events-none relative overflow-hidden rounded-xl border border-border bg-[#0b1220]',
        className,
      ].join(' ')}
      aria-hidden
    >
      <Canvas
        camera={{ position: [0, 0, 3.4], fov: 35 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
        style={{ width: '100%', height: '100%' }}
      >
        <ambientLight intensity={0.85} />
        <directionalLight position={[3, 5, 4]} intensity={1.15} />
        <directionalLight position={[-3, -2, -2]} intensity={0.35} />
        {roll ? (
          <SpinDie
            key={roll.key}
            result={roll.result}
            spinKey={roll.key}
            faces={faces}
            onSettled={onSettled}
          />
        ) : (
          <IdleDie faces={faces} />
        )}
      </Canvas>
    </div>
  )
}
