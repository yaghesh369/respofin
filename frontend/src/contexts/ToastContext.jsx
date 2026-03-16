import { useCallback, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from 'lucide-react'
import { ToastContext } from './toast.context.js'

const MotionDiv = motion.div

const severityStyles = {
  error: {
    icon: CircleAlert,
    tone: 'border-rose-400/40 bg-rose-100/90 text-rose-700 dark:border-rose-500/40 dark:bg-rose-900/65 dark:text-rose-100',
  },
  info: {
    icon: Info,
    tone: 'border-sky-400/40 bg-sky-100/90 text-sky-700 dark:border-sky-500/40 dark:bg-sky-900/65 dark:text-sky-100',
  },
  success: {
    icon: CircleCheck,
    tone: 'border-emerald-400/40 bg-emerald-100/90 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-900/65 dark:text-emerald-100',
  },
  warning: {
    icon: TriangleAlert,
    tone: 'border-amber-400/40 bg-amber-100/90 text-amber-700 dark:border-amber-500/40 dark:bg-amber-900/65 dark:text-amber-100',
  },
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const removeToast = useCallback((toastId) => {
    setToasts((currentToasts) => currentToasts.filter((toast) => toast.id !== toastId))
  }, [])

  const notify = useCallback(({ message, severity = 'info', autoHideDuration = 3500 }) => {
    const toastId = Date.now() + Math.random()

    setToasts((currentToasts) => [
      ...currentToasts,
      {
        autoHideDuration,
        id: toastId,
        message,
        severity,
      },
    ])

    window.setTimeout(() => {
      removeToast(toastId)
    }, autoHideDuration)
  }, [removeToast])

  const contextValue = useMemo(() => notify, [notify])

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div className="pointer-events-none fixed inset-x-4 bottom-4 z-[110] flex flex-col items-end gap-2 sm:left-auto sm:w-full sm:max-w-sm">
        <AnimatePresence initial={false}>
          {toasts.map((toast) => {
            const descriptor = severityStyles[toast.severity] ?? severityStyles.info
            const Icon = descriptor.icon

            return (
              <MotionDiv
                key={toast.id}
                className={`pointer-events-auto w-full rounded-2xl border px-3 py-2.5 shadow-panel backdrop-blur ${descriptor.tone}`}
                initial={{ opacity: 0, x: 24, y: 8 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                exit={{ opacity: 0, x: 24, y: 6 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex items-start gap-2">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                  <div className="flex-1 text-sm font-medium">{toast.message}</div>
                  <button
                    aria-label="Dismiss notification"
                    className="rounded-full p-0.5 transition hover:bg-black/10 dark:hover:bg-white/10"
                    onClick={() => removeToast(toast.id)}
                    type="button"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </MotionDiv>
            )
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}
