import { Link } from 'react-router-dom'
import ExampleResultCard from '../components/ExampleResultCard.jsx'

const FAQ_ITEMS = [
  {
    q: '리뷰는 한 번에 몇 개까지 넣을 수 있나요?',
    a: '최대 15개까지 한 번에 분석할 수 있어요. 리뷰 하나당 한 줄, 줄바꿈으로 구분해주세요.',
  },
  {
    q: '같은 문제가 반복되면 어떻게 알려주나요?',
    a: '같은 키워드의 부정 리뷰가 2건 이상 쌓이면 화면 상단에 반복 문제 배너로 따로 알려드려요.',
  },
  {
    q: '입력한 리뷰가 저장되나요?',
    a: '로그인 없이 세션 단위로만 임시 보관돼요. 언제든 "누적 기록 초기화" 버튼으로 지울 수 있어요.',
  },
]

function GuidePage() {
  return (
    <div className="page">
      <nav className="navbar">
        <Link to="/" className="nav-logo">
          <span>🍊</span>
          <span>리뷰 매니저 AI</span>
        </Link>
        <div className="nav-links">
          <Link to="/app" className="nav-cta">
            바로 사용하기
          </Link>
        </div>
      </nav>

      <section className="hero">
        <h1>이렇게 사용하세요</h1>
        <p>리뷰 붙여넣기 한 번이면, 감정분석부터 답변 초안까지 끝나요</p>
      </section>

      <section className="how-it-works">
        <div className="step">
          <span className="step-num">1</span>
          리뷰 붙여넣기
        </div>
        <div className="step">
          <span className="step-num">2</span>
          분석 시작
        </div>
        <div className="step">
          <span className="step-num">3</span>
          답변 복사
        </div>
      </section>

      <div className="container">
        <h2 className="section-title">이런 결과를 받아요</h2>
        <ExampleResultCard />

        <h2 className="section-title">자주 묻는 질문</h2>
        <div className="faq-list">
          {FAQ_ITEMS.map((item) => (
            <div className="faq-item" key={item.q}>
              <div className="faq-question">Q. {item.q}</div>
              <div className="faq-answer">A. {item.a}</div>
            </div>
          ))}
        </div>

        <div className="guide-cta-row">
          <Link className="hero-cta" to="/app">
            지금 바로 써보기
          </Link>
        </div>
      </div>

      <footer className="site-footer">
        <p>🍊 리뷰 매니저 AI · 소상공인 무료 도구</p>
      </footer>
    </div>
  )
}

export default GuidePage
