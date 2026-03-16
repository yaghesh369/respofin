import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { Home, Menu, X } from 'lucide-react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { fetchProfile } from '../../api/auth.js'
import { useAppearance } from '../../hooks/useAppearance.js'
import { useAuth } from '../../hooks/useAuth.js'
import { cn } from '../../lib/cn.js'
import AnimatedBackdrop from '../common/AnimatedBackdrop.jsx'
import BrandLogo from '../common/BrandLogo.jsx'
import ThemeModeToggle from '../common/ThemeModeToggle.jsx'
import SidebarContent from './SidebarContent.jsx'

const MotionDiv = motion.div
const MotionAside = motion.aside

const pageTitles = {
  '/dashboard': 'Overview',
  '/analytics': 'Analytics',
  '/customers': 'Customers',
  '/notifications': 'Notifications',
  '/settings': 'Profile',
  '/recommendations': 'Recommendations',
  '/segmentation': 'Segmentation',
}

export default function AppLayout() {
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const { appearance, motionLevel } = useAppearance()
  const { user } = useAuth()
  const location = useLocation()
  const shouldReduceMotion = motionLevel === 'reduced'
  const isCompact = appearance.compactMode

  const profileQuery = useQuery({
    queryFn: fetchProfile,
    queryKey: ['profile'],
  })

  const currentTitle = pageTitles[location.pathname] ?? 'Respofin'
  const profile = profileQuery.data
  const isProfileReady = Boolean(profile?.is_onboarded)
  const profileName = profile?.company_name || user?.username || 'Operator'
  const profileInitial = user?.username?.slice(0, 1)?.toUpperCase() || 'R'

  return (
    <div className="relative min-h-screen">
      <AnimatedBackdrop />

      <div className="relative z-10 flex min-h-screen">
        <aside className={cn('hidden shrink-0 lg:block', isCompact ? 'w-[264px] p-2' : 'w-[300px] p-3')}>
          <div className={cn('sticky panel', isCompact ? 'top-2 h-[calc(100vh-16px)] p-3' : 'top-3 h-[calc(100vh-24px)] p-4')}>
            <SidebarContent companyName={profileQuery.data?.company_name} userName={user?.username || 'Operator'} />
          </div>
        </aside>

        <AnimatePresence>
          {isMobileOpen ? (
            <MotionDiv
              className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileOpen(false)}
            >
              <MotionAside
                className={cn('h-full panel', isCompact ? 'w-[268px] p-3' : 'w-[300px] p-4')}
                initial={{ x: -26, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                onClick={(event) => event.stopPropagation()}
                transition={{ duration: 0.2 }}
              >
                <div className="mb-3 flex justify-end">
                  <button
                    className="btn-ghost !rounded-full !border !border-slate-300/50 !p-2 dark:!border-slate-700"
                    onClick={() => setIsMobileOpen(false)}
                    type="button"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <SidebarContent
                  companyName={profileQuery.data?.company_name}
                  onNavigate={() => setIsMobileOpen(false)}
                  userName={user?.username || 'Operator'}
                />
              </MotionAside>
            </MotionDiv>
          ) : null}
        </AnimatePresence>

        <main className={cn('flex min-w-0 flex-1 flex-col', isCompact ? 'px-2 pb-4 md:px-3' : 'px-3 pb-5 md:px-4')}>
          <header className={cn('sticky top-0 z-20', isCompact ? 'mb-3' : 'mb-4')}>
            <div className={cn('rounded-3xl border border-slate-300/50 bg-white/75 shadow-panel backdrop-blur-xl dark:border-slate-700/60 dark:bg-slate-900/65', isCompact ? 'mt-2 px-2.5 py-2 md:px-3' : 'mt-3 px-3 py-3 md:px-4')}>
              <div className={cn('flex flex-wrap items-center justify-between', isCompact ? 'gap-2.5' : 'gap-3')}>
                <div className={cn('flex min-w-0 items-center', isCompact ? 'gap-1.5' : 'gap-2')}>
                  <button
                    className="btn-ghost !rounded-full !border !border-slate-300/60 !p-2 dark:!border-slate-700 lg:hidden"
                    onClick={() => setIsMobileOpen(true)}
                    type="button"
                  >
                    <Menu className="h-4 w-4" />
                  </button>

                  <BrandLogo className="hidden sm:inline-flex" compact />

                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                      Workspace navigation
                    </p>
                    <h2 className="truncate font-display text-xl font-semibold">{currentTitle}</h2>
                  </div>
                </div>

                <div className={cn('flex items-center', isCompact ? 'gap-2' : 'gap-2.5')}>
                  <ThemeModeToggle />
                   <Link
                     className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-300/60 bg-white/70 text-slate-600 transition hover:border-accent/50 hover:bg-white hover:text-accent dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-accent"
                     title="Home"
                     to="/"
                   >
                     <Home className="h-4 w-4" />
                   </Link>

                  <Link
                    className="hidden items-center gap-3 rounded-full border border-slate-300/60 bg-white/70 px-2.5 py-1.5 transition hover:border-accent/45 hover:bg-white dark:border-slate-700 dark:bg-slate-900/70 dark:hover:bg-slate-900 sm:flex"
                    to="/settings"
                  >
                    <div className="text-right">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                        {isProfileReady ? 'Profile' : 'Complete profile'}
                      </p>
                      <div className="flex items-center justify-end gap-1.5">
                        <span className={cn('h-2 w-2 rounded-full', isProfileReady ? 'bg-emerald-400' : 'bg-amber-400')} />
                        <span className="max-w-[160px] truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{profileName}</span>
                      </div>
                    </div>

                    <div className="flex h-9 w-9 items-center justify-center rounded-full border border-accent/45 bg-accent/20 text-sm font-bold text-slate-900 dark:text-white">
                      {profileInitial}
                    </div>
                  </Link>

                  <Link
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-accent/45 bg-accent/20 text-sm font-bold text-slate-900 transition hover:border-accent/70 dark:text-white sm:hidden"
                    to="/settings"
                  >
                    {profileInitial}
                  </Link>
                </div>
              </div>
            </div>
          </header>

          <AnimatePresence mode="wait">
            <MotionDiv
              className={cn('min-w-0', shouldReduceMotion ? '' : 'origin-top')}
              initial={shouldReduceMotion ? false : { opacity: 0, y: 18 }}
              key={location.pathname}
              animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
              transition={{ duration: shouldReduceMotion ? 0.05 : 0.28, ease: 'easeOut' }}
            >
              <Outlet />
            </MotionDiv>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}