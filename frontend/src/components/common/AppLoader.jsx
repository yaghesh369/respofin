import { LoaderCircle } from 'lucide-react'
import GlassPanel from './GlassPanel.jsx'
import ThemeModeToggle from './ThemeModeToggle.jsx'

export default function AppLoader({ label = 'Loading workspace' }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <div className="absolute right-4 top-4">
        <ThemeModeToggle compact />
      </div>

      <GlassPanel className="w-full max-w-md p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent/20 text-accent">
          <LoaderCircle className="h-6 w-6 animate-spin" />
        </div>
        <h2 className="font-display text-2xl font-bold">Respofin Control Room</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{label}</p>
      </GlassPanel>
    </div>
  )
}