# CI/CD 파이프라인

> **상태: 확정 (2026-07-08).** CI는 `.github/workflows/ci.yml`로 구축 완료. CD(Vercel)는 설계만 확정하고 실행은 CHECKLIST T17에서 한다 — 코드 착수 전이므로 배포할 산출물이 아직 없다.

## 전체 흐름

```
로컬 커밋 (훅: 일괄 스테이징 차단 + oxlint)
   → push → GitHub Actions CI (린트 → 타입체크+빌드 → 테스트)
      → PR (과제 템플릿 + 리뷰)
         → 머지 → Vercel 자동 배포 (T17 이후 — 프리뷰/프로덕션)
```

세 겹의 검증이 각자 다른 시점을 지킨다: **로컬 훅**(커밋 순간) → **CI**(push/PR마다, 깨끗한 환경에서 재현) → **배포 전 프리뷰**(머지 전 실물 확인).

## CI — GitHub Actions (`.github/workflows/ci.yml`)

| 항목 | 내용 |
|---|---|
| 트리거 | 모든 브랜치 push + 모든 PR. 같은 브랜치에 연속 push 시 이전 실행 취소(concurrency) |
| 단계 | `npm ci` → `npm run lint`(oxlint) → `npm run build`(tsc -b + vite build = 타입체크 겸용) → 테스트 |
| 테스트 단계 | `package.json`에 `test` 스크립트가 **있을 때만 실행**. T1(Vitest 도입)에서 스크립트가 생기면 CI가 자동으로 테스트를 돌리기 시작한다 — 워크플로 수정 불필요 |
| 통과 기준 | 전 단계 성공. CLAUDE.md 커밋 규칙("각 커밋은 독립적으로 빌드·린트 통과")의 원격 강제판 |

기존 `auto-merge.yml`(과제 제공 워크플로 — 매일 13:00 UTC에 비-main 타겟 PR 자동 머지)은 건드리지 않는다. CI는 그와 독립적으로 동작한다.

## 브랜치 · PR (과제 컨벤션)

- 작업 브랜치: `N166_진현지` (origin = 개인 fork `Catsmanager/hub`, upstream = 과제 조직 저장소)
- PR 타이틀: `[N166_진현지] 한 문장 요약`, 본문은 `.github/pull_request_template.md`의 4개 섹션 — 작성 절차는 `/pr` 스킬을 따른다
- 커밋·푸시는 사용자가 요청할 때만 (CLAUDE.md 규칙)

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

1. Vercel에 GitHub 저장소 연결, 프레임워크 Vite 자동 감지 확인
2. Production Branch 지정 + 프리뷰 배포 동작 확인 (목 상태 1차 배포 — CHECKLIST T17)
3. `ANTHROPIC_API_KEY` 환경변수 등록은 T18(프록시 함수) 시점에
4. 배포된 프리뷰 URL을 PR에 첨부하는 습관 — 리뷰어가 실물 확인

## 이후 단계 (MVP Out)

운영 단계 도구(Sentry 에러 추적, GA/Amplitude 지표, 대시보드)는 MVP 범위 밖 — 피드백 루프·로깅 도입(PRD 이후 단계)과 함께 검토한다.
