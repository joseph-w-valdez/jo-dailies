import { onSnapshot, orderBy, query } from 'firebase/firestore'
import { useEffect, useMemo, useState } from 'react'
import {
  arcadeMatchesCollectionRef,
  normalizeArcadeMatch,
  type ArcadeMatch,
  type MatchHistoryGameId,
} from '../lib/arcadeMatches'
import { updateSyncSource } from '../lib/syncStatus'
import { useFirebaseAuth } from './firebaseAuthContext'

const SYNC_ID = 'arcadeMatches'

export function useArcadeMatches(gameId?: MatchHistoryGameId | null) {
  const { user } = useFirebaseAuth()
  const [matches, setMatches] = useState<ArcadeMatch[]>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!user) {
      setMatches([])
      setReady(true)
      updateSyncSource(SYNC_ID, null)
      return
    }
    const q = query(arcadeMatchesCollectionRef(), orderBy('endedAt', 'desc'))
    const unsub = onSnapshot(
      q,
      { includeMetadataChanges: true },
      (snap) => {
        updateSyncSource(SYNC_ID, {
          pending: snap.metadata.hasPendingWrites,
          fromCache: snap.metadata.fromCache,
        })
        const next: ArcadeMatch[] = []
        for (const docSnap of snap.docs) {
          const row = normalizeArcadeMatch({ id: docSnap.id, ...docSnap.data() })
          if (row) next.push(row)
        }
        setMatches(next)
        setReady(true)
      },
      (error) => {
        console.error('arcadeMatches sync', error)
        updateSyncSource(SYNC_ID, {
          pending: false,
          fromCache: false,
          error: true,
        })
        setMatches([])
        setReady(true)
      },
    )
    return () => {
      unsub()
      updateSyncSource(SYNC_ID, null)
    }
  }, [user])

  const filtered = useMemo(() => {
    if (!gameId) return matches
    return matches.filter((m) => m.gameId === gameId)
  }, [matches, gameId])

  return { matches: filtered, allMatches: matches, ready }
}
