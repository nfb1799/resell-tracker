import { createContext, useContext } from 'react'

// Holds the live item list plus the CRUD helpers. Component-free file so
// ItemsProvider.jsx stays fast-refresh friendly.
export const ItemsContext = createContext(null)

export function useItems() {
  return useContext(ItemsContext)
}
