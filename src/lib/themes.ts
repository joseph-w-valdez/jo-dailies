export const THEME_STORAGE_KEY = 'jo-dailies:theme'
export const DEFAULT_THEME = 'blue' as const

export const THEMES = [
  { id: 'blue', label: 'Blue', swatch: '#38bdf8' },
  { id: 'black', label: 'Black', swatch: '#e5e7eb' },
  { id: 'white', label: 'White', swatch: '#2563eb' },
  { id: 'pink', label: 'Pink', swatch: '#f472b6' },
  { id: 'violet', label: 'Violet', swatch: '#c4b5fd' },
  { id: 'emerald', label: 'Emerald', swatch: '#34d399' },
] as const

export type ThemeId = (typeof THEMES)[number]['id']

export function isThemeId(value: unknown): value is ThemeId {
  return (
    typeof value === 'string' &&
    THEMES.some((theme) => theme.id === value)
  )
}

export function loadStoredTheme(): ThemeId {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY)
    if (isThemeId(raw)) return raw
  } catch {
    /* ignore */
  }
  return DEFAULT_THEME
}

export function saveStoredTheme(theme: ThemeId): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    /* ignore */
  }
}

/** Apply theme to <html>. Blue (default) clears the attribute. */
export function applyThemeToDocument(theme: ThemeId): void {
  if (typeof document === 'undefined') return
  if (theme === DEFAULT_THEME) {
    delete document.documentElement.dataset.theme
  } else {
    document.documentElement.dataset.theme = theme
  }
}

/** Read a CSS custom property from <html> (e.g. `--color-app-bg`). */
export function readThemeCssColor(varName: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(varName)
    .trim()
  return value || fallback
}
