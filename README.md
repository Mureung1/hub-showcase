# DevPulse

여러 GitHub 레포의 커밋·이슈 상태를 자동 수집·분석해서 "지금 뭘 먼저 손봐야 하는지" 알려주는 개인용 개발 관제 시스템입니다.

## 문서

- [기획서](docs/DevPulse_기획서_v1.md) — 핵심 기능, 사용자 시나리오, 화면 구조
- [위키](docs/DevPulse_Wiki_Home.md) — 기능/기술스택/제약조건/구현 매핑
- [프로토타입](docs/prototype.html) — 순수 HTML/CSS, 브라우저로 바로 열람
- [CLAUDE.md](CLAUDE.md) — AI 에이전트용 프로젝트 컨텍스트

## 기술 스택

- **FE**: React (Vite, 순수)
- **BE**: Java 17, Spring Boot 3.x, JPA/QueryDsl/MyBatis, Kafka, Feign
- **DB**: PostgreSQL, Flyway
- **AST 파싱**: JavaParser
- **LLM**: 무료 tier (Groq/Gemini), 배치 호출만

## 실행 방법

### Backend
```bash
cd backend
./gradlew bootRun
```
GitHub 토큰은 환경변수로 주입:
```bash
export DEVPULSE_GITHUB_TOKEN=your_token
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```
