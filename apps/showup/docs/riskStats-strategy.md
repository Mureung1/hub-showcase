# ShowUp riskStats 갱신 전략

> 기준일: 2026-07-28

## 현재 운영 방식

- Firebase CLI `functions:list --project showup-project`: 배포 Functions 0개
- Spark MVP는 `src/services/riskRefresh.ts`가 예약·사건 원본을 읽어 `src/utils/risk.ts`로 재계산
- Firestore Rules는 가게 owner의 완전한 `riskStats` 스키마 갱신만 허용
- 검색은 고객 문서의 비정규화 `riskStats` 캐시를 읽음

## 알려진 위험

- owner가 자기 가게 점수를 임의 조작 가능
- 원본 이벤트 쓰기와 캐시 갱신이 원자적이지 않음
- 동시에 갱신하면 마지막 쓰기가 앞선 계산을 덮을 수 있음
- 클라이언트와 `functions/src/risk.ts` 복사본의 수동 동기화 필요

## 이번 점검에서 보완한 부분

- 노쇼 최신성은 `statusChangedAt` 우선, 기존 문서는 `createdAt` fallback
- 미래 시각 이벤트는 최근 30일 보너스에서 제외
- Functions 이관 코드에서 예약 고객 변경 시 이전·새 고객 모두 재계산
- 고객 삭제 뒤 trigger가 실행돼도 없는 고객은 건너뜀

## Blaze 이관 순서

1. Functions trigger 에뮬레이터 검증
2. `firebase deploy --only functions`
3. 프로덕션 Functions 목록·로그·재계산 확인
4. 페이지의 `*AndRefresh` 호출을 원본 CRUD 호출로 교체
5. Rules에서 클라이언트 `riskStats` 변경 차단
6. `riskRefresh.ts`와 중복 계산 경로 제거
