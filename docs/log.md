# 작업 로그 (Log)

날짜별로 진행한 작업, 이슈, 다음 할 일을 기록합니다.

## 템플릿
### YYYY-MM-DD
- 진행한 작업:
- 이슈/막힌 점:
- 다음 할 일:

---

### 2026-07-15
- 진행한 작업:
  - 이슈 #5 대부분 완료 (캐시·ApiUsage만 금요일분으로 남음): GitHub GraphQL 클라이언트(`config/github.js`) → `githubService`(쿼리 1개로 언어·활동·레포 수집, 404/429 매핑) → `analysisService`(언어 비율·skillLevel·활동 요약) → `POST /api/analysis` 라우트 연결
  - FE 분석 흐름 실제 API 연동: `createAnalysis` fetch 교체, 분석 실패 화면 추가 (추천 목록·상세는 mock 유지)
  - 언어 비율 로직 교체: 레포 바이트 → **최근 12개월 커밋 수 가중** ([decisions.md](decisions.md) 기록). 본인 계정 Swift 43% → Java 47%로 체감 일치, 조직 레포 누락 해소
  - 프로필 레포 표시 신설: `recentRepos`(1년·소속 조직 포함·커밋 수) / `contributionHistory`(평생·외부만·스타순) 분리 ([decisions.md](decisions.md) 기록). kakao/actionbase ⭐222가 기여 이력 1위로 노출
  - 로고 교체: 파란 PR 심볼 (파비콘 + 랜딩 로고 마크), OSS 기여 뱃지/추천 가중치 아이디어는 이슈 #5 코멘트로 기록
- 이슈/막힌 점:
  - `.env`는 `node --watch`가 감지 못 함 → 토큰 추가 후 서버 재시작 필요했음
  - 백그라운드로 띄운 테스트 서버의 자식 프로세스가 살아남아 3000 포트를 점유 → 재시작해도 옛 프로세스가 응답하던 문제 (taskkill /T로 해결)
  - Chrome이 SVG 파비콘 렌더 실패(지구본) → PNG로 교체. 파비콘 링크는 Vite base(`/hub/`) 때문에 상대경로 필수
  - GraphQL `orderBy: STARGAZERS`가 정렬 미보장 → 코드에서 직접 정렬. `organizations` 조회는 read:org 스코프 필요(토큰 스코프 업데이트)
- 다음 할 일:
  - (목) 이슈 #5 마감: Analysis 캐시(24h) + ApiUsage 기록 + 에러/유효성 마무리
  - (목) 노션 태스크 보드 동기화
  - dev → main 푸시는 내일 아침 확인 후

### 2026-07-14
- 진행한 작업:
  - 이슈 #3 완료: FE mock 데이터 연결 — `src/mocks/` 4종(빈 분석 포함), `src/api/` 데이터 레이어(W3 교체 지점), 7화면 하드코딩 제거 + Outlet context 상태 공유, 분석중/이슈검색 자동 전환, 프로필 빈 상태 UI
  - 이슈 #4 완료: Supabase 연결 + Prisma 스키마 — 테이블 6개 마이그레이션 적용, Client 싱글턴(`src/config/prisma.js`), 부팅 시 연결 성공 로그 (DB 없어도 서버는 부팅)
  - LLM 이슈 분석 기능 결정: 경량 LLM API(제공자 W3 확정) + 지연 생성 + `issue_cache` 캐싱 ([decisions.md](decisions.md) 기록, openapi.yaml에 옵셔널 필드 추가, 이슈 #6 등록)
- 이슈/막힌 점:
  - Prisma 7이 스키마 내 `url = env(...)` 를 금지(driver adapter 필수)해서 표준 워크플로가 유지되는 Prisma 6으로 고정
  - `.env`의 DATABASE_URL 구분자 실수(`:`) 확인 과정에서 DB 비밀번호가 터미널에 노출 → Supabase 비밀번호 리셋 필요
- 다음 할 일:
  - Supabase DB 비밀번호 리셋 + `backend/.env` 갱신
  - (수~금) 이슈 #5: 프로필 분석 API (`POST /api/analysis`) — GitHub 토큰 발급부터
  - (W3) 이슈 #6: LLM 이슈 분석 — 제공자 선정부터

### 2026-07-13
- 진행한 작업:
  - 주간 계획 수립 → GitHub 이슈 #1~#5 등록 (날짜별, 토·일 제외)
  - DB 전환 결정: MongoDB → Supabase(PostgreSQL) + Prisma ([decisions.md](decisions.md) 기록). Spring Boot 검토 후 Node.js 유지 결정도 기록
  - 이슈 #1 완료: API 명세 4개 확정 — [openapi.yaml](openapi.yaml) 작성(공통 에러 형식, 활동 없는 사용자 200 빈 분석), [architecture.md](architecture.md) 요약표
  - 이슈 #2 완료: Express 스캐폴딩 — `server/` 독립 패키지, 레이어드 구조, `/health`, 404·500 공통 에러 핸들러, winston 로거, `/api-docs` Swagger 서빙(파일 부재 폴백)
  - 노션 태스크 보드 동기화 (FE 완료분 9개 체크, 스택 변경 반영)
  - 디렉토리 구조 개편: `frontend/` / `backend/` 독립 패키지로 분리, 루트 `package.json` 프록시 스크립트 구성 (`npm run dev`, `dev:backend` 등)
  - README에 GitHub 이슈 트래커 링크 추가
  - 업스트림 PR 제출 (API 명세 확정 + Express 스캐폴딩 + frontend/backend 구조 분리)
- 이슈/막힌 점:
  - main은 대회 운영진(crong) 관리 브랜치 → 직접 푸시 금지, 원격 반영은 `N034_김선호` 브랜치로 확정
  - 원격 N034 브랜치에 auto-merge 봇 커밋이 쌓여 있어 pull 머지 후 푸시 필요했음
- 다음 할 일:
  - (화) 이슈 #3: FE mock 데이터 연결 — openapi.yaml example에서 mock JSON 생성, 빈 분석 mock 포함
  - (화) 이슈 #4: Supabase 프로젝트 생성 + Prisma 스키마 6테이블 (`prisma migrate dev`)
  - (수~금) 이슈 #5: 프로필 분석 API — GitHub 토큰 발급부터
