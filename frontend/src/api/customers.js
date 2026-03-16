import api from './axios.js'

export async function listCustomers() {
  const response = await api.get('customers/')
  return response.data
}

export async function createCustomer(payload) {
  const response = await api.post('customers/', payload)
  return response.data
}

export async function updateCustomer(customerId, payload) {
  const response = await api.patch(`customers/${customerId}/`, payload)
  return response.data
}

export async function deleteCustomer(customerId) {
  await api.delete(`customers/${customerId}/`)
}

export async function deleteAllCustomers() {
  const response = await api.delete('customers/delete-all/')
  return response.data
}

export async function bulkUploadCustomers(file) {
  const formData = new FormData()
  formData.append('file', file)

  const response = await api.post('customers/bulk-upload/', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    // CSV uploads can take longer on larger files or slower DB connections.
    timeout: 120000,
  })

  return response.data
}