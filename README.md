# hub

읽은 책과 생각을 나만의 서재에 쌓고, 마지막 책갈피에서 다음 독서를 다시 시작하게 돕는 PC 웹 서비스입니다.

## 프로젝트 방향

- 책을 읽고 싶지만, 매번 어디부터 다시 읽을지 망설여 독서를 미루는 대학생을 위한 서비스입니다.
- 사용자가 책 한 권의 마지막 책갈피, 짧은 감상, 읽은 페이지를 확인하고 바로 이어 읽게 만드는 데 집중합니다.
- 타이머로 집중을 감시하거나 증명하지 않습니다. 타이머는 독서 시작을 돕는 선택적 보조 도구입니다.

## 핵심 컨셉

- 사용자는 읽고 있는 책을 내 책장에 등록합니다.
- 책을 열면 지난번 마지막 페이지와 세션별 짧은 기록 페이지를 확인할 수 있습니다.
- 이번에 읽은 페이지와 감상을 남기면, 다음 시작 페이지가 갱신되고 책이 다시 책장에 쌓입니다.
- 완독하면 책의 마지막 서평 페이지가 열리고, 그동안의 세션 기록을 한 권의 독서 노트로 돌아볼 수 있습니다.
- 세션 기록에는 감상과 함께 도움이 된 글귀를 선택적으로 남길 수 있습니다.
- 책장 오른쪽의 글귀 배너가 저장된 문장 하나를 다시 보여주고, 해당 책을 바로 펼쳐 독서를 재개하게 합니다.
- 기존의 신뢰도 점수 대신 `읽기 기록 달력`과 개인의 `독서 발자취`를 다룹니다. 경쟁이나 출석 평가가 아니라 다시 독서로 돌아온 리듬을 보여 주는 정보입니다.

## 핵심 루프

```text
책을 책장에 등록한다
-> 지난 책갈피에서 책을 다시 연다
-> 필요하면 타이머를 켜고 읽는다
-> 읽은 페이지와 도움이 된 글귀를 남긴다
-> 다음 방문에 글귀를 보고 책을 다시 펼친다
-> 다음 페이지부터 다시 읽는다
```

세션 기록은 자동으로 정해진 시작 위치와 사용자가 입력한 `끝난 페이지`, 선택적인 `짧은 감상`과 `도움이 된 글귀`로 구성됩니다. 글귀는 기록과 함께 저장할 수 있지만 독립된 데이터로 남아 기록을 지워도 유지됩니다. 한 권의 책에 세션 기록 페이지가 쌓이고, 긴 서평은 완독 뒤 마지막 페이지에서 남깁니다.

## 데이터 흐름과 아키텍처

현재 구현을 기준으로 한 전체 구조입니다. 실선은 사용자의 요청과 영구 데이터 흐름, 점선은 브라우저 안에만 남는 임시 데이터 흐름입니다.

```mermaid
flowchart LR
    user([사용자])

    subgraph browser["브라우저 · React / Vite"]
        screens["온보딩 → 책장 → 책 상세<br/>책 등록 · 세션 기록"]
        app["App 상태 · api.js"]
        auth[("HttpOnly 세션 쿠키<br/>Google 로그인")]
        timer[("sessionStorage<br/>진행 중인 타이머")]

        screens <--> app
        app <--> auth
        screens -. "타이머 저장 · 복원" .-> timer
        timer -. "종료한 독서 시간" .-> app
    end

    subgraph server["Spring Boot API"]
        controllers["REST Controllers<br/>auth · books · records · quotes"]
        services["AuthService · BookService<br/>ReadingRecordService · QuoteService"]
        jpa["Spring Data JPA"]
        metadata["GoogleBooksClient"]

        controllers --> services
        services --> jpa
        services --> metadata
    end

    subgraph database["MySQL"]
        users[("users")]
        books[("books")]
        records[("reading_records")]
        quotes[("quotes · quote_exposures")]

        users -->|"1 : N"| books
        users -->|"1 : N"| records
        books -->|"1 : N"| records
        books -->|"1 : N"| quotes
    end

    google["Google Books API"]
    flyway["Flyway migrations"]

    user --> screens
    app <-->|"HTTP JSON · 사용자/책/기록 CRUD"| controllers
    jpa <--> users
    jpa <--> books
    jpa <--> records
    jpa <--> quotes
    metadata <-->|"도서 검색 · 판본 메타데이터"| google
    flyway -->|"스키마 생성 · 변경"| database
```

사용자는 Google 로그인 뒤 React의 책장, 책 상세와 기록 흐름을 이용합니다. 클라이언트의 모든 요청은 `api.js`를 거치며, 서버가 HttpSession에서 사용자를 식별하고 CSRF 토큰을 검증합니다. 영구 데이터는 MySQL의 사용자·책·독서 기록·글귀·글귀 노출 테이블에 저장됩니다. 진행 중인 타이머만 브라우저 저장소에 남습니다.

### 확인하며 발견한 다음 작업

