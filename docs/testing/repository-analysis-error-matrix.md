# Repository 분석 예외 시나리오 매트릭스

Repository 분석은 모든 데이터가 존재한다고 가정하지 않습니다. 필수 데이터 수집과 저장이 실패하면 요청을 실패시키고, 선택 데이터가 없거나 일부만 조회되면 결과와 `warnings`를 함께 반환합니다.

| 시나리오 | 재현 방법 | 실패 단계 | 기대 응답 | 사용자 안내 |
| --- | --- | --- | --- | --- |
| 정상 공개 Repository | 유효한 공개 URL과 API 응답 | 없음 | `201` 결과 | 분석 결과 확인 |
| `boostcampwm2025/web30-TADAK` | Projects에 `null` 노드 포함 | 선택 데이터 정규화 | `201` 결과 | 가능한 근거와 경고 표시 |
| Discussion/Project 없음 | GraphQL `repository: null` 또는 빈 nodes | 선택 데이터 수집 | `201` 결과, 빈 배열 | 일부 확장 데이터를 확인하지 못했다는 경고 |
| README/package/file 없음 | 선택 REST endpoint `404` | 선택 데이터 수집 | `201` 결과 | 기본 구조 기반 분석 제공 |
| private 또는 접근 불가 Repository | 인증 없는 private URL 또는 GitHub `404` | 필수 metadata | `404 REPOSITORY_NOT_FOUND` | URL 또는 접근 권한 확인 |
| 잘못된 URL | GitHub가 아닌 주소 또는 경로 누락 | 입력 검증 | `400 INVALID_REPOSITORY_URL` | URL 형식 수정 |
| GitHub rate limit | `429` 또는 `403` + `x-ratelimit-remaining: 0` | 필수 REST 요청 | `429 GITHUB_RATE_LIMITED` | 잠시 후 재시도 또는 토큰 확인 |
| GitHub upstream 장애 | 필수 REST endpoint `5xx` | 필수 데이터 수집 | `502 EXTERNAL_SERVICE_ERROR` | GitHub 상태 확인 후 재시도 |
| AI key/model 없음 | AI provider 환경 변수 누락 | 후보 생성 | `201` 결과, 후보 빈 배열 | AI 후보 없이 Repository 근거 확인 |
| AI 응답 JSON 오류 | provider가 잘못된 JSON 반환 | 후보 검증 | `201` 결과, warning | 근거가 확인된 후보만 표시 |
| 대상 GitHub ID 활동 없음 | Repository 내 활동과 다른 ID 입력 | 대상 필터 | `201` 결과, 후보 빈 배열 | 입력 ID 또는 대상 범위 확인 |
| Supabase 저장/제약조건 실패 | insert/update 오류 또는 허용되지 않은 evidence type | persistence | `503 ANALYSIS_PERSISTENCE_FAILED` | 잠시 후 재시도 |

## 검증 명령

```bash
npm run typecheck:api
npm run typecheck:web
npm run test:api
npm run test:web
npm run build:web
git diff --check
```

원격 Supabase migration과 실제 GitHub API를 사용하는 검증은 환경 변수와 명시적 opt-in이 필요합니다.

```bash
RUN_SUPABASE_INTEGRATION=1 npm run test:integration --workspace @ptop/api
```

토큰, API key, 실제 Repository 응답은 fixture나 로그에 저장하지 않습니다.
