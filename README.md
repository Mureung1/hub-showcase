# CalMe

AI 기반 대학생 일정 관리 서비스

---

## 🚀 배포 (프로덕션)

| 서비스 | URL | 플랫폼 |
|--------|-----|--------|
| **Frontend** | https://calme-frontend.vercel.app | Vercel |
| **Backend API** | https://calme-backend-2xzs.onrender.com | Render |
| **Database** | Supabase PostgreSQL | Cloud |

---

## 🎯 프로젝트 소개

대학생이 여러 공지사항, 공모전, 대외활동 등 다양한 채널에서 공지를 확인하면서 마감일을 놓치는 문제를 해결하기 위해 만들었습니다.

**주요 기능:**
- 📄 공지사항(텍스트/PDF) 업로드
- 🤖 AI가 자동으로 마감일과 일정 추출
- 📅 추출된 일정을 캘린더에 등록
- ⏰ D-Day 기준으로 임박한 일정 표시

---

## 🛠️ 기술 스택

### Frontend
- **React** + **Vite**
- 배포: **Vercel**
- 상태 관리: Context API
- 스타일: CSS

### Backend
- **Node.js** + **Express**
- 배포: **Render**
- 인증: JWT
- API: RESTful

### Database
- **PostgreSQL** (Supabase)
- 마이그레이션: SQLite → Supabase
- 데이터 영속성 보장

### AI
- **Claude API** (공지 자동 분석)
- 자연어 처리로 정확한 일정 추출

---

## 🏗️ 아키텍처

```
사용자 브라우저
    ↓ (화면 파일 요청)
Vercel Frontend (React)
    ↓ (/api 요청 - Vercel Rewrite)
Render Backend (Express)
    ↓ (데이터 요청)
Supabase PostgreSQL
```

**Vercel-Render 연결:**
- Vercel Rewrite 패턴 사용 (`vercel.json`)
- Frontend는 상대 경로 `/api/...` 사용
- Vercel이 자동으로 Render로 포워딩

---

## 📖 문서

- [기획안](docs/plan.md)
- [4주 개발 계획](docs/checklist.md)
- [백로그](docs/backlog.md)
- [배포 가이드](docs/deployment.md)

---

## 🚀 로컬 개발 환경 설정

### 1. Backend 설정

```bash
cd backend
npm install

# .env 파일 생성
# DATABASE_URL=postgresql://...
# JWT_SECRET=your_secret
# PORT=3000

npm start  # localhost:3000
```

### 2. Frontend 설정

```bash
cd frontend
npm install
npm run dev  # localhost:5173
```

개발 환경에서는 `vite.config.js`의 proxy 설정으로 API 자동 연결

---

## 📝 개발 노트

### SQLite → PostgreSQL 마이그레이션
- 더 이상 Render의 ephemeral storage 문제 없음
- 자동 백업 및 데이터 영속성 보장
- Production-ready 데이터베이스

### Full-Stack 배포
- Frontend: Vercel (정적 파일 제공)
- Backend: Render (Node.js 프로세스)
- Database: Supabase (관리형 PostgreSQL)

---

## 👨‍💻 작성자

박채은 (codms8369)