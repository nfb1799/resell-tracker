import { useState, useEffect, useCallback } from 'react'

// Recharts needs real colour values, not `var(--x)`, so resolve the tokens off
// the root element and re-resolve whenever the theme attribute flips.
export function useThemeColors(names) {
  const read = useCallback(() => {
    const styles = getComputedStyle(document.documentElement)
    return Object.fromEntries(names.map(n => [n, styles.getPropertyValue(`--${n}`).trim()]))
    // `names` is a module-level constant at every call site.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [colors, setColors] = useState(read)

  useEffect(() => {
    const observer = new MutationObserver(() => setColors(read()))
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [read])

  return colors
}
