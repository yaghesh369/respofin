import api from './axios.js'

export async function registerAccount(payload) {
  const response = await api.post('auth/register/', payload)
  return response.data
}

export async function loginAccount(payload) {
  const response = await api.post('auth/login/', payload)
  return response.data
}

export async function logoutAccount(payload) {
  const response = await api.post('auth/logout/', payload)
  return response.data
}

export async function fetchProfile() {
  const response = await api.get('auth/profile/')
  return response.data
}

export async function updateProfile(payload) {
  const response = await api.patch('auth/profile/', payload)
  return response.data
}