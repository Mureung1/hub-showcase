import { Link } from 'react-router-dom'

// 6 · 추천 상세
const META = [
  { k: '필요 기술', v: 'JavaScript · DOM' },
  { k: '예상 변경 규모', v: '파일 1~2개' },
  { k: '레포 유지보수', v: '활발' },
]

const GUIDE = [
  '레포를 포크하고 로컬에 클론해요.',
  <>
    <code>tooltip</code> 위치 계산 부분에 뷰포트 경계 조건을 추가해요.
  </>,
  '작은 화면에서 동작을 확인한 뒤 PR을 올려요.',
]

function Detail() {
  return (
    <div className="panel">
      <Link to="/result" className="back">
        ← 목록으로
      </Link>
      <div className="d-repo">
        <span className="lang lang-js">
          <span className="sw" />
          JavaScript
        </span>{' '}
        · chartjs/Chart.js <span className="inum">#11821</span> · <span className="star">★</span>{' '}
        64.2k · 최근 커밋 2일 전
      </div>
      <h1 className="d-title">Tooltip 위치가 작은 화면에서 잘리는 문제 수정</h1>
      <div className="tags">
        <span className="badge badge-blue">쉬움</span>
        <span className="tag tag-gfi">good first issue</span>
        <span className="tag tag-bug">bug</span>
        <span className="tag">CSS</span>
      </div>

      <div className="meta">
        {META.map((cell) => (
          <div className="cell" key={cell.k}>
            <div className="k">{cell.k}</div>
            <div className="v">{cell.v}</div>
          </div>
        ))}
      </div>

      <div className="d-body">
        <div className="why" style={{ marginBottom: '20px' }}>
          <span className="ic">↣</span>
          <div>
            <b>왜 나에게 맞나요?</b> 주 언어가 JavaScript로 일치하고, 재현 방법이 명확하며 변경
            범위가 작아요. 메인테이너가 활발히 응답하는 레포라 첫 기여 피드백을 빠르게 받을 수
            있어요.
          </div>
        </div>
        <h3>이슈 요약</h3>
        <p>
          화면 폭이 좁을 때 차트 툴팁이 컨테이너 밖으로 벗어나 잘리는 현상이 보고됐어요. 툴팁 위치
          계산 로직이 뷰포트 경계를 반영하도록 보정이 필요해요.
        </p>
        <h3>기여 시작 가이드</h3>
        <ol className="guide">
          {GUIDE.map((item, index) => (
            <li key={index} data-n={index + 1}>
              {item}
            </li>
          ))}
        </ol>
      </div>

      <div className="d-actions">
        <a
          className="btn btn-primary btn-lg"
          href="https://github.com/chartjs/Chart.js/issues"
          target="_blank"
          rel="noreferrer"
        >
          GitHub에서 이슈 보기 ↗
        </a>
        <Link to="/result" className="btn btn-soft btn-lg">
          다른 이슈 보기
        </Link>
      </div>
    </div>
  )
}

export default Detail
