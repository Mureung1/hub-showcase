# PtoP OpenAI 모델 비교 테스트 계획

## 문서 목적

PtoP의 기술적 도전 후보 분석에 어떤 OpenAI 모델이 적합한지 비교한다. 단순히 더 비싼 모델을 선택하지 않고, 같은 Repository 입력과 같은 출력 규칙을 사용해 다음 항목을 확인한다.

- 실제 근거를 바탕으로 기술적 도전 후보를 고르는가
- Background, Problem, Solution을 자연스럽게 연결하는가
- 근거가 부족한 내용을 사실처럼 만들지 않는가
- JSON 응답과 PtoP 계약을 안정적으로 지키는가
- 품질 대비 비용과 응답 시간이 적절한가

이 문서는 PtoP의 현재 분석 구조를 기준으로 작성한 테스트 계획이다. 모델 목록과 가격은 변경될 수 있으므로 실행 전에 공식 모델 문서에서 다시 확인한다.

## 테스트 범위

PtoP는 Repository의 코드·설정·commit·Issue·Pull Request를 바탕으로 텍스트 결과를 생성하므로, 음성·이미지·임베딩 전용 모델은 이번 비교에서 제외한다.

초기 비교 대상은 다음 5개로 정한다.

| 모델 | 역할 | 입력 가격 / 1M 토큰 | 출력 가격 / 1M 토큰 | PtoP에서 확인할 점 |
| --- | --- | ---: | ---: | --- |
| `gpt-4.1-mini` | 현재 기준 모델 | $0.40 | $1.60 | 빠른 응답, JSON 안정성, 기본 분석 품질 |
| `gpt-4.1` | 비추론 상위 모델 | $2.00 | $8.00 | 여러 파일 간 관계와 기술적 도전 선별 품질 |
| `gpt-5-mini` | 비용 중심 추론 모델 | $0.25 | $2.00 | 복합 근거 연결과 정밀한 후보 작성 |
| `gpt-5.4-mini` | 고성능 소형 추론 모델 | $0.75 | $4.50 | 품질과 비용의 균형, 후보 우선순위 |
| `gpt-5.6-luna` | 비용 효율형 최신 모델 | $1.00 | $6.00 | 최신 모델의 분석 품질 대비 비용 |

가격은 표준 API의 텍스트 토큰 기준이며, 캐시 입력·Batch API·지역 처리 비용은 포함하지 않는다. 모델별 지원 endpoint와 파라미터가 다를 수 있으므로 실행 전에 공식 모델 문서에서 `Chat Completions`, `Responses`, Structured Outputs 지원 여부를 확인한다.

### 확장 비교 대상

초기 5개 모델에서 품질 차이가 충분히 보이지 않거나 고난도 Repository 분석이 필요할 때 다음 모델을 추가한다.

| 모델 | 입력 가격 / 1M 토큰 | 출력 가격 / 1M 토큰 | 사용 목적 |
| --- | ---: | ---: | --- |
| `gpt-5.6-terra` | $2.50 | $15.00 | 품질과 비용을 함께 고려하는 상위 모델 |
| `gpt-5.6-sol` | $5.00 | $30.00 | 최고 품질이 실제로 필요한지 확인하는 상한선 |

확장 모델은 초기 결과에서 품질 개선이 확인될 때만 실행한다. 가장 비싼 모델의 결과를 정답으로 간주하지 않는다.

## 현재 PtoP 분석 컨텍스트

모델 비교의 공정성을 위해 모든 모델에 동일한 입력을 전달한다.

- 최대 파일 수: 20개
- 파일당 최대 문자 수: 6,000자
- 전체 파일 최대 문자 수: 40,000자
- 예상 입력 토큰: 약 10,000토큰
- 출력 후보 수: 1~5개
- 각 후보: Background, Problem, Solution, 기술적 도전, 중요성, confidence, evidence
- 각 후보: 하나 이상의 `evidence` 필수
- 근거 없는 사용자의 역할·의도·문제 해결 여부는 확정하지 않음

입력 파일 선정 규칙, prompt, JSON 구조, 검증 로직은 비교 기간 동안 고정한다. 모델의 차이를 확인하려는 테스트에서 prompt와 입력까지 함께 바꾸면 결과를 해석할 수 없다.

## 테스트 횟수

### 1차 테스트

