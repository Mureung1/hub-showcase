import type { AgendaStance, AiProvider } from "@decision-log/shared";

import type { CompareOutput, DraftSourceRef } from "../agendas.types.js";
import { firstSentence } from "./postProcess.js";

/**
 * §11 근거 검증 (코드).
 *
 * "근거 없는 비교 결과를 정상 데이터로 저장하지 않는다"를 선언이 아니라 코드로 강제한다.
 * 저장 **전에** 통과해야 하며, 폐기율은 지표로 기록한다(§14.2 `quoteRejectRate`).
 *
 * §11 8개 항목 중 이 단계에서 실제로 판정하는 것은 2·3·4번이다. 나머지는 다음과 같이
 * 구조적으로 보장되거나 다른 단계에 속한다 — 우회가 아니라 발생 지점이 다르다.
 *
 * | # | 항목 | 처리 |
 * |---|---|---|
 * | 1 | `sectionId` 실존 | 단계 3·5가 이미 폐기(§7.1-3). stance의 `sourceRefs`는 LLM이 아니라 **코드가** 배정 섹션에서 만든다 |
 * | 2 | `quotes`가 원문 부분 문자열인가 | **이 파일** — 실패한 quote만 폐기, 0개가 되면 stance 폐기 |
 * | 3 | `quotes`가 그 stance provider 섹션에서 왔는가 | **이 파일** — 그 provider 섹션만 대조한다 |
 * | 4 | stance 0개 쟁점 | **이 파일**이 빈 배열을 돌려주고 호출부가 쟁점을 폐기한다 |
 * | 5 | `passed`인데 `selectedContent`가 비었나 | 단계 7이 코드로 채우므로 발생 불가 — `finalize.ts`가 assert |
 * | 6 | 재배정 섹션이 새 쟁점에도 있나 | 단계 5가 재배정 우선으로 제거(§7.1-1) |
 * | 7 | 참여 provider 수 LLM 보고 | 애초에 묻지 않는다. 코드가 센다(§7.2·§8.8) |
 * | 8 | `citations`의 `quote` | 재검토 산출물 — T-019.4 |
 */

/**
 * 공백 정규화. §11의 `normalized` 그대로다.
 *
 * 소문자화는 하지 않는다 — §11 본문이 "허용"이라고만 했고 규범 코드에는 없으며,
 * 한국어에는 효과가 없는 반면 검증만 느슨해진다. **단어의 추가·삭제는 거부된다.**
 */
