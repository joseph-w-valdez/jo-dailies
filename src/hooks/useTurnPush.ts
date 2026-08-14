import { doc, onSnapshot } from 'firebase/firestore'
import { useCallback, useEffect, useRef, useState } from 'react'
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
import { scrabbleTurnNotifyUid, type TurnSnapshot } from '../lib/turnNotify'
import { useFirebaseAuth } from './firebaseAuthContext'

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

/** Always-on while signed in: token refresh + Scrabble turn pings. */
export function TurnPushListener() {
  const { user } = useFirebaseAuth()
  const enabled = useTurnPushOptIn()
  const seenRef = useRef(false)
  const prevRef = useRef<TurnSnapshot | null>(null)

  useEffect(() => {
    seenRef.current = false
    prevRef.current = null
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
    const ref = doc(db, 'rooms', syncRoomId, 'scrabble', 'current')
    return onSnapshot(ref, (snap) => {
      const after = (snap.exists() ? snap.data() : null) as TurnSnapshot | null
      if (!seenRef.current) {
        seenRef.current = true
        prevRef.current = after
        return
      }
      const notifyUid = scrabbleTurnNotifyUid(prevRef.current, after)
      prevRef.current = after
      if (notifyUid === uid) showTurnNotification()
    })
  }, [user?.uid, enabled])

  return null
}
