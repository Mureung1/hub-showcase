# CODE_MAP

**이 문서의 역할**: 파일이 실제로 어디 있는가 — 현재 코드 지도, 파일별 책임, 프로토타입 앵커와 PRD 대응, 향후 폴더 트리. 계층 경계는 `ARCHITECTURE.md`, 검증 방법은 `TEST_PLAN.md`, 하네스 운영 규칙은 `HARNESS/README.md`에 있다. 여기서 그것들을 다시 쓰지 않는다.

## 현재 코드 지도

현재 저장소는 실제 제품 코드가 아니라 HTML·CSS 프로토타입 중심이다.

| 파일 | 역할 |
|---|---|
| `README.md` | 사람이 보는 프로젝트 소개와 프로토타입 확인 방법 |
| `docs/PRD.md` | 목표, 기능 범위, 사용자 시나리오, 화면 구조, AI 실행 방식, 개인정보 보관, 리스크의 기준 문서 |
| `prototype/index.html` | 7개 화면과 데모 데이터를 담은 단일 HTML |
| `prototype/styles.css` | 디자인 토큰, 레이아웃, 반응형, `:target` 기반 화면 전환 |
| `showcase/showcase.json` | 외부 제출용 프로젝트 소개 데이터 (cad821e에서 루트로 이동) |

## `HARNESS/` 오케스트레이션 지도

`HARNESS/`는 제품 기능 구현이 아니라 기능 단위 Phase(00 공통 기반 + 01~05 기능 + 06 통합 검증 + 07 LLM 배선)의 작업 순서와 증거를 관리하는 실행 계층이다. 따라서 하네스가 준비되었다고 해서 실제 앱, API, DB, AI 연동이 구현된 것은 아니다.

| 경로 | 역할 |
|---|---|
| `HARNESS/run.py` | `validate`, `plan`, `start`, `resume`, 상태·승인 명령의 진입점 |
| `HARNESS/engine/controller.py` | Phase 상태 전이, Worker·배포 Adapter 분리 실행, 독립 검증, 재시도, 정확한 경로의 Git 체크포인트 |
| `HARNESS/engine/specs.py` | Phase·Step·경로·명령·입력 계약의 사전 검증 |
| `HARNESS/engine/io.py` | 원자적 기록, 단일 실행 잠금, 비밀정보 정제, 서명된 이벤트 저널 관리 |
| `HARNESS/phases/` | 기능 단위 Phase(00 공통 기반 + 01~05 핵심 기능 + 06 통합 검증 + 07 LLM 배선)의 순서, 권한, 산출물, 인수 기준. 계획은 `HARNESS/phases/PHASE_PLAN.md` |
| `HARNESS/contracts/` | Run state, Event, Attempt, Failure 등 실행 기록의 JSON 계약 |
| `HARNESS/tests/` | Controller 안전 장치와 정적 프로토타입 계약의 자동 회귀 테스트 |
| `HARNESS/tests/test_prototype.py` | 필수 화면·fragment 링크, 수동 게시 경계, 악성 대응 고지, 접근성·반응형·인쇄 기본값 검증. 자동화 수준 관련 검사는 제외 기능 확정에 맞춰 갱신 대상 |
| `HARNESS/runs/` | Git에서 제외되는 실행별 상태, 로그, Attempt, 실패 증거 저장소 |
| `HARNESS/FAILURE_RECORDS.md` | 실패 현상·원인 가설·증거·조치·재검증·처분을 분리해 기록하는 원칙 |

참고: `HARNESS/run.py`와 `HARNESS/tests/` 소스는 현재 md 워크트리에 없다(엔진 소스만 있음). 위 표의 해당 항목은 하네스 코드가 있는 로컬 실행 브랜치 기준이다.

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

폴더·파일 트리는 기능 위주로 구성하며, 하네스 Phase와 기능 폴더가 1:1로 대응한다 (`HARNESS/phases/PHASE_PLAN.md`). 스택은 ADR-0002 기준(React+TS+Vite / Supabase 로컬)이다.

