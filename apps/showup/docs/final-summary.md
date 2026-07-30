# ShowUp 최종 정리 — 4주차 정리 단계

> 작성일: 2026-07-30 (목). 1~15일차 작업 기반.
> 기준 문서: plan.md, checklist.md, workflow.md, README.md, bug-list.md, showcase.json, Hermes 스킬 4종.

---

## 1. 나만의 워크플로우 완성하기

4주간 반복해서 사용한 작업 순서를 정리한다. 이 워크플로우는 Hermes Agent 프레임워크 + Ollama Pro 모델 4세션 구조에서 실제로 검증된 주기다.

### 1.1 일일 작업 주기

| 단계 | 입력 | 작업 순서 | 확인 기준 | 결과물 |
|------|------|-----------|-----------|--------|
| **기획** | 기획서(plan.md), 이전 회고 | LEAD가 오늘 작업을 checklist.md에 분배. 각 세션별 담당 항목 할당 | 각 항목이 AI 작업 1단위 이하인지 확인 | checklist.md 당일 섹션 |
| **인터페이스 우선** | BE가 `types/schema.ts` 확정 | BE: schema.ts 커밋 → FE/보안에 공유. FE: schema 기반 mock 개발. 보안: schema 기반 Rules 작성 | schema.ts가 전 세션 공통 타입으로 사용 중인지 확인 | schema.ts + FE mock + Rules 초안 |
| **병렬 구현** | schema.ts, checklist 할당 | FE: UI/컴포넌트/라우팅. BE: 서비스 함수/시드. 보안: Rules/침투테스트/법무 | 각 세션 담당 영역 파일만 수정했는지 확인 | 각 세션 커밋 (FE-/BE-/SEC-/LEAD-) |
| **통합 검증** | 각 세션 구현 완료 | LEAD가 `showup-verify` 스킬로 lint+typecheck+build+단위테스트+Rules 회귀 실행 | warning 0, error 0, 빌드 통과, 테스트 전부 PASS | 검증 결과 보고 |
| **버그 수정** | 검증 결과 + bug-list.md | LEAD가 버그 우선순위(P0/P1/P2) 분류 → 각 세션에 할당 → 수정 → 재검증 | P0 전부 해결, P1 데모 영향 분만 해결 | bug-list.md 갱신 |
| **배포** | 빌드 통과 확인 | `npm run build --workspace showup` → `cd apps/showup && npm run deploy:demo` → Firestore 인덱스/Rules 배포 | Hosting HTTP 200, 인덱스 존재, Rules 적용 | 배포 URL + 도메인 |
| **회고** | 당일 작업 결과 | 각 세션 보고 형식으로 회고. LEAD가 checklist 갱신 + 다음 날 계획 | 체크리스트와 실제 구현 일치 | checklist.md + 회고 |

### 1.2 반복 패턴 — 주간 단위

```
월: LEAD가 주간 계획 수립 → checklist.md에 일자별 분배
화~목: 각 세션 병렬 구현 → LEAD 통합 검증 → 버그 수정
목: 마스터 클래스 오전 (개발 없음)
금: 발표·데모·피드백 (개발 없음)
```

### 1.3 핵심 반복 작업 — 입력/순서/확인/결과물

**A. 기능 구현 (각 세션 공통)**

| 항목 | 내용 |
|------|------|
| 입력 | checklist 할당 항목, schema.ts, 세션 문서(sessions/ROLE.md) |
| 작업 순서 | ① 현재 브랜치/상태 확인 → ② 담당 파일 식별 → ③ 구현 → ④ 세션 내 검증(lint/typecheck) → ⑤ 커밋(접두어 ROLE-) → ⑥ LEAD에 보고 |
| 확인 기준 | 빌드 통과, 담당 영역 외 파일 미수정, 커밋 접두어 규칙 준수 |
| 결과물 | 커밋 + 보고(날짜-N번째 작업/한것/막힌점/검증/관리자가 할것/참고) |

**B. 통합 검증 (LEAD)**

