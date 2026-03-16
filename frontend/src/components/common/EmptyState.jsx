import GlassPanel from './GlassPanel.jsx'

export default function EmptyState({ icon, title, description, actionLabel, onAction }) {
  return (
    <GlassPanel className="p-6 text-center md:p-8">
      <div className="mx-auto flex max-w-xl flex-col items-center gap-3">
        {icon}
        <h3 className="font-display text-2xl font-bold">{title}</h3>
        <p className="text-sm text-slate-600 dark:text-slate-300">{description}</p>
        {actionLabel && onAction ? (
          <button className="btn-primary mt-1" onClick={onAction} type="button">
            {actionLabel}
          </button>
        ) : null}
      </div>
    </GlassPanel>
  )
}