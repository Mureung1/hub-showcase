## 주요 작업 리스트

- **백엔드 코어 엔티티 및 JWT 인증 시스템 구축 (Phase 1 & 2)**
  - `Member`, `RawInformation`, `ActionItem` 도메인 엔티티 설계 및 연관관계 매핑
  - `SecurityConfig`, `JwtProvider`, `JwtAuthenticationFilter`를 활용한 Stateless JWT 인증 로직 구현
  - 통합 테스트(JUnit)를 통한 인증 및 DB 연동 검증
- **프론트엔드 UI 템플릿(design2) 고도화 및 병합 (Phase 3 & 3.5)**
  - 대학생 타겟의 밝고 귀여운 파스텔톤 플랫 디자인(Flat Design)을 적용한 `design2` 버전 개발
  - `Login.tsx`, `Dashboard.tsx` 컴포넌트 마크업 및 라우팅(`App.tsx`)
  - `design2` 버전을 기존 `frontend` 프로젝트에 덮어쓰기하여 UI 공식 병합 및 서버 재구동 확인
- **백엔드 크롤러 파이프라인 기초 공사 (Phase 4)**
  - `build.gradle`에 `org.jsoup:jsoup` 의존성 추가 및 `@EnableScheduling` 스케줄러 활성화
  - `CrawlerService.java` 개발하여 1시간 주기로 실행되도록 세팅 및 MVP 테스트용 가상(Mock) 공지사항 데이터 삽입 로직 구현
  - 테스트 및 수동 실행을 위한 `CrawlerController.java` 연동

## 내가 설명할 수 있는 부분

**프론트엔드 UI 템플릿 격리 개발 및 병합 프로세스**
기존에 동작하던 `frontend` 환경을 망가뜨리지 않기 위해 `design1`, `design2`와 같은 별도의 샌드박스 디렉토리에서 여러 디자인 시안을 만들어보고, Vite 기반의 독립적인 서버를 띄워 작동을 테스트했습니다. 최종적으로 확정된 파스텔 테마의 `design2`를 원본 `frontend`에 완전히 덮어씌움으로써, 백엔드와 연동하기 전 순수한 UI 목업(Mockup) 단계를 안정적으로 마칠 수 있었습니다.

## 아직 이해 못 한 부분

새롭게 스펙 문서에 추가된 **'Conflict Resolution (일정 충돌 재배치)'과 'Irreversibility (되돌릴 수 없는 정도)' 개념의 실제 구현 방식**입니다. AI Agent가 단순히 우선순위를 정해주는 것을 넘어 충돌하는 일정들을 재배치해 주는 아이디어는 훌륭하지만, 이를 프론트엔드 대시보드의 어느 영역에 어떻게 시각적으로 노출할지, 그리고 LLM의 JSON 응답을 `ActionItem` 엔티티 구조 안에 어떻게 담아낼지(예: 별도의 Conflict 테이블 생성 또는 JSON 필드 추가) 구체적인 설계가 필요해 보입니다.

## 새로 알게 된 것

- **Vite 8 & Node.js 버전 호환성:** Vite 8.x 환경에서 플러그인(`@rolldown`) 구동 시 Node.js 최신 버전을 요구하는 엄격한 호환성 문제가 발생하여, `nvm`을 통해 Node.js v26 환경을 명시적으로 사용함으로써 에러를 해결하는 경험을 했습니다.
- **Tailwind v4 커스텀 유틸리티 `@apply` 이슈:** Tailwind v4의 `@layer utilities` 안에서 선언된 커스텀 클래스를 같은 파일 내에서 즉시 `@apply`로 재사용하려 할 때 파싱 에러가 발생하며, 이를 우회하기 위해 `shadow-[...]` 방식의 임의 값(Arbitrary values)을 직접 할당하는 방식이 더 안정적임을 깨달았습니다.
