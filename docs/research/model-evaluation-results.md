# PtoP OpenAI 모델 비교 결과

## 테스트 개요

`temperature`를 모델별로 분리한 평가 스크립트로 동일한 fixture를 5개 모델에 각각 2회씩 요청했다. 이전 실행 결과는 삭제하고, 이번 실행 결과만 기록했다.

- 실행 수: `5개 모델 × 2회 = 10회`
- 입력 fixture: `scripts/fixtures/technical-challenge-request.local.json`
- 평가 대상: Repository 구조와 제한된 근거에서 기술적 도전 후보를 생성하는 품질
- 공통 요청: 동일한 system prompt, user prompt, JSON 응답 요청
- 모델별 설정:
  - `gpt-4.1-mini`, `gpt-4.1`: `temperature: 0` 사용
  - `gpt-5-mini`, `gpt-5.6-luna`: 지원되지 않는 `temperature` 생략
  - `gpt-5.4-mini`: 기존 요청 조건 유지

## 전체 결과

| 모델 | HTTP 성공 | JSON 파싱 | `candidates` 루트 | PtoP 계약 | 평균 응답 시간 | 평균 총 토큰 | 2회 예상 비용 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `gpt-4.1-mini` | 2/2 | 2/2 | 0/2 | 0/2 | 2.12초 | 391 | $0.000515 |
| `gpt-4.1` | 2/2 | 2/2 | 2/2 | 0/2 | 1.59초 | 423 | $0.003096 |
| `gpt-5-mini` | 2/2 | 2/2 | 2/2 | 0/2 | 56.63초 | 3,096 | $0.011314 |
| `gpt-5.4-mini` | 2/2 | 2/2 | 2/2 | 0/2 | 2.67초 | 643 | $0.003500 |
| `gpt-5.6-luna` | 2/2 | 2/2 | 2/2 | 0/2 | 4.80초 | 979 | $0.008698 |

### 계약 판정 기준

`PtoP 계약`은 현재 `parseTechnicalChallengeResponse`가 요구하는 다음 구조를 기준으로 수동 확인했다.

- 최상위 `candidates` 배열
- 후보별 `title`, `summary`, `background`, `problem`, `solution`
- `technicalChallenge`, `whyItMatters`, `confidence`, `requiresUserConfirmation`
- `evidence` 배열과 `evidenceType`, `referenceId`, `title`, `url`, `filePath`

이번 실행에는 자동 계약 evaluator가 아직 포함되지 않았으므로, 위 기준으로 결과 JSON을 직접 비교했다.

## 모델별 상세 결과

### `gpt-4.1-mini`

- 두 실행 모두 HTTP 200, JSON 파싱 성공
- 두 실행 모두 `technicalChallenges` 루트를 반환해 PtoP가 요구하는 `candidates` 루트와 불일치
- 두 실행 모두 `apps/api/src/main.ts`를 근거로 CORS와 전역 API prefix 설정을 동일하게 선택
- 응답 구조와 후보 내용은 가장 일관적이었지만, 현재 parser에서는 후보 전체를 유효한 결과로 처리할 수 없음
- 평균 응답 시간은 2.12초, 평균 총 토큰은 391개로 가장 가벼운 편

**판정:** 비용과 일관성은 좋지만, 출력 계약 불일치로 현재 서비스에 바로 사용할 수 없다.

### `gpt-4.1`

- 두 실행 모두 `candidates` 루트와 1개의 후보를 반환
- 두 실행의 후보 제목과 근거 파일은 거의 동일해 재현성이 높음
- `title`, 설명, `evidence`는 제공했지만 `summary`, `background`, `problem`, `solution`, `technicalChallenge`, `whyItMatters`, `confidence` 등 필수 필드가 부족함
- 두 번째 실행에서만 `userConfirmationNeeded`가 추가되어 필드 이름도 일관되지 않음
- 평균 응답 시간은 1.59초로 가장 짧았고, 평균 총 토큰은 423개

**판정:** 현재 계약에 가장 가까운 기본 구조를 반환했지만, 필수 필드와 evidence 스키마 보강이 필요하다.

### `gpt-5-mini`

