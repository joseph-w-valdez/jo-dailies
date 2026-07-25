import { useSyncExternalStore } from 'react'

interface SyncSourceState {
  pending: boolean
  fromCache: boolean
  error?: boolean
}

export type SyncState = 'synced' | 'syncing' | 'offline' | 'error'

const sources = new Map<string, SyncSourceState>()
const listeners = new Set<() => void>()
let online = typeof navigator === 'undefined' ? true : navigator.onLine

function emit() {
  for (const listener of listeners) listener()
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    online = true
    emit()
  })
  window.addEventListener('offline', () => {
    online = false
    emit()
  })
}

export function updateSyncSource(
  id: string,
  state: SyncSourceState | null,
): void {
  if (state) sources.set(id, state)
  else sources.delete(id)
  emit()
}

function getSnapshot(): SyncState {
  if (!online) return 'offline'
  for (const source of sources.values()) {
    if (source.error) return 'error'
  }
  for (const source of sources.values()) {
    if (source.pending || source.fromCache) return 'syncing'
  }
  return 'synced'
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useSyncStatus(): SyncState {
  return useSyncExternalStore(subscribe, getSnapshot, () => 'offline')
}
