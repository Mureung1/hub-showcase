# ICU 실제 데이터 단일 원본 전환 구현 계획

> 설계 기준: `docs/superpowers/specs/2026-07-28-server-data-source-design.md`

## 목표

배포 실행의 기본 데이터 모드를 `server`로 전환하고, Profile → Today → Curriculum → Workspace → Git Lab → Mistake Notes 흐름의 사용자 데이터를 Express API와 Supabase에서만 읽고 쓴다. 정적 학습 콘텐츠는 코드에 유지하며, API 실패를 mock/localStorage로 숨기지 않고 화면별 오류와 재시도를 제공한다.

## 구현 원칙

- 각 단계는 화면 하나가 실제 서버 데이터를 읽고 쓰는 수직 슬라이스로 끝낸다.
- 사용자 데이터 store는 서버 모드에서 localStorage를 읽거나 쓰지 않는다.
- 프론트엔드는 공통 `apiUrl()`을 통해 Express만 호출한다.
- 저장은 서버 성공 응답을 받은 뒤 확정하고 실패 시 직전 UI 상태를 보존한다.
- 개발 중에는 변경 영역의 대상 테스트만 실행하고, 마지막에 전체 테스트·타입·린트·빌드를 한 번 실행한다.
- `docs/issues/**`는 수정하거나 커밋하지 않는다.

## Task 1: 공통 API 경계와 server 기본 모드

**수정 파일**

- 생성: `src/app/apiUrl.ts`
- 생성: `src/app/apiUrl.test.ts`
- 수정: `src/app/icuApiMode.ts`
- 수정: `src/app/icuApiMode.test.ts`
- 수정: `src/vite-env.d.ts`
- 수정: `.env.example`
- 수정: `src/features/curriculum/api/curriculumClient.ts`
- 수정: `src/features/learning-progress/api/learningProgressClient.ts`
- 수정: `src/features/mistake-notes/api/mistakeNoteClient.ts`
- 수정: `src/features/git-lab/api/gitLabAttemptClient.ts`
- 수정: `src/features/learning-workspace/api/codeRunnerClient.ts`
- 수정: `src/features/learning-workspace/api/tutorClient.ts`

**구현**

1. `apiUrl(path, baseUrl = import.meta.env.VITE_API_BASE_URL)`을 추가한다.
2. base URL과 path 경계의 슬래시를 하나로 정규화한다. base URL이 없으면 `/api/...` 상대 경로를 그대로 반환한다.
3. 모든 API client의 하드코딩된 `/api/...`를 `apiUrl()` 호출로 교체한다.
4. `resolveIcuApiMode()`는 값이 정확히 `mock`일 때만 mock을 반환하고, 누락·오타·`server`는 server로 반환한다.
5. `.env.example` 기본값을 `VITE_ICU_API_MODE=server`로 바꾸고 `VITE_API_BASE_URL=`을 추가한다. curriculum recommendation mode는 실제 Gemini 경로를 기본으로 사용하도록 현재 서버 계약에 맞춘다.

**대상 검증**

- base URL 없음, 끝 슬래시 있음/없음, endpoint 앞 슬래시 있음/없음 테스트
- API mode 누락/오타/server/mock 테스트
- 각 client가 주입된 fetch로 정규화된 URL을 호출하는 기존 테스트 보정

## Task 2: Profile 백엔드 수직 슬라이스

**생성 파일**

- `backend/modules/profile/domain/learnerProfile.mjs`
- `backend/modules/profile/domain/learnerProfile.test.mjs`
- `backend/modules/profile/application/profileService.mjs`
- `backend/modules/profile/adapters/inMemoryProfileRepository.mjs`
- `backend/modules/profile/adapters/sqliteProfileRepository.mjs`
- `backend/modules/profile/adapters/supabaseProfileRepository.mjs`
- `backend/modules/profile/adapters/profileRepository.test.mjs`
- `backend/http/profileRoutes.mjs`
- `backend/http/profileRoutes.test.mjs`
- `backend/supabase/migrations/002_learner_profile.sql`

**수정 파일**

- `backend/shared/sqliteDatabase.mjs`
- `backend/http/server.mjs`
- `backend/http/server.test.mjs`
- `backend/http/repositoryMode.test.mjs`

**계약**

```ts
type LearnerProfile = {
  displayName: string
  learningGoal: string
  preferredTracks: string[]
  dailyStudyMinutes: number
  level: 'beginner' | 'basic' | 'interview'
}
```

- `GET /api/profile` → `{ profile: LearnerProfile | null }`
- `PUT /api/profile` + `LearnerProfile` → `{ profile: LearnerProfile }`
- `DELETE /api/profile` → `{ profile: null }`
- 저장소 인터페이스: `get()`, `save(profile)`, `remove()`
- 모든 구현은 고정 행 ID `primary`를 사용한다.

