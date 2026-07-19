// #19(microtaskTemplates.js)의 데이터를 조회해 특정 task에 맞는 마이크로태스크
// 문구 하나를 반환하는 순수 함수. Lv2/Lv3 넛지 메시지가 이 함수를 호출한다.
import {
  MICROTASK_TEMPLATES,
  CUSTOM_FALLBACK_MICROTASKS,
} from "./microtaskTemplates.js";

export interface GetMicrotaskInput {
  type: string;
  reason: string;
  // reason이 "custom"일 때의 자유 입력 텍스트. plan.md 설계상 Lv2 자유 텍스트는
  // 공감 응답용이지 로직에는 반영하지 않으므로, 여기서도 문구 선택에는 쓰지 않는다
  // (호출부 시그니처 일관성을 위해 받아만 둔다).
  customText?: string;
}

// 같은 조합이라도 매번 같은 문구만 나오면 반복되는 개입처럼 느껴지므로
// 배열에서 무작위로 하나를 고른다 (첫 번째 고정 대신).
function pickRandom(list: string[]): string {
  return list[Math.floor(Math.random() * list.length)];
}

// 예상치 못한 조합(오타, 신규 유형 미등록 등)에서도 절대 undefined/빈 값을
// 반환하지 않도록 CUSTOM_FALLBACK_MICROTASKS를 최종 폴백으로 둔다.
export function getMicrotask({ type, reason }: GetMicrotaskInput): string {
  if (reason === "custom") {
    return pickRandom(CUSTOM_FALLBACK_MICROTASKS);
  }

  // MICROTASK_TEMPLATES는 .js 객체 리터럴이라 TS가 고정 키의 리터럴 타입으로
  // 추론한다 — 실행 시 임의의 type/reason 문자열로 조회해야 하므로 인덱스
  // 시그니처가 있는 타입으로 명시적으로 단언한다.
  const templates = MICROTASK_TEMPLATES as Record<
    string,
    Record<string, string[]> | undefined
  >;
  const candidates = templates[type]?.[reason];

  if (candidates && candidates.length > 0) {
    return pickRandom(candidates);
  }

  return pickRandom(CUSTOM_FALLBACK_MICROTASKS);
}
