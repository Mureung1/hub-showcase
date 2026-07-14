/* ═══════════════════════════════════════════════════════════════════════════
   App.jsx — 자취방 청결관리사 FE 1단계

   학습 포인트:
   1. useState로 상태 관리 (response, history, loading)
   2. 이벤트 핸들러에서 비동기 API 호출
   3. 조건부 렌더링 (response 내용에 따라 다른 UI)
   4. CSS Grid로 레이아웃 구성
   ═══════════════════════════════════════════════════════════════════════════ */

// ─────────────────────────────────────────────────────────────────────────────
// React에서 useState 훅을 가져온다
// useState는 컴포넌트가 "기억해야 할 값"을 관리할 때 쓴다
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// 목 API를 가져온다
// 실제 백엔드 없이 프론트엔드 개발을 위한 가짜 API
// ─────────────────────────────────────────────────────────────────────────────
import { startSession, turn } from './mock/api.js'

// ═══════════════════════════════════════════════════════════════════════════
// confidence 라벨 → 한글 매핑
// API는 영문 라벨만 반환하고, UI에서 한글로 변환해서 보여준다
// 숫자나 퍼센트는 절대 사용하지 않는다 (프로젝트 규칙)
// ═══════════════════════════════════════════════════════════════════════════
const CONFIDENCE_LABELS = {
  most_likely: '유력',
  possible: '가능',
  unlikely: '낮음',
}

// ═══════════════════════════════════════════════════════════════════════════
// confidence 라벨 → 배경색 매핑
// 신뢰도에 따라 시각적으로 구분되게 색상을 다르게 한다
// ═══════════════════════════════════════════════════════════════════════════
const CONFIDENCE_COLORS = {
  most_likely: 'var(--color-confidence-high)',
  possible: 'var(--color-confidence-medium)',
  unlikely: 'var(--color-confidence-low)',
}

// ═══════════════════════════════════════════════════════════════════════════
// Rail에 표시할 도메인 목록 — 하드코딩
// 지금은 클릭해도 동작 안 함 (향후 구현 예정)
// ═══════════════════════════════════════════════════════════════════════════
const DOMAINS = [
  { id: 'kitchen', label: '주방', emoji: '🍳' },
  { id: 'bathroom', label: '화장실', emoji: '🚿' },
  { id: 'room', label: '방', emoji: '🛏️' },
]

