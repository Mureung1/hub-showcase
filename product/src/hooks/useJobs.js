import { useEffect, useState } from 'react'
import { FALLBACK_JOBS, normalizeJobs } from '../data/jobs'
import { fetchJson } from './apiFetch'

// 직무 목록을 서버에서 받는다. 화면은 목록을 하드코딩하지 않는다.
// 서버가 아직 안 떠 있거나 응답이 비면 data/jobs.js 의 대체 목록으로 떨어져 데모가 멈추지 않는다.
// 반환: { jobs, status } — status 는 loading | ready | fallback
export default function useJobs() {
  const [jobs, setJobs] = useState(FALLBACK_JOBS)
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    const controller = new AbortController()
    fetchJson('/api/jobs', { signal: controller.signal })
      .then((json) => {
        const list = normalizeJobs(json)
        if (list.length === 0) {
          setStatus('fallback')
          return
        }
        setJobs(list)
        setStatus('ready')
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setStatus('fallback')
      })
    return () => controller.abort()
  }, [])

  return { jobs, status }
}