- 대표 Repository 6개를 선정한다.
- 모델 5개를 모두 실행한다.
- Repository마다 모델별 2회 실행한다.
- 총 실행 횟수: `6 Repository × 5 모델 × 2회 = 60회`

같은 모델을 2회 실행하는 이유는 결과 형식뿐 아니라 후보 선정과 문장 표현이 얼마나 일관적인지 확인하기 위해서다. 모델별 지원 방식에 따라 완전한 결정성을 보장할 수 없으므로, 두 결과가 얼마나 달라지는지도 기록한다.

### 2차 테스트

1차 결과에서 품질과 비용의 균형이 좋은 상위 2개 모델을 선정한다.

- 대표 Repository 6개
- 모델 2개
- Repository마다 3회 실행
- 총 실행 횟수: `6 Repository × 2 모델 × 3회 = 36회`

2차 테스트는 최종 모델 선택과 재현성 확인에 사용한다. 결과가 크게 다른 Repository는 별도로 분석해 입력 컨텍스트 누락인지 모델의 판단 차이인지 확인한다.

## 대표 Repository 선정 기준

특정 Repository 하나에만 유리한 모델을 고르지 않도록 다음 유형을 섞는다.

1. 작은 규모의 React 프로젝트
2. React와 Nest가 함께 있는 모노레포
3. 여러 Contributor가 참여한 협업 프로젝트
4. 테스트와 CI 설정이 포함된 프로젝트
5. commit은 많지만 코드 구조가 단순한 프로젝트
6. README와 코드 구조가 잘 정리된 프로젝트

실험 대상은 공개 Repository만 사용한다. 비공개 Repository나 API Key, 개인정보, 환경 변수 값이 포함될 가능성이 있는 파일은 테스트 입력에서 제외한다.

## 비용 예상

현재 PtoP의 최대 컨텍스트를 기준으로 한 단순 예상이다.

- 입력: 10,000토큰
- 출력: 1,000토큰
- 1회 비용 계산식: `(입력 토큰 × 입력 단가) + (출력 토큰 × 출력 단가)`

| 모델 | 1회 예상 비용 | 1차 12회 예상 비용 |
| --- | ---: | ---: |
| `gpt-4.1-mini` | $0.0056 | $0.0672 |
| `gpt-4.1` | $0.0280 | $0.3360 |
| `gpt-5-mini` | $0.0045 | $0.0540 |
| `gpt-5.4-mini` | $0.0120 | $0.1440 |
| `gpt-5.6-luna` | $0.0160 | $0.1920 |

1차 테스트 전체의 예상 비용은 약 `$0.79`다. 실제 비용은 파일 내용과 출력 길이, reasoning 토큰, API 가격 변경에 따라 달라지므로 응답의 `usage` 값을 반드시 저장한다. 비용만으로 모델을 선택하지 않고, 근거 정확도와 허위 추론 발생률을 함께 본다.

## 실행 조건

### 공통 조건

- 동일한 Repository snapshot을 사용한다.
- 동일한 파일 선택 제한과 prompt를 사용한다.
- 동일한 출력 JSON 구조를 사용한다.
- 모델 이름은 alias와 snapshot을 구분해 기록한다.
- 모델별 API 오류, 응답 시간, 입력·출력 토큰을 기록한다.
- API Key는 로그, 결과 파일, 커밋에 포함하지 않는다.

### 모델별 요청 조건

현재 PtoP는 Chat Completions API와 `response_format: { type: "json_object" }`를 사용한다. 비추론 모델은 현재 방식과 동일하게 테스트하고, 추론 모델은 지원되는 endpoint와 reasoning 설정을 먼저 확인한다.

모델별 지원 파라미터가 다를 수 있으므로 다음 두 가지를 구분해 기록한다.

- 같은 API 요청으로 비교한 결과
- 모델에 맞게 endpoint·reasoning 설정을 조정한 결과

두 결과를 섞지 않는다. 모델 자체의 차이와 요청 방식의 차이를 분리해야 한다.

## 평가 기준

각 결과를 0~5점으로 평가하고 아래 가중치를 적용한다.

