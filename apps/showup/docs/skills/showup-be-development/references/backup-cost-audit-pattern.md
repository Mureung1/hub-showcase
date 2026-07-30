# ShowUp BE: 백업 / 비용 점검 패턴

> 9일차(2026-07-21) BE 세션에서 checklist "Firestore 비용 점검", "백업/복구 확인" 항목을 처리한 패턴.

## 처리 원칙

비기능 checklist 항목은 문서만 남기지 않고, **실행 가능한 스크립트 + 점검 문서**를 함께 만든다.

## 1. Firestore 백업/덤프 스크립트

파일: `apps/showup/src/seeds/download.ts`

- `firebase-admin` 사용.
- 실행 전 `GOOGLE_APPLICATION_CREDENTIALS` 환경변수 필요.
- `npx tsx src/seeds/download.ts <storeId>`
- `backups/<storeId>/<ISO>.json` 형태로 덤프.
- store + customers + reservations + incidents(sub-collection) 모두 포함.

package.json 스크립트 추가:

```json
"seed:download": "tsx src/seeds/download.ts"
```

## 2. Firestore 비용 점검 문서

파일: `apps/showup/docs/firestore-cost.md`

내용:
- 화면별 읽기 호출 횟수 표
- N+1 등 비효율 지점 표시
- 개선안 A/B/C
- MVP 단계에서의 결정과 이유
- 관련 파일/인덱스 목록

## 3. 검증

스크립트 추가 후:
- `npm run typecheck -w showup`
- `npm run lint -w showup`
- `functions/` 변경 없으면 functions tsc는 불필요

## 주의

- 백업 스크립트는 프로덕션 데이터 덤프이므로, 로컬 `backups/` 디렉토리는 `.gitignore`에 추가해야 한다. LEAD 세션과 확인 필요.
