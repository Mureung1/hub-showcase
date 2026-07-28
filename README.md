# 리뷰지기

> 배달 매장 사장님을 위한 AI 리뷰 관리 서비스 — 기획, 프로토타입, 개발 하네스

리뷰지기는 사장님이 고객 리뷰를 빠르게 분류하고, 매장 말투가 반영된 답글 초안을 확인하며, 악성 리뷰에는 단계별 대응 절차를 확인할 수 있도록 돕는 서비스입니다.

## 현재 상태

| 영역 | 상태 |
|---|---|
| 기획 문서 | 완료 — `docs/` 8종. 제품 기준은 [PRD](docs/PRD.md) |
| HTML·CSS 프로토타입 | 완료 — 화면 7종과 핵심 흐름 검증 |
| Phase 계획·사양 | 완료 — Phase 00~07 계획과 각 Phase의 작업 지시서 |
| 실제 구현 (React + Supabase) | 로컬 실행 브랜치에 존재 — Phase 00~06 실행 완료 |
| AI 연결 | **미완료** — 분류·답글·위험도가 아직 규칙 기반으로 동작합니다 (Phase 07 대상) |

**이 원격 저장소에는 문서(md)와 프로토타입만 있습니다.** 제품 코드와 하네스 실행 기록은 푸시하지 않는 로컬 브랜치에서 관리합니다([AGENTS.md](AGENTS.md) 규칙 11·14). 그래서 이 브랜치의 커밋 이력만으로는 구현 진행 상태를 알 수 없습니다 — 진행 상황은 [LOG.md](LOG.md)와 [TODO.md](TODO.md)에 기록합니다.

Edge Function은 만들어져 있지만 화면이 아직 호출하지 않습니다. **AI가 실제로 붙기 전까지 이 프로젝트를 "AI 에이전트"로 소개하지 않습니다.**

## 해결하려는 문제

- 영업 중 쌓이는 리뷰에 일일이 답글을 작성하기 어렵습니다.
- 여러 리뷰에서 반복되는 불만과 개선점을 직접 찾기 어렵습니다.
- 협박·환불 강요·허위 사실이 포함된 리뷰에 어떻게 대응해야 할지 판단하기 어렵습니다.

## 핵심 기능

1. **리뷰 유형 분류** ([PRD 2.1](docs/PRD.md)) — 칭찬·불만·문의·악성 의심으로 분류하고 근거를 보여줍니다.
2. **톤앤매너(매장 프로필)** ([PRD 2.2](docs/PRD.md)) — 답글 말투, 운영 정보, 이벤트와 금지 표현을 설정합니다.
3. **답글 초안 생성** ([PRD 2.3](docs/PRD.md)) — 매장 말투와 운영 정보를 반영한 수정 가능한 초안을 제공합니다.
4. **리뷰 분석** ([PRD 2.4](docs/PRD.md)) — 손님 반응, 별점 추이, 주요 키워드와 개선 인사이트를 보여줍니다.
5. **블랙컨슈머 대응** ([PRD 2.5](docs/PRD.md)) — 위험도 판단, 신고 절차, 증거 수집, 법적 대응 일반 정보를 안내합니다.

이메일 계정으로 로그인해 사용하며, 리뷰·답글·사건 기록은 매장 소유권 단위로 격리됩니다([PRD 2.6](docs/PRD.md)). 리뷰는 직접 입력하고, 완성된 답글을 복사해 사장님이 직접 게시합니다. **플랫폼 자동 수집과 자동 게시는 만들지 않습니다.**

## 프로토타입 확인

별도의 설치나 서버 실행 없이 [`prototype/index.html`](prototype/index.html)을 브라우저로 열면 됩니다.

권장 검토 흐름:

```text
리뷰 입력 → 리뷰함 → AI 답글 확인·수정 → 답글 복사 → 완료 표시
                                └→ 악성 의심 시 대응 센터
```

프로토타입 화면:

| 화면 | 확인할 내용 |
|---|---|
| [홈](prototype/index.html#home) | 오늘의 리뷰 현황과 우선 처리 목록 |
| [리뷰함](prototype/index.html#inbox) | 유형·답글 상태별 리뷰 목록 |
| [리뷰 상세·답글](prototype/index.html#detail) | 분류 근거, 답글 수정·복사, 완료 처리 |
| [리뷰 입력](prototype/index.html#input) | 단건 입력과 여러 리뷰 붙여넣기 |
| [분석 리포트](prototype/index.html#report) | 손님 반응, 별점 추이, 키워드와 인사이트 |
| [블랙컨슈머 대응](prototype/index.html#response) | 위험도와 단계별 대응 체크리스트 |
| [매장 설정](prototype/index.html#settings) | 매장 정보, 답글 말투와 금지 표현 |

입력, 복사, 저장과 AI 분석은 제품 동작을 설명하기 위한 시각적 시연입니다. 화면 전환은 URL 해시와 CSS `:target`을 이용합니다.

## 기술

생산 스택은 [ADR-0002](docs/ADR.md)로 확정했습니다.

| 계층 | 스택 |
|---|---|
| 프론트엔드 | React + TypeScript + Vite |
| 백엔드 | Supabase — Postgres(RLS), Auth(이메일), Storage, Edge Functions |
| 실행 환경 | 로컬 Supabase (supabase CLI + Docker). 클라우드 프로젝트는 쓰지 않습니다 |
| AI 호출 | Edge Functions에서만. API 키는 브라우저 번들에 넣지 않습니다 |
| 테스트 | Vitest — 결정적 규칙은 순수 TS 모듈로 분리해 LLM·DB 없이 검증 |

LLM 공급자는 아직 확정하지 않았습니다. `LLM_PROVIDER`로 주입하며, `fake` 모드로 네트워크 없이 전체 흐름을 돌릴 수 있습니다.

프로토타입은 별도 스택입니다 — HTML5 + CSS3, 외부 라이브러리·JavaScript·CDN 없이 반응형 레이아웃만 사용합니다.

## 범위

**만드는 것**: 계정·매장 격리, 리뷰 수동 입력, 유형 분류, 답글 초안, 기본 분석, 악성 리뷰 대응.

**만들지 않는 것** — 만드는 것만큼 경계를 결정합니다. 요청이 들어와도 [PRD 7장](docs/PRD.md)을 먼저 고쳐 합의한 뒤에 다룹니다.

| 구분 | 제외 항목 |
|---|---|
| 7.1 플랫폼 연동 | 리뷰 자동 수집, 자동 답글 게시, 답글 자동화 수준 설정, 플랫폼 자격증명 보관, 채널별 어댑터 |
| 7.2 AI 실행 | 로컬 모델 운영, 사용자별 모델 학습·미세조정 |
| 7.3 알림과 테마 | 정기 리포트 발송, 챗봇 알림, 매장 장르별 색상 테마 |
| 7.4 법률·신고 자동화 | 개별 사안의 법률 판단, 자동 신고 접수, 자동 보상·환불 제안 |
| 7.5 데이터 확장 | 매출·POS 연동, 경쟁 매장 분석, 리뷰 작성자 신원 조회 |
| 7.6 계정과 클라이언트 | 한 계정에 여러 매장, 직원 계정·권한 분리, 네이티브 앱, 다국어 |

리뷰를 사장님이 직접 입력하므로 채널에는 매이지 않습니다 — 배민이든 네이버든 같은 방식으로 처리합니다.

## 저장소 구조

```text
.
├── README.md            # 이 문서
├── AGENTS.md            # 모든 AI 에이전트 공통 규칙 (CLAUDE.md가 import)
├── docs/                # 제품 기준 문서 8종
├── HARNESS/             # 기능 단위 Phase 실행·검증 하네스
├── prototype/           # HTML·CSS 프로토타입 (index.html, styles.css)
├── showcase/            # 외부 제출용 프로젝트 소개 (showcase.json)
├── LOG.md               # 작업 로그 — 무엇을 왜 했는가
└── TODO.md              # 다음 작업
```

## 문서

읽는 순서는 [PRD](docs/PRD.md) → [ARCHITECTURE](docs/ARCHITECTURE.md) → [CODE_MAP](docs/CODE_MAP.md) → [HARNESS/README](HARNESS/README.md)입니다. 각 문서는 역할이 하나씩이고 서로의 내용을 다시 쓰지 않습니다.

| 문서 | 역할 |
|---|---|
| [PRD.md](docs/PRD.md) | 제품 기준 — 무엇을 만들고 무엇을 만들지 않는가. 충돌하면 이 문서가 우선입니다 |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | 계층 경계와 데이터 흐름 — 왜 이 구조인가 |
| [ADR.md](docs/ADR.md) | 되돌리기 어려운 결정과 기각한 대안 — 왜 그렇게 정했는가 |
| [CODE_MAP.md](docs/CODE_MAP.md) | 파일이 실제로 어디 있는가 |
| [UI_GUIDE.md](docs/UI_GUIDE.md) | 화면 표현 규칙 — 디자인 토큰, 상태 표기, 문구, 접근성 |
| [GOTCHAS.md](docs/GOTCHAS.md) | 실수하기 쉬운 지점과 쓰면 안 되는 표현 |
| [GLOSSARY.md](docs/GLOSSARY.md) | 문서와 코드가 같은 단어를 같은 뜻으로 쓰게 고정 |
| [TEST_PLAN.md](docs/TEST_PLAN.md) | 제품을 무엇으로 확인하는가 — 인수 기준, 검증 절차, 테스트 계층 |

## 개발 하네스

PRD의 핵심 기능을 기능 단위 Phase로 구현·검증하는 로컬 하네스를 사용합니다. **기능 1개 = Phase 1개**이고, Phase 6은 기능이 아니라 전체를 통합 검증하는 관문입니다.

```text
00 공통 기반 → 01~05 핵심 기능 5개 → 06 통합 검증 → 07 LLM 배선 → 06 재검증
```

Phase 06은 통과했지만 `LLM_PROVIDER=fake` 기준이라 AI 배선이 없는 상태를 통과시켰습니다. 그래서 Phase 07(LLM 배선)을 추가했고, **07이 제품 코드를 고치는 순간 기존 검증 증거는 무효**이므로 06을 다시 통과시켜야 완료입니다. 검증 증거는 통과 시점의 코드에 대해서만 유효하다는 규칙을 [PHASE_PLAN.md](HARNESS/phases/PHASE_PLAN.md)에 두었습니다.

사용법과 원칙은 [`HARNESS/README.md`](HARNESS/README.md), Phase 계획은 [`HARNESS/phases/PHASE_PLAN.md`](HARNESS/phases/PHASE_PLAN.md)를 참고하세요.

## 백로그

[Notion 백로그](https://app.notion.com/p/399d28ed51d280ddaf7afdd8ccae7a30?v=399d28ed51d280bdb26a000cfa731372&source=copy_link)
