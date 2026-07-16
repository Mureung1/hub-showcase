// ShowUp riskStats 갱신 전략

## 현재 상황

- `src/utils/risk.ts` 에 위험도 계산 순수 함수가 구현되어 있다.
- `firestore.rules` 에서 `customers` 문서의 `riskStats` 필드 직접 수정을 차단했다.
- 클라이언트 직접 갱신은 사용하지 않는다.

## 결정

**Cloud Functions 서버 트리거 방식**으로 확정.

- 예약/사건 문서 생성·수정·삭제 시 Cloud Function (onDocumentWritten) 가 자동으로 고객의 riskStats 를 재계산한다.
- 클라이언트는 `riskStats` 를 읽기만 한다.
- `src/services/riskRefresh.ts` 및 `refreshCustomerRiskStats` 는 더 이상 사용하지 않는다.

## 관련 파일

- `src/utils/risk.ts`
- `functions/src/risk.ts` (Cloud Functions 용 복사본)
- `functions/src/index.ts` (onDocumentWritten triggers)
- `firestore.rules`

## 배포 일정

7/28 (14일차) Cloud Functions 프로덕션 배포 예정.
