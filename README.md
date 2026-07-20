# 자격증·스펙 취득 경로 플래너

실제 채용공고 데이터를 기반으로 목표 직무에 정말 필요한 자격증을 근거와 함께 걸러주고, 여러 자격증을 가장 효율적인 순서로 취득할 수 있도록 경로를 계산해주는 서비스입니다.

## 문제의식

취업 준비 커뮤니티에서 추천되는 자격증(예: 컴활)이 실제로는 목표 직무에서 거의 요구되지 않는 경우가 있습니다. 카더라 정보 대신, 실제 채용공고의 우대조건을 분석해 진짜 수요를 확인합니다.

## 문서

- [기획서](docs/기획서_v1.md) — 문제 정의, 사용자 시나리오, 핵심 기능
- [위키](docs/Wiki_Home.md) — 기능/기술스택/제약조건/구현 매핑
- [개발 백로그](docs/BACKLOG.md) — Task 목록, 우선순위, 주차별 계획
- [프로토타입](docs/prototype.html) — 순수 HTML/CSS, 브라우저로 바로 열람
- [CLAUDE.md](CLAUDE.md) — AI 에이전트용 프로젝트 컨텍스트

## 기술 스택

- **FE**: React (Vite, 순수)
- **BE**: Java 17, Spring Boot 3.x
  - JPA — 기본 CRUD
  - QueryDsl — 진행 상황 동적 필터 조회
  - MyBatis — 자격증 언급 빈도·강조도 집계
  - Java 그래프 알고리즘 — 자격증 취득 경로 최적화 (위상 정렬)
  - Kafka — 공고 수집→정규화→집계 파이프라인 비동기 분리
  - Feign — 사람인 API, 무료 LLM API 호출
- **DB**: PostgreSQL, Flyway
- **데이터 소스**: 사람인 Open API — 커뮤니티 게시글 크롤링은 하지 않음

## 실행 방법

### Backend
```bash
cd backend
./gradlew bootRun
```
API 키는 환경변수로 주입:
```bash
export DEVPULSE_SARAMIN_API_KEY=your_key
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```
