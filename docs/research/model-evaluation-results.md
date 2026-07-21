# PtoP OpenAI 모델 비교 결과

## 테스트 개요

출력 계약을 명확히 정의한 prompt와 `contractValidation` 검증기를 적용한 뒤, 동일한 fixture를 5개 모델에 각각 2회씩 다시 실행했다.

- 실행 시각: 2026-07-21 15:03 KST 전후
- 실행 수: `5개 모델 × 2회 = 10회`
- 입력 fixture: `scripts/fixtures/technical-challenge-request.local.json`
- 평가 대상: 제한된 Repository 근거에서 기술적 도전 후보를 생성하는 품질
- 모델별 설정:
  - `gpt-4.1-mini`, `gpt-4.1`: `temperature: 0` 사용
  - `gpt-5-mini`, `gpt-5.6-luna`: 지원되지 않는 `temperature` 생략
  - `gpt-5.4-mini`: 기존 요청 조건 유지

## 전체 결과

| 모델 | HTTP 성공 | JSON 파싱 | PtoP 계약 | 후보 수 | 평균 응답 시간 | 평균 총 토큰 | 2회 예상 비용 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `gpt-4.1-mini` | 2/2 | 2/2 | 2/2 | 1, 1 | 4.20초 | 695 | $0.001034 |
| `gpt-4.1` | 2/2 | 2/2 | 2/2 | 1, 1 | 2.97초 | 840 | $0.007500 |
| `gpt-5-mini` | 2/2 | 2/2 | 2/2 | 5, 5 | 49.79초 | 4,148 | $0.014861 |
| `gpt-5.4-mini` | 2/2 | 2/2 | 2/2 | 1, 1 | 2.86초 | 784 | $0.003347 |
| `gpt-5.6-luna` | 2/2 | 2/2 | 2/2 | 1, 1 | 7.51초 | 830 | $0.005020 |

### 핵심 결과

- HTTP 성공률: `10/10`
- JSON 파싱 성공률: `10/10`
- PtoP 출력 계약 통과율: `10/10`
- 모든 결과에서 `contractValidation.valid`는 `true`
- 모든 후보가 최소 1개의 `file` 근거를 포함

이번 실행에서는 출력 구조 문제가 해결되었다. 이전 실행에서 발생했던 `technicalChallenges`, `shortDescription`, `whyItIsTechnical`, `type` 등의 변형 필드는 더 이상 반환되지 않았다.

## 모델별 분석

### `gpt-4.1-mini`

- 두 실행 모두 동일하게 1개의 후보를 생성했다.
- `apps/api/src/main.ts`의 CORS와 전역 API prefix 설정을 일관되게 선택했다.
- 응답이 가장 짧고 비용이 낮았다.
- `confidence: high`, `requiresUserConfirmation: false`를 반환했지만, 근거가 단일 파일에 한정되고 `background`, `problem`이 null이어서 확신 수준이 다소 높게 설정된 것으로 보인다.

**판정:** 빠르고 저렴한 기준 모델로는 적합하지만, 근거가 제한된 상황에서 confidence를 보수적으로 설정하도록 추가 지침이 필요하다.

### `gpt-4.1`

- 두 실행 모두 1개의 동일한 후보를 생성했다.
- CORS와 API prefix에 대해 Background-Problem-Solution 구조를 모두 채웠다.
- `confidence`는 medium/high로 달라졌고 두 실행 모두 사용자 확인을 요구했다.
- 설명이 자연스럽지만 Background와 Problem은 실제 Repository 근거보다는 일반적인 API 설계 맥락에 가깝다.

**판정:** 응답 속도와 일관성이 좋고 포트폴리오 초안 형태에 가까운 결과를 만들지만, 근거 기반 문장과 일반적인 설명을 구분할 필요가 있다.

### `gpt-5-mini`

- 두 실행 모두 5개의 후보를 생성했다.
- 직접 확인 가능한 CORS·API prefix뿐 아니라 Supabase 통합, 모노레포, E2E 테스트, 인증·배포 관련 후보까지 확장했다.
- 후보별 confidence와 사용자 확인 여부를 함께 제공해 불확실성을 표시했다.
- 다만 현재 fixture에서 직접 확인할 수 없는 작업까지 “가능한 기술적 도전”으로 확장하므로, 실제 포트폴리오 소재로 사용하기 전에 사용자 답변이 반드시 필요하다.
- 평균 응답 시간이 약 50초이고 평균 총 토큰도 4,148개로 가장 높았다.

**판정:** 후보 발산과 맞춤 질문 생성에 적합하지만, 기본 분석 모델로 사용하면 과잉 제안과 비용·응답 시간 문제가 있다.

### `gpt-5.4-mini`

