/** First name from Google display name, else the email local-part. */
export function playerFirstName(
  displayName: string | null | undefined,
  email: string | null | undefined,
): string {
  if (displayName?.trim()) return displayName.trim().split(/\s+/)[0] ?? 'Friend'
  if (email?.includes('@')) return email.split('@')[0] ?? 'Friend'
  return 'Friend'
}
