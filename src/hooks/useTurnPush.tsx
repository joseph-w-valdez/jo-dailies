import { doc, onSnapshot } from 'firebase/firestore'
import { useCallback, useEffect, useRef, useState } from 'react'
import { TurnNotifyModal } from '../components/TurnNotifyModal'
import { db, syncRoomId } from '../lib/firebase'
import {
  loadTurnPushEnabled,
  notificationsSupported,
  registerPushToken,
  saveTurnPushEnabled,
  showTurnNotification,
  subscribeTurnPushEnabled,
  unregisterPushToken,
} from '../lib/push'
import {
  arcadeTurnNotifyUid,
  type TurnNotifyGame,
  type TurnSnapshot,
} from '../lib/turnNotify'
import { useFirebaseAuth } from './firebaseAuthContext'

const TURN_NOTIFY_GAMES: readonly TurnNotifyGame[] = ['scrabble', 'wordle']

function useTurnPushOptIn() {
  const [enabled, setEnabled] = useState(loadTurnPushEnabled)
  useEffect(() => subscribeTurnPushEnabled(() => setEnabled(loadTurnPushEnabled())), [])
  return enabled
}

export function useTurnPushSetting() {
  const { user } = useFirebaseAuth()
  const enabled = useTurnPushOptIn()
  const [error, setError] = useState<string | null>(null)

  const setTurnPushEnabled = useCallback(
    async (next: boolean) => {
      setError(null)
      if (!next) {
        saveTurnPushEnabled(false)
        if (user?.uid) void unregisterPushToken(user.uid)
        return
      }
      if (!notificationsSupported()) {
        setError('This browser cannot show notifications.')
        return
      }
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') {
        setError('Notification permission is blocked.')
        return
      }
      saveTurnPushEnabled(true)
    },
    [user?.uid],
  )

  return {
    enabled,
    error,
    supported: notificationsSupported(),
    setTurnPushEnabled,
  }
}

/** Always-on while signed in: token refresh + arcade turn pings. */
export function TurnPushListener() {
  const { user } = useFirebaseAuth()
  const enabled = useTurnPushOptIn()
  const seenRef = useRef<Partial<Record<TurnNotifyGame, boolean>>>({})
  const prevRef = useRef<Partial<Record<TurnNotifyGame, TurnSnapshot | null>>>(
    {},
  )
  const [ping, setPing] = useState<TurnNotifyGame | null>(null)

  useEffect(() => {
    seenRef.current = {}
    prevRef.current = {}
  }, [user?.uid, enabled])

  useEffect(() => {
    if (!user?.uid || !enabled) return
    void registerPushToken(user.uid).catch((err: unknown) => {
      console.error('push token', err)
    })
  }, [user?.uid, enabled])

  useEffect(() => {
    if (!user?.uid || !enabled) return
    const uid = user.uid
    const unsubs = TURN_NOTIFY_GAMES.map((game) => {
      const ref = doc(db, 'rooms', syncRoomId, game, 'current')
      return onSnapshot(ref, (snap) => {
        const after = (snap.exists() ? snap.data() : null) as TurnSnapshot | null
        if (!seenRef.current[game]) {
          seenRef.current[game] = true
          prevRef.current[game] = after
          return
        }
        const notifyUid = arcadeTurnNotifyUid(prevRef.current[game], after)
        prevRef.current[game] = after
        if (notifyUid !== uid) return
        setPing(game)
        showTurnNotification(game)
      })
    })
    return () => {
      for (const unsub of unsubs) unsub()
    }
  }, [user?.uid, enabled])

  return (
    <TurnNotifyModal
      open={ping != null}
      game={ping ?? 'scrabble'}
      onClose={() => setPing(null)}
    />
  )
}
