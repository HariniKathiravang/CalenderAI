import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export const getBackendBaseUrl = () => {
  const url = import.meta.env.VITE_API_URL || ''
  if (url && url.startsWith('http')) {
    return url.replace(/\/api\/?$/, '')
  }
  if (window.location.hostname === 'localhost') {
    return 'http://localhost:8000'
  }
  return ''
}

export default api
