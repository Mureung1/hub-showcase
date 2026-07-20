// 거래 상태값 — CLAUDE.md 핵심 도메인 규칙: 모집중 → 진행중 → 완료대기 → 완료 (건너뛰기 금지)
// ⚠️ schema_v1.sql의 실제 enum 값과 다르면 STATUS의 value만 여기서 고치면 됨 (다른 파일 수정 불필요)

export const STATUS = {
    RECRUITING: "모집중",
    IN_PROGRESS: "진행중",
    PENDING_DONE: "완료대기",
    DONE: "완료",
};

// StepBar 단계 라벨 (기획서 ④ 화면 · 디자인 스킬 5절: 4단계 고정)
export const STEPS = ["요청등록", "매칭", "완료대기", "완료·지급"];

// 각 상태에서 "몇 번째 단계까지 완료"인지
export const DONE_COUNT = {
    [STATUS.RECRUITING]: 1, // 요청등록 완료, 매칭 대기
    [STATUS.IN_PROGRESS]: 2, // 매칭 완료, 작업 진행 중
    [STATUS.PENDING_DONE]: 3, // 결과물 제출됨, 양측 확인 대기
    [STATUS.DONE]: 4, // 완료·지급
};