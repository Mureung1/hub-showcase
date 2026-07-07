import './App.css'

const highlights = [
  '오늘 주요 타임테이블',
  '오늘 운영 부스',
  '공지사항',
]

function App() {
  return (
    <main className="app">
      <section className="hero" aria-labelledby="page-title">
        <p className="eyebrow">대학 축제 웹사이트 MVP</p>
        <h1 id="page-title">축제 정보를 한 곳에서 빠르게 확인하세요.</h1>
        <p className="description">
          타임테이블, 부스, 공지사항을 모바일 환경에서 확인하기 위한
          프론트엔드 MVP입니다.
        </p>
      </section>

      <section className="quick-links" aria-label="핵심 기능">
        {highlights.map((item) => (
          <article className="quick-link" key={item}>
            <span>{item}</span>
          </article>
        ))}
      </section>
    </main>
  )
}

export default App
