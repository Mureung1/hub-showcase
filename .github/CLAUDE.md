# 🚀 프로젝트 개발 가이드

## 🎨 1. 디자인 시스템 & 가이드라인
- **Theme Color:** Primary `#002855` (신뢰감을 주는 네이비), Accent `#001A3A`
- **Typography:** 본문 `16px/Pretendard`, 제목 `24px/Bold`
- **UI Component:** 모든 카드 가로 폭 고정, 버튼 `rounded-md` 처리

## 📂 2. 디렉토리 구조 (Directory Structure)
- `/client`: React 기반 프론트엔드 UI
- `/server`: Express 기반 백엔드 API 및 AI 에이전트 로직 연동

## 🤝 3. 개발 컨벤션 (Conventions)
### Git 커밋 규칙 (Commit Message Rules)
- `feat:` 새로운 기능 추가
- `fix:` 버그 수정
- `docs:` 문서 수정 및 추가
- `style:` 스타일시트 및 CSS 변경
## 📦 4. 필수 라이브러리 조사 및 정의 (Investigated Libraries)
### Client (React)
- `axios`: 백엔드 Express 서버와의 비동기 API 통신을 위해 사용
- `react-router-dom`: 입력창/로딩/결과 페이지의 명확한 라우팅 처리를 위해 도입 검토

### Server (Express)
- `cors`: 프론트엔드(Port 3000)와 백엔드(Port 5000) 간의 교차 출처 자원 공유 에러 방지
- `dotenv`: AI API Key 등 외부 유출되면 안 되는 보안 환경 변수 격리 관리
- `@google/generative-ai` 또는 `openai`: 소상공인 맞춤형 법률/지원금 매칭 로직을 수행할 LLM 연동 SDK

## ❓ 5. 개발 전 추가 결정 사항 (Pre-development Decisions)
- **Data 저장 방식:** 초기 프로토타입 단계에서는 무거운 RDBMS 대신 가벼운 JSON 파일 시스템이나 SQLite를 활용하여 빠르게 데이터를 영속화하기로 결정.
- **AI Agent 호출 방식:** 실시간 스트리밍 대답보다는 지원금 조건 매칭의 정확도가 중요하므로, 단발성 구조화된 JSON(Structured Outputs) 응답 방식을 채택하기로 함.
## 📦 4. 필수 라이브러리 조사 및 정의 (Investigated Libraries)
### Client (React)
- `axios`: 백엔드 Express 서버와의 비동기 API 통신을 위해 사용
- `react-router-dom`: 입력창/로딩/결과 페이지의 명확한 라우팅 처리를 위해 도입 검토

### Server (Express)
- `cors`: 프론트엔드(Port 3000)와 백엔드(Port 5000) 간의 교차 출처 자원 공유 에러 방지
- `dotenv`: AI API Key 등 외부 유출되면 안 되는 보안 환경 변수 격리 관리
- `@google/generative-ai` 또는 `openai`: 소상공인 맞춤형 법률/지원금 매칭 로직을 수행할 LLM 연동 SDK
## 🤖 계획 수립 에이전트 규칙 (Planning Agent Rules)
- **역할:** 사용자가 대형 요구사항을 주면 하루 단위의 이슈로 쪼개고 우선순위를 정한다.
- **우선순위 기준:** 코어 매칭 시나리오 구현 ➔ API 연동 ➔ 예외 처리 ➔ UI 리팩토링 순서로 배치.
- **인간 계획과의 비교 점검:** 에이전트가 제안한 기능적 쪼개기 방식을 인간(나)의 요일별 마감 일정에 융합하여 주간 대시보드 수립 완료.


















