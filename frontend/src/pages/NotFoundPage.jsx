import { Compass } from 'lucide-react'
import { Link } from 'react-router-dom'
import GlassPanel from '../components/common/GlassPanel.jsx'
import ThemeModeToggle from '../components/common/ThemeModeToggle.jsx'

export default function NotFoundPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center p-4">
      <div className="absolute right-4 top-4">
        <ThemeModeToggle compact />
      </div>

      <GlassPanel className="w-full max-w-xl p-8 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="inline-flex rounded-full bg-accent/20 p-3 text-accent">
            <Compass className="h-7 w-7" />
          </div>
          <h1 className="font-display text-3xl font-bold">This route does not exist</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            The page you requested is outside the current Respofin workspace.
          </p>
          <Link className="btn-primary" to="/">
            Return to home
          </Link>
        </div>
      </GlassPanel>
    </div>
  )
}