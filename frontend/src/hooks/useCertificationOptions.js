import { useEffect, useState } from 'react'
import { API_BASE_URL } from '../config.js'

function useCertificationOptions() {
  const [options, setOptions] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    fetch(`${API_BASE_URL}/api/certifications`)
      .then((response) => {
        if (!response.ok) throw new Error(`status ${response.status}`)
        return response.json()
      })
      .then((data) => {
        if (!cancelled) setOptions(data)
      })
      .catch(() => {
        if (!cancelled) setError('자격증 목록을 불러오지 못했습니다.')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { options, isLoading, error }
}

export default useCertificationOptions