| 평가 항목 | 가중치 | 확인 기준 |
| --- | ---: | --- |
| 근거 정확성 | 30% | 후보가 실제 파일·commit·Issue·PR 근거와 연결되는가 |
| 사실성 | 25% | 입력에 없는 역할·의도·성과를 만들어내지 않는가 |
| 기술적 도전 적합성 | 20% | 단순 기능 나열이 아니라 기술적으로 설명할 가치가 있는가 |
| Background-Problem-Solution 연결 | 15% | 세 요소가 서로 모순되지 않고 자연스럽게 이어지는가 |
| 출력 계약 준수 | 10% | JSON 파싱, 필수 필드, evidence 배열을 지키는가 |

### 정량 지표

- JSON 파싱 성공률
- 후보가 하나 이상 생성된 비율
- evidence가 하나 이상 연결된 후보 비율
- 근거와 직접 연결되지 않는 문장의 개수
- `requiresUserConfirmation`이 필요한 후보를 올바르게 표시한 비율
- 평균·최대 응답 시간
- 입력·출력·reasoning 토큰 수
- 분석 1회당 실제 비용

### 실패로 기록할 조건

- JSON 형식이 깨짐
- evidence 없는 후보가 생성됨
- commit 수만으로 사용자의 역할이나 난이도를 단정함
- Repository에 없는 기술이나 기능을 설명함
- 오류 응답을 성공 결과로 저장함
- 모델 응답이 PtoP 계약 타입과 맞지 않음

## 결과 기록 양식

각 실행은 다음 항목을 남긴다. 원문 응답에는 Repository 코드가 포함될 수 있으므로 공개 공유 전 민감정보를 검사한다.

```markdown
## 실행 결과

- 실행 ID:
- 실행 일시:
- 모델:
- 모델 snapshot:
- Repository 유형:
- 입력 컨텍스트 토큰:
- 출력 토큰:
- reasoning 토큰:
- 응답 시간:
- 실제 비용:
- JSON 파싱 성공: yes/no
- 경고:

### 점수

- 근거 정확성: /5
- 사실성: /5
- 기술적 도전 적합성: /5
- Background-Problem-Solution 연결: /5
- 출력 계약 준수: /5
- 종합 점수:

### 관찰

- 잘한 점:
- 잘못 추론한 점:
- 다른 모델과 달랐던 점:
- 사용자 확인이 필요한 점:
```

## 현재 구현된 평가 도구

모델을 비교할 때마다 `.env`의 `AI_MODEL`을 직접 바꾸지 않도록 평가 전용 Node.js 스크립트를 추가했다.

| 파일 | 역할 |
| --- | --- |
| `scripts/evaluate-openai-models.mjs` | 여러 모델에 동일한 fixture를 순서대로 요청하고 결과를 저장한다. |
| `scripts/evaluate-openai-models.lib.mjs` | 요청 body 생성, 모델 목록 정리, JSON 응답 파싱을 담당한다. |
| `scripts/evaluate-openai-models.test.mjs` | 평가 도구의 입력 정리와 JSON 파싱을 검증한다. |
| `scripts/fixtures/technical-challenge-request.example.json` | 실행 구조 확인을 위한 예시 fixture다. 실제 결과 비교 전 입력을 교체한다. |
| `docs/research/model-evaluation/results/` | 실행 결과가 저장되는 로컬 디렉토리다. API 응답과 Repository 코드가 포함될 수 있어 Git에 포함하지 않는다. |

### 실제 실행 순서

1. `scripts/fixtures/technical-challenge-request.example.json`을 복사해 로컬 fixture를 만든다.

```bash
cp scripts/fixtures/technical-challenge-request.example.json \
  scripts/fixtures/technical-challenge-request.local.json
```

2. 로컬 fixture의 `systemPrompt`와 `userPrompt`를 실제 PtoP 분석에 사용할 고정 요청으로 교체한다. 이 단계에서 Repository 코드, API Key, 개인정보가 포함되지 않았는지 확인한다.

3. 평가 도구의 자체 테스트를 실행한다.

```bash
node --test scripts/evaluate-openai-models.test.mjs
```

4. 여러 모델을 같은 입력으로 2회씩 실행한다. 스크립트는 기본적으로 `apps/api/.env`에서 `AI_API_KEY`를 읽으며, `--models` 값이 있으면 `AI_MODEL`보다 우선한다.

```bash
npm run evaluate:ai -- \
  --fixture scripts/fixtures/technical-challenge-request.local.json \
  --models gpt-4.1-mini,gpt-4.1,gpt-5-mini,gpt-5.4-mini,gpt-5.6-luna \
  --runs 2
```

