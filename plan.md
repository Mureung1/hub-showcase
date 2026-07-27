# plan.md — 챌린지로그 웹앱 실행 계획

> `@plan.md`로 에이전트에게 Task를 지시할 때 이 문서를 참조합니다.
> 완료 검증은 [checklist.md](./checklist.md)와 함께 사용합니다.

## 아키텍처 개요

```
[Browser / PWA]
  React (Vite) ── REST API ── Express (TypeScript) ── PostgreSQL (Prisma)
                              └── S3 (이미지)
                              └── LLM API (AI 데일리 케어)
```

- **프론트엔드**: React SPA, 이후 PWA·Web Push 확장
- **백엔드**: Express REST API, TypeScript, Prisma, JWT 인증
- **시간 기준**: KST(Asia/Seoul), 챌린지·기록은 날짜 단위

---

## Task 종속 관계

```
Task 0 (프로젝트 셋업)
  └── Task 1 (UI 기반·라우팅)
        └── Task 2 (인증)
              ├── Task 3 (챌린지·기록)
              │     ├── Task 4 (캘린더)
              │     └── Task 6 (AI 데일리 케어)
              └── Task 5 (친구 방)
                    └── Task 7 (알림)
```

---

## 4주 로드맵

> 2026-07-10 기준. 혼자 개발, 4주 안에 MVP 전체(Task 0~7) 완료가 목표.

| 주차 | 기간 | Task | 주말 목표 |
|---|---|---|---|
| Week 1 | 07/10~07/16 | Task 0 마무리 + Task 1 | 5개 화면 라우팅 동작, 모바일 레이아웃 확인 |
| Week 2 | 07/17~07/23 | Task 2 + Task 3 착수 | 로그인 되고 오늘의 챌린지 API 연동 |
| Week 3 | 07/24~07/30 | Task 3 마무리 + Task 4 + Task 5 착수 | 기록 루프 완성, 캘린더 조회, 친구 방 생성·참여 |
| Week 4 | 07/31~08/06 | Task 5 마무리 + Task 6 + Task 7 + QA | MVP 전체 기능 동작, 품질 게이트(`typecheck`/`lint`/`build`) 통과 |

매주 시작 시 `checklist.md`에서 지난 주 목표 달성 여부를 확인합니다.

### Week 1 상세 계획 (07/13 월 ~ 07/17 금)

