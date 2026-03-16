import { titleCase } from '../../lib/formatters.js'
import { cn } from '../../lib/cn.js'

const statusTones = {
  active: 'border-emerald-400/50 bg-emerald-200/40 text-emerald-700 dark:border-emerald-500/45 dark:bg-emerald-900/60 dark:text-emerald-100',
  draft: 'border-amber-400/50 bg-amber-200/40 text-amber-700 dark:border-amber-500/45 dark:bg-amber-900/60 dark:text-amber-100',
  failed: 'border-rose-400/50 bg-rose-200/40 text-rose-700 dark:border-rose-500/45 dark:bg-rose-900/60 dark:text-rose-100',
  inactive: 'border-slate-400/50 bg-slate-200/40 text-slate-700 dark:border-slate-500/45 dark:bg-slate-800/65 dark:text-slate-100',
  sent: 'border-emerald-400/50 bg-emerald-200/40 text-emerald-700 dark:border-emerald-500/45 dark:bg-emerald-900/60 dark:text-emerald-100',
}

export default function StatusPill({ value }) {
  const normalizedValue = String(value ?? 'unknown').toLowerCase()
  const tone = statusTones[normalizedValue] ?? statusTones.inactive

  return (
    <span className={cn('badge border', tone)}>
      {titleCase(normalizedValue)}
    </span>
  )
}