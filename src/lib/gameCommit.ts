/** Bump version/updatedAt so a local commit cannot be overwritten by a stale snapshot. */
export function withBumpedVersion<T extends { version: number; updatedAt: number }>(
  base: T,
  currentVersion: number,
): T {
  return {
    ...base,
    version: Math.max(base.version, currentVersion + 1),
    updatedAt: Date.now(),
  }
}
