# Gemini 합성 탐색 비교 승인 요청

**상태:** Free Tier 실행 승인, API key 대기

**작성일:** 2026-07-23

이 문서는 Task 4의 승인 범위와 예상 비용을 고정한다. 사용자는 2026-07-23
Free Tier 실행과 입력의 Google 제품 개선 사용 가능성에 동의했다. Adapter와
runner는 이 범위 안에서만 구현하며 API key가 준비되기 전에는 외부 API를
호출하지 않는다.

## 비교 가치

로컬 E5 하이브리드는 semantic check에서 현행 대비 3승·2무·0패이고 critical
miss가 없어 이미 개인 데이터 파일럿 후보로 남았다. 따라서 Gemini 비교는
로컬 후보를 구제하기 위한 필수 작업은 아니다.

다만 다음 이유로 소규모 관리형 모델 비교에는 학습 가치가 있다.

- 사용자가 실제 서비스에서 쓰이는 검색·추천 방식을 비교해 보고 싶다고
  명시했다.
- 로컬 E5 단독은 보수적 threshold에서 critical miss 2건을 남겼다.
- 관리형 모델이 같은 고정 fixture에서 의미 검색 누락을 줄이는지 확인하면
  로컬 모델과 관리형 모델의 실제 오류 차이를 기록할 수 있다.

합성 결과만으로 운영 도입을 승인하지 않는 원칙은 바뀌지 않는다.

## 모델 선택

| 항목 | 값 |
| --- | --- |
| 모델 | `gemini-embedding-2` |
| 상태 | 안정 버전 |
| 입력 | 합성 텍스트만 |
| 출력 차원 | 768 |
| API | Gemini Developer API 표준 `embedContent` |
| Batch API | 사용하지 않음 |

기존 계획 작성 시점의 `gemini-embedding-001`은 2026-07-14에 종료됐다.
현재 안정 모델인 `gemini-embedding-2`를 사용한다. Google 공식 문서가 권장하는
검색용 비대칭 prompt와 권장 출력 차원 768을 적용한다.

## 승인할 데이터 범위

| 구분 | 개수 | 전송 필드 |
| --- | ---: | --- |
| 합성 문서 | 72개 | `title`, `memo`, `category`, `domain` |
| 합성 query | 45개 | `text` |
| 합계 | 117개 | 합성 텍스트만 |

다음 필드는 전송하지 않는다.

- 문서: `id`, `originalUrl`, `createdAt`
- query: `id`, `slice`, `phase`, `relevanceByInsightId`
- API key, 사용자 ID, 인증 정보, 검색·클릭·열람 이력

모든 도메인은 `.example` 예약 도메인이며 실제 개인 데이터가 아니다.

## 고정 projection

문서:

```text
title: {title} | text: 메모: {memo} | 카테고리: {category} | 도메인: {domain}
```

예시:

```text
title: React 폼 검증 패턴 | text: 메모: 팀 로그인 화면에서 입력 오류를 즉시 안내할 때 | 카테고리: 개발 | 도메인: react.example
```

Query:

```text
task: search result | query: {text}
```

예시:

```text
task: search result | query: 학술 자료를 전부 정독하기 전에 채택 여부 가늠하기
```

Projection 계약의 결정적 SHA-256:

```text
8308faf17802dcba4d599c8ac138c9bea156b1ef82640a99b4c9b0ec836785b2
```

구현 시 manifest와 실행 scope가 이 hash, 문서 72개, query 45개를 정확히
만족하지 않으면 API 요청 전에 중단한다.

## 예상 token과 비용

고정 projection의 로컬 측정값은 다음과 같다.

| 구분 | Unicode 문자 수 | UTF-8 byte |
| --- | ---: | ---: |
| 문서 72개 | 6,491 | 11,885 |
| query 45개 | 2,031 | 3,113 |
| 합계 | 8,522 | 14,998 |

Google은 일반적인 Gemini 텍스트에서 token 하나를 약 4문자로 안내한다. 이
기준의 중심 추정은 약 2,131 token이다. 한국어 tokenization 차이를 보수적으로
반영해 **2,100~8,600 input token**을 승인용 범위로 사용한다.

2026-07-23 공식 표준 가격인 100만 text input token당 미화 0.20달러를 적용하면
예상 비용은 다음과 같다.

- 중심 추정: 약 **$0.00043**
- 보수적 상한: 약 **$0.00172**
- 실행 승인 비용 상한 제안: **$0.01**

Free Tier는 비용이 없지만 입력이 Google 제품 개선에 사용될 수 있다. Paid
Tier는 공식 가격표상 입력이 제품 개선에 사용되지 않는다. 이 문서는 Paid
Tier 실행을 기본 제안으로 삼는다.

## 실행과 cache 정책

- `GEMINI_API_KEY` 환경 변수만 사용하고 파일·로그·결과에 기록하지 않는다.
- 각 고정 입력은 최대 한 번 요청하며 자동 retry는 하지 않는다.
- 오류에는 상태 코드와 익명 입력 hash만 남기고 원문은 남기지 않는다.
- 성공한 벡터는 공급자·모델·projection·task type·정규화 입력별 SHA-256
  key로 Git 제외 `.cache/embeddings/`에 저장한다.
- 같은 입력은 재실행해도 cache를 사용하며 다시 전송하지 않는다.
- 벡터 생성 뒤 cosine, semantic threshold, RRF `k=60`·`k=10`, 상위 결과 수,
  보고서 재생성에는 추가 API token이 들지 않는다.
- 합성 집계와 query별 익명 결과만 `results/`에 기록한다.
- 개인 데이터에 Gemini를 사용하는 승인은 이번 합성 데이터 승인과 별개다.

## 승인 뒤 구현 범위

1. projection hash와 문서·query 상한을 검증하는 실패 테스트
2. API key와 명시적 CLI 확인값이 없으면 외부 요청 전에 실패하는 테스트
3. `gemini-embedding-2` adapter와 파일 cache 연결
4. 현행·Gemini semantic·Gemini hybrid `k=60`·`k=10` 실행
5. 로컬 E5와 동일한 지표·critical miss·negative 오탐 보고
6. 실제 호출 수와 오류를 원문 없이 기록

## 사용자 결정

**2026-07-23 결정:** Free Tier 실행 승인

- 비용: `$0`
- 입력의 Google 제품 개선 사용 가능성: 동의
- 문서 상한: 72개
- query 상한: 45개
- projection SHA-256:
  `8308faf17802dcba4d599c8ac138c9bea156b1ef82640a99b4c9b0ec836785b2`
- 승인 참조:
  `codex-user-message-2026-07-23-free-tier-product-improvement-consent`

개인 데이터나 더 큰 실행 범위에는 이 승인을 재사용하지 않는다.

## 공식 근거

- [Gemini Embeddings](https://ai.google.dev/gemini-api/docs/embeddings)
- [Gemini Developer API 가격](https://ai.google.dev/gemini-api/docs/pricing)
- [Gemini 모델 종료 일정](https://ai.google.dev/gemini-api/docs/deprecations)
- [Gemini token 이해와 계산](https://ai.google.dev/gemini-api/docs/tokens)
