# riskStats 클라이언트 갱신 임시 정책

> 기준일: 2026-07-28

## 현재 상태

- Firebase CLI `functions:list --project showup-project` 결과 배포 Functions 0개.
- Spark 요금제 MVP라 `riskRefresh.ts`가 예약·사건 원본을 다시 읽고 `riskStats`를 계산한다.
- Firestore Rules는 가게 owner만 완전한 `riskStats` 스키마를 쓸 수 있게 허용한다.
- 임의 admin route, custom claim, audit 컬렉션, timestamp-only 예외는 구현되어 있지 않다.

## 위험

- 가게 owner가 개발자 도구로 자기 가게 점수를 임의 조작할 수 있다.
- 원본 쓰기와 캐시 갱신이 원자적이지 않아 실패·동시 변경 시 잠시 불일치할 수 있다.
- 타 가게 접근은 `isStoreOwner()`로 차단되지만 자기 가게 무결성은 완전하지 않다.

## 이관 조건

Blaze 전환 후:

1. `functions/`의 Firestore trigger 배포
2. `src/services/riskRefresh.ts` 호출 제거
3. Rules에서 클라이언트 `riskStats` 변경 차단
4. 서버 트리거·재시도·동시성 회귀 테스트
5. 프로덕션 Functions 목록과 로그 확인
