import { JENGA_PLAYER_UIDS } from './jenga'

/** Fixed display names for the two household seats (UID order matches Jenga P1/P2). */
export const HOUSEHOLD_DISPLAY_NAMES = {
  [JENGA_PLAYER_UIDS[0]]: 'Joseph',
  [JENGA_PLAYER_UIDS[1]]: 'Joha',
} as const

export function householdName(uid: string | null | undefined): string {
  if (!uid) return 'Friend'
  return (
    HOUSEHOLD_DISPLAY_NAMES[uid as keyof typeof HOUSEHOLD_DISPLAY_NAMES] ??
    'Friend'
  )
}
