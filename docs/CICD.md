# CI/CD 파이프라인

> **상태: CI 재설치·실물 확인 대기, Vercel Production Branch·Preview 배포 확인 (2026-07-20).** `main`의 `verify` required check 설정은 남아 있지만 `0bb4e6e`에서 `ci.yml`이 추적 제거되어 현재 push에는 check를 생성할 워크플로가 없다. Vercel Production은 `N166_진현지`를 배포하며, 비프로덕션 `t17-preview-t19`의 deployment `5516596997`도 `Preview / success`다. CI 재추적은 구조 변경 승인 대기이고 Production·Preview의 JavaScript 후 S0 실물 확인도 남아 있다.

## 전체 흐름

```
로컬 커밋 (훅: 일괄 스테이징 차단 + oxlint)
   → push → GitHub Actions CI (린트 → 클라이언트+API 타입체크 → 빌드 → 테스트)
      → PR (과제 템플릿 + 리뷰)
         → 머지 → Vercel 자동 배포 (Production 활성, Preview 실물 검증 대기)
```

목표 검증 구조는 세 겹이다: **로컬 훅**(커밋 순간) → **CI**(push/PR마다, 깨끗한 환경에서 재현) → **배포 전 프리뷰**(머지 전 실물 확인). 현재 로컬 훅과 Vercel Production/Preview 자동 배포는 동작한다. 과거 CI run은 성공했지만 현재 기본·Preview 브랜치 커밋 트리에는 `ci.yml`이 없으며 SHA `86d5b9f`에도 Actions run은 0건이다. 따라서 아래 CI 표는 재설치할 목표 계약이고, 설치 완료로 표현하지 않는다.

## CI 설계 — GitHub Actions (`.github/workflows/ci.yml`, 재설치 승인 대기)

| 항목 | 내용 |
|---|---|
| 트리거 | 모든 브랜치 push + 모든 PR. 같은 브랜치에 연속 push 시 이전 실행 취소(concurrency) |
| 런타임 | Vite 8 호환 Node(`^20.19.0 || >=22.12.0`)를 저장소와 CI에서 같은 버전으로 고정 |
| 단계 | `npm ci` → `npm run lint` → 클라이언트+API 타입검사 → `npm run build` → `npm test` |
| API 경계 | T18에서 `tsconfig.api.json`과 API 핸들러 테스트를 추가했다. 재설치할 워크플로에는 `npm run typecheck:api`를 명시적으로 포함해야 함 |
| 통과 기준 | 전 단계 성공 + 대상 브랜치의 required status check 지정. 워크플로 파일 존재만으로 원격 강제라고 부르지 않음 |

기존 `auto-merge.yml`(과제 제공 워크플로 — 매일 13:00 UTC에 비-main 타겟 PR 자동 머지)은 건드리지 않는다. CI를 도입할 때 required status check가 자동 머지에도 적용되는지 확인한다. 워크플로 추가는 원격 동작을 바꾸는 구조 변경이므로 별도 제안·승인 후 수행하고, 실제 GitHub Actions 성공과 브랜치 규칙을 확인한 뒤에만 설치 완료로 기록한다.

현재 로컬 `ci.yml`은 `.gitignore`의 `.github/workflows/` 규칙에 의해 제외된다. 재설치 승인 시 해당 제외 규칙을 제거하고 `ci.yml`만 명시적으로 추적한 뒤 비프로덕션 push에서 `verify` 성공을 확인한다.

## 브랜치 · PR (과제 컨벤션)

- 작업 브랜치: `N166_진현지` (origin = 개인 fork `Catsmanager/hub`, upstream = 과제 조직 저장소)
- PR 타이틀: `[N166_진현지] 한 문장 요약`, 본문은 `.github/pull_request_template.md`의 4개 섹션 — 작성 절차는 `/pr` 스킬을 따른다
- 커밋·푸시는 사용자가 요청할 때만 (AGENTS.md 규칙)

## CD — Vercel (T17에서 실행)

**방식 확정: Vercel Git 연동 (자동 배포).** GitHub Actions에서 Vercel CLI로 배포하는 방식은 토큰 시크릿 관리가 추가로 필요해 MVP에서는 채택하지 않는다 — Git 연동이면 설정 0줄로 아래를 전부 얻는다.

| 항목 | 설계 |
|---|---|
| 프로덕션 | 기준 브랜치(Vercel 프로젝트 설정의 Production Branch — T17에서 `N166_진현지`로 지정) push 시 자동 배포 |
| 프리뷰 | 그 외 브랜치 push·PR마다 고유 URL 자동 생성 — 머지 전 실물 확인용 |
| 서버리스 함수 | `/api/generate` 1개 (SPEC 2장 계약) — 저장소의 `api/` 디렉터리를 Vercel이 자동 인식 |
| 환경변수 | `ANTHROPIC_API_KEY`는 **Vercel 프로젝트 환경변수로만** 보관. 저장소·클라이언트 코드에 절대 넣지 않는다 (EDGE_CASES 5-1). 로컬은 `.env.local`(gitignore의 `*.local`로 이미 제외) |
| 롤백 | Vercel Instant Rollback — 대시보드에서 직전 배포로 즉시 전환. 별도 구축 불필요 |

### T17 실행 체크리스트 (그 시점에 이 표대로)

1. Node 버전을 저장소에 고정하고 깨끗한 환경에서 `npm ci`·전체 검증 재현
2. 별도 승인 후 CI 추가, 실제 성공 실행과 required status check·자동 머지 관계 확인
3. Vercel에 GitHub 저장소 연결, 프레임워크 Vite 자동 감지 확인
4. Production Branch 지정 + 프리뷰 배포 동작 확인 (목 상태 1차 배포 — CHECKLIST T17)
5. `/api/interaction`의 same-origin 요청과 `waitUntil()` background write를 Preview에서 검증하고 보존 기간·집계 query를 기록(T24). 원문·후보·사용자/세션 ID는 저장하지 않음
6. `ANTHROPIC_API_KEY` 환경변수 등록은 T20(실 provider 전환) 시점에 Preview부터 수행. T18 provider 비종속 프록시 기반에는 키를 요구하지 않음
7. 배포된 프리뷰 URL을 PR에 첨부해 리뷰어가 실물을 확인하고, COMPETITIVE_VALIDATION의 T22 짧은 사람 대상 비교는 같은 버전의 고정 URL에서만 수행. T20 실 provider 품질 진행 전 무참여자 모델 벤치마크는 T25 통과 콘텐츠 버전을 별도로 고정

## 이후 단계 (MVP Out)

운영 단계 도구(Sentry 에러 추적, GA/Amplitude 지표, 대시보드)는 MVP 범위 밖 — 피드백 루프·로깅 도입(PRD 이후 단계)과 함께 검토한다.
