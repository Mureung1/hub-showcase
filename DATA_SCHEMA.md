# UniRadar Analysis Result Schema

UniRadar의 mock 분석과 향후 Gemini/OpenAI 분석은 모두 아래 표준 결과 구조를 사용한다. UI는 공급자별 원본 응답을 직접 사용하지 않고 `normalizeAnalysisResult`를 거친 결과만 표시한다.

## Standard Structure

```js
{
  id: string,
  analyzedAt: string,
  mode: "mock" | "gemini" | "openai",

  opportunity: {
    title: string | null,
    organizer: string | null,
    category:
      | "scholarship"
      | "contest"
      | "activity"
      | "volunteer"
      | "support"
      | "unknown",
    deadline: string | null,
    target: string | null,
    eligibility: [
      {
        type:
          | "grade"
          | "major"
          | "region"
          | "school"
          | "gpa"
          | "income"
          | "period"
          | "team"
          | "other",
        condition: string,
        evidence: string,
        required: boolean
      }
    ],
    preferred: [
      {
        condition: string,
        evidence: string
      }
    ],
    requiredDocuments: string[],
    benefits: string[],
    activityPeriod: string | null,
    sourceUrl: string | null,
    uncertainFields: string[]
  },

  match: {
    status:
      | "eligible"
      | "conditionally_eligible"
      | "not_eligible"
      | "insufficient_info",
    score: number | null,
    summary: string,
    matchedReasons: string[],
    missingInfo: string[],
    disqualifyingReasons: string[],
    nextActions: string[]
  },

  tasks: [
    {
      id: string,
      title: string,
      dueDate: string | null,
      status: "todo" | "done"
    }
  ]
}
```

## Field Meaning

| Field | Meaning |
| --- | --- |
| `id` | 분석 결과를 구분하는 고유 식별자 |
| `analyzedAt` | 분석이 완료된 시각의 ISO 8601 문자열 |
| `mode` | 결과를 만든 분석 공급자 또는 mock 모드 |
| `opportunity` | 공고문에서 확인한 사실 정보 |
| `eligibility` | 필수 또는 일반 지원 자격과 공고문 근거 |
| `preferred` | 우대 조건과 공고문 근거 |
| `uncertainFields` | 공고문만으로 확정할 수 없는 공고 필드 |
| `match` | 사용자 프로필과 공고 조건의 비교 결과 |
| `score` | 0~100 추천 점수. 계산 근거가 부족하면 `null` |
| `missingInfo` | 지원 가능성 판단에 필요한 사용자 또는 공고 정보 |
| `disqualifyingReasons` | 지원 불가로 판단한 직접적인 이유 |
| `tasks` | 지원 준비를 위한 체크리스트 |

## Missing Values

- 확인되지 않은 단일 문자열 값은 `null`을 사용한다.
- 확인된 항목이 없는 목록은 빈 배열 `[]`을 사용한다.
- 확인할 수 없는 점수는 `null`을 사용하며 임의 점수를 만들지 않는다.
- 날짜 표현이 불명확하면 임의로 ISO 날짜로 변환하지 않는다.
- 허용되지 않은 `category`는 `unknown`으로 정규화한다.
- 허용되지 않은 `status`는 `insufficient_info`로 정규화한다.
- 태스크에 `id`가 없으면 정규화 단계에서 안정적인 식별자를 생성한다.
- 공고문이나 사용자 입력에 없는 사실은 새로 추측해서 채우지 않는다.

## Match Status

| Status | Korean label | Meaning |
| --- | --- | --- |
| `eligible` | 지원 가능 | 확인된 필수 조건을 충족하고 치명적인 누락 정보가 없음 |
| `conditionally_eligible` | 조건부 가능 | 대체로 적합하지만 추가 확인 또는 준비가 필요함 |
| `not_eligible` | 지원 불가 | 확인된 필수 조건과 사용자 프로필이 명확히 맞지 않음 |
| `insufficient_info` | 정보 부족 | 지원 가능성을 판단할 정보가 부족함 |

## API Boundary

분석 결과는 다음 흐름으로 처리한다.

```text
UI
-> analyzeOpportunity(input)
-> provider/mock implementation
-> normalizeAnalysisResult(result)
-> result state
-> AnalysisResultCard
```

향후 Gemini API도 의미상 동일한 필드를 반환해야 한다. 공급자 응답에 필드가 누락되거나 값이 잘못되어도 서버와 클라이언트의 정규화 단계가 최종 표준 구조를 보장해야 한다.

## Result Card Omission Rules

- 빈 배열인 섹션은 표시하지 않는다.
- `deadline`이 없으면 `마감일 확인 필요`를 표시한다.
- `score`가 `null`이면 점수 영역을 표시하지 않는다.
- `sourceUrl`이 없으면 원문 링크 버튼을 표시하지 않는다.
- `uncertainFields`가 있으면 `추가 확인 필요` 영역에 표시한다.
- 공고명이나 주최 기관처럼 핵심 문자열이 없으면 필요한 위치에서만 `확인 필요`를 표시한다.
