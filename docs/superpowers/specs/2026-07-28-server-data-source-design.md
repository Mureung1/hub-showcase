# ICU 실제 데이터 단일 원본 전환 설계

## 목표

ICU의 배포 실행 흐름을 mock/localStorage 우선 구조에서 Express + Supabase 기반의 실제 데이터 구조로 전환한다. 이번 범위는 로그인 없는 단일 시연 사용자를 대상으로 하며, 프로필부터 학습 결과까지 브라우저를 새로고침해도 같은 서버 데이터를 다시 불러올 수 있어야 한다.

## 결정 사항

- 프런트엔드는 Supabase를 직접 호출하지 않고 Express API만 호출한다.
- 배포의 기본 실행 모드는 `server`이며 mock 모드는 테스트와 명시적인 로컬 mock 실행에서만 사용한다.
- server 모드에서 API 실패를 localStorage 데이터로 조용히 대체하지 않는다.
- 기존 localStorage의 사용자 데이터는 가져오지 않는다.
- 테마, 사이드바 접힘 상태 등 기기별 UI 설정만 localStorage에 유지한다.
- 커리큘럼 카탈로그, Workspace 예제와 미션, Git Lab 레벨은 버전 관리되는 제품 콘텐츠이므로 코드에 유지한다.
- Tutor AI 응답은 Gemini 실제 API를 사용하며 대화 기록은 현재 Workspace 세션에만 유지한다.

## 데이터 소유권

Supabase가 다음 사용자 데이터의 단일 원본이다.

- 단일 학습 프로필
- 생성 커리큘럼과 이력
- 미션별 학습 진행 상태와 최근 테스트 결과
- 오답노트와 해결 상태
- Git Lab 명령 시도 기록

Git Lab의 완료 레벨은 별도 브라우저 키로 저장하지 않고 `passed` attempt를 조회해 계산한다. Today Hub의 Git Lab 통계도 같은 서버 기록에서 계산한다.

## API 경계

### 공통 URL

모든 프런트 API client는 공통 URL helper를 사용한다.

- `VITE_API_BASE_URL`이 있으면 해당 origin과 `/api/...` 경로를 결합한다.
- 값 끝의 `/`와 endpoint 시작의 `/`를 정규화한다.
- 값이 없으면 동일 origin의 상대 경로를 사용해 현재 단일 서버 개발 흐름을 유지한다.
- `VITE_ICU_API_MODE=mock`일 때만 mock 구현을 선택한다. 그 외에는 server로 해석한다.

### 프로필

새 API:

```txt
GET /api/profile
PUT /api/profile
DELETE /api/profile
```

`GET`은 `{ profile: LearnerProfile | null }`, `PUT`은 검증된 `{ profile: LearnerProfile }`을 반환한다. `DELETE`는 단일 프로필을 삭제하고 `{ profile: null }`을 반환한다. 단일 사용자 행의 고정 ID는 `primary`를 사용한다.

Backend에는 in-memory, SQLite, Supabase profile repository를 추가한다. Supabase migration은 `learner_profiles` 테이블을 생성하고 `primary` 행을 upsert할 수 있게 한다. 서버 전용 secret key 경계는 유지한다.

### 기존 기능

기존 curriculum, progress, mistake-note, Git Lab attempt, code runner, Tutor API 계약은 유지한다. Git Lab attempt client에는 목록 조회를 추가해 완료 레벨을 서버 기록에서 복원한다.

## 화면 데이터 흐름

### Profile

- 첫 진입 시 서버 프로필을 조회한다.
- 프로필이 없으면 빈 입력 화면을 표시한다.
- 저장 버튼은 요청 중 비활성화하고, 성공 응답을 받은 뒤 Today로 이동한다.
- 저장 실패 시 입력값을 유지하고 원인과 재시도 동작을 표시한다.

### Today Learning Hub

- 프로필, 활성 생성 커리큘럼, 학습 진행, 오답노트, Git Lab attempts를 서버에서 불러온다.
- 필수 데이터가 로딩 중이면 기존 레이아웃 안에서 로딩 상태를 표시한다.
- 생성 커리큘럼이 없으면 mock 계획을 표시하지 않고 목표 입력 CTA를 표시한다.
- 오답노트가 없으면 mock 최근 오답을 표시하지 않고 빈 상태를 표시한다.
- 하나라도 실패하면 해당 영역에 오류 원인과 재시도 버튼을 제공한다.

### Curriculum

