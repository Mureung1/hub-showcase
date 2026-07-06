import { useEffect, useState } from 'react'
import './App.css'

type HealthState = 'checking' | 'ok' | 'error'

function App() {
  const [health, setHealth] = useState<HealthState>('checking')

  useEffect(() => {
    let active = true

    fetch('/api/health')
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Health check failed: ${response.status}`)
        }

        return response.json() as Promise<{ ok: boolean }>
      })
      .then((data) => {
        if (active) {
          setHealth(data.ok ? 'ok' : 'error')
        }
      })
      .catch(() => {
        if (active) {
          setHealth('error')
        }
      })

    return () => {
      active = false
    }
  }, [])

  return (
    <main className="app-shell">
      <section className="status-panel" aria-labelledby="app-title">
        <p className="eyebrow">Web App Starter</p>
        <h1 id="app-title">Express + React 연결 확인</h1>
        <p className="description">
          아직 프로젝트 아이템을 정하기 전, 서버와 클라이언트가 연결되는지만 확인합니다.
        </p>
        <div className={`health health-${health}`}>
          <span className="health-dot" aria-hidden="true" />
          <span>
            {health === 'checking' && 'API 상태를 확인하는 중'}
            {health === 'ok' && 'API 연결 정상'}
            {health === 'error' && 'API 연결 확인 필요'}
          </span>
        </div>
      </section>
    </main>
  )
}

export default App
