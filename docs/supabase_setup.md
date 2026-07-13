# Supabase (PostgreSQL) 프로젝트 설정 가이드

ShortsGen의 데이터베이스는 **Supabase (PostgreSQL)**를 사용합니다. 이 가이드를 따라 프로젝트를 생성하고 데이터베이스를 초기화하세요.

---

## 📝 1단계: Supabase 프로젝트 생성

1. [Supabase 공식 사이트](https://supabase.com)에 접속합니다.
2. **"Start your project"** 또는 **"Sign Up"** 클릭
3. GitHub 또는 Google 계정으로 가입/로그인합니다.
4. 프로젝트 정보 입력:
   - **Project Name**: `shortsgen` (또는 원하는 이름)
   - **Database Password**: 강력한 비밀번호 입력 (저장해두기!)
   - **Region**: `Asia Pacific (Singapore)` (또는 가까운 지역)

5. **"Create new project"** 클릭
6. 프로젝트 생성 완료 대기 (2~3분)

---

## 🔑 2단계: Project URL & API 키 확인

1. 프로젝트 대시보드 접속
2. 좌측 메뉴에서 **"Project Settings"** 클릭
3. **"API"** 탭 선택
4. 다음 정보를 복사하여 메모해두세요:
   - **Project URL** (예: `https://xxxxxxxxxxxxx.supabase.co`)
   - **anon public** (Anonymous/Public key)

---

## 🗄️ 3단계: 데이터베이스 스키마 적용

### 3-1. SQL Editor 접속
1. Supabase 대시보드 좌측 메뉴에서 **"SQL Editor"** 클릭
2. 상단 **"New Query"** 버튼 클릭

### 3-2. Store Info 테이블 생성
`database/schema.sql` 파일의 **전체 내용**을 복사하여 SQL Editor에 붙여넣고 **"Run"** 클릭

**주의:** 파일 전체를 한 번에 실행하세요. 분할 실행 불필요.

### 3-3. Seed 데이터 로드
1. SQL Editor에서 새로운 Query 생성
2. `database/seeds/trend_keywords.sql` 파일 **전체 내용** 복사
3. SQL Editor에 붙여넣고 **"Run"** 클릭

**결과:** `trend_keywords` 테이블에 17개 행이 삽입됨

---

## ⚙️ 4단계: `.env` 파일 설정

1. 프로젝트 디렉토리에서 `backend/` 폴더로 이동
   ```bash
   cd backend
   ```

2. `.env` 파일 생성 (없으면 새로 만들고, 있으면 내용 대체)
   ```bash
   nano .env   # 또는 텍스트 에디터로 열기
   ```

3. 다음 내용 입력 (복사한 URL/Key로 대체):
   ```
   PORT=5000
   SUPABASE_URL=https://your-project-here.supabase.co
   SUPABASE_KEY=eyJhbGciOiJIUzI1NiIs...
   NAVER_CLIENT_ID=your-naver-client-id
   NAVER_CLIENT_SECRET=your-naver-client-secret
   ```

4. 파일 저장 (Ctrl+S 또는 Cmd+S)

### ⚠️ 주의사항
- `.env` 파일은 절대 Git에 커밋하지 마세요 (`.gitignore`에 등록됨)
- `SUPABASE_KEY`는 비밀 정보입니다 — 누구와도 공유하지 마세요
- `NAVER_CLIENT_ID`/`SECRET`는 생략 가능 (seed 데이터로 폴백)

---

## 🚀 5단계: 백엔드 서버 시작

1. 터미널에서:
   ```bash
   cd backend
   npm install  # 첫 실행 시 의존성 설치
   npm start
   ```

2. 로그 확인:
   ```
   [DB] Supabase 연결 완료
   [ShortsGen Backend] Server running on http://localhost:5000
   ```

---

## ✅ 6단계: 연결 확인

### 테스트 1: 가게 정보 저장
```bash
curl -X POST http://localhost:5000/api/store \
  -H "Content-Type: application/json" \
  -d '{"store_name":"테스트카페","category":"카페","location":"서울시","signature_item":"라떼"}'
```

**기대 결과:** 
```json
{
  "success": true,
  "message": "가게 정보가 저장되었습니다",
  "data": { "store_id": 1, "store_name": "테스트카페", ... }
}
```

### 테스트 2: 최신 가게 정보 조회
```bash
curl http://localhost:5000/api/store/latest
```

**기대 결과:** 방금 저장한 가게 정보가 반환

### 테스트 3: 카테고리별 트렌드 조회
```bash
curl "http://localhost:5000/api/trends?category=카페"
```

**기대 결과:** 17개의 seed 데이터 중 카페 관련 데이터 반환

### 테스트 4: Supabase 대시보드에서 확인
1. Supabase 대시보드로 이동
2. 좌측 메뉴 **"Table Editor"** 클릭
3. `store_info`, `trend_keywords` 테이블에 실제 데이터가 보이는지 확인

---

## 🔍 트러블슈팅

### "SUPABASE_URL/SUPABASE_KEY가 필요합니다" 에러
- **원인:** `.env` 파일이 없거나 값이 비어 있음
- **해결:** 4단계를 다시 확인하고, 값이 정확한지 확인

### "Failed to fetch store information" (500 에러)
- **원인:** Supabase 연결 오류 또는 테이블 미생성
- **해결:** 3단계에서 `schema.sql`을 실제로 실행했는지 확인

### "트렌드 데이터 없음" 메시지
- **원인:** Seed 데이터가 로드되지 않음
- **해결:** 3-3단계에서 `trend_keywords.sql`을 실행했는지 확인

### SQL 문법 오류 ("Unexpected token")
- **원인:** SQLite 문법이 섞여 있거나 불완전한 복사
- **해결:** 파일 전체를 다시 복사하고 한 번에 실행

---

## 📚 참고 자료

- [Supabase 공식 문서](https://supabase.com/docs)
- [Supabase PostgreSQL 가이드](https://supabase.com/docs/guides/database)
- [ShortsGen 메인 README](../README.md)
- [네이버 데이터랩 API 설정](./naver_datalab_setup.md)

---

## ✨ 다음 단계

Supabase 설정이 완료되면:
1. 프론트엔드 시작: `npm run dev` in `frontend/`
2. Dashboard 접속: http://localhost:5173
3. Setup 화면에서 가게 정보 입력
4. Dashboard에서 실제 Supabase 데이터 확인