5. `docs/research/model-evaluation/results/` 아래 모델별 JSON을 확인한다. 결과 파일에는 원본 응답, 파싱 결과, `usage`, 응답 시간, 오류 상태가 저장된다.

6. 결과를 평가 기준에 따라 점수화하고, 최종 요약을 `model-evaluation-results.md`에 작성한다. 원본 응답 전체를 공유하기보다 필요한 근거와 점수만 정리한다.

도구는 OpenAI만 호출하므로 GitHub API와 Supabase 저장은 수행하지 않는다. 따라서 실제 서비스 흐름과 분리된 상태에서 모델 품질만 비교할 수 있다. 현재 예시 fixture는 파이프라인 검증용이며, 실제 Repository 품질 비교를 위해서는 반드시 실제 PtoP 분석 컨텍스트를 반영한 로컬 fixture로 교체해야 한다.

## 최종 모델 선택 기준

다음 조건을 모두 만족하는 모델을 우선 후보로 삼는다.

- 종합 점수가 기준 모델보다 명확히 높다.
- 근거 없는 추론이 기준 모델보다 증가하지 않는다.
- JSON 파싱 성공률이 100%에 가깝다.
- 기술적 도전 후보의 evidence 연결이 안정적이다.
- 응답 시간과 비용이 실제 서비스 범위에서 감당 가능하다.

품질 차이가 작다면 비용과 응답 시간이 낮은 모델을 선택하고, 특정 고난도 Repository에만 상위 모델을 사용하는 라우팅을 검토한다. 최종 선택 후에도 모델 alias 대신 snapshot을 사용해 결과 변화를 추적할 수 있게 한다.

## 후속 작업 분해

temperature 처리 수정 이후의 재테스트는 아래 순서로 진행한다. 이전 실행 결과는 새 결과와 섞지 않고 폐기한다.

### Task 1. 모델별 요청 파라미터 분리

- [x] 모델별 요청 정책을 정의한다.
  - `gpt-4.1`, `gpt-4.1-mini`: `temperature: 0`
  - `gpt-5-mini`, `gpt-5.6-luna`: 지원되지 않는 `temperature`를 요청에서 제외
  - reasoning 모델은 지원되는 reasoning 설정을 별도로 기록
- [x] `createRequestBody`가 모델별 정책에 따라 body를 생성하도록 수정한다.
- [x] `temperature`가 포함되는 모델과 제외되는 모델을 테스트한다.
- [x] 지원되지 않는 옵션으로 인해 모델 비교가 중단되지 않는지 확인한다.

완료 기준: 재테스트 대상 5개 모델이 모두 HTTP 200 또는 모델 자체의 명확한 provider 오류를 반환하고, 지원되지 않는 파라미터 때문에 평가가 누락되지 않는다.

### Task 2. PtoP 출력 계약 검증기 추가

- [ ] `candidates` 배열 존재 여부를 확인한다.
- [ ] 후보별 필수 필드를 확인한다.
  - `title`
  - `summary`
  - `background`
  - `problem`
  - `solution`
  - `technicalChallenge`
  - `whyItMatters`
  - `confidence`
  - `requiresUserConfirmation`
  - `evidence`
- [ ] evidence별 `evidenceType`, `referenceId`, `title`, `url`, `filePath` 구조를 확인한다.
- [ ] 계약을 통과한 후보 수와 실패 이유를 결과 JSON에 기록한다.

완료 기준: HTTP 200이더라도 PtoP 계약을 만족하지 못한 결과는 성공 후보로 집계하지 않고, 누락 필드를 결과에 표시한다.

### Task 3. 실제 Repository fixture 생성

- [ ] 공개 Repository 6개를 선정한다.
- [ ] 실제 분석에 사용된 파일 목록, 코드 내용, 구조화 분석, evidence를 고정한다.
- [ ] API Key, 환경 변수, 개인정보, 비공개 코드가 fixture에 포함되지 않았는지 확인한다.
- [ ] 테스트마다 같은 fixture를 사용하도록 경로를 고정한다.

완료 기준: 예시 fixture가 아닌 실제 Repository 유형 6개로 모델 간 결과를 비교할 수 있다.

### Task 4. 평가 실행과 원본 결과 저장

