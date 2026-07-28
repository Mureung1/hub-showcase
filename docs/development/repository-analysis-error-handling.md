# Repository 분석 오류 원인과 대응

## 문서 목적

Repository 분석은 GitHub API, AI provider, Supabase를 순서대로 호출합니다. 따라서 한 단계의 실패가 전체 분석 실패로 이어지지 않도록 **필수 데이터**와 **선택 데이터**를 구분하고, 오류를 사용자에게 이해 가능한 계약으로 변환합니다.

분석 흐름은 다음과 같습니다.

```text
입력 검증
  -> GitHub 필수 데이터 수집
  -> GitHub 선택 데이터 수집 및 정규화
  -> Repository 근거 분석
  -> AI 기술적 도전 후보 생성
  -> Supabase 저장
  -> HTTP 오류 또는 결과 + warnings 반환
```

## 오류를 구분하는 기준

| 구분 | 예시 | 처리 원칙 |
| --- | --- | --- |
| 필수 데이터 실패 | Repository metadata, languages, contributors, commits | 분석을 완료할 수 없으므로 명시적 오류 응답 |
| 선택 데이터 실패 | README, 파일 내용, Pull Request 리뷰, Discussion, Project | 가능한 데이터로 계속 분석하고 `warnings`에 기록 |
| AI 후보 생성 실패 | API key/model 누락, provider 장애, 잘못된 JSON | Repository 분석 결과는 반환하고 기술적 도전 후보는 비워 둠 |
| 저장 실패 | Supabase insert/update, evidence constraint | 성공으로 위장하지 않고 저장 실패 응답 반환 |
| 예상하지 못한 오류 | 처리되지 않은 예외 | 내부 원인은 숨기고 일반 오류 응답 반환 |

## 주요 오류 원인과 수정 내용

### 1. Projects `null` 노드로 인한 500 오류

#### 원인

GitHub GraphQL의 `projectsV2.nodes`는 타입상 Project 배열처럼 보여도 실제 응답에는 `null` 항목이 포함될 수 있습니다. 기존 구현이 각 노드를 바로 `project.number`로 접근하면서 다음 오류가 발생했습니다.

```text
TypeError: Cannot read properties of null (reading 'number')
```

#### 수정

`GitHubRepositoryClient`에서 GraphQL 응답을 nullable 타입으로 정의하고, `null` 노드를 type guard로 제거한 뒤 유효한 Project만 변환합니다.

```ts
.filter((project): project is GitHubProjectResponse => project !== null)
```

또한 다음 값이 없을 때 기본값을 사용합니다.

- `repository`: `null`이면 빈 결과
- `projectsV2`: `null`이면 빈 배열
- `items`: `null`이면 `itemCount: 0`
- `discussions`: `null`이면 빈 배열
- `comments`: `null`이면 `commentCount: 0`

### 2. Discussion/Project가 없는 Repository

#### 원인

모든 Repository가 GitHub Discussions 또는 Projects를 사용하는 것은 아닙니다. GraphQL에서 Repository가 `null`이거나 필드 오류가 발생할 수 있습니다.

#### 수정

Discussion과 Project는 선택 데이터로 분류했습니다.

- 분석 전체를 중단하지 않음
- 결과에 `discussions: []`, `projects: []` 반환
- 조회에 실패한 경우 `warnings`에 기록
- 근거가 없다는 이유로 임의의 내용을 생성하지 않음

### 3. `analysis_evidence` 제약조건 오류

#### 원인

애플리케이션은 다음 근거 타입을 저장할 수 있었지만, 기존 Supabase check constraint에는 일부 타입만 등록되어 있었습니다.

```text
commit, pull_request, issue, file, config, release
```

Discussion 또는 Project 근거 저장 시 다음 오류가 발생했습니다.

```text
violates check constraint "analysis_evidence_type_valid"
```

#### 수정

`supabase/migrations/20260728030000_allow_discussion_project_evidence.sql`에서 `discussion`, `project`를 허용 목록에 추가했습니다.

현재 허용 타입:

```text
commit, pull_request, issue, discussion,
project, file, config, release
```

이 migration은 Supabase SQL Editor에서 실제 DB에 적용 완료했습니다.

### 4. private 또는 접근할 수 없는 Repository

#### 원인

인증 토큰이 없거나 권한이 없는 private Repository는 GitHub API에서 보통 `404`로 반환됩니다. 공개 Repository가 존재하지 않는 경우와 기술적으로 구분하기 어렵습니다.

#### 수정

두 경우 모두 Repository 존재 여부를 추측하지 않고 다음 계약으로 처리합니다.

