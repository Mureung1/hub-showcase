# 냉장고 레시피 앱 (fridge-recipe-app)

자취생을 위한 냉장고 재고 관리 + 레시피 추천 웹 서비스. `frontend/`(React + Vite)와 `backend/`(Express)로 구성된 풀스택 프로젝트입니다.

## 링크

| | |
|---|---|
| 🔗 **서비스 배포** | <https://fridge-recipe-app-gl2n.onrender.com/> |
| 🎬 **시연 영상** | 준비 중 |
| 💻 **소스 코드** | <https://github.com/baejh3333-del/fridge-recipe-app> (공개) |
| 📄 **프로젝트 소개 자료** | [showcase/intro.md](showcase/intro.md) · [발표 슬라이드](showcase/intro-slides.pptx) |

> 배포는 Render 무료 인스턴스라 첫 접속 시 깨어나는 데 수십 초 걸릴 수 있습니다.

## 무엇을 해결하나

요리 초보 자취생은 냉장고에 어떤 재료가 있는지 기억하기 어렵고, 그 재료로 무슨 요리를 할 수 있는지 몰라 장보기와 식사 준비를 계속 미루게 됩니다.

- 영수증을 촬영하면 OCR로 품목을 인식해 재고에 자동 등록합니다.
- 보유 재료 기준으로 지금 만들 수 있는 요리를 난이도별로 추천합니다.
- 요리를 완료하면 사용한 재료만큼 재고를 자동 차감합니다.
- 유통기한이 임박하면 웹 푸시로 알리고, 기한이 지난 재료는 앱 진입 시 폐기 안내를 띄웁니다.
- 최소 구매로 최대한 다양한 요리를 만들 수 있는 장보기 세트와 일주일 식단을 추천합니다.

## 문서

- [제품 명세](docs/product.md) — 페르소나·문제정의·MVP 범위·화면별 기능 정리
- [API & 기술 명세](docs/api.md) — 엔드포인트 계약, DB 스키마, Supabase 마이그레이션
- [알고리즘 설계](docs/algorithms.md) — 식단 추천·장보기 최적화 알고리즘
- [백로그](docs/backlog.md) — 완료 작업 요약, 남은 작업, Day별 진행 기록
- [3주차 계획수립](docs/3주차%20계획수립.md) — Day 11~15 진행 계획 및 완료 현황
- [4주차 계획수립](docs/4주차%20계획수립.md) — Day 16~20 진행 계획(코드 검토·OCR 실연동·농산물 API 보강·배포)
- [쇼케이스](showcase/showcase.json) — 포트폴리오 제출용 프로젝트 요약(문제정의·핵심기능·기술스택·AI 에이전트 활용 내역)

## 진행 현황

19일차(2026-07-30)까지 진행했습니다. 최근 작업은 [백로그](docs/backlog.md)와 커밋 히스토리를 참고하세요.

이 저장소는 챌린지 제출용 fork라 비공개이며, 일자별 진행 과정(`day3`~`day19` 브랜치)과 이슈 트래커를 여기에 두었습니다. 코드 자체는 공개 저장소인 [`baejh3333-del/fridge-recipe-app`](https://github.com/baejh3333-del/fridge-recipe-app)에서도 동일하게 볼 수 있습니다.

- 📋 [통합 개발 백로그 (#19)](https://github.com/baejh3333-del/hub/issues/19) — 진행 중 / 다음 작업 / 백로그 체크리스트
- 🗂 [전체 이슈 목록](https://github.com/baejh3333-del/hub/issues) — 각 작업의 상세 구현 가이드

## 시작하기

```bash
# Frontend (Vite dev 서버)
cd frontend && npm install && npm run dev

# Backend (nodemon, 기본 포트 3001)
cd backend && npm install && npm run dev
```

프론트(5174)와 백엔드(3001)를 각각 별도 터미널로 띄웁니다. 포트가 달라 브라우저가 CORS를 막으므로 백엔드에서 `cors()`를 열어 두었습니다.

### 프로덕션 실행

```bash
cd frontend && npm run build
cd ../backend && node src/server.js
```

`backend/src/app.js`가 `express.static(frontend/dist)`로 빌드된 프론트를 직접 서빙합니다 — 이 모드에서는 CORS도 5174 포트도 관여하지 않습니다.

### 환경 변수

`backend/.env.example`을 `backend/.env`로 복사해 채웁니다. **전부 선택 사항입니다** — 외부 연동(Supabase/OCR/가격 API/웹 푸시)이 없어도 정적 폴백과 데모 데이터로 동작합니다. 서버 부팅 시 어떤 연동이 켜졌는지 로그로 표시됩니다.

### 테스트

```bash
cd backend && npm test    # 127건
cd frontend && npm test   # 65건
```

자세한 명령어와 아키텍처 설명은 [CLAUDE.md](CLAUDE.md)를 참고하세요.
