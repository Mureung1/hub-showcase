import type { AgendaDisagreementType, AgendaRecheckResult } from "@decision-log/shared";
import type { ComparableSection } from "./conflictComparator.port.js";

/**
 * AgendaRechecker 포트 (SPEC-AI-002 §10 · ADR-005).
 *
 * **ConflictComparator와 분리한 이유**: 재검토는 §10.1이 규정한 대로 "판정을 뒤집는
 * 장치"가 아니라 **"사용자가 결정하도록 돕는 장치"** 다. 입력에 1차 판정 결과와
 * 사용자의 요청이 들어가고(§10.2), 출력이 `stances`가 아니라 `response`+`citations`이며,
 * `disagreementType`을 덮어쓰지 않고 `revisedType`을 따로 낸다(§10.4).
 * 같은 포트에 넣으면 두 관심사가 한 인터페이스에서 갈라진다.
 *
 * ⚠️ ADR-005는 포트를 5개로 정의했고 재검토는 그 목록에 없다 — 6번째 포트 등재가
 * 필요한지는 문서 개정 판단 사항이다.
 */

export interface RecheckInput {
  /** 원 질문. 비신뢰 입력이므로 구분 블록에 넣는다(§16.1). */
  question: string;
  /** 쟁점 제목. */
  agendaTitle: string;
  /** 1차 판정 유형. 사용자는 이것을 보고 이의를 제기했다(§10.2). */
  disagreementType: AgendaDisagreementType | null;
  /** 1차 판정의 provider별 입장 요약 — 맥락으로만 넣고 갱신하지 않는다(§10.5). */
  stanceSummary: string;
  /** 사용자의 요청. **500자로 절단해서 넘긴다**(§16.2) — 절단은 Service가 한다. */
  recheckRequest: string;
  /** 이 쟁점의 섹션 원문. `citations.sectionId` enum을 런타임 생성하는 데도 쓴다. */
  sections: ComparableSection[];
}

export interface RecheckCallResult {
  /** 검증 **전** 원출력. `citations`의 §11-8 검증은 pipeline이 한다. */
  output: AgendaRecheckResult;
  outputTokens: number | null;
}

export interface AgendaRechecker {
  readonly version: string;
  /** 재검토 1회 (Manager 호출 4, 조건부). */
  recheck(input: RecheckInput): Promise<RecheckCallResult>;
}
