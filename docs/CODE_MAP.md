# CODE_MAP

## 현재 코드 지도

현재 저장소는 실제 제품 코드가 아니라 HTML·CSS 프로토타입 중심이다.

| 파일 | 역할 |
|---|---|
| `README.md` | 사람이 보는 프로젝트 소개와 프로토타입 확인 방법 |
| `docs/PRD.md` | 목표, MVP 범위, 사용자 시나리오, 화면 구조, 리스크의 기준 문서 |
| `prototype/index.html` | 7개 화면과 데모 데이터를 담은 단일 HTML |
| `prototype/styles.css` | 디자인 토큰, 레이아웃, 반응형, `:target` 기반 화면 전환 |

## `HARNESS/` 오케스트레이션 지도

`HARNESS/`는 제품 기능 구현이 아니라 PRD부터 검증·배포 인계까지의 작업 순서와 증거를 관리하는 실행 계층이다. 따라서 하네스가 준비되었다고 해서 실제 앱, API, DB, AI 연동 또는 배포가 구현된 것은 아니다.

| 경로 | 역할 |
|---|---|
| `HARNESS/run.py` | `validate`, `plan`, `start`, `resume`, 상태·승인 명령의 진입점 |
| `HARNESS/engine/controller.py` | Phase 상태 전이, Worker·배포 Adapter 분리 실행, 독립 검증, 재시도, 정확한 경로의 Git 체크포인트 |
| `HARNESS/engine/specs.py` | Phase·Step·경로·명령·입력 계약의 사전 검증 |
| `HARNESS/engine/io.py` | 원자적 기록, 단일 실행 잠금, 비밀정보 정제, 서명된 이벤트 저널 관리 |
| `HARNESS/phases/` | `00` 탐색부터 `08` 프로덕션 인계까지의 순서, 권한, 산출물, 인수 기준 |
| `HARNESS/contracts/` | Run state, Event, Attempt, Failure 등 실행 기록의 JSON 계약 |
| `HARNESS/tests/` | Controller 안전 장치와 정적 프로토타입 계약의 자동 회귀 테스트 |
| `HARNESS/tests/test_prototype.py` | 필수 화면·fragment 링크, 수동 게시 경계, 악성 대응 고지, Phase 2 비활성, 접근성·반응형·인쇄 기본값 검증 |
| `HARNESS/runs/` | Git에서 제외되는 실행별 상태, 로그, Attempt, 실패 증거 저장소 |
| `HARNESS/FAILURE_RECORDS.md` | 실패 현상·원인 가설·증거·조치·재검증·처분을 분리해 기록하는 원칙 |

실행 기록은 Controller가 소유한다. Worker의 완료 선언만으로 단계가 통과하지 않으며, 실패 재시도는 이전 Attempt를 덮어쓰지 않고 새 기록으로 남긴다.

`test_prototype.py`는 HTML·CSS의 정적 구조와 필수 문구를 검사한다. 실제 브라우저의 시각 품질, 반응형 배치와 클릭 체감은 별도 수동 검증 대상이다.

## `prototype/index.html` 화면 진입점

| 앵커 | 화면 | PRD 연결 |
|---|---|---|
| `#start` | 프로토타입 시작 안내 | 검토 흐름 |
| `#home` | 홈 대시보드 | PRD 4.2 |
| `#inbox` | 리뷰함 | PRD 4.3 |
| `#detail` | 리뷰 상세·답글 작성 | PRD 4.4 |
| `#input` | 리뷰 입력 | PRD 4.5 |
| `#report` | 분석 리포트 | PRD 4.6 |
| `#response` | 블랙컨슈머 대응 센터 | PRD 4.7 |
| `#settings` | 매장 설정 | PRD 4.8 |

## `prototype/styles.css` 주요 책임

- 전역 디자인 토큰: 색상, 반경, 그림자, 글꼴
- 공통 레이아웃: 사이드바, 상단바, 카드, 그리드, 반응형
- 상태 표현: 유형 배지, 상태 칩, 위험 알림, 체크리스트
- 데모 인터랙션: `:target`, `:checked`, `:has()`를 이용한 화면 표시
- 인쇄 대응: 대응 매뉴얼과 리포트 인쇄 시 불필요한 내비게이션 제거

## 향후 실제 제품 코드 경계

기술 스택이 결정되면 다음 기능 단위로 코드를 나눈다.

| 기능 영역 | 넣을 예정인 기능 |
|---|---|
| `reviews` | 리뷰 등록, 일괄 붙여넣기 파싱, 리뷰 목록, 상태 변경 |
| `classification` | 유형·카테고리·분류 근거 생성, 확신도 낮은 리뷰 확인 필요 처리 |
| `reply` | 매장 프로필 기반 답글 초안 생성, 톤 변경, 금칙 검사, 복사/완료 처리 |
| `analytics` | 반응 비율, 별점 추이, 카테고리 언급량, 메뉴별 키워드, 콜드 스타트 |
| `response-case` | 위험도 분류, 악성 리뷰 대응 4단계, 증거 체크리스트, 사례 아카이브 |
| `store-profile` | 매장 정보, 말투, 운영 정보, 이벤트, 금지 표현 관리 |
| `platform-adapter` | 배민 수동 입력, Phase 2 자동 수집·게시 연동, 채널별 차이 흡수 |

## 코드 변경 시 확인할 문서

- 화면 변경: `docs/PRD.md`, `docs/UI_GUIDE.md`, 이 파일
- 도메인 로직 변경: `docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/GOTCHAS.md`
- 테스트 추가: `docs/TEST_PLAN.md`
- 작업 방식 변경: `HARNESS/README.md`
- Phase·권한·실패 기록 변경: `HARNESS/phases/`, `HARNESS/contracts/`, `HARNESS/FAILURE_RECORDS.md`
