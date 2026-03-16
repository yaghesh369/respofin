import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FileUp, LoaderCircle, PencilLine, Plus, Search, Trash2, UploadCloud, Users } from 'lucide-react'
import {
  bulkUploadCustomers,
  createCustomer,
  deleteAllCustomers,
  deleteCustomer,
  listCustomers,
  updateCustomer,
} from '../api/customers.js'
import EmptyState from '../components/common/EmptyState.jsx'
import GlassPanel from '../components/common/GlassPanel.jsx'
import Modal from '../components/common/Modal.jsx'
import PageHeader from '../components/common/PageHeader.jsx'
import StatusPill from '../components/common/StatusPill.jsx'
import TableScrollShell from '../components/common/TableScrollShell.jsx'
import { useToast } from '../hooks/useToast.js'
import { extractApiError } from '../lib/errors.js'
import { formatCurrency, formatDateTime, formatNumber } from '../lib/formatters.js'

const emptyForm = {
  active_product: '',
  age: '',
  credit_score: '',
  email: '',
  income: '',
  is_active: true,
  name: '',
}

function buildPayload(formValues) {
  const payload = {
    active_product: formValues.active_product.trim(),
    email: formValues.email.trim(),
    is_active: Boolean(formValues.is_active),
    name: formValues.name.trim(),
  }

  if (formValues.age !== '') {
    payload.age = Number(formValues.age)
  }

  if (formValues.income !== '') {
    payload.income = Number(formValues.income)
  }

  if (formValues.credit_score !== '') {
    payload.credit_score = Number(formValues.credit_score)
  }

  return payload
}