**구현**

1. 도메인 함수에서 문자열 trim, 빈 이름/목표, 지원하지 않는 level, 빈 track 배열, 1 미만 학습 시간을 검증한다.
2. 서비스가 repository 오류를 공통 HTTP 오류 형태로 변환하고 route는 기존 `sendJson`/body parsing 패턴을 재사용한다.
3. SQLite `learner_profiles` 테이블을 생성하고 JSON track 배열을 직렬화한다.
4. Supabase migration에 `learner_profiles` 테이블과 `id = 'primary'` 제약을 추가하고 adapter는 `maybeSingle`, `upsert`, `delete`를 사용한다.
5. server runtime이 `memory`, `sqlite`, `supabase` 모드별 profile repository를 주입하고 profile route를 등록한다.

**대상 검증**

- 유효/무효 프로필 검증
- in-memory/SQLite repository의 get-save-remove 왕복
- Supabase adapter의 select/upsert/delete 호출과 오류 변환
- GET 빈 응답, PUT 성공/400, DELETE 성공 route 테스트
- 세 repository mode에서 runtime 생성 테스트

## Task 3: Profile 화면을 서버 권위 상태로 전환

**생성 파일**

- `src/features/profile/api/profileClient.ts`
- `src/features/profile/api/profileClient.test.ts`

**수정 파일**

- `src/features/profile/model/useLearningProfileStore.ts`
- `src/features/profile/model/useLearningProfileStore.test.ts`
- `src/features/profile/ProfileSetup.tsx`
- `src/features/profile/ProfileSetup.module.css`

**구현**

1. client에 `getProfile`, `saveProfile`, `deleteProfile`을 추가한다.
2. store는 `profile`, `status: 'idle' | 'loading' | 'ready' | 'saving' | 'error'`, `error`를 가진다.
3. server 모드에서는 초기 localStorage hydration/persist를 건너뛰고 API 응답만 `profile`에 반영한다. mock 모드에만 기존 storage adapter를 유지한다.
4. Profile 진입 시 조회하고, 로딩 UI와 조회 실패 재시도를 표시한다.
5. 저장 중 중복 제출을 막고 성공 응답을 받은 뒤 Today로 이동한다. 실패하면 입력값을 유지한다.
6. 초기화는 확인 후 DELETE가 성공했을 때만 profile을 비운다.

**대상 검증**

- server 모드 store가 localStorage를 읽고 쓰지 않음
- 조회 성공/null/실패 및 재시도
- 저장 성공 후 이동, 실패 시 입력값 유지
- 삭제 성공/실패에 따른 화면 상태

## Task 4: Curriculum과 Today Hub를 실제 서버 데이터로 전환

**수정 파일**

- `src/features/curriculum/model/useGeneratedCurriculumStore.ts`
- `src/features/curriculum/model/useGeneratedCurriculumStore.test.ts`
- `src/features/learning-progress/model/useLearningProgressStore.ts`
- `src/features/learning-progress/model/useLearningProgressStore.test.ts`
- `src/features/mistake-notes/model/useMistakeNoteStore.ts`
- `src/features/mistake-notes/model/useMistakeNoteStore.test.ts`
- `src/features/today-learning/TodayLearningHub.tsx`
- `src/features/today-learning/TodayLearningHub.module.css`
- `src/features/today-learning/TodayLearningHub.test.tsx`
- curriculum 생성/이력 화면의 관련 route component와 테스트

**구현**

1. 세 store에 명시적 load/save status와 오류를 추가하고 server 모드 storage 접근을 제거한다.
2. Curriculum 생성·현재 계획·이력·활성화는 성공한 서버 응답으로만 store를 갱신한다. server 모드에서는 fallback curriculum generator를 호출하지 않는다.
3. Today 진입 시 profile, 활성 curriculum, 오늘 progress, mistake notes, Git Lab attempts를 병렬 조회한다.
4. 각 카드가 자신의 loading/empty/error/ready 상태를 표시하고 실패 영역만 재시도할 수 있게 한다.
5. curriculum이 없으면 mock 계획 대신 목표 설정/커리큘럼 생성 CTA를 표시한다.
6. mistake note가 없으면 mock 최근 오답 대신 빈 상태를 표시한다.
7. Git Lab 완료 수는 서버의 `passed` attempts에서 고유 level ID를 계산한다.

**대상 검증**

- server 모드에서 localStorage와 fallback generator 미사용
- 부분 API 실패 시 다른 카드 데이터는 유지
- 빈 curriculum/mistake-note CTA
- passed attempts 중복 제거와 Today 통계 계산

