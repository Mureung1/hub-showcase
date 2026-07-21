// #25 Lv3 "기억 기반 개입" 로직. 세션 내(= 지금 화면에 로드된 tasks) 완료 이력 중
// 현재 할일과 같은 회피 이유로 성공한 적이 있으면, 그때와 같은 유형·이유의
// 마이크로태스크를 다시 제안한다("이때 이렇게 해서 성공했었죠, 다시 해볼까요?").
//
// 왜 "재생성"인가: 화면에 떴던 마이크로태스크 문구 자체는 어디에도 저장되지 않는다
// (getMicrotask가 매번 무작위로 만들고, Task/TaskEvent 어디에도 기록이 없음).
// 그래서 "그때의 문구"를 문자 그대로 복원할 수는 없고, 매칭된 과거 완료 task의
// type+reason으로 같은 종류의 마이크로태스크를 다시 생성해 재제안한다.
// 실제로 떴던 문구를 정확히 재현하려면 발송 시점 영속화가 필요한데, 그건 세션 범위를
// 넘어서는 확장(장기 히스토리 기반 넛지)의 몫으로 둔다.
//
// UI 연동(#26)과 분리된 순수 함수다 — 완료 task 목록을 인자로 받고 자체 조회는 하지 않는다.
import { getMicrotask } from "./microtask.js";

// 매칭 판정에 필요한 최소 형태만 받는다(HomePage의 task 객체가 그대로 들어맞음).
export interface CompletedTaskLike {
  id: string;
  title: string;
  type: string;
  status: string;
  reason: string | null;
  customReasonText: string | null;
  // 같은 이유로 성공한 사례가 여럿일 때 가장 최근 것을 고르기 위한 정렬 키(있으면 사용).
  createdAt?: string | Date;
}

export interface CurrentTaskLike {
  id?: string;
  reason: string | null;
  customReasonText?: string | null;
}

export interface MemoryNudge {
  // 재생성한(=과거와 같은 유형·이유의) 마이크로태스크 문구.
  microtask: string;
  // #26이 "지난번 ○○도 같은 이유로 미뤘지만 해냈어요" 문구를 만들 때 참조할 근거 task.
  source: { id: string; title: string; type: string };
}

// custom 이유는 값이 전부 "custom"이라 그대로 비교하면 서로 다른 사유("놀고 싶어서" vs
// "몸이 아파서")도 같은 이유로 오인된다. 실제 사유 텍스트를 정규화해 비교하기 위한 헬퍼.
function normalize(text: string | null | undefined): string {
  return (text ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

// reason 값이 같으면 매칭. 단 custom은 실제 사유 텍스트까지 같아야 하고, 텍스트가 비어
// 있으면(무엇으로 성공했는지 알 수 없으므로) 매칭하지 않는다.
function reasonMatches(current: CurrentTaskLike, done: CompletedTaskLike): boolean {
  if (!current.reason || current.reason !== done.reason) return false;
  if (current.reason === "custom") {
    const a = normalize(current.customReasonText);
    return a !== "" && a === normalize(done.customReasonText);
  }
  return true;
}

function toTime(value: string | Date | undefined): number {
  if (!value) return 0;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? 0 : t;
}

// 세션 내 완료 이력에서 같은 회피 이유로 성공한 사례를 찾아 마이크로태스크를 재제안한다.
// 매칭이 없으면 null(→ 호출부는 Lv3 기본 문구로 폴백).
//
// generate는 테스트에서 무작위성을 제거하기 위해 주입 가능하게 뒀다(기본값은 실제 생성기).
export function getMemoryNudge(
  currentTask: CurrentTaskLike,
  completedTasks: CompletedTaskLike[],
  generate: (input: { type: string; reason: string }) => string = getMicrotask,
): MemoryNudge | null {
  // reason이 없으면 매칭 기준 자체가 없다.
  if (!currentTask.reason) return null;

  const matches = completedTasks.filter(
    (t) =>
      t.status === "done" &&
      t.id !== currentTask.id && // 자기 자신은 이력이 아니다
      reasonMatches(currentTask, t),
  );
  if (matches.length === 0) return null;

  // 여럿이면 가장 최근에 만든 성공 사례를 재제안한다(가장 관련성 높은 기억).
  const source = matches.reduce((latest, t) =>
    toTime(t.createdAt) > toTime(latest.createdAt) ? t : latest,
  );

  const microtask = generate({ type: source.type, reason: currentTask.reason });
  return {
    microtask,
    source: { id: source.id, title: source.title, type: source.type },
  };
}
