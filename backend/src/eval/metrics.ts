// 분석 품질 회귀 러너(eval)가 사용하는 지표 4종 계산 순수 함수 (Task 22).
// runEval.ts가 실제 Gemini 호출 결과를 이 함수들에 넘겨 지표를 계산한다.
// 이 파일은 API 호출을 하지 않으므로 vitest 유닛 테스트 대상이다(metrics.test.ts).
//
// 관측 단위에 따라 두 그룹으로 나눈다 (Week4 계획서 2026-07-27 수정):
// - 비율(rate)로 의미 있는 지표: quote_match_rate, citation_integrity_rate
//   (인용문·마커 개수가 fixture당 수 건~수십 건이라 소수점 비교가 유효함)
// - fixture 단위 pass/fail 단언으로만 의미 있는 지표: hypothesis_id_valid_rate, status_accuracy
//   (fixture 5~6건 × 가설 1~3개, 총 판정 단위가 12건 안팎이라 백분율은 없는 정밀도를 만든다)

export interface RateResult {
  total: number;
  matched: number;
  rate: number;
}

// quote_match_rate: 1단계가 인용한 quote들이 전사문 원문에 실제로 존재하는 비율.
// 측정 대상이 없으면(quotes가 빈 배열) rate 1을 반환한다 — "측정할 게 없다"를
// "전부 실패했다(0)"로 잘못 해석하지 않기 위함.
export function scoreQuoteMatch(quotes: string[], transcript: string): RateResult {
  const total = quotes.length;
  if (total === 0) {
    return { total: 0, matched: 0, rate: 1 };
  }
  const matched = quotes.filter((quote) => transcript.includes(quote)).length;
  return { total, matched, rate: matched / total };
}

interface MarkerRef {
  marker: number;
}

// citation_integrity_rate: summary 본문의 [n] 마커 집합과 citations 배열의 marker
// 집합이 정확히 일대일 대응하는 비율. 대칭차(symmetric difference)를 불일치로 센다 —
// 본문에만 있는 마커, citations에만 있는 마커 둘 다 "끊어진 사슬"이기 때문이다.
export function scoreCitationIntegrity(summary: string, citations: MarkerRef[]): RateResult {
  const markersInSummary = new Set(
    Array.from(summary.matchAll(/\[(\d+)\]/g)).map((m) => Number(m[1])),
  );
  const citationMarkers = new Set(citations.map((c) => c.marker));
  const union = new Set([...markersInSummary, ...citationMarkers]);

  const total = union.size;
  if (total === 0) {
    return { total: 0, matched: 0, rate: 1 };
  }
  let matched = 0;
  for (const marker of union) {
    if (markersInSummary.has(marker) && citationMarkers.has(marker)) {
      matched += 1;
    }
  }
  return { total, matched, rate: matched / total };
}

interface HypothesisIdRef {
  hypothesis_id: string;
}

export interface ValidityResult {
  allValid: boolean;
  invalidIds: string[];
}

// hypothesis_id_valid_rate: 관측 단위가 fixture당 소수의 태그이므로 비율이 아니라
// "전부 유효한가 / 어떤 id가 무효한가"의 단언(assertion) 형태로 반환한다.
export function checkHypothesisIdValidity(
  items: HypothesisIdRef[],
  validIds: string[],
): ValidityResult {
  const validSet = new Set(validIds);
  const invalidIds = items
    .map((item) => item.hypothesis_id)
    .filter((id) => !validSet.has(id));
  return { allValid: invalidIds.length === 0, invalidIds };
}

// status_accuracy: fixture 1건 × 가설 1개에 대한 단일 판정 비교. expected가 아직
// 사람이 채우지 않은 placeholder(TODO로 시작)면 항상 false를 반환해, 라벨링이
// 끝나지 않은 fixture가 우연히 "일치"로 잡히는 것을 막는다.
export function isStatusAccurate(actualStatus: string, expectedStatus: string): boolean {
  if (expectedStatus.startsWith('TODO')) {
    return false;
  }
  return actualStatus === expectedStatus;
}
