import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { LoaderCircle, MailCheck, MailOpen, PencilLine, RotateCcw, Search, Send, SendHorizontal, Trash2 } from 'lucide-react'
import {
  deleteAllNotifications,
  deleteManyNotifications,
  deleteNotification,
  listDraftNotifications,
  listSentNotifications,
  resendSentNotification,
  sendAllDraftNotifications,
  sendDraftNotification,
  updateDraftNotification,
  updateSentNotification,
} from '../api/notifications.js'
import { listRecommendations } from '../api/recommendations.js'
import EmptyState from '../components/common/EmptyState.jsx'
import GlassPanel from '../components/common/GlassPanel.jsx'
import Modal from '../components/common/Modal.jsx'
import PageHeader from '../components/common/PageHeader.jsx'
import StatusPill from '../components/common/StatusPill.jsx'
import TableScrollShell from '../components/common/TableScrollShell.jsx'
import { useToast } from '../hooks/useToast.js'
import { extractApiError } from '../lib/errors.js'
import { formatDateTime } from '../lib/formatters.js'

const SEND_ALL_BATCH_SIZE = 15
const PROVIDER_LIMIT_MARKERS = [
  'daily user sending limit exceeded',
  'sending limit exceeded',
  'quota exceeded',
  '5.4.5',
]
const QUERY_KEYS_TO_REFRESH = [
  ['notifications-drafts'],
  ['notifications-sent'],
  ['analytics'],
  ['recommendations'],
]
const EMPTY_NOTIFICATIONS = []

function isProviderLimitError(errorMessage) {
  const value = String(errorMessage || '').toLowerCase()
  return PROVIDER_LIMIT_MARKERS.some((marker) => value.includes(marker))
}

