# 🎰 대안 자산 가격 예측 및 트렌드 시각화 플랫폼

이 프로젝트는 리스크 없이 가상 포인트로 한정판 스니커즈, 스트릿 의류, TCG 카드, 레고 등 대안 자산(Alternative Assets) 리셀 시장의 미래 가격을 예측하고, 집단지성 데이터로 구축된 대중 예상가를 시각적으로 확인할 수 있는 웹 애플리케이션입니다.

* **상세 기획서**: 세부 비즈니스 모델 및 개발 사양은 **[wiki](file:///Users/tatata/Desktop/Ai_agent/hub/git_wiki_planning.md)**에서 확인하실 수 있습니다.

---

## 📂 프로젝트 구조

프로젝트는 유지보수성과 확장성을 위해 프론트엔드와 백엔드로 분리(Separated)되어 있으며, 다음과 같은 폴더 구조로 구성됩니다.

```text
/hub (Root)
├── backend/                  # 백엔드 (Express + Prisma ORM)
│   ├── src/
│   │   ├── controllers/      # API 비즈니스 로직
│   │   ├── models/           # Prisma DB 쿼리 인터페이스
│   │   ├── cron/             # 주간 정산 배치 스케줄러
│   │   ├── crawler/          # Puppeteer 실시간 가격 크롤러
│   │   └── app.js            # Express 진입점
│   ├── prisma/
│   │   └── schema.prisma     # PostgreSQL 데이터베이스 모델 스키마
│   ├── package.json
│   └── .env
│
└── frontend/                 # 프론트엔드 (React + TypeScript + Vite)
    ├── src/
    │   ├── assets/           # 정적 이미지 파일들
    │   ├── components/       # 재사용 가능한 UI 컴포넌트
    │   ├── views/            # 랭킹, 예측 목록 등 메인 페이지 뷰
    │   ├── styles/           # August* 스타일 가이드라인 CSS (style.css)
    │   ├── App.tsx           # 메인 애플리케이션 컴포넌트
    │   └── main.tsx          # 리액트 엔트리 포인트
    ├── index.html            # Vite HTML 템플릿
    ├── tsconfig.json         # TypeScript 컴파일러 구성
    └── vite.config.ts        # Vite 서버 및 API 프록시 구성
```

---

## 🚀 실행 방법

### 1. 프론트엔드 (React + TypeScript) 실행
의존성 패키지를 설치한 후 개발 서버를 구동합니다. (포트: `3000`으로 자동 연동)

```bash
cd frontend
npm install
npm run dev
```

### 2. 백엔드 (Express.js) 실행
환경 변수 설정 후 Express API 서버를 실행합니다. (포트: `5000`으로 자동 연동, 프론트엔드에서 `/api` 프록시 전달)

```bash
cd backend
npm install
npm run dev
```

---

## ✨ 핵심 기능


1. **🔮 Zero-Risk 방향성 예측 투표 (Up/Down)**
   - 복잡한 가격 계산 장벽을 없애고, 카드의 **[▲ up]** / **[▼ down]** 단 2개의 버튼으로 가볍게 시장 심리 예측에 참여합니다. (출시 전 `upcoming` 상태 제품 전용)

2. **📊 출시 전/출시 완료 상태 분리 및 가격 표시**
   - **출시 전 (upcoming)**: 대중 합의 예상 시세(est.)와 함께 투표 가능 상태로 노출됩니다.
   - **출시 완료 (released)**: 실제 거래 시세(market)를 보여주며, 투표는 `🔒 voting locked` 상태로 안전하게 공식 비활성화됩니다.

3. **🏆 주간 랭킹 대시보드 (Weekly Leaderboard)**
   - **포디움 연출**: 매주 높은 점수를 달성한 탑 3 유저의 순위(🥇🥈🥉)와 주간 우승 보상(네이버페이 5만원 권 등)을 시각화합니다.
   - **Contenders 리스트**: 4위부터 10위까지의 실시간 순위 정보와 예측 정확도, 포인트 변동 지표를 직관적으로 표시합니다.
   - **My standing 정보**: 자신의 현재 순위와 함께 탑 10 진입을 위해 추가로 획득해야 하는 점수 등의 개인 동기부여 대시보드를 제공합니다.
   - **주간 토글**: `this week` / `last week` 토글 버튼을 통해 진행 중인 정보와 마감된 이전 주간 랭킹 정보로 화면 데이터를 쉽게 스위칭할 수 있습니다.