## Task 5: Workspace 진행 상태 저장을 명시적으로 처리

**수정 파일**

- `src/features/learning-workspace/LearningWorkspace.tsx`
- `src/features/learning-workspace/LearningWorkspace.module.css`
- `src/features/learning-workspace/workspacePersistenceState.test.ts`
- `src/features/learning-progress/model/useLearningProgressStore.ts`
- `src/features/learning-progress/api/learningProgressClient.ts`

**구현**

1. Workspace 직접 진입도 활성 curriculum과 mission progress를 서버에서 hydrate한다.
2. 실행 결과는 즉시 표시하되 progress 저장은 `saving/saved/error`로 별도 표시한다.
3. 저장 실패 시 성공 상태로 가장하지 않고 같은 payload를 재시도할 수 있게 유지한다.
4. server 모드에서는 로컬 progress로 대체하지 않는다.
5. Tutor 실패와 progress 저장 실패 문구를 분리한다. Tutor 대화는 기존 세션 상태를 유지한다.

**대상 검증**

- 직접 진입 hydration
- 실행 성공 + 저장 성공
- 실행 성공 + 저장 실패 + 재시도 성공
- API 실패 시 localStorage fallback 미사용

## Task 6: Mistake Notes와 Git Lab을 서버 권위 상태로 전환

**수정 파일**

- `src/features/mistake-notes/api/mistakeNoteClient.ts`
- `src/features/mistake-notes/model/useMistakeNoteStore.ts`
- `src/features/mistake-notes/MistakeNotesPage.tsx`
- `src/features/mistake-notes/AddMistakeNotePage.tsx`
- `src/features/mistake-notes/components/MistakeNoteDetailModal.tsx`
- 관련 CSS Module과 테스트
- `src/features/git-lab/api/gitLabAttemptClient.ts`
- `src/features/git-lab/api/gitLabAttemptClient.test.ts`
- `src/features/git-lab/GitLabPage.tsx`
- `src/features/git-lab/GitLabPage.module.css`

**구현**

1. mistake note 목록/생성/수정/삭제를 서버 성공 응답 뒤 확정하고 실패 시 이전 상태와 입력을 보존한다.
2. server 모드에서 mock 최근 오답과 localStorage hydration을 제거한다.
3. Git Lab client에 `listGitLabAttempts()`를 추가한다.
4. 페이지 진입 시 attempts를 조회해 `passed` 결과의 level ID로 완료 상태를 복원한다.
5. server 모드의 cleared-level localStorage 읽기/쓰기를 제거한다.
6. attempt 저장 실패는 레벨 성공 판정과 구분해 안내하고 재시도할 수 있게 한다.

**대상 검증**

- note mutation 성공/실패/재시도와 rollback
- Git Lab GET URL/응답 파싱
- passed attempt 기반 완료 복원
- attempt 저장 실패 시 가짜 완료 persist 방지

## Task 7: 설정·문서·통합 흐름 검증

**수정 파일**

- `README.md` 또는 현재 실행 안내 문서
- 관련 `docs/features/*.md`
- `scripts/supabase-smoke.mjs`

**구현**

1. `VITE_API_BASE_URL`, server 기본 모드, Supabase migration 적용 순서, Express 실행 방법을 문서화한다.
2. `docs/issues/**`는 변경하지 않는다.
3. Supabase smoke가 profile save/get/delete와 기존 repository/RPC 흐름을 검증하도록 확장한다.
4. 수동 흐름을 Profile → Today → Curriculum → Workspace/Tutor → Git Lab → Mistake Notes 순서로 한 번 검증한다.

**최종 검증**

```powershell
npm test
npm run typecheck
npm run lint
npm run build
npm run smoke:supabase
```

Supabase smoke는 실제 URL/secret key가 설정된 환경에서만 실행하며, 비밀값은 로그나 커밋에 포함하지 않는다. 최종 보고에는 실행된 검증과 환경 부재로 건너뛴 검증을 구분한다.

## 완료 조건

- 배포 기본 모드가 server이고 mock은 명시적으로만 선택된다.
- 사용자 데이터 store가 server 모드에서 localStorage를 사용하지 않는다.
- Profile을 포함한 모든 사용자 데이터가 Express를 거쳐 Supabase에서 왕복한다.
- 새로고침 후 curriculum/progress/mistake-note/Git Lab 완료 상태가 복원된다.
- API 장애가 mock 데이터로 숨겨지지 않고 오류·재시도 UI로 드러난다.
- 정적 curriculum catalog, Workspace 예제·미션, Git Lab level 정의는 코드에 유지된다.
- 전체 검증이 통과하거나, 외부 Supabase 환경 검증만 명확한 사유와 함께 별도 보고된다.
