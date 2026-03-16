import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'

const MotionDiv = motion.div

export default function Modal({ children, open, onClose, title }) {
  return (
    <AnimatePresence>
      {open ? (
        <MotionDiv
          aria-modal="true"
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          role="dialog"
        >
          <MotionDiv
            className="panel w-full max-w-2xl overflow-hidden"
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            onClick={(event) => event.stopPropagation()}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center justify-between border-b border-slate-300/50 px-5 py-3 dark:border-slate-700/70">
              <h3 className="font-display text-xl font-semibold">{title}</h3>
              <button
                className="btn-ghost !rounded-full !border !border-slate-300/60 !p-2 dark:!border-slate-700"
                onClick={onClose}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[80vh] overflow-y-auto p-5">{children}</div>
          </MotionDiv>
        </MotionDiv>
      ) : null}
    </AnimatePresence>
  )
}
