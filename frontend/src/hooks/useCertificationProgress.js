import { useCallback, useEffect, useState } from 'react'

const API_BASE_URL = 'http://localhost:8080'

async function parseErrorMessage(response) {
  const body = await response.json().catch(() => null)
  return body?.message ?? `status ${response.status}`
}

function useCertificationProgress() {
  const [items, setItems] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [statusFilter, setStatusFilter] = useState(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const query = statusFilter ? `?status=${statusFilter}` : ''
      const response = await fetch(`${API_BASE_URL}/api/certification-progress${query}`)
      if (!response.ok) {
        throw new Error(`status ${response.status}`)
      }
      setItems(await response.json())
    } catch {
      setError('진행 상황을 불러오지 못했습니다.')
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    load()
  }, [load])

  const addProgress = async ({ certificationId, status, targetDate }) => {
    const response = await fetch(`${API_BASE_URL}/api/certification-progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ certificationId, status, targetDate: targetDate || null, memo: null }),
    })
    if (!response.ok) {
      throw new Error(await parseErrorMessage(response))
    }
    await load()
  }

  const updateStatus = async (id, { status, targetDate }) => {
    const response = await fetch(`${API_BASE_URL}/api/certification-progress/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, targetDate: targetDate || null, memo: null }),
    })
    if (!response.ok) {
      throw new Error(await parseErrorMessage(response))
    }
    await load()
  }

  return { items, isLoading, error, statusFilter, setStatusFilter, addProgress, updateStatus }
}

export default useCertificationProgress
