# 팀플, 이지! (Team Project, Easy!)

> 대학생 팀 프로젝트의 '킥오프 1시간'을 AI가 중립적 중재자로 대신해, 15분 만에 팀 전원이 납득하는 계획과 역할 분담을 만들어주는 웹 서비스

---

## 📅 프로젝트 일정

- 이번 주차 프로젝트 계획표 보기 :  https://docs.google.com/spreadsheets/d/1T3lZpeGHYaarijGPqlmVXZ0wH_4mQuG0CyIvP8C2nMY/edit?usp=sharing

## 📌 프로젝트 개요

대학생 팀 프로젝트는 시작 단계에서 실패합니다. 서로 잘 모르는 팀원들이 위계도 경험도 없이 첫 회의에서 계획과 역할을 정해야 하고, 이 과정이 어색함과 눈치보기 속에 흐지부지되면서 계획 없는 프로젝트와 불공정한 분담이 굳어집니다.

**팀플, 이지!**는 AI를 "관리자"가 아니라 **아무도 하기 싫은 말을 대신 해주는 중립적 중재자**로 세워, 첫 회의 자리에서 계획 수립부터 역할 배정까지 끝내는 킥오프 도구입니다.

상세 기획(기능 범위·시나리오·화면 설계·배정 규칙·엣지케이스)은 **[docs/plan.md](./docs/plan.md)** 를 참고하세요. UI 시안은 `docs/images/` 폴더에 있습니다.

---

## ✨ 핵심 기능

1. **AI 플래닝 에이전트** — 주제·마감일·인원·첨부(사진/PDF)·기피 날짜를 입력하면 Claude API가 역할 정의 + 마일스톤 + 태스크를 생성(재생성 3회, 확정 후 잠금)하고, **설문 후 역할 배정 결과의 이유를 팀 단위로 설명**
2. **공정한 역할 배정** — 비공개 설문 → 서버의 **결정적 점수 로직이 배정**(AI가 아니라 규칙 → 같은 응답이면 같은 결과·개인 응답 비공개). 공개 후 10분 내 1회 생성자가 역할 맞교환
3. **계정·초대** — 아이디+비밀번호 로그인, 초대 링크로 팀원 각자의 기기에서 즉시 가입·참여
4. **진행 공간** — 사이드바 3탭: 대시보드(팀 진행률·전주 대비·D-day·마일스톤·최근 활동·팀원 목록) / 프로젝트 진행(내 태스크·파일·링크 업로드+코멘트·참여 잔디) / 프로젝트 관리(내 프로젝트·[메인] 지정·순서 변경·완료·삭제)
5. **알림** — 팀 이벤트(합류·설문 마감·결과 공개·역할 교환·업로드) 인앱 알림

---

## 🛠️ 기술 스택

| 구분 | 기술 |
|------|------|
| **프론트엔드** | React ^19 (Vite ^8), react-router, 모바일 우선 반응형, Soft Mint 디자인 토큰 |
| **백엔드** | Node.js + Express — 유일한 API 게이트웨이 (Supabase 키는 서버에만) |
| **DB · 파일** | Supabase — Postgres + Storage (비공개 버킷, 서명 URL 다운로드) |
| **인증** | 아이디+비밀번호 자체 인증 — bcrypt + JWT(httpOnly 쿠키) + 초대 링크 토큰 |
| **AI** | Claude API (`@anthropic-ai/sdk`, 서버사이드 호출 · structured outputs · 템플릿 폴백) |
| **업로드** | multer → Supabase Storage |
| **린터** | Oxlint |

---

## 📁 목표 프로젝트 구조

> 구현 진행에 따라 갱신됩니다.

```
hub/
├── src/                       # 프론트엔드 (React)
│   ├── main.jsx               # 앱 진입점
│   ├── api/                   # 서버 API 클라이언트 (fetch 래퍼)
│   ├── components/            # 사이드바·헤더·공용 컴포넌트
│   ├── screens/               # 홈, 로그인/가입
│   │   ├── wizard/            # 프로젝트 생성 위저드 3스텝
│   │   ├── flow/              # 계획 검토·초대 링크·join·설문·배정 결과
│   │   └── app/               # 사이드바 3탭 — 대시보드·프로젝트 진행·프로젝트 관리
│   ├── styles/                # Soft Mint 디자인 토큰
│   └── utils/                 # 날짜 등 유틸
├── server/                    # 백엔드 (Express)
│   ├── index.js               # 서버 진입점
│   ├── routes/                # auth, projects, plan, join, surveys,
│   │                          #   assignment, tasks, uploads, notifications
│   ├── services/              # planner.js, explainer.js (Claude API 호출)
│   ├── logic/                 # assignRoles.js (결정적 배정)
│   └── db/                    # Supabase 클라이언트, 스키마 SQL
├── docs/                      # 문서 모음
│   ├── plan.md                # 서비스 기획서 + 개발 진행 체크리스트
│   └── images/                # UI 시안 (화면 설계의 기준)
└── README.md                  # 개발 문서 (이 파일)
```

