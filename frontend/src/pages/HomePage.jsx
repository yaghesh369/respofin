import { motion as Motion } from 'framer-motion'
import {
  ArrowRight,
  BellDot,
  ChartColumnBig,
  Settings2,
  Sparkles,
  Target,
  Users,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import AnimatedBackdrop from '../components/common/AnimatedBackdrop.jsx'
import BrandLogo from '../components/common/BrandLogo.jsx'
import GlassPanel from '../components/common/GlassPanel.jsx'
import ThemeModeToggle from '../components/common/ThemeModeToggle.jsx'
import { useAppearance } from '../hooks/useAppearance.js'
import { useAuth } from '../hooks/useAuth.js'

const navItems = [
  { href: '#diagram', label: 'Diagram' },
  { href: '#footer-contact', label: 'Contact' },
]

const flowNodes = [
  {
    icon: Users,
    note: 'Import and clean customer records',
    title: 'Customers',
    to: '/customers',
  },
  {
    icon: Target,
    note: 'Group users by behavior and value',
    title: 'Segmentation',
    to: '/segmentation',
  },
  {
    icon: Sparkles,
    note: 'Generate product and offer suggestions',
    title: 'Recommendations',
    to: '/recommendations',
  },
  {
    icon: BellDot,
    note: 'Review and send campaign messages',
    title: 'Notifications',
    to: '/notifications',
  },
  {
    icon: ChartColumnBig,
    note: 'Track outcomes and optimize performance',
    title: 'Analytics',
    to: '/analytics',
  },
  {
    icon: Settings2,
    note: 'Update company profile and preferences',
    title: 'Profile',
    to: '/settings',
  },
]

function reveal(shouldReduceMotion, delay = 0) {
  if (shouldReduceMotion) {
    return {
      initial: false,
      animate: { opacity: 1 },
      transition: { duration: 0.01 },
    }
  }

  return {
    initial: { opacity: 0, y: 18 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.45, delay, ease: 'easeOut' },
  }
}

export default function HomePage() {
  const { isAuthenticated } = useAuth()
  const { motionLevel } = useAppearance()
  const shouldReduceMotion = motionLevel === 'reduced'
  const workspacePath = isAuthenticated ? '/dashboard' : '/auth'

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <AnimatedBackdrop />

      <div className="relative z-10">
        <header className="sticky top-0 z-30 px-4 pb-2 pt-3 md:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl rounded-full border border-slate-300/60 bg-white/72 px-2 py-2 shadow-panel backdrop-blur-xl dark:border-slate-700/70 dark:bg-slate-900/68">
            <div className="flex items-center justify-between gap-3 px-2 md:px-3">
              <BrandLogo compact className="shrink-0" to="/" />

              <nav className="hidden items-center gap-5 md:flex">
                {navItems.map((item) => (
                  <a
                    className="text-sm font-semibold text-slate-600 transition hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
                    href={item.href}
                    key={item.href}
                  >
                    {item.label}
                  </a>
                ))}
              </nav>

              <div className="flex items-center gap-2">
                <ThemeModeToggle />
                <Link className="btn-secondary hidden sm:inline-flex" to={workspacePath}>
                  {isAuthenticated ? 'Open workspace' : 'Sign in'}
                </Link>
              </div>
            </div>
          </div>

          <div className="mx-auto mt-2 flex max-w-6xl gap-2 overflow-auto px-1 pb-1 md:hidden">
            {navItems.map((item) => (
              <a
                className="whitespace-nowrap rounded-full border border-slate-300/60 bg-white/68 px-3 py-1.5 text-xs font-semibold text-slate-700 backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/65 dark:text-slate-200"
                href={item.href}
                key={item.href}
              >
                {item.label}
              </a>
            ))}
          </div>
        </header>

        <main className="mx-auto max-w-6xl space-y-5 px-4 pb-8 pt-1 md:px-6 lg:px-8 lg:space-y-6 lg:pb-10">
          <Motion.section className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5" {...reveal(shouldReduceMotion, 0)}>
            <GlassPanel className="relative overflow-hidden p-6 lg:col-span-8 lg:p-8">
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute -left-16 top-8 h-44 w-44 rounded-full bg-cyan-500/24 blur-3xl animate-orb-sway" />
                <div className="absolute right-[-8%] top-[-12%] h-56 w-56 rounded-full bg-amber-500/24 blur-3xl animate-orb-sway-alt" />
              </div>

              <div className="relative z-10">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-accent">Welcome to Respofin</p>
                <h1 className="mt-2 max-w-3xl font-display text-4xl font-bold leading-tight md:text-5xl lg:text-6xl">
                  Understand the platform instantly with a visual campaign diagram.
                </h1>
                <p className="mt-3 max-w-2xl text-sm text-slate-600 md:text-base dark:text-slate-300">
                  Use the flow below to move from customer data to campaign results, then open each section directly.
                </p>

                <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                  <a className="btn-secondary" href="#diagram">
                    View flow diagram
                  </a>
                  <Link className="btn-primary" to={workspacePath}>
                    {isAuthenticated ? 'Open dashboard' : 'Sign in to start'}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </GlassPanel>

            <GlassPanel className="p-5 lg:col-span-4 lg:p-6">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">At a glance</p>
              <h2 className="mt-2 font-display text-2xl font-semibold">Simple path, better execution</h2>
              <div className="mt-4 space-y-2.5 text-sm text-slate-700 dark:text-slate-200">
                <p>1. Build customer base</p>
                <p>2. Create target segments</p>
                <p>3. Generate recommendations</p>
                <p>4. Send notifications</p>
                <p>5. Measure performance</p>
              </div>

              <div className="mt-4 rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/15 to-accent-soft/15 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-600 dark:text-slate-300">
                  Tip
                </p>
                <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">
                  Start from Customers for the best results in every next step.
                </p>
              </div>
            </GlassPanel>
          </Motion.section>

          <Motion.section className="space-y-3" id="diagram" {...reveal(shouldReduceMotion, 0.08)}>
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Diagram</p>
                <h2 className="mt-1 font-display text-3xl font-bold">Campaign Workflow Diagram</h2>
              </div>
              <Link className="btn-secondary hidden sm:inline-flex" to={workspacePath}>
                Open workspace
              </Link>
            </div>

            <GlassPanel className="p-4 md:p-5">
              <div className="mb-4 rounded-2xl border border-slate-300/55 bg-white/70 p-3 dark:border-slate-700/65 dark:bg-slate-900/65">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Flow order</p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
                  {flowNodes.map((node, index) => (
                    <span className="inline-flex items-center gap-1.5" key={node.title}>
                      <span className="rounded-full bg-accent/20 px-2 py-0.5 text-accent">{index + 1}. {node.title}</span>
                      {index === flowNodes.length - 1 ? null : <ArrowRight className="h-3.5 w-3.5 text-accent/70" />}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {flowNodes.map((node, index) => {
                  const Icon = node.icon

                  return (
                    <Motion.article
                      className="h-full"
                      key={node.title}
                      transition={{ duration: 0.18 }}
                      whileHover={shouldReduceMotion ? undefined : { y: -3 }}
                      {...reveal(shouldReduceMotion, 0.12 + index * 0.04)}
                    >
                      <Link className="group flex h-full flex-col justify-between rounded-3xl border border-slate-300/55 bg-white/70 p-4 shadow-sm transition hover:border-accent/45 hover:bg-white dark:border-slate-700/65 dark:bg-slate-900/65 dark:hover:bg-slate-900" to={node.to}>
                        <div>
                          <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-accent/20 text-accent">
                            <Icon className="h-5 w-5" />
                          </div>
                          <h3 className="font-display text-xl font-semibold">{node.title}</h3>
                          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{node.note}</p>
                        </div>

                        <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-accent">
                          Open page
                          <ArrowRight className="h-4 w-4" />
                        </span>
                      </Link>
                    </Motion.article>
                  )
                })}
              </div>
            </GlassPanel>
          </Motion.section>
        </main>

        <footer className="px-4 pb-5 md:px-6 lg:px-8 lg:pb-8" id="footer-contact">
          <GlassPanel className="mx-auto max-w-6xl p-5 md:p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <BrandLogo className="w-max" subtitle="Customer intelligence workspace" to="/" />
                <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                  Respofin helps teams run segmentation-driven campaigns with a clean and guided flow.
                </p>
              </div>

              <div className="max-w-full rounded-2xl border border-slate-300/60 bg-white/65 p-4 dark:border-slate-700/70 dark:bg-slate-900/65">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Contact</p>
                <p className="mt-2 text-sm font-semibold text-slate-800 dark:text-slate-100">Yaghesh Vyas</p>
                <a className="mt-1 block break-all text-sm text-slate-700 transition hover:text-accent dark:text-slate-200" href="mailto:vyasyaghesh001@gmail.com">
                  vyasyaghesh001@gmail.com
                </a>
                <a className="mt-1 block text-sm text-slate-700 transition hover:text-accent dark:text-slate-200" href="tel:+918446163060">
                  +91 8446163060
                </a>
              </div>
            </div>
          </GlassPanel>
        </footer>
      </div>
    </div>
  )
}
