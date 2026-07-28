# ShowUp Cloud Functions 이관 체크리스트

> 기준일: 2026-07-28. `showup-project`에는 배포 Functions가 0개다.

## 전제

- Firebase Blaze 요금제 전환
- Firebase CLI 로그인과 `showup-project` 선택 확인
- `functions/src/risk.ts`가 `src/utils/risk.ts`와 동기화됐는지 확인

## 배포 전

```bash
cd apps/showup/functions
npm ci
npm run build
cd ..
firebase emulators:exec --only firestore,functions "npm run verify:security"
```

예약 생성·상태 변경·삭제, 사건 생성·수정·삭제, 예약 고객 변경, 고객 삭제 race를 에뮬레이터에서 확인한다.

## 배포

```bash
firebase deploy --only functions --project showup-project
firebase functions:list --project showup-project
firebase functions:log --project showup-project
```

## 앱·Rules 전환

1. `createReservationAndRefresh` 등 `*AndRefresh` 호출을 원본 CRUD 함수로 교체
2. `firestore.rules`에서 클라이언트 `riskStats` 변경 차단
3. Rules 회귀 테스트의 “owner riskStats 허용” 케이스를 “차단”으로 변경
4. Hosting과 Rules 재배포
5. 프로덕션에서 이벤트 기록 후 `riskStats` 자동 변경 확인

Functions 배포 전 클라이언트 갱신을 제거하거나, 클라이언트 제거 전 Rules를 차단하면 MVP 핵심 루프가 깨진다. 순서 엄수.