- 두 실행 모두 HTTP 200, JSON 파싱 성공, `candidates` 루트 반환
- 1회차는 5개, 2회차는 4개의 후보를 생성
- `main.ts`에서 직접 확인되는 CORS·API prefix 외에 Supabase 연동, 모노레포 타입 공유, E2E, 배포·환경변수 관리까지 후보를 확장함
- 일부 후보는 `structuredAnalysis`의 기술 스택이나 폴더 구조를 근거로 “가능한 기술적 도전”을 제안하고 있어 사용자 확인 질문은 포함했지만, 현재 입력 근거보다 분석 범위가 넓음
- 실행마다 후보 수와 필드 구조가 달랐으며, `summary` 중심 응답과 `shortDescription`·`technicalAspects`·`portfolioAngle` 중심 응답이 서로 다름
- 평균 응답 시간은 56.63초, 평균 총 토큰은 3,096개로 가장 무거움

**판정:** 아이디어 발산과 질문 생성에는 유용하지만, 현재처럼 근거가 제한된 입력에서는 결과를 그대로 포트폴리오 문장으로 사용하기 어렵다.

### `gpt-5.4-mini`

- 두 실행 모두 HTTP 200, JSON 파싱 성공, `candidates` 루트 반환
- 1회차는 3개, 2회차는 1개의 후보를 생성해 실행 간 후보 수 차이가 큼
- 근거가 없는 사용자의 역할이나 성과를 직접 단정하지 않고 `confidence`와 확인 필요 여부를 포함한 점은 긍정적
- 하지만 1회차는 `challenge`, `whyItMatters`를 사용했고 2회차는 `challenge`, `whyItIsTechnical`을 사용해 스키마가 달라짐
- PtoP가 요구하는 Background·Problem·Solution 구조와 `technicalChallenge` 필드를 제공하지 않음
- 평균 응답 시간은 2.67초, 평균 총 토큰은 643개

**판정:** 빠르고 비교적 신중하지만, 출력 스키마의 변동성이 있어 구조화된 출력 제약이 필요하다.

### `gpt-5.6-luna`

- 두 실행 모두 HTTP 200, JSON 파싱 성공, `candidates` 루트 반환
- 1회차는 2개, 2회차는 4개의 후보를 생성
- `main.ts`의 CORS·API prefix 설정을 직접 근거로 제시하고, Supabase·모노레포·테스트 관련 후보에는 확인 필요 사항을 함께 표시함
- 제공된 근거만으로 사용자의 역할, 실제 문제, 해결 효과를 판단할 수 없다고 명시해 과도한 확정을 가장 잘 억제함
- 다만 evidence의 `type`이 PtoP의 `evidenceType`과 다르고, `technicalChallenge` 중심 구조만 반환해 필수 BPS 필드가 부족함
- 2회차의 `confidence` 값이 `높음`, `중간`, `낮음`처럼 한국어로 반환되어 현재 타입의 `high`, `medium`, `low`와 불일치
- 평균 응답 시간은 4.80초, 평균 총 토큰은 979개

**판정:** 근거 신뢰성과 사용자 확인 유도 측면에서 가장 적합한 방향을 보였지만, 출력 계약 정규화 없이는 바로 연결할 수 없다.

## 비용 및 성능

비용은 결과 JSON의 실제 사용량에 기존 테스트 계획 문서에 기록한 모델별 단가를 적용한 **추정값**이다. OpenAI 청구 화면의 실제 금액과는 다를 수 있다.

| 모델 | 평균 입력 토큰 | 평균 출력 토큰 | 평균 reasoning 토큰 | 1회 예상 비용 | 평균 응답 시간 |
| --- | ---: | ---: | ---: | ---: | ---: |
| `gpt-4.1-mini` | 306 | 85 | 0 | $0.000258 | 2.12초 |
| `gpt-4.1` | 306 | 117 | 0 | $0.001548 | 1.59초 |
| `gpt-5-mini` | 305 | 2,791 | 1,472 | $0.005657 | 56.63초 |
| `gpt-5.4-mini` | 305 | 338 | 0 | $0.001750 | 2.67초 |
| `gpt-5.6-luna` | 305 | 674 | 73 | $0.004349 | 4.80초 |