- 추천 생성, 현재 계획, 이력, 활성화, 삭제는 서버 응답을 기준으로 store를 갱신한다.
- server 모드에서 fallback curriculum 생성기를 사용하지 않는다.
- 활성화할 과거 계획은 서버의 해당 snapshot을 현재 계획으로 저장한 뒤 Today로 이동한다.

### Learning Workspace

- 서버에서 복원된 활성 커리큘럼과 mission progress를 사용한다.
- 코드 실행 결과는 즉시 보여주되 progress 저장 상태를 별도로 표시한다.
- 저장 실패 시 성공한 것처럼 숨기지 않고 `저장하지 못했습니다`와 재시도 동작을 제공한다.
- Tutor 요청 실패는 진행 상태 저장 실패와 구분해 표시한다.

### Mistake Notes

- 목록, 생성, 상태 변경, 삭제는 서버 성공 후 화면 store에 반영한다.
- 낙관적 변경이 필요한 경우 실패 시 이전 상태로 되돌리고 오류를 표시한다.
- localStorage 오답과 mock 최근 오답은 server 모드에서 사용하지 않는다.

### Git Lab

- 명령 실행 결과는 기존 RPC recorder를 통해 attempt와 오답노트를 저장한다.
- 완료 레벨은 서버의 passed attempts로 복원한다.
- 저장 실패 시 레벨 성공 UI와 서버 저장 실패를 구분해 보여주고 재시도를 제공한다.

## 상태와 사용자 피드백

각 서버 연동 화면은 최소한 다음 상태를 구분한다.

- `loading`: 기존 정보 계층을 유지하는 로딩 표시
- `empty`: 다음 행동이 포함된 빈 상태
- `ready`: 서버 응답을 반영한 정상 상태
- `saving`: 중복 요청을 막는 비활성화와 진행 문구
- `error`: 원인, 영향받은 데이터, 재시도 버튼

오류는 색상만으로 전달하지 않고 한국어 제목과 다음 행동을 함께 제공한다. 재시도 후 성공하면 오류 메시지를 제거하고 서버 응답으로 화면을 다시 동기화한다.

## localStorage 정책

server 모드에서는 다음 사용자 데이터 키를 읽거나 쓰지 않는다.

- profile
- generated curriculum/history
- learning progress
- mistake notes
- Git Lab cleared levels

기존 값은 삭제하지 않되 무시한다. mock 모드 테스트는 현재 storage adapter를 계속 사용할 수 있다. UI 설정 키는 모드와 관계없이 유지한다.

## 검증

자동 검증:

- API base URL 정규화와 server 기본값
- profile route와 세 repository mode
- server 모드 store가 localStorage를 읽고 쓰지 않는지
- 각 API 실패가 mock 데이터로 대체되지 않는지
- Git Lab passed attempts에서 완료 레벨을 계산하는지
- 기존 Supabase RPC rollback과 repository 테스트

수동 흐름:

1. 빈 Supabase 상태에서 Profile을 입력한다.
2. Today에서 빈 커리큘럼 CTA를 확인한다.
3. 실제 AI 커리큘럼을 생성하고 Today/Workspace에서 같은 계획을 확인한다.
4. Workspace에서 코드를 실행하고 새로고침 후 진행 상태가 복원되는지 확인한다.
5. Tutor AI에 질문하고 실제 Gemini 응답을 확인한다.
6. Git Lab에서 실패 명령을 실행해 attempt와 오답노트가 함께 생성되는지 확인한다.
7. 오답노트를 해결 처리하고 Today 요약이 갱신되는지 확인한다.
8. API를 중단해 각 화면의 오류와 재시도 UI가 mock fallback 없이 동작하는지 확인한다.

## 제외 범위

- Supabase Auth와 다중 사용자 데이터 분리
- 기존 localStorage 데이터 마이그레이션
- Tutor 대화 영속화
- 예제·미션·Git Lab 레벨을 편집하는 콘텐츠 관리 시스템
- Electron, RAG, Notion 연동

## 완료 기준

- 배포 환경에서 Profile → Today → Workspace → Tutor → Progress → Git Lab → Mistake Notes 흐름이 실제 API와 Supabase 데이터만으로 이어진다.
- 새로고침과 화면 이동 후에도 서버 데이터가 일관되게 복원된다.
- server 모드에서 mock 사용자 데이터와 localStorage fallback이 노출되지 않는다.
- API 실패가 명확한 오류와 재시도 상태로 나타난다.
- `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`, Supabase smoke test가 통과한다.
