## 주요 작업 리스트

- **프로젝트 초기 세팅 기획 및 계획서(Implementation Plan) 수립**
- **Docker 기반 PostgreSQL 데이터베이스 환경 구축** (`docker-compose.yml`)
- **Spring Boot 3 (Java 17) 백엔드 애플리케이션 생성**
  - Spring Data JPA, Web 의존성 추가 및 `application.yml` DB 연결 설정
  - 연동 테스트용 `/api/health` 엔드포인트 생성 (`HealthCheckController.java`)
- **React + Vite + TypeScript 프론트엔드 애플리케이션 생성**
  - Tailwind CSS v4 환경 구성
  - 백엔드 API 결과를 화면에 출력하는 통신 테스트 코드 작성 (`App.tsx`)

*(Agent 코멘트: 터미널 환경 상 스크린샷 캡쳐가 제한되어 있어, 텍스트와 로그 확인으로 연동 결과를 검증했습니다.)*

## 내가 설명할 수 있는 부분

**프론트엔드와 백엔드 API 연동 구조 (`App.tsx` / `HealthCheckController.java`)**
백엔드에서는 REST API가 외부(프론트엔드) 포트에서 접근 가능하도록 `@CrossOrigin` 어노테이션을 달아 CORS 정책 위반을 방지했습니다. 프론트엔드에서는 브라우저 기본 API인 `fetch`와 React의 `useEffect` 훅을 조합하여 페이지 렌더링 시점에 비동기로 백엔드 상태를 불러옵니다. 이렇게 불러온 데이터를 `useState`로 상태 관리하여 Tailwind로 구성한 UI에 실시간으로 반영하도록 구성했습니다. 이는 전체 스택이 하나의 흐름으로 정상 동작함을 증명하는 가장 핵심적이고 기초적인 코드입니다.

## 아직 이해 못 한 부분

현재는 초기 보일러플레이트(기본 뼈대) 세팅 단계이므로 작성된 코드 중 이해하지 못한 부분은 없습니다. 다만, 이후 구현될 핵심 기능인 'Priority Score 기반의 AI 스케줄링 알고리즘'과 'LMS/장학금 크롤링 데이터의 구조화된 저장 방식'에 대해서는 구체적인 DB 엔티티 설계와 파이프라인 구조를 아직 완벽하게 확정 짓지 않은 상태입니다.

## 새로 알게 된 것

- **Tailwind CSS v4 변경점:** Vite 프로젝트에 최신 Tailwind CSS를 설정할 때, 기존의 복잡했던 `tailwind.config.js` 방식 대신 Vite 플러그인(`@tailwindcss/vite`)을 활용하고 CSS 파일에 `@import "tailwindcss";`만 추가하여 더욱 간소화된 방식으로 세팅할 수 있다는 것을 확인하고 적용했습니다.
- **Mac 터미널 자동화 한계:** Mac 환경에서 터미널 명령(`brew cask`)만으로 Docker Desktop 같은 시스템 권한 요구(sudo) 애플리케이션을 완전 자동 설치하는 데에는 보안 정책상 사용자 개입이 필수적이라는 사실을 다시 한번 확인했습니다.
