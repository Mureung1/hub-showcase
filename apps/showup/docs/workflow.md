# ShowUp 재사용 워크플로우 문서 — 캠프 이후에도 사용

## 1. 프로젝트 개요

ShowUp은 Hermes Agent 프레임워크 + Ollama Pro 모델로 4세션 역할 분리 개발을 한 사례다. 이 문서는 캠프 이후 유사 프로젝트에서 재사용할 수 있는 워크플로우를 정리한다.

## 2. 환경 구성

### 2.1 도구 체인

| 도구 | 용도 | 설치 |
|------|------|------|
| Hermes Agent | AI 에이전트 프레임워크 (세션 관리, 도구 호출) | `hermes setup` |
| Ollama | 로컬 LLM 실행 (Pro 모델 연결) | https://ollama.com |
| Node.js | 프론트엔드 빌드·Functions 이관용 코드 | v22+ (Functions Admin SDK 기준) |
| Firebase CLI | 배포/인덱스 관리 | `npm i -g firebase-tools` |

### 2.2 세션 구성

같은 Hermes 프로필에서 채팅 세션 4개를 열어 역할별로 운영:

| 세션 | 모델 | 담당 |
|------|------|------|
| LEAD | GLM 5.2 | 기획·통합·일정·배포 |
| FE | Qwen 3.5 | UI·컴포넌트·라우팅 |
| BE | Kimi K2.7 Code | DB·로직·인덱스 |
| 보안 | GLM 5.2 | Rules·침투테스트·법무 |

### 2.3 세션 문서

각 세션마다 `sessions/{ROLE}.md` 파일로 역할을 정의:
- 담당 영역 (어디까지 건드리는가)
- 건드리면 안 되는 것
- 작업 순서
- 보고 형식
- Git 규칙

## 3. 개발 워크플로우

### 3.1 일일 흐름

```
1. LEAD: 오늘 작업을 checklist.md에 분배 (N일차 섹션)
2. 각 세션: 지시받은 작업 실행
3. 각 세션: 작업 완료 시 자동 커밋 (접두어 ROLE-)
4. LEAD: showup-verify Skill로 전체 검증 (lint/typecheck/build/test)
5. LEAD: 버그 발견 시 각 세션에 할당
6. 각 세션: 버그 수정 + 커밋
7. LEAD: 체크리스트 갱신
```

### 3.2 인터페이스 우선 원칙

가장 중요한 규칙: **BE가 `types/schema.ts`를 먼저 확정하면 FE는 그 타입으로 mock 개발을 병행**한다. 세션 간 대기를 최소화하는 핵심 전략.

```
BE: schema.ts 확정 → 커밋 → FE/보안에 공유
FE: schema.ts 기반 mock으로 UI 개발 (BE 연동 대기)
BE: Firestore 서비스 함수 구현
보안: schema.ts 기반 Rules 작성
```

### 3.3 검증 파이프라인

LEAD는 `showup-verify` Skill로 다음을 한 번에 실행:

```bash
npm run lint --workspace showup      # ESLint (warning 0, error 0)
npm run typecheck --workspace showup # tsc -b
npm run build --workspace showup     # vite build
npm run verify:risk --workspace showup   # 위험도 계산 테스트
npm run verify:phone --workspace showup # 전화번호 처리 테스트
npm run verify:search --workspace showup # 검색 함수 테스트
npm run verify:seed --workspace showup   # 시드 데이터 테스트
cd apps/showup && firebase emulators:exec --only firestore "npm run verify:security"
```

### 3.4 배포

```bash
# 빌드
npm run build --workspace showup

# Firebase Hosting 배포 + 데모 계정/10명 시드 주입
cd apps/showup && npm run deploy:demo

# Firestore 인덱스 배포
npx firebase deploy --only firestore:indexes

# Security Rules 배포
npx firebase deploy --only firestore:rules
```

## 4. Git 정책

| 항목 | 규칙 |
|------|------|
| 브랜치 | 단일 브랜치 (`N167_채민석`) — 역할 분리, 브랜치 분리 아님 |
| 커밋 | 각 세션에서 작업 끝날 때마다 자동, 접두어 `FE-`/`BE-`/`SEC-`/`LEAD-` |
| push | 사용자 명시적 지시 시만 |
| PR | 사용자 명시적 지시 시만 |
| 금지 | main 작업, 원본 main PR, feature 브랜치, .env 커밋 |

