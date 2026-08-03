import { useMemo } from 'react'
import { readThemeCssColor } from '../lib/themes'
import { useSharedTheme } from './useSharedTheme'

/** Live CSS theme color — updates when the shared room theme changes. */
export function useThemeCssColor(varName: string, fallback: string): string {
  const { theme } = useSharedTheme()
  return useMemo(() => {
    void theme
    return readThemeCssColor(varName, fallback)
  }, [theme, varName, fallback])
}
