# GameForge Agent — 1주차 작업 세분화 (Day-by-Day)

> 제작계획 5절 "1주차: 셋업 + Repo 연결 화면 풀 구현"을 일 단위로 쪼갠 체크리스트.
> 평일 5일 기준, 하루 작업 단위가 반나절 넘지 않도록 세분화했다.

---

## Day 1 — 프로젝트 뼈대 세팅

### 백엔드
- `npm init` + Express 프로젝트 스캐폴딩 (`server/`)
- TypeScript 설정 (`tsconfig.json`), `ts-node-dev` 등 개발 서버 스크립트
- 기본 라우터 구조 잡기 (`/api/repo`, `/api/analysis`, `/api/steps`, `/api/chat`, `/api/documents` 빈 라우트만)
- `.env.example` 작성 — `ANTHROPIC_API_KEY`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `SESSION_SECRET` 등 필요한 키 목록만 우선 정의

### 프론트엔드
- `npm create vite@latest` (React + TS 템플릿)
- 프로토타입(`gameforge-agent-prototype.html`)의 CSS 변수 토큰을 `styles/tokens.css`로 이식
- 라우팅 스캐폴딩 (4개 화면: Repo연결 / 분석리포트 / 워크스페이스 / 커밋리뷰) — 빈 페이지만

### 데이터 저장
- `data/` 디렉토리 구조 생성 (`data/project.json`, `data/steps.json`, `data/documents/`, `data/messages/`, `data/checklist/`)
- `steps.json` seed 데이터 작성 — 9단계 고정 배열 (제작계획 3절 스키마 그대로)
- 파일 읽기/쓰기 유틸 함수 작성 (`readJson(path)`, `writeJson(path, data)`) + 간단한 mutex 처리

### 분석 엔진 (.NET) 셋업
- 로컬에 .NET SDK 설치 여부 확인 (`dotnet --version`)
- `tools/analyzer/` 에 `dotnet new console` 로 프로젝트 생성
- `Microsoft.CodeAnalysis.CSharp` NuGet 패키지 추가
- `dotnet run` 으로 "Hello World" 수준 동작 확인 (아직 분석 로직 없음, 셋업만)

**Day 1 완료 기준**: 프론트/백엔드 서버가 각각 로컬에서 뜨고, `dotnet run`이 에러 없이 실행된다.

---

## Day 2 — GitHub OAuth 앱 등록 & 로그인/콜백 구현

### OAuth App 등록
- GitHub Developer Settings에서 OAuth App 생성, Client ID/Secret 발급
- Authorization callback URL을 로컬 개발 주소로 등록 (`http://localhost:PORT/api/auth/github/callback`)
- 요청 스코프 확정: `repo` (private 포함 read/write) — "계정이 접근 가능한 모든 저장소가 범위에 들어간다"는 점을 로그인 버튼 근처에 안내 문구로 노출할 자리 미리 잡아두기

### 백엔드 API
- `GET /api/auth/github/login` 구현 — GitHub 인증 페이지로 리다이렉트 (`client_id`, `scope=repo`, `redirect_uri`, `state` 포함해 CSRF 방지)
- `GET /api/auth/github/callback` 구현
  - `state` 값 검증
  - `code`를 `POST https://github.com/login/oauth/access_token`으로 access token 교환
  - GitHub API `GET /user`로 로그인 계정 정보(로그인명, 아바타) 조회
  - `session.json`에 `{ github_login, github_avatar_url, access_token, expires_at }` 저장 (파일 권한 제한)
  - 프론트 Repo 연결 화면으로 리다이렉트
- `GET /api/auth/session` — 현재 로그인 상태 확인용 (프론트가 로드 시 호출)
- `POST /api/auth/logout` — `session.json` 삭제

### 프론트엔드
- `GithubLoginButton` 컴포넌트 — 미로그인 시 "GitHub로 로그인" 버튼, 클릭 시 `/api/auth/github/login`으로 이동
- 로그인 성공 후 리다이렉트되면 `/api/auth/session` 호출해 아바타+계정명 표시로 전환
- 로그인 범위 안내 문구("이 저장소들에 접근할 수 있어요" 수준) 배치

**Day 2 완료 기준**: "GitHub로 로그인" 버튼을 눌러 실제 GitHub 인증 화면으로 이동하고, 승인하면 콜백을 거쳐 로그인된 계정 정보가 화면에 표시된다.

---

## Day 3 — 저장소/Branch 선택 + 단계적 잠금(Progressive Lock) UI

### 백엔드
- `GET /api/repo/list` 구현 — 세션의 access token으로 `GET /user/repos` 호출, 이름/private 여부/default branch만 추려 반환 (페이지네이션 고려 — 저장소 많은 계정 대비 `per_page`, `page` 파라미터)
- `GET /api/repo/:fullName/branches` 구현 — 저장소 선택 시 branch 목록 조회