## 5. 문서 구조

```
apps/showup/
├── README.md              ← 프로젝트 소개 (외부용)
├── docs/
│   ├── plan.md            ← 기획서 (문제 정의, 시나리오, 위험도, 일정)
│   ├── checklist.md       ← 일자별 작업 체크리스트
│   ├── architecture.md    ← 전체 데이터 흐름 다이어그램
│   ├── agent-workflow.md  ← Agent·Skill·규칙 문서 사용 관계
│   ├── workflow.md        ← 이 문서 (재사용 워크플로우)
│   ├── bug-list.md        ← 통합 QA 버그 목록
│   ├── user-flow.md       ← 유저 플로우
│   ├── presentations/     ← 발표 대본 (날짜별)
│   └── blog/              ← 벨로그 회고
├── sessions/
│   ├── LEAD.md            ← 리드 세션 역할
│   ├── FE.md              ← 프론트엔드 세션 역할
│   ├── BE.md              ← 백엔드 세션 역할
│   └── SECURITY.md        ← 보안 세션 역할
├── security-docs/         ← 보안 산출물
└── outputs/               ← 앱 발표 자료 (weeks3/ 등)
```

모노레포 루트에는 제출용 `showcase/showcase.json`과 스크린샷이 별도로 있다.

```text
hub/showcase/              ← 모노레포 루트의 showcase.json + 스크린샷
```

## 6. 기술 선택 이유

### Firebase (Express 대신)

| 기준 | Express + Supabase | Firebase |
|------|-------------------|----------|
| 인증 | 직접 구현 | Firebase Auth (이메일/비번 기본 제공) |
| DB 격리 | RLS 직접 작성 | Firestore Rules (ownerUid 검증 한 줄) |
| 배포 | Vercel + Render 2곳 | Firebase Hosting 1곳 |
| 3주 내 구축 | 서버+DB+Auth 직접 → 범위 초과 | 서버리스 → 시간 절약 |

ShowUp은 가게별 데이터 격리가 핵심인데, Firestore Security Rules가 정확히 부합한다. 3주 안에 서버+DB+Auth를 직접 구축하는 건 범위 초과였다.

### 클라이언트 riskRefresh (Cloud Functions 대신)

Spark(무료) 요금제에서는 Cloud Functions를 배포하지 않았다. 위험도 갱신을 클라이언트 `riskRefresh.ts`로 대체했다. `src/utils/risk.ts`와 `functions/src/risk.ts` 복사본은 수동 동기화 대상이라 변경 시 양쪽 빌드·테스트가 필요하다.

### Hermes Agent + Ollama (Claude 대신)

Claude 구독 만료 + Codex 정지로 이관. 로컬에서 4세션 동시 운영, 모델별 강점에 맞춰 역할 할당. 비용 $0 (Ollama Pro 포함).

## 7. 캠프 이후 재사용 가이드

### 새 프로젝트에 적용할 때

1. **세션 문서 복사**: `sessions/` 4개 파일을 새 프로젝트에 복사하고 담당 영역 수정
2. **기획서 템플릿**: `plan.md` 구조를 그대로 사용 (문제 정의 → 시나리오 → 핵심 기능 → 위험도 → 기술 설계 → 일정)
3. **체크리스트 템플릿**: `checklist.md` 일자별 분배 구조 재사용
4. **검증 Skill**: `showup-verify` 패턴을 새 프로젝트용으로 복제 (lint/typecheck/build/test)
5. **인터페이스 우선**: BE가 schema를 먼저 확정하는 패턴 — 어떤 프로젝트든 적용 가능
6. **단일 브랜치 역할 분리**: 브랜치를 나누지 않고 커밋 접두어로 역할을 구분 — 소규모 팀에 적합

### 주의점

- 모델별 지능 차이가 있으므로 역할 할당 시 테스트 필요
- 클라이언트 riskRefresh는 경쟁 조건 위험이 있음 (동시성 높은 서비스에서는 서버 트리거 필수)
- 단일 브랜치는 충돌 관리 부담이 있음 (팀이 2명 이상이면 브랜치 분리 권장)
