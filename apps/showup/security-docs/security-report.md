# ShowUp 보안 리포트 (최종)

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
| customers | isStoreOwner | isStoreOwner + name/phone/phoneLast4 타입 검증 | isStoreOwner + riskStats 쓰기 차단 + 필드 타입 검증 | isStoreOwner |
| incidents | isStoreOwner | isStoreOwner + type 허용값 검증 + memo 타입 | isStoreOwner + type 허용값 검증 | isStoreOwner |
| reservations | isStoreOwner | isStoreOwner + status 허용값 검증 | isStoreOwner + status 허용값 검증 | isStoreOwner |

### 허용값 검증
- incident type: `abuse`, `dispute`, `late`, `unreasonable`
- reservation status: `pending`, `confirmed`, `visited`, `noShow`, `cancelled`

## 3. 침투 테스트 결과 (10개 시나리오)

| # | 시나리오 | 결과 |
|---|----------|------|
| 1 | 타 가게 storeId read/write 차단 | PASS |
| 2 | 타 가게 고객 read/write 차단 | PASS |
| 3 | 타 가게 사건 read/write 차단 | PASS |
| 4 | 허용되지 않은 incident type 차단 | PASS |
| 5 | 클라이언트 riskStats 직접 수정 차단 | PASS |
| 6 | 사건 update 시 허용되지 않은 type 차단 | PASS |
| 7 | 고객 삭제 후 하위 incidents 잔존 (cascade 미구현) | PASS (이슈 기록) |
| 8 | 동의 체크박스 미체크 시 가입 차단 | PASS |
| 9 | 비로그인 접근 전 차단 | PASS |
| 10 | 타 가게 예약 read/write 차단 + status 검증 | PASS |

## 4. 전화번호 마스킹

- 원본 phone은 Firestore에 저장, 화면 표시는 `phoneMasked` (`010-****-1234`)만 사용
- 서비스 함수 `enrichCustomer()`가 `CustomerSearchResult` 반환 — 원본 phone 미포함
- FE 전 파일 검색: `.phone` 직접 렌더링 0건 (7/20, 7/22 재확인)
- Firestore Rules는 필드 단위 읽기 제한 미지원 → 서비스 레이어 마스킹으로 보완

## 5. riskStats 쓰기 보호

- 클라이언트에서 `riskStats` 필드 직접 update 차단 (rules)
- `refreshCustomerRiskStats()`는 Cloud Function 전용 설계
- 클라이언트 코드에서 riskStats 갱신 제거 예정 (BE/FE 작업)

## 6. 법무 체크리스트

| 항목 | 상태 |
|------|------|
| 개인정보 처리방침 게시 (/privacy) | 완료 |
| 이용약관 게시 (/terms) | 완료 |
| "블랙리스트" 용어 0건 | 확인 완료 |
| 사건 기록 "사실만 기록해주세요" 안내 | IncidentModal에 표시 |
| 개인정보 동의 체크박스 없이 가입 차단 | 테스트 PASS |

## 7. 알려진 이슈

### 7.1 cascade 삭제 미구현
- `deleteCustomer()`가 하위 incidents, reservations 미삭제
- Firestore는 자동 cascade 미지원
- **조치**: BE에서 `deleteCustomer()`에 하위 문서 삭제 로직 추가 필요
- **보안 영향**: 고객 삭제 후에도 하위 문서 접근은 rules로 차단됨 (owner만) — 데이터 유출 위험 없음

### 7.2 Cloud Functions 미배포
- riskStats 재계산 로직이 클라이언트에 남아 있음
- **조치**: BE에서 Cloud Functions 배포 후 클라이언트 갱신 코드 제거

## 8. 규칙 성능

- `isStoreOwner()` helper로 get() 호출 통합
- Firestore는 동일 요청 내 동일 문서 get() 결과 캐싱 → 컬렉션 list 쿼리 시 get() 비용 1회
- stores/{storeId} 자체 read/update/delete는 `resource.data` 사용 → get() 불필요

## 9. 프로덕션 배포 준비

- `firestore.rules` 파일 확정
- `firebase deploy --only firestore:rules` 명령으로 배포 가능
- 배포 전 에뮬레이터 회귀 테스트 10개 PASS 확인 필요