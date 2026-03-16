import { useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Bar, Doughnut, Line } from 'react-chartjs-2'
import { CalendarRange, Download, LineChart, PieChart, Send, Users } from 'lucide-react'
import { downloadAnalyticsPdf, fetchAnalytics } from '../api/analytics.js'
import EmptyState from '../components/common/EmptyState.jsx'
import GlassPanel from '../components/common/GlassPanel.jsx'
import MetricCard from '../components/common/MetricCard.jsx'
import PageHeader from '../components/common/PageHeader.jsx'
import { useToast } from '../hooks/useToast.js'
import { extractApiError } from '../lib/errors.js'
import { formatNumber, formatPercent, formatShortDate } from '../lib/formatters.js'

const TIMELINE_WINDOWS = [
  { label: '7D', value: '7' },
  { label: '30D', value: '30' },
  { label: '90D', value: '90' },
  { label: 'All', value: 'all' },
]

const SEGMENT_COLORS = [
  '#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6',
]

const CHART_TOOLTIP = {
  backgroundColor: 'rgba(15, 23, 42, 0.88)',
  titleColor: '#f1f5f9',
  bodyColor: '#cbd5e1',
  borderColor: 'rgba(148, 163, 184, 0.15)',
  borderWidth: 1,
  cornerRadius: 10,
  padding: 10,
  displayColors: true,
  boxWidth: 10,
  boxHeight: 10,
}

const CHART_GRID = {
  color: 'rgba(148, 163, 184, 0.12)',
  drawBorder: false,
}

const baseChartOptions = {
  maintainAspectRatio: false,
  responsive: true,
  animation: { duration: 600 },
}

const notificationBarOptions = {
  ...baseChartOptions,
  plugins: {
    legend: { display: false },
    tooltip: {
      ...CHART_TOOLTIP,
      callbacks: {
        label: (context) => `${formatNumber(context.raw)} notifications`,
      },
    },
  },
  scales: {
    x: {
      border: { display: false },
      grid: { display: false },
      ticks: { font: { size: 12, weight: '600' } },
    },
    y: {
      beginAtZero: true,
      border: { display: false },
      grid: CHART_GRID,
      ticks: { precision: 0 },
    },
  },
}

const recommendationBySegmentBarOptions = {
  ...baseChartOptions,
  plugins: {
    legend: { display: false },
    tooltip: {
      ...CHART_TOOLTIP,
      callbacks: {
        label: (context) => `${formatNumber(context.raw)} recommendations`,
      },
    },
  },
  scales: {
    x: {
      border: { display: false },
      grid: { display: false },
      ticks: { font: { size: 12, weight: '600' } },
    },
    y: {
      beginAtZero: true,
      border: { display: false },
      grid: CHART_GRID,
      ticks: { precision: 0 },
    },
  },
}

function normalizeSeries(series) {
  if (!Array.isArray(series)) {
    return []
  }

  return series
    .filter((item) => item?.date)
    .map((item) => ({
      count: Number(item.count) || 0,
      date: item.date,
    }))
    .sort((a, b) => new Date(a.date) - new Date(b.date))
}

function filterSeriesByWindow(series, windowValue) {
  const normalized = normalizeSeries(series)

  if (!normalized.length || windowValue === 'all') {
    return normalized
  }

  const latestDate = new Date(normalized[normalized.length - 1].date)
  const days = Number(windowValue)

  if (Number.isNaN(days) || days <= 0) {
    return normalized
  }

  const windowStartDate = new Date(latestDate)
  windowStartDate.setDate(windowStartDate.getDate() - (days - 1))

  return normalized.filter((item) => new Date(item.date) >= windowStartDate)
}

function createLineDataset(series, color, label) {
  return {
    datasets: [
      {
        backgroundColor: (context) => {
          const chart = context.chart
          const { ctx, chartArea } = chart
          if (!chartArea) return `${color}20`
          const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom)
          gradient.addColorStop(0, `${color}55`)
          gradient.addColorStop(1, `${color}00`)
          return gradient
        },
        borderColor: color,
        borderWidth: 2.5,
        data: series.map((item) => item.count),
        fill: true,
        label,
        pointBackgroundColor: color,
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointHoverRadius: 6,
        pointRadius: 4,
        tension: 0.4,
      },
    ],
    labels: series.map((item) => formatShortDate(item.date)),
  }
}

function createLineOptions(color) {
  return {
    ...baseChartOptions,
    plugins: {
      legend: { display: false },
      tooltip: {
        ...CHART_TOOLTIP,
        callbacks: {
          label: (context) => `${formatNumber(context.raw)} records`,
        },
      },
    },
    scales: {
      x: {
        border: { display: false },
        grid: { display: false },
        ticks: { font: { size: 11 }, maxTicksLimit: 6 },
      },
      y: {
        beginAtZero: true,
        border: { display: false },
        grid: CHART_GRID,
        ticks: { precision: 0 },
      },
    },
    elements: {
      line: { borderColor: color },
    },
  }
}

