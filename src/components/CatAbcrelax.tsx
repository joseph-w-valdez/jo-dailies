import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Text } from '@react-three/drei'
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { useSharedAbcrelax } from '../hooks/useSharedAbcrelax'
import {
  ABCRELAX_CARDS_TO_WIN,
  ABCRELAX_LETTERS,
  ABCRELAX_TURN_MS,
  acceptAbcrelaxAnswer,
  challengeAbcrelaxAnswer,
  challengeAbcrelaxLast,
  continueAbcrelaxRound,
  letterIsUsed,
  msLeft,
  resolveAbcrelaxTimeout,
  selectAbcrelaxFirst,
  setAbcrelaxAnswerMode,
  submitAbcrelaxAnswer,
  submitAbcrelaxLetter,
  surrenderAbcrelax,
  wordMatchesLetter,
  type AbcrelaxState,
} from '../lib/abcrelax'
import { householdName } from '../lib/household'
import { JENGA_PLAYER_UIDS } from '../lib/jenga'
import { ArcadeStage, ArcadeStatus } from './ArcadeStage'
import { GameSeatPicker } from './GameSeatPicker'
import { NewGameConfirm } from './NewGameConfirm'
import { SurrenderButton } from './SurrenderButton'
import { ThemeClearColor } from './ThemeClearColor'

const WHEEL_R = 2.55
const KEY_R = 0.28

function LetterKey({
  letter,
  index,
  used,
  selected,
  interactive,
  onPick,
}: {
  letter: string
  index: number
  used: boolean
  selected: boolean
  interactive: boolean
  onPick: (letter: string) => void
}) {
  const mesh = useRef<THREE.Mesh>(null)
  const angle = (index / ABCRELAX_LETTERS.length) * Math.PI * 2 - Math.PI / 2
  const x = Math.cos(angle) * WHEEL_R
  const z = Math.sin(angle) * WHEEL_R
  const targetY = used ? -0.18 : selected ? 0.12 : 0.02

  useFrame((_, dt) => {
    const m = mesh.current
    if (!m) return
    m.position.y = THREE.MathUtils.damp(m.position.y, targetY, 12, dt)
  })

  const color = used
    ? '#334155'
    : selected
      ? '#fbbf24'
      : interactive
        ? '#e2e8f0'
        : '#94a3b8'

  return (
    <group position={[x, 0, z]} rotation={[0, -angle + Math.PI / 2, 0]}>
      <mesh
        ref={mesh}
        castShadow
        position={[0, 0.02, 0]}
        onClick={(e) => {
          e.stopPropagation()
          if (!interactive || used) return
          onPick(letter)
        }}
        onPointerOver={(e) => {
          e.stopPropagation()
          if (interactive && !used) {
            document.body.style.cursor = 'pointer'
          }
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'auto'
        }}
      >
        <cylinderGeometry args={[KEY_R, KEY_R * 0.92, 0.22, 20]} />
        <meshStandardMaterial
          color={color}
          roughness={0.45}
          metalness={used ? 0.05 : 0.2}
        />
      </mesh>
      <Text
        position={[0, used ? -0.02 : 0.16, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.28}
        color={used ? '#64748b' : selected ? '#1c1917' : '#0f172a'}
        anchorX="center"
        anchorY="middle"
      >
        {letter}
      </Text>
    </group>
  )
}

function CenterTimer({
  seconds,
  urgent,
}: {
  seconds: number | null
  urgent: boolean
}) {
  const mesh = useRef<THREE.Mesh>(null)
  useFrame((_, dt) => {
    const m = mesh.current
    if (!m) return
    const pulse = urgent ? 1 + Math.sin(performance.now() / 120) * 0.04 : 1
    m.scale.setScalar(THREE.MathUtils.damp(m.scale.x, pulse, 10, dt))
  })
  const label =
    seconds == null ? '·' : String(Math.max(0, Math.ceil(seconds)))
  return (
    <group>
      <mesh ref={mesh} position={[0, 0.05, 0]} castShadow>
        <cylinderGeometry args={[0.85, 0.9, 0.35, 48]} />
        <meshStandardMaterial
          color={urgent ? '#f43f5e' : '#0ea5e9'}
          roughness={0.35}
          metalness={0.35}
        />
      </mesh>
      <Text
        position={[0, 0.28, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.55}
        color="#f8fafc"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#0f172a"
      >
        {label}
      </Text>
    </group>
  )
}

function WheelScene({
  game,
  selected,
  canPickLetter,
  onPickLetter,
  secondsLeft,
}: {
  game: AbcrelaxState
  selected: string | null
  canPickLetter: boolean
  onPickLetter: (letter: string) => void
  secondsLeft: number | null
}) {
  const urgent =
    secondsLeft != null && secondsLeft <= 3 && game.phase === 'playing'
  return (
    <>
      <ThemeClearColor color="#0b1220" />
      <ambientLight intensity={0.55} />
      <directionalLight
        position={[4, 8, 3]}
        intensity={1.15}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.12, 0]} receiveShadow>
        <cylinderGeometry args={[3.35, 3.35, 0.18, 64]} />
        <meshStandardMaterial color="#1e293b" roughness={0.7} metalness={0.15} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <ringGeometry args={[1.15, 3.15, 64]} />
        <meshStandardMaterial color="#334155" roughness={0.85} metalness={0.1} />
      </mesh>
      <CenterTimer seconds={secondsLeft} urgent={urgent} />
      {ABCRELAX_LETTERS.map((letter, i) => (
        <LetterKey
          key={letter}
          letter={letter}
          index={i}
          used={letterIsUsed(game, letter)}
          selected={selected === letter}
          interactive={canPickLetter}
          onPick={onPickLetter}
        />
      ))}
      <OrbitControls
        enablePan={false}
        minPolarAngle={0.35}
        maxPolarAngle={1.15}
        minDistance={5}
        maxDistance={9}
        target={[0, 0, 0]}
      />
    </>
  )
}

