import api from './axios.js'

export async function listRecommendations() {
  const response = await api.get('recommendations/list/', {
    timeout: 60000,
  })
  return response.data
}

export async function recommendForCustomer(customerId) {
  const response = await api.post(`recommendations/customer/${customerId}/`, undefined, {
    timeout: 60000,
  })
  return response.data
}

export async function recommendBulkCustomers(customerIds) {
  const response = await api.post('recommendations/bulk/', {
    customer_ids: customerIds,
  }, {
    timeout: 180000,
  })
  return response.data
}

export async function recommendAllCustomers() {
  const response = await api.post('recommendations/all/', undefined, {
    timeout: 180000,
  })
  return response.data
}