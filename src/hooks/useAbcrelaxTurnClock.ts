import { useEffect, useRef, useState } from 'react'
import { abcrelaxTurnClockKey, type AbcrelaxState } from '../lib/abcrelax'

/**
 * Per-client turn countdown. Anchors when turnEpoch changes so each player
 * gets a full turnMs from when they learn the turn started — not the
 * submitter's wall clock in Firestore.
 */
export function useAbcrelaxTurnClock(game: AbcrelaxState) {
  const clockKey = abcrelaxTurnClockKey(game)
  const keyRef = useRef('')
  const deadlineRef = useRef<number | null>(null)

  if (clockKey && keyRef.current !== clockKey) {
    keyRef.current = clockKey
    deadlineRef.current = Date.now() + game.turnMs
  }
  if (!clockKey) {
    keyRef.current = ''
    deadlineRef.current = null
  }

  const deadline = deadlineRef.current
  const running = game.phase === 'playing' && deadline != null
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!running) return
    setNow(Date.now())
    let raf = 0
    const tick = () => {
      setNow(Date.now())
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [running, clockKey, game.turnMs])

  const msLeft =
    deadline == null ? null : Math.max(0, deadline - now)

  return { now, msLeft, deadline, running, clockKey }
}
