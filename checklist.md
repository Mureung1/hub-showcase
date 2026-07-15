# ShortsGen 프로젝트 진행 체크리스트

## ✅ 완료된 부분 (P1~P4)

### 프론트엔드 (Frontend)
- [x] **HomeView** - 가게 정보 설정 + 트렌드 분석 화면
  - [x] 가게 카테고리/위치 입력
  - [x] 실시간 트렌드 표시 (Naver DataLab)
  - [x] "이 트렌드로 릴스 만들기" 버튼
- [x] **GenerateView** 기본 레이아웃
  - [x] 이미지 업로드 영역 (드래그앤드롭)
  - [x] 비디오 미리보기 9:16 영역
  - [x] Sidebar 네비게이션
- [x] **UI/스타일** - Tailwind CSS 적용
  - [x] 카드 디자인 시스템
  - [x] 버튼 및 입력 필드
  - [x] 반응형 레이아웃

### 백엔드 (Backend)
- [x] **Supabase 연동** (SQLite → PostgreSQL 마이그레이션)
  - [x] .env 설정 (SUPABASE_URL, SUPABASE_KEY)
  - [x] supabaseClient.js 초기화
  - [x] 데이터베이스 테이블 생성
    - [x] store_info
    - [x] generated_videos
    - [x] published_videos
- [x] **Naver DataLab API** 통합
  - [x] 검색어 트렌드 데이터 수집
  - [x] `/api/trends` 엔드포인트

### API 상태
- [x] **TikTok API** - Mock 구현 (실제 연동 필요)
- [x] **Instagram API** - Mock 구현 (실제 연동 필요)

---

## 🚀 진행해야 할 부분 (P5~P8)

### P5: ⚡ AI 파이프라인 기초 API (우선순위: 🔴 높음) - 진행 중

#### Phase 1: API 기초 ✅ COMPLETED
- [x] Supabase `generation_jobs` 테이블 설계
  - [x] 작업 상태 추적
  - [x] 단계별 출력 컬럼
  - [x] 타이밍 정보
- [x] Supabase `generation_steps` 테이블 설계
  - [x] 단계별 상세 로깅
  - [x] 자동 생성 트리거
- [x] **POST /api/generate** 엔드포인트
  - [x] 이미지 파일 업로드 (Multer)
  - [x] Supabase Storage에 저장
  - [x] Job 레코드 생성
  - [x] 202 Accepted 응답
- [x] **GET /api/generate/{job_id}** 엔드포인트
  - [x] Job 상태 조회
  - [x] Steps 상세 정보
  - [x] 진행률 반환
- [x] **GET /api/generate/{job_id}/result** 엔드포인트
  - [x] 최종 결과 조회
  - [x] 진행 중 상태 처리

#### Phase 2: Supabase 테이블 생성 (다음 단계)
- [ ] Supabase SQL Editor에서 마이그레이션 실행
  - 가이드: `docs/SETUP_SUPABASE_TABLES.md` 참조

#### Phase 3: 프론트엔드 폴링 (다음 단계)
- [ ] GenerateView에 로딩 상태 추가
- [ ] GET /api/generate/{job_id} 폴링
- [ ] 진행률 바 표시

---

### TikTok API 실제 연동 (우선순위: 🔴 높음)
- [ ] **OAuth 2.0 인증 플로우**
  - [ ] 사용자 로그인 엔드포인트 구현: `POST /api/auth/tiktok/login`
  - [ ] 콜백 처리: `POST /api/auth/tiktok/callback`
  - [ ] Access Token 저장 (Supabase `stores` 테이블에 `tiktok_token` 컬럼 추가)
  - [ ] Token 만료 시 자동 갱신 로직
- [ ] **비디오 업로드 API**
  - [ ] `POST /api/publish` - TikTok 발행 실제 구현
  - [ ] 비디오 파일 형식 검증 (MP4, 15초)
  - [ ] 썸네일 생성
  - [ ] 해시태그/자막 포함

### P6: Instagram API 실제 연동 (우선순위: 🔴 높음)
- [ ] **Graph API 인증**
  - [ ] 앱 모드 또는 사용자 로그인 선택
  - [ ] Access Token 발급 및 저장