export default function NotificationsPage() {
  const queryClient = useQueryClient()
  const notify = useToast()

  const [activeDraft, setActiveDraft] = useState(null)
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [selectedIds, setSelectedIds] = useState([])
  const [showSent, setShowSent] = useState(false)
  const [activeSent, setActiveSent] = useState(null)
  const [sentSubject, setSentSubject] = useState('')
  const [sentMessage, setSentMessage] = useState('')
  const [draftSearch, setDraftSearch] = useState('')
  const [sentSearch, setSentSearch] = useState('')
  const [bulkSendProgress, setBulkSendProgress] = useState({ processed: 0, total: 0 })

  const draftsQuery = useQuery({
    queryFn: listDraftNotifications,
    queryKey: ['notifications-drafts'],
    staleTime: 0,
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
    refetchOnMount: 'always',
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
  })

  const sentQuery = useQuery({
    queryFn: listSentNotifications,
    queryKey: ['notifications-sent'],
    staleTime: 0,
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
    refetchOnMount: 'always',
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
  })

  const recommendationsQuery = useQuery({
    queryFn: listRecommendations,
    queryKey: ['recommendations'],
  })

  const recMap = useMemo(() => {
    const map = {}
    for (const rec of (recommendationsQuery.data || [])) {
      if (map[rec.customer] === undefined) {
        map[rec.customer] = rec.recommended_products
      }
    }
    return map
  }, [recommendationsQuery.data])

  const drafts = draftsQuery.data ?? EMPTY_NOTIFICATIONS
  const sentItems = sentQuery.data ?? EMPTY_NOTIFICATIONS

  const filteredDrafts = useMemo(() => {
    const query = draftSearch.trim().toLowerCase()
    if (!query) return drafts
    return drafts.filter(
      (d) =>
        d.customer_name?.toLowerCase().includes(query) ||
        d.customer_email?.toLowerCase().includes(query) ||
        d.subject?.toLowerCase().includes(query),
    )
  }, [drafts, draftSearch])

  const filteredSentItems = useMemo(() => {
    const query = sentSearch.trim().toLowerCase()
    if (!query) return sentItems
    return sentItems.filter(
      (item) =>
        item.customer_name?.toLowerCase().includes(query) ||
        item.customer_email?.toLowerCase().includes(query) ||
        item.subject?.toLowerCase().includes(query),
    )
  }, [sentItems, sentSearch])

  const visibleSelectedIds = selectedIds.filter((id) => filteredDrafts.some((draft) => draft.id === id))
  const allSelected = filteredDrafts.length > 0 && visibleSelectedIds.length === filteredDrafts.length

  const providerLimitDrafts = useMemo(
    () => drafts.filter((draft) => isProviderLimitError(draft.error_message)),
    [drafts],
  )
  const providerLimitCount = providerLimitDrafts.length

  async function refreshNotificationSurfaces() {
    await Promise.all(
      QUERY_KEYS_TO_REFRESH.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
    )

    await Promise.all(
      QUERY_KEYS_TO_REFRESH.map((queryKey) => queryClient.refetchQueries({ queryKey, type: 'all' })),
    )
  }

  async function sendDraftsInBatches(notificationIds) {
    const uniqueIds = Array.from(new Set(notificationIds || []))
    setBulkSendProgress({ processed: 0, total: uniqueIds.length })

    if (uniqueIds.length === 0) {
      return {
        failed: 0,
        requested: 0,
        sent: 0,
        skipped: 0,
        stopMessage: '',
        stopReason: null,
        stoppedEarly: false,
        total: 0,
      }
    }

    let sent = 0
    let failed = 0
    let total = 0
    let stoppedEarly = false
    let stopReason = null
    let stopMessage = ''

    for (let index = 0; index < uniqueIds.length; index += SEND_ALL_BATCH_SIZE) {
      const batchIds = uniqueIds.slice(index, index + SEND_ALL_BATCH_SIZE)
      const result = await sendAllDraftNotifications(batchIds)

      const batchTotal = Number(result.total || 0)
      const batchSent = Number(result.sent || 0)
      const batchFailed = Number(result.failed || 0)
      const batchStopReason = result.stop_reason || null
      const batchStopMessage = result.stop_message || ''

      total += batchTotal
      sent += batchSent
      failed += batchFailed

      setBulkSendProgress({
        processed: Math.min(index + batchIds.length, uniqueIds.length),
        total: uniqueIds.length,
      })

      // Keep data fresh while the bulk send is running.
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['notifications-drafts'], type: 'all' }),
        queryClient.refetchQueries({ queryKey: ['notifications-sent'], type: 'all' }),
        queryClient.refetchQueries({ queryKey: ['analytics'], type: 'all' }),
      ])

      if (batchStopReason) {
        stoppedEarly = true
        stopReason = batchStopReason
        stopMessage = batchStopMessage
        break
      }

      // If the provider starts rejecting every mail in a batch, stop early
      // so the UI does not stay busy for many more failing batches.
      if (batchTotal > 0 && batchSent === 0 && batchFailed > 0) {
        stoppedEarly = true
        break
      }
    }

    return {
      failed,
      requested: uniqueIds.length,
      sent,
      skipped: Math.max(uniqueIds.length - total, 0),
      stopMessage,
      stopReason,
      stoppedEarly,
      total,
    }
  }

  const sendAllMutation = useMutation({
    mutationFn: sendDraftsInBatches,
    onSuccess: async (result) => {
      const hasFailures = (result.failed || 0) > 0
      const hasSkipped = (result.skipped || 0) > 0
      const providerLimitReached = result.stopReason === 'provider_sending_limit'
      notify({
        message: `Processed ${result.total} of ${result.requested} drafts. Sent ${result.sent}.${hasFailures ? ` Failed ${result.failed}.` : ''}${hasSkipped ? ` Skipped ${result.skipped}.` : ''}${providerLimitReached ? ' Mail provider daily sending limit reached. Try again after the provider reset window.' : result.stoppedEarly ? ' Sending stopped early due repeated failures/timeouts. You can run it again.' : ''}`,
        severity: hasFailures || hasSkipped ? 'warning' : 'success',
      })
      setSelectedIds([])
      await refreshNotificationSurfaces()
    },
    onError: (error) => {
      notify({ message: extractApiError(error), severity: 'error' })
      void refreshNotificationSurfaces()
    },
    onSettled: () => {
      setBulkSendProgress({ processed: 0, total: 0 })
    },
  })

  const sendSelectedMutation = useMutation({
    mutationFn: sendDraftsInBatches,
    onSuccess: async (result) => {
      const hasFailures = (result.failed || 0) > 0
      const hasSkipped = (result.skipped || 0) > 0
      const providerLimitReached = result.stopReason === 'provider_sending_limit'
      notify({
        message: `Processed ${result.total} of ${result.requested} selected drafts. Sent ${result.sent}.${hasFailures ? ` Failed ${result.failed}.` : ''}${hasSkipped ? ` Skipped ${result.skipped}.` : ''}${providerLimitReached ? ' Mail provider daily sending limit reached.' : result.stoppedEarly ? ' Sending stopped early due repeated failures/timeouts.' : ''}`,
        severity: hasFailures || hasSkipped ? 'warning' : 'success',
      })
      setSelectedIds([])
      await refreshNotificationSurfaces()
    },
    onError: (error) => {
      notify({ message: extractApiError(error), severity: 'error' })
      void refreshNotificationSurfaces()
    },
    onSettled: () => {
      setBulkSendProgress({ processed: 0, total: 0 })
    },
  })

  const sendOneMutation = useMutation({
    mutationFn: sendDraftNotification,
    onSuccess: async () => {
      notify({ message: 'Notification sent.', severity: 'success' })
      await refreshNotificationSurfaces()
    },
    onError: (error) => {
      notify({ message: extractApiError(error), severity: 'error' })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ notificationId, payload }) => updateDraftNotification(notificationId, payload),
    onSuccess: async () => {
      notify({ message: 'Draft updated successfully.', severity: 'success' })
      setActiveDraft(null)
      setSubject('')
      setMessage('')
      await refreshNotificationSurfaces()
    },
    onError: (error) => {
      notify({ message: extractApiError(error), severity: 'error' })
    },
  })

  const deleteOneMutation = useMutation({
    mutationFn: deleteNotification,
    onSuccess: async () => {
      notify({ message: 'Notification deleted.', severity: 'success' })
      await refreshNotificationSurfaces()
    },
    onError: (error) => {
      notify({ message: extractApiError(error), severity: 'error' })
    },
  })

  const deleteManyMutation = useMutation({
    mutationFn: deleteManyNotifications,
    onSuccess: async (result) => {
      notify({ message: `Deleted ${result.deleted} notifications.`, severity: 'success' })
      setSelectedIds([])
      await refreshNotificationSurfaces()
    },
    onError: (error) => {
      notify({ message: extractApiError(error), severity: 'error' })
    },
  })

  const deleteAllMutation = useMutation({
    mutationFn: deleteAllNotifications,
    onSuccess: async (result) => {
      notify({ message: `Deleted ${result.deleted} notifications.`, severity: 'success' })
      setSelectedIds([])
      await refreshNotificationSurfaces()
    },
    onError: (error) => {
      notify({ message: extractApiError(error), severity: 'error' })
    },
  })

  const updateSentMutation = useMutation({
    mutationFn: ({ notificationId, payload }) => updateSentNotification(notificationId, payload),
    onSuccess: async () => {
      notify({ message: 'Sent notification updated.', severity: 'success' })
      setActiveSent(null)
      setSentSubject('')
      setSentMessage('')
      await refreshNotificationSurfaces()
    },
    onError: (error) => {
      notify({ message: extractApiError(error), severity: 'error' })
    },
  })

  const resendSentMutation = useMutation({
    mutationFn: resendSentNotification,
    onSuccess: async (result) => {
      if (result.status === 'sent') {
        notify({ message: 'Notification resent successfully.', severity: 'success' })
      } else {
        notify({ message: 'Resend attempted but failed. Check notification status.', severity: 'warning' })
      }
      await refreshNotificationSurfaces()
    },
    onError: (error) => {
      notify({ message: extractApiError(error), severity: 'error' })
    },
  })

  const isMutating = (
    sendAllMutation.isPending ||
    sendSelectedMutation.isPending ||
    sendOneMutation.isPending ||
    updateMutation.isPending ||
    updateSentMutation.isPending ||
    resendSentMutation.isPending ||
    deleteOneMutation.isPending ||
    deleteManyMutation.isPending ||
    deleteAllMutation.isPending
  )

  function openEditor(draft) {
    setActiveDraft(draft)
    setSubject(draft.subject)
    setMessage(draft.message)
  }

  function closeEditor() {
    setActiveDraft(null)
    setSubject('')
    setMessage('')
  }

  function openSentEditor(notification) {
    setShowSent(false)
    setActiveSent(notification)
    setSentSubject(notification.subject)
    setSentMessage(notification.message || '')
  }

  function closeSentEditor() {
    setActiveSent(null)
    setSentSubject('')
    setSentMessage('')
  }

  function submitDraftUpdate(event) {
    event.preventDefault()

    if (!activeDraft) {
      return
    }

    updateMutation.mutate({
      notificationId: activeDraft.id,
      payload: {
        message,
        subject,
      },
    })
  }

  function submitSentUpdate(event) {
    event.preventDefault()

    if (!activeSent) {
      return
    }

    updateSentMutation.mutate({
      notificationId: activeSent.id,
      payload: {
        message: sentMessage,
        subject: sentSubject,
      },
    })
  }

  function handleSentResend(notificationId) {
    if (isMutating) {
      return
    }

    resendSentMutation.mutate(notificationId)
  }

  function handleSaveAndResendSentNotification() {
    if (!activeSent || isMutating) {
      return
    }

    const notificationId = activeSent.id

    updateSentMutation.mutate(
      {
        notificationId,
        payload: {
          message: sentMessage,
          subject: sentSubject,
        },
      },
      {
        onSuccess: () => {
          resendSentMutation.mutate(notificationId)
        },
      },
    )
  }

  function toggleSelection(notificationId) {
    setSelectedIds((currentIds) => (
      currentIds.includes(notificationId)
        ? currentIds.filter((id) => id !== notificationId)
        : [...currentIds, notificationId]
    ))
  }

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds([])
      return
    }

    setSelectedIds(filteredDrafts.map((draft) => draft.id))
  }

  function handleSendSelected() {
    if (isMutating) {
      return
    }

    if (visibleSelectedIds.length === 0) {
      notify({ message: 'Select at least one draft notification first.', severity: 'warning' })
      return
    }

    const isConfirmed = window.confirm(`Send ${visibleSelectedIds.length} selected draft notifications?`)

    if (!isConfirmed) {
      return
    }

    sendSelectedMutation.mutate(visibleSelectedIds)
  }

  function handleSendAll() {
    if (isMutating) {
      return
    }

    if (drafts.length === 0) {
      notify({ message: 'No draft notifications available to send.', severity: 'warning' })
      return
    }

    sendAllMutation.mutate(drafts.map((draft) => draft.id))
  }

  function handleDeleteOne(notificationId) {
    if (isMutating) {
      return
    }

    const isConfirmed = window.confirm('Delete this notification?')

    if (!isConfirmed) {
      return
    }

    if (activeDraft?.id === notificationId) {
      closeEditor()
    }

    deleteOneMutation.mutate(notificationId)
  }

  function handleDeleteSelected() {
    if (isMutating) {
      return
    }

    if (visibleSelectedIds.length === 0) {
      notify({ message: 'Select at least one notification first.', severity: 'warning' })
      return
    }

    const isConfirmed = window.confirm(`Delete ${visibleSelectedIds.length} selected notifications?`)

    if (!isConfirmed) {
      return
    }

    deleteManyMutation.mutate(visibleSelectedIds)
  }

  function handleDeleteAll() {
    if (isMutating) {
      return
    }

    if (drafts.length === 0) {
      notify({ message: 'No notifications available to delete.', severity: 'warning' })
      return
    }

    const isConfirmed = window.confirm('Delete all notifications? This action cannot be undone.')

    if (!isConfirmed) {
      return
    }

    deleteAllMutation.mutate()
  }

  return (
    <div>
      <PageHeader
        eyebrow="Notification studio"
        title="Review and send personalized drafts"
        description="Each recommendation run creates notification drafts. Edit, send, and delete notifications individually, in bulk, or all at once."
        actions={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <button
              className="btn-primary w-full sm:w-auto"
              disabled={isMutating}
              onClick={handleSendAll}
              type="button"
            >
              {sendAllMutation.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4" />}
              {sendAllMutation.isPending
                ? `Sending all... ${bulkSendProgress.processed}/${bulkSendProgress.total || drafts.length}`
                : 'Send all drafts'}
            </button>
            <button
              className="btn-secondary w-full sm:w-auto"
              disabled={isMutating || visibleSelectedIds.length === 0}
              onClick={handleSendSelected}
              type="button"
            >
              {sendSelectedMutation.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {sendSelectedMutation.isPending
                ? `Sending selected... ${bulkSendProgress.processed}/${bulkSendProgress.total || visibleSelectedIds.length}`
                : visibleSelectedIds.length > 0
                  ? `Send selected (${visibleSelectedIds.length})`
                  : 'Send selected'}
            </button>
            <button
              className="btn-secondary w-full sm:w-auto"
              onClick={() => setShowSent(true)}
              type="button"
            >
              <MailOpen className="h-4 w-4" />
              {`View sent${sentItems.length > 0 ? ` (${sentItems.length})` : ''}`}
            </button>
            <button className="btn-secondary w-full sm:w-auto" disabled={isMutating} onClick={handleDeleteSelected} type="button">
              <Trash2 className="h-4 w-4" />
              {visibleSelectedIds.length > 0 ? `Delete selected (${visibleSelectedIds.length})` : 'Delete selected'}
            </button>
            <button
              className="btn-ghost w-full border border-rose-400/50 text-rose-600 hover:bg-rose-100 dark:text-rose-200 dark:hover:bg-rose-900/40 sm:w-auto"
              disabled={isMutating}
              onClick={handleDeleteAll}
              type="button"
            >
              <Trash2 className="h-4 w-4" />
              Delete all
            </button>
          </div>
        }
      />

      {draftsQuery.isLoading ? (
        <div className="panel overflow-hidden">
          <div className="h-1 w-full animate-pulse bg-accent/70" />
        </div>
      ) : draftsQuery.isError ? (
        <div className="rounded-2xl border border-rose-400/40 bg-rose-100/80 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/45 dark:bg-rose-900/65 dark:text-rose-100">
          {extractApiError(draftsQuery.error, 'Unable to load notification drafts.')}
        </div>
      ) : drafts.length === 0 ? (
        <EmptyState
          description="No draft messages are available right now. Generate recommendations first to create draft notifications."
          icon={<MailCheck className="h-8 w-8 text-accent" />}
          title="No drafts pending"
        />
      ) : (
        <>
          {providerLimitCount > 0 ? (
            <div className="rounded-2xl border border-amber-400/50 bg-amber-100/85 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/50 dark:bg-amber-900/55 dark:text-amber-100">
              Sending paused by mail provider limit for {providerLimitCount} draft{providerLimitCount !== 1 ? 's' : ''}. Drafts are pending retry. Click Send all after provider quota reset.
            </div>
          ) : null}

          {recommendationsQuery.isError ? (
            <div className="rounded-2xl border border-rose-400/40 bg-rose-100/80 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/45 dark:bg-rose-900/65 dark:text-rose-100">
              {extractApiError(recommendationsQuery.error, 'Unable to load recommended products for notifications right now.')}
            </div>
          ) : null}

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="field-input pl-9"
              onChange={(e) => setDraftSearch(e.target.value)}
              placeholder="Search by name, email or subject…"
              type="search"
              value={draftSearch}
            />
          </div>
          {draftSearch && (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {filteredDrafts.length} of {drafts.length} draft{drafts.length !== 1 ? 's' : ''} shown
            </p>
          )}

          <TableScrollShell className="table-wrap hidden lg:block">
            <table className="table-base">
              <thead>
                <tr>
                  <th>
                    <input
                      checked={allSelected}
                      className="h-4 w-4 rounded border-slate-300 text-accent focus:ring-accent"
                      disabled={isMutating}
                      onChange={toggleSelectAll}
                      type="checkbox"
                    />
                  </th>
                  <th>Customer</th>
                  <th>Subject</th>
                  <th>Recommended products</th>
                  <th>Message</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDrafts.map((draft) => (
                  <tr key={draft.id}>
                    <td>
                      <input
                        checked={selectedIds.includes(draft.id)}
                        className="h-4 w-4 rounded border-slate-300 text-accent focus:ring-accent"
                        disabled={isMutating}
                        onChange={() => toggleSelection(draft.id)}
                        type="checkbox"
                      />
                    </td>
                    <td>
                      <div className="font-medium">{draft.customer_name}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{draft.customer_email}</div>
                    </td>
                    <td className="font-medium">{draft.subject}</td>
                    <td>
                      {recommendationsQuery.isError ? (
                        <span className="text-sm text-rose-500">Unavailable</span>
                      ) : recMap[draft.customer] && recMap[draft.customer].length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {recMap[draft.customer].map((product) => (
                            <span
                              className="rounded-lg bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent"
                              key={product}
                            >
                              {product}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400">—</span>
                      )}
                    </td>
                    <td>
                      <p className="line-clamp-2 text-sm text-slate-600 dark:text-slate-300">{draft.message}</p>
                    </td>
                    <td>
                      <StatusPill value={draft.status} />
                    </td>
                    <td>{formatDateTime(draft.created_at)}</td>
                    <td>
                      <div className="flex gap-1.5">
                        <button className="btn-secondary !rounded-xl !px-2.5 !py-1.5" disabled={isMutating} onClick={() => openEditor(draft)} type="button">
                          <PencilLine className="h-4 w-4" />
                        </button>
                        <button
                          className="btn-primary !rounded-xl !px-2.5 !py-1.5"
                          disabled={isMutating}
                          onClick={() => sendOneMutation.mutate(draft.id)}
                          type="button"
                        >
                          {sendOneMutation.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        </button>
                        <button
                          className="btn-ghost !rounded-xl !border !border-rose-400/50 !px-2.5 !py-1.5 text-rose-600 hover:bg-rose-100 dark:text-rose-200 dark:hover:bg-rose-900/40"
                          disabled={isMutating}
                          onClick={() => handleDeleteOne(draft.id)}
                          type="button"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScrollShell>

          <div className="grid grid-cols-1 gap-2 lg:hidden">
            {filteredDrafts.map((draft) => (
              <GlassPanel className="p-4" key={draft.id}>
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <input
                        checked={selectedIds.includes(draft.id)}
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-accent focus:ring-accent"
                        disabled={isMutating}
                        onChange={() => toggleSelection(draft.id)}
                        type="checkbox"
                      />
                      <div>
                        <p className="font-medium">{draft.customer_name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{draft.customer_email}</p>
                        <p className="font-display text-lg font-semibold">{draft.subject}</p>
                      </div>
                    </div>
                    <StatusPill value={draft.status} />
                  </div>

                  {recommendationsQuery.isError ? (
                    <p className="text-sm text-rose-500">Recommended products unavailable</p>
                  ) : recMap[draft.customer] && recMap[draft.customer].length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {recMap[draft.customer].map((product) => (
                        <span
                          className="rounded-lg bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent"
                          key={product}
                        >
                          {product}
                        </span>
                      ))}
                    </div>
                  )}

                  <p className="line-clamp-3 text-sm text-slate-600 dark:text-slate-300">{draft.message}</p>

                  <div className="text-xs text-slate-500 dark:text-slate-400">Created {formatDateTime(draft.created_at)}</div>

                  <div className="flex gap-2">
                    <button className="btn-secondary flex-1" disabled={isMutating} onClick={() => openEditor(draft)} type="button">
                      <PencilLine className="h-4 w-4" />
                      Edit
                    </button>
                    <button className="btn-primary flex-1" disabled={isMutating} onClick={() => sendOneMutation.mutate(draft.id)} type="button">
                      {sendOneMutation.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      Send
                    </button>
                    <button
                      className="btn-ghost flex-1 border border-rose-400/50 text-rose-600 hover:bg-rose-100 dark:text-rose-200 dark:hover:bg-rose-900/40"
                      disabled={isMutating}
                      onClick={() => handleDeleteOne(draft.id)}
                      type="button"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </div>
                </div>
              </GlassPanel>
            ))}
          </div>
        </>
      )}

      <Modal onClose={closeEditor} open={Boolean(activeDraft)} title="Edit notification draft">
        <form className="space-y-3" onSubmit={submitDraftUpdate}>
          <div>
            <label className="field-label" htmlFor="draft-subject">Subject</label>
            <input className="field-input" id="draft-subject" onChange={(event) => setSubject(event.target.value)} value={subject} />
          </div>

          <div>
            <label className="field-label" htmlFor="draft-message">Message</label>
            <textarea
              className="field-input min-h-[200px] resize-y"
              id="draft-message"
              onChange={(event) => setMessage(event.target.value)}
              value={message}
            />
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button className="btn-secondary" onClick={closeEditor} type="button">
              Cancel
            </button>
            <button className="btn-primary" disabled={updateMutation.isPending} type="submit">
              {updateMutation.isPending ? 'Saving...' : 'Save draft'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal onClose={() => { setShowSent(false); setSentSearch('') }} open={showSent} title={`Sent notifications${sentItems.length > 0 ? ` (${sentItems.length})` : ''}`}>
        {sentItems.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">No sent notifications yet.</p>
        ) : (
          <>
            <div className="relative mb-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="field-input pl-9"
                onChange={(e) => setSentSearch(e.target.value)}
                placeholder="Search by name, email or subject…"
                type="search"
                value={sentSearch}
              />
            </div>
            {sentSearch && (
              <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">
                {filteredSentItems.length} of {sentItems.length} notification{sentItems.length !== 1 ? 's' : ''} shown
              </p>
            )}
            <TableScrollShell className="table-wrap hidden lg:block">
              <table className="table-base w-full">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Subject</th>
                    <th>Status</th>
                    <th>Recommended products</th>
                    <th>Message</th>
                    <th>Sent at</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSentItems.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="font-medium">{item.customer_name}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{item.customer_email}</div>
                      </td>
                      <td className="font-medium">{item.subject}</td>
                      <td>
                        <StatusPill value={item.status} />
                      </td>
                      <td>
                        {item.recommended_products && item.recommended_products.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {item.recommended_products.map((product) => (
                              <span
                                className="rounded-lg bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent"
                                key={product}
                              >
                                {product}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400">—</span>
                        )}
                      </td>
                      <td>
                        <p className="line-clamp-2 text-sm text-slate-600 dark:text-slate-300">{item.message || '—'}</p>
                      </td>
                      <td>{formatDateTime(item.sent_at)}</td>
                      <td>
                        <div className="flex gap-1.5">
                          <button
                            className="btn-secondary !rounded-xl !px-2.5 !py-1.5"
                            disabled={isMutating}
                            onClick={() => openSentEditor(item)}
                            type="button"
                          >
                            <PencilLine className="h-4 w-4" />
                          </button>
                          <button
                            className="btn-primary !rounded-xl !px-2.5 !py-1.5"
                            disabled={isMutating}
                            onClick={() => handleSentResend(item.id)}
                            type="button"
                          >
                            {resendSentMutation.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableScrollShell>

            <div className="grid grid-cols-1 gap-2 lg:hidden">
              {filteredSentItems.map((item) => (
                <GlassPanel className="p-4" key={item.id}>
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{item.customer_name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{item.customer_email}</p>
                      </div>
                      <StatusPill value={item.status} />
                    </div>
                    <p className="font-semibold">{item.subject}</p>
                    {item.recommended_products && item.recommended_products.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {item.recommended_products.map((product) => (
                          <span
                            className="rounded-lg bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent"
                            key={product}
                          >
                            {product}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="line-clamp-3 text-sm text-slate-600 dark:text-slate-300">{item.message || '—'}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Sent {formatDateTime(item.sent_at)}</p>
                    <div className="flex gap-2">
                      <button
                        className="btn-secondary flex-1"
                        disabled={isMutating}
                        onClick={() => openSentEditor(item)}
                        type="button"
                      >
                        <PencilLine className="h-4 w-4" />
                        Edit
                      </button>
                      <button
                        className="btn-primary flex-1"
                        disabled={isMutating}
                        onClick={() => handleSentResend(item.id)}
                        type="button"
                      >
                        {resendSentMutation.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                        Resend
                      </button>
                    </div>
                  </div>
                </GlassPanel>
              ))}
            </div>
          </>
        )}
      </Modal>

      <Modal onClose={closeSentEditor} open={Boolean(activeSent)} title="Edit sent notification">
        <form className="space-y-3" onSubmit={submitSentUpdate}>
          <div>
            <label className="field-label" htmlFor="sent-subject">Subject</label>
            <input
              className="field-input"
              id="sent-subject"
              onChange={(event) => setSentSubject(event.target.value)}
              value={sentSubject}
            />
          </div>

          <div>
            <label className="field-label" htmlFor="sent-message">Message</label>
            <textarea
              className="field-input min-h-[200px] resize-y"
              id="sent-message"
              onChange={(event) => setSentMessage(event.target.value)}
              value={sentMessage}
            />
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button className="btn-secondary" onClick={closeSentEditor} type="button">
              Cancel
            </button>
            <button className="btn-secondary" disabled={isMutating} onClick={handleSaveAndResendSentNotification} type="button">
              {isMutating ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
              Save and resend
            </button>
            <button className="btn-primary" disabled={isMutating} type="submit">
              {isMutating ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}