10회 전체 예상 비용은 약 `$0.0271`이다. 이번 fixture는 입력 토큰이 약 305개로 작기 때문에, 실제 Repository 분석에서는 입력 파일 수와 코드 길이에 따라 비용과 응답 시간이 크게 증가할 수 있다.

## 핵심 해석

1. **모든 모델이 API 호출과 JSON 파싱에는 성공했다.** `temperature`를 모델별로 조정한 뒤, 이전처럼 파라미터 오류로 실패한 모델은 없었다.
2. **현재 출력 계약을 완전히 통과한 모델은 없다.** 모델 성능만의 문제가 아니라, prompt가 요구하는 필드와 parser가 요구하는 필드를 모델이 정확히 맞추도록 강제하지 못한 문제도 함께 확인되었다.
3. **근거를 보수적으로 다루는 방향은 `gpt-5.6-luna`가 가장 명확했다.** 다만 결과를 그대로 사용할 수 있다는 의미가 아니라, 사용자 확인 절차와 잘 맞는다는 의미다.
4. **`gpt-5-mini`는 후보 발산에는 강하지만 현재 입력 범위를 넘어선 제안이 많았다.** 분석 결과의 후보 수를 늘리는 용도와 사실 기반 포트폴리오 초안 생성 용도를 분리할 필요가 있다.
5. **가장 먼저 해결할 문제는 모델 선택보다 출력 계약 안정화다.** 모델별 응답 차이를 흡수할 schema 강제 또는 정규화 계층이 필요하다.

## 현재 결론

이번 결과만으로 최종 모델을 확정하지 않는다.

현재의 임시 판단은 다음과 같다.

- **기본 후보 생성:** `gpt-5.6-luna` 방향이 가장 적합하지만, 비용과 계약 정규화가 필요하다.
- **빠른 기준 모델:** `gpt-4.1`은 응답 시간이 짧고 재현성이 높아 비교 기준으로 사용하기 좋다.
- **아이디어 확장:** `gpt-5-mini`는 후보 발산과 사용자 확인 질문 생성에 활용할 수 있으나, 낮은 근거 확실성의 후보를 별도로 표시해야 한다.
- **현재 운영 적용:** 어떤 모델도 parser를 그대로 통과하지 못했으므로, 모델을 고정하기 전에 출력 계약 검증기와 재시도·정규화 로직을 먼저 추가한다.

## 다음 작업

- [ ] PtoP 후보 출력 JSON Schema를 고정한다.
- [ ] 모델 응답을 `TechnicalChallengeCandidate` 구조로 검증하는 evaluator를 추가한다.
- [ ] 누락 필드와 잘못된 필드명을 결과 JSON에 기록한다.
- [ ] 실제 공개 Repository fixture를 추가해 작은 fixture 편향을 줄인다.
- [ ] 모델별로 동일한 fixture를 다시 실행하고 계약 통과율을 비교한다.
- [ ] 근거 정확성, 허위 추론, BPS 연결, 비용, latency를 함께 점수화한다.

## 결과 파일

- `docs/research/model-evaluation/results/gpt-4.1-mini-run-01.json`
- `docs/research/model-evaluation/results/gpt-4.1-mini-run-02.json`
- `docs/research/model-evaluation/results/gpt-4.1-run-01.json`
- `docs/research/model-evaluation/results/gpt-4.1-run-02.json`
- `docs/research/model-evaluation/results/gpt-5-mini-run-01.json`
- `docs/research/model-evaluation/results/gpt-5-mini-run-02.json`
- `docs/research/model-evaluation/results/gpt-5.4-mini-run-01.json`
- `docs/research/model-evaluation/results/gpt-5.4-mini-run-02.json`
- `docs/research/model-evaluation/results/gpt-5.6-luna-run-01.json`
- `docs/research/model-evaluation/results/gpt-5.6-luna-run-02.json`

원본 결과 파일은 Repository 코드와 AI 응답을 포함할 수 있어 Git에 커밋하지 않는다. 상세 테스트 계획은 [`openai-model-evaluation-plan.md`](./openai-model-evaluation-plan.md)에서 확인한다.
