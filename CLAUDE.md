# ChaSeWar (차세워)

서울시 공영주차장의 위치 · 요금 · 운영시간과 실시간 주차 가능 대수를, **목적지 기준으로** 제공하는 웹앱.

**쓰는 흐름** — 목적지 키워드 검색 → 장소 선택 → 도보 거리순 주차장 목록 → 상세(요금 · 운영시간 · 실시간 대수)

- 기획서: https://github.com/geunnseung/hub/wiki/ChaSeWar-프로젝트-기획서
- 사용자 시나리오: https://github.com/geunnseung/hub/wiki/사용자-시나리오

**범위 밖** — 회원 기능, 지도 시각화. 실시간 데이터는 **스냅샷만** 있고 과거 이력이 없다(혼잡 예측 불가).

## 어디를 보나

일하기 전에 **해당하는 문서를 먼저 연다.**

| 무엇을 할 때 | 볼 곳 |
|---|---|
| 기능 작업을 시작할 때 | `workflow` skill — 설계 · 구현 · 검증 · 리뷰 · 커밋의 순서 |
| 백엔드 코드를 쓸 때 | `chasewar-backend` skill |
| UI를 만들 때 | `chasewar-design` skill → `docs/design/` |
| 코드 리뷰 · 기능 리뷰 | `code-review` · `feature-review` skill |
| 커밋 · 브랜치 | `commit-convention` skill |
| 무엇을 만드는지 확인할 때 | `docs/product/` — 사용자 시나리오 · PRD · 와이어프레임 · ERD · API 명세 |

```
CLAUDE.md                   프로젝트 소개 · 스택 · 브랜치 · 명령어
.claude/skills/             어떻게 일하나
docs/product/               무엇을 만드나
docs/design/                디자인 토큰 · 디자인 시스템
docs/prototype/             프로토타입
```

## 기술 스택

**프론트엔드** `frontend/` — React 18 + Vite / react-router-dom · axios · TanStack Query / 순수 CSS + 디자인 토큰

**백엔드** `backend/` — Java 21 · Gradle · Spring Boot 3.2+ / JPA + MySQL / RestClient / `@Scheduled`
도메인 패키지: `parking` · `place` · `global`

## 데이터 · 외부 API

| 용도 | 출처 |
|---|---|
| 정적 주차장 정보 | 서울 공영주차장 안내 정보 (OA-13122) |
| 실시간 주차 대수 | 서울 시영주차장 실시간 주차대수 (OA-21709) |
| 장소 검색 · 지오코딩 | 카카오 로컬 API (키워드 · 주소) |
| 도보 거리 | Tmap 보행자 경로 |

실시간 대수는 **일부 주차장만** 제공한다. 없는 곳은 "정보 없음"으로 다룬다.

## 브랜치

| 브랜치 | 쓰임 |
|---|---|
| `work` | 개발 기본. 여기서 파서 작업하고 여기로 머지한다 |
| `deploy` | 배포 전용. **빌드 · 배포 CI/CD 설정은 여기에만** 둔다 |

- **`deploy` 를 `work` 로 머지하지 않는다.** 한 방향으로만 간다.
- 브랜치 이름과 커밋 규칙은 `commit-convention` 을 따른다.

## 명령어

```bash
cd frontend && npm run dev        # 개발 서버
cd frontend && npm run build      # 빌드

cd backend && ./gradlew bootRun   # 실행 (local 프로파일)
cd backend && ./gradlew build     # 테스트 포함 빌드
```

`bootRun` 전에 준비돼 있어야 하는 것 — **하나라도 없으면 기동에 실패한다.**

- MySQL 이 떠 있을 것
- 환경변수 6개 — `DB_URL` · `DB_USERNAME` · `DB_PASSWORD` · `SEOUL_API_KEY` · `KAKAO_API_KEY` · `TMAP_API_KEY`

## 주의사항

- **파일을 고치기 전에 브랜치를 먼저 확인한다.** 대상 브랜치를 안내하고, 이동한 뒤 진행한다.
- **API 키는 환경변수로 관리하고 커밋하지 않는다** (서울 열린데이터 · 카카오 · Tmap · DB).
- **디자인 값을 하드코딩하지 않는다.** 항상 `docs/design/tokens.css` 의 `var(--토큰)` 을 쓴다.