- [ ] 수정된 평가 스크립트 자체 테스트를 실행한다.
- [ ] 5개 모델을 Repository별 2회 실행한다.
- [ ] 모델, snapshot, latency, usage, provider status를 저장한다.
- [ ] 원본 응답과 계약 검증 결과를 함께 저장한다.
- [ ] 결과 파일이 Git에 추가되지 않는지 확인한다.

완료 기준: `6 Repository × 5 모델 × 2회 = 60회` 실행 결과가 누락 없이 저장되고, 실패 원인이 파라미터 오류와 응답 계약 오류로 구분된다.

### Task 5. 결과 점수화

- [ ] 근거 정확성을 0~5점으로 평가한다.
- [ ] 사실성과 허위 추론 여부를 0~5점으로 평가한다.
- [ ] 기술적 도전 적합성을 0~5점으로 평가한다.
- [ ] Background-Problem-Solution 연결성을 0~5점으로 평가한다.
- [ ] 출력 계약 준수 여부를 0~5점으로 평가한다.
- [ ] 가중치 합산 점수와 실제 비용·응답 시간을 함께 기록한다.

완료 기준: 모델별 평균 점수, 계약 통과율, 근거 누락률, 평균 비용, 평균 응답 시간을 비교할 수 있다.

### Task 6. 기준 모델과 최종 모델 결정

- [ ] `gpt-4.1`을 기준 모델로 재실행한다.
- [ ] `gpt-5-mini`, `gpt-5.6-luna`를 수정된 요청 조건으로 재실행한다.
- [ ] 기준 모델보다 품질이 개선되었는지 확인한다.
- [ ] 품질 개선이 비용 증가를 정당화하는지 확인한다.
- [ ] 최종 모델 또는 난이도별 모델 라우팅을 결정한다.
- [ ] 선택 이유와 남은 한계를 `model-evaluation-results.md`에 기록한다.

완료 기준: 최종 모델을 선택하거나, 단일 모델 선택이 적절하지 않다는 결론을 근거와 함께 남긴다.

## 실행 순서

- [ ] 테스트 Repository 6개와 선정 이유를 기록한다.
- [ ] 기준 prompt와 입력 snapshot을 고정한다.
- [ ] 모델별 API 지원 파라미터를 확인한다.
- [ ] `node --test scripts/evaluate-openai-models.test.mjs`로 평가 도구를 확인한다.
- [ ] 예시 fixture를 실제 분석 컨텍스트 기반의 로컬 fixture로 교체한다.
- [ ] 1차 60회 테스트를 실행한다.
- [ ] 응답, usage, latency, 오류를 저장한다.
- [ ] 평가 기준에 따라 결과를 점수화한다.
- [ ] 상위 2개 모델을 선정한다.
- [ ] 2차 36회 테스트를 실행한다.
- [ ] 품질·비용·응답 시간·일관성을 비교한다.
- [ ] 최종 모델과 선택 이유를 `model-evaluation-results.md`에 기록한다.
- [ ] 선택한 모델을 `.env.example`과 개발 문서에 반영한다.

## References

- [OpenAI API 모델 목록](https://developers.openai.com/api/docs/models)
- [OpenAI API 모델 비교](https://developers.openai.com/api/docs/models/compare)
- [OpenAI 최신 모델 선택 가이드](https://developers.openai.com/api/docs/guides/latest-model)
- [GPT-4.1 공식 모델 문서](https://developers.openai.com/api/docs/models/gpt-4.1)
- [GPT-4.1 mini 공식 모델 문서](https://developers.openai.com/api/docs/models/gpt-4.1-mini)
- [GPT-5 mini 공식 모델 문서](https://developers.openai.com/api/docs/models/gpt-5-mini)
- [GPT-5.4 mini 공식 모델 문서](https://developers.openai.com/api/docs/models/gpt-5.4-mini)
- [GPT-5.6 Luna 공식 모델 문서](https://developers.openai.com/api/docs/models/gpt-5.6-luna)
- [GPT-5.6 Terra 공식 모델 문서](https://developers.openai.com/api/docs/models/gpt-5.6-terra)
- [GPT-5.6 Sol 공식 모델 문서](https://developers.openai.com/api/docs/models/gpt-5.6-sol)
- [PtoP 기술적 도전 AI 분석 전략](./issue14-ai-analysis-strategy.md)

> 가격과 모델 지원 기능은 변경될 수 있다. 실행 당일 공식 문서에서 다시 확인하고, 실제 API 응답의 `usage`를 최종 비용 근거로 사용한다.
