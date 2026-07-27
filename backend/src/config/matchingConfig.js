// AI 매칭 기능의 모든 튜너블을 모아두는 단일 설정 모듈.
// 서비스 코드는 이 파일 하나만 import한다 — 감정표·동의어 사전·위기 안내문도 여기서 재-export.
import synonymsData from './synonyms.json' with { type: 'json' }

export { EMOTIONS, EMOTION_ADJACENCY, isValidEmotion, areAdjacent } from './emotions.js'
export { CRISIS_SUPPORT_MESSAGE, CRISIS_RESOURCES } from './crisisResources.js'

export const SYNONYMS = synonymsData

// 프롬프트 버전은 프롬프트 텍스트와 같은 파일(src/prompts/)에 두고 여기서는 재-export만 한다.
export { TAG_PROMPT_VERSION } from '../prompts/tagPrompt.js'
export { MATCH_PROMPT_VERSION } from '../prompts/matchPrompt.js'

// `Number(env) || 기본값` 방식은 env를 "0"으로 명시해도 0이 falsy라서 기본값으로 되돌아가버리는
// 버그가 있다. SOURCE_READY_DELAY_HOURS=0(테스트용 즉시 매칭) 같은 경우를 정확히 지원하려면
// "env가 아예 없을 때만" 기본값을 쓰도록 구분해야 한다.
function envNumber(name, fallback) {
  const raw = process.env[name]
  return raw !== undefined && raw !== '' ? Number(raw) : fallback
}

// --- AI 호출 관련 (벤더: Gemini) ---
// 안전한 기본값: .env에 AI_MOCK을 아예 안 써도(설정을 깜빡해도) mock으로 동작한다.
// 실제 Gemini를 부르려면 .env에 명시적으로 AI_MOCK=false를 적어야 한다 — 그래야
// "설정을 깜빡했더니 없는 라이브러리를 부르다 조용히 실패"하는 사고를 구조적으로 막는다.
export const AI_MOCK = process.env.AI_MOCK !== 'false'
// gemini-flash-lite-latest: Google이 "현재 가장 최신인 Flash-Lite 모델"을 자동으로 가리키는
// 별칭이다. 실제 API로 직접 테스트해서 확인함(2026-07-27) — 특정 버전(예: gemini-2.5-flash-lite)은
// 이미 신규 사용자에게 지원 종료된 상태였다. 토큰당 비용이 가장 낮은 등급이라 태깅·선택처럼
// 단순 분류 작업에 적합하고, 별칭이라 모델이 또 바뀌어도 자동으로 따라간다.
export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-flash-lite-latest'
// Gemini 무료 티어의 실제 분당/일당 요청 한도는 모델·시점에 따라 바뀌므로,
// Google AI Studio에서 현재 한도를 확인하고 이 값을 맞춰서 조정한다.
export const DAILY_CALL_CAP = envNumber('DAILY_CALL_CAP', 200)
export const MAX_CONCURRENT_AI_CALLS = 3

// --- 1단계 후보 축소 ---
// 검증 스크립트(scripts/validateMatching.js)에서 코드 수정 없이 값을 바꿔가며 재측정할 수
// 있도록 env로 오버라이드 가능하게 열어둔다. 평소엔 기본값을 그대로 쓰면 된다.
export const CANDIDATE_LIMIT = envNumber('CANDIDATE_LIMIT', 30)
export const MIN_CANDIDATES_BEFORE_RELAX = envNumber('MIN_CANDIDATES_BEFORE_RELAX', 5)
export const CONTENT_SCORE_WEIGHTS = {
  secondaryEmotion: envNumber('WEIGHT_SECONDARY_EMOTION', 2),
  keyword: envNumber('WEIGHT_KEYWORD', 1),
}

// --- 노출·캐시 ---
// 초기엔 낮게 둬서 사실상 1:1 소진처럼 동작시키고, 데이터가 쌓이면 값을 올린다.
export const EXPOSURE_CAP_N = envNumber('EXPOSURE_CAP_N', 3)
export const CACHE_TTL_DAYS = envNumber('CACHE_TTL_DAYS', 7)

// --- 24h/8h 타이밍 (lazy 게이트 판정용) ---
// 개발·시연 중엔 .env에서 SOURCE_READY_DELAY_HOURS=0으로 두면 편지를 보내자마자 바로
// 매칭이 가능해진다(24시간 기다릴 필요 없음). 배포 전엔 반드시 24로 되돌려야 한다.
export const SOURCE_READY_DELAY_HOURS = envNumber('SOURCE_READY_DELAY_HOURS', 24)
export const REPLY_DELIVERY_HOURS = 8 // 답장 기능(T9) 구현 전까지는 메타데이터로만 존재

// --- 사용자별 레이트리밋 ---
export const RECOMMENDATION_PER_HOUR = 10
export const REFRESH_PER_DAY = 3

// --- 태깅 재처리 ---
export const MAX_TAGGING_ATTEMPTS = 3
export const REPROCESS_CONCURRENCY = 3
export const STALE_PENDING_MINUTES = 30
