import {
  BellDot,
  ChartColumnBig,
  CircleUserRound,
  LayoutDashboard,
  Sparkles,
  Target,
  Users,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { cn } from '../../lib/cn.js'
import BrandLogo from '../common/BrandLogo.jsx'

const navigationItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { label: 'Customers', icon: Users, path: '/customers' },
  { label: 'Segmentation', icon: Target, path: '/segmentation' },
  { label: 'Recommendations', icon: Sparkles, path: '/recommendations' },
  { label: 'Notifications', icon: BellDot, path: '/notifications' },
  { label: 'Analytics', icon: ChartColumnBig, path: '/analytics' },
  { label: 'Profile', icon: CircleUserRound, path: '/settings' },
]

export default function SidebarContent({ onNavigate, userName, companyName }) {
  return (
    <div className="flex h-full flex-col justify-between gap-6 px-2 py-1">
      <div className="space-y-6">
        <div className="space-y-3">
          <BrandLogo onClick={onNavigate} />
          <div className="space-y-2">
            <h2 className="font-display text-2xl font-bold">Growth command center</h2>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Operate customer intelligence, outreach, profile, and analytics from one focused workspace.
            </p>
          </div>
        </div>

        <nav className="space-y-1">
          {navigationItems.map((item) => {
            const Icon = item.icon

            return (
              <NavLink
                className={({ isActive }) => cn(
                  'group flex w-full items-center gap-3 rounded-2xl border px-3 py-2 text-sm font-semibold transition',
                  isActive
                    ? 'border-accent/45 bg-accent/15 text-slate-900 dark:text-white'
                    : 'border-transparent text-slate-600 hover:border-slate-300/50 hover:bg-slate-100/75 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-800/65',
                )}
                key={item.path}
                onClick={onNavigate}
                to={item.path}
              >
                <Icon className="h-[18px] w-[18px]" />
                {item.label}
              </NavLink>
            )
          })}
        </nav>
      </div>

      <div className="rounded-3xl border border-slate-300/50 bg-gradient-to-b from-white/70 to-slate-100/70 p-4 dark:border-slate-700/60 dark:from-slate-900/60 dark:to-slate-900/20">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Signed in as</p>
          <p className="text-sm font-bold">{userName}</p>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            {companyName || 'Add your company details in settings'}
          </p>
        </div>
      </div>
    </div>
  )
}