export default function CustomersPage() {
  const queryClient = useQueryClient()
  const notify = useToast()

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [uploadFile, setUploadFile] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState(null)
  const [formValues, setFormValues] = useState(emptyForm)
  const [formError, setFormError] = useState('')

  const customersQuery = useQuery({
    queryFn: listCustomers,
    queryKey: ['customers'],
  })

  const createMutation = useMutation({
    mutationFn: createCustomer,
    onSuccess: () => {
      notify({ message: 'Customer created successfully.', severity: 'success' })
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
      setIsModalOpen(false)
      setEditingCustomer(null)
      setFormValues(emptyForm)
    },
    onError: (error) => {
      setFormError(extractApiError(error))
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ customerId, payload }) => updateCustomer(customerId, payload),
    onSuccess: () => {
      notify({ message: 'Customer updated successfully.', severity: 'success' })
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
      setIsModalOpen(false)
      setEditingCustomer(null)
      setFormValues(emptyForm)
    },
    onError: (error) => {
      setFormError(extractApiError(error))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteCustomer,
    onSuccess: () => {
      notify({ message: 'Customer removed.', severity: 'success' })
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
    },
    onError: (error) => {
      notify({ message: extractApiError(error), severity: 'error' })
    },
  })

  const deleteAllMutation = useMutation({
    mutationFn: deleteAllCustomers,
    onSuccess: (result) => {
      notify({ message: `Deleted ${result.deleted} customer records.`, severity: 'success' })
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
    },
    onError: (error) => {
      notify({ message: extractApiError(error), severity: 'error' })
    },
  })

  const uploadMutation = useMutation({
    mutationFn: bulkUploadCustomers,
    onSuccess: (result) => {
      const issueCount = result.errors?.length || 0
      notify({
        message: issueCount
          ? `Upload complete. Created ${result.created}, skipped ${result.skipped}. (${issueCount} row issues)`
          : `Upload complete. Created ${result.created}, skipped ${result.skipped}.`,
        severity: issueCount ? 'warning' : 'success',
      })
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
      setUploadFile(null)
    },
    onError: (error) => {
      notify({
        message: extractApiError(error, 'Upload failed. The file may be too large or request timed out.'),
        severity: 'error',
      })
    },
  })

  const isUploading = uploadMutation.isPending

  const filteredCustomers = useMemo(() => {
    const rows = customersQuery.data || []

    return rows.filter((customer) => {
      const bySearch =
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email.toLowerCase().includes(searchTerm.toLowerCase())

      if (!bySearch) {
        return false
      }

      if (statusFilter === 'all') {
        return true
      }

      if (statusFilter === 'active') {
        return customer.is_active
      }

      return !customer.is_active
    })
  }, [customersQuery.data, searchTerm, statusFilter])

  function openCreateModal() {
    setFormError('')
    setEditingCustomer(null)
    setFormValues(emptyForm)
    setIsModalOpen(true)
  }

  function openEditModal(customer) {
    setFormError('')
    setEditingCustomer(customer)
    setFormValues({
      active_product: customer.active_product || '',
      age: customer.age ?? '',
      credit_score: customer.credit_score ?? '',
      email: customer.email,
      income: customer.income ?? '',
      is_active: customer.is_active,
      name: customer.name,
    })
    setIsModalOpen(true)
  }

  function handleDelete(customer) {
    const isConfirmed = window.confirm(`Delete customer ${customer.name}?`)

    if (!isConfirmed) {
      return
    }

    deleteMutation.mutate(customer.id)
  }

  function handleDeleteAll() {
    const isConfirmed = window.confirm('Delete all customer records? This action cannot be undone.')

    if (!isConfirmed) {
      return
    }

    deleteAllMutation.mutate()
  }

  function handleSubmit(event) {
    event.preventDefault()
    setFormError('')

    const payload = buildPayload(formValues)

    if (!payload.name || !payload.email) {
      setFormError('Name and email are required.')
      return
    }

    if (payload.age !== undefined && (Number.isNaN(payload.age) || payload.age < 0)) {
      setFormError('Age must be a valid positive number.')
      return
    }

    if (payload.income !== undefined && Number.isNaN(payload.income)) {
      setFormError('Income must be a valid number.')
      return
    }

    if (payload.credit_score !== undefined && Number.isNaN(payload.credit_score)) {
      setFormError('Credit score must be a valid number.')
      return
    }

    if (editingCustomer) {
      updateMutation.mutate({ customerId: editingCustomer.id, payload })
      return
    }

    createMutation.mutate(payload)
  }

  function handleUpload() {
    if (isUploading) {
      return
    }

    if (!uploadFile) {
      notify({ message: 'Please choose a CSV file first.', severity: 'warning' })
      return
    }

    uploadMutation.mutate(uploadFile)
  }

  return (
    <div>
      <PageHeader
        eyebrow="Customer workspace"
        title="Manage customer data and onboarding quality"
        description="Capture customer records, upload in bulk, monitor segment readiness, and keep your recommendation pipeline healthy."
        actions={
          <button className="btn-primary w-full sm:w-auto" onClick={openCreateModal} type="button">
            <Plus className="h-4 w-4" />
            Add customer
          </button>
        }
      />

      <GlassPanel className="mb-3 p-4">
        <div className="flex flex-col gap-3">
          {/* Row 1: search input + status pill toggle */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <span className="pointer-events-none absolute inset-y-0 left-3 z-10 flex items-center">
                <Search className="h-4 w-4 text-slate-400 dark:text-slate-500" />
              </span>
              <input
                className="field-input !pl-9"
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by customer name or email"
                value={searchTerm}
              />
            </div>

            <div className="flex shrink-0 overflow-hidden rounded-2xl border border-slate-300/70 bg-slate-100/60 p-1 dark:border-slate-700 dark:bg-slate-800/60">
              {[
                { label: 'All', value: 'all' },
                { label: 'Active', value: 'active' },
                { label: 'Inactive', value: 'inactive' },
              ].map(({ label, value }) => (
                <button
                  className={[
                    'rounded-xl px-3 py-1.5 text-xs font-medium transition-all',
                    statusFilter === value
                      ? 'bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-slate-100'
                      : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200',
                  ].join(' ')}
                  key={value}
                  onClick={() => setStatusFilter(value)}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Row 2: upload + delete actions */}
          <div className="flex flex-wrap gap-2 sm:justify-end">
            <label className={`btn-secondary cursor-pointer ${isUploading ? 'pointer-events-none opacity-60' : ''}`}>
              <UploadCloud className="h-4 w-4" />
              <span className="max-w-[220px] truncate">{uploadFile ? uploadFile.name : 'Choose CSV'}</span>
              <input
                accept=".csv"
                className="hidden"
                disabled={isUploading}
                onChange={(event) => setUploadFile(event.target.files?.[0] || null)}
                type="file"
              />
            </label>
            <button className="btn-secondary" disabled={!uploadFile || isUploading} onClick={handleUpload} type="button">
              {isUploading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
              {isUploading ? 'Uploading...' : 'Upload'}
            </button>
            <button
              className="btn-ghost border border-rose-400/50 text-rose-600 hover:bg-rose-100 dark:text-rose-200 dark:hover:bg-rose-900/40"
              disabled={isUploading || deleteAllMutation.isPending}
              onClick={handleDeleteAll}
              type="button"
            >
              <Trash2 className="h-4 w-4" />
              {deleteAllMutation.isPending ? 'Deleting...' : 'Delete all'}
            </button>

            {isUploading ? (
              <p className="basis-full text-xs text-slate-500 dark:text-slate-400">
                Upload in progress. Please wait and do not refresh this page.
              </p>
            ) : null}
          </div>
        </div>
      </GlassPanel>

      {customersQuery.isLoading ? (
        <div className="panel overflow-hidden">
          <div className="h-1 w-full animate-pulse bg-accent/70" />
        </div>
      ) : customersQuery.isError ? (
        <div className="rounded-2xl border border-rose-400/40 bg-rose-100/80 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/45 dark:bg-rose-900/65 dark:text-rose-100">
          {extractApiError(customersQuery.error, 'Unable to load customers right now.')}
        </div>
      ) : filteredCustomers.length === 0 ? (
        <EmptyState
          actionLabel="Add first customer"
          description="No customer records match your current filters. Add a new entry or upload a CSV file to continue."
          icon={<Users className="h-8 w-8 text-accent" />}
          onAction={openCreateModal}
          title="No customer data found"
        />
      ) : (
        <>
          <TableScrollShell className="table-wrap hidden lg:block">
            <table className="table-base">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Income</th>
                  <th>Credit</th>
                  <th>Status</th>
                  <th>Segment</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer, index) => (
                  <tr key={customer.id}>
                    <td className="text-slate-400 dark:text-slate-500">{index + 1}</td>
                    <td>
                      <div className="font-semibold">{customer.name}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{customer.active_product || 'No active product'}</div>
                    </td>
                    <td>{customer.email}</td>
                    <td>{formatCurrency(customer.income)}</td>
                    <td>{formatNumber(customer.credit_score)}</td>
                    <td>
                      <StatusPill value={customer.is_active ? 'active' : 'inactive'} />
                    </td>
                    <td>{customer.segment_label ?? 'Unassigned'}</td>
                    <td>{formatDateTime(customer.created_at)}</td>
                    <td>
                      <div className="flex gap-1.5">
                        <button className="btn-ghost !rounded-xl !px-2.5 !py-1.5" onClick={() => openEditModal(customer)} type="button">
                          <PencilLine className="h-4 w-4" />
                        </button>
                        <button
                          className="btn-ghost !rounded-xl !border !border-rose-400/50 !px-2.5 !py-1.5 text-rose-600 hover:bg-rose-100 dark:text-rose-200 dark:hover:bg-rose-900/40"
                          onClick={() => handleDelete(customer)}
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
            {filteredCustomers.map((customer, index) => (
              <GlassPanel className="p-4" key={customer.id}>
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs text-slate-400 dark:text-slate-500">#{index + 1}</p>
                      <p className="font-display text-lg font-semibold">{customer.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{customer.email}</p>
                    </div>
                    <StatusPill value={customer.is_active ? 'active' : 'inactive'} />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-xs uppercase text-slate-500 dark:text-slate-400">Income</p>
                      <p>{formatCurrency(customer.income)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-slate-500 dark:text-slate-400">Credit score</p>
                      <p>{formatNumber(customer.credit_score)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-slate-500 dark:text-slate-400">Segment</p>
                      <p>{customer.segment_label ?? 'Unassigned'}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-slate-500 dark:text-slate-400">Created</p>
                      <p>{formatDateTime(customer.created_at)}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="btn-secondary flex-1" onClick={() => openEditModal(customer)} type="button">
                      <PencilLine className="h-4 w-4" />
                      Edit
                    </button>
                    <button
                      className="btn-ghost flex-1 border border-rose-400/50 text-rose-600 hover:bg-rose-100 dark:text-rose-200 dark:hover:bg-rose-900/40"
                      onClick={() => handleDelete(customer)}
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

      <Modal onClose={() => setIsModalOpen(false)} open={isModalOpen} title={editingCustomer ? 'Edit customer' : 'Add customer'}>
        <form className="space-y-3" onSubmit={handleSubmit}>
          {formError ? (
            <div className="rounded-2xl border border-rose-400/40 bg-rose-100/80 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/45 dark:bg-rose-900/65 dark:text-rose-100">
              {formError}
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="field-label" htmlFor="customer-name">Name</label>
              <input
                className="field-input"
                id="customer-name"
                onChange={(event) => setFormValues((current) => ({ ...current, name: event.target.value }))}
                value={formValues.name}
              />
            </div>
            <div>
              <label className="field-label" htmlFor="customer-email">Email</label>
              <input
                className="field-input"
                id="customer-email"
                onChange={(event) => setFormValues((current) => ({ ...current, email: event.target.value }))}
                type="email"
                value={formValues.email}
              />
            </div>
            <div>
              <label className="field-label" htmlFor="customer-age">Age</label>
              <input
                className="field-input"
                id="customer-age"
                onChange={(event) => setFormValues((current) => ({ ...current, age: event.target.value }))}
                type="number"
                value={formValues.age}
              />
            </div>
            <div>
              <label className="field-label" htmlFor="customer-income">Income</label>
              <input
                className="field-input"
                id="customer-income"
                onChange={(event) => setFormValues((current) => ({ ...current, income: event.target.value }))}
                type="number"
                value={formValues.income}
              />
            </div>
            <div>
              <label className="field-label" htmlFor="customer-credit">Credit score</label>
              <input
                className="field-input"
                id="customer-credit"
                onChange={(event) => setFormValues((current) => ({ ...current, credit_score: event.target.value }))}
                type="number"
                value={formValues.credit_score}
              />
            </div>
            <div>
              <label className="field-label" htmlFor="customer-product">Active product</label>
              <input
                className="field-input"
                id="customer-product"
                onChange={(event) => setFormValues((current) => ({ ...current, active_product: event.target.value }))}
                value={formValues.active_product}
              />
            </div>
          </div>

          <label className="inline-flex items-center gap-2 text-sm font-medium">
            <input
              checked={formValues.is_active}
              className="h-4 w-4 rounded border-slate-300 text-accent focus:ring-accent"
              onChange={(event) => setFormValues((current) => ({ ...current, is_active: event.target.checked }))}
              type="checkbox"
            />
            Customer currently active
          </label>

          <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:justify-end">
            <button className="btn-secondary" onClick={() => setIsModalOpen(false)} type="button">
              Cancel
            </button>
            <button className="btn-primary" disabled={createMutation.isPending || updateMutation.isPending} type="submit">
              {createMutation.isPending || updateMutation.isPending
                ? 'Saving...'
                : editingCustomer
                  ? 'Save changes'
                  : 'Create customer'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}