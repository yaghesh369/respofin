export function extractApiError(error, fallback = 'Something went wrong. Please try again.') {
  const payload = error?.response?.data

  if (!payload) {
    const message = error?.message
    const isTimeout = error?.code === 'ECONNABORTED' || /timeout/i.test(message || '')

    if (isTimeout) {
      return 'Request timed out. Please try again.'
    }

    if (message) {
      return message
    }

    return fallback
  }

  if (typeof payload === 'string') {
    return payload
  }

  if (payload.error) {
    return payload.error
  }

  if (payload.detail) {
    return payload.detail
  }

  const firstValue = Object.values(payload)[0]

  if (Array.isArray(firstValue)) {
    return firstValue[0]
  }

  if (typeof firstValue === 'object' && firstValue !== null) {
    const nested = Object.values(firstValue)[0]
    if (Array.isArray(nested)) {
      return nested[0]
    }
    if (nested) {
      return String(nested)
    }
  }

  return String(firstValue || fallback)
}