> **코스 주간목표**: Agent와 함께 핵심 기능(수직슬라이스) 하나를 FE·BE·DB까지 완전히 연결해 완성한다.
> 이번 주 수직슬라이스 대상 = **회원가입 → 로그인 → 로그인 상태 확인(`/auth/me`)** (`plan.md` Task 2).
> 화면 전체(홈/기록/캘린더/방/설정) UI 이식은 이 슬라이스 완성 후 다음 주로 미룬다 — 관련 이슈([#4](https://github.com/parkjihyoun/hub/issues/4)~[#10](https://github.com/parkjihyoun/hub/issues/10))는 백로그로 유지.

| 날짜 | 작업 | 관련 이슈 |
|---|---|---|
| 07/13 (월) | Task 0 마무리(디렉터리·라우터), Prisma User 모델 + Supabase 연결·마이그레이션 | [#2](https://github.com/parkjihyoun/hub/issues/2), [#3](https://github.com/parkjihyoun/hub/issues/3), [#13](https://github.com/parkjihyoun/hub/issues/13) |
| 07/14 (화) | JWT·bcrypt 유틸, `POST /auth/signup`, `POST /auth/login` API + `GET /auth/me`·인증 미들웨어, FE `src/api/client.ts` (하루 앞당김) | [#14](https://github.com/parkjihyoun/hub/issues/14), [#15](https://github.com/parkjihyoun/hub/issues/15), [#16](https://github.com/parkjihyoun/hub/issues/16), [#17](https://github.com/parkjihyoun/hub/issues/17), [#18](https://github.com/parkjihyoun/hub/issues/18) |
| 07/15 (수) | 로그인·회원가입 화면 React 구현(API 연동), 인증 가드 + 홈 로그인 상태 반영 | [#19](https://github.com/parkjihyoun/hub/issues/19), [#20](https://github.com/parkjihyoun/hub/issues/20), [#21](https://github.com/parkjihyoun/hub/issues/21) |
| 07/16 (목) | 수직슬라이스 통합 검증(회원가입→로그인→me), `feature-verify` Agent로 점검, checklist.md 갱신 | [#22](https://github.com/parkjihyoun/hub/issues/22) |
| 07/17 (금) | 버퍼/다음 슬라이스(Task 3: 챌린지·기록) 계획을 `feature-slice` Agent로 미리 수립 | — |

**금요일 완료 기준**: 5개 화면 라우팅 동작, 모바일 레이아웃 깨짐 없음 (`plan.md` Task 1 완료 기준과 동일)

---

### Week 3 상세 계획 (07/20 월 ~ 07/24 금)

> 이번 주 수직슬라이스 대상 = **오늘의 챌린지 조회 → 사진+메모 기록 → 하루 1회 제한** (`plan.md` Task 3).
> 이미지 저장은 1차로 S3 대신 **로컬 디스크(multer)**로 축소 — API 응답 형태(`imageUrl` 문자열)는 동일하게 유지해 나중에 S3 전환 시 프론트 변경이 없도록 한다. (`feature-slice` Agent 제안)

| 날짜 | 작업 | 관련 이슈 |
|---|---|---|
| 07/20 (월) | Prisma Challenge·Record 모델 + 마이그레이션, 챌린지 시드 + KST 날짜 유틸, `GET /challenges/today` | [#23](https://github.com/parkjihyoun/hub/issues/23), [#24](https://github.com/parkjihyoun/hub/issues/24), [#25](https://github.com/parkjihyoun/hub/issues/25) |
| 07/21 (화) | multer 로컬 업로드 설정, `POST /records`(중복 409), `GET /records/today` | [#26](https://github.com/parkjihyoun/hub/issues/26), [#27](https://github.com/parkjihyoun/hub/issues/27), [#28](https://github.com/parkjihyoun/hub/issues/28) |
| 07/22 (수) | FE `challenges.ts`·`records.ts` API 클라이언트, 홈 화면 챌린지 카드 + 기록 상태 연동 | [#29](https://github.com/parkjihyoun/hub/issues/29), [#30](https://github.com/parkjihyoun/hub/issues/30) |
| 07/23 (목) | `/record` 화면(파일 미리보기+메모), 기록 제출 로직(성공/실패/완료 분기) | [#31](https://github.com/parkjihyoun/hub/issues/31), [#32](https://github.com/parkjihyoun/hub/issues/32) |
| 07/24 (금) | 수직슬라이스 통합 검증, `feature-verify` Agent 점검, checklist.md 갱신 | [#33](https://github.com/parkjihyoun/hub/issues/33) |

**금요일 완료 기준**: 당일 1회 기록 성공, 같은 날 두 번째 기록 시 서버 에러 (`plan.md` Task 3 완료 기준과 동일)

---

### Week 4 상세 계획 (07/27 월 ~ 07/31 금, 마지막 주)

> **코스 요구사항**: 데모 핵심 흐름 완성 + React/Express 외부 배포(Vercel/Render) + 배포 환경 검증 + 5분 미만 데모 영상 제출(수요일 22:00 마감) + Agent 협업 워크플로우 문서화.
> 데모 핵심 흐름 = **회원가입 → 로그인 → 오늘의 챌린지 → 사진+메모 기록** (이미 완성). 캘린더(Task 4)는 이번 주 범위에서 제외.
> **일정 변경**: 원래 월요일부터 배포 준비를 시작할 계획이었으나, 친구 방(Task 5)이 더 급해져서 우선순위를 바꿈 — 친구 방을 월~화 오전에 먼저 만들고, 배포는 화요일에 몰아서 진행. **수요일 22:00 영상 제출은 코스 고정 마감이라 화요일 안에 배포·검증까지 반드시 끝나야 함** (버퍼가 거의 없는 빡빡한 일정).

| 날짜 | 작업 | 관련 이슈 |
|---|---|---|
| 07/27 (월) | 친구 방 백엔드(Room·RoomMember 모델, 생성/참여 API, 방 오늘 상태 API) + 배포 코드 준비(FE `BASE_URL` 환경변수화, BE CORS 다중 origin 허용 — 소요 적어 같은 날 처리) | [#40](https://github.com/parkjihyoun/hub/issues/40), [#41](https://github.com/parkjihyoun/hub/issues/41), [#34](https://github.com/parkjihyoun/hub/issues/34), [#35](https://github.com/parkjihyoun/hub/issues/35) |
| 07/28 (화) | 오전: 친구 방 화면(목록/생성/참여, 상세) 마무리. 오후~저녁: Supabase 배포 연결 확인 → Render(BE)·Vercel(FE) 배포 → 배포 환경 통합 검증(인증+챌린지+기록+친구 방 전체) 및 오류 수정 | [#42](https://github.com/parkjihyoun/hub/issues/42), [#43](https://github.com/parkjihyoun/hub/issues/43), [#36](https://github.com/parkjihyoun/hub/issues/36), [#37](https://github.com/parkjihyoun/hub/issues/37), [#38](https://github.com/parkjihyoun/hub/issues/38), [#39](https://github.com/parkjihyoun/hub/issues/39) |
| 07/29 (수) | 영상 대본 작성·촬영(서비스 설명/시연/기술적 특징/문제해결/Agent 활용), `showcase.json`에 `demoVideoUrl` 추가, PR 제출 — **22:00 마감** | — |
| 07/30 (목) | 데모 시연 순서 확정, Agent·Skill·규칙 문서 사용 관계 다이어그램, 캠프 이후에도 쓸 배포 워크플로우 문서화 | — |
| 07/31 (금) | 데모 리허설, `checklist.md` 최종 정리, 발표 준비 | — |

**금요일 완료 기준**: 배포된 URL에서 핵심 흐름(회원가입~기록, 가능하면 친구 방까지)이 실제로 동작, 영상 제출 완료, 재사용 가능한 워크플로우 문서 완성

---

## Task 0 — 프로젝트 셋업 (P0)

**목표**: Vite + React 개발 환경과 문서 기반을 갖춘다.

- [x] Vite + React 프로젝트 초기화
- [x] TypeScript 설정 (`.tsx` 마이그레이션, `npm run typecheck`)
- [x] Tailwind CSS v4 설정 (`@tailwindcss/vite`, `@theme` 토큰)
- [x] oxlint 설정
- [x] CLAUDE.md · README.md · plan.md · checklist.md 작성
- [ ] `src/pages/`, `src/hooks/`, `src/api/` 디렉터리 생성
- [ ] React Router 도입 및 기본 레이아웃

**완료 기준**: `npm run dev`, `npm run typecheck`, `npm run lint`, `npm run build` 모두 성공

---

## Task 1 — UI 기반·라우팅 (P0)

**목표**: 공통 레이아웃과 주요 화면 뼈대를 만든다.  
**선행**: Task 0

> **프로토타입**: React 구현 전, 순수 HTML/CSS 정적 프로토타입을 `public/prototype/`에 제작.
> 기획서(`/intro` 페이지)의 "프로토타입 열기" 링크로 바로 확인 가능. 동료 피드백 반영 후 기획서·본 Task를 수정.

| 화면 | 경로 (예정) | 설명 |
|---|---|---|
| 홈 | `/` | 오늘의 챌린지 + 기록 CTA |
| 기록 작성 | `/record` | 사진 업로드 + 메모 |
| 캘린더 | `/calendar` | 월별 썸네일 |
| 친구 방 목록 | `/rooms` | 내가 속한 방 목록 |
| 친구 방 | `/rooms/:id` | 멤버 완료 O/X + 완료자 사진·메모 |
| 설정 | `/settings` | 알림·계정 |

- 공통 헤더/하단 네비게이션
- 반응형 레이아웃 (모바일 우선)
- 목업 데이터로 각 화면 UI 프로토타입

**완료 기준**: 5개 화면 간 라우팅 동작, 모바일 뷰포트에서 레이아웃 깨짐 없음

---

## Task 2 — 백엔드·인증 (P0)

**목표**: 사용자 가입·로그인과 JWT 기반 API 인증을 구축한다.  
**선행**: Task 1

### Backend

- Express 프로젝트(`server/`) — 환경 구성(디렉토리 구조·Prisma·oxlint·vitest)은 완료, User 모델·인증 API를 이번 Task에서 구현
- Prisma로 User 모델 정의·마이그레이션
- jsonwebtoken으로 JWT 발급/검증, bcryptjs로 비밀번호 해시
- `POST /auth/signup`, `POST /auth/login`, `GET /auth/me`

### Frontend

- `src/api/` HTTP 클라이언트 (fetch wrapper, 토큰 저장)
- 로그인·회원가입 페이지
- 인증 가드 (비로그인 시 로그인으로 리다이렉트)

**완료 기준**: 회원가입 → 로그인 → `/auth/me` 응답 확인

---

## Task 3 — 챌린지·기록 (P0)

**목표**: 매일 챌린지 조회와 하루 1회 사진 기록을 구현한다.  
**선행**: Task 2

### Backend

- Challenge, Record Prisma 모델 정의
- Challenge: 일별 랜덤 주제 생성 (07:00 KST)
- Record: 사진 업로드(S3) + 메모, 동일 날짜 중복 저장 거부
- `GET /challenges/today`, `POST /records`, `GET /records/today`

### Frontend

- 오늘의 챌린지 카드
- `<input type="file" accept="image/*">` 또는 MediaDevices API
- 기록 완료 후 홈 상태 갱신

**완료 기준**: 당일 1회 기록 성공, 같은 날 두 번째 기록 시 서버 에러

---

## Task 4 — 캘린더 (P1)

**목표**: 월별 기록을 썸네일로 열람한다.  
**선행**: Task 3

### Backend

- `GET /records?year=&month=` — 해당 월 기록 목록 (날짜·썸네일 URL)

### Frontend

- 월 이동 UI
- 기록 있는 날: 썸네일, 없는 날: 빈 칸
- 날짜 클릭 시 해당 기록 상세 (본인만)

**완료 기준**: 기록한 날만 썸네일 표시, 월 전환 정상

---

## Task 5 — 친구 방 (P1)

**목표**: 3~6명 그룹에서 오늘 완료 O/X와 함께, 완료한 멤버의 그날 기록(사진·메모)을 공유한다. 여러 개의 방을 만들고 참여할 수 있다.  
**선행**: Task 2 (Task 3과 병렬 가능)

### Backend

- Room 생성·초대코드·참여 (최대 6명), 사용자당 다중 방 소속 허용
- `GET /rooms` — 내가 속한 방 목록
- `GET /rooms/{id}/today` — 멤버별 완료 여부(O/X) + 완료한 멤버의 사진 URL·메모 반환

### Frontend

- 방 목록 화면 (여러 방 전환)
- 방 생성·참여 UI, 방 진입 시 멤버 목록·초대코드 표시
- 멤버 아바타 + O/X 표시, 완료한 멤버는 사진·메모 미리보기 노출
- **금지**: 기록 수·빈도·연속일 집계, 멤버 간 순위/등수 UI

**완료 기준**: 여러 방 생성·전환 정상, 방 멤버 완료 상태와 완료자의 사진·메모 표시, 순위·스트릭·기록 횟수 UI 없음

---

## Task 6 — AI 데일리 케어 (P2)

**목표**: 기록 후 응원/제안 메시지를 생성한다.  
**선행**: Task 3

### Backend

- 기록 저장 후 LLM 호출 (메모·이미지 메타 기반)
- `GET /records/{id}/ai-care`

### Frontend

- 기록 완료 화면에 AI 메시지 카드
- 로딩·에러 상태 처리

**완료 기준**: 기록 1건당 AI 메시지 1회 생성, 평가·점수 UI 없음

---

## Task 7 — 알림 (P2)

**목표**: 매일 07:00 챌린지 알림을 보낸다.  
**선행**: Task 3, Task 5(선택)

### Backend

- 스케줄러 (node-cron, 07:00 KST) + Web Push 발송
- Push 구독 저장 `POST /notifications/subscribe`

### Frontend

- Service Worker 등록
- 알림 권한 요청 UI (설정 화면)

**완료 기준**: 구독 사용자에게 07:00 알림 수신 (테스트 환경에서 수동 트리거 가능)

---

## 이후 확장 (MVP 이후)

- PWA 오프라인 캐시
- 이미지 리사이즈·최적화
- 접근성(a11y) 개선
- E2E 테스트 (Playwright)

---

## 에이전트 지시 예시

```
@plan.md Task 1을 진행해줘.
- React Router 도입
- pages/ 디렉터리에 5개 화면 뼈대 생성
- 완료 후 @checklist.md Task 1 항목 체크
```
