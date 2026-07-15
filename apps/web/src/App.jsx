/* ═══════════════════════════════════════════════════════════════════════════
   App.jsx — 자취방 청결관리사 FE 2단계

   학습 포인트:
   1. 컴포넌트 분리 — state는 App이 소유, 자식은 props만 받는다
   2. "이벤트는 위로, 데이터는 아래로" — React의 단방향 데이터 흐름
   3. 조건부 렌더링 4분기 (시작 → 질문 → 가설 → 완료)
   ═══════════════════════════════════════════════════════════════════════════ */

// ─────────────────────────────────────────────────────────────────────────────
// React에서 useState 훅을 가져온다
// useState는 컴포넌트가 "기억해야 할 값"을 관리할 때 쓴다
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// 목 API를 가져온다 — done 함수 추가됨
// ─────────────────────────────────────────────────────────────────────────────
import { startSession, turn, done } from './mock/api.js'

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
// ═══════════════════════════════════════════════════════════════════════════
const DOMAINS = [
  { id: 'kitchen', label: '주방', emoji: '🍳' },
  { id: 'bathroom', label: '화장실', emoji: '🚿' },
  { id: 'room', label: '방', emoji: '🛏️' },
]

// ═══════════════════════════════════════════════════════════════════════════
// QuestionCard 컴포넌트
//
// props로 받는 것:
// - question: 질문 텍스트 (string)
// - options: 선택지 배열 ([{ id, label }])
// - onSelect: 선택지 클릭 시 호출할 함수 (option => void)
// - disabled: 버튼 비활성화 여부 (boolean)
//
// 왜 state가 없는가:
// - 이 컴포넌트는 "표시만" 담당한다. 데이터(question, options)는 부모가 내려준다.
// - 사용자가 선택하면 onSelect를 호출해서 부모에게 "알린다".
// - 상태 변경은 부모(App)가 한다. 자식은 시키는 대로만.
// ═══════════════════════════════════════════════════════════════════════════
function QuestionCard({ question, options, onSelect, disabled }) {
  return (
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
        {question}
      </h2>

      {/* 선택지 버튼들 */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-sm)',
        }}
      >
        {options.map((option) => (
          <button
            key={option.id}
            onClick={() => onSelect(option)}
            disabled={disabled}
            style={{
              padding: 'var(--space-md)',
              textAlign: 'left',
              backgroundColor: disabled
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
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// HypothesisCard 컴포넌트
//
// props로 받는 것:
// - hypothesis: 가설 객체 하나 ({ id, cause, confidence, evidence })
//
// 왜 state가 없는가:
// - 이 컴포넌트는 가설 한 장을 "표시만" 한다.
// - 어떤 가설을 보여줄지는 부모가 정해서 내려준다.
// - 카드 자체는 클릭 같은 상호작용이 없으므로 이벤트 콜백도 필요 없다.
// ═══════════════════════════════════════════════════════════════════════════
function HypothesisCard({ hypothesis }) {
  return (
    <div
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
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// SessionEnd 컴포넌트
//
// props로 받는 것:
// - history: 질문-답변 기록 배열 ([{ question, answer }])
// - onReset: "다시 시작" 버튼 클릭 시 호출할 함수 (() => void)
//
// 왜 state가 없는가:
// - 이 컴포넌트는 "진단 완료" 요약 화면을 표시만 한다.
// - history는 부모가 관리하고 내려준다.
// - 다시 시작하려면 onReset을 호출해서 부모에게 알린다.
// ═══════════════════════════════════════════════════════════════════════════
function SessionEnd({ history, onReset }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: 'var(--space-xxl)',
      }}
    >
      {/* 완료 메시지 */}
      <div
        style={{
          fontSize: '48px',
          marginBottom: 'var(--space-lg)',
        }}
      >
        ✅
      </div>
      <h1
        style={{
          fontSize: 'var(--font-size-xl)',
          marginBottom: 'var(--space-md)',
          color: 'var(--color-text-primary)',
        }}
      >
        진단 완료
      </h1>
      <p
        style={{
          color: 'var(--color-text-secondary)',
          marginBottom: 'var(--space-xl)',
        }}
      >
        수집한 정보를 바탕으로 원인을 분석했어요
      </p>

      {/* 히스토리 요약 */}
      <div
        style={{
          backgroundColor: 'var(--color-bg-primary)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-lg)',
          boxShadow: 'var(--shadow-sm)',
          maxWidth: 'var(--size-card-max-width)',
          width: '100%',
          marginBottom: 'var(--space-xl)',
        }}
      >
        <h4
          style={{
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-text-tertiary)',
            marginBottom: 'var(--space-md)',
          }}
        >
          수집한 정보 요약
        </h4>
        {history.map((item, index) => (
          <div
            key={index}
            style={{
              padding: 'var(--space-sm) var(--space-md)',
              backgroundColor: 'var(--color-bg-secondary)',
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

      {/* 다시 시작 버튼 */}
      <button
        onClick={onReset}
        style={{
          padding: 'var(--space-md) var(--space-xl)',
          fontSize: 'var(--font-size-md)',
          backgroundColor: 'var(--color-accent-primary)',
          color: 'var(--color-text-inverse)',
          borderRadius: 'var(--radius-md)',
          transition: 'background-color var(--transition-fast)',
        }}
      >
        새 진단 시작하기
      </button>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// App 컴포넌트 정의
// ═══════════════════════════════════════════════════════════════════════════
function App() {
  // ─────────────────────────────────────────────────────────────────────────
  // useState 선언부 — 컴포넌트가 기억해야 할 값 4가지
  // 모든 상태는 App에서만 관리한다. 자식 컴포넌트는 props로만 받는다.
  // ─────────────────────────────────────────────────────────────────────────

  // response: 현재 API 응답을 저장한다
  // null → 시작 전 / needMoreInfo → 질문 / hypotheses → 가설 / done → 완료
  // 이 값 하나로 4가지 화면을 분기한다
  const [response, setResponse] = useState(null)

  // history: 지금까지의 질문-답변 기록을 저장한다
  // 배열로 저장하며, 각 항목은 { question, answer } 형태다
  const [history, setHistory] = useState([])

  // loading: API 호출 중인지 여부를 저장한다
  // true면 로딩 중이라 버튼을 비활성화한다
  const [loading, setLoading] = useState(false)

  // sessionId: 현재 진단 세션의 고유 ID
  // API 호출할 때 어떤 세션인지 알려주기 위해 필요하다
  const [sessionId, setSessionId] = useState(null)

  // ─────────────────────────────────────────────────────────────────────────
  // 이벤트 핸들러: "진단 시작" 버튼 클릭 시
  // ─────────────────────────────────────────────────────────────────────────
  const handleStart = async () => {
    setLoading(true)
    const result = await startSession()
    setSessionId(result.sessionId)
    setResponse(result)
    setHistory([])
    setLoading(false)
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 이벤트 핸들러: 선택지 버튼 클릭 시
  // QuestionCard에서 onSelect prop으로 내려간다
  // ─────────────────────────────────────────────────────────────────────────
  const handleOptionClick = async (option) => {
    setLoading(true)

    // 현재 질문을 히스토리에 추가
    setHistory([
      ...history,
      {
        question: response.needMoreInfo.question,
        answer: option.label,
      },
    ])

    const result = await turn(sessionId, option.id)
    setResponse(result)
    setLoading(false)
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 이벤트 핸들러: "이 진단 마치기" 버튼 클릭 시
  // 가설 화면에서 호출되어 done API를 부르고 완료 화면으로 전환
  // ─────────────────────────────────────────────────────────────────────────
  const handleFinish = async () => {
    setLoading(true)
    const result = await done(sessionId)
    setResponse(result)
    setLoading(false)
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 이벤트 핸들러: "다시 시작" 버튼 클릭 시
  // SessionEnd에서 onReset prop으로 내려간다
  // ─────────────────────────────────────────────────────────────────────────
  const handleReset = () => {
    setResponse(null)
    setHistory([])
    setSessionId(null)
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 렌더 — JSX 반환
  // ═══════════════════════════════════════════════════════════════════════
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateRows: 'var(--size-nav-height) 1fr',
        gridTemplateColumns: 'var(--size-rail-width) 1fr',
        height: '100%',
      }}
    >
      {/* Nav — 상단 네비게이션 바 */}
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

      {/* Rail — 왼쪽 사이드바 */}
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

        <ul>
          {DOMAINS.map((domain) => (
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

      {/* Stage — 메인 콘텐츠 영역 */}
      <main
        style={{
          backgroundColor: 'var(--color-bg-secondary)',
          padding: 'var(--space-xl)',
          overflowY: 'auto',
        }}
      >
        {/* ─────────────────────────────────────────────────────────────────
            렌더 분기부 — response 상태에 따라 4가지 화면 중 하나를 보여준다

            분기 순서:
            1. response === null           → 시작 화면
            2. response.needMoreInfo       → 질문 화면 (QuestionCard)
            3. response.hypotheses         → 가설 화면 (HypothesisCard 리스트)
            4. response.done               → 완료 화면 (SessionEnd)
            ───────────────────────────────────────────────────────────────── */}

        {/* ─────────────────────────────────────────────────────────────────
            분기 1: response가 null이면 → 시작 화면
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

            "이벤트는 위로, 데이터는 아래로":
            - question, options: App → QuestionCard로 "데이터"가 내려간다
            - onSelect: 사용자가 선택하면 QuestionCard → App으로 "이벤트"가 올라온다
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

            {/* ─────────────────────────────────────────────────────────────
                QuestionCard 호출

                데이터는 아래로: question, options, disabled를 props로 내려준다
                이벤트는 위로: onSelect에 handleOptionClick을 전달한다
                             사용자가 선택하면 이 함수가 호출되어 App의 상태가 바뀐다
                ───────────────────────────────────────────────────────────── */}
            <QuestionCard
              question={response.needMoreInfo.question}
              options={response.needMoreInfo.options}
              onSelect={handleOptionClick}
              disabled={loading}
            />
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────
            분기 3: response.hypotheses가 있으면 → 가설 화면
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

            {/* ─────────────────────────────────────────────────────────────
                HypothesisCard 리스트

                map 안에서 각 가설마다 HypothesisCard를 호출한다
                데이터는 아래로: hypothesis 객체를 props로 내려준다
                ───────────────────────────────────────────────────────────── */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-md)',
              }}
            >
              {response.hypotheses.map((hypothesis) => (
                <HypothesisCard key={hypothesis.id} hypothesis={hypothesis} />
              ))}
            </div>

            {/* 이 진단 마치기 버튼 */}
            <button
              onClick={handleFinish}
              disabled={loading}
              style={{
                marginTop: 'var(--space-xl)',
                padding: 'var(--space-md) var(--space-xl)',
                fontSize: 'var(--font-size-md)',
                backgroundColor: loading
                  ? 'var(--color-text-tertiary)'
                  : 'var(--color-accent-success)',
                color: 'var(--color-text-inverse)',
                borderRadius: 'var(--radius-md)',
                transition: 'background-color var(--transition-fast)',
              }}
            >
              {loading ? '처리 중...' : '이 진단 마치기'}
            </button>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────
            분기 4: response.done이 있으면 → 완료 화면

            "이벤트는 위로, 데이터는 아래로":
            - history: App → SessionEnd로 "데이터"가 내려간다
            - onReset: 버튼 클릭하면 SessionEnd → App으로 "이벤트"가 올라온다
            ───────────────────────────────────────────────────────────────── */}
        {response !== null && response.done && (
          <SessionEnd history={history} onReset={handleReset} />
        )}
      </main>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// App 컴포넌트를 기본 내보내기
// ─────────────────────────────────────────────────────────────────────────────
export default App
