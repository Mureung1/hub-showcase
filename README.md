# AI-Based Classroom : Designed Education For you (ABCDEF)

> 교실의 학습 격차를 해소하는 AI 기반 맞춤형 수학 교육 플랫폼

## 📌 개요

ABCDEF는 AI Agent 기술을 활용하여 교실의 학습 격차를 없애는 서비스입니다. 선생님은 한 명의 AI Agent와 함께 여러 명의 학생 각각의 학업 성취도를 평가하고, 그에 맞춰 개별 맞춤형 질문과 피드백을 제공할 수 있습니다.

---

## ✨ 주요 기능

### 1. 선생님이 주도하는 학습 평가
- 선생님이 오늘 배운 수학 내용을 확인할 수 있는 질문/문제를 업로드
- 학생들이 질문에 답하고 문제를 풀 수 있는 환경 제공

### 2. AI 기반 심화 학습
- 학생이 더 어려운 개념 학습을 원할 때 AI Agent가 자동으로 개입
- AI가 추가 문제를 생성하고 소크라테스식 질문으로 깊이 있는 학습 유도
- 학생이 개념을 완전히 이해할 때까지 지속적인 피드백 제공

### 3. 실시간 피드백
- 오답 시: 수업 내용을 바탕으로 한 힌트와 함께 정답 유도
- 정답 시: 최종 완료 후 종합 피드백 제공

### 4. 학업 성취도 평가
- 학생의 모든 답변을 분석하여 이해도 측정
- 학생별 학습 기록 저장 및 추적

### 5. 선생님 대시보드
- 전체 학생의 학업 성취도를 한눈에 파악할 수 있는 대시보드
- 학생별 상세 평가 결과 및 답변 내역 확인
- 다음 수업 준비를 위한 인사이트 제공

### 6. 학생별 학습 기록
- 학생은 자신의 학습 기록과 성적만 확인 가능
- 다른 학생의 기록은 절대 볼 수 없는 개인정보 보호 구조

---

## 🛠 기술 스택

| 분류 | 기술 |
|------|------|
| **Frontend** | vanilla html, css, js |
| **Backend** | Express (Node.js) |
| **Database** | Supabase (PostgreSQL) |
| **AI/LLM** | Ollama (exaone3.5:2.4b, 로컬 실행) |

---

## 📁 프로젝트 구조

```
ABCDEF/
├── frontend/                        (순수 html/css/js, 빌드 도구 없음)
│   ├── index.html
│   ├── css/style.css
│   └── js/main.js
│
├── backend/                         (Express)
│   ├── server.js                    (엔트리: 프론트 서빙 + /api + 5000 포트)
│   ├── package.json
│   ├── .env                         (Supabase 키 — git 제외)
│   └── src/
│       ├── routes.js                (전체 API 라우트)
│       ├── db.js                    (Supabase 데이터 접근)
│       └── ai.js                    (Ollama 채점)
│
├── DESIGN.md                        (UI/UX 디자인 가이드)
└── README.md
```
---

## 🚀 실행 방법

**사전 준비**
- Node.js
- [Ollama](https://ollama.com) 설치 후 모델 다운로드: `ollama pull exaone3.5:2.4b`
- Supabase 프로젝트 생성 후 `backend/.env` 에 키 설정:
  ```
  SUPABASE_URL=https://<프로젝트>.supabase.co
  SUPABASE_KEY=<service_role(secret) 키>
  ```

**실행**
```bash
cd backend
npm install      # 최초 1회
npm start
```
브라우저에서 `http://localhost:5000` 접속. (채점을 쓰려면 Ollama가 실행 중이어야 함)

---

## 📝 참고 문서

- **[디자인 가이드](./DESIGN.md)** - UI/UX 디자인 시스템

---

## 📌 현재 상태

- **현재**: 수학 과목에 한정하여 서비스 개발
- **향후 계획**: 국어, 영어, 과학 등 다른 과목으로 확대 예정
