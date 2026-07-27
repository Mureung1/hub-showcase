# ShowUp 보안 리포트 (최종 — 13일차 7/27)

## 1. 보안 아키텍처 요약

ShowUp은 Firestore Security Rules 기반 가게 격리 모델 사용. 모든 데이터 접근은 `ownerUid == request.auth.uid` 검증으로 서버 강제.

### 데이터 모델
```
stores/{storeId}                          — ownerUid
stores/{storeId}/customers/{customerId}   — phone(원본), phoneLast4
stores/{storeId}/customers/{customerId}/incidents/{incidentId}
stores/{storeId}/reservations/{reservationId}
```

## 2. Firestore Security Rules 구조

### Helper function
- `isStoreOwner(storeId)`: get()으로 부모 store의 ownerUid 검증. 동일 요청 내 결과 캐싱 → 비용 1회.

### 컬렉션별 규칙
| 컬렉션 | read | create | update | delete |
|--------|------|--------|--------|--------|
| stores | resource.data.ownerUid == auth.uid | request.resource.data.ownerUid == auth.uid | resource.data.ownerUid == auth.uid | resource.data.ownerUid == auth.uid |
| customers | isStoreOwner | isStoreOwner + name/phone/phoneLast4 타입 검증 | isStoreOwner + 필드 타입 검증 | isStoreOwner |
| incidents | isStoreOwner | isStoreOwner + type 허용값 검증 + memo 타입 | isStoreOwner + type 허용값 검증 | isStoreOwner |
| reservations | isStoreOwner | isStoreOwner + status 허용값 검증 | isStoreOwner + status 허용값 검증 | isStoreOwner |

### 허용값 검증
- incident type: `abuse`, `dispute`, `late`, `unreasonable`
- reservation status: `pending`, `confirmed`, `visited`, `noShow`, `cancelled`

## 3. 침투 테스트 결과 (프로덕션 최종 스모크 테스트 — 13일차 7/27)

14개 시나리오 전체 PASS (에뮬레이터 기반, `@firebase/rules-unit-testing` v5)

| # | 시나리오 | 결과 |
|---|----------|------|
| 1 | 비로그인 store read/write 차단 | PASS |
| 2 | 타 가게 store read 차단 | PASS |
| 3 | ownerUid 위조 store create 차단 | PASS |
| 4 | 타 가게 고객 read/write 차단 | PASS |
| 5 | 타 가게 사건 read/write 차단 | PASS |
| 6 | 허용되지 않은 incident type create 차단 | PASS |
| 7 | incident update 시 허용되지 않은 type 차단 | PASS |
| 8 | 타 가게 예약 read/write 차단 | PASS |
| 9 | 예약 status 허용값 외 차단 | PASS |
| 10 | 고객 create 필드 타입 검증 (name/phone/phoneLast4) | PASS |
| 11 | riskStats 클라이언트 갱신 허용 (Spark 요금제) | PASS |
| 12 | 고객 update 필드 검증 (name 빈 문자열 차단) | PASS |
| 13 | 비로그인 고객/예약/사건 접근 전 차단 | PASS |
| 14 | 정상 소유자 CRUD 허용 (store+customer+reservation+incident) | PASS |

> 테스트 파일: `security/smoke-test.mjs`
> 실행 명령: `node --experimental-vm-modules apps/showup/security/smoke-test.mjs`

## 4. 전화번호 마스킹

- 원본 phone은 Firestore에 저장, 화면 표시는 `phoneMasked` (`010-****-1234`)만 사용
- 서비스 함수 `enrichCustomer()`가 `CustomerSearchResult` 반환 — 원본 phone 미포함
- FE 전 파일 검색: `customer.phone` 직접 렌더링 0건 (7/27 최종 재확인)
- FE 페이지 전부 `phoneMasked` 사용: Customers.tsx, NewReservation.tsx, CustomerDetail.tsx, Dashboard.tsx
- `customer.phone` 참조는 seeds/upload.ts, createDemoStore.ts(서버 사이드 시드 스크립트)에서만 사용 — UI 노출 없음
- Firestore Rules는 필드 단위 읽기 제한 미지원 → 서비스 레이어 마스킹으로 보완

