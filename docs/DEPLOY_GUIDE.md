# 배포 가이드

## 아키텍처

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Vercel (FE)   │────▶│   Render (BE)   │────▶│    Supabase     │
│   React + Vite  │     │    Express      │     │   PostgreSQL    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

---

## 1단계: Render에 BE 배포 (먼저!)

### 1.1 Render 가입/로그인
1. https://render.com 접속
2. GitHub 계정으로 로그인

### 1.2 새 Web Service 생성
1. Dashboard → **New +** → **Web Service**
2. **Connect a repository** → GitHub 연결 → `hub` 저장소 선택
3. 설정:
   - **Name**: `hub-api` (또는 원하는 이름)
   - **Root Directory**: `apps/api`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`

### 1.3 환경변수 설정
**Environment** 탭에서 추가:

| Key | Value | 설명 |
|-----|-------|------|
| `SUPABASE_URL` | `https://xxx.supabase.co` | Supabase 대시보드에서 복사 |
| `SUPABASE_ANON_KEY` | `eyJhbGci...` | Supabase 대시보드에서 복사 |
| `FRONTEND_URL` | (나중에 설정) | Vercel 배포 후 추가 |

### 1.4 배포 확인
배포 완료 후 URL 확인:
```
https://hub-api-xxxx.onrender.com
```

**테스트:**
```bash
curl https://hub-api-xxxx.onrender.com/health
# 응답: {"status":"ok"}
```

---

## 2단계: Vercel에 FE 배포

### 2.1 Vercel 가입/로그인
1. https://vercel.com 접속
2. GitHub 계정으로 로그인

### 2.2 새 프로젝트 생성
1. **Add New...** → **Project**
2. GitHub 저장소 `hub` Import
3. 설정:
   - **Root Directory**: `apps/web` ← **중요!**
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### 2.3 환경변수 설정
**Environment Variables** 섹션에서 추가:

| Key | Value |
|-----|-------|
| `VITE_API_URL` | `https://hub-api-xxxx.onrender.com/api` |

⚠️ **주의**: `/api`까지 포함해야 함!

### 2.4 배포 확인
배포 완료 후 URL 확인:
```
https://hub-xxxx.vercel.app
```

---

## 3단계: BE에 FE 주소 추가 (CORS)

### 3.1 Render 환경변수 추가
1. Render Dashboard → `hub-api` 서비스
2. **Environment** 탭
3. 추가:

| Key | Value |
|-----|-------|
| `FRONTEND_URL` | `https://hub-xxxx.vercel.app` |

4. **Save Changes** → 자동 재배포됨

---

## 4단계: 전체 테스트

### 4.1 BE Health Check
```bash
curl https://hub-api-xxxx.onrender.com/health
```
✅ 응답: `{"status":"ok"}`

### 4.2 FE 화면 확인
브라우저에서 `https://hub-xxxx.vercel.app` 접속
✅ 화면이 정상적으로 로드됨

### 4.3 진단 기능 테스트
1. 부엌 선택
2. 👀 "좀 신경 쓰여요" 클릭
3. 질문에 답변
✅ 진단 흐름이 정상 동작

### 4.4 Supabase 데이터 확인
Supabase Dashboard → Table Editor → `sessions` 테이블
✅ 새 세션 레코드가 생성됨

---

## 트러블슈팅

### CORS 에러
```
Access to fetch at '...' from origin '...' has been blocked by CORS policy
```
→ Render의 `FRONTEND_URL` 환경변수가 정확한지 확인
→ `https://` 포함, 끝에 `/` 없이

### API 연결 실패
```
fetchSpaces failed: 500
```
→ Render 로그 확인 (Dashboard → Logs)
→ Supabase 환경변수 확인

### 빈 화면
→ 브라우저 개발자 도구 (F12) → Console 탭 확인
→ Vercel의 `VITE_API_URL` 환경변수 확인

---

## 환경변수 체크리스트

### Render (BE)
- [ ] `SUPABASE_URL`
- [ ] `SUPABASE_ANON_KEY`
- [ ] `FRONTEND_URL` (Vercel 배포 후)

### Vercel (FE)
- [ ] `VITE_API_URL` (Render 배포 후)

---

## 배포 URL 기록

| 서비스 | URL |
|--------|-----|
| FE (Vercel) | `https://________________.vercel.app` |
| BE (Render) | `https://________________.onrender.com` |
| Health Check | `https://________________.onrender.com/health` |
