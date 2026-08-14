import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { useCallback, useEffect, useState } from 'react'
import { db, syncRoomId, toFirestoreData } from '../lib/firebase'
import {
  defaultUserPrefs,
  normalizeUserPrefs,
  type UnitPref,
  type UserPrefs,
} from '../lib/userPrefs'
import { useFirebaseAuth } from './firebaseAuthContext'

export function useUserPrefs() {
  const { user } = useFirebaseAuth()
  const [prefs, setPrefs] = useState<UserPrefs>(defaultUserPrefs)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!user?.uid) {
      setPrefs(defaultUserPrefs())
      setReady(false)
      return
    }
    const ref = doc(db, 'rooms', syncRoomId, 'users', user.uid)
    return onSnapshot(ref, (snap) => {
      setPrefs(snap.exists() ? normalizeUserPrefs(snap.data()) : defaultUserPrefs())
      setReady(true)
    })
  }, [user?.uid])

  const setUnits = useCallback(
    async (units: UnitPref) => {
      if (!user?.uid) return
      const next: UserPrefs = { units, updatedAt: Date.now() }
      setPrefs(next)
      await setDoc(
        doc(db, 'rooms', syncRoomId, 'users', user.uid),
        toFirestoreData(next),
        { merge: true },
      )
    },
    [user?.uid],
  )

  return { prefs, ready, setUnits }
}
