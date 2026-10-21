import { createContext, useContext, useState, useCallback } from 'react'

export const GlobalHeaderActionsContext = createContext(null)

export function GlobalHeaderActionsProvider({ value, children }) {
  const [hasPageHeader, setHasPageHeaderState] = useState(false)
  const setHasPageHeader = useCallback((v) => setHasPageHeaderState(v), [])
  return (
    <GlobalHeaderActionsContext.Provider value={{ actions: value, hasPageHeader, setHasPageHeader }}>
      {children}
    </GlobalHeaderActionsContext.Provider>
  )
}

export function useGlobalHeaderActions() {
  return useContext(GlobalHeaderActionsContext)
}