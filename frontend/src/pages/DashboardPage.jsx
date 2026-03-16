import { useQuery } from '@tanstack/react-query'
import { Doughnut } from 'react-chartjs-2'
import { ArrowRight, Bell, ChartColumnBig, CheckCircle2, CircleUserRound, Sparkles, Target, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { fetchProfile } from '../api/auth.js'
import { fetchAnalytics } from '../api/analytics.js'
import EmptyState from '../components/common/EmptyState.jsx'
import BrandLogo from '../components/common/BrandLogo.jsx'
import GlassPanel from '../components/common/GlassPanel.jsx'
import MetricCard from '../components/common/MetricCard.jsx'
import PageHeader from '../components/common/PageHeader.jsx'
import { formatNumber, formatPercent } from '../lib/formatters.js'

function buildSegmentChart(segments) {
  return {
    datasets: [
      {
        backgroundColor: ['#4ac9b7', '#d4925c', '#7b8cff', '#f97316', '#8b5cf6', '#22c55e'],
        borderWidth: 0,
        data: segments.map((segment) => segment.count),
      },
    ],
    labels: segments.map((segment) => `Segment ${segment.segment_label}`),
  }
}

function ShortcutCard({ description, icon, metric, title, to }) {
  return (
    <Link className="block h-full" to={to}>
      <GlassPanel className="h-full p-4 transition duration-200 hover:-translate-y-1 hover:border-accent/35">
        <div className="flex h-full flex-col justify-between gap-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Open page</p>
              <h3 className="mt-1 font-display text-xl font-semibold">{title}</h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{description}</p>
            </div>
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-accent/15 text-accent">
              {icon}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-slate-300/50 pt-3 text-sm dark:border-slate-700/60">
            <span className="font-medium text-slate-700 dark:text-slate-200">{metric}</span>
            <span className="inline-flex items-center gap-1 font-semibold text-accent">
              Open
              <ArrowRight className="h-4 w-4" />
            </span>
          </div>
        </div>
      </GlassPanel>
    </Link>
  )
}

function PriorityCard({ description, title, to, cta }) {
  return (
    <Link className="block h-full" to={to}>
      <GlassPanel className="h-full p-4 transition duration-200 hover:-translate-y-1 hover:border-accent/35">
        <div className="flex h-full flex-col justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Suggested next step</p>
            <h3 className="mt-1 font-display text-xl font-semibold">{title}</h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{description}</p>
          </div>

          <div className="inline-flex items-center gap-2 text-sm font-semibold text-accent">
            {cta}
            <ArrowRight className="h-4 w-4" />
          </div>
        </div>
      </GlassPanel>
    </Link>
  )
}

export default function DashboardPage() {
  const analyticsQuery = useQuery({
    queryFn: () => fetchAnalytics({ includeTimeline: false }),
    queryKey: ['analytics'],
  })

  const profileQuery = useQuery({
    queryFn: fetchProfile,
    queryKey: ['profile'],
  })

  if (analyticsQuery.isLoading) {
    return (
      <div className="panel overflow-hidden">
        <div className="h-1 w-full animate-pulse bg-accent/70" />
      </div>
    )
  }

  if (analyticsQuery.isError) {
    return (
      <div className="rounded-2xl border border-rose-400/40 bg-rose-100/80 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/45 dark:bg-rose-900/65 dark:text-rose-100">
        Unable to load analytics overview right now.
      </div>
    )
  }

  const analytics = analyticsQuery.data
  const profile = profileQuery.data
  const customerStats = analytics.customers || { active: 0, total: 0 }
  const notificationStats = analytics.notifications || { draft: 0, failed: 0, sent: 0 }
  const recommendationStats = analytics.recommendations || { top_products: [], total: 0 }
  const segments = analytics.segments || []
  const topProducts = recommendationStats.top_products || []
  const companyLabel = profile?.company_name || 'your workspace'

  const priorityCards = [
    !profile?.is_onboarded
      ? {
          cta: 'Open settings',
          description: 'Add your company profile details and mark onboarding complete to remove setup prompts.',
          title: 'Finish workspace setup',
          to: '/settings',
        }
      : null,
    customerStats.total === 0
      ? {
          cta: 'Add customers',
          description: 'Start by importing a CSV or creating your first customer profiles manually.',
          title: 'Build your customer base',
          to: '/customers',
        }
      : null,
    customerStats.total > 0 && segments.length === 0
      ? {
          cta: 'Run segmentation',
          description: 'Cluster ready customers so recommendation flows can target the right audience.',
          title: 'Create customer segments',
          to: '/segmentation',
        }
      : null,
    segments.length > 0 && recommendationStats.total === 0
      ? {
          cta: 'Generate recommendations',
          description: 'Turn segment intelligence into product suggestions and ready-to-send campaign drafts.',
          title: 'Generate product offers',
          to: '/recommendations',
        }
      : null,
    notificationStats.draft > 0
      ? {
          cta: 'Review drafts',
          description: `${formatNumber(notificationStats.draft)} notification drafts are waiting for review or delivery.`,
          title: 'Finish campaign outreach',
          to: '/notifications',
        }
      : null,
  ].filter(Boolean).slice(0, 3)

  const shortcuts = [
    {
      description: 'Add, edit, search, and bulk import customer records.',
      icon: <Users className="h-5 w-5" />,
      metric: `${formatNumber(customerStats.total)} profiles`,
      title: 'Customers',
      to: '/customers',
    },
    {
      description: 'Run clustering and review segment readiness.',
      icon: <Target className="h-5 w-5" />,
      metric: segments.length ? `${segments.length} live segments` : 'Segmentation not run yet',
      title: 'Segmentation',
      to: '/segmentation',
    },
    {
      description: 'Create product suggestions for single, bulk, or all customers.',
      icon: <Sparkles className="h-5 w-5" />,
      metric: `${formatNumber(recommendationStats.total)} offers`,
      title: 'Recommendations',
      to: '/recommendations',
    },
    {
      description: 'Review drafts, edit messages, and trigger sends.',
      icon: <Bell className="h-5 w-5" />,
      metric: `${formatNumber(notificationStats.draft)} drafts waiting`,
      title: 'Notifications',
      to: '/notifications',
    },
    {
      description: 'Inspect deeper trends, exports, and campaign performance.',
      icon: <ChartColumnBig className="h-5 w-5" />,
      metric: `${formatNumber(notificationStats.sent)} sent updates`,
      title: 'Analytics',
      to: '/analytics',
    },
    {
      description: 'Update company details, theme, and operator preferences.',
      icon: <CircleUserRound className="h-5 w-5" />,
      metric: profile?.company_name || 'Profile setup available',
      title: 'Profile',
      to: '/settings',
    },
  ]

  return (
    <div>
      <PageHeader
        eyebrow="Control room overview"
        title="Start faster from a cleaner workspace home"
        description="Use the homepage to see only the key signals, then jump directly into the page where work needs to happen."
        actions={
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link className="btn-primary" to="/segmentation">
              Run workflows
            </Link>
            <Link className="btn-secondary" to="/analytics">
              Open analytics
            </Link>
          </div>
        }
      />

      <GlassPanel className="relative mb-4 overflow-hidden p-5 md:p-6">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-accent/25 blur-3xl animate-orb-sway" />
          <div className="absolute -bottom-24 left-[24%] h-60 w-60 rounded-full bg-amber-300/25 blur-3xl animate-orb-sway-alt" />
        </div>

        <div className="relative z-10 grid grid-cols-1 gap-5 xl:grid-cols-12 xl:items-center">
          <div className="xl:col-span-7">
            <BrandLogo className="mb-4 w-max" scale="lg" subtitle="Campaign intelligence cockpit" />
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-accent">Today in {companyLabel}</p>
            <h2 className="mt-2 max-w-3xl font-display text-3xl font-bold leading-tight md:text-4xl">
              {priorityCards.length
                ? 'Your next best actions are ready. Open a page and keep the workflow moving.'
                : 'Everything is in motion. Use shortcuts below to move between customers, targeting, campaigns, and reporting.'}
            </h2>
            <p className="mt-3 max-w-2xl text-sm text-slate-600 md:text-base dark:text-slate-300">
              The homepage now stays lightweight on purpose, while the detailed charts and operational screens remain one click away.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <Link className="btn-primary" to={priorityCards[0]?.to || '/customers'}>
                {priorityCards[0]?.cta || 'Open customers'}
              </Link>
              <Link className="btn-secondary" to="/notifications">
                Review notifications
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:col-span-5">
            <div className="rounded-3xl border border-slate-300/50 bg-white/60 p-4 dark:border-slate-700 dark:bg-slate-900/60">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Active customers</p>
              <p className="mt-2 font-display text-3xl font-bold">{formatNumber(customerStats.active)}</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Profiles currently available for campaigns.</p>
            </div>
            <div className="rounded-3xl border border-slate-300/50 bg-white/60 p-4 dark:border-slate-700 dark:bg-slate-900/60">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Draft queue</p>
              <p className="mt-2 font-display text-3xl font-bold">{formatNumber(notificationStats.draft)}</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Messages waiting for review or delivery.</p>
            </div>
            <div className="rounded-3xl border border-slate-300/50 bg-white/60 p-4 dark:border-slate-700 dark:bg-slate-900/60">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Best product</p>
              <p className="mt-2 font-display text-2xl font-bold">{topProducts[0]?.product || 'Pending'}</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Top recommended product from the latest activity.</p>
            </div>
          </div>
        </div>
      </GlassPanel>

      {priorityCards.length ? (
        <div className="mb-4 grid grid-cols-1 gap-3 xl:grid-cols-3">
          {priorityCards.map((item) => (
            <PriorityCard key={item.title} {...item} />
          ))}
        </div>
      ) : (
        <GlassPanel className="mb-4 p-4 md:p-5">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-emerald-400/15 px-3 py-1 text-sm font-semibold text-emerald-600 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4" />
                Workspace in good shape
              </div>
              <h3 className="font-display text-xl font-semibold">No urgent setup blockers on the homepage</h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Use the shortcuts below to jump directly into customers, recommendations, notifications, or analytics.
              </p>
            </div>
            <Link className="btn-primary" to="/customers">
              Open workspace pages
            </Link>
          </div>
        </GlassPanel>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Link className="block" to="/customers">
          <MetricCard
            className="h-full transition duration-200 hover:-translate-y-1 hover:border-accent/35"
            hint={`${formatNumber(customerStats.active)} active customers`}
            icon={<Users className="h-[18px] w-[18px]" />}
            label="Customers"
            tone="teal"
            value={formatNumber(customerStats.total)}
          />
        </Link>
        <Link className="block" to="/segmentation">
          <MetricCard
            className="h-full transition duration-200 hover:-translate-y-1 hover:border-accent/35"
            hint={`${segments.length} segment buckets available`}
            icon={<Target className="h-[18px] w-[18px]" />}
            label="Segments"
            tone="copper"
            value={formatNumber(segments.reduce((sum, segment) => sum + segment.count, 0))}
          />
        </Link>
        <Link className="block" to="/notifications">
          <MetricCard
            className="h-full transition duration-200 hover:-translate-y-1 hover:border-accent/35"
            hint={`${formatNumber(notificationStats.sent)} notifications sent`}
            icon={<Bell className="h-[18px] w-[18px]" />}
            label="Draft queue"
            tone="emerald"
            value={formatNumber(notificationStats.draft)}
          />
        </Link>
        <Link className="block" to="/recommendations">
          <MetricCard
            className="h-full transition duration-200 hover:-translate-y-1 hover:border-accent/35"
            hint={`${topProducts[0]?.product || 'No products yet'} leading`}
            icon={<Sparkles className="h-[18px] w-[18px]" />}
            label="Recommendations"
            tone="indigo"
            value={formatNumber(recommendationStats.total)}
          />
        </Link>
      </div>

      <div className="mt-4">
        <div className="mb-3 flex flex-col justify-between gap-2 md:flex-row md:items-end">
          <div>
            <h3 className="font-display text-2xl font-semibold">Jump directly into a page</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">Every card below opens the exact workspace area for that task.</p>
          </div>
          <Link className="btn-secondary" to="/settings">
            Personalize workspace
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {shortcuts.map((item) => (
            <ShortcutCard key={item.title} {...item} />
          ))}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-12">
        <div className="xl:col-span-5">
          <GlassPanel className="h-full p-4 md:p-5">
            <div className="space-y-4">
              <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                <div>
                <h3 className="font-display text-xl font-semibold">Segment composition</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300">A compact view of how targeted audiences are currently split.</p>
                </div>
                <Link className="btn-secondary" to="/segmentation">
                  Open segmentation
                </Link>
              </div>

              {segments.length ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <Doughnut
                      data={buildSegmentChart(segments)}
                      options={{
                        plugins: { legend: { display: false } },
                        responsive: true,
                      }}
                    />
                  </div>
                  <div className="space-y-3">
                    {segments.map((segment) => (
                      <div key={segment.segment_label}>
                        <div className="mb-1 flex items-center justify-between text-sm">
                          <span>{`Segment ${segment.segment_label}`}</span>
                          <span className="text-slate-500 dark:text-slate-400">{formatPercent(segment.percentage)}</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-200/90 dark:bg-slate-800">
                          <div className="h-2 rounded-full bg-accent" style={{ width: `${Math.max(0, Math.min(segment.percentage, 100))}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <EmptyState
                  description="Run segmentation after uploading at least three customers with age, income, and credit score values."
                  icon={<Target className="h-8 w-8 text-accent" />}
                  title="No segment data yet"
                />
              )}
            </div>
          </GlassPanel>
        </div>

        <div className="xl:col-span-7">
          <GlassPanel className="h-full p-4 md:p-5">
            <div className="space-y-4">
              <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                <div>
                  <h3 className="font-display text-xl font-semibold">Campaign pipeline snapshot</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300">A smaller homepage summary with direct links into the next work area.</p>
                </div>
                <Link className="btn-secondary" to="/notifications">
                  Open notifications
                </Link>
              </div>

              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex items-center justify-between rounded-2xl border border-slate-300/50 bg-white/60 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/60">
                    <span className="text-sm text-slate-600 dark:text-slate-300">Active customers</span>
                    <span className="font-semibold">{formatNumber(customerStats.active)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border border-slate-300/50 bg-white/60 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/60">
                    <span className="text-sm text-slate-600 dark:text-slate-300">Offers generated</span>
                    <span className="font-semibold">{formatNumber(recommendationStats.total)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border border-slate-300/50 bg-white/60 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/60">
                    <span className="text-sm text-slate-600 dark:text-slate-300">Drafts waiting</span>
                    <span className="font-semibold">{formatNumber(notificationStats.draft)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border border-slate-300/50 bg-white/60 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/60">
                    <span className="text-sm text-slate-600 dark:text-slate-300">Failed deliveries</span>
                    <span className="font-semibold">{formatNumber(notificationStats.failed)}</span>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-300/50 bg-white/60 p-4 dark:border-slate-700 dark:bg-slate-900/60">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Best performing products</p>
                      <h4 className="mt-1 font-display text-lg font-semibold">Recommendation leaders</h4>
                    </div>
                    <ChartColumnBig className="h-5 w-5 text-accent" />
                  </div>

                  {topProducts.length ? (
                    <div className="space-y-2">
                      {topProducts.slice(0, 4).map((product) => (
                        <div className="flex items-center justify-between rounded-2xl border border-slate-300/40 px-3 py-2 text-sm dark:border-slate-700/60" key={product.product}>
                          <span>{product.product}</span>
                          <span className="font-semibold text-slate-700 dark:text-slate-100">{formatNumber(product.count)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-600 dark:text-slate-300">No recommendation activity yet. Open recommendations to generate offers.</p>
                  )}

                  <div className="mt-4">
                    <Link className="btn-secondary w-full justify-center" to="/recommendations">
                      Open recommendations
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </GlassPanel>
        </div>
      </div>
    </div>
  )
}