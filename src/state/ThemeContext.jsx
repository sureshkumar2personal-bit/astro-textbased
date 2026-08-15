/* oxlint-disable react/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const THEME_STORAGE_KEY = 'astroconnect-theme'

const ThemeContext = createContext(null)

function getInitialTheme() {
  if (typeof window === 'undefined') {
    return 'light'
  }

  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
    if (stored === 'light' || stored === 'dark') {
      return stored
    }
  } catch {
    // Ignore storage access errors and fall back to the system preference.
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(theme) {
  if (typeof document === 'undefined') {
    return
  }

  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme)

  useEffect(() => {
    applyTheme(theme)

    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme)
    } catch {
      // Ignore storage failures and keep the in-memory theme active.
    }
  }, [theme])

  const value = useMemo(() => ({
    theme,
    isDark: theme === 'dark',
    setTheme,
    toggleTheme() {
      setTheme((current) => (current === 'dark' ? 'light' : 'dark'))
    },
  }), [theme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const value = useContext(ThemeContext)
  if (!value) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return value
}