### 프론트엔드 — 프로토타입 로직을 OAuth 흐름에 맞게 이식
- `RepoSelect` 컴포넌트 — 로그인 전 `disabled`, 로그인 성공 시 활성화 + 저장소 목록으로 채움 (검색 가능하면 더 좋음)
- `BranchSelect` 컴포넌트 — 저장소 미선택 시 `disabled`, 저장소 선택 시 해당 branch 목록으로 채움
- 저장소 선택 → Branch 선택 → 분석 프리셋 활성화까지 이어지는 단계적 잠금 로직 구현 (UI Spec 2절 표 그대로: 로그인→저장소→Branch→프리셋 순서로 하나씩 풀림)
- 로딩 상태(저장소 목록 불러오는 중, Branch 불러오는 중) 표시

**Day 3 완료 기준**: 로그인 후 저장소 드롭다운에 실제 내 저장소 목록이 뜨고, 하나를 선택하면 그 저장소의 실제 Branch 목록이 자동으로 채워진다.

---

## Day 4 — 분석 프리셋 선택 + 분석 시작 API 뼈대

### 프론트엔드
- `AnalysisPresetPicker` 컴포넌트 — 빠름/기본/상세 라디오 카드 (프로토타입 마크업 그대로 이식)
- Branch 선택 완료 시에만 이 섹션 활성화되도록 연결
- "연결 및 분석 시작" 버튼 — 확인 완료 + 프리셋 선택 시에만 활성화

### 백엔드
- `POST /api/analysis/start` 뼈대 구현
  - Request: `{ repoId, branch, preset }`
  - 실제 분석 로직은 2주차 작업이므로, 이번 주는 **요청을 받아서 `data/project.json`에 상태만 저장**하는 수준으로 스텁 처리 (`status: "queued"`)
  - `project.json`에 `repo_url`, `branch`, `analysis_preset`, `connected_at` 필드 기록
- 분석 시작 성공 시 프론트를 분석 리포트 화면으로 라우팅 (리포트 내용 자체는 2주차 전까지는 더미/placeholder)

**Day 4 완료 기준**: 로그인 → 저장소 선택 → Branch 선택 → 프리셋 선택 → "분석 시작" 클릭까지 전체 흐름이 끊기지 않고 이어진다 (분석 결과 자체는 아직 가짜여도 됨).

---

## Day 5 — Roslyn 스캐폴딩 마무리 + 통합 점검 + 버퍼

### 분석 엔진 최소 동작 확인 (2주차 본작업 전 사전 준비)
- `tools/analyzer/Program.cs`에 더미 로직 작성: 임의 폴더의 `.cs` 파일 개수만 세서 JSON으로 출력 (`{ "fileCount": N }` 수준)
- Express에서 `child_process.spawn('dotnet', [...])`으로 이 더미 분석기를 실행하고 stdout을 파싱하는 코드 작성 — **실제 분석 로직 없이 "연결이 되는지"만 확인**
- `POST /api/analysis/start`에서 이 더미 spawn 호출까지 연결해보기 (2주차 진짜 로직으로 교체하기 쉽게 인터페이스만 맞춰둠)

### 통합 점검
- Day 1~4에서 만든 전체 흐름 수동 E2E 테스트: 로그인 → 저장소 선택 → Branch 선택 → 프리셋 선택 → 분석 시작
- 에러 케이스 최소 확인: 로그인 거부/취소, 저장소 목록 조회 실패, private 저장소 접근 등 각각 에러 메시지가 사용자에게 보이는지
- 코드 정리 — 이번 주 작성한 컴포넌트/라우트에 최소한의 주석, 파일 구조 README 업데이트

### 버퍼
- 위 일정 중 밀린 항목 처리
- 2주차(분석 엔진 본구현) 착수 전 짧은 회고: 이번 주 예상보다 오래 걸린 부분이 있었다면 4주 일정에 미리 반영

**Day 5 완료 기준**: 1주차 마일스톤("셋업 + Repo 연결 화면 풀 구현")이 실제로 동작하는 상태로 데모 가능하다.

---

## 이번 주에 하지 않는 것 (범위 밖 — 다음 주로 넘김)

- Roslyn 분석기의 실제 클래스/의존성 파싱 로직 (Day 5는 더미 스텁까지만)
- `jscpd` 중복 코드 탐지 연동
- 분석 리포트 화면의 실제 통계 카드/Markdown 렌더링 (2주차)
- Claude API 연동 전체 (3주차)
- GitHub 커밋 기능 (4주차)
