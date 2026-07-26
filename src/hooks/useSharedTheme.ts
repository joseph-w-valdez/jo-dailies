import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { useCallback, useEffect, useState } from 'react'
import { db, syncRoomId } from '../lib/firebase'
import { updateSyncSource } from '../lib/syncStatus'
import {
  applyThemeToDocument,
  DEFAULT_THEME,
  isThemeId,
  loadStoredTheme,
  saveStoredTheme,
  type ThemeId,
} from '../lib/themes'
import { useFirebaseAuth } from './firebaseAuthContext'

/**
 * Shared room theme — localStorage for instant paint, Firestore
 * rooms/{id}/settings/appearance so both clients stay in sync.
 */
export function useSharedTheme() {
  const { user } = useFirebaseAuth()
  const [theme, setThemeState] = useState<ThemeId>(() => loadStoredTheme())

  useEffect(() => {
    applyThemeToDocument(theme)
    saveStoredTheme(theme)
  }, [theme])

  useEffect(() => {
    if (!user) return

    const appearanceRef = doc(db, 'rooms', syncRoomId, 'settings', 'appearance')
    const unsubscribe = onSnapshot(
      appearanceRef,
      { includeMetadataChanges: true },
      (snapshot) => {
        updateSyncSource('theme', {
          pending: snapshot.metadata.hasPendingWrites,
          fromCache: snapshot.metadata.fromCache,
        })

        if (!snapshot.exists()) return
        const remote = snapshot.data()?.theme
        if (!isThemeId(remote)) return
        setThemeState((prev) => (prev === remote ? prev : remote))
      },
      (error) => {
        updateSyncSource('theme', {
          pending: false,
          fromCache: false,
          error: true,
        })
        console.error('Theme sync failed', error)
      },
    )

    return () => {
      unsubscribe()
      updateSyncSource('theme', null)
    }
  }, [user])

  const setTheme = useCallback((next: ThemeId) => {
    setThemeState(next)
    saveStoredTheme(next)
    applyThemeToDocument(next)

    void setDoc(
      doc(db, 'rooms', syncRoomId, 'settings', 'appearance'),
      { theme: next },
      { merge: true },
    ).catch((error: unknown) => {
      console.error('Could not save theme', error)
    })
  }, [])

  return {
    theme,
    setTheme,
    /** Convenience when consumers only need a safe fallback. */
    defaultTheme: DEFAULT_THEME,
  }
}
