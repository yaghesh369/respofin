import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bot, Gauge, LoaderCircle, PlayCircle, Target } from 'lucide-react'
import { listCustomers } from '../api/customers.js'
import { fetchSegmentationStats, runSegmentation } from '../api/segmentation.js'
import EmptyState from '../components/common/EmptyState.jsx'
import GlassPanel from '../components/common/GlassPanel.jsx'
import MetricCard from '../components/common/MetricCard.jsx'
import PageHeader from '../components/common/PageHeader.jsx'
import { useToast } from '../hooks/useToast.js'
import { extractApiError } from '../lib/errors.js'
import { formatNumber } from '../lib/formatters.js'

export default function SegmentationPage() {
  const queryClient = useQueryClient()
  const notify = useToast()

  const customersQuery = useQuery({
    queryFn: listCustomers,
    queryKey: ['customers'],
  })

  const statsQuery = useQuery({
    queryFn: fetchSegmentationStats,
    queryKey: ['segmentation-stats'],
    retry: false,
  })

  const runMutation = useMutation({
    mutationFn: runSegmentation,
    onSuccess: (result) => {
      notify({ message: `Segmentation completed with ${result.clusters} clusters.`, severity: 'success' })
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['segmentation-stats'] })
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
    },
    onError: (error) => {
      notify({ message: extractApiError(error), severity: 'error' })
    },
  })

  const readiness = useMemo(() => {
    const customers = customersQuery.data || []
    const ready = customers.filter(
      (customer) => customer.age !== null && customer.income !== null && customer.credit_score !== null,
    )

    return {
      readyCount: ready.length,
      total: customers.length,
    }
  }, [customersQuery.data])

  const segments = useMemo(() => {
    if (!statsQuery.data?.segments) {
      return []
    }

    return Object.entries(statsQuery.data.segments)
      .map(([label, count]) => ({
        count,
        label,
      }))
      .sort((a, b) => Number(a.label) - Number(b.label))
  }, [statsQuery.data])

  function handleRunSegmentation() {
    if (runMutation.isPending) {
      return
    }

    if (readiness.readyCount < 3) {
      notify({
        message: 'At least 3 customers with age, income, and credit score are required before running segmentation.',
        severity: 'warning',
      })
      return
    }

    runMutation.mutate()
  }

  return (
    <div>
      <PageHeader
        eyebrow="ML segmentation"
        title="Cluster customers for cross-sell targeting"
        description="Run K-Means segmentation using age, income, and credit score to create meaningful customer cohorts for recommendations and campaigns."
        actions={
          <button className="btn-primary w-full sm:w-auto" disabled={runMutation.isPending} onClick={handleRunSegmentation} type="button">
            {runMutation.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
            {runMutation.isPending ? 'Running segmentation...' : 'Run segmentation'}
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <MetricCard
          hint="Need at least 3 ready customers"
          icon={<Target className="h-[18px] w-[18px]" />}
          label="Ready for clustering"
          tone="teal"
          value={formatNumber(readiness.readyCount)}
        />
        <MetricCard
          hint="Customers in your workspace"
          icon={<Gauge className="h-[18px] w-[18px]" />}
          label="Total customers"
          tone="copper"
          value={formatNumber(readiness.total)}
        />
        <MetricCard
          hint={statsQuery.data?.segments ? 'Based on latest run' : 'Run required to populate'}
          icon={<Bot className="h-[18px] w-[18px]" />}
          label="Detected segments"
          tone="indigo"
          value={formatNumber(segments.length)}
        />
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <GlassPanel className="h-full p-4 md:p-5">
            <div className="space-y-3">
              <h3 className="font-display text-xl font-semibold">Segment distribution</h3>

              {statsQuery.isLoading ? (
                <div className="h-1 w-full animate-pulse rounded-full bg-accent/70" />
              ) : statsQuery.isError ? (
                <EmptyState
                  description="No segment stats available yet. Run segmentation once your customer data is ready."
                  icon={<Target className="h-8 w-8 text-accent" />}
                  title="No segmentation stats"
                />
              ) : (
                <div className="space-y-3">
                  {segments.map((segment) => {
                    const percentage = statsQuery.data.total_customers
                      ? (segment.count / statsQuery.data.total_customers) * 100
                      : 0

                    return (
                      <div key={segment.label}>
                        <div className="mb-1 flex items-center justify-between text-sm">
                          <span className="font-medium">Segment {segment.label}</span>
                          <span className="text-slate-500 dark:text-slate-400">{formatNumber(segment.count)} customers</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-200/90 dark:bg-slate-800">
                          <div className="h-2 rounded-full bg-accent" style={{ width: `${Math.max(0, Math.min(percentage, 100))}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </GlassPanel>
        </div>

        <div className="xl:col-span-5">
          <GlassPanel className="h-full p-4 md:p-5">
            <div className="space-y-3">
              <h3 className="font-display text-xl font-semibold">Run output</h3>

              {runMutation.data ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Status</span>
                    <span className="font-semibold text-emerald-500">{runMutation.data.status}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Clusters</span>
                    <span>{runMutation.data.clusters}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Customers segmented</span>
                    <span>{formatNumber(runMutation.data.customers_segmented)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Silhouette score</span>
                    <span>{runMutation.data.silhouette_score}</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Run segmentation to populate cluster metadata and quality score.
                </p>
              )}

              <div className="rounded-2xl border border-slate-300/60 bg-white/60 p-3 text-sm dark:border-slate-700 dark:bg-slate-900/60">
                <p className="font-semibold">Data readiness rule</p>
                <p className="mt-1 text-slate-600 dark:text-slate-300">
                  Minimum 3 customers with non-empty age, income, and credit score fields are required before model execution.
                </p>
              </div>
            </div>
          </GlassPanel>
        </div>
      </div>
    </div>
  )
}