function scoreLine(game: AbcrelaxState): string {
  const a = JENGA_PLAYER_UIDS[0]!
  const b = JENGA_PLAYER_UIDS[1]!
  return `${householdName(a)} ${game.scores[a] ?? 0}–${game.scores[b] ?? 0} ${householdName(b)} · first to ${ABCRELAX_CARDS_TO_WIN}`
}

export function CatAbcrelax({ onClose }: { onClose: () => void }) {
  const { game, ready, uid, actorUid, canAct, commitGame, resetGame } =
    useSharedAbcrelax()
  const [newGameOpen, setNewGameOpen] = useState(false)
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null)
  const [wordDraft, setWordDraft] = useState('')
  const [now, setNow] = useState(() => Date.now())
  const verbal = game.answerMode === 'verbal'

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 100)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    if (game.phase !== 'playing' || game.deadlineAt == null) return
    if (now < game.deadlineAt) return
    void commitGame((prev) => resolveAbcrelaxTimeout(prev) ?? prev)
  }, [game.phase, game.deadlineAt, now, commitGame])

  useEffect(() => {
    setSelectedLetter(null)
    setWordDraft('')
  }, [game.roundId, game.phase, game.turnUid, game.pending?.letter])

  const left = msLeft(game, now)
  const secondsLeft = left == null ? null : left / 1000

  const myTurnAnswer =
    canAct && game.phase === 'playing' && game.turnUid === actorUid
  const myTurnReview =
    canAct && game.phase === 'pending' && game.turnUid === actorUid
  const canChallengeLast =
    verbal &&
    myTurnAnswer &&
    game.lastAnswer != null &&
    game.lastAnswer.uid !== actorUid

  const statusLabel = (() => {
    if (!ready) return 'Syncing…'
    if (game.firstUid == null) return 'Who goes first?'
    if (game.phase === 'gameOver' || game.status === 'won') {
      return game.winnerUid === uid
        ? 'You win the stack!'
        : `${householdName(game.winnerUid)} wins`
    }
    if (game.phase === 'roundOver') {
      return game.roundWinnerUid
        ? `${householdName(game.roundWinnerUid)} takes the card`
        : 'Round over'
    }
    if (game.phase === 'pending' && game.pending) {
      if (myTurnReview) {
        return `Accept or challenge “${game.pending.word}”`
      }
      return 'Waiting for accept / challenge…'
    }
    if (myTurnAnswer) {
      const need =
        game.answersNeeded > 1
          ? ` · ${game.answersThisTurn.length + 1}/${game.answersNeeded}`
          : ''
      return verbal
        ? `Your turn — say it on Discord, press a letter${need}`
        : `Your turn — type a word + letter${need}`
    }
    return `Waiting for ${householdName(game.turnUid)}…`
  })()

  const statusTone =
    game.phase === 'gameOver'
      ? 'win'
      : left != null && left <= 3000 && game.phase === 'playing'
        ? 'danger'
        : 'ready'

  const submitTyped = () => {
    if (!myTurnAnswer || verbal || !selectedLetter) return
    void commitGame(
      (prev) =>
        submitAbcrelaxAnswer(prev, actorUid, selectedLetter, wordDraft) ??
        prev,
    )
  }

  const canSubmitTyped =
    myTurnAnswer &&
    !verbal &&
    selectedLetter &&
    wordDraft.trim().length > 0 &&
    wordMatchesLetter(wordDraft, selectedLetter)

  const pressLetter = (letter: string) => {
    if (!myTurnAnswer) return
    if (verbal) {
      void commitGame(
        (prev) => submitAbcrelaxLetter(prev, actorUid, letter) ?? prev,
      )
      return
    }
    setSelectedLetter(letter)
    if (!wordDraft.trim() || !wordMatchesLetter(wordDraft, letter)) {
      setWordDraft(letter)
    }
  }

  const wheelHeight = 'min-h-[22rem] h-[min(52vh,28rem)]'
  const modeLocked = game.phase === 'pending'

  return (
    <ArcadeStage
      title="Abcrelax"
      onClose={onClose}
      meta={<ArcadeStatus tone={statusTone}>{statusLabel}</ArcadeStatus>}
    >
      {({ immersive }) => (
        <div
          className={
            immersive ? 'flex min-h-0 flex-1 flex-col gap-3' : 'space-y-3'
          }
        >
          {immersive ? null : (
            <div className="rounded-xl border border-border bg-surface/60 px-3.5 py-3">
              <p className="text-[11px] leading-relaxed text-muted">
                Announce a category out loud. <strong className="text-white/80">Type</strong>{' '}
                mode: enter the word for Accept/Challenge.{' '}
                <strong className="text-white/80">Verbal</strong> mode: say it on
                Discord and just press the letter — the app never hears you.
                First to {ABCRELAX_CARDS_TO_WIN} cards wins.
              </p>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] font-medium text-white/85">
              {scoreLine(game)}
            </p>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setNewGameOpen(true)}
                className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-medium text-white hover:border-muted"
              >
                New game
              </button>
              <SurrenderButton
                disabled={
                  !uid ||
                  game.firstUid == null ||
                  game.status !== 'playing' ||
                  game.phase === 'gameOver'
                }
                onSurrender={() =>
                  void commitGame(
                    (prev) => surrenderAbcrelax(prev, actorUid) ?? prev,
                  )
                }
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {(
              [
                ['type', 'Type answers'],
                ['verbal', 'Verbal (Discord)'],
              ] as const
            ).map(([mode, label]) => {
              const active = game.answerMode === mode
              return (
                <button
                  key={mode}
                  type="button"
                  disabled={modeLocked || !uid}
                  onClick={() =>
                    void commitGame(
                      (prev) =>
                        setAbcrelaxAnswerMode(prev, actorUid, mode) ?? prev,
                    )
                  }
                  className={[
                    'rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors disabled:opacity-40',
                    active
                      ? 'border-sky-400/50 bg-sky-500/20 text-sky-50'
                      : 'border-border bg-surface text-muted hover:border-muted hover:text-white',
                  ].join(' ')}
                >
                  {label}
                </button>
              )
            })}
          </div>

          <NewGameConfirm
            open={newGameOpen}
            onClose={() => setNewGameOpen(false)}
            onConfirm={(opts) => void resetGame(opts)}
            blurb="Resets the wheel and card stack."
          />

          {game.firstUid == null ? (
            <div className="mt-4">
              <GameSeatPicker
                prompt="Who goes first?"
                optionLabel={(name) => `${name} goes first`}
                onPick={(seat) =>
                  void commitGame(
                    (prev) => selectAbcrelaxFirst(prev, seat) ?? prev,
                  )
                }
              />
            </div>
          ) : (
            <>
              {game.answersNeeded > 1 &&
              (game.phase === 'playing' || game.phase === 'pending') ? (
                <p className="text-center text-[11px] font-medium text-amber-200/90">
                  Overtime — {game.answersNeeded} answers per turn
                </p>
              ) : null}

              {game.phase === 'roundOver' || game.phase === 'gameOver' ? (
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {game.phase === 'roundOver' ? (
                    <button
                      type="button"
                      onClick={() =>
                        void commitGame(
                          (prev) =>
                            continueAbcrelaxRound(prev, actorUid) ?? prev,
                        )
                      }
                      className="rounded-lg border border-golden/40 bg-golden/15 px-3 py-2 text-sm font-medium text-golden hover:bg-golden/25"
                    >
                      Next round
                    </button>
                  ) : null}
                </div>
              ) : null}

              {game.phase === 'pending' && game.pending ? (
                <div className="rounded-xl border border-border bg-surface/70 px-3 py-3">
                  <p className="text-sm text-white">
                    <span className="font-semibold text-sky-200">
                      {householdName(game.pending.uid)}
                    </span>
                    : “{game.pending.word}” ({game.pending.letter})
                  </p>
                  {myTurnReview ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          void commitGame(
                            (prev) =>
                              acceptAbcrelaxAnswer(prev, actorUid) ?? prev,
                          )
                        }
                        className="rounded-lg border border-emerald-400/40 bg-emerald-500/15 px-3 py-1.5 text-sm font-medium text-emerald-100 hover:bg-emerald-500/25"
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          void commitGame(
                            (prev) =>
                              challengeAbcrelaxAnswer(prev, actorUid) ?? prev,
                          )
                        }
                        className="rounded-lg border border-rose-400/40 bg-rose-500/15 px-3 py-1.5 text-sm font-medium text-rose-100 hover:bg-rose-500/25"
                      >
                        Challenge
                      </button>
                    </div>
                  ) : (
                    <p className="mt-1 text-[11px] text-muted">
                      Waiting for {householdName(game.turnUid)}…
                    </p>
                  )}
                </div>
              ) : null}

              {canChallengeLast ? (
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() =>
                      void commitGame(
                        (prev) =>
                          challengeAbcrelaxLast(prev, actorUid) ?? prev,
                      )
                    }
                    className="rounded-lg border border-rose-400/40 bg-rose-500/15 px-3 py-1.5 text-xs font-medium text-rose-100 hover:bg-rose-500/25"
                  >
                    Challenge last ({game.lastAnswer?.letter})
                  </button>
                </div>
              ) : null}

              {myTurnAnswer && !verbal ? (
                <div className="flex flex-wrap items-end gap-2">
                  <label className="min-w-[12rem] flex-1 text-[11px] text-muted">
                    Word
                    <input
                      value={wordDraft}
                      onChange={(e) => {
                        const v = e.target.value
                        setWordDraft(v)
                        const first = v.trim().charAt(0).toUpperCase()
                        if (
                          first &&
                          ABCRELAX_LETTERS.includes(first) &&
                          !letterIsUsed(game, first)
                        ) {
                          setSelectedLetter(first)
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && canSubmitTyped) submitTyped()
                      }}
                      autoFocus
                      maxLength={64}
                      placeholder="Type a word…"
                      className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-white outline-none focus:border-sky-400/60"
                    />
                  </label>
                  <div className="text-[11px] text-muted">
                    Letter
                    <div className="mt-1 flex h-[38px] min-w-[2.5rem] items-center justify-center rounded-lg border border-border bg-surface px-3 text-lg font-bold text-white">
                      {selectedLetter ?? '—'}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={!canSubmitTyped}
                    onClick={submitTyped}
                    className="rounded-lg border border-sky-400/40 bg-sky-500/20 px-3 py-2 text-sm font-medium text-sky-50 enabled:hover:bg-sky-500/30 disabled:opacity-40"
                  >
                    Lock in
                  </button>
                </div>
              ) : null}

              <div
                className={[
                  'overflow-hidden rounded-2xl border border-border bg-[#0b1220]',
                  wheelHeight,
                  immersive ? 'min-h-0 flex-1' : '',
                ].join(' ')}
              >
                <Canvas
                  shadows
                  camera={{ position: [0, 6.2, 5.2], fov: 42 }}
                  gl={{ antialias: true }}
                >
                  <WheelScene
                    game={game}
                    selected={verbal ? null : selectedLetter}
                    canPickLetter={Boolean(myTurnAnswer)}
                    onPickLetter={pressLetter}
                    secondsLeft={
                      game.phase === 'playing' ? secondsLeft : null
                    }
                  />
                </Canvas>
              </div>

              {game.lastAnswer && game.phase === 'playing' ? (
                <p className="text-center text-[11px] text-muted">
                  Last: {householdName(game.lastAnswer.uid)}
                  {game.lastAnswer.word
                    ? ` — ${game.lastAnswer.word} (${game.lastAnswer.letter})`
                    : ` — ${game.lastAnswer.letter}`}
                </p>
              ) : null}

              <p className="text-center text-[10px] text-muted">
                Timer {ABCRELAX_TURN_MS / 1000}s ·{' '}
                {game.usedLetters.length}/{ABCRELAX_LETTERS.length} letters used
              </p>
            </>
          )}
        </div>
      )}
    </ArcadeStage>
  )
}
