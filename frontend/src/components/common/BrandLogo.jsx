import { Link } from 'react-router-dom'
import { cn } from '../../lib/cn.js'

const scaleStyles = {
  lg: {
    mark: 'h-14 w-14 rounded-[22px]',
    text: 'text-2xl',
  },
  md: {
    mark: 'h-11 w-11 rounded-[18px]',
    text: 'text-lg',
  },
  sm: {
    mark: 'h-9 w-9 rounded-[14px]',
    text: 'text-base',
  },
}

export default function BrandLogo({ className = '', compact = false, onClick, scale = 'md', subtitle = 'Revenue orchestration', title = 'Respofin', to = '/' }) {
  const visual = scaleStyles[scale] ?? scaleStyles.md

  return (
    <Link className={cn('group inline-flex items-center gap-3', className)} onClick={onClick} to={to}>
      <span className={cn('relative inline-flex shrink-0 items-center justify-center overflow-hidden border border-white/35 shadow-[0_20px_42px_rgba(15,118,110,0.24)]', visual.mark)}>
        <span className="brand-orbit absolute -inset-[45%] bg-[conic-gradient(from_160deg,rgba(74,201,183,0.95),rgba(45,212,191,0.6),rgba(212,146,92,0.95),rgba(250,204,21,0.72),rgba(74,201,183,0.95))]" />
        <span className="absolute inset-[7%] rounded-[inherit] border border-white/35 bg-[linear-gradient(145deg,rgba(15,23,42,0.26),rgba(15,23,42,0.08)_45%,rgba(255,255,255,0.22))] backdrop-blur-sm" />

        <span className="absolute bottom-[20%] left-[22%] h-[30%] w-[12%] rounded-full bg-white/85" />
        <span className="absolute bottom-[20%] left-[40%] h-[48%] w-[12%] rounded-full bg-white/95" />
        <span className="absolute bottom-[20%] left-[58%] h-[65%] w-[12%] rounded-full bg-white/80" />
        <span className="absolute left-[22%] top-[22%] h-[8%] w-[48%] rounded-full bg-white/35" />
        <span className="brand-glint absolute right-[16%] top-[16%] h-[14%] w-[14%] rounded-full bg-white/95" />
      </span>

      {compact ? null : (
        <span className="min-w-0">
          <span className={cn('block truncate font-display font-bold leading-none text-slate-900 dark:text-white', visual.text)}>{title}</span>
          <span className="mt-1 block truncate text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            {subtitle}
          </span>
        </span>
      )}
    </Link>
  )
}