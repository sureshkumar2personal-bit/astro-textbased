import { MoonStar, SunMedium } from 'lucide-react'
import { useTheme } from '../state/ThemeContext.jsx'

export default function ThemeToggle({ className = '', showLabel = false }) {
  const { isDark, toggleTheme } = useTheme()
  const Icon = isDark ? SunMedium : MoonStar
  const label = isDark ? 'Switch to light mode' : 'Switch to dark mode'

  return (
    <button
      type="button"
      className={['theme-toggle-btn', className].filter(Boolean).join(' ')}
      aria-label={label}
      aria-pressed={isDark}
      title={label}
      onClick={toggleTheme}
    >
      <Icon size={18} />
      {showLabel && <span>{isDark ? 'Light mode' : 'Dark mode'}</span>}
    </button>
  )
}
