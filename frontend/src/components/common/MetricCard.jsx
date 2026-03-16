import GlassPanel from './GlassPanel.jsx'
import { cn } from '../../lib/cn.js'

export default function MetricCard({ icon, label, value, hint, tone = 'teal', className = '' }) {
  const iconTone = tone === 'copper'
    ? 'bg-orange-300/20 text-orange-300'
    : tone === 'indigo'
      ? 'bg-indigo-300/20 text-indigo-300'
      : tone === 'emerald'
        ? 'bg-emerald-300/20 text-emerald-300'
        : 'bg-accent/20 text-accent'

  return (
    <GlassPanel className={cn('p-4 sm:p-5', className)}>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
            {label}
          </p>
          <div className={cn('inline-flex h-10 w-10 items-center justify-center rounded-full', iconTone)}>
            {icon}
          </div>
        </div>
        <div className="space-y-1">
          <p className="font-display text-3xl font-bold tracking-tight md:text-4xl">
            {value}
          </p>
          {hint ? <p className="text-sm text-slate-600 dark:text-slate-300">{hint}</p> : null}
        </div>
      </div>
    </GlassPanel>
  )
}