import { useState } from 'react'
import { API_BASE_URL } from '../config.js'

async function parseErrorMessage(response) {
  const body = await response.json().catch(() => null)
  return body?.message ?? `status ${response.status}`
}

function useCertificationPath() {
  const [result, setResult] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const computePath = async (certificationIds) => {
    setIsLoading(true)
    setError(null)
    try {
      const query = certificationIds.join(',')
      const response = await fetch(
        `${API_BASE_URL}/api/certification-path?certificationIds=${query}`,
      )
      if (!response.ok) {
        throw new Error(await parseErrorMessage(response))
      }
      setResult(await response.json())
    } catch (err) {
      setError(err.message || '경로를 계산하지 못했습니다.')
      setResult(null)
    } finally {
      setIsLoading(false)
    }
  }

  return { result, isLoading, error, computePath }
}

export default useCertificationPath
