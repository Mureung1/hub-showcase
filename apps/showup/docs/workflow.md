# ShowUp 재사용 워크플로우 — 캠프 이후 새 프로젝트에 적용할 때

> 이 문서는 **재사용 가이드**다. 프로젝트 전체 정리는 [final-summary.md](final-summary.md)를, 기획은 [plan.md](plan.md)을 본다.

## 환경 구성

### 도구 체인

| 도구 | 용도 | 설치 |
|------|------|------|
| Hermes Agent | AI 에이전트 프레임워크 (세션 관리, 도구 호출) | `hermes setup` |
| Ollama | 로컬 LLM 실행 (Pro 모델 연결) | https://ollama.com |
| Node.js | 프론트엔드 빌드·Functions 이관용 코드 | v22+ |
| Firebase CLI | 배포/인덱스 관리 | `npm i -g firebase-tools` |

### 세션 구성

같은 Hermes 프로필에서 채팅 세션 4개를 열어 역할별로 운영:

| 세션 | 모델 (예시) | 담당 |
|------|------|------|
| LEAD | GLM 5.2 | 기획·통합·일정·배포 |
| FE | Qwen 3.5 | UI·컴포넌트·라우팅 |
| BE | Kimi K2.7 Code | DB·로직·인덱스 |
| 보안 | GLM 5.2 | Rules·침투테스트·법무 |

> 모델은 역할 강점에 맞춰 할당. 지능 차이가 있으므로 테스트 후 결정.

### 세션 문서

각 세션마다 `sessions/{ROLE}.md` 파일로 역할을 정의:
- 담당 영역 (어디까지 건드리는가)
- 건드리면 안 되는 것
- 작업 순서
- 보고 형식
- Git 규칙 (공통 부분은 `sessions/_COMMON.md`에서 참조)

## 핵심 전략

### 1. 인터페이스 우선

BE가 `types/schema.ts`를 먼저 확정하면 FE는 그 타입으로 mock 개발을 병행한다. 세션 간 대기를 최소화하는 핵심.

```
BE: schema.ts 확정 → 커밋 → FE/보안에 공유
FE: schema.ts 기반 mock으로 UI 개발 (BE 연동 대기)
BE: Firestore 서비스 함수 구현
보안: schema.ts 기반 Rules 작성
```

### 2. 단일 브랜치 역할 분리

브랜치를 나누지 않고 커밋 접두어(`FE-`/`BE-`/`SEC-`/`LEAD-`)로 역할을 구분한다. 소규모(1인)에 적합. 팀이 2명 이상이면 브랜치 분리 권장.

### 3. 검증 파이프라인

LEAD가 `showup-verify` 스킬로 lint + typecheck + build + 단위 테스트 + Rules 회귀를 한 번에 실행. 실패 시 각 세션에 버그 할당.

### 4. 문서 기반 가드레일

각 세션이 건드릴/건드리지 말 파일을 세션 문서에 명시. 충돌 방지.

## 기술 선택 이유

### Firebase (Express 대신)

| 기준 | Express + Supabase | Firebase |
|------|-------------------|----------|
| 인증 | 직접 구현 | Firebase Auth (이메일/비번 기본 제공) |
| DB 격리 | RLS 직접 작성 | Firestore Rules (ownerUid 검증 한 줄) |
| 배포 | Vercel + Render 2곳 | Firebase Hosting 1곳 |
| 3주 내 구축 | 서버+DB+Auth 직접 → 범위 초과 | 서버리스 → 시간 절약 |

가게별 데이터 격리가 핵심이면 Firestore Security Rules가 정확히 부합한다.

### 클라이언트 riskRefresh (Cloud Functions 대신)

Spark(무료) 요금제에서는 Cloud Functions를 배포하지 못한다. 위험도 갱신을 클라이언트로 대체. 동시성 높은 서비스에서는 서버 트리거 필수.

### Hermes Agent + Ollama (Claude 대신)

Claude 구독 만료 + Codex 정지로 이관. 로컬에서 4세션 동시 운영, 모델별 강점에 맞춰 역할 할당. 비용 $0.

## 새 프로젝트에 적용할 때

1. **세션 문서 복사**: `sessions/` 4개 파일 + `_COMMON.md`를 새 프로젝트에 복사하고 담당 영역 수정
2. **기획서 템플릿**: `plan.md` 구조를 그대로 사용 (문제 정의 → 시나리오 → 핵심 기능 → 위험도 → 기술 설계 → 일정)
3. **체크리스트 템플릿**: `checklist.md` 일자별 분배 구조 재사용
4. **검증 Skill**: `showup-verify` 패턴을 새 프로젝트용으로 복제 (lint/typecheck/build/test)
5. **인터페이스 우선**: BE가 schema를 먼저 확정하는 패턴 — 어떤 프로젝트든 적용 가능
6. **단일 브랜치 역할 분리**: 커밋 접두어로 역할 구분 — 소규모 팀에 적합

## 주의점

- 모델별 지능 차이가 있으므로 역할 할당 시 테스트 필요
- 클라이언트 riskRefresh는 경쟁 조건 위험이 있음 (동시성 높은 서비스에서는 서버 트리거 필수)
- 단일 브랜치는 충돌 관리 부담이 있음 (팀이 2명 이상이면 브랜치 분리 권장)