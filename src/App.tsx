import { DodoDiary } from './components/DodoDiary'

export default function App() {
  return (
    <main className="app-shell">
      <header className="brand-header">
        <a className="brand" href="#top" aria-label="We should do 홈">
          <span className="brand-dot" aria-hidden="true" />
          We should do<span className="brand-pause">..</span>
        </a>
        <div className="header-status" aria-label="오늘 획득한 포인트">
          <span className="point-spark" aria-hidden="true">✦</span>
          <strong>120</strong>
          <span>오늘의 포인트</span>
        </div>
      </header>

      <DodoDiary />
    </main>
  )
}
