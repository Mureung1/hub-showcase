# Google Calendar API 연동 설정 가이드

> 대학생 맞춤형 정보 큐레이션 대시보드에 Google Calendar를 연동하는 완벽한 가이드입니다.

---

## 📌 개요

이 가이드를 따르면 다음을 설정할 수 있습니다:
- ✅ Google Calendar API 활성화
- ✅ OAuth 2.0 인증 구성
- ✅ 로컬/프로덕션 환경 설정
- ✅ 공고 스크랩 시 자동 Google Calendar 이벤트 생성

---

## 🔑 Step 1: Google Cloud 프로젝트 생성

### 1.1 Google Cloud Console 접속
```
https://console.cloud.google.com/
```

### 1.2 새 프로젝트 생성
1. 상단 **프로젝트 선택** 클릭
2. **새 프로젝트** 클릭
3. 프로젝트 이름: `Naver Challenge` (또는 자신의 이름)
4. **만들기** 클릭
5. 프로젝트 생성 완료까지 대기 (1-2분)

### 1.3 새 프로젝트 선택
생성 후 좌측 상단에서 새로 만든 프로젝트를 선택

---

## 📅 Step 2: Google Calendar API 활성화

### 2.1 API 라이브러리 페이지 이동
1. 좌측 메뉴 → **APIs & Services** → **Library**
2. 검색창에 "Google Calendar API" 입력
3. **Google Calendar API** 클릭

### 2.2 API 활성화
1. **ENABLE** (파란색 버튼) 클릭
2. "API가 활성화되었습니다" 메시지 확인

---

## 🔐 Step 3: OAuth 2.0 Credentials 생성

### 3.1 동의 화면(Consent Screen) 설정 (필수)

1. 좌측 메뉴 → **APIs & Services** → **OAuth Consent Screen**
2. **User Type** 선택:
   - **External** 선택 (개발 단계에서는 External 사용)
3. **CREATE** 클릭

### 3.2 동의 화면 정보 입력

**정보 섹션:**
- App name: `UniBoard` (또는 프로젝트 이름)
- User support email: `khy05300@gmail.com` (또는 자신의 이메일)
- Developer contact: `khy05300@gmail.com` (같은 이메일)

**스코프(Scopes) 섹션:**
1. **ADD OR REMOVE SCOPES** 클릭
2. 다음 스코프 검색 및 추가:
   ```
   https://www.googleapis.com/auth/calendar
   ```
   (Google Calendar 읽기/쓰기 권한)
3. **UPDATE** 클릭

**저장:**
1. 맨 아래 **SAVE AND CONTINUE** 클릭
2. "Test users" 페이지에서도 **SAVE AND CONTINUE** 클릭
3. 최종 확인 후 **BACK TO DASHBOARD** 클릭

---

## 🎯 Step 4: OAuth 클라이언트 ID/Secret 발급

### 4.1 Credentials 페이지 이동
좌측 메뉴 → **APIs & Services** → **Credentials**

### 4.2 OAuth 2.0 Credentials 생성
1. **+ CREATE CREDENTIALS** → **OAuth client ID** 클릭
2. 애플리케이션 유형: **Web application** 선택
3. 이름: `UniBoard Web Client` (또는 자신의 이름)

### 4.3 JavaScript Origins 등록

**로컬 개발:**
```
http://localhost:5173
http://localhost:3001
```

**프로덕션 (Vercel 배포 시):**
```
https://your-project-name.vercel.app
```

**추가 방법:**
1. **Authorized JavaScript origins** 섹션의 **+ ADD URI** 클릭
2. URI 입력 후 **엔터** 또는 **버튼** 클릭

### 4.4 Redirect URI 등록

**로컬 개발:**
```
http://localhost:3001/api/calendar/oauth-callback
```

**프로덕션 (Vercel 배포 시):**
```
https://your-project-name.vercel.app/api/calendar/oauth-callback
```

**추가 방법:**
1. **Authorized redirect URIs** 섹션의 **+ ADD URI** 클릭
2. Redirect URI 입력 후 **엔터** 또는 **버튼** 클릭

### 4.5 Client ID & Secret 복사
1. **CREATE** 클릭
2. 팝업창에서 Client ID와 Client Secret 확인
3. 텍스트 파일에 임시 저장 (다음 단계에서 사용)

```
GOOGLE_CLIENT_ID=your-client-id-here
GOOGLE_CLIENT_SECRET=your-client-secret-here
```

---

## 🛠 Step 5: 프로젝트에 환경변수 설정

### 5.1 백엔드 환경변수 설정

**backend/.env 파일 생성/수정:**

```bash
# backend/.env

# Google Calendar OAuth
GOOGLE_CLIENT_ID="복사한_클라이언트_ID"
GOOGLE_CLIENT_SECRET="복사한_클라이언트_시크릿"
GOOGLE_REDIRECT_URI="http://localhost:3001/api/calendar/oauth-callback"
```

### 5.2 프론트엔드 환경변수 설정

**frontend/.env 파일 생성/수정:**

```bash
# frontend/.env

# Google OAuth
VITE_GOOGLE_CLIENT_ID="복사한_클라이언트_ID"
```

> ⚠️ **주의**: Client ID는 두 파일 모두 같은 값을 사용합니다
> ⚠️ **주의**: Client Secret은 **백엔드 .env에만** 넣습니다 (프론트엔드 노출 금지!)

---

## ✅ Step 6: 테스트

### 6.1 서버 시작

