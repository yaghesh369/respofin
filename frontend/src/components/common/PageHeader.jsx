import { cn } from '../../lib/cn.js'

export default function PageHeader({ eyebrow, title, description, actions, className = '' }) {
  return (
    <div className={cn('mb-5 flex flex-col gap-4 lg:mb-7 lg:flex-row lg:items-start lg:justify-between', className)}>
      <div className="max-w-3xl space-y-2">
        {eyebrow ? (
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-accent">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="font-display text-3xl font-bold leading-tight md:text-4xl">{title}</h1>
        {description ? (
          <p className="max-w-3xl text-sm text-slate-600 md:text-base dark:text-slate-300">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="w-full lg:w-auto">{actions}</div>
      ) : null}
    </div>
  )
}