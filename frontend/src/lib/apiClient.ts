import axios from 'axios'

const baseURL = import.meta.env.VITE_API_BASE_URL 
  ? `${import.meta.env.VITE_API_BASE_URL}/api`
  : '/api'

export const apiClient = axios.create({
  baseURL,
})
