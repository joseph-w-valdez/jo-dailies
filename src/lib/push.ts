import { deleteDoc, doc, setDoc } from 'firebase/firestore'
import { db, firebaseApp, firebaseConfigured, syncRoomId, toFirestoreData } from './firebase'
import { turnNotifyPayload } from './turnNotify'

export const TURN_PUSH_KEY = 'jo-dailies:turn-push:v1'
const TURN_PUSH_EVENT = 'jo-dailies:turn-push'

export function loadTurnPushEnabled(): boolean {
  try {
    return localStorage.getItem(TURN_PUSH_KEY) === '1'
  } catch {
    return false
  }
}

export function saveTurnPushEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(TURN_PUSH_KEY, enabled ? '1' : '0')
  } catch {
    /* ignore */
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(TURN_PUSH_EVENT))
  }
}

export function subscribeTurnPushEnabled(onChange: () => void): () => void {
  window.addEventListener(TURN_PUSH_EVENT, onChange)
  window.addEventListener('storage', onChange)
  return () => {
    window.removeEventListener(TURN_PUSH_EVENT, onChange)
    window.removeEventListener('storage', onChange)
  }
}

export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function vapidKey(): string {
  return import.meta.env.VITE_FIREBASE_VAPID_KEY?.trim() ?? ''
}

export function showTurnNotification(): void {
  if (!notificationsSupported()) return
  if (Notification.permission !== 'granted') return
  const { title, body, tag } = turnNotifyPayload()
  const n = new Notification(title, {
    body,
    tag,
    icon: '/favicon.png',
  })
  n.onclick = () => {
    window.focus()
    if (!window.location.pathname.startsWith('/arcade')) {
      window.location.assign('/arcade')
    }
    n.close()
  }
}

async function tokenDocId(token: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(token),
  )
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 32)
}

function tokenRef(uid: string, id: string) {
  return doc(db, 'rooms', syncRoomId, 'users', uid, 'pushTokens', id)
}

export async function registerPushToken(uid: string): Promise<string | null> {
  if (!firebaseConfigured || !vapidKey() || !notificationsSupported()) return null
  if (Notification.permission !== 'granted') return null
  if (!('serviceWorker' in navigator)) return null

  const messagingMod = await import('firebase/messaging')
  if (!(await messagingMod.isSupported())) return null

  const registration = await navigator.serviceWorker.register(
    '/firebase-messaging-sw.js',
    { scope: '/' },
  )
  await navigator.serviceWorker.ready

  const messaging = messagingMod.getMessaging(firebaseApp)
  const token = await messagingMod.getToken(messaging, {
    vapidKey: vapidKey(),
    serviceWorkerRegistration: registration,
  })
  if (!token) return null

  const id = await tokenDocId(token)
  await setDoc(
    tokenRef(uid, id),
    toFirestoreData({
      token,
      updatedAt: Date.now(),
      userAgent: navigator.userAgent.slice(0, 180),
    }),
  )
  return token
}

export async function unregisterPushToken(uid: string): Promise<void> {
  if (!firebaseConfigured || !vapidKey() || !('serviceWorker' in navigator)) return
  try {
    const messagingMod = await import('firebase/messaging')
    if (!(await messagingMod.isSupported())) return
    const messaging = messagingMod.getMessaging(firebaseApp)
    const token = await messagingMod.getToken(messaging, { vapidKey: vapidKey() })
    if (token) {
      await messagingMod.deleteToken(messaging)
      await deleteDoc(tokenRef(uid, await tokenDocId(token)))
    }
  } catch {
    /* permission revoked or messaging unavailable */
  }
}