export function normalizeForGrounding(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** quote가 주어진 섹션들 중 하나의 원문에 실제로 들어 있는가(§11-2). */
function isGroundedIn(quote: string, sections: DraftSourceRef[]): boolean {
  const needle = normalizeForGrounding(quote);
  if (needle.length === 0) return false;
  return sections.some((section) =>
    normalizeForGrounding(section.content).includes(needle),
  );
}

/** 폐기 사유 — `quoteRejectRate`가 임계를 넘었을 때 원인을 가르는 관측값이다(§14.2). */
export type QuoteRejectReason =
  | "not_in_source" // 원문 어디에도 없다 — 날조
  | "other_provider" // 다른 AI의 원문에서 가져왔다(§11-3)
  | "not_in_this_agenda"; // 그 AI의 원문이지만 이 쟁점에 배정된 섹션이 아니다

export interface RejectedQuote {
  provider: AiProvider;
  quote: string;
  reason: QuoteRejectReason;
}

export interface GroundingResult {
  /** 검증을 통과한 stance. 비어 있으면 쟁점을 폐기해야 한다(§11-4). */
  stances: AgendaStance[];
  /** 지표용 — 검사한 quote 총수 */
  quotesTotal: number;
  /** 지표용 — 폐기한 quote 수 (`quoteRejectRate` 분자) */
  quotesRejected: number;
  /** 폐기된 quote의 내역. 원인 진단용이며 저장하지 않는다(§16.3). */
  rejected: RejectedQuote[];
  /**
   * quote 검증 **이전에** 통째로 버려진 stance의 사유별 건수.
   *
   * 이것이 없으면 `agendaDropRate`가 튀었을 때 원인을 가릴 수 없다 — quote가 한 건도
   * 폐기되지 않았는데(`quoteRejectRate` 0%) 쟁점이 폐기되는 조합이 실제로 나오고,
   * 그때 남는 관측값이 하나도 없기 때문이다. §11은 폐기율을 지표로 기록하라고 요구한다.
   */
  stancesDiscarded: Record<StanceDiscardReason, number>;
}

/**
 * stance가 결과에 남지 않게 되는 사유.
 *
 * ⚠️ **전부 "스키마 위반"이 아니다.** `empty_quotes`는 오히려 **스키마가 허용하는** 경우다 —
 * `CompareStanceSchema.quotes`와 LLM에 보내는 JSON Schema 모두 최소 개수를 요구하지 않는다.
 * 이 구분을 흐린 주석("전부 LLM이 스키마를 어긴 경우다")이 실제로 이 사유를 빠뜨리게 만들었다.
 * 스키마가 허용하는 경로일수록 관측이 더 필요하다 — 아무도 오류라고 알려주지 않기 때문이다.
 */
export type StanceDiscardReason =
  | "empty_output" // LLM이 stances를 아예 비워 보냈다
  | "empty_quotes" // quotes가 빈 배열이라 검증에 도달하지도 못했다 — 스키마 허용, 지표 공백의 원인
  | "not_participant" // 이 쟁점에 참여하지 않은 provider의 입장을 만들어냈다(§16.2-3)
  | "duplicate_provider"; // 같은 provider를 두 번 냈다 — 인용은 합치고 건수만 센다(§8.7)

/**
 * Manager 판정 출력(§8.6)을 검증된 `AgendaStance[]`로 만든다.
 *
 * - stance의 `sourceRefs`는 **LLM 출력을 쓰지 않고** 그 provider에 배정된 섹션 전부로
 *   코드가 구성한다(§8.7 "sourceRefs에는 그 provider의 모든 관련 섹션을 기록한다").
 * - provider당 stance는 1개다(§8.7). LLM이 같은 provider를 여러 번 내면 인용을 합친다.
 * - 참여자가 아닌 provider의 stance는 통째로 폐기한다(§16.2-3의 서버 측 재확인).
 */
export function groundStances(
  output: CompareOutput,
  refs: DraftSourceRef[],
  participants: AiProvider[],
): GroundingResult {
  const allowed = new Set<AiProvider>(participants);
  const refsByProvider = new Map<AiProvider, DraftSourceRef[]>();
  for (const ref of refs) {
    const list = refsByProvider.get(ref.provider) ?? [];
    list.push(ref);
    refsByProvider.set(ref.provider, list);
  }

  const stancesDiscarded: Record<StanceDiscardReason, number> = {
    empty_output: output.stances.length === 0 ? 1 : 0,
    empty_quotes: 0,
    not_participant: 0,
    duplicate_provider: 0,
  };

  // provider당 하나로 합친다. 입력 순서를 유지해 결정론적으로 둔다(AC1).
  const merged = new Map<AiProvider, { text: string; quotes: string[] }>();
  for (const stance of output.stances) {
    if (!allowed.has(stance.provider)) {
      // 참여하지 않은 AI의 입장은 만들 수 없다. 조용히 버리지 않고 센다.
      stancesDiscarded.not_participant += 1;
      continue;
    }
    const existing = merged.get(stance.provider);
    if (existing) {
      stancesDiscarded.duplicate_provider += 1;
      existing.quotes.push(...stance.quotes);
      continue;
    }
    merged.set(stance.provider, {
      text: stance.text,
      quotes: [...stance.quotes],
    });
  }

  let quotesTotal = 0;
  let quotesRejected = 0;
  const rejected: RejectedQuote[] = [];
  const stances: AgendaStance[] = [];

  for (const [provider, value] of merged) {
    const providerRefs = refsByProvider.get(provider) ?? [];
    const seen = new Set<string>();
    const kept: string[] = [];

    for (const quote of value.quotes) {
      quotesTotal += 1;
      // §11-2·3: 그 provider 자신의 섹션 원문에 있는 문장만 남는다.
      if (!isGroundedIn(quote, providerRefs)) {
        quotesRejected += 1;
        // 폐기 판정은 동일하고, 사유만 갈라 기록한다(진단용).
        const inOtherProvider = refs.some(
          (ref) =>
            ref.provider !== provider &&
            normalizeForGrounding(ref.content).includes(
              normalizeForGrounding(quote),
            ),
        );
        rejected.push({
          provider,
          quote,
          reason: inOtherProvider ? "other_provider" : "not_in_source",
        });
        continue;
      }
      const key = normalizeForGrounding(quote);
      if (seen.has(key)) continue; // 같은 문장을 두 번 세지 않는다
      seen.add(key);
      kept.push(quote);
    }

    // §11-2: quotes가 0개가 되면 stance를 폐기한다.
    //
    // 여기 오는 두 경로를 갈라 센다. 폐기 결과는 같지만 원인이 정반대다.
    //  - value.quotes 가 처음부터 빈 배열   → `empty_quotes`. quotesRejected 에 아무것도
    //    안 잡히므로 이 카운터가 없으면 "quoteRejectRate 0%인데 쟁점이 폐기됨"이 된다
    //  - 인용은 냈지만 전부 검증에서 떨어짐 → 이미 quotesRejected·rejected[] 에 잡혀 있다
    if (value.quotes.length === 0) stancesDiscarded.empty_quotes += 1;
    if (kept.length === 0 || providerRefs.length === 0) continue;

    stances.push({
      provider,
      text: value.text,
      quotes: kept,
      sourceRefs: providerRefs.map((ref) => ({
        sourceAnswerId: ref.sourceAnswerId,
        sectionId: ref.sectionId,
      })),
    });
  }

  return { stances, quotesTotal, quotesRejected, rejected, stancesDiscarded };
}

/**
 * 코드가 만드는 최소 stance (§3.4·§7.6·§2.5).
 *
 * 두 경로가 이 형식을 공유한다 — 참여 1개 쟁점(단계 6 미실행)과 단계 6 판정 실패.
 * **`kind`는 서로 다르므로 호출부가 정한다**(전자 `single_source`, 후자 `conflict`).
 * 두 경로를 섞지 않기 위해 이 함수는 stance만 만들고 판정에 관여하지 않는다.
 *
 * `quotes`가 원문 첫 문장이라 §11-2 검증을 그대로 통과한다.
 */
/**
 * 부분 손실 보충 (§7.6·§11.2, T-019.4).
 *
 * §11-4는 stance가 **0개**일 때만 쟁점을 폐기한다. 참여 3개 중 1개만 죽으면 쟁점은 살고
 * **3열 화면에 한 칸이 빈다** — 판정은 3사를 보고 냈는데 근거는 2개만 남는다.
 * 조사 한 글자 차이로 quote가 폐기되면(§11.2) 실제로 이 상태가 된다.
 *
 * 살아남지 못한 provider만 골라 §7.6 형식의 코드 stance로 채운다. 재시도는 하지 않는다 —
 * §2.5의 재시도는 호출 실패에만 적용되고, `effort: low` 적용 후 관련 사건이 0/20으로
 * 떨어졌기 때문이다(§14.5).
 *
 * ⚠️ **소멸을 막을 뿐 정확한 인용을 되찾지는 못한다.** 채워 넣는 `text`는 섹션 제목이라
 * LLM이 만든 25자 요약보다 정보가 적다. 그 칸의 품질 저하를 감수하는 대신 쟁점이
 * 사라지거나 근거가 비는 일은 없게 하는 거래다. 발생률은 `stanceSurvival`로 관측한다.
 *
 * `kind`는 건드리지 않는다 — 판정 자체는 성공했고 근거 한 칸만 메운 것이다.
 */
export function fillMissingStances(
  grounded: AgendaStance[],
  refs: DraftSourceRef[],
  participants: AiProvider[],
): { stances: AgendaStance[]; filled: AiProvider[] } {
  const present = new Set(grounded.map((s) => s.provider));
  const missing = participants.filter((p) => !present.has(p));
  if (missing.length === 0) return { stances: grounded, filled: [] };

  const missingSet = new Set(missing);
  const codeStances = buildCodeStances(
    refs.filter((ref) => missingSet.has(ref.provider)),
  );
  if (codeStances.length === 0) return { stances: grounded, filled: [] };

  // 참여자 순서를 유지해 표시가 흔들리지 않게 한다(AC1).
  const byProvider = new Map<AiProvider, AgendaStance>();
  for (const s of [...grounded, ...codeStances]) byProvider.set(s.provider, s);
  const ordered = participants
    .map((p) => byProvider.get(p))
    .filter((s): s is AgendaStance => s !== undefined);

  return { stances: ordered, filled: codeStances.map((s) => s.provider) };
}

export function buildCodeStances(refs: DraftSourceRef[]): AgendaStance[] {
  const byProvider = new Map<AiProvider, DraftSourceRef[]>();
  for (const ref of refs) {
    const list = byProvider.get(ref.provider) ?? [];
    list.push(ref);
    byProvider.set(ref.provider, list);
  }

  const stances: AgendaStance[] = [];
  for (const [provider, providerRefs] of byProvider) {
    const head = providerRefs[0];
    if (!head) continue;
    const quote = firstSentence(head.content);
    if (quote.length === 0) continue;
    stances.push({
      provider,
      text: head.title,
      quotes: [quote],
      sourceRefs: providerRefs.map((ref) => ({
        sourceAnswerId: ref.sourceAnswerId,
        sectionId: ref.sectionId,
      })),
    });
  }
  return stances;
}
