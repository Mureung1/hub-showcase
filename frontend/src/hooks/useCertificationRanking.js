import { useState } from 'react'

const API_BASE_URL = 'http://localhost:8080'

function useCertificationRanking() {
  const [jobTitle, setJobTitle] = useState('')
  const [rankings, setRankings] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showValidationError, setShowValidationError] = useState(false)
  const [error, setError] = useState(null)

  const onJobTitleChange = (value) => {
    setJobTitle(value)
    setShowValidationError(false)
  }

  const search = async (e) => {
    e.preventDefault()
    const trimmed = jobTitle.trim()
    if (!trimmed) {
      setShowValidationError(true)
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/certification?jobTitle=${encodeURIComponent(trimmed)}`,
      )

      if (response.status === 404) {
        setRankings([])
        return
      }
      if (!response.ok) {
        throw new Error(`status ${response.status}`)
      }

      setRankings(await response.json())
    } catch {
      setError('요청 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setIsLoading(false)
    }
  }

  return { jobTitle, onJobTitleChange, rankings, isLoading, showValidationError, error, search }
}

export default useCertificationRanking
