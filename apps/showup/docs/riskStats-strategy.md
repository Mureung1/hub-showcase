# ShowUp riskStats 갱신 전략

## 현재 상황

- `src/utils/risk.ts` 에 위험도 계산 순수 함수가 구현되어 있다.
- `src/services/riskRefresh.ts` 는 클라이언트에서 예약/사건 변경 후 `riskStats` 를 직접 갱신한다.
- 하지만 `firestore.rules` 에서 `customers` 문서의 `riskStats` 필드 직접 수정을 차단했다.
  - `!('riskStats' in request.resource.data.keys())`

## 결과

`riskRefresh.ts` 의 `updateDoc(customerRef, { riskStats: ... })` 는 실제 Firestore 에서 **Permission denied** 가 발생한다.

## 선택지

### A. Cloud Functions 로 이관 (권장, 7/28 배포)

- 예약/사건 문서 생성·수정·삭제 시 Cloud Function (onWrite trigger) 가 자동으로 고객의 riskStats 를 재계산한다.
- 클라이언트는 `riskStats` 를 읽기만 한다.
- 보안 규칙의 `riskStats` 쓰기 차단을 그대로 유지할 수 있다.
- 단점: 지금 당장 로컬 개발/데모에서는 emulator 없이는 테스트 불가.

### B. 임시로 Security Rules 에서 riskStats 수정 허용 (MVP 개발 기간 한정)

- `allow update` 에서 `riskStats` 조건 제거.
- 클라이언트 `riskRefresh.ts` 가 그대로 동작한다.
- 단점: 보안 규칙이 약화되고, 프로덕션 배포 전에 반드시 복원해야 한다.

### C. 클라이언트에서만 계산, Firestore 에는 저장하지 않음

- `searchCustomers` 결과를 반환할 때마다 실시간으로 `riskStats` 를 계산한다.
- Firestore 의 `riskStats` 필드를 사용하지 않는다.
- 단점: 정렬/대시보드 집계에 불리하고, 페이지 이동 시 계산량이 늘어난다.

## BE 세션 제안

**개발/데모 기간에는 B 또는 C 를 선택**하고, **프로덕션 배포 전(7/28)에 A 로 이관**한다.

FE 세션과 LEAD/보안 세션의 결정이 필요하다.

## 관련 파일

- `src/utils/risk.ts`
- `src/services/riskRefresh.ts`
- `src/services/customers.ts` (`refreshCustomerRiskStats`)
- `firestore.rules`
- `functions/src/riskStatsOnWrite.ts` (Cloud Function 초안 예정)