---

## 🚀 실행 방법

### 사전 요구사항

- **Node.js** v20 이상 (API 서버가 `node --watch`를 사용)
- **Supabase 프로젝트** (무료 티어) — Project URL과 Secret key(`sb_secret_...`) 필요
- **Anthropic API 키** — 에이전트 연동 단계부터 필요

### 최초 1회 설정

```bash
# 1. 의존성 설치
npm install

# 2. 환경변수 — .env 파일을 열어 .env.example의 주석을 따라 값 입력
#    (SUPABASE_URL, SUPABASE_SECRET_KEY, JWT_SECRET)

# 3. DB 스키마 적용 — server/db/schema.sql 전체를
#    Supabase 대시보드 → SQL Editor에 붙여넣고 Run

# 4. Storage 비공개 버킷 2개 생성 — attachments(위저드 첨부), uploads(태스크 산출물)
```

### 개발 서버 실행

```bash
npm run dev          # 프론트(5173) + API 서버(3001) 동시 실행
npm run dev:web      # 프론트만
npm run dev:server   # API 서버만
```

실행 후 브라우저에서 **http://localhost:5173** 으로 접속합니다. API 상태는 **http://localhost:5173/api/health** 에서 확인할 수 있습니다 (`.env`를 채웠다면 `env` 항목이 모두 `true`).

### 기타 명령어

```bash
npm run lint      # 코드 린트 검사
npm run build     # 프로덕션 빌드
npm run preview   # 빌드 결과물 미리보기
```

---

## ☁️ 배포 (Vercel · 단일 오리진)

프론트(Vite 정적) + Express를 **같은 도메인**에서 서빙한다. Express는 Vercel Serverless Function으로 감싼다(`api/index.js` → `server/app.js`의 앱을 export). 같은 오리진이라 httpOnly 쿠키 인증이 CORS 설정 없이 그대로 동작한다.

- **구조**: `server/app.js`(앱 구성, listen 없음) ↔ `server/index.js`(로컬 dev용 listen) / `api/index.js`(Vercel 진입점) / `vercel.json`(`/api/*`→함수, 나머지→SPA 폴백).

**배포 절차**

1. 변경을 커밋하고 GitHub 레포에 push.
2. [vercel.com](https://vercel.com) → **New Project** → 이 레포 Import (Framework는 Vite 자동 감지).
3. **Environment Variables**에 로컬 `.env`와 같은 값 4개 입력:
   `SUPABASE_URL` · `SUPABASE_SECRET_KEY` · `JWT_SECRET` · `ANTHROPIC_API_KEY`
   (`NODE_ENV`는 Vercel이 production으로 자동 설정 → 쿠키 `secure` 활성화.)
4. **Deploy** → 발급된 `*.vercel.app`에서 전체 플로우 확인.

**주의**

- Supabase **비공개 버킷 `uploads`**가 있어야 파일 업로드가 동작한다(최초 설정 4번).
- Vercel Serverless는 요청 본문 **4.5MB** 한계가 있어 **파일 업로드 상한은 4MB**다(그 이상은 브라우저→Storage 직접 서명 업로드 필요, 후속 과제).
- Supabase 무료 티어는 7일 미사용 시 일시정지 → 배포/시연 전 대시보드 접속으로 깨우기.

---

## 📝 개발 진행

> **진행 현황·체크리스트는 [docs/plan.md](./docs/plan.md)의 "개발 진행 체크리스트" 참고** — 완료/남은 작업과 결정·검증 로그를 한 곳에서 관리한다.

> 참고: 서비스의 **플래닝 에이전트**는 `.claude/agents`가 아니라 **Express 서버 코드**(계획 생성 `server/services/planner.js`, 배정 설명 `server/services/explainer.js`)로 구현되며, `@anthropic-ai/sdk`로 Claude API를 호출한다. 역할 배정 자체는 AI가 아니라 결정적 점수 로직(`src/logic/assignRoles.js`)이 맡는다. `.claude/agents/*.md`는 개발 도구용 서브에이전트(planner·verifier) 전용.

### 개발 방식

- **계획**: `planner` 서브에이전트(`.claude/agents/planner.md`)가 docs/plan.md와 주차 요구사항을 읽어 작업을 이슈 단위(수직 슬라이스, 반나절~1일)로 분해 → 사용자 승인 → 구현
- **검증**: 검증 전용 에이전트(금요일 제작 예정)가 이슈의 완료 기준 대비 구현을 점검

---

## 👥 팀 정보

AI 팀 프로젝트 관리 서비스 개발팀

---

## 📄 라이선스

이 프로젝트는 비공개 프로젝트입니다.