```text
frontend/                          # React + TypeScript + Vite
└─ src/
   ├─ features/
   │  ├─ auth/                     # Phase 0: 이메일 가입·로그인 (Supabase Auth)
   │  ├─ reviews/                  # Phase 0: 리뷰 수동 입력·일괄 파싱·목록·상태
   │  ├─ review-classification/    # Phase 1: 분류 결과 표시·필터·확인 필요 처리
   │  ├─ store-profile/            # Phase 2: 톤앤매너·운영 정보·이벤트·금지 표현
   │  ├─ reply-draft/              # Phase 3: 초안 에디터·복사 → 완료 흐름
   │  ├─ review-analysis/          # Phase 4: 리포트·인사이트·콜드 스타트
   │  ├─ home/                     # Phase 4: ① 홈 대시보드(통계·처리 큐·인사이트 조합)
   │  └─ blackconsumer/            # Phase 5: 대응 센터·매뉴얼 4단계·아카이브
   ├─ shared/                      # Supabase 클라이언트, 공통 앱 셸(사이드바 6메뉴)·UI (최소한만)
   └─ content/safety.ts            # 수동 게시·법률 고지 등 안전 고정 문구
supabase/                          # 로컬 Supabase (CLI + Docker)
├─ migrations/                     # 기능별 SQL 스키마 + RLS 정책 (변경은 SQL로만)
├─ functions/                      # Edge Functions (Deno/TS) — LLM 호출은 여기서만
│  ├─ classify-review/             # Phase 1: 리뷰 유형 분류
│  ├─ generate-reply/              # Phase 3: 답글 초안 생성
│  ├─ assess-risk/                 # Phase 5: 위험도 판정
│  └─ _shared/                     # LLM adapter(LLM_PROVIDER=fake 지원), 공통 모듈
└─ config.toml
tests/
├─ integration/                    # Phase 6: S1~S4 통합 검증 (Vitest + 로컬 Supabase)
└─ golden/                         # 금칙 골든 사례 (reply-safety-cases.json)
```

플랫폼 자동 수집·게시 어댑터는 두지 않는다. 연동 자체가 제외 기능이다(PRD 7.1).

## 문서별 역할

각 문서는 한 가지 질문만 담당한다. 같은 내용을 두 곳에 적지 않는다.

| 문서 | 담당 질문 | 내용 |
|---|---|---|
| `docs/PRD.md` | 왜, 무엇을 만드는가 | 제품 사양의 단일 출처. 기능, 화면별 표시·동작, 시나리오, 제외 기능, 리스크, 개인정보 |
| `docs/ARCHITECTURE.md` | 어떤 구조인가 | 계층 경계, 도메인 모델 경계, 의존 원칙 |
| `docs/CODE_MAP.md` | 어디에 있는가 | 파일 위치와 책임, 폴더 트리 (이 문서) |
| `docs/UI_GUIDE.md` | 어떻게 보이는가 | 디자인 토큰, 상태 표기, 문구 규칙, 접근성 |
| `docs/GOTCHAS.md` | 무엇을 하면 안 되는가 | 실수하기 쉬운 지점, 쓸 수 있는 표현과 금지 표현 대조 |
| `docs/GLOSSARY.md` | 이 단어가 무슨 뜻인가 | 용어 정의 |
| `docs/TEST_PLAN.md` | 무엇으로 확인하는가 | 인수 기준, 검증 절차, 테스트 계층 |
| `docs/ADR.md` | 왜 그렇게 정했는가 | 되돌리기 어려운 결정의 기록과 기각한 대안 |

작업별로는 다음 순서로 본다.

- 화면 변경: `PRD.md` 4장 → `UI_GUIDE.md` → 이 파일
- 도메인 로직 변경: `PRD.md` 2장 → `ARCHITECTURE.md` → `GOTCHAS.md`
- 테스트 추가: `TEST_PLAN.md`
- 하네스 작업 방식·Phase·권한·실패 기록: `HARNESS/README.md`, `HARNESS/phases/`, `HARNESS/gates.md`, `HARNESS/FAILURE_RECORDS.md`