| 항목 | 내용 |
|------|------|
| 입력 | 각 세션 구현 완료 신호 |
| 작업 순서 | ① `showup-verify` 스킬 실행(lint+typecheck+build+risk/phone/search/seed) → ② Firestore Rules 회귀(에뮬레이터 18개) → ③ 시나리오 A 수동 E2E → ④ bug-list.md 갱신 |
| 확인 기준 | lint 0/0, typecheck PASS, build PASS, 테스트 전부 PASS, Rules 18/18 PASS |
| 결과물 | 검증 결과 보고 + bug-list.md |

**C. 버그 수정**

| 항목 | 내용 |
|------|------|
| 입력 | bug-list.md 항목 |
| 작업 순서 | ① P0/P1/P2 분류 → ② 담당 세션 할당 → ③ 수정 → ④ 재검증 → ⑤ 커밋(접두어 ROLE-) |
| 확인 기준 | 수정한 항목이 검증 통과, 회귀 없음 |
| 결과물 | 수정 커밋 + bug-list.md 상태 갱신 |

**D. 배포**

| 항목 | 내용 |
|------|------|
| 입력 | 빌드 통과 확인 |
| 작업 순서 | ① `npm run build --workspace showup` → ② `cd apps/showup && npm run deploy:demo` → ③ `npx firebase deploy --only firestore:indexes` → ④ `npx firebase deploy --only firestore:rules` |
| 확인 기준 | Hosting `/` `/privacy` `/terms` HTTP 200, 인덱스 존재, Rules 적용 |
| 결과물 | 배포 URL (https://showup-project.web.app) |

### 1.4 문제가 생겼을 때 다시 확인할 단계

| 문제 유형 | 재확인 단계 |
|-----------|-------------|
| **typecheck 실패** | ① `find apps/showup/src -name '*.js' -delete` (컴파일 산물 정리) → ② `*.tsbuildinfo` 삭제 → ③ schema.ts 변경 여부 확인 → ④ BE 인터페이스 변경이 FE에 반영되었는지 확인 |
| **빌드 실패** | ① import 경로 확인(`@/` 별칭) → ② 모듈 해석 순서 → ③ vite.config.ts manualChunks 확인 → ④ `tsconfig.app.json` noEmit: true 확인 |
| **Firestore 403 Permission Denied** | ① `stores/{uid}` 문서 존재 여부 확인 (로그인 후 getStore) → ② 없으면 createStore 자동 생성 안전장치 → ③ Rules isStoreOwner 검증 |
| **lint warning 누적** | ① 미사용 변수/import 제거 → ② `as any` 전수 확인 → ③ 이모지 잔존 확인 (UI 텍스트만, 테스트 파일 제외) |
| **Rules 회귀 실패** | ① 에뮬레이터 재시작 → ② `env.clearFirestore({ projectId })` 초기화 → ③ rules 파일 문법 확인 → ④ create/update 양쪽 필드 검증 일치 여부 |
| **데모 데이터 안 보임** | ① 시드 예약 날짜 = 오늘인지 확인 → ② `previewSeedCustomers()` 위험도 분포 확인 → ③ 경고 배너 시연용(주의 고객 pending), 정상 방문 시연용(안심 visited) 각 1건+ |
| **FE/BE 인터페이스 충돌** | ① `getCustomer()` 반환형 확인 (CustomerSearchResult, 원본 phone 미포함) → ② `ReservationWithId.id` 사용 여부 (customerId 아님) → ③ `*AndRefresh` 함수 사용 여부 |
| **.env 문제** | ① `~/Secrets/billable/hub-showup.env` 존재 확인 → ② symlink `apps/showup/.env` → ③ chmod 600 → ④ .gitignore에 symlink 무시 확인 |

### 1.5 세션별 보고 형식 (반복 사용)

```
오늘 날짜 - N번째 작업(작업내용)
한것 -
막힌 점 -
검증 -
관리자가 할것 -
참고 -
```

---

## 2. Agent 협업 과정 시각화하기

### 2.1 단계별 사용 도구

| 단계 | 도구 | 세션 | 스킬 |
|------|------|------|------|
| **기획** | Hermes Agent (GLM 5.2), Markdown | LEAD | `multi-session-ai-project`, `plan` |
| **설계** | Hermes Agent (Kimi K2.7 Code), TypeScript | BE | `showup-be-development` |
| | Hermes Agent (Qwen 3.5), React/TS | FE | `showup-fe-development` |
| | Hermes Agent (GLM 5.2), Firestore Rules | 보안 | `showup-security-development` |
| **구현** | Hermes Agent 4세션, Git (단일 브랜치) | 전 세션 | 세션별 스킬 + `showup-frontend` |
| **검증** | Hermes Agent (GLM 5.2), npm/ESLint/tsc/Vite | LEAD | `showup-verify`, `firebase-rules-unit-testing` |
| **배포** | Hermes Agent (GLM 5.2), Firebase CLI | LEAD | — |
| **발표** | Hermes Agent (GLM 5.2), PPTX/Markdown | LEAD | `powerpoint`, `dev-blog-writing` |

### 2.2 Agent·Skill·문서 사용 관계

```
┌─────────────────────────────────────────────────────────────┐
│                     사용자 (관리자)                           │
│              "7일차 작업 시작" 같은 지시                       │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   Hermes Agent 프레임워크                      │
│            (by Nous Research, 로컬 실행)                      │
│  ┌─────────┬─────────┬─────────┬─────────┐                  │
│  │ LEAD    │ FE      │ BE      │ 보안     │  ← 4세션         │
│  │ GLM 5.2 │ Qwen 3.5│Kimi K2.7│ GLM 5.2 │  ← Ollama 모델    │
│  └────┬────┴────┬────┴────┬────┴────┬────┘                  │
│       │         │         │         │                       │
│       ▼         ▼         ▼         ▼                       │
│   ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐               │
│   │LEAD.md │ │ FE.md  │ │ BE.md  │ │SECURITY│  ← 세션 문서    │
│   │역할/규칙│ │역할/규칙│ │역할/규칙│ │  .md   │               │
│   └────────┘ └────────┘ └────────┘ └────────┘               │
│       │         │         │         │                       │
│       ▼         ▼         ▼         ▼                       │
│   ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐               │
│   │showup- │ │showup- │ │showup- │ │showup- │  ← Skills     │
│   │verify  │ │fe-dev  │ │be-dev  │ │security│               │
│   └────────┘ └────────┘ └────────┘ └────────┘               │
│       │                                                   │
│       ▼                                                   │
│   ┌──────────────────────────────────────────┐              │
│   │  docs/plan.md · checklist.md              │             │
│   │  types/schema.ts (공유 인터페이스)          │             │
│   └──────────────────────────────────────────┘              │
└─────────────────────────────────────────────────────────────┘
```

### 2.3 협업 흐름

```
1. LEAD: 일자별 작업을 checklist.md에 분배
       ↓
2. BE: schema.ts 확정 → FE/보안에 공유
       ↓ (인터페이스 우선)
3. FE: schema.ts 기반 mock 개발 → BE 연동 대기
   BE: Firestore 서비스 함수 구현
   보안: Security Rules 작성 + 침투 테스트
       ↓ (병렬)
4. LEAD: 통합 QA (showup-verify 스킬 실행)
       ↓
5. LEAD: 버그 목록 작성 → 각 세션에 할당
       ↓
6. 각 세션: 버그 수정 → 자동 커밋 (FE-/BE-/SEC-/LEAD- 접두어)
       ↓
7. LEAD: 최종 빌드/배포/발표 자료
```

### 2.4 사람이 결정한 내용 vs AI가 수행한 내용

| 단계 | 사람이 결정한 것 | AI가 수행한 것 |
|------|------------------|----------------|
| **기획** | 문제 정의, 핵심 기능 2개 선정, 위험도 가중치/등급 설계, 일정, 기술 스택(Firebase) 선택 | plan.md 작성, checklist 일자별 분배, 시나리오 정리 |
| **설계** | Firestore 데이터 모델 구조, 단일 브랜치 역할 분리 방침, 4세션 모델 할당 | schema.ts 타입 정의, Rules 초안, 아키텍처 다이어그램 |
| **구현** | UI 원칙(모바일 우선, 이모지 금지, 마스킹), 법무 가드레일(참고 지표, 사실 기록) | React 컴포넌트/페이지, 서비스 함수, risk.ts 계산 로직, 시드 데이터, Rules 구현 |
| **검증** | P0/P1/P2 우선순위, 데모 시나리오 통과 기준 | lint/typecheck/build 실행, 단위 테스트, Rules 회귀 18개, E2E 수동 테스트 |
| **배포** | 배포 시기 결정, Spark→Blaze 전환 연기 판단 | Firebase Hosting 배포, 인덱스/Rules 배포, 도메인 확인 |
| **발표** | 발표 구조, 데모 흐름, 영상 편집 방침 | 발표 대본/데크 작성, README 갱신, showcase.json 작성 |
| **Git** | push/PR 시기, 커밋 접두어 규칙, 브랜치 정책 | 각 세션 자동 커밋, 충돌 정리 |

### 2.5 실제 작업과 맞지 않는 항목 교정

| 항목 | 기존 표기 | 실제 상태 | 교정 |
|------|----------|-----------|------|
| Cloud Functions | "배포 예정" | Spark 요금제로 배포 불가, 클라이언트 riskRefresh.ts 대체 | "Functions 미배포, 클라이언트 갱신 사용" |
| 보안 회귀 테스트 | "10개 PASS" | 최신 로컬 18개 PASS | "18개 PASS (로컬 에뮬레이터)" |
| 메인 청크 크기 | "약 8KB" (발표 당시) | 2026-07-28 빌드 10.86KB | "10.86KB (2026-07-28 빌드)" |
| 보안 세션 모델 | "GPT-OSS 120B" | 7/14 변경 → GLM 5.2 | "GLM 5.2 (7/14 변경)" |
| Lighthouse | "90+ 확인" | 최신 실측 없음 | "발표 당시 기록, 최신 재실측 필요" |
| 프로덕션 배포 | "배포 완료" | 7/28 수정 코드 미재배포 | "수정본 재배포 필요" |

---

## 3. 최종 기능 보완과 배포 확인하기

> 데모에 필요한 문제는 이미 고쳐진 상태. 이 섹션은 현재 배포 상태를 정리한다.

### 3.1 FE·BE 주소

| 항목 | 값 |
|------|-----|
| **프론트엔드 배포 URL** | https://showup-project.web.app |
| **Firebase 프로젝트** | showup-project |
| **Firestore 리전** | asia-northeast3 (서울) |
| **Hosting 상태** | HTTP 200 (2026-07-28 확인) |
| **백엔드** | Firebase 클라이언트 SDK (Express 서버 없음) |
| **Cloud Functions** | 0개 배포 (Spark 요금제, 클라이언트 riskRefresh 대체) |

### 3.2 환경변수

| 항목 | 경로/값 |
|------|---------|
| **.env 실제 위치** | `~/Secrets/billable/hub-showup.env` |
| **.env symlink** | `apps/showup/.env` → `~/Secrets/billable/hub-showup.env` |
| **.env 권한** | chmod 600 |
| **.gitignore** | symlink 무시 (커밋 안 됨) |
| **필수 키** | `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID` |

### 3.3 데모 계정

| 항목 | 값 |
|------|-----|
| 이메일 | `demo@showup.example` |
| 비밀번호 | `demoPassword123!` |
| 가게명 | 카페 마루 (데모) |
| 시드 데이터 | 고객 10명, 예약 30건, 사건 5건 |

### 3.4 핵심 기능 배포 상태

| 기능 | 코드 상태 | 프로덕션 배포 | 비고 |
|------|-----------|---------------|------|
| 회원가입/로그인 | 완료 | 배포됨 | Firebase Auth 이메일/비번 |
| 대시보드 (요약 카드 + 주의 고객) | 완료 | 배포됨 | 2026-07-28 수정본 미재배포 |
| 고객 검색 (뒤4자리/이름) | 완료 | 배포됨 | 300ms debounce, 후보 목록 |
| 위험도 경고 배너 | 완료 | 배포됨 | 노쇼3+/abuse1+ 시 강제 표시 |
| 고객 상세 (타임라인 + 사건 기록) | 완료 | 배포됨 | 14일차 P0/P1 수정 포함 |
| 예약 생성/상태 전환 | 완료 | 배포됨 | AndRefresh 함수로 위험도 자동 갱신 |
| 전화번호 마스킹 | 완료 | 배포됨 | 화면 노출 0건 |
| Firestore Rules (가게 격리) | 완료 (18/18 PASS) | **재배포 필요** | 7/28 수정본 미재배포 |
| /privacy, /terms | 완료 (MVP 초안) | 배포됨 | 상용화 전 법률 검토 필요 |

### 3.5 남은 배포 작업

| 항목 | 상태 | 필요 조치 |
|------|------|-----------|
| 수정된 Hosting 코드 | 미재배포 | `npm run build --workspace showup` → `cd apps/showup && npm run deploy:demo` |
| 수정된 Firestore Rules | 미재배포 | `npx firebase deploy --only firestore:rules` |
| Storage Rules | 미재배포 | `npx firebase deploy --only storage` (MVP 전체 deny) |
| 최종 push/PR | 미완료 | 사용자 명시적 지시 시 실행 |

> **참고**: 데모에 필요한 기능은 이미 고쳐진 상태. 위 배포 작업은 프로덕션 환경에 최신 코드를 반영하기 위한 것으로, 데모 시연 자체는 현재 배포된 사이트로 가능하다.

---

## 4. 데모 준비하기

### 4.1 문제와 사용자 설명 (짧게)

**문제**: 예약제로 운영하는 소상공인이 노쇼·폭언·환불 분쟁 같은 문제 고객을 반복해서 겪으면서도, 기록하고 예약 전에 확인할 수단이 없어 같은 피해를 반복한다.

**사용자**: 예약제로 운영하는 소상공인 (카페·식당·미용실·공방 사장님)

**해결책**: 고객 이력과 위험도를 관리하고, 예약 전에 경고하여 사장님이 판단을 내릴 수 있도록 돕는 웹서비스. 자동 차단이 아니라 참고 지표.

### 4.2 핵심 기능 시연 순서

| 순서 | 화면 | 시연 내용 | 소요 시간 |
|------|------|-----------|-----------|
| 1 | **랜딩** (`/`) | 서비스 소개, 4대 핵심 기능, 무료 가입 CTA | 30초 |
| 2 | **로그인** (`/login`) | 데모 계정 로그인 | 15초 |
| 3 | **대시보드** (`/app/dashboard`) | 요약 카드 4개(오늘 예약/방문/노쇼/월 노쇼율) + 주의 고객 Top 5 | 30초 |
| 4 | **고객 검색** (`/app/customers`) | 전화 뒤 4자리 검색 → 위험 고객 경고 배너 자동 표시 | 40초 |
| 5 | **고객 상세** (`/app/customers/:id`) | 이벤트 타임라인, 위험도 배지, 사건 기록 모달 | 40초 |
| 6 | **예약 관리** (`/app/reservations`) | 날짜 필터, 방문/노쇼/취소 원터치 → 위험도 자동 갱신 | 40초 |
| 7 | **예약 생성** (`/app/reservations/new`) | 고객 선택 → 위험 고객 경고 배너 → 예약 생성 | 30초 |
| 8 | **기술·Agent 협업 설명** | 아키텍처, 4세션 역할 분리, 검증 파이프라인 | 60초 |

> 예상 총 시간: 약 4분 30초 (데모 영상 4분 41초와 유사)

### 4.3 시연 연습 체크리스트

- [ ] 배포 사이트 접속 확인: https://showup-project.web.app
- [ ] 데모 계정 로그인 확인: `demo@showup.example` / `demoPassword123!`
- [ ] 시드 데이터 확인: 고객 10명, 예약 30건, 사건 5건
- [ ] 경고 배너 시연용 고객 (노쇼 3회+) 존재 확인
- [ ] 안심 고객 (정상 방문) 존재 확인
- [ ] 오늘 예약 날짜가 실제 데모 날짜와 일치하는지 확인
- [ ] 영상 URL 확인: https://drive.google.com/file/d/1LSXg9k79HuR2XfNzo5MOkky1zQopGHO0/view

### 4.4 Agent와 협업한 방식 설명 (데모용)

**한 줄 요약**: Hermes Agent 프레임워크 + Ollama Pro 모델로 리드/프론트엔드/백엔드/보안 4개 세션을 분리해 역할별 개발. 각 세션이 독립적으로 작성·검증·커밋하고 리드가 통합 QA를 진행.

**세션 구조**:

| 세션 | 모델 | 역할 |
|------|------|------|
| 리드 | GLM 5.2 | 기획·통합·일정·배포·발표 |
| 프론트엔드 | Qwen 3.5 | UI·컴포넌트·라우팅·모바일 QA |
| 백엔드 | Kimi K2.7 Code | Firestore·서비스 함수·위험도 로직·시드 |
| 보안 | GLM 5.2 | Rules·침투테스트·마스킹 검증·법무 |

**핵심 전략 3가지**:

1. **인터페이스 우선**: BE가 `types/schema.ts`를 먼저 확정하면 FE는 mock으로 병행 개발. 세션 간 대기 시간 최소화.
2. **문서 기반 가드레일**: 각 세션이 건드릴/건드리지 말 파일을 `sessions/ROLE.md`에 명시. 충돌 방지.
3. **단일 브랜치 역할 분리**: 브랜치를 나누지 않고 커밋 접두어(FE-/BE-/SEC-/LEAD-)로 역할 구분. 소규모에 적합.

**검증 파이프라인**: LEAD가 `showup-verify` 스킬로 lint + typecheck + build + 단위 테스트(risk/phone/search/seed) + Firestore Rules 회귀(18개)를 한 번에 실행.

**잘 된 점**: 4세션 병렬 개발로 3주 만에 MVP 완성 + 배포, TDD로 위험도 로직 신뢰 확보, 보안 회귀 18/18 PASS, 비용 $0 (Ollama Pro 포함).

**어려웠던 점**: Claude 구독 만료로 도구 이관, Spark 요금제로 Cloud Functions 불가 → 클라이언트 갱신으로 대체, 일정 2일 앞당김 (7/30 → 7/28).

### 4.5 실제 배포 주소로 시연 연습

시연은 **https://showup-project.web.app**에서 진행한다.

**시연 흐름**:

```
1. https://showup-project.web.app 접속 → 랜딩 페이지
2. "로그인" 클릭 → demo@showup.example / demoPassword123! 입력
3. 대시보드: 오늘 예약 + 주의 고객 Top 5 확인
4. 고객 관리: 전화 뒤 4자리 "1234" 검색 → 경고 배너 확인
5. 고객 상세: 타임라인 + 위험도 배지 + 사건 기록 확인
6. 예약 관리: 오늘 예약 → "노쇼" 버튼 클릭 → 위험도 갱신 확인
7. 예약 생성: 고객 선택 → 경고 배너 → 예약 생성
8. 기술 설명: 아키텍처 + 4세션 Agent 협업
```

> 새 기능을 추가하지 말고 이미 정한 데모 흐름을 안정적으로 만드는 데 집중한다.

---

## 참고 문서

| 문서 | 경로 | 용도 |
|------|------|------|
| 기획서 | `docs/plan.md` | 문제 정의, 시나리오, 위험도 설계, 기술 설계, 일정 |
| 체크리스트 | `docs/checklist.md` | 1~15일차 일자별 작업 분배 |
| 재사용 워크플로우 | `docs/workflow.md` | 캠프 이후 유사 프로젝트 재사용 가이드 |
| 아키텍처 | `docs/architecture.md` | 전체 데이터 흐름 (화면→서비스→Firestore) |
| 버그 목록 | `docs/bug-list.md` | P0/P1/P2 분류 + 해결 상태 |
| README | `README.md` | 외부용 프로젝트 소개 |
| showcase | `showcase/showcase.json` (모노레포 루트) | 제출용 메타데이터 |
| 세션 문서 | `sessions/{LEAD,FE,BE,SECURITY}.md` | 역할/규칙/담당 영역 |
| 보안 산출물 | `security-docs/` | 보안 리포트, 침투테스트, 처리방침, 약관 |
| Hermes 스킬 (원본) | `~/.hermes/skills/software-development/showup-*` | 세션별 개발 워크플로우 + 검증 자동화 |
| Hermes 스킬 (repo 복사본) | `docs/skills/` | 제출/검토용 — 5개 스킬, 23개 파일 |