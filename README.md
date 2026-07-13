# 소상공인 정부 지원금 큐레이터

정부 지원금 정보가 여러 기관 사이트에 흩어져 있어, 소상공인이 자신에게 맞는
지원금을 한눈에 파악하기 어려운 문제를 해결하는 서비스입니다.

## 문제 정의

> 소상공인이 정부 지원금을 찾을 때, 정보가 각 기관·사이트에 흩어져 있어
> 내게 맞는 지원금을 한눈에 파악하기 어렵다.

## 핵심 기능

- **조건 매칭 + 정렬 추천**: 업종/지역/직원수/연매출(와이어프레임 UI) 입력 후
  매칭도순 · 마감임박순 · 지원금액순으로 지원금 추천
- **지원금 상세정보 및 신청 연결**: 상세 조건·필요 서류 확인 후 해당 기관 사이트로 연결

## 기술 스택

| 영역 | 사용 기술 |
|---|---|
| 프론트엔드 | React 19 + TypeScript + Vite |
| 백엔드 / API | Express 4 + TypeScript |
| 공유 타입 | `shared/` (TypeScript) |
| 데이터 저장 | Supabase (Postgres) — 1주차 연동 예정 |
| 크롤러 | Node.js + Cheerio — `crawler/` (1주차 생성 예정) |
| 데이터 수집 스케줄링 | GitHub Actions (cron) |
| 배포 | Vercel(프론트) + API 호스트 TBD |

## 데이터 출처

- [기업마당](https://www.bizinfo.go.kr) — MVP 1순위 데이터 소스

## 현재 범위 (MVP)

- ✅ 조건 기반 지원금 매칭·정렬
- ✅ 지원금 상세 정보 + 외부 신청 링크 연결
- ❌ 관심 지원금 저장 / 마감 알림 (UI placeholder만, 추후 확장)
- ❌ 서비스 내 신청서 작성 (외부 사이트로 이동)
- ❌ 로그인 / 회원 시스템

## 문서

| 파일 | 내용 |
|------|------|
| [`CLAUDE.md`](./CLAUDE.md) | 에이전트·개발 맥락 (구조, 컨벤션, 결정 사항) |
| [`docs/plan.md`](./docs/plan.md) | 기획서 (문제 정의, MVP 범위, 화면 흐름) |
| [`docs/checklist.md`](./docs/checklist.md) | 주차별 개발 체크리스트 |
| [이번 주 개발 대시보드](https://github.com/syd348/hub/issues?q=is%3Aissue%20milestone%3A%22Week%202%20Vertical%20Slice%22%20sort%3Acreated-asc) | Week 2 이슈 카드 보드 |
| [`prototype/gov_subsidy_home_wireframe.html`](./prototype/gov_subsidy_home_wireframe.html) | UI/UX 와이어프레임 |
| [`.cursor/skills/gov-subsidy-design/`](./.cursor/skills/gov-subsidy-design/) | 디자인 구현 Skill |

> **plan.md vs 와이어프레임**: 기획서는 업력(연차)·신용도를 정의하고, 와이어프레임 UI는
> 연매출·4스텝 온보딩 기준입니다. 통합 방침은 `CLAUDE.md` 및 디자인 Skill 참고.

## 로컬 실행

```bash
git clone <repo-url>
cd hub
npm install
cp .env.example .env
npm run dev          # client :5173 + server :3001
```

- API 헬스체크: `GET http://localhost:3001/api/health`
- 지원금 샘플: `GET http://localhost:3001/api/subsidies`

## 스크립트

| 명령 | 설명 |
|------|------|
| `npm run dev` | 클라이언트 + 서버 동시 실행 |
| `npm run dev:client` | Vite만 |
| `npm run dev:server` | Express만 |
| `npm run build` | 서버 + 클라이언트 빌드 |
| `npm run lint` | oxlint |

`npm run crawl` — 1주차 크롤러 추가 후 사용 가능
