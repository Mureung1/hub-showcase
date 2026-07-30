# Firebase Console 초기 설정 절차

ShowUp Firebase 프로젝트 초기 설정 시 LEAD/BE/FE 세션이 공통으로 참고.

## 1. 프로젝트 생성

- https://console.firebase.google.com/
- "프로젝트 추가" 클릭
- 프로젝트 이름: `showup-project`
- Google Analytics: 비활성화 (MVP 단계)

## 2. Authentication 활성화

1. 왼쪽 사이드바 **Authentication** → **시작하기**
2. 상단 **로그인 방법** 탭
3. **이메일/비밀번호** → **사용 설정**
4. **저장**
5. 이메일 링크(비밀번호 없는 로그인)는 **끔**

## 3. Firestore Database 생성

1. 왼쪽 사이드바 **모든 제품 보기** 또는 중앙 **백엔드 빌드** 카드
2. **Cloud Firestore** → **데이터베이스 만들기**
3. 보안 규칙: **테스트 모드** 선택 (30일, 이후 `firestore.rules` 배포)
4. 위치: **asia-northeast3 (서울)**
5. **사용 설정**

## 4. 웹 앱 등록

1. 프로젝트 개요 → `</>` 웹 아이콘 클릭
2. 앱 별칭: `showup-web`
3. **Firebase Hosting 설정** 체크박스는 **해제**
4. `firebaseConfig` 복사

## 5. .env 작성

`apps/showup/.env` 파일 생성 (git 제외):

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=showup-project
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

## 6. Firestore 인덱스 배포

```bash
firebase deploy --only firestore:indexes
```

또는 `firestore.indexes.json` 내용을 콘솔 인덱스 페이지에 수동 등록.

## 7. 데모 데이터 업로드 (선택)

```bash
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccountKey.json
npm run seed:upload -w showup
```

서비스 계정 키는 Firebase Console → 프로젝트 설정 → 서비스 계정 → 새 비공개 키 생성.
