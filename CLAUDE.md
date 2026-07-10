# ChaSeWar (차세워)

서울시 공영주차장의 위치·요금·운영시간과 실시간 주차 가능 대수를, 목적지 기준으로 제공하는 웹앱.
네이버 챌린지 개인 프로젝트 (MVP 목표: 2026-07-30).

- 기획서: https://github.com/geunnseung/hub/wiki/ChaSeWar-프로젝트-기획서
- 사용자 시나리오: https://github.com/geunnseung/hub/wiki/사용자-시나리오
- 프로토타입: `docs/prototype/`

## 기술 스택
### 프론트엔드 (`frontend/`)
- React 18 + Vite
- react-router-dom(라우팅), axios(API 호출), TanStack Query(서버 상태·로딩·에러)
- 스타일: 순수 CSS + 디자인 토큰(`docs/design/tokens.css`)

### 백엔드 (`backend/`)
- Java 21, Gradle, Spring Boot 3.2+ / JPA + MySQL / RestClient / `@Scheduled`
- 패키지: 도메인형 (parking / geocoding / realtime / walktime / global)
- **상세 규칙(아키텍처·API·영속성·예외 등)은 `chasewar-backend` skill 참고**

## 디렉토리
- `frontend/` React+Vite
- `backend/` Spring Boot (도메인형 패키지: 도메인별 controller/service/repository/domain/dto)
- `docs/` 기획·프로토타입·디자인 시스템
- `.claude/` skill 등

## 명령어
- 프론트: `cd frontend && npm run dev` (개발 서버) / `npm run build` (빌드) / `npm run preview`
- 백엔드(스캐폴딩 후): `cd backend && ./gradlew bootRun` (실행) / `./gradlew test` (테스트) / `./gradlew build`

## MVP 기능
- 목적지 검색 → 주변 공영주차장 거리순 탐색
- 주차장 상세(요금·운영시간·주소·거리)
- 실시간 주차 가능 대수(제공 주차장만)
- 범위 밖: 회원 기능, 지도 시각화 (확장 단계)

## 데이터 · 외부 API
- 정적: 서울 공영주차장 안내 정보 (OA-13122)
- 실시간: 서울 시영주차장 실시간 주차대수 (OA-21709, 약 5분 주기, 인증키)
- 지오코딩: 네이버 지역검색 API (목적지 → 좌표)
- 도보 시간: Tmap 보행자 경로 API (상세 화면)

## 디자인 시스템
- 토큰 원본: `docs/design/tokens.css` — 값은 여기서만, 항상 `var(--토큰)` 참조
- 요약/규칙: `docs/design/design-system.md`
- 상태색: 여유 >50% / 보통 10~50% / 혼잡 ≤10% / 정보없음(실시간 미제공)
- UI 작업 시 `chasewar-design` skill 참고

## 컨벤션
- **커밋·브랜치 규칙은 `commit-convention` skill 참고** (Conventional Commits · 한글 · 작은 단위, `work`에서 브랜치 파서 머지)

### 코드 스타일
- 백엔드: 클래스 PascalCase, 메서드·변수 camelCase, 요청/응답 DTO 분리, 도메인별 계층 유지
- 프론트: 컴포넌트 PascalCase, 파일당 한 컴포넌트

## 주의사항
- API 키(서울 열린데이터·네이버·Tmap)는 **환경변수로 관리, 커밋 금지**
- 빌드/배포 CI/CD는 `work`에 올리지 않음
- 실시간 데이터는 스냅샷만 제공 — 과거 이력 없음(혼잡 예측 불가)
- 디자인 값은 하드코딩 금지, 항상 `tokens.css`의 `var(--토큰)` 사용
