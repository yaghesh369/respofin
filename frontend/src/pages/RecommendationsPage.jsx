import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Boxes, LoaderCircle, Sparkles, WandSparkles } from 'lucide-react'
import { listCustomers } from '../api/customers.js'
import {
  listRecommendations,
  recommendAllCustomers,
  recommendBulkCustomers,
  recommendForCustomer,
} from '../api/recommendations.js'
import EmptyState from '../components/common/EmptyState.jsx'
import GlassPanel from '../components/common/GlassPanel.jsx'
import PageHeader from '../components/common/PageHeader.jsx'
import StatusPill from '../components/common/StatusPill.jsx'
import TableScrollShell from '../components/common/TableScrollShell.jsx'
import { useToast } from '../hooks/useToast.js'
import { extractApiError } from '../lib/errors.js'
import { formatDateTime, formatNumber } from '../lib/formatters.js'

export default function RecommendationsPage() {
  const queryClient = useQueryClient()
  const notify = useToast()

  const [selectedIds, setSelectedIds] = useState([])
  const [singleCustomerId, setSingleCustomerId] = useState('')
  const [lastResult, setLastResult] = useState(null)

  const customersQuery = useQuery({
    queryFn: listCustomers,
    queryKey: ['customers'],
  })

  const recommendationsQuery = useQuery({
    queryFn: listRecommendations,
    queryKey: ['recommendations'],
  })

  const recMap = useMemo(() => {
    const map = {}
    for (const rec of (recommendationsQuery.data || [])) {
      if (map[rec.customer] === undefined) {
        map[rec.customer] = rec
      }
    }
    return map
  }, [recommendationsQuery.data])

  const segmentedCustomers = useMemo(
    () => (customersQuery.data || []).filter((customer) => customer.segment_label !== null),
    [customersQuery.data],
  )

  const unsegmentedCount = useMemo(
    () => (customersQuery.data || []).filter((customer) => customer.segment_label === null).length,
    [customersQuery.data],
  )

  async function refreshRecommendationSurfaces() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['customers'] }),
      queryClient.invalidateQueries({ queryKey: ['recommendations'] }),
      queryClient.invalidateQueries({ queryKey: ['notifications-drafts'] }),
      queryClient.invalidateQueries({ queryKey: ['analytics'] }),
    ])

    await Promise.all([
      queryClient.refetchQueries({ queryKey: ['customers'], type: 'active' }),
      queryClient.refetchQueries({ queryKey: ['recommendations'], type: 'active' }),
      queryClient.refetchQueries({ queryKey: ['notifications-drafts'], type: 'active' }),
    ])
  }

  const singleMutation = useMutation({
    mutationFn: (customerId) => recommendForCustomer(customerId),
    onSuccess: (result) => {
      notify({
        message: result.auto_segmented
          ? 'Recommendation generated. Segmentation was auto-run first.'
          : 'Recommendation generated for selected customer.',
        severity: 'success',
      })
      setLastResult({ payload: result, type: 'single' })
      void refreshRecommendationSurfaces()
    },
    onError: (error) => {
      notify({ message: extractApiError(error), severity: 'error' })
    },
  })

  const bulkMutation = useMutation({
    mutationFn: (customerIds) => recommendBulkCustomers(customerIds),
    onSuccess: (result) => {
      if (result.recommended === 0) {
        notify({
          message: `No recommendations generated. Skipped ${result.skipped}. Run segmentation first or choose eligible customers.`,
          severity: 'warning',
        })
      } else {
        notify({
          message: result.auto_segmented
            ? `Bulk run completed. Recommended ${result.recommended}, skipped ${result.skipped}. Segmentation auto-ran first.`
            : `Bulk run completed. Recommended ${result.recommended}, skipped ${result.skipped}.`,
          severity: 'success',
        })
      }
      setLastResult({ payload: result, type: 'bulk' })
      void refreshRecommendationSurfaces()
    },
    onError: (error) => {
      notify({ message: extractApiError(error), severity: 'error' })
    },
  })

  const allMutation = useMutation({
    mutationFn: recommendAllCustomers,
    onSuccess: (result) => {
      if (result.recommended === 0) {
        notify({
          message: `No recommendations generated. Skipped ${result.skipped}. Run segmentation first or verify customer feature data.`,
          severity: 'warning',
        })
      } else {
        notify({
          message: result.auto_segmented
            ? `Recommendations generated. Recommended ${result.recommended}, skipped ${result.skipped}. Segmentation auto-ran first.`
            : `Recommendations generated. Recommended ${result.recommended}, skipped ${result.skipped}.`,
          severity: 'success',
        })
      }
      setLastResult({ payload: result, type: 'all' })
      void refreshRecommendationSurfaces()
    },
    onError: (error) => {
      notify({ message: extractApiError(error), severity: 'error' })
    },
  })

  const isGenerating = singleMutation.isPending || bulkMutation.isPending || allMutation.isPending

  function toggleSelection(customerId) {
    setSelectedIds((currentIds) => (
      currentIds.includes(customerId)
        ? currentIds.filter((id) => id !== customerId)
        : [...currentIds, customerId]
    ))
  }

  function runSingleRecommendation() {
    if (isGenerating) {
      return
    }

    if (!singleCustomerId) {
      notify({ message: 'Select one segmented customer first.', severity: 'warning' })
      return
    }

    singleMutation.mutate(Number(singleCustomerId))
  }

  function runBulkRecommendation() {
    if (isGenerating) {
      return
    }

    if (selectedIds.length === 0) {
      notify({ message: 'Select at least one customer for bulk recommendations.', severity: 'warning' })
      return
    }

    bulkMutation.mutate(selectedIds)
  }

  function runAllRecommendations() {
    if (isGenerating) {
      return
    }

    if (segmentedCustomers.length === 0) {
      notify({ message: 'Run segmentation first to assign customer segments.', severity: 'warning' })
      return
    }

    allMutation.mutate()
  }

  return (
    <div>
      <PageHeader
        eyebrow="Offer generation"
        title="Generate product recommendations"
        description="Use segmentation output to create customer-specific product recommendations and prefill notification drafts."
        actions={
          <button className="btn-primary w-full sm:w-auto" disabled={isGenerating} onClick={runAllRecommendations} type="button">
            {allMutation.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <WandSparkles className="h-4 w-4" />}
            {allMutation.isPending ? 'Generating...' : 'Recommend for all'}
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
        <div className="xl:col-span-8">
          <GlassPanel className="p-4 md:p-5">
            <div className="space-y-3">
              <div className="flex flex-col justify-between gap-2 md:flex-row md:items-center">
                <h3 className="font-display text-xl font-semibold">Segment-ready customers</h3>
                <div className="flex items-center gap-2 text-sm">
                  <StatusPill value="active" />
                  <span>{formatNumber(segmentedCustomers.length)} ready</span>
                </div>
              </div>

              {customersQuery.isLoading ? (
                <div className="h-1 w-full animate-pulse rounded-full bg-accent/70" />
              ) : segmentedCustomers.length === 0 ? (
                <EmptyState
                  description="Run segmentation first to assign segment labels before generating recommendations."
                  icon={<Sparkles className="h-8 w-8 text-accent" />}
                  title="No segmented customers"
                />
              ) : (
                <>
                  {recommendationsQuery.isError ? (
                    <div className="rounded-2xl border border-rose-400/40 bg-rose-100/80 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/45 dark:bg-rose-900/65 dark:text-rose-100">
                      {extractApiError(recommendationsQuery.error, 'Unable to load recommended products. Please retry in a few seconds.')}
                    </div>
                  ) : null}

                  <div className="flex flex-col gap-2 md:flex-row">
                    <select
                      className="field-input md:max-w-xs"
                      disabled={isGenerating}
                      onChange={(event) => setSingleCustomerId(event.target.value)}
                      value={singleCustomerId}
                    >
                      <option value="">Select customer for single recommendation</option>
                      {segmentedCustomers.map((customer) => (
                        <option key={customer.id} value={customer.id}>{`${customer.name} (Segment ${customer.segment_label})`}</option>
                      ))}
                    </select>

                    <button className="btn-secondary" disabled={isGenerating} onClick={runSingleRecommendation} type="button">
                      {singleMutation.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      {singleMutation.isPending ? 'Generating...' : 'Run single'}
                    </button>

                    <button className="btn-secondary" disabled={isGenerating} onClick={runBulkRecommendation} type="button">
                      {bulkMutation.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Boxes className="h-4 w-4" />}
                      {bulkMutation.isPending ? 'Generating...' : `Run bulk (${selectedIds.length})`}
                    </button>
                  </div>

                  <TableScrollShell className="table-wrap hidden lg:block">
                    <table className="table-base recommendations-table min-w-[1020px]">
                        <thead>
                          <tr>
                            <th className="w-16">Select</th>
                            <th className="w-44">Name</th>
                            <th className="w-60">Email</th>
                            <th className="w-28">Segment</th>
                            <th className="w-52">Active product</th>
                            <th className="w-[28rem]">Recommended products</th>
                            <th className="w-44">Created</th>
                          </tr>
                        </thead>
                        <tbody>
                          {segmentedCustomers.map((customer) => (
                            <tr key={customer.id}>
                              <td>
                                <input
                                  checked={selectedIds.includes(customer.id)}
                                  className="h-4 w-4 rounded border-slate-300 text-accent focus:ring-accent"
                                  disabled={isGenerating}
                                  onChange={() => toggleSelection(customer.id)}
                                  type="checkbox"
                                />
                              </td>
                              <td className="font-semibold whitespace-normal break-words">{customer.name}</td>
                              <td className="whitespace-normal break-all">{customer.email}</td>
                              <td>{customer.segment_label}</td>
                              <td className="whitespace-normal break-words">{customer.active_product || 'N/A'}</td>
                              <td>
                                {recommendationsQuery.isError ? (
                                  <span className="text-sm text-rose-500">Unavailable</span>
                                ) : recMap[customer.id]?.recommended_products && recMap[customer.id].recommended_products.length > 0 ? (
                                  <div className="flex max-w-full flex-wrap gap-1.5">
                                    {recMap[customer.id].recommended_products.map((product, index) => (
                                      <span
                                        className="inline-flex max-w-full whitespace-normal break-all rounded-lg border border-accent/25 bg-accent/15 px-2 py-0.5 text-xs font-medium leading-5 text-accent"
                                        key={`${customer.id}-${product}-${index}`}
                                      >
                                        {product}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-sm text-slate-400">None yet</span>
                                )}
                              </td>
                              <td>{formatDateTime(recMap[customer.id]?.created_at || customer.created_at)}</td>
                            </tr>
                          ))}
                        </tbody>
                    </table>
                  </TableScrollShell>

                  <div className="grid grid-cols-1 gap-2 lg:hidden">
                    {segmentedCustomers.map((customer) => (
                      <GlassPanel className="p-3" key={customer.id}>
                        <label className="flex items-start gap-2">
                          <input
                            checked={selectedIds.includes(customer.id)}
                            className="mt-1 h-4 w-4 rounded border-slate-300 text-accent focus:ring-accent"
                            disabled={isGenerating}
                            onChange={() => toggleSelection(customer.id)}
                            type="checkbox"
                          />
                          <div>
                            <p className="font-semibold">{customer.name}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{customer.email}</p>
                            <p className="mt-1 text-sm">Segment {customer.segment_label}</p>
                            {recommendationsQuery.isError ? (
                              <p className="mt-1 text-sm text-rose-500">Recommended products unavailable</p>
                            ) : recMap[customer.id]?.recommended_products && recMap[customer.id].recommended_products.length > 0 && (
                              <div className="mt-1 flex max-w-full flex-wrap gap-1.5">
                                {recMap[customer.id].recommended_products.map((product, index) => (
                                  <span
                                    className="inline-flex max-w-full whitespace-normal break-all rounded-lg border border-accent/25 bg-accent/15 px-2 py-0.5 text-xs font-medium leading-5 text-accent"
                                    key={`${customer.id}-${product}-${index}`}
                                  >
                                    {product}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </label>
                      </GlassPanel>
                    ))}
                  </div>
                </>
              )}
            </div>
          </GlassPanel>
        </div>

        <div className="xl:col-span-4">
          <GlassPanel className="h-full p-4 md:p-5">
            <div className="space-y-3">
              <h3 className="font-display text-xl font-semibold">Run summary</h3>

              <div className="rounded-2xl border border-slate-300/60 bg-white/60 p-3 text-sm dark:border-slate-700 dark:bg-slate-900/60">
                <p>
                  Segmented customers: <span className="font-semibold">{formatNumber(segmentedCustomers.length)}</span>
                </p>
                <p className="mt-1">
                  Unsegmented customers: <span className="font-semibold">{formatNumber(unsegmentedCount)}</span>
                </p>
              </div>

              {lastResult ? (
                <div className="space-y-2 rounded-2xl border border-accent/35 bg-accent/10 p-3 text-sm">
                  <p className="font-semibold">Latest action: {lastResult.type}</p>

                  {lastResult.type === 'single' ? (
                    <>
                      <p>Customer ID: {lastResult.payload.customer}</p>
                      <p>Segment: {lastResult.payload.segment_label}</p>
                      <p className="font-medium">Products</p>
                      <ul className="list-inside list-disc">
                        {lastResult.payload.recommended_products.map((product) => (
                          <li key={product}>{product}</li>
                        ))}
                      </ul>
                    </>
                  ) : null}

                  {lastResult.type === 'bulk' ? (
                    <>
                      <p>Recommended: {lastResult.payload.recommended}</p>
                      <p>Skipped: {lastResult.payload.skipped}</p>
                    </>
                  ) : null}

                  {lastResult.type === 'all' ? (
                    <>
                      <p>Total customers: {lastResult.payload.total_customers}</p>
                      <p>Recommended: {lastResult.payload.recommended}</p>
                      <p>Skipped: {lastResult.payload.skipped}</p>
                    </>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  No recommendation action has been run in this session yet.
                </p>
              )}
            </div>
          </GlassPanel>
        </div>
      </div>
    </div>
  )
}