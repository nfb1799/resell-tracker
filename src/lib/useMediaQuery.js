import { useSyncExternalStore, useCallback } from 'react'

// Layout that differs structurally — a sidebar instead of a tab bar, a table
// instead of stacked cards — has to be decided in JS, not just hidden with CSS,
// so only one version is ever in the DOM.
//
// useSyncExternalStore rather than an effect: matchMedia is exactly the sort of
// external store it exists for, and it avoids a first paint at the wrong size.
export function useMediaQuery(query) {
  const subscribe = useCallback((onStoreChange) => {
    const list = window.matchMedia(query)
    list.addEventListener('change', onStoreChange)
    return () => list.removeEventListener('change', onStoreChange)
  }, [query])

  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query])

  return useSyncExternalStore(subscribe, getSnapshot)
}

// The point where a sidebar and a data table start beating a tab bar and cards.
export const DESKTOP_QUERY = '(min-width: 1024px)'

export const useIsDesktop = () => useMediaQuery(DESKTOP_QUERY)
