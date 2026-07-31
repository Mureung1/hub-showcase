import type {
  AgendaDisagreementType,
  AgendaKind,
  AgendaResolutionReason,
  AgendaStance,
  AgendaStatus,
  AiProvider,
  SourceRef,
} from "@decision-log/shared";

import type { AgendaDraft, DraftSourceRef } from "../agendas.types.js";
import { fnv1a } from "./pickPivot.js";

/**
 * 단계 7 · 쟁점 마감 (SPEC-AI-002 §9, 코드).
 *
 * **모든 쟁점이 여기를 지난다**(§7.6) — 단계 6을 탄 것도, 참여 1개라 건너뛴 것도,
 * 판정에 실패한 것도 전부. §9.2 규칙표를 **한 곳에서만** 구현하기 위해서다.
 * 두 군데로 갈라지면 반드시 어긋난다.
 *
 * Manager는 `selectedContent`를 만들지 않는다. 전부 코드가 채운다(§9).
 */

/**
 * §8.4 — 차이 유형 → 쟁점 성격. **판단이 아니라 계산이다.**
 *
 * 충돌로 볼 유형 목록은 설정값이며(결정 6, 기본 `["main_answer"]`), 판정 시점의 값을
 * `manager_meta.conflictTypes`에 스탬프해 "이 Agenda가 어떤 기준으로 판정됐는가"를
 * 재현할 수 있게 한다(결정 4·6). 설정을 바꿔도 **이미 저장된 Agenda는 불변**이다(AC4).
 */
export function mapDisagreementToKind(
  disagreementType: AgendaDisagreementType,
  conflictTypes: readonly string[],
): AgendaKind {
  return conflictTypes.includes(disagreementType) ? "conflict" : "consensus";
}

/** 단계 6·7을 거치기 직전의 쟁점 상태. `kind`가 정해지면 마감 규칙이 결정된다. */
export interface JudgedDraft {
  draft: AgendaDraft;
  kind: AgendaKind;
  stances: AgendaStance[];
  /** 판정 실패(fallback)면 null — "판정하지 못함"을 뜻한다(§2.5). */
  disagreementType: AgendaDisagreementType | null;
  confidence: number | null;
  /** fallback stance로 마감했는가. `judgeFailRate` 지표용(§14.2). */
  judgeFailed: boolean;
}

/** 저장 직전 형태. §9.2 규칙표의 결과가 전부 채워져 있다. */
export interface FinalizedAgenda extends JudgedDraft {
  status: Extract<AgendaStatus, "passed" | "conflicted">;
  resolutionReason: AgendaResolutionReason | null;
  selectedContent: string | null;
  selectedSourceRef: SourceRef | null;
}

/**
 * §9.1 — 내용 섹션 선택 규칙.
 * 1순위 pivot 섹션 → 2순위 최장 섹션 → 3순위 해시(동률일 때 결정론적으로 하나).
 * `Math.random()`을 쓰지 않는다(AC1).
 *
 * ⚠️ **내용이 빈 섹션은 후보에서 제외한다.** `StructuredContent`의 `content`는 계약상
 * 빈 문자열이 허용되므로(`z.string()`), 걸러내지 않으면 pivot 섹션이 비었다는 이유만으로
 * 아래 assert가 터져 **다른 provider에 멀쩡한 근거가 있는데도** 쟁점 전체가 실패한다.
 * "pivot 우선"은 쓸 수 있는 섹션들 사이의 우선순위지, 빈 섹션을 고르라는 뜻이 아니다.
 */
export function pickContentSection(
  refs: DraftSourceRef[],
  pivotProvider: AiProvider,
  questionId: string,
  agendaId: string,
): DraftSourceRef | null {
  const usable = refs.filter((ref) => ref.content.trim().length > 0);
  if (usable.length === 0) return null;

  const pivotSection = usable.find((ref) => ref.provider === pivotProvider);
  if (pivotSection) return pivotSection;

  const maxLen = Math.max(...usable.map((ref) => ref.content.length));
  const longest = usable.filter((ref) => ref.content.length === maxLen);
  if (longest.length === 1) return longest[0] ?? null;

  const index = fnv1a(questionId + agendaId) % longest.length;
  return longest[index] ?? null;
}

/**
 * §9.2 전체 규칙표 — Manager 경로(자동 통과·충돌 대기)만 여기서 다룬다.
 * 사용자 판단 행(`user_accepted*`·`user_composed*`·`user_rejected*`)은 PATCH가 소유한다(§12.4).
 *
 * | 상황 | status | resolutionReason | selectedContent | selectedSourceRef |
 * |---|---|---|---|---|
 * | 합의 + pivot 참여 | passed | auto_consensus | pivot 섹션 content | pivot 섹션 참조 |
 * | 합의 + pivot 없음 | passed | auto_consensus | 최장 섹션 content | 그 섹션 참조 |
 * | 단일 소스 | passed | auto_single_source | 그 섹션 content | 그 섹션 참조 |
 * | 충돌 (미판단) | conflicted | null | null | null |
 */
export function finalizeAgenda(
  judged: JudgedDraft,
  pivotProvider: AiProvider,
  questionId: string,
): FinalizedAgenda {
  if (judged.kind === "conflict") {
    // 사용자가 판단할 때까지 비워둔다. CHECK(§9.3)도 이 상태에서 참조를 금지한다.
    return {
      ...judged,
      status: "conflicted",
      resolutionReason: null,
      selectedContent: null,
      selectedSourceRef: null,
    };
  }

  const section = pickContentSection(
    judged.draft.sourceRefs,
    pivotProvider,
    questionId,
    judged.draft.id,
  );

  // §11-5: passed인데 selectedContent가 비는 경우는 코드가 채우므로 발생 불가.
  // 그럼에도 비면 계약(passed ⇒ selectedContent NOT NULL)과 DB CHECK를 동시에 어기므로,
  // 조용히 넘기지 않고 즉시 드러낸다.
  if (!section || section.content.trim().length === 0) {
    throw new Error(
      `단계 7 마감 실패 — 자동 통과 쟁점(${judged.draft.id})에 채울 내용 섹션이 없습니다.`,
    );
  }

  return {
    ...judged,
    status: "passed",
    resolutionReason:
      judged.kind === "single_source" ? "auto_single_source" : "auto_consensus",
    selectedContent: section.content,
    selectedSourceRef: {
      sourceAnswerId: section.sourceAnswerId,
      sectionId: section.sectionId,
    },
  };
}
