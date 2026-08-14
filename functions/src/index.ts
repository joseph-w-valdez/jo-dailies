import { initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getMessaging } from 'firebase-admin/messaging'
import { onDocumentWritten } from 'firebase-functions/v2/firestore'
import { defineString } from 'firebase-functions/params'

initializeApp()

const appOrigin = defineString('APP_ORIGIN', { default: '' })

type TurnSnapshot = {
  turnUid?: unknown
  status?: unknown
  hotseat?: unknown
}

/** Keep in sync with src/lib/turnNotify.ts */
function scrabbleTurnNotifyUid(
  before: TurnSnapshot | null | undefined,
  after: TurnSnapshot | null | undefined,
): string | null {
  if (!after || after.hotseat) return null
  if (after.status !== 'playing') return null
  if (typeof after.turnUid !== 'string' || !after.turnUid) return null
  if (before && before.status === 'playing' && before.turnUid === after.turnUid) {
    return null
  }
  return after.turnUid
}

export const notifyScrabbleTurn = onDocumentWritten(
  'rooms/{roomId}/scrabble/current',
  async (event) => {
    const before = event.data?.before.data() as TurnSnapshot | undefined
    const after = event.data?.after.data() as TurnSnapshot | undefined
    const uid = scrabbleTurnNotifyUid(before, after)
    if (!uid) return

    const roomId = event.params.roomId
    const tokensSnap = await getFirestore()
      .collection(`rooms/${roomId}/users/${uid}/pushTokens`)
      .get()
    const tokens = tokensSnap.docs
      .map((d) => d.get('token'))
      .filter((t): t is string => typeof t === 'string' && t.length > 0)
    if (tokens.length === 0) return

    const origin = appOrigin.value().replace(/\/$/, '')
    const res = await getMessaging().sendEachForMulticast({
      tokens,
      notification: {
        title: 'Scrabble',
        body: "It's your turn.",
      },
      webpush: {
        notification: {
          tag: 'scrabble-turn',
          icon: '/favicon.png',
        },
        ...(origin
          ? { fcmOptions: { link: `${origin}/arcade` } }
          : {}),
      },
    })

    const stale = res.responses
      .map((r, i) => ({ r, token: tokens[i]! }))
      .filter(
        ({ r }) =>
          !r.success &&
          (r.error?.code === 'messaging/registration-token-not-registered' ||
            r.error?.code === 'messaging/invalid-registration-token'),
      )
    await Promise.all(
      stale.map(({ token }) => {
        const hit = tokensSnap.docs.find((d) => d.get('token') === token)
        return hit ? hit.ref.delete() : Promise.resolve()
      }),
    )
  },
)
