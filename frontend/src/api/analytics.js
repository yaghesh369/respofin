import api from './axios.js'

export async function fetchAnalytics({ includeTimeline = true } = {}) {
  const response = await api.get('analytics/', {
    params: {
      include_timeline: includeTimeline,
    },
    timeout: 60000,
  })
  return response.data
}

export async function downloadAnalyticsPdf() {
  const response = await api.get('analytics/download-pdf/', {
    responseType: 'blob',
    timeout: 240000,
  })

  return response.data
}