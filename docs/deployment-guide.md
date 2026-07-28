# 배포 가이드

**작성 날짜:** 2026-07-28  
**배포 대상:** Vercel (프론트) + Railway (백엔드) + Supabase (DB)  
**예상 소요 시간:** 1-2시간

---

## 📋 **배포 전 체크리스트**

### 1️⃣ 코드 준비 (로컬)

```bash
# 1. 최신 변경사항 확인
git status

# 2. TypeScript 타입 검사
cd frontend && npm run typecheck
cd backend && npm run typecheck

# 3. Linting
cd frontend && npm run lint
cd backend && npm run lint

# 4. 테스트 실행
cd backend && npm test

# 5. 빌드 테스트
cd frontend && npm run build
```

### 2️⃣ 환경 변수 준비

#### 프론트엔드 (`.env.production`)
```bash
VITE_API_BASE_URL="https://your-backend-domain.com"  # Railway 배포 URL
```

#### 백엔드 (환경변수 설정)
```
# 데이터베이스
DATABASE_URL="postgresql://..."  # Supabase 연결 문자열

# Supabase
SUPABASE_URL="..."
SUPABASE_ANON_KEY="..."
SUPABASE_SERVICE_ROLE_KEY="..."

# GitHub API
GITHUB_TOKEN="github_pat_..."

# 기타
JWT_SECRET="random-production-secret"
PORT=3000
NODE_ENV="production"
```

### 3️⃣ 데이터베이스 준비

```bash
# Supabase에서 마이그레이션 실행
cd backend
npx prisma migrate deploy

# 생성 확인
npx prisma db push
```

---

## 🚀 **배포 단계**

### Step 1: GitHub 연동

```bash
# 변경사항 커밋 (배포 전 필수)
git add .
git commit -m "chore: deploy preparation"
git push origin develop
```

### Step 2: 프론트엔드 배포 (Vercel)

#### 2-1. Vercel 연결

1. https://vercel.com 방문
2. GitHub 로그인
3. "Import Project" → 리포지토리 선택
4. `frontend` 폴더 선택

#### 2-2. 환경변수 설정

**Vercel 대시보드 → Settings → Environment Variables**

```
VITE_API_BASE_URL=https://your-backend.railway.app
```

#### 2-3. 빌드 설정

**Project Settings → Build & Development**

```
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
```

#### 2-4. 배포

"Deploy" 버튼 클릭 → 자동 배포 시작

**예상 완료 시간:** 3-5분

### Step 3: 백엔드 배포 (Railway)

#### 3-1. Railway 연결

1. https://railway.app 방문
2. GitHub 로그인
3. "New Project" → "Deploy from GitHub"
4. 리포지토리 선택

#### 3-2. 환경변수 설정

**Railway 대시보시 → Variables**

모든 `.env` 변수 추가:
```
DATABASE_URL=...
GITHUB_TOKEN=...
JWT_SECRET=...
# 기타 모든 환경변수
```

#### 3-3. 빌드 설정

**Service Settings → Build**

```
Build Command: npm install && npm run build
Start Command: npm run dev
```

#### 3-4. 도메인 연결

**Settings → Domains**

- 기본 Railway 도메인 사용 또는
- 커스텀 도메인 추가

**배포된 URL 예:** `https://your-backend.railway.app`

#### 3-5. 배포

자동 배포 시작 (Git push와 동시)

**예상 완료 시간:** 5-10분

### Step 4: 배포 후 검증

#### 4-1. 프론트 확인

```bash
# Vercel 배포 URL 방문
https://your-project.vercel.app

# 확인 항목
[ ] 페이지 로드 성공
[ ] 로그인 가능
[ ] GitHub 저장소 페이지 로드
[ ] API 연결 정상
```

#### 4-2. 백엔드 확인

```bash
# 헬스 체크
curl https://your-backend.railway.app/api/health

# API 테스트
curl https://your-backend.railway.app/api/github/trending?limit=5
```

#### 4-3. 데이터베이스 확인

```bash
# Supabase 대시보드에서 테이블 확인
# - users
# - user_profiles
# - github_repos
# - scraps
# 등이 정상 생성됨
```

---

## 🔧 **배포 후 설정**

### 1. GitHub 저장소 설정

**Settings → Secrets and variables → Actions**

각 CI/CD 플랫폼의 배포 토큰 추가:
```
VERCEL_TOKEN=...
RAILWAY_TOKEN=...
```

### 2. 도메인 설정

**DNS 레코드 추가** (선택)
```
A record: your-domain.com → Vercel IP
CNAME: api.your-domain.com → your-backend.railway.app
```

### 3. SSL/TLS

- ✅ Vercel: 자동 설정
- ✅ Railway: 자동 설정

---

## 📊 **배포 체크리스트**

### 배포 전
- [ ] 모든 코드 커밋됨
- [ ] TypeScript 타입 검사 완료
- [ ] 테스트 통과
- [ ] 빌드 성공
- [ ] 환경변수 준비 완료
- [ ] 데이터베이스 마이그레이션 완료

### 배포 중
- [ ] GitHub 리포지토리 연결
- [ ] Vercel 배포 시작
- [ ] Railway 배포 시작
- [ ] 환경변수 모두 입력

### 배포 후
- [ ] 프론트 페이지 로드 확인
- [ ] 백엔드 API 응답 확인
- [ ] 데이터베이스 연결 확인
- [ ] 사용자 인증 테스트
- [ ] GitHub API 통신 테스트
- [ ] 에러 로깅 확인 (Vercel, Railway 대시보드)

---

## 🚨 **배포 중 문제 해결**

### 프론트 빌드 실패
```bash
# 로컬에서 빌드 테스트
cd frontend
npm install
npm run build

# 에러 메시지 확인 후 수정
```

### 백엔드 시작 오류
```bash
# 로그 확인
Railway 대시보드 → Logs

# 환경변수 확인
DATABASE_URL이 올바른지 확인
```

### API 연결 안 됨
```bash
# CORS 확인
# backend/src/index.ts에서 CORS 설정 확인

# API 엔드포인트 확인
프론트 .env의 VITE_API_BASE_URL 확인
```

---

## 📈 **배포 후 모니터링**

### 1. 성능 모니터링

**Vercel Analytics**
```
https://vercel.com/dashboard → your-project → Analytics
```

**Railway Metrics**
```
https://railway.app → your-project → Metrics
```

### 2. 에러 모니터링

**로그 확인:**
- Vercel: Build & Runtime Logs
- Railway: Logs 탭

### 3. 업타임 모니터링 (선택)

```bash
# 무료 서비스: UptimeRobot
# 설정: 5분마다 API 헬스 체크
https://uptimerobot.com
```

---

## ✨ **배포 완료 후**

### 1. 도메인 설정
- 커스텀 도메인 연결 (선택)
- SSL 인증서 자동 설정

### 2. CI/CD 파이프라인
- Git push → 자동 배포
- 테스트 실패 시 배포 차단 (선택)

### 3. 롤백 계획
- 이전 버전으로 복구 가능
- Vercel: Deployments → Redeploy
- Railway: Redeploy latest commit

---

## 📞 **배포 예상 일정**

| 단계 | 예상 시간 | 상태 |
|------|----------|------|
| 코드 준비 | 30분 | ⏳ 준비 중 |
| 프론트 배포 | 5분 | ⏳ 예정 |
| 백엔드 배포 | 10분 | ⏳ 예정 |
| 배포 후 검증 | 15분 | ⏳ 예정 |
| **총 소요 시간** | **약 1시간** | |

---

**배포 준비 완료 후 이 가이드를 참고하여 진행하세요!** 🚀
