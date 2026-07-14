/* ═══════════════════════════════════════════════════════════════════════════
   목 API — 실제 백엔드 없이 프론트엔드 개발용

   시나리오: 싱크대 악취 진단
   - 첫 질문: 냄새 종류
   - 두 번째 질문: 냄새 위치
   - 세 번째부터: 가설 제시
   ═══════════════════════════════════════════════════════════════════════════ */

// ─────────────────────────────────────────────────────────────────────────────
// 세션 저장소 — 각 세션의 턴 수를 추적
// 실제 서버에서는 DB에 저장하겠지만, 여기서는 메모리에 임시 저장
// ─────────────────────────────────────────────────────────────────────────────
const sessions = {}

// ─────────────────────────────────────────────────────────────────────────────
// 질문 데이터 — 싱크대 악취 시나리오
// ─────────────────────────────────────────────────────────────────────────────
const QUESTIONS = [
  {
    question: '어떤 종류의 냄새인가요?',
    options: [
      { id: 'rotten', label: '썩은 음식 냄새' },
      { id: 'sewage', label: '하수구 냄새' },
      { id: 'moldy', label: '곰팡이 냄새' },
    ],
  },
  {
    question: '냄새가 가장 심한 곳은 어디인가요?',
    options: [
      { id: 'drain', label: '배수구 근처' },
      { id: 'cabinet', label: '싱크대 아래 수납장' },
      { id: 'sponge', label: '수세미/행주 근처' },
    ],
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// 가설 데이터 — 진단 결과
// confidence는 반드시 문자열 라벨만 사용 (숫자 금지)
// ─────────────────────────────────────────────────────────────────────────────
const HYPOTHESES = [
  {
    id: 'trap_dry',
    cause: '배수구 트랩 건조',
    confidence: 'most_likely',
    evidence: '하수구 냄새 + 배수구 근처 = 트랩이 말라서 가스가 올라옴',
  },
  {
    id: 'food_waste',
    cause: '음식물 찌꺼기 부패',
    confidence: 'possible',
    evidence: '배수구에 낀 음식물이 썩으면서 악취 발생',
  },
  {
    id: 'sponge_bacteria',
    cause: '수세미/행주 세균 번식',
    confidence: 'unlikely',
    evidence: '젖은 수세미에 세균이 번식하면 악취가 날 수 있음',
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// 유틸리티 — 비동기 딜레이
// 실제 네트워크 지연을 흉내내기 위해 300ms 대기
// ─────────────────────────────────────────────────────────────────────────────
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ─────────────────────────────────────────────────────────────────────────────
// 유틸리티 — 랜덤 세션 ID 생성
// ─────────────────────────────────────────────────────────────────────────────
function generateSessionId() {
  return 'session_' + Math.random().toString(36).substring(2, 9)
}

// ═══════════════════════════════════════════════════════════════════════════
// startSession — 새 진단 세션 시작
//
// 반환값:
// {
//   sessionId: string,
//   needMoreInfo: {
//     question: string,
//     options: Array<{ id: string, label: string }>
//   }
// }
// ═══════════════════════════════════════════════════════════════════════════
export async function startSession() {
  // 300ms 지연 — 네트워크 호출처럼 보이게
  await delay(300)

  // 새 세션 ID 생성
  const sessionId = generateSessionId()

  // 세션 상태 초기화 — 턴 수를 0으로 시작
  sessions[sessionId] = { turnCount: 0 }

  // 첫 번째 질문 반환
  return {
    sessionId,
    needMoreInfo: QUESTIONS[0],
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// turn — 사용자 응답을 받고 다음 단계 결정
//
// 매개변수:
// - sessionId: 세션 식별자
// - action: 사용자가 선택한 옵션 ID (예: "drain")
//
// 반환값 (턴 수에 따라 다름):
// - 턴 0~1: { needMoreInfo: { question, options } }
// - 턴 2+:  { hypotheses: [{ id, cause, confidence, evidence }] }
// ═══════════════════════════════════════════════════════════════════════════
export async function turn(sessionId, action) {
  // 300ms 지연
  await delay(300)

  // 세션 가져오기 (없으면 기본값)
  const session = sessions[sessionId] || { turnCount: 0 }

  // 턴 수 증가
  session.turnCount += 1
  sessions[sessionId] = session

  // 턴 수에 따라 분기
  // 턴 1: 두 번째 질문 (아직 정보가 더 필요함)
  if (session.turnCount === 1) {
    return {
      needMoreInfo: QUESTIONS[1],
    }
  }

  // 턴 2 이상: 가설 제시 (충분한 정보 수집됨)
  return {
    hypotheses: HYPOTHESES,
  }
}