```json
{
  "code": "REPOSITORY_NOT_FOUND",
  "message": "GitHub Repository를 찾을 수 없거나 접근 권한이 없습니다."
}
```

HTTP status는 `404`입니다.

### 5. GitHub rate limit

#### 원인

- HTTP `429`
- HTTP `403`이면서 `x-ratelimit-remaining: 0`

#### 수정

`GitHubRateLimitError`로 변환하고 API에서 `429 GITHUB_RATE_LIMITED`로 응답합니다. 프론트에서는 잠시 후 재시도하거나 GitHub token 설정을 확인하도록 안내합니다.

### 6. GitHub 장애와 네트워크 오류

#### 원인

- GitHub API `5xx`
- 네트워크 연결 실패
- 응답 JSON 파싱 실패

#### 수정

필수 GitHub 요청에서 발생한 외부 오류는 `GitHubRequestError`로 변환하고, controller가 다음 응답으로 매핑합니다.

```json
{
  "code": "EXTERNAL_SERVICE_ERROR",
  "message": "GitHub 데이터를 가져오지 못했습니다."
}
```

HTTP status는 `502`이며, GitHub 응답 본문이나 내부 오류 stack trace는 외부에 노출하지 않습니다.

### 7. AI 분석 실패

#### 원인

- `AI_API_KEY` 또는 `AI_MODEL` 누락
- AI provider 요청 실패
- JSON schema에 맞지 않는 응답
- 근거가 부족한 후보 반환

#### 수정

AI 분석은 보조 단계이므로 전체 Repository 분석을 500으로 실패시키지 않습니다.

- 기술적 도전 후보: `[]`
- Repository 근거 분석: 정상 반환
- 원인: `analysis.warnings`에 기록
- 근거 없는 후보: 제거

따라서 사용자는 Repository 분석 결과를 먼저 확인할 수 있고, AI 후보가 생성되지 않은 이유도 확인할 수 있습니다.

### 8. Supabase 저장 실패

#### 원인

- `analysis_results` insert/update 실패
- contributor/evidence insert 실패
- DB constraint 위반
- 완료 상태 갱신 실패

#### 수정

`RepositoryAnalysisPersistenceError`를 추가했습니다.

저장 중 하위 단계가 실패하면:

1. 새로 만든 `pending` 분석 결과 삭제 시도
2. cleanup 실패가 원래 오류를 덮어쓰지 않도록 처리
3. 내부 원인은 `Error.cause`로 보존
4. controller는 `503 ANALYSIS_PERSISTENCE_FAILED`로 변환

외부 응답:

```json
{
  "code": "ANALYSIS_PERSISTENCE_FAILED",
  "message": "Repository 분석 결과를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요."
}
```

## API 오류 계약

| code | HTTP | 의미 |
| --- | ---: | --- |
| `INVALID_REPOSITORY_URL` | 400 | GitHub Repository URL 형식 오류 |
| `REPOSITORY_NOT_FOUND` | 404 | Repository가 없거나 접근 권한 없음 |
| `GITHUB_RATE_LIMITED` | 429 | GitHub 요청 한도 초과 |
| `EXTERNAL_SERVICE_ERROR` | 502 | GitHub 외부 장애 또는 네트워크 오류 |
| `ANALYSIS_PERSISTENCE_FAILED` | 503 | Supabase 저장 실패 |
| `INTERNAL_SERVER_ERROR` | 500 | 분류되지 않은 서버 오류 |

## 검증한 테스트 범위

자동 테스트에는 다음 시나리오가 포함되어 있습니다.

- Projects `null` node 제거
- Discussion/Project 필드 null 처리
- 필수 GitHub 404, rate limit, 500 응답 변환
- 네트워크 오류의 502 변환
- AI 후보 생성 실패 시 부분 성공
- 대상 GitHub ID 활동 없음
- Supabase 저장 실패와 pending cleanup
- Discussion/Project evidence payload 저장
- 프론트 오류 코드별 사용자 메시지

실행 명령:

```bash
npm run typecheck:api
npm run typecheck:web
npm run test:api
npm run test:web
npm run build:web
git diff --check
```

## 남은 운영 검증

코드와 migration은 준비되었지만, 실제 서비스 환경에서는 다음을 별도로 확인해야 합니다.

1. `boostcampwm2025/web30-TADAK` 재분석
2. Discussion/Project가 없는 공개 Repository 분석
3. private Repository 접근 실패 메시지
4. GitHub rate limit 응답
5. Supabase 저장 실패 후 pending row 정리 여부

실제 API key, GitHub token, Supabase secret은 문서와 테스트 fixture에 기록하지 않습니다.
