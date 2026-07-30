# ShowUp 에러 핸들링 표준화 + Cloud Functions 배포 준비 패턴

## 적용 시점

- 체크리스트 10일차(또는 그 이상)에서 다음 항목을 처리할 때
  - 에러 핸들링 표준화
  - Cloud Functions 배포 준비
  - firestore.rules `get()` 호출 최소화

## 1. 서비스 레이어 에러 표준화

### 파일: `src/utils/errors.ts`

에러 클래스:
- `ShowUpError(message, code)` — 기본
- `NotFoundError(resource)` — 문서/자원 없음
- `PermissionError(message?)` — 권한 없음
- `ValidationError(message)` — 입력값 검증 실패

헬퍼:
- `isShowUpError(error)` — 타입 가드
- `wrapFirestoreError(error)` — Firebase Firestore 에러를 `ShowUpError` 로 변환

### 파일: `src/services/withErrorHandling.ts`

```ts
import { wrapFirestoreError } from '../utils/errors';

export async function withErrorHandling<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    throw wrapFirestoreError(error);
  }
}
```

이후 각 서비스 함수는 `withErrorHandling(() => { ... })`로 감싸면 Firestore 에러를 통일된 형태로 던진다.

## 2. Cloud Functions 배포 준비

### 필요 파일

- `apps/showup/functions/package.json`
- `apps/showup/functions/tsconfig.json`
- `apps/showup/functions/src/index.ts` — `onDocumentWritten` 트리거
- `apps/showup/functions/src/risk.ts` — `src/utils/risk.ts` 와 동기화된 복사본
- `apps/showup/firebase.json` — `functions` 섹션 추가
- `apps/showup/.firebaserc` — 프로젝트 alias

### firebase.json 예시

```json
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "functions": [
    {
      "source": "functions",
      "codebase": "default"
    }
  ],
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"]
  }
}
```

### 배포 절차

```bash
cd apps/showup/functions
npm install
npm run build
firebase deploy --only functions
```

### 검증

- Firestore Console → reservations 문서 수정
- customers/{customerId}/riskStats.score 가 자동 갱신되는지 확인
- `firebase functions:log` 로 에러 확인

## 3. firestore.rules 최적화

보안 세션에서 `isStoreOwner(storeId)` 헬퍼 함수로 `get()` 호출 중복 제거.

```firestore
function isStoreOwner(storeId) {
  return request.auth != null
    && get(/databases/$(database)/documents/stores/$(storeId)).data.ownerUid == request.auth.uid;
}
```

- 동일 요청 내 `get()` 결과는 캐싱되어 비용 1회로 처리
- customers/incidents/reservations 모두 `isStoreOwner(storeId)` 사용

## 주의사항

- `functions/`는 root workspace에 포함하지 않는다. 독립 `package.json` 사용.
- `risk.ts`와 `functions/src/risk.ts` 로직이 동일한지 주기적으로 확인.
- Cloud Function 배포 후 클라이언트의 `riskRefresh.ts` 사용 코드가 남아있으면 안 됨.
- `.firebaserc`는 환경별 프로젝트 alias를 가리키므로, 여러 프로젝트가 있으면 사용자 확인 필요.

## 관련 문서

- `docs/cloud-functions-deploy.md` — 배포 직전 체크리스트
- `functions/src/index.ts`
- `src/utils/errors.ts`
- `src/services/withErrorHandling.ts`
