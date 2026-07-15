# 사용자 프로필과 지원 가능성 판정

## 프로필 구조

브라우저에는 `uniradar.userProfile` 키로 아래 필드만 저장한다.

```js
{
  id: string,
  updatedAt: string,
  school: string,
  grade: number | null,
  majors: string[],
  interests: string[],
  regions: string[],
  canJoinTeam: boolean | null,
  availableHoursPerWeek: number | null,
  gpa: number | null,
  incomeBracket: number | null,
  languageScores: [{ type: string, score: string }]
}
```

필수 입력은 학교, 학년, 전공, 관심 분야, 활동 가능 지역, 팀 참여 가능 여부다. 주당 활동 가능 시간, 학점, 소득분위, 어학성적은 선택 입력이며 입력하지 않으면 `null` 또는 빈 배열로 둔다.

`localStorage`에는 비밀번호, API 키, 인증 토큰, 사용자가 입력하지 않은 추론 정보를 저장하지 않는다. 저장 모듈은 허용된 프로필 필드만 새 객체로 만들어 직렬화한다. 프로필은 브라우저별 로컬 데이터이므로 다른 브라우저나 기기와 자동으로 공유되지 않는다.

## 프로필 없는 분석

분석 요청의 `profile`은 생략하거나 `null`로 전달할 수 있다. 이때도 Gemini 또는 mock 분석으로 `opportunity`의 공고명, 주최 기관, 카테고리, 마감일, 대상, 조건, 서류, 혜택 등 핵심 정보를 구조화한다.

사용자 정보가 없으므로 참여 가능 여부는 추측하지 않는다. `match.status`는 `insufficient_info`, `match.score`는 `null`로 두고, `matchedReasons`와 `disqualifyingReasons`는 빈 배열로 반환한다. 이후 프로필을 저장하면 Gemini를 다시 호출하지 않고 같은 `opportunity`에 대해 로컬 규칙으로 맞춤 판정을 다시 계산할 수 있다.

## 조건 비교

`src/services/matchOpportunity.js`가 표준 `opportunity`와 프로필을 비교해 기존 `match` 구조를 반환한다.

- 필수 조건 충족: `matchedReasons`
- 필수 조건 판단에 필요한 정보 부족: `missingInfo`
- 필수 조건 불충족: `disqualifyingReasons`
- 우대 조건 충족: `matchedReasons`와 추천 점수에 반영
- 우대 조건 미충족: 지원 불가 사유로 사용하지 않음

학년, 학교, 전공 계열, 지역, 팀 참여, 학점, 소득분위, 어학성적, 주당 활동 시간을 규칙으로 비교한다. 자연어 조건을 확정적으로 해석할 수 없으면 충족으로 추측하지 않고 확인 항목으로 남긴다. 각 조건의 `evidence`는 Gemini 또는 mock 추출 단계에서 공고 원문을 근거로 채워야 한다.

## 상태 기준

- `not_eligible`: 명확한 필수 조건 불충족이 하나 이상 있음
- `insufficient_info`: 공고의 핵심 필수 조건이 없거나 대부분 판정할 수 없음
- `conditionally_eligible`: 불충족은 없지만 확인할 필수 정보가 남아 있음
- `eligible`: 확인 가능한 필수 조건을 모두 충족하고 중요한 부족 정보가 없음

## 추천 점수

추천 점수는 지원 가능 상태와 별도로 계산하며 랜덤 값을 사용하지 않는다. 기본점수 48점에서 필수 조건 충족 `+11`, 우대 조건 충족 `+6`, 관심 분야 일치 `+6`을 반영한다. 사용자 정보 부족은 `-8`, 공고 조건 해석 부족은 `-12`, 필수 조건 불충족은 `-32`다. 결과는 0~100으로 제한하고 `not_eligible`은 최대 35점, `insufficient_info`는 최대 60점으로 제한한다. 판단 근거가 전혀 없으면 `null`이다.

## 분석 흐름

```text
프로필 저장
→ Gemini 또는 mock이 opportunity 추출
→ normalizeAnalysisResult
→ matchOpportunity(profile, opportunity)
→ createTasks(opportunity, match)
→ 결과 카드 표시
```

Gemini가 `match`를 반환하더라도 서버가 명확한 조건을 다시 판정한다. 프로필을 수정하면 저장된 `opportunity`는 유지하고 브라우저에서 `match`와 태스크만 다시 계산하므로 Gemini API를 다시 호출하지 않는다.

## 계정 시스템 전환

추후 Supabase Auth, Firebase Authentication 등 실제 계정 시스템을 도입할 때는 `profileStore`의 저장 대상을 서버 사용자 프로필 API로 교체한다. 인증 토큰은 안전한 세션 또는 HttpOnly 쿠키 정책을 사용하고, 현재 표준 프로필과 `matchOpportunity` 인터페이스는 유지한다.
