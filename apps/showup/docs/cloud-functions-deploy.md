// ShowUp Cloud Functions 배포 준비 체크리스트
// 7/28 (14일차) 프로덕션 배포 직전에 실행할 단계.

## 사전 준비

1. **Firebase CLI 로그인**
   ```bash
   firebase login
   ```

2. **프로젝트 선택**
   ```bash
   firebase use showup-project
   ```

## 빌드 및 배포

3. **functions 의존성 설치**
   ```bash
   cd apps/showup/functions
   npm install
   ```

4. **TypeScript 빌드**
   ```bash
   npm run build
   ```

5. **Functions 배포**
   ```bash
   firebase deploy --only functions
   ```

## 검증

6. **트리거 테스트**
   - Firebase Console → Firestore Database → reservations 컬렉션
   - 문서 하나 추가/수정/삭제
   - customers/{customerId}/riskStats.score 가 자동 변경되는지 확인

7. **로그 확인**
   ```bash
   firebase functions:log
   ```

## 주의

- `functions/src/risk.ts` 는 `src/utils/risk.ts` 와 로직 동기화 필요.
- Cloud Function 배포 후 클라이언트의 `riskRefresh.ts` 사용 코드가 남아있으면 안 됨.
- Firestore Security Rules 는 riskStats 쓰기를 계속 차단해야 함.

## 관련 파일

- `functions/src/index.ts`
- `functions/src/risk.ts`
- `functions/package.json`
- `firestore.rules`