## 5. riskStats 쓰기 보호

- **현재 상태**: Spark 요금제 (Cloud Functions 미배포) → riskStats 클라이언트 갱신 허용
- **이유**: Cloud Functions 배포 불가 (Spark 요금제 제한), 클라이언트 `riskRefresh.ts`로 위험도 갱신 대체
- **Blaze 업그레이드 시**: rules에서 riskStats 쓰기 차단 + Cloud Functions `onDocumentWritten` 트리거로 이관 예정
- 보안 영향: owner만 자기 가게 riskStats 갱신 가능 → 타 가게 데이터 조작 위험 없음

## 6. 법무 체크리스트

| 항목 | 상태 |
|------|------|
| 개인정보 처리방침 게시 (/privacy) | 완료 |
| 이용약관 게시 (/terms) | 완료 (13일차 깨진 텍스트 수정) |
| "블랙리스트" 용어 0건 (코드/화면) | 확인 완료 (7/27 최종 재확인) |
| "블랙리스트" 용어 (보안 문서 내 금지 안내) | 2건 — 정책 문서 내 금지 규정으로서 언급, 코드/화면 0건 |
| 사건 기록 "사실만 기록해주세요" 안내 | IncidentModal에 표시 |
| 개인정보 동의 체크박스 없이 가입 차단 | 테스트 PASS |

## 7. 알려진 이슈

### 7.1 cascade 삭제 미구현
- `deleteCustomer()`가 하위 incidents, reservations 미삭제
- Firestore는 자동 cascade 미지원
- **조치**: BE에서 `deleteCustomer()`에 하위 문서 삭제 로직 추가 필요
- **보안 영향**: 고객 삭제 후에도 하위 문서 접근은 rules로 차단됨 (owner만) — 데이터 유출 위험 없음
- **13일차 상태**: 미해결 — 데모/발표 범위에서는 사용자가 고객 삭제를 직접 수행하지 않으므로 영향 없음

### 7.2 Cloud Functions 미배포
- riskStats 재계산 로직이 클라이언트(`riskRefresh.ts`)에 남아 있음
- **조치**: BE에서 Cloud Functions 배포 후 클라이언트 갱신 코드 제거
- **보안 영향**: owner만 자기 가게 riskStats 갱신 가능 — 타 가게 조작 위험 없음

### 7.3 terms-draft.md 라인 10 깨진 텍스트 (13일차 수정 완료)
- 기존: `## ics://  ---  Placeholder  ---` (깨진 헤더)
- 수정: 정상적인 섹션 구조로 복원

## 8. 규칙 성능

- `isStoreOwner()` helper로 get() 호출 통합
- Firestore는 동일 요청 내 동일 문서 get() 결과 캐싱 → 컬렉션 list 쿼리 시 get() 비용 1회
- stores/{storeId} 자체 read/update/delete는 `resource.data` 사용 → get() 불필요

## 9. 프로덕션 배포 상태

- `firestore.rules` 파일 확정 — 프로덕션 배포 완료 (2026-07-23)
- `firebase deploy --only firestore:rules` 명령으로 배포
- 에뮬레이터 회귀 테스트 14개 PASS 확인 (13일차 7/27)

## 10. 보안 산출물 목록

| 파일 | 내용 |
|------|------|
| `security-docs/security-report.md` | 본 문서 — 보안 리포트 최종 |
| `security-docs/penetration-test.md` | 침투 테스트 시나리오 정의 |
| `security-docs/riskstats-exception.md` | riskStats 클라이언트 갱신 예외 정책 |
| `security-docs/privacy-draft.md` | 개인정보 처리방침 초안 |
| `security-docs/terms-draft.md` | 이용약관 초안 (13일차 수정) |
| `security/smoke-test.mjs` | 프로덕션 최종 스모크 테스트 (14개 시나리오) |
| `firestore.rules` | Firestore Security Rules |
| `firestore.indexes.json` | Firestore 복합 인덱스 |