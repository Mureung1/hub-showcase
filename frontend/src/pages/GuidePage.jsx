import { Link } from 'react-router-dom'
import './pages.css'

function GuidePage() {
  return (
    <section>
      <header className="rs-page-head">
        <h1>가이드</h1>
        <p>역기획서가 처음이라면 여기서 시작하세요.</p>
      </header>

      <div className="rs-guide-body">
        <div className="rs-panel">
          <h2>역기획서란?</h2>
          <p>
            이미 서비스 중인 게임의 시스템을 "내가 이 게임의 기획자라면 이 명세서를 어떻게 썼을까"의
            관점으로 거꾸로 복원하는 문서입니다. 게임 기획 입문 훈련이자 지망생 포트폴리오의 표준
            형식으로 쓰입니다. 핵심은 요약이 아니라 <strong>분석</strong> — "이 게임은 이렇다"가
            아니라 "왜 이렇게 만들었을까"까지 가야 역기획서입니다.
          </p>
        </div>

        <div className="rs-panel">
          <h2>좋은 역기획서의 조건</h2>
          <ul>
            <li>규칙을 수치·조건으로 씁니다. "확률이 낮다"가 아니라 "30%, 단 74회부터 상승".</li>
            <li>
              예외를 스스로 묻습니다. 재화가 부족한 채 버튼을 연타하면? 진행 중 접속이 끊기면?
            </li>
            <li>데이터 구조를 추정합니다. 이 시스템을 구현하려면 어떤 테이블이 필요한가.</li>
            <li>설계 의도를 추론하고, 그 의도를 해치지 않는 개선안을 근거와 함께 제시합니다.</li>
          </ul>
        </div>

        <div className="rs-panel">
          <h2>흔한 실수</h2>
          <ul>
            <li>위키 요약이 되어버리는 것 — 관찰만 있고 추론이 없는 문서.</li>
            <li>
              포맷 불안 — 실무 포맷은 회사마다 다릅니다. 중요한 것은 읽는 사람이 이해할 수 있는
              구조이지, 특정 양식이 아닙니다. 템플릿은 출발점으로만 쓰세요.
            </li>
            <li>
              완성하지 못하는 것 — 지망생의 최대 적은 미완성입니다. 챌린지의 마감을 활용하세요.
            </li>
          </ul>
        </div>

        <div className="rs-panel">
          <h2>참고 자료</h2>
          <ul>
            <li>
              <a href="https://developer.riotgames.com/docs/lol" target="_blank" rel="noreferrer">
                LoL Data Dragon
              </a>{' '}
              — 라이엇이 공개하는 실제 게임 데이터. 데이터 구조 섹션을 쓸 때 실물 참고용.
            </li>
            <li>
              <a href="https://wiki.factorio.com/" target="_blank" rel="noreferrer">
                Factorio Wiki
              </a>{' '}
              — 오픈된 시스템 수치가 잘 정리된 예. 수치 기술(記述)의 좋은 본보기.
            </li>
            <li>현직자 공개 글 큐레이션은 준비 중입니다.</li>
          </ul>
        </div>

        <div className="rs-panel">
          <h2>바로 시작하기</h2>
          <p>
            읽는 것보다 쓰는 게 빠릅니다. <Link to="/write">시스템 역기획 템플릿</Link>을 열면
            섹션마다 "무엇을 다뤄야 하는지"가 안내되어 있어요.
          </p>
        </div>
      </div>
    </section>
  )
}

export default GuidePage