- 두 실행 모두 1개의 동일한 유형의 후보를 생성했다.
- CORS와 전역 API prefix를 직접 근거로 삼고, 사용자의 실제 문제와 의도는 확인이 필요하다고 표시했다.
- 두 실행 모두 `confidence: medium`, `requiresUserConfirmation: true`로 일관됐다.
- 평균 응답 시간은 2.86초로 짧고, 평균 비용도 낮았다.
- 후보 수를 무리하게 늘리지 않아 현재 입력 범위와 결과 범위가 잘 맞았다.

**판정:** 현재 fixture 기준으로 근거의 보수성, 출력 안정성, 응답 시간, 비용의 균형이 가장 좋았다. 현재 PtoP의 기본 후보 생성 모델 1순위로 검토할 수 있다.

### `gpt-5.6-luna`

- 두 실행 모두 1개의 후보를 생성했고 출력 구조도 안정적이었다.
- CORS와 API prefix 설정을 근거로 설명하면서, 구체적인 문제와 사용자의 역할은 확인이 필요하다고 표시했다.
- `confidence: medium`, `requiresUserConfirmation: true`로 동일했다.
- `gpt-5.4-mini`보다 응답 시간이 약 2.6배 길고 비용도 높았다.

**판정:** 신중한 분석 방향은 좋지만, 이번 fixture에서는 `gpt-5.4-mini`보다 뚜렷한 품질 이점이 확인되지 않았다.

## 비용 및 성능

비용은 결과 JSON 사용량에 테스트 계획 문서의 모델별 단가를 적용한 추정값이다. 실제 청구 금액과는 다를 수 있다.

| 모델 | 평균 입력 토큰 | 평균 출력 토큰 | 평균 reasoning 토큰 | 1회 예상 비용 | 평균 응답 시간 |
| --- | ---: | ---: | ---: | ---: | ---: |
| `gpt-4.1-mini` | 495 | 200 | 0 | $0.000517 | 4.20초 |
| `gpt-4.1` | 495 | 345 | 0 | $0.003750 | 2.97초 |
| `gpt-5-mini` | 494 | 3,654 | 2,016 | $0.007430 | 49.79초 |
| `gpt-5.4-mini` | 494 | 290 | 0 | $0.001673 | 2.86초 |
| `gpt-5.6-luna` | 494 | 336 | 66 | $0.002510 | 7.51초 |

10회 전체 예상 비용은 약 `$0.031762`이다. 실제 Repository에서는 입력 파일 수와 코드 길이가 증가하므로 비용과 응답 시간도 함께 증가할 수 있다.

## 계약 검증 결과

이번 실행부터 각 JSON 결과에 다음 값이 저장되었다.

```json
{
  "contractValidation": {
    "valid": true,
    "candidateCount": 1,
    "issues": []
  }
}
```

검증 대상은 다음과 같다.

- 최상위 `candidates` 배열
- 후보의 Background-Problem-Solution 필드
- `technicalChallenge`, `whyItMatters`
- `confidence`, `requiresUserConfirmation`
- evidence의 `evidenceType`, `referenceId`, `title`, `url`, `filePath`

## 현재 결론

이번 테스트에서는 **`gpt-5.4-mini`를 PtoP의 기본 후보 생성 모델 후보 1순위**로 판단한다.

선정 이유:

1. 2회 모두 PtoP 출력 계약을 통과했다.
2. 후보 수와 응답 구조가 실행마다 안정적이었다.
3. 근거가 부족한 부분을 사용자 확인 대상으로 남겼다.
4. 평균 응답 시간이 2.86초로 짧았다.
5. `gpt-5.6-luna`보다 비용과 응답 시간이 낮았다.

단, 이 결론은 파일 하나와 제한된 구조 정보만 포함한 작은 fixture 기준의 임시 결론이다. 실제 Repository 6개를 대상으로 한 테스트 전에는 최종 모델로 확정하지 않는다.

## 모델 활용 방향

- 기본 분석: `gpt-5.4-mini`
- 빠른 저비용 비교 기준: `gpt-4.1-mini`
- 복잡한 Repository 또는 추가 질문 생성: `gpt-5-mini` 검토
- 보수적인 2차 검토: `gpt-5.6-luna` 검토

## 다음 작업

- [x] 출력 계약 검증기 추가
- [x] 누락 필드와 잘못된 필드명을 결과 JSON에 기록
- [ ] 실제 공개 Repository fixture 6개 추가
- [ ] Repository 유형별 동일 조건 테스트 실행
- [ ] 근거 정확성, 허위 추론, BPS 연결, 비용, latency 점수화
- [ ] 사용자 회고 입력을 추가해 Repository 근거와 함께 재분석
- [ ] 실제 서비스 기본 모델을 `.env.example`과 개발 문서에 반영

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