**터미널 1 - 백엔드:**
```bash
cd backend
npm run dev
```

**터미널 2 - 프론트엔드:**
```bash
cd frontend
npm run dev
```

### 6.2 대시보드 접속
브라우저에서 다음 URL 접속:
```
http://localhost:5173
```

### 6.3 테스트 체크리스트

- [ ] **"Google Calendar 연동" 버튼이 보이나?**
  - ✅ 보임 → 환경변수 설정 OK
  - ❌ 안 보임 → `VITE_GOOGLE_CLIENT_ID` 확인

- [ ] **버튼 클릭 → Google 로그인 팝업이 뜨나?**
  - ✅ 뜸 → OAuth 설정 OK
  - ❌ "400 오류: origin_mismatch" → JavaScript Origins 재확인

- [ ] **Google 계정 로그인 → 권한 요청 동의**
  - ✅ 성공 → OAuth 플로우 OK
  - ❌ 오류 → 콘솔 에러 메시지 확인

- [ ] **로그인 후 "✓ Google Calendar 연동됨" 표시되나?**
  - ✅ 표시됨 → 토큰 저장 OK
  - ❌ 변화 없음 → 백엔드 로그 확인

- [ ] **공고 스크랩 → Google Calendar에 이벤트 생성됨?**
  - ✅ 생성됨 → 자동 동기화 OK
  - ❌ 생성 안 됨 → 네트워크 탭에서 `/api/postings/:id/scrap` 응답 확인

---

## 🐛 트러블슈팅

### "Google Calendar 연동" 버튼이 안 보임

**원인:** `VITE_GOOGLE_CLIENT_ID` 환경변수 없음

**해결:**
```bash
# frontend/.env 파일 확인
cat frontend/.env | grep VITE_GOOGLE_CLIENT_ID

# 없으면 생성
echo 'VITE_GOOGLE_CLIENT_ID="클라이언트_ID"' > frontend/.env

# 프론트엔드 서버 재시작
```

---

### "400 오류: origin_mismatch"

**원인:** Google Cloud에 현재 접속 도메인이 등록되지 않음

**해결:**
1. Google Cloud Console → **APIs & Services** → **Credentials**
2. OAuth 클라이언트 ID 클릭 (Web application)
3. **Authorized JavaScript origins** 확인:
   - 로컬: `http://localhost:5173`, `http://localhost:3001` 추가
   - 프로덕션: `https://your-domain.com` 추가
4. **SAVE** 클릭
5. 브라우저 새로고침 (Ctrl+Shift+Delete로 캐시 삭제 권장)

---

### Google 로그인은 되는데 콜백 오류 발생

**원인:** 백엔드 API 연결 실패

**해결:**
1. 백엔드 서버 실행 확인: `npm run dev` (port 3000)
2. 환경변수 확인:
   ```bash
   cd backend
   cat .env | grep GOOGLE
   ```
3. 브라우저 개발자 도구 → Network 탭 → `/api/calendar/oauth-callback` 요청 상태 확인
4. 백엔드 콘솔 로그 확인:
   ```
   API 요청: POST /api/calendar/oauth-callback
   토큰 교환 성공: access_token=...
   ```

---

### 공고 스크랩했는데 Google Calendar에 이벤트 안 생김

**원인 1:** Google Calendar 연동되지 않음
- 해결: 우측 패널의 "Google Calendar 연동" 버튼이 "✓ Google Calendar 연동됨"인지 확인

**원인 2:** 데이터베이스 에러
- 백엔드 로그 확인:
  ```
  POST /api/postings/:id/scrap 200 OK
  Google Calendar sync successful: eventId=...
  ```

**원인 3:** 공고에 마감일 데이터 없음
- Supabase SQL Editor에서 확인:
  ```sql
  SELECT title, "receptionEndDate" FROM postings WHERE id='posting-id';
  ```

---

## 🚀 프로덕션 배포

### Vercel에 배포할 경우

**1. Vercel 환경변수 설정**
1. Vercel Dashboard → Project Settings → Environment Variables
2. 다음 추가:
   ```
   VITE_GOOGLE_CLIENT_ID=your-client-id
   ```

**2. Google Cloud 설정 수정**
1. Google Cloud Console → **APIs & Services** → **Credentials**
2. OAuth 클라이언트 ID → **Authorized JavaScript origins** 수정:
   ```
   https://your-project-name.vercel.app
   ```
3. **Authorized redirect URIs** 수정:
   ```
   https://your-project-name.vercel.app/api/calendar/oauth-callback
   ```

**3. 백엔드 환경변수 설정**
- Railway/Render 배포 시 동일하게 환경변수 추가

---

## 📝 참고 자료

- [Google Calendar API 문서](https://developers.google.com/calendar/api/guides/overview)
- [OAuth 2.0 설명](https://developers.google.com/identity/protocols/oauth2)
- [이 프로젝트의 구현 문서](./stage6-implementation.md)

---

## ✨ 다음 단계

Google Calendar 연동이 완료되면:

1. **FullCalendar.js 통합** (6단계-A)
   - 개인 일정 추가 기능
   - 월간/주간 뷰

2. **스마트 매칭** (7단계)
   - 유휴 시간 분석
   - 최적의 공고 추천

3. **D-Day 알림** (8단계)
   - 마감 3일 전 알림
   - 푸시 알림 또는 이메일 발송

---

**Last Updated:** 2026-07-14  
**Status:** ✅ Google Calendar API 완전 연동 가능