| 발견 | 현재 영향 | 다음 작업 |
| --- | --- | --- |
| 책장 조회가 사용자 한 명의 독서 기록을 한 번에 읽습니다. | N+1은 없지만 기록량이 매우 커지면 응답 시간이 늘 수 있습니다. | 실제 p95나 사용자별 기록량이 기준을 넘을 때 DB 집계 projection으로 바꿉니다. |
| 책 상세 화면이 URL이 아닌 React 상태로만 열립니다. | 새로고침, 브라우저 뒤로 가기, 상세 링크 공유로 같은 화면을 복원할 수 없습니다. | 상세 링크가 필요해질 때 `/books/:bookId` 경로를 화면 상태의 기준으로 만듭니다. |

## 현재 우선순위

- 현재 수직 슬라이스는 `Google 로그인 → 책 등록 → 글귀 저장 → 글귀 배너 → 책 펼치기 → 독서 기록 완료`입니다.
- 책의 위치·꺼내기·펼치기만 3D로 표현하고, 글귀 배너와 책 상세·입력은 DOM으로 유지하는 페이지 통합 구조를 구현했습니다.
- Google 로그인, 완독·보관, 최신 기록 정정, 선택적 타이머와 최근 12주 읽기 기록 달력까지 서버 데이터로 연결했습니다.
- 로컬 전체 수동 QA와 키보드·dialog 접근성 점검을 완료했습니다.
- 다음 단계는 배포 환경 smoke test와 디버깅용으로 늘려 둔 3D 전환 시간·시각 완성도 조정입니다.
- OCR, 생각 태그, 독서 발자취와 알림은 글귀 기반 재개 가설이 확인된 뒤 검토합니다.

## 계획 문서

- 이번 주 실행 작업은 [Week 2 Issue Board](https://github.com/Tapha-K/hub/issues)에서 관리합니다.
- 상위 로드맵과 단계별 우선순위는 [프로젝트 Wiki](https://github.com/Tapha-K/hub/wiki)에서 관리합니다.
- 남은 3주 MVP 실행 계획은 [Sprint Backlog](https://github.com/Tapha-K/hub/wiki/Sprint-Backlog)의 Week 2~4 작업을 기준으로 합니다.
- 장기 제품 백로그는 [Product Backlog](https://github.com/Tapha-K/hub/wiki/Product-Backlog)에서 관리합니다.
- 프론트엔드 로드맵은 [Frontend Priority Roadmap](https://github.com/Tapha-K/hub/wiki/Frontend-Priority-Roadmap)을 기준으로 합니다.
- 백엔드 로드맵은 [Backend Priority Roadmap](https://github.com/Tapha-K/hub/wiki/Backend-Priority-Roadmap)을 기준으로 합니다.
- 코드와 함께 유지해야 하는 MVP 구현 상세 문서는 이 저장소에 남깁니다.

## 구현 문서

- [Current Implementation Status](docs/current-implementation-status.md): 머지된 기능, 현재 API·컴포넌트·3D 경계와 남은 검증을 한곳에 정리합니다.
- [Local QA and Demo Runbook](docs/local-qa-and-demo.md): Google 로그인부터 글귀 기반 독서 재개까지 로컬 실행, 통합 QA와 1분 시연 절차를 정리합니다.
- [AI Collaboration Workflow](AI_WORKFLOW.md): 3주간의 작업 순서, 사용한 Skill·Agent 역할, 발표 진행안을 정리합니다.
- [Product PRD](client/docs/product-prd.md): Wiki P0/P1 범위를 PC 웹 MVP 요구사항으로 구체화합니다.
- [Frontend User Flow](client/docs/user-flow.md): MVP 화면 단계와 사용자 흐름을 정리합니다.
- [Click Unit UI Specification](client/docs/click-unit-ui-spec.md): 화면별 클릭, 모달, 상태 변화를 클릭 단위로 정의합니다.
- [Component Implementation Notes](client/docs/component-implementation-notes.md): 컴포넌트별 책임, props/state, handler, 표시 조건을 정리합니다.
- [P0 API Contract](client/docs/p0-api-contract.md): 초기 계약과 이후 인증 전환의 차이를 보존합니다. 현재 공개 API는 Current Implementation Status를 따릅니다.
- [Architecture Decisions](client/docs/architecture-decisions.md): 인증, 세션, 글귀 독립성, 노출 측정, 조회 성능과 3D 경계를 정리합니다.
- [Frontend Implementation Notes](client/docs/frontend-implementation-notes.md): 프런트 구현 중 만난 문제의 증상, 원인, 수정과 검증을 누적합니다.
- [Server Implementation Notes](server/docs/server-implementation-notes.md): 서버 구현 중 만난 인증·데이터·성능 문제와 해결 과정을 누적합니다.
- [Reading Bookshelf Expert Brainstorm](client/docs/archive/reading-bookshelf-expert-brainstorm.md): 디자이너와 프론트엔드 관점의 새 콘셉트 브레인스토밍 기록입니다.
- [Reading Bookshelf User Review](client/docs/archive/reading-bookshelf-user-review.md): 첫 방문·재방문 사용자 관점 검토와 범위 합의 기록입니다.
- [Docs Archive](client/docs/archive): 토론 기록과 UX 검토처럼 구현 기준은 아니지만 의사결정 근거로 보관할 문서를 둡니다.
