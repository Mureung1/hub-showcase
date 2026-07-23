---
name: weekly issues plan
overview: 이번 주 목표를 월-금 실행 계획으로 나누고, GitHub Issues를 카드형 대시보드처럼 관리하도록 이슈/마일스톤/README 링크를 생성합니다. 핵심 수직 슬라이스는 조건 입력부터 Supabase 저장·조회, Express API, React 화면 갱신까지 한 사이클을 완성하는 흐름으로 둡니다.
todos:
  - id: labels-milestone
    content: Create GitHub milestone and labels for Week 2 issue dashboard
    status: pending
  - id: create-issues
    content: Create 10 ordered GitHub issues with goals, completion criteria, priority, day, and validation
    status: pending
  - id: readme-link
    content: Add the GitHub Issues dashboard link to README.md
    status: pending
  - id: verify-dashboard
    content: Verify the README link and issue filters point to the planned cards
    status: pending
isProject: false
---

# Week 2 GitHub Issues Plan

> **진행 현황 갱신: 2026-07-22 (#9까지 머지 완료, #10 진행 중)**  
> 아래 [진행 현황 요약](#진행-현황-요약-2026-07-16) 참고.

## 진행 현황 요약 (2026-07-16)

### 이슈 상태

| # | 이슈 | 요일 | 상태 | 비고 |
|---|------|------|------|------|
| 1 | 수직 슬라이스 범위 + 이슈 대시보드 | 월 | ✅ CLOSED | README 대시보드 링크 있음 |
| 2 | 계획 수립 Agent 산출물 | 월 | ✅ CLOSED | |
| 11 | FE 기본 골격/온보딩/홈 mock | 월 | ✅ CLOSED | PR #15 머지 |
| 12 | FE 상세/공용컴포넌트/데이터계층 | 화 | ✅ CLOSED | **일부 항목 미완** (아래 화요일 TODO 참고) |
| 17 | PR CI + commitlint | (추가) | ✅ 머지 | `pr-checks.yml`, husky |
| 18 | GitHub Actions Pages 배포 | (추가) | ✅ 머지 | `syd348.github.io/hub/` |
| 3 | Supabase 스키마 + env | 화 | ✅ CLOSED | PR #20 머지 |
| 4 | Express 매칭 API → Supabase | 화 | ✅ CLOSED | PR #21 머지, 시드 8건 확장 |
| 5 | React 핵심 화면 mock | 수 | ✅ CLOSED | GitHub에서 이미 CLOSED 확인 — #11·#12로 완료 기준(Welcome→온보딩→완료→홈 끊김 없음, 모바일 레이아웃 유지) 충족 |
| 6 | FE ↔ Express API 연결 | 수 | ✅ CLOSED | PR #22 머지 — `client.ts` 정리 + 프록시 통한 실제 API 응답 확인 |
| 7 | DB 저장 사이클 | 목 | ✅ CLOSED | PR #23 머지 — `match_requests` 테이블 + best-effort insert + FE 연결 |
| 8 | 기능 검증 Agent 산출물 | 목 | ✅ CLOSED | PR #25 머지 — `day6-verification-agent.md` |
| 9 | 통합 검증 및 버그 수정 | 금 | ✅ CLOSED | PR #26 머지 — `sort=new` 버그 수정, stale 주석 정리 |
| 10 | 학습 회고 및 PR 정리 | 금 | 🔶 진행 중 | `day1-presentation.md`을 한 주 전체 회고로 확장 중 |

### 캠퍼스 레포 (별도)

- PR #1169 (`syd348/hub` → `N106_신서연`): **OPEN** — 자동 머지 실패(포크 PR 권한), **수동 머지 필요**

---

## 기준
- 대상 저장소: `syd348/hub`, 현재 브랜치: `feature`
- 핵심 시나리오: `온보딩 조건 입력 -> 매칭 API 요청 -> Express 처리 -> Supabase 저장/조회 -> React 결과 화면 갱신`
- 대시보드 방식: GitHub Issues 마일스톤 + 라벨 + README 링크
- README 링크: `[이번 주 개발 대시보드](https://github.com/syd348/hub/issues?q=is%3Aissue%20milestone%3A%22Week%202%20Vertical%20Slice%22%20sort%3Acreated-asc)` 형태로 추가

## 생성할 GitHub 관리 단위
- Milestone: `Week 2 Vertical Slice`
- 공통 라벨: `week-2`, `vertical-slice`, `agent-work`
- 우선순위 라벨: `priority:P0`, `priority:P1`, `priority:P2`
- 요일 라벨: `day:mon`, `day:tue`, `day:wed`, `day:thu`, `day:fri`
- 영역 라벨: `area:planning`, `area:db`, `area:server`, `area:client`, `area:validation`, `area:docs`

## 이슈 카드 구성
각 이슈 본문은 짧게 유지합니다.
- `목표`: 무엇을 하는지
- `완료 기준`: 무엇이 되면 끝인지
- `순서/우선순위`: 예: `01 / P0 / 월요일`
- `검증`: 필요한 확인 방법

## 월~금 상세 진행 기록

구현 세부(어떤 파일을 만들었는지, 어떤 버그를 어떻게 고쳤는지)는 아래 day-N 문서에만 있다.
여기는 이슈별 한 줄 요약 + 링크만 남긴다 (중복 방지 — 자세한 건 항상 링크를 따라갈 것).

- **월 (#1·#2·#11)** — 라우트/AppShell/온보딩/홈 mock 골격. 완료 기준: mock만으로
  Welcome→온보딩→완료→홈 흐름 동작. 상세: [`day1-mon.md`](week2/day1-mon.md)
- **화 (#12)** — 상세 화면, 공용 컴포넌트, TanStack Query + API client 계층. 완료 기준:
  홈→상세→외부신청 흐름 동작, FE 데이터 계층 준비. 검증 중 `getSubsidy` 404 처리 버그 발견·수정.
  상세: [`day2-verification-checklist.md`](week2/day2-verification-checklist.md)
- **화~수 (#3·#4·#6)** — Supabase 스키마 연결, 매칭 API 전환, FE-Express 실연결. 시드 데이터
  2건→8건 확장. 상세: [`day3-supabase-setup.md`](week2/day3-supabase-setup.md),
  [`day4-match-api-plan.md`](week2/day4-match-api-plan.md),
  [`day5-fe-api-connect-plan.md`](week2/day5-fe-api-connect-plan.md)
- **목~금 (#7·#8·#9·#10)** — DB 쓰기 사이클, 검증 문서화, 통합 검증, 회고. 상세:
  [`day6-remaining-work-plan.md`](week2/day6-remaining-work-plan.md),
  [`day6-verification-agent.md`](week2/day6-verification-agent.md),
  [`retrospective.md`](week2/retrospective.md)

남은 리스크(공통): 매칭 조건 필터(업종/지역)는 스키마에 구조화 컬럼이 없어 정렬 위주로만
동작 — 3주차 매칭 알고리즘 범위로 이관.

### 추가 완료 (플랜 외 · 인프라)
- [x] GitHub Actions Pages 자동 배포 (`deploy-pages.yml`, `build:client`, `/hub/` base)
- [x] 데모 회고 문서 (`docs/week2/day1-presentation.md`, `docs/week2/retrospective.md`)
- [x] 로컬 husky `commit-msg` 훅(commitlint) — 단, PR 시점 자동 CI(`pr-checks.yml`)는 실제로는
  존재한 적 없었음(`.github/`가 `.gitignore` 대상이었던 게 Week 3에서 밝혀짐). 상세:
  [`day1-presentation.md`](week2/day1-presentation.md#3-pr-ci--commitlint)

## 월-금 이슈 목록
1. `[01/P0/월] 이번 주 수직 슬라이스 범위 확정 및 이슈 대시보드 구성`
   - 목표: 핵심 시나리오를 확정하고 이슈/마일스톤/라벨/README 링크를 만든다.
   - 완료 기준: README에서 Week 2 대시보드 링크로 이슈 목록에 접근할 수 있다.

2. `[02/P0/월] 계획 수립 전용 Agent 산출물 작성`
   - 목표: 요구사항을 작업 단위로 나누고 우선순위를 정하는 Agent 사용 가이드를 만든다.
   - 완료 기준: 계획 Agent가 입력/출력/체크 기준을 가진 문서 또는 프롬프트로 남는다.

3. `[03/P0/화] Supabase subsidies 테이블 스키마와 환경 변수 연결`
   - 목표: 한 테이블에 지원금 데이터를 저장·조회할 수 있는 DB 기반을 만든다.
   - 완료 기준: 로컬 서버가 Supabase URL/key로 연결되고 샘플 row를 조회할 수 있다.

4. `[04/P0/화] Express 매칭 API를 Supabase 조회 기반으로 전환`
   - 목표: `GET /api/subsidies` 또는 `POST /api/match`에서 조건/정렬을 처리한다.
   - 완료 기준: 업종/지역/직원수/매출 조건과 정렬 옵션으로 DB 결과가 반환된다.

5. `[05/P0/수] React 핵심 화면을 mock 데이터로 먼저 구현`
   - 목표: 온보딩 입력, 결과 리스트, 상세 진입 흐름을 컴포넌트/state로 만든다.
   - 완료 기준: API 없이 mock 데이터만으로 조건 입력 후 결과 화면 전환이 가능하다.

6. `[06/P0/수] 프론트엔드와 Express API 실제 연결`
   - 목표: 화면 입력값을 API 요청으로 보내고 응답으로 리스트/상세 화면을 갱신한다.
   - 완료 기준: Vite proxy `/api/*`를 통해 서버 응답이 화면에 반영된다.

7. `[07/P1/목] DB 저장 사이클 완성: 사용자 조건 또는 조회 로그 저장`
   - 목표: 화면 요청이 서버를 거쳐 Supabase 한 테이블에 저장되는 쓰기 흐름을 완성한다.
   - 완료 기준: 사용자가 조건을 제출하면 Supabase에 기록되고, 성공 응답 후 화면 상태가 바뀐다.

8. `[08/P1/목] 기능 검증 전용 Agent 산출물 작성 및 체크리스트 적용`
   - 목표: 요구사항대로 동작하는지 점검하는 Agent 프롬프트/체크리스트를 만든다.
   - 완료 기준: FE-BE-DB 수직 슬라이스를 검증하는 항목과 실행 절차가 문서화된다.

9. `[09/P1/금] 통합 검증 및 버그 수정`
   - 목표: 핵심 시나리오를 처음부터 끝까지 실행하고 깨지는 부분을 고친다.
   - 완료 기준: `npm run lint`, `npm run build`, 수동 시나리오 검증 결과가 정리된다.

10. `[10/P2/금] 학습 회고 및 PR 정리`
    - 목표: Agent 활용, 이해한 부분, 아직 모호한 부분을 PR 템플릿에 맞춰 정리한다.
    - 완료 기준: PR 설명 초안 또는 `docs/pr/` 문서에 검증 결과와 학습 내용을 남긴다.

## 실행 순서
1. GitHub 라벨과 마일스톤을 만든다.
2. 위 10개 이슈를 순서대로 생성하고 각 이슈에 milestone/labels를 붙인다.
3. README의 문서 섹션 또는 상단 소개 아래에 Week 2 개발 대시보드 링크를 추가한다.
4. 이슈 생성 후 README 링크가 실제 GitHub 필터 결과로 열리는지 확인한다.

## 구현 단계에서 참고할 주요 파일
- [`CLAUDE.md`](CLAUDE.md): 확정 스택, MVP 범위, 라우트/API 기준
- [`docs/plan.md`](docs/plan.md): 핵심 사용자 시나리오와 기능 A/B
- [`README.md`](README.md): 대시보드 링크를 추가할 공개 진입점
- [`server/src/routes/subsidies.ts`](server/src/routes/subsidies.ts): 현재 샘플 데이터 API, DB 연동 전환 대상
- [`shared/src/types/subsidy.ts`](shared/src/types/subsidy.ts): FE/BE 공유 타입 확장 시작점
- [`src/App.tsx`](src/App.tsx): 현재 소개 화면만 렌더링, 이후 라우팅/화면 연결 대상