- [ ] **Instagram Reels 발행**
  - [ ] `POST /api/publish` - Instagram 발행 실제 구현
  - [ ] 9:16 수직 영상 자동 포맷팅
  - [ ] 자막/해시태그 처리

### P7: AI 비디오 생성 파이프라인 (우선순위: 🟠 중간)
- [ ] **YOLOv8 스마트 크롭**
  - [ ] 상품 영역 자동 감지
  - [ ] 크롭된 이미지 저장
- [ ] **KoBERT 트렌드 매칭**
  - [ ] 업로드 이미지 → 트렌드 해시태그 자동 생성
  - [ ] 세마틱 유사도 매칭
- [ ] **TTS (Text-to-Speech) 통합**
  - [ ] 자막 → 음성 변환
  - [ ] 한국어 지원
  - [ ] 음성 파일 생성
- [ ] **FFmpeg 렌더링**
  - [ ] 이미지 + 음성 + 텍스트 오버레이 → 영상 생성
  - [ ] 15초 MP4 최종 생성

### P8: 테스트 및 배포 (우선순위: 🟠 중간)
- [ ] **통합 테스트**
  - [ ] End-to-End 테스트: 이미지 업로드 → 발행까지
  - [ ] 각 플랫폼별 발행 테스트
  - [ ] 에러 처리 및 롤백
- [ ] **성능 최적화**
  - [ ] 이미지 압축 (클라이언트)
  - [ ] 비디오 렌더링 최적화
  - [ ] 캐싱 전략
- [ ] **배포**
  - [ ] Backend: Heroku / Railway / Render
  - [ ] Frontend: Vercel / Netlify
  - [ ] 환경변수 설정 (프로덕션)

---

## 🎯 **지금 진행할 수 있는 부분**

### 🟢 **즉시 시작 가능 (1~2시간)**

#### 1️⃣ **TikTok OAuth 로그인 화면 구현** (프론트엔드)
```
현재: Mock 상태
목표: 실제 TikTok 로그인 연동

할 일:
- Settings 탭 또는 별도 로그인 페이지 추가
- "TikTok 연결" 버튼 구현
- 사용자 인증 상태 저장
```

**시작:** 프론트엔드에서 `src/components/SettingsView.jsx` 또는 `LoginView.jsx` 추가

---

#### 2️⃣ **Backend: TikTok OAuth 엔드포인트 구현** (백엔드)
```
현재: TikTok API Mock
목표: OAuth 2.0 콜백 처리

할 일:
- POST /api/auth/tiktok/callback 엔드포인트 추가
- Client Secret으로 토큰 교환
- Supabase에 토큰 저장
- 에러 처리
```

**시작:** `backend/src/routes/auth.js` 파일 생성

---

#### 3️⃣ **Supabase 스키마 업데이트** (백엔드)
```
현재: store_info 테이블에 소셜 토큰 없음
목표: 각 플랫폼 토큰 저장 가능

할 일:
ALTER TABLE store_info ADD COLUMN:
- tiktok_token TEXT
- tiktok_token_expiry TIMESTAMP
- instagram_token TEXT
- instagram_token_expiry TIMESTAMP
```

**시작:** `backend/src/db/migrations/` 폴더에서 SQL 마이그레이션 추가

---

### 🟡 **1주일 안에 완료 가능**

#### 4️⃣ 실제 TikTok API 업로드 테스트
#### 5️⃣ Instagram Graph API 통합
#### 6️⃣ 전체 발행 플로우 테스트

---

## 📊 진행도

```
┌─────────────────────────────────────────┐
│  P1~P4: UI + 백엔드 기초     [████████░░] 80%
│  P5: TikTok 연동          [░░░░░░░░░░]  0%
│  P6: Instagram 연동       [░░░░░░░░░░]  0%
│  P7: AI 파이프라인        [░░░░░░░░░░]  0%
│  P8: 테스트 + 배포        [░░░░░░░░░░]  0%
└─────────────────────────────────────────┘
```

---

## 🔗 관련 링크

- TikTok API Docs: https://developers.tiktok.com/doc/
- Instagram Graph API: https://developers.facebook.com/docs/instagram-graph-api
- Supabase CLI: https://supabase.com/docs/guides/cli

