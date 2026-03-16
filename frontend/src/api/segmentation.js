import api from './axios.js'

export async function runSegmentation() {
  const response = await api.post('segmentation/run/', undefined, {
    timeout: 180000,
  })
  return response.data
}

export async function fetchSegmentationStats() {
  const response = await api.get('segmentation/stats/')
  return response.data
}