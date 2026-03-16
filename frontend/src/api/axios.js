import axios from 'axios'
import { clearStoredSession, getStoredSession, setStoredSession } from '../lib/storage.js'

const api = axios.create({
  baseURL: '/api/',
  timeout: 20000,
})

const refreshClient = axios.create({
  baseURL: '/api/',
  timeout: 20000,
})

let refreshPromise = null

async function refreshAccessToken() {
  const session = getStoredSession()

  if (!session?.refresh) {
    throw new Error('Missing refresh token')
  }

  if (!refreshPromise) {
    refreshPromise = refreshClient
      .post('auth/token/refresh/', { refresh: session.refresh })
      .then((response) => {
        const nextSession = {
          ...session,
          access: response.data.access,
        }

        setStoredSession(nextSession)
        return nextSession.access
      })
      .finally(() => {
        refreshPromise = null
      })
  }

  return refreshPromise
}

api.interceptors.request.use((config) => {
  const session = getStoredSession()

  if (session?.access) {
    config.headers.Authorization = `Bearer ${session.access}`
  }

  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    const statusCode = error.response?.status
    const requestUrl = originalRequest?.url ?? ''
    const isAuthRequest =
      requestUrl.includes('auth/login/') ||
      requestUrl.includes('auth/register/') ||
      requestUrl.includes('auth/token/refresh/')

    if (statusCode !== 401 || originalRequest?._retry || isAuthRequest) {
      return Promise.reject(error)
    }

    try {
      const nextAccessToken = await refreshAccessToken()
      originalRequest._retry = true
      originalRequest.headers = {
        ...originalRequest.headers,
        Authorization: `Bearer ${nextAccessToken}`,
      }
      return api(originalRequest)
    } catch (refreshError) {
      clearStoredSession()

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('respofin:session-expired'))
      }

      return Promise.reject(refreshError)
    }
  },
)

export default api
