/**
 * 매매 기록 구조화 입력(0006_trade_fields_and_usage.sql) 후보 상수.
 * 원문: docs/prd.md §2 "매매 기록 구조화 입력 (0006, 프론트 상수)".
 *
 * TradeForm(기록 입력)뿐 아니라 히스토리 카드(WP-E)·복기 코칭 에이전트 화면(WP-F)에서도
 * 동일 라벨/색 매핑이 필요해 컴포넌트가 아닌 lib 모듈로 둔다.
 */

/** 셋업 태그 후보 (다중선택, DB는 free text[] — 여기 목록은 UI 후보일 뿐 강제 enum 아님) */
export const SETUP_TAGS = ['돌파', '눌림목', '추세추종', '급등추격', '낙폭매수', '실적', '뉴스/테마', '배당/가치']

/** 감정 상태 후보 (단일선택, DB enum check 제약과 1:1 동기화) */
export const EMOTIONS = [
  { value: 'confident', label: '확신' },
  { value: 'anxious', label: '불안' },
  { value: 'impulsive', label: '조급' },
  { value: 'fomo', label: 'FOMO' },
  { value: 'calm', label: '담담' },
]

export const EMOTION_LABEL = Object.fromEntries(EMOTIONS.map((e) => [e.value, e.label]))

/**
 * 예정 보유 기간 후보 (단일선택, DB enum check 제약과 1:1 동기화 — 0007_plan_fields_and_mirror_review.sql)
 * "계획" 필드 중 하나: AI 복기의 거울 프레임(계획 대비 실행)이 참조한다.
 */
export const HORIZONS = [
  { value: 'scalp', label: '단타' },
  { value: 'swing', label: '스윙' },
  { value: 'mid', label: '중기' },
  { value: 'long', label: '장기' },
]

export const HORIZON_LABEL = Object.fromEntries(HORIZONS.map((h) => [h.value, h.label]))
