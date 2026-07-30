# ShowUp BE Session

> 공통 규칙은 [sessions/_COMMON.md](_COMMON.md)를 참조.

## 역할

ShowUp의 Firebase 백엔드 구조, Firestore 데이터 모델, 데이터 접근 함수,
Cloud Functions, 시드 데이터, 위험도 계산 로직을 담당한다.
이 프로젝트의 백엔드는 Express 서버가 아니라 Firebase 기준이다.

- **모델**: Kimi K2.7 Code (Ollama 연결)

## 담당 영역

- `apps/showup/src/types/schema.ts`
- `apps/showup/src/lib/firebase.ts`
- `apps/showup/src/services/`
- `apps/showup/src/utils/risk.ts`
- `apps/showup/src/utils/phone.ts` — 구현 소유는 BE, 마스킹 누락 검증은 보안
- `apps/showup/functions/`
- `apps/showup/firebase.json`
- `apps/showup/firestore.indexes.json`
- seed script

> Firebase 관련 파일(`firebase.json`, `firestore.rules`, `functions/` 등)은 전부 `apps/showup/` 하위에 둔다. hub 루트에 만들지 않는다 (모노레포 — intro 앱과 분리).

## 건드려도 되는 것

- Firebase 설정 파일
- Firestore service 함수
- Cloud Functions
- TypeScript 데이터 타입
- 위험도 계산 순수 함수
- seed/demo 데이터
- Firestore 인덱스
- Auth와 store 생성 플로우

## 건드리면 안 되는 것

- Firestore Security Rules 최종 정책을 보안과 협의 없이 변경하지 않는다.
- FE 화면을 임의로 대규모 수정하지 않는다.
- 실제 `.env` 값을 작성하지 않는다.
- Express `server/` 구조를 만들지 않는다.
- `main` 브랜치 작업.
- `.omc/`, `node_modules/`, `dist/`를 건드리지 않는다.

## 데이터 모델

```txt
stores/{storeId}
  ownerUid, name, category, createdAt

stores/{storeId}/customers/{customerId}
  name, phone, phoneLast4, createdAt, riskStats

stores/{storeId}/reservations/{resId}
  customerId, date, time
  status: pending | confirmed | visited | noShow | cancelled
  cancelledSameDay: boolean   ← cancelled일 때 당일 취소 여부 (lateCancel +4 판정용)
  memo, createdAt

stores/{storeId}/customers/{customerId}/incidents/{incidentId}
  type: abuse | dispute | late | unreasonable
  memo, occurredAt, createdAt
```

## riskStats 기준

> 기준 원본은 `docs/plan.md` §4. 가중치·등급·경고 배너 조건 전부 plan.md를 참조. 수치가 다르면 plan.md가 정답이고, 변경은 plan.md 먼저 고친 뒤 세션 문서에 반영한다.

## Cloud Function 트리거

- reservation status가 `visited`, `noShow`, `cancelled`로 변경될 때 riskStats 재계산
- incident가 생성, 수정, 삭제될 때 riskStats 재계산
- 고객 삭제 시 관련 예약과 사건 처리 정책을 보안과 함께 확인

> 2026-07-28 운영 상태: 배포 Functions 0개. 현재 앱은 `riskRefresh.ts` 클라이언트 갱신을 사용하며 `functions/`는 Blaze 이관 준비용이다.

## 작업 순서

1. `types/schema.ts`를 가장 먼저 확정한다.
2. `risk.ts`에 위험도 계산 순수 함수를 만든다.
3. 노쇼 3회, 노쇼 5회, abuse 1회, 방문 회복 -1 케이스를 검증한다.
4. `phoneLast4` 생성과 전화번호 마스킹 util을 만든다.
5. Firebase 초기화 파일을 만든다.
6. stores, customers, reservations, incidents service 함수를 만든다.
7. 회원가입 후 stores 문서 생성 플로우를 만든다.
8. seed/demo 데이터를 만든다.
9. Cloud Functions 또는 MVP 대체 갱신 로직을 붙인다.
10. FE가 사용할 응답 형태를 README 또는 주석으로 남긴다.

## 완료 기준

- FE와 보안이 공유할 타입이 명확하다.
- Firestore 경로가 기획서와 일치한다.
- `phoneLast4` 검색이 가능하다.
- 원본 phone과 마스킹 phone의 용도가 분리된다.
- 위험도 계산이 기획서 기준과 일치한다.
- 경고 조건이 `noShowCount >= 3 || incidentCounts.abuse >= 1`로 구현된다.
- seed 데이터로 고객 검색, 예약, 사건, 위험도 계산을 확인할 수 있다.
- 빌드 또는 타입 체크가 통과한다.