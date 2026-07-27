# ShowUp

**소상공인을 위한 노쇼·악성 고객 이력 관리 및 위험도 경고 웹서비스**

> 기존 예약 서비스가 '예약 접수'에 집중했다면, ShowUp은 소상공인이
> 노쇼·폭언·분쟁 같은 문제 고객 피해를 줄일 수 있도록 고객 이력과
> 위험도를 관리하고 예약 전에 경고하는 데 초점을 둔다.

- **배포 URL**: https://showup-project.web.app
- **기간**: 2026-07-07 ~ 2026-07-28 (사전 세팅 7/7~7/8, 개발 7/9~7/28, 주 5일 14영업일)
- **진행**: Hermes Agent 프레임워크 + Ollama Pro 모델 4세션 (프론트엔드 / 백엔드 / 보안 / 리드)
- **세션별 모델**: 리드·GLM 5.2 / 프론트엔드·Qwen 3.5 / 백엔드·Kimi K2.7 Code / 보안·GLM 5.2 (Ollama)

## 문제 정의

예약제로 운영하는 소상공인(카페·식당·미용실·공방 사장님)이, 노쇼·상습
지각·폭언·환불 분쟁 같은 문제 고객을 반복해서 겪으면서도, 어떤 고객이
위험한지 기록하고 예약 전에 확인할 수단이 없어 같은 피해를 계속 반복한다.

## 핵심 기능 (MVP 2개)

| 기능 | 설명 |
|------|------|
| **고객 이벤트 기록** | 예약 상태(방문/노쇼/취소) 원터치 + 악성 행동 사건 기록(카테고리+사실 메모) |
| **위험도 조회 + 자동 경고** | 전화 뒤 4자리/이름 검색 → 3등급 표시, 노쇼 3회+/폭언 사건 1회+ 시 강제 경고 배너 |

## 위험도 설계

| 이벤트 | 점수 | | 등급 | 점수 범위 |
|--------|------|---|------|-----------|
| 노쇼 | +8 | | 안심 (low) | 0–23 |
| 당일 취소 | +4 | | 주의 (medium) | 24–39 |
| 상습 지각 | +2 | | 위험 (high) | 40+ |
| 폭언·위협 | +10 | | | |
| 환불 분쟁 | +6 | | | |
| 무리한 요구 | +4 | | | |
| 정상 방문 | −1 (회복) | | | |
| 최근 30일 노쇼 | +5 | | | |

- 폭언 1회+ → 점수 무관 최소 '주의' 보장
- 정상 방문 시 점수 차감 → 개선된 고객은 등급 회복 (낙인 방지)
- 업계 관행(2회 경고·3회 제한)보다 완화된 3회 기준 + 제한 대신 경고·판단 위임

## 기술 스택

- 프론트엔드: Vite + React + TypeScript + Tailwind CSS
- 상태 관리: TanStack Query(서버 상태) + Zustand(UI 상태)
- 폼: React Hook Form + Zod
- 백엔드: Firebase (Auth / Firestore / Hosting)
- 코드 스플리팅: React.lazy + Suspense, manualChunks (메인 청크 9.82KB)
- 개발 도구: Hermes Agent (AI 에이전트 프레임워크) + Ollama Pro 모델
- 버전 관리: Git (단일 브랜치 `N167_채민석`, GitHub fork PR 구조)

## Firestore 데이터 모델

```
stores/{storeId}                              ← ownerUid == auth.uid (가게 격리)
stores/{storeId}/customers/{customerId}       ← name, phone, phoneLast4, riskStats
stores/{storeId}/customers/{customerId}/incidents/{incidentId}  ← type, memo, occurredAt
stores/{storeId}/reservations/{reservationId}  ← customerId, date, time, status
```

- `storeId = user.uid` — 가게 간 데이터 격리 (Firestore Rules ownerUid 검증)
- `riskStats` 비정규화 캐시 — 검색 1회 = 읽기 1회 (비용 최적화)
- 전화번호 원본 저장, 화면 표시는 항상 마스킹 (`010-****-1234`)

## 보안

- **가게 격리**: `isStoreOwner(storeId)` → `ownerUid == auth.uid` 검증
- **침투 테스트**: 14개 시나리오 전부 PASS (security/smoke-test.mjs)
- **필드 검증**: name/phone/phoneLast4 타입, incident type enum, reservation status enum
- **마스킹**: 원본 전화번호 화면 노출 0건
- **용어**: "블랙리스트" 금지 → "고객 이력" / "참고 지표"

## 검증 결과

| 항목 | 상태 |
|------|------|
| lint | ✅ PASS (warning 0, error 0) |
| typecheck | ✅ PASS (tsc -b) |
| build | ✅ PASS (메인 청크 9.82KB) |
| risk 단위 테스트 | ✅ PASS |
| phone 단위 테스트 | ✅ PASS |
| search 단위 테스트 | ✅ 13 passed, 0 failed |
| seed 단위 테스트 | ✅ PASS |
| 보안 스모크 테스트 | ✅ 14개 PASS |

## 문서

- [기획서 전문](docs/plan.md)
- [작업 체크리스트](docs/checklist.md)
- [아키텍처 다이어그램](docs/architecture.md) — 전체 데이터 흐름 (화면 - 서비스 - Firestore)
- [검증 Skill](docs/verify-skill.md) — lint + typecheck + build + 단위 테스트 자동화
- [유저 플로우](docs/user-flow.md)
- [1주차 발표 자료](docs/presentations/0710.md) — 7/10 금
- [2주차 발표 데크 (1~2주차 통합)](outputs/weeks2/showup-week1-2-integrated-deck-v2.pptx) — 7/16 목
- [2주차 핵심 기능 시연 스크립트](outputs/weeks2/showup-core-demo-script.md) — 7/16 목
- [3주차 발표 자료](docs/presentations/0724.md) — 7/24 금
- [3주차 발표 데크 (PPTX)](outputs/weeks3/showup-week3-deck.pptx) — 15슬라이드
- [프로토타입 (HTML/CSS)](prototype/index.html) — 4개 화면 시연

## 원칙

- 블랙리스트 아님 — 위험도는 참고 지표, 최종 판단은 사장님
- 가게 단위 데이터 격리 (Firestore 보안 규칙으로 서버 강제)
- 전화번호 화면 표시는 항상 마스킹 (`010-****-1234`)
- 가게 간 자동 공유 없음 — 고객 동의 기반 신뢰 프로필(Phase 2)로 설계

## 로드맵 (7/28 이후)

- **Phase 1.5**: 월별 노쇼·사건 통계 차트 (Recharts)
- **Phase 2**: 고객 본인 인증 조회 (/me) + 정정·삭제 요청·이의제기 접수
- **Phase 3**: 예약금 결제 (토스페이먼츠) + 외부 예약 플랫폼 연동

## 데모 계정

- 이메일: `demo@showup.example`
- 비밀번호: `demoPassword123!`
- 가게명: 카페 마루 (데모)