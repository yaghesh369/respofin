import { MoonStar, SunMedium } from 'lucide-react'
import { useAppearance } from '../../hooks/useAppearance.js'
import { cn } from '../../lib/cn.js'

export default function ThemeModeToggle({ className = '', compact = false }) {
  const { resolvedMode, updateAppearance } = useAppearance()

  const buttonBase = compact
    ? 'inline-flex items-center justify-center rounded-full p-1.5 text-xs font-semibold transition'
    : 'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-semibold transition sm:text-sm'

  return (
    <div className={cn('inline-flex items-center rounded-full border border-slate-300/60 bg-white/70 p-1 dark:border-slate-700 dark:bg-slate-900/70', className)}>
      <button
        className={cn(
          buttonBase,
          resolvedMode === 'light'
            ? 'bg-accent text-slate-950'
            : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100',
        )}
        onClick={() => updateAppearance({ mode: 'light' })}
        title="Switch to light mode"
        type="button"
      >
        <SunMedium className="h-3.5 w-3.5" />
        {compact ? null : <span className="hidden sm:inline">Light</span>}
      </button>

      <button
        className={cn(
          buttonBase,
          resolvedMode === 'dark'
            ? 'bg-accent text-slate-950'
            : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100',
        )}
        onClick={() => updateAppearance({ mode: 'dark' })}
        title="Switch to dark mode"
        type="button"
      >
        <MoonStar className="h-3.5 w-3.5" />
        {compact ? null : <span className="hidden sm:inline">Dark</span>}
      </button>
    </div>
  )
}