// ═══════════════════════════════════════════════════════════════════════════
// App 컴포넌트 정의
// ═══════════════════════════════════════════════════════════════════════════
function App() {
  // ─────────────────────────────────────────────────────────────────────────
  // useState 선언부 — 컴포넌트가 기억해야 할 값 3가지
  // ─────────────────────────────────────────────────────────────────────────

  // response: 현재 API 응답을 저장한다
  // null이면 아직 시작 안 한 상태, 값이 있으면 질문 또는 가설이 들어있다
  // 이 값이 바뀌면 React가 화면을 다시 그린다
  const [response, setResponse] = useState(null)

  // history: 지금까지의 질문-답변 기록을 저장한다
  // 배열로 저장하며, 각 항목은 { question, answer } 형태다
  // 사용자가 어떤 선택을 해왔는지 보여주기 위해 필요하다
  const [history, setHistory] = useState([])

  // loading: API 호출 중인지 여부를 저장한다
  // true면 로딩 중이라 버튼을 비활성화하고, false면 클릭 가능하다
  // 중복 클릭 방지와 사용자 피드백을 위해 필요하다
  const [loading, setLoading] = useState(false)

  // sessionId: 현재 진단 세션의 고유 ID
  // API 호출할 때 어떤 세션인지 알려주기 위해 필요하다
  // (상태 3개 규칙에서 보조 변수로 허용)
  const [sessionId, setSessionId] = useState(null)

  // ─────────────────────────────────────────────────────────────────────────
  // 이벤트 핸들러: "진단 시작" 버튼 클릭 시
  // ─────────────────────────────────────────────────────────────────────────
  const handleStart = async () => {
    // 로딩 상태로 변경 — 버튼 비활성화
    setLoading(true)

    // API 호출 — 새 세션 시작
    const result = await startSession()

    // 세션 ID 저장 — 다음 turn 호출에 필요
    setSessionId(result.sessionId)

    // 응답 저장 — 화면이 질문 모드로 바뀜
    setResponse(result)

    // 히스토리 초기화 — 새 세션이니까
    setHistory([])

    // 로딩 해제 — 버튼 다시 활성화
    setLoading(false)
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 이벤트 핸들러: 선택지 버튼 클릭 시
  // option: 클릭한 선택지 객체 { id, label }
  // ─────────────────────────────────────────────────────────────────────────
  const handleOptionClick = async (option) => {
    // 로딩 상태로 변경
    setLoading(true)

    // 현재 질문을 히스토리에 추가
    // 전개 연산자(...)로 기존 배열을 복사하고 새 항목을 뒤에 추가
    setHistory([
      ...history,
      {
        question: response.needMoreInfo.question,
        answer: option.label,
      },
    ])

    // API 호출 — 사용자 응답 전송
    const result = await turn(sessionId, option.id)

    // 응답 저장 — 다음 질문이거나 가설 목록
    setResponse(result)

    // 로딩 해제
    setLoading(false)
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 이벤트 핸들러: "다시 시작" 버튼 클릭 시
  // ─────────────────────────────────────────────────────────────────────────
  const handleReset = () => {
    // 모든 상태를 초기값으로 되돌린다
    setResponse(null)
    setHistory([])
    setSessionId(null)
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 렌더 — JSX 반환
  // ═══════════════════════════════════════════════════════════════════════
  return (
    // ─────────────────────────────────────────────────────────────────────
    // 최상위 컨테이너 — CSS Grid로 전체 레이아웃 구성
    // grid-template-rows: Nav 높이 + 나머지 전부
    // grid-template-columns: Rail 너비 + 나머지 전부
    // ─────────────────────────────────────────────────────────────────────
    <div
      style={{
        display: 'grid',
        gridTemplateRows: 'var(--size-nav-height) 1fr',
        gridTemplateColumns: 'var(--size-rail-width) 1fr',
        height: '100%',
      }}
    >
      {/* ═════════════════════════════════════════════════════════════════
          Nav — 상단 네비게이션 바
          grid-column: 1 / -1 은 첫 번째 열부터 마지막 열까지 차지한다는 뜻
          ═════════════════════════════════════════════════════════════════ */}
      <nav
        style={{
          gridColumn: '1 / -1',
          backgroundColor: 'var(--color-bg-nav)',
          color: 'var(--color-text-inverse)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 var(--space-lg)',
        }}
      >
        <span style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'bold' }}>
          🏠 자취방 청결관리사
        </span>
      </nav>

      {/* ═════════════════════════════════════════════════════════════════
          Rail — 왼쪽 사이드바 (도메인 목록)
          ═════════════════════════════════════════════════════════════════ */}
      <aside
        style={{
          backgroundColor: 'var(--color-bg-rail)',
          borderRight: '1px solid var(--color-border-light)',
          padding: 'var(--space-md)',
        }}
      >
        <h3
          style={{
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-text-tertiary)',
            marginBottom: 'var(--space-md)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          진단 영역
        </h3>

        {/* 도메인 목록 — map으로 배열을 JSX 리스트로 변환 */}
        <ul>
          {DOMAINS.map((domain) => (
            // key는 React가 리스트 항목을 구분하기 위해 필요하다
            <li key={domain.id} style={{ marginBottom: 'var(--space-sm)' }}>
              <button
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: 'var(--space-sm) var(--space-md)',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor:
                    domain.id === 'kitchen'
                      ? 'var(--color-accent-primary)'
                      : 'transparent',
                  color:
                    domain.id === 'kitchen'
                      ? 'var(--color-text-inverse)'
                      : 'var(--color-text-primary)',
                  transition: 'background-color var(--transition-fast)',
                }}
              >
                {domain.emoji} {domain.label}
              </button>
            </li>
          ))}
        </ul>
      </aside>

      {/* ═════════════════════════════════════════════════════════════════
          Stage — 메인 콘텐츠 영역
          response 값에 따라 다른 UI를 렌더링한다
          ═════════════════════════════════════════════════════════════════ */}
      <main
        style={{
          backgroundColor: 'var(--color-bg-secondary)',
          padding: 'var(--space-xl)',
          overflowY: 'auto',
        }}
      >
        {/* ─────────────────────────────────────────────────────────────────
            렌더 분기부 — response 상태에 따라 3가지 화면 중 하나를 보여준다
            ───────────────────────────────────────────────────────────────── */}

        {/* ─────────────────────────────────────────────────────────────────
            분기 1: response가 null이면 → 시작 화면
            아직 진단을 시작하지 않은 초기 상태
            ───────────────────────────────────────────────────────────────── */}
        {response === null && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
            }}
          >
            <h1
              style={{
                fontSize: 'var(--font-size-xl)',
                marginBottom: 'var(--space-md)',
                color: 'var(--color-text-primary)',
              }}
            >
              주방 악취 진단
            </h1>
            <p
              style={{
                color: 'var(--color-text-secondary)',
                marginBottom: 'var(--space-xl)',
              }}
            >
              몇 가지 질문에 답하면 악취의 원인을 찾아드려요
            </p>
            <button
              onClick={handleStart}
              disabled={loading}
              style={{
                padding: 'var(--space-md) var(--space-xl)',
                fontSize: 'var(--font-size-md)',
                backgroundColor: loading
                  ? 'var(--color-text-tertiary)'
                  : 'var(--color-accent-primary)',
                color: 'var(--color-text-inverse)',
                borderRadius: 'var(--radius-md)',
                transition: 'background-color var(--transition-fast)',
              }}
            >
              {loading ? '불러오는 중...' : '진단 시작하기'}
            </button>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────
            분기 2: response.needMoreInfo가 있으면 → 질문 화면
            아직 정보가 더 필요해서 질문을 보여주는 상태
            ───────────────────────────────────────────────────────────────── */}
        {response !== null && response.needMoreInfo && (
          <div>
            {/* 히스토리가 있으면 이전 질문-답변 표시 */}
            {history.length > 0 && (
              <div style={{ marginBottom: 'var(--space-xl)' }}>
                <h4
                  style={{
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--color-text-tertiary)',
                    marginBottom: 'var(--space-md)',
                  }}
                >
                  지금까지의 응답
                </h4>
                {history.map((item, index) => (
                  <div
                    key={index}
                    style={{
                      padding: 'var(--space-sm) var(--space-md)',
                      backgroundColor: 'var(--color-bg-primary)',
                      borderRadius: 'var(--radius-sm)',
                      marginBottom: 'var(--space-sm)',
                      borderLeft: '3px solid var(--color-accent-primary)',
                    }}
                  >
                    <span style={{ color: 'var(--color-text-secondary)' }}>
                      {item.question}
                    </span>
                    <span
                      style={{
                        marginLeft: 'var(--space-sm)',
                        fontWeight: 'bold',
                      }}
                    >
                      → {item.answer}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* 현재 질문 카드 */}
            <div
              style={{
                backgroundColor: 'var(--color-bg-primary)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-xl)',
                boxShadow: 'var(--shadow-md)',
                maxWidth: 'var(--size-card-max-width)',
              }}
            >
              <h2
                style={{
                  fontSize: 'var(--font-size-lg)',
                  marginBottom: 'var(--space-lg)',
                  color: 'var(--color-text-primary)',
                }}
              >
                {response.needMoreInfo.question}
              </h2>

              {/* 선택지 버튼들 — map으로 배열을 버튼 리스트로 변환 */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-sm)',
                }}
              >
                {response.needMoreInfo.options.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => handleOptionClick(option)}
                    disabled={loading}
                    style={{
                      padding: 'var(--space-md)',
                      textAlign: 'left',
                      backgroundColor: loading
                        ? 'var(--color-bg-tertiary)'
                        : 'var(--color-bg-secondary)',
                      color: 'var(--color-text-primary)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-border-light)',
                      transition: 'all var(--transition-fast)',
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────
            분기 3: response.hypotheses가 있으면 → 결과 화면
            충분한 정보를 수집해서 가설을 제시하는 상태
            ───────────────────────────────────────────────────────────────── */}
        {response !== null && response.hypotheses && (
          <div>
            {/* 히스토리 표시 */}
            <div style={{ marginBottom: 'var(--space-xl)' }}>
              <h4
                style={{
                  fontSize: 'var(--font-size-sm)',
                  color: 'var(--color-text-tertiary)',
                  marginBottom: 'var(--space-md)',
                }}
              >
                수집한 정보
              </h4>
              {history.map((item, index) => (
                <div
                  key={index}
                  style={{
                    padding: 'var(--space-sm) var(--space-md)',
                    backgroundColor: 'var(--color-bg-primary)',
                    borderRadius: 'var(--radius-sm)',
                    marginBottom: 'var(--space-sm)',
                    borderLeft: '3px solid var(--color-accent-success)',
                  }}
                >
                  <span style={{ color: 'var(--color-text-secondary)' }}>
                    {item.question}
                  </span>
                  <span
                    style={{
                      marginLeft: 'var(--space-sm)',
                      fontWeight: 'bold',
                    }}
                  >
                    → {item.answer}
                  </span>
                </div>
              ))}
            </div>

            {/* 결과 헤더 */}
            <h2
              style={{
                fontSize: 'var(--font-size-lg)',
                marginBottom: 'var(--space-lg)',
                color: 'var(--color-text-primary)',
              }}
            >
              🔍 예상 원인
            </h2>

            {/* 가설 카드들 — map으로 배열을 카드 리스트로 변환 */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-md)',
              }}
            >
              {response.hypotheses.map((hypothesis) => (
                <div
                  key={hypothesis.id}
                  style={{
                    backgroundColor: 'var(--color-bg-primary)',
                    borderRadius: 'var(--radius-lg)',
                    padding: 'var(--space-lg)',
                    boxShadow: 'var(--shadow-sm)',
                    maxWidth: 'var(--size-card-max-width)',
                    borderLeft: `4px solid ${CONFIDENCE_COLORS[hypothesis.confidence]}`,
                  }}
                >
                  {/* 원인 제목 + 신뢰도 라벨 */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 'var(--space-sm)',
                    }}
                  >
                    <h3
                      style={{
                        fontSize: 'var(--font-size-md)',
                        fontWeight: 'bold',
                        color: 'var(--color-text-primary)',
                      }}
                    >
                      {hypothesis.cause}
                    </h3>
                    {/* 신뢰도 라벨 — 숫자가 아닌 한글 텍스트로 표시 */}
                    <span
                      style={{
                        padding: 'var(--space-xs) var(--space-sm)',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: CONFIDENCE_COLORS[hypothesis.confidence],
                        color: 'var(--color-text-inverse)',
                        fontSize: 'var(--font-size-sm)',
                        fontWeight: 'bold',
                      }}
                    >
                      {CONFIDENCE_LABELS[hypothesis.confidence]}
                    </span>
                  </div>
                  {/* 근거 설명 */}
                  <p
                    style={{
                      color: 'var(--color-text-secondary)',
                      fontSize: 'var(--font-size-sm)',
                    }}
                  >
                    {hypothesis.evidence}
                  </p>
                </div>
              ))}
            </div>

            {/* 다시 시작 버튼 */}
            <button
              onClick={handleReset}
              style={{
                marginTop: 'var(--space-xl)',
                padding: 'var(--space-md) var(--space-xl)',
                backgroundColor: 'var(--color-bg-tertiary)',
                color: 'var(--color-text-primary)',
                borderRadius: 'var(--radius-md)',
                transition: 'background-color var(--transition-fast)',
              }}
            >
              다시 시작하기
            </button>
          </div>
        )}
      </main>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// App 컴포넌트를 기본 내보내기
// main.jsx에서 이걸 import해서 화면에 렌더링한다
// ─────────────────────────────────────────────────────────────────────────────
export default App
