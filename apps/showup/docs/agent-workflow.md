# ShowUp 워크플로우 — Agent·Skill·규칙 문서 사용 관계

## 전체 구조도

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
│   ┌──────────────────────────────────────────┐              │
│   │  전역 규칙: LEAD가 작업 분배 → FE/BE/보안 구현 →  │             │
│   │  showup-verify로 최종 검증 (plan→fe/be/sc→verify) │             │
│   └──────────────────────────────────────────┘              │
│       │         │         │         │                       │
│       ▼         ▼         ▼         ▼                       │
│   ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐               │
│   │showup- │ │showup- │ │showup- │ │showup- │  ← Skills     │
│   │verify  │ │fe-dev  │ │be-dev  │ │security│               │
│   └────────┘ └────────┘ └────────┘ └────────┘               │
│       │                                                   │
│       ▼                                                   │
│   ┌──────────────────────────────────────────┐              │
│   │         docs/plan.md (기획서)              │             │
│   │         docs/checklist.md (체크리스트)      │             │
│   │         types/schema.ts (공유 인터페이스)   │             │
│   └──────────────────────────────────────────┘              │
└─────────────────────────────────────────────────────────────┘
```

## 각 문서의 역할

| 문서 | 위치 | 역할 | 누가 읽는가 |
|------|------|------|------------|
| **LEAD.md** | sessions/ | 리드 세션 역할, Git 규칙, 담당 영역, 보고 형식 | LEAD 세션 |
| **FE.md** | sessions/ | 프론트엔드 세션 역할, 담당 파일, 작업 순서 | FE 세션 |
| **BE.md** | sessions/ | 백엔드 세션 역할, Firebase 설정, 스키마 우선 원칙 | BE 세션 |
| **SECURITY.md** | sessions/ | 보안 세션 역할, Rules, 침투 테스트, 법무 | 보안 세션 |
| **plan.md** | docs/ | 기획서 — 문제 정의, 시나리오, 위험도 설계, 일정 | 전 세션 |
| **checklist.md** | docs/ | 일자별 작업 체크리스트, 세션별 할당 | 전 세션 |
| **schema.ts** | types/ | 공유 타입 인터페이스 (Store, Customer, Reservation, Incident) | 전 세션 |
| **delegate-specialists** | 시스템 프롬프트 내장 | 전역 규칙: LEAD가 작업 분배 → FE/BE/보안 구현 → showup-verify로 최종 검증 (plan→fe/be/sc→verify 파이프라인) | 전 세션 |
| **showup-verify** | ~/.hermes/skills/ | lint+typecheck+build+단위테스트 자동화 | LEAD (검증 시) |
| **showup-fe-development** | ~/.hermes/skills/ | FE 개발 워크플로우 (Firebase 연동, RHF+Zod) | FE 세션 |
| **showup-be-development** | ~/.hermes/skills/ | BE 개발 워크플로우 (Firestore, riskStats) | BE 세션 |
| **showup-security-development** | ~/.hermes/skills/ | 보안 개발 워크플로우 (Rules, 침투 테스트) | 보안 세션 |
| **architecture.md** | docs/ | 전체 데이터 흐름 다이어그램 (화면→서비스→Firestore) | 전 세션 (참조) |

## 협업 흐름

```
1. LEAD: 일자별 작업을 checklist.md에 분배
       ↓
2. BE: schema.ts 확정 → FE/보안에 공유
       ↓ (인터페이스 우선)
3. FE: schema.ts 기반으로 mock 개발 → BE 연동 대기
   BE: Firestore 서비스 함수 구현
   보안: Security Rules 작성 + 침투 테스트
       ↓ (병렬)
4. LEAD: 통합 QA (showup-verify Skill 실행)
       ↓
5. LEAD: 버그 목록 작성 → 각 세션에 할당
       ↓
6. 각 세션: 버그 수정 → 자동 커밋 (FE-/BE-/SEC-/LEAD- 접두어)
       ↓
7. LEAD: 최종 빌드/배포/발표 자료
```

## Git 규칙

- **브랜치**: `N167_채민석` 단일 브랜치 (역할 분리, 브랜치 분리 아님)
- **커밋**: 각 세션에서 작업 끝날 때마다 자동 커밋, 접두어 `FE-` / `BE-` / `SEC-` / `LEAD-`
- **push/PR**: 사용자 명시적 지시 시만
- **금지**: main 작업, 원본 main PR, feature 브랜치 생성, .env 커밋