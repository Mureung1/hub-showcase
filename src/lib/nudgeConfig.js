// 넛지 엔진 관련 설정값 모음.
// 매직넘버를 컴포넌트 곳곳에 박지 않고 여기 한 곳에서만 관리한다.
import { getUrgencyBucket, getLevelDelayMinutes } from "./nudgeInterval.js";

// 대기중(waiting) 할일의 시작 예정 시각 경과 여부를 확인하는 간격(ms).
// 도달 즉시 active로 전환하기 위한 가벼운 폴링 주기라 tick보다 짧게 둔다.
export const ACTIVATION_POLL_MS = 3000;

// #44: 데모/발표용 레벨별 지연(ms). nudgeInterval.ts의 실제 서비스 값(분 단위)에
// 배율을 곱한 게 아니라, 시연 가능한 속도로 손으로 정한 별도 표다 — 실제 값을
// 그대로 축소하면 그 사이의 비율 관계까지 그대로 옮겨야 해서 짧은 유형이 D-day
// 임박 시 비현실적으로 짧아지는 문제가 있었다(#44 논의). 긴급도 구간별 상대적
// 압축 관계(far > soon > close > overdue)만 유지하고 절대값은 데모에 맞게 새로 잡았다.
// 정책 근거가 아직 없는 MVP 초기값 — 시연해보고 조정 가능.
export const DEMO_LEVEL_DELAY_MS = {
  far: { 2: 15000, 3: 25000, 4: 40000 },
  soon: { 2: 10000, 3: 18000, 4: 28000 },
  close: { 2: 6000, 3: 12000, 4: 18000 },
  overdue: { 2: 3000, 3: 6000, 4: 10000 },
};

// 알림 간격 모드 결정 — 우선순위:
//   1. 테스트 환경(vitest가 자동 설정하는 MODE==="test")은 항상 demo로 고정한다.
//      기존 HomePage.test.jsx가 advance(3000) 등 데모 ms 값에 그대로 결합돼 있어
//      이 규칙이 깨지면 그 테스트들이 전부 실패한다.
//   2. VITE_NUDGE_MODE가 정확히 "demo"|"production"이면 그 값을 그대로 쓴다
//      (챌린지 시연 배포에서 VITE_NUDGE_MODE=demo로 초 단위 속도를 강제할 수 있음).
//   3. 값이 있는데 "demo"/"production"이 아니면 경고만 남기고 무시한다(3번으로 폴백).
//   4. 환경변수가 없으면 빌드 모드로 안전하게 기본값을 정한다 — production 빌드에서
//      배포 환경변수를 깜빡해도 분 단위(느린) 간격이 나가야지, 초 단위가 나가면 안 된다.
export function resolveNudgeMode() {
  if (import.meta.env.MODE === "test") return "demo";

  const raw = import.meta.env.VITE_NUDGE_MODE;
  if (raw === "demo" || raw === "production") return raw;
  if (typeof raw === "string" && raw.length > 0) {
    console.warn(
      `[nudgeConfig] 알 수 없는 VITE_NUDGE_MODE="${raw}" — 무시하고 환경 기본값을 사용합니다.`,
    );
  }

  return import.meta.env.PROD ? "production" : "demo";
}

// HomePage.jsx가 호출하는 진입점. currentLevel 기준 다음으로 도달할 레벨(최대 4,
// Lv4는 계속 Lv4 지연을 재사용 — 휴지기 없음, 기존 동작 유지)까지의 지연(ms)을
// 반환한다. 레벨 1(활성화 직후 첫 체크)은 어느 모드에서든 대기 없이 즉시 발생한다.
// 데모/프로덕션 모두 이 함수 하나로 처리하므로(과거 getDemoNudgeDelayMs) 이름을
// 그에 맞게 바꿨다.
export function getNudgeDelayMs(currentLevel, deadline, now = new Date()) {
  const nextLevel = Math.min(currentLevel + 1, 4);
  if (nextLevel === 1) return 0;
  const bucket = getUrgencyBucket(deadline, now);

  if (resolveNudgeMode() === "production") {
    return getLevelDelayMinutes(nextLevel, bucket) * 60_000;
  }
  return DEMO_LEVEL_DELAY_MS[bucket][nextLevel];
}