function buildRecommendationBySegmentDataset(series) {
  return {
    datasets: [
      {
        backgroundColor: series.map((_, i) => SEGMENT_COLORS[i % SEGMENT_COLORS.length]),
        borderRadius: 8,
        data: series.map((item) => item.count),
        maxBarThickness: 48,
      },
    ],
    labels: series.map((item) => `Segment ${item.segment_label}`),
  }
}

function percentOrZero(numerator, denominator) {
  if (!denominator) {
    return 0
  }

  return (numerator / denominator) * 100
}

export default function AnalyticsPage() {
  const notify = useToast()
  const [timelineWindow, setTimelineWindow] = useState('30')

  const analyticsQuery = useQuery({
    queryFn: fetchAnalytics,
    queryKey: ['analytics'],
  })

  const downloadMutation = useMutation({
    mutationFn: downloadAnalyticsPdf,
    onSuccess: (blob) => {
      const fileUrl = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = fileUrl
      anchor.download = 'analytics_report.pdf'
      anchor.click()
      URL.revokeObjectURL(fileUrl)
      notify({ message: 'Analytics report downloaded.', severity: 'success' })
    },
    onError: (error) => {
      notify({ message: extractApiError(error), severity: 'error' })
    },
  })

  const customerTimelineRaw = analyticsQuery.data?.timeline?.customers
  const recommendationTimelineRaw = analyticsQuery.data?.timeline?.recommendations

  const customerTimeline = useMemo(
    () => filterSeriesByWindow(customerTimelineRaw ?? [], timelineWindow),
    [customerTimelineRaw, timelineWindow],
  )

  const recommendationTimeline = useMemo(
    () => filterSeriesByWindow(recommendationTimelineRaw ?? [], timelineWindow),
    [recommendationTimelineRaw, timelineWindow],
  )

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
        {extractApiError(analyticsQuery.error, 'Unable to load analytics data.')}
      </div>
    )
  }

  const analytics = analyticsQuery.data
  const customerStats = analytics.customers || { active: 0, total: 0 }
  const notificationStats = analytics.notifications || { draft: 0, failed: 0, sent: 0 }
  const recommendationStats = analytics.recommendations || { by_segment: [], top_products: [], total: 0 }
  const segments = analytics.segments || []
  const topProducts = recommendationStats.top_products || []
  const recommendationsBySegment = recommendationStats.by_segment || []

  const segmentedCustomers = segments.reduce((sum, segment) => sum + segment.count, 0)
  const deliveryAttempts = notificationStats.sent + notificationStats.failed
  const notificationTotal = deliveryAttempts + notificationStats.draft
  const deliveryRate = percentOrZero(notificationStats.sent, deliveryAttempts)
  const segmentationCoverage = percentOrZero(segmentedCustomers, customerStats.total)
  const recommendationCoverage = percentOrZero(recommendationStats.total, customerStats.total)
  const draftShare = percentOrZero(notificationStats.draft, notificationTotal)
  const maxTopProductCount = topProducts.length ? Math.max(...topProducts.map((product) => product.count)) : 0

  return (
    <div>
      <PageHeader
        eyebrow="Advanced analytics"
        title="Track business outcomes, campaign quality, and trend velocity"
        description="Inspect customer, segmentation, recommendation, and notification metrics with filterable trend windows and export-ready reporting."
        actions={
          <button
            className="btn-primary w-full sm:w-auto"
            disabled={downloadMutation.isPending}
            onClick={() => downloadMutation.mutate()}
            type="button"
          >
            <Download className="h-4 w-4" />
            {downloadMutation.isPending ? 'Preparing PDF...' : 'Download PDF report'}
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          hint={`${formatNumber(customerStats.active)} active customers`}
          icon={<Users className="h-[18px] w-[18px]" />}
          label="Customers"
          tone="teal"
          value={formatNumber(customerStats.total)}
        />
        <MetricCard
          hint={`${formatNumber(recommendationStats.total)} recommendations created`}
          icon={<LineChart className="h-[18px] w-[18px]" />}
          label="Recommendations"
          tone="indigo"
          value={formatNumber(recommendationStats.total)}
        />
        <MetricCard
          hint={`${formatNumber(notificationStats.failed)} failed notifications`}
          icon={<Send className="h-[18px] w-[18px]" />}
          label="Notifications sent"
          tone="emerald"
          value={formatNumber(notificationStats.sent)}
        />
        <MetricCard
          hint={`${formatNumber(segments.length)} active segment buckets`}
          icon={<PieChart className="h-[18px] w-[18px]" />}
          label="Segments"
          tone="copper"
          value={formatNumber(segmentedCustomers)}
        />
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <GlassPanel className="p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Delivery success rate</p>
          <p className="mt-1 font-display text-2xl font-semibold">{formatPercent(deliveryRate)}</p>
          <div className="mt-2 h-2 rounded-full bg-slate-200/90 dark:bg-slate-800">
            <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${Math.max(0, Math.min(deliveryRate, 100))}%` }} />
          </div>
        </GlassPanel>
        <GlassPanel className="p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Segmentation coverage</p>
          <p className="mt-1 font-display text-2xl font-semibold">{formatPercent(segmentationCoverage)}</p>
          <div className="mt-2 h-2 rounded-full bg-slate-200/90 dark:bg-slate-800">
            <div className="h-2 rounded-full bg-accent" style={{ width: `${Math.max(0, Math.min(segmentationCoverage, 100))}%` }} />
          </div>
        </GlassPanel>
        <GlassPanel className="p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Recommendation coverage</p>
          <p className="mt-1 font-display text-2xl font-semibold">{formatPercent(recommendationCoverage)}</p>
          <div className="mt-2 h-2 rounded-full bg-slate-200/90 dark:bg-slate-800">
            <div className="h-2 rounded-full bg-indigo-500" style={{ width: `${Math.max(0, Math.min(recommendationCoverage, 100))}%` }} />
          </div>
        </GlassPanel>
        <GlassPanel className="p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Draft queue share</p>
          <p className="mt-1 font-display text-2xl font-semibold">{formatPercent(draftShare)}</p>
          <div className="mt-2 h-2 rounded-full bg-slate-200/90 dark:bg-slate-800">
            <div className="h-2 rounded-full bg-amber-500" style={{ width: `${Math.max(0, Math.min(draftShare, 100))}%` }} />
          </div>
        </GlassPanel>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-12">
        <div className="xl:col-span-6">
          <GlassPanel className="h-full p-4 md:p-5">
            <div className="space-y-3">
              <h3 className="font-display text-xl font-semibold">Segment share</h3>
              {segments.length ? (
                <>
                  <div className="mx-auto h-64 w-full max-w-md">
                    <Doughnut
                      data={{
                        datasets: [
                          {
                            backgroundColor: SEGMENT_COLORS,
                            borderColor: 'transparent',
                            borderWidth: 3,
                            hoverBorderColor: '#ffffff',
                            hoverOffset: 10,
                            data: segments.map((segment) => segment.count),
                          },
                        ],
                        labels: segments.map((segment) => `Segment ${segment.segment_label}`),
                      }}
                      options={{
                        ...baseChartOptions,
                        cutout: '68%',
                        plugins: {
                          legend: {
                            labels: {
                              boxWidth: 10,
                              font: { size: 12 },
                              padding: 16,
                              usePointStyle: true,
                              pointStyleWidth: 10,
                            },
                            position: 'bottom',
                          },
                          tooltip: {
                            ...CHART_TOOLTIP,
                            callbacks: {
                              label: (context) => `${context.label}: ${formatNumber(context.raw)} customers`,
                            },
                          },
                        },
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    {segments.map((segment, index) => (
                      <div key={segment.segment_label}>
                        <div className="mb-1 flex items-center justify-between text-sm">
                          <span className="font-medium">{`Segment ${segment.segment_label}`}</span>
                          <span className="text-slate-500 dark:text-slate-400">{`${formatNumber(segment.count)} · ${formatPercent(segment.percentage)}`}</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-200/90 dark:bg-slate-800">
                          <div
                            className="h-2 rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.max(0, Math.min(segment.percentage, 100))}%`,
                              backgroundColor: SEGMENT_COLORS[index % SEGMENT_COLORS.length],
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <EmptyState
                  description="Run segmentation to view segment analytics and distribution charts."
                  icon={<PieChart className="h-8 w-8 text-accent" />}
                  title="No segment data"
                />
              )}
            </div>
          </GlassPanel>
        </div>

        <div className="xl:col-span-6">
          <GlassPanel className="h-full p-4 md:p-5">
            <div className="space-y-3">
              <h3 className="font-display text-xl font-semibold">Notification performance</h3>
              <div className="h-64">
                <Bar
                  data={{
                    datasets: [
                      {
                        backgroundColor: ['#f59e0b', '#10b981', '#ef4444'],
                        borderRadius: 8,
                        borderSkipped: false,
                        data: [notificationStats.draft, notificationStats.sent, notificationStats.failed],
                        hoverBackgroundColor: ['#d97706', '#059669', '#dc2626'],
                        maxBarThickness: 52,
                      },
                    ],
                    labels: ['Draft', 'Sent', 'Failed'],
                  }}
                  options={notificationBarOptions}
                />
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <div className="rounded-2xl border border-amber-200/80 bg-amber-50/80 p-3 text-center dark:border-amber-800/40 dark:bg-amber-900/20">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">Draft</p>
                  <p className="mt-0.5 text-xl font-bold text-amber-700 dark:text-amber-300">{formatNumber(notificationStats.draft)}</p>
                </div>
                <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/80 p-3 text-center dark:border-emerald-800/40 dark:bg-emerald-900/20">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">Sent</p>
                  <p className="mt-0.5 text-xl font-bold text-emerald-700 dark:text-emerald-300">{formatNumber(notificationStats.sent)}</p>
                </div>
                <div className="rounded-2xl border border-rose-200/80 bg-rose-50/80 p-3 text-center dark:border-rose-800/40 dark:bg-rose-900/20">
                  <p className="text-xs font-semibold uppercase tracking-wide text-rose-600 dark:text-rose-400">Failed</p>
                  <p className="mt-0.5 text-xl font-bold text-rose-700 dark:text-rose-300">{formatNumber(notificationStats.failed)}</p>
                </div>
              </div>
            </div>
          </GlassPanel>
        </div>

        <div className="xl:col-span-7">
          <GlassPanel className="h-full p-4 md:p-5">
            <div className="space-y-3">
              <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                <h3 className="font-display text-xl font-semibold">Timeline trends</h3>
                <div className="inline-flex items-center gap-1 rounded-full border border-slate-300/60 bg-white/70 p-1 dark:border-slate-700 dark:bg-slate-900/65">
                  <CalendarRange className="ml-2 h-4 w-4 text-slate-500 dark:text-slate-400" />
                  {TIMELINE_WINDOWS.map((option) => (
                    <button
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                        timelineWindow === option.value
                          ? 'bg-accent text-white'
                          : 'text-slate-600 hover:bg-slate-200/80 dark:text-slate-300 dark:hover:bg-slate-700/70'
                      }`}
                      key={option.value}
                      onClick={() => setTimelineWindow(option.value)}
                      type="button"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {customerTimeline.length || recommendationTimeline.length ? (
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                  <div>
                    <p className="mb-2 text-sm font-semibold">Customer timeline</p>
                    <div className="h-56">
                      <Line
                        data={createLineDataset(customerTimeline, '#4ac9b7', 'Customers')}
                        options={createLineOptions('#4ac9b7')}
                      />
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-sm font-semibold">Recommendation timeline</p>
                    <div className="h-56">
                      <Line
                        data={createLineDataset(recommendationTimeline, '#d4925c', 'Recommendations')}
                        options={createLineOptions('#d4925c')}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <EmptyState
                  description="No dated customer or recommendation activity is available for this timeline window."
                  icon={<LineChart className="h-8 w-8 text-accent" />}
                  title="No timeline data"
                />
              )}
            </div>
          </GlassPanel>
        </div>

        <div className="xl:col-span-5">
          <GlassPanel className="h-full p-4 md:p-5">
            <div className="space-y-3">
              <h3 className="font-display text-xl font-semibold">Recommendation insights</h3>

              {recommendationsBySegment.length ? (
                <div>
                  <p className="mb-2 text-sm font-semibold">Recommendations by segment</p>
                  <div className="h-56">
                    <Bar
                      data={buildRecommendationBySegmentDataset(recommendationsBySegment)}
                      options={recommendationBySegmentBarOptions}
                    />
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-300/60 bg-white/60 p-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300">
                  Segment-level recommendation analytics will appear after recommendation runs.
                </div>
              )}

              {topProducts.length ? (
                <div className="space-y-2">
                  <p className="text-sm font-semibold">Top recommended products</p>
                  {topProducts.map((product, index) => {
                    const width = maxTopProductCount ? (product.count / maxTopProductCount) * 100 : 0

                    return (
                      <div className="rounded-2xl border border-slate-300/60 bg-white/60 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900/60" key={product.product}>
                        <div className="mb-1 flex items-center justify-between">
                          <span className="font-medium">{`${index + 1}. ${product.product}`}</span>
                          <span className="font-semibold">{formatNumber(product.count)}</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-200/90 dark:bg-slate-800">
                          <div className="h-2 rounded-full bg-indigo-500" style={{ width: `${Math.max(0, Math.min(width, 100))}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-slate-600 dark:text-slate-300">No product recommendation analytics available yet.</p>
              )}
            </div>
          </GlassPanel>
        </div>
      </div>
    </div>
  )
}