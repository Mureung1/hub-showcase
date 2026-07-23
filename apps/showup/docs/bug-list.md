# ShowUp 통합 QA 버그 목록 (11일차)

> 10일차 통합 QA + 코드 검증 기반. 심각도별 정렬.

## P0 - 배포 전 필수 수정

| # | 세션 | 파일:줄 | 문제 | 상태 |
|---|---|---|---|---|
| 1 | FE | CustomerDetail.tsx:25 | `useState<any>` 타입 미사용 — Customer 타입 적용 필요 | 미수정 |
| 2 | FE | CustomerDetail.tsx:61,124 | `occurredAt as any` 타입 캐스팅 — Timestamp 변환 로직 필요 | 미수정 |

## P1 - 배포 전 권장 수정

| # | 세션 | 파일:줄 | 문제 | 상태 |
|---|---|---|---|---|
| 3 | FE | src/mock/ | mock 데이터 잔존 (import 0건이나 파일 존재) — cleanup 대상 | 미수정 |
| 4 | FE | services/storeFlow.ts | 데드 코드 (import 0건) — 삭제 대상 | 미수정 |

## P2 - 데모/발표 전 확인

| # | 세션 | 항목 | 문제 | 상태 |
|---|---|---|---|---|
|| 5 | BE | Cloud Functions 배포 | onWrite 트리거가 프로덕션에서 동작하는지 미확인 | **Spark 요금제 불가. 클라이언트 갱신(riskRefresh.ts)으로 대체, functions/ 유지** |
|| 6 | BE | Firestore 인덱스 배포 | 복합 인덱스가 프로덕션에 배포되었는지 미확인 | **배포 완료 (2026-07-23)** |
|| 7 | 보안 | 프로덕션 규칙 배포 | firestore.rules가 프로덕션에 배포되었는지 미확인 | **배포 완료 (2026-07-23)** |
| 8 | FE | Lighthouse 실측 | 코드 스플리팅 적용했으나 실제 Lighthouse 점수 미측정 | 미측정 |

## 이미 해결된 항목 (6일차)

| # | 항목 | 해결 커밋 |
|---|---|---|
| - | Reservations.tsx id 덮어쓰기 | 232b07e8 |
| - | CustomerDetail 액션 버튼 미연결 | 53ff161c |
| - | riskRefresh 미연동 | 232b07e8 (Cloud Functions로 이관) |
| - | riskStats 쓰기 차단 규칙 누락 | 07baef33 |
| - | phone 원본 노출 | 232b07e8 (getCustomer 마스킹) |
| - | penetration-test.ts 빈 껍데기 | 07baef33 |
| - | isSameDay 타임존 버그 | 232b07e8 |
| - | updatedAt 미갱신 | 232b07e8 |
| - | incidents occurredAt 캐스팅 | 232b07e8 |

## 세션별 할당

### FE (P0 + P1)
- CustomerDetail.tsx `any` 타입 3건 -> Customer/Timestamp 타입 적용
- src/mock/ 삭제
- services/storeFlow.ts 삭제

### BE (P2)
- Cloud Functions 프로덕션 배포
- Firestore 인덕스 프로덕션 배포
- 데모용 가게 계정 생성 + 시드 데이터 확정

### 보안 (P2)
- firestore.rules 프로덕션 배포 + 스모크 테스트