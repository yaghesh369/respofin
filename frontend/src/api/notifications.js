import api from './axios.js'

export async function listDraftNotifications() {
  const response = await api.get('notifications/drafts/')
  return response.data
}

export async function listSentNotifications() {
  const response = await api.get('notifications/sent/')
  return response.data
}

export async function updateSentNotification(notificationId, payload) {
  const response = await api.patch(`notifications/sent/edit/${notificationId}/`, payload)
  return response.data
}

export async function resendSentNotification(notificationId) {
  const response = await api.post(`notifications/sent/resend/${notificationId}/`)
  return response.data
}

export async function updateDraftNotification(notificationId, payload) {
  const response = await api.patch(`notifications/edit/${notificationId}/`, payload)
  return response.data
}

export async function sendDraftNotification(notificationId) {
  const response = await api.post(`notifications/send/${notificationId}/`, undefined, {
    timeout: 60000,
  })
  return response.data
}

export async function sendAllDraftNotifications() {
  const response = await api.post('notifications/send-all/', undefined, {
    timeout: 180000,
  })
  return response.data
}

export async function deleteNotification(notificationId) {
  const response = await api.delete(`notifications/delete/${notificationId}/`)
  return response.data
}

export async function deleteManyNotifications(notificationIds) {
  const response = await api.post('notifications/delete-many/', {
    notification_ids: notificationIds,
  })
  return response.data
}

export async function deleteAllNotifications() {
  const response = await api.delete('notifications/delete-all/')
  return response.data
}