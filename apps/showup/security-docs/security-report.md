# ShowUp 보안 리포트

> 최종 갱신: 2026-07-28

## 확인 결과

- Hosting `/`, `/privacy`, `/terms`: HTTP 200
- 프로덕션 Firestore 복합 인덱스: Firebase CLI 조회 확인
- 프로덕션 Cloud Functions: `functions:list` 결과 0개
- 로컬 Firestore Rules 회귀 테스트: 18/18 PASS
- 앱 lint/typecheck/build 및 Functions TypeScript build: PASS
- production dependency audit: Firebase 관련 취약점 0건, React Router RSC 전용 high 2건 잔존
- Functions 이관용 런타임 audit: optional Google SDK 제외 시 0건; optional SDK 포함 시 Firebase Admin 하위 의존성 14건 잔존

## 현재 보안 모델

- 모든 경로는 `request.auth`와 부모 store의 `ownerUid`를 검증한다.
- store의 `ownerUid` 변경과 클라이언트 직접 store 삭제를 차단한다.
- 고객·사건·예약은 허용 키, 필수 필드, 타입·형식·메모 길이를 검증한다.
- `phone`과 `phoneLast4`는 함께 변경해야 한다.
- 예약 `customerId`는 생성 후 클라이언트에서 변경할 수 없다.
- Firebase Storage는 MVP 미사용이며 전체 read/write를 거부한다.
- UI 서비스는 원본 전화번호 대신 `phoneMasked`만 반환한다.

## Rules 회귀 테스트 18개

1. 비로그인 store read/write 차단
2. 타 가게 store 접근 차단
3. ownerUid 위조 store 생성 차단
4. ownerUid 변경 및 store 직접 삭제 차단
5. 타 가게 고객 CRUD 차단
6. 고객 필수 필드·형식 검증
7. phoneLast4 단독 변경 차단
8. riskStats 스키마 검증
9. 타 가게 사건 CRUD 차단
10. 사건 type·memo 검증
11. 사건 임의 필드 차단
12. 타 가게 예약 CRUD 차단
13. 예약 status 검증 및 customerId 변경 차단
14. 정상 소유자 핵심 CRUD 허용
15. 예약 고객 존재·상태 역행 차단
16. 존재하지 않는 고객 사건 생성 차단
17. 고객 삭제 후 orphan 예약·사건 직접 read 차단 및 목록 필터 기준 확인
18. 예약 날짜·시간 형식 검증 (전화번호는 6번에서 검증)

실행:

```bash
cd apps/showup
firebase emulators:exec --only firestore "npm run verify:security"
```

## 이번 감사에서 수정한 보안·무결성 문제

- 추적되지 않던 `.mjs` 보안 테스트를 clone 가능한 단일 테스트로 교체
- 손상된 `storage.rules` 문법 수정 및 전체 deny
- 고객 삭제 시 연결 예약·사건 batch cascade
- 불완전한 `riskStats`, 임의 필드, ownerUid/customerId 변경 차단
- 사건 메모 최대 500자 제한
- `/privacy`, `/terms` placeholder 제거
- Firebase 10.14.1 → 12.16.0 업그레이드로 Firebase/undici production 취약점 제거

## 남은 위험

- Spark MVP는 클라이언트 `riskRefresh.ts`가 `riskStats`를 쓴다. 타 가게 조작은 막지만 owner가 자기 가게 점수를 조작할 수 있고 동시성 race가 남는다.
- 프로덕션 Rules/Storage/Hosting은 이번 수정 뒤 아직 재배포하지 않았다.
- 고객 삭제 cascade는 여러 batch에 걸치므로 500개 초과 대량 데이터에서 완전한 원자 작업은 아니다.
- 계정 탈퇴 및 가게 전체 데이터 삭제 기능이 없다.
- 법적 문안은 MVP 운영 초안이며 상용화 전 전문가 검토가 필요하다.
- 데모 비밀번호가 공개되어 누구나 데모 데이터를 바꿀 수 있다.
- React Router 7.18.1의 RSC 모드 CSRF advisory가 남아 있다. 현재 앱은 declarative SPA이며 RSC·Action을 사용하지 않아 해당 경로는 노출되지 않지만 패치 버전 추적이 필요하다.

## 배포 순서

1. 로컬 Rules 테스트 재실행
2. `firebase deploy --only firestore:rules,storage --project showup-project`
3. Hosting build 후 `firebase deploy --only hosting --project showup-project`
4. 프로덕션 로그인·검색·예약·상태 변경·사건 기록·위험도 갱신 확인
5. Lighthouse·콘솔 에러·법적 페이지 확인
