# CLAUDE.md

## 프로젝트 개요

대학생의 전공·경험을 바탕으로 링커리어의 신입 공채/인턴/대외활동/공모전 공고를 추천하고, 선택한 공고에 맞는 자기소개서 초안을 작성해주는 Agent 서비스.

**문제 정의**: 대학생은 신입 공채·공모전·대외활동·인턴십 공고 중 자신에게 맞는 것을 고르기 어렵고, 자기소개서 문항에 맞춰 자기 경험을 정리해 쓰는 데도 어려움을 겪는다.

**핵심 기능 2가지**
1. 사용자 정보(전공, 부전공, 학점, 자격증, 그 외 경험) 기반 맞춤 공고 추천 — 추천 이유와 주요 조건을 함께 제공.
2. 선택한 공고의 자소서 문항을 분석해, 사용자 경험을 반영한 문항별 초안 생성.

전체 기획서는 [docs/plan.md](docs/plan.md) 참고.

## 화면 구성 (IA)

사용자 흐름은 4개 화면으로 이어진다 (자세한 UI 요소·동작은 [docs/wireframe.md](docs/wireframe.md) 참고):

1. **정보 입력** — 대학교/학년/전공/취득학점/평균평점 필수, 복수전공/부전공 선택, 자격증 복수 입력(선택), 기타 경험(현장실습/인턴/교육) 자유 입력(선택).
2. **추천 공고 목록** — 입력 정보 기반 추천 카드 리스트(제목/기관/마감일 + 추천 이유 요약).
3. **공고 상세** — 추천 이유, 주요 조건 확인 후 "자소서 초안 생성" 진입.
4. **자기소개서 초안** — 문항별 분석 결과 + 생성된 초안, 편집·저장 가능.

## 현재 단계

디자인 시스템은 확정됐고([docs/design-system.md](docs/design-system.md)), React 구현이 시작됐다.
- `src/App.jsx`는 정보입력→추천목록→공고상세→자소서초안 4개 화면을 전환하는 스위처다([docs/checklist.md](docs/checklist.md) T4/T7/T8). 4개 화면 전부 실제 백엔드에 연결됐다: 정보입력~공고상세는 `POST /api/profiles`(T6/T7/T8), 자소서 초안은 `POST /api/postings/:id/draft`(T9~T11) — 문항 분석·초안 생성 모두 실제 데이터로 동작한다.
- 새 화면을 만들 때는 반드시 [docs/design-skill.md](docs/design-skill.md)의 원칙과 [docs/variables.css](docs/variables.css)의 토큰을 따른다. 임의로 색상·폰트 크기·간격 값을 새로 만들지 않는다. 이 판단 기준은 Claude Code 스킬([.claude/skills/design-review](.claude/skills/design-review/SKILL.md))로도 등록되어 있어, 화면/스타일 작업 시 자동으로 참고된다. 테스트 작성 시에는 [.claude/skills/test-writer](.claude/skills/test-writer/SKILL.md) 스킬을 따른다(백엔드 vitest 단위테스트 + 프론트 Playwright E2E 패턴).
- 백엔드/AI 연동 스택 방향은 정해졌다(아래 `백엔드 방향` 참고). 실제 `backend/` 스캐폴딩과 구현은 2주차([docs/checklist.md](docs/checklist.md) T1~T2)에 진행.
- 공고 데이터는 실제 크롤링이 아니라 샘플/목업 데이터로 시작하며, `backend/data/postings.json` 파일로 관리한다(T3). 2주차 미션의 "crud/supabase" 요구사항은 **사용자 입력(프로필)**을 Supabase `profiles` 테이블에 저장·조회하는 것으로 충족한다(T2-b, T6) — 공고 데이터 자체는 Supabase로 옮기지 않는다.

4주 작업분해와 체크 현황(T1~T16)은 [docs/checklist.md](docs/checklist.md)를 항상 최신 기준으로 참고할 것 — 이 파일에 진행률을 옮겨 적지 않는다(금방 stale해짐).

## 기술스택 & 명령어

Vite 8 + React 19 (JSX, 순수 CSS — 아직 별도 UI 라이브러리/상태관리 라이브러리 없음), 린트는 oxlint(`.oxlintrc.json`).

```
npm run dev       # 개발 서버
npm run build     # 프로덕션 빌드
npm run lint      # oxlint
npm run preview   # 빌드 결과 미리보기
```

## 백엔드 방향 (결정됨, 2주차부터 구현)

- **구조**: 현재 루트는 그대로 Vite 프론트엔드로 두고, 신규 `backend/` 폴더에 별도 `package.json`(Express)을 둔다. 모노레포 툴 없이 프론트/백엔드 2-패키지로 단순하게 간다.
- **백엔드**: Node.js + Express.
- **AI 연동**: Anthropic Claude API(`@anthropic-ai/sdk`) — 공고 적합도 분석, 자소서 초안 생성에 사용.
- **데이터**: 공고 목업 데이터는 `backend/data/postings.json` 파일로 관리한다(T3). Supabase는 **사용자 입력(프로필)**을 저장·조회하는 `profiles` 테이블([docs/checklist.md](docs/checklist.md) T2-b, T6) — 이걸로 2주차 미션의 CRUD 요구사항(화면→서버→DB 저장→응답)을 충족한다. 3주차에 자소서 초안 영속 저장용 `drafts` 테이블을 추가했다(`docs/data-model.md` 참고).
- **예상 라이브러리**: `express`, `cors`, `dotenv`, `@supabase/supabase-js`, 개발용 `nodemon`, `@anthropic-ai/sdk`.

## 커밋 컨벤션

Conventional Commits(`type: 영어 요약`, 예: `feat: add job recommendation form`) — `feat`/`fix`/`docs`/`refactor`/`chore` 등 사용.

## 코드 구조

- `src/main.jsx` — 엔트리 포인트.
- `src/App.jsx` — `step` state(`'input'|'list'|'detail'|'draft'`)로 4개 화면을 전환하는 스위처. 라우터 라이브러리는 쓰지 않는다.
- `src/screens/` — 화면별 컴포넌트. `InfoInput.jsx`(T4, 9개 필드+검증), `RecommendList.jsx`/`JobDetail.jsx`(T7/T8, 실제 API 연동), `DraftEditor.jsx`(T11/T12, 실제 API 연동 + 세션 로컬 저장/잠금).
- `src/api.js` — `submitProfile(profile)`, `generateDraft(postingId, profile)` fetch 래퍼(`postJson` 공통 헬퍼로 네트워크 실패 메시지 통일). `VITE_API_BASE_URL`(기본 `http://localhost:4000`)로 백엔드 호출.
- `src/App.css`, `src/index.css` — 스타일. 별도 CSS 프레임워크는 쓰지 않는다.

## docs/ 구조

- `docs/plan.md`, `docs/wireframe.md` — 원본 기획서와 화면 흐름/IA(Mermaid 다이어그램 포함). `docs/wireframe.html`을 브라우저로 열면 다이어그램을 그림으로 볼 수 있다.
- `docs/checklist.md` — 4주 작업분해 체크리스트. 새 기능을 시작하기 전에 여기서 관련 태스크(T1~T16)와 선행 조건을 확인한다.
- `docs/prototype_v2/` — 위 기획을 반영해 실제로 클릭해볼 수 있는 순수 HTML/CSS 정적 프로토타입([index.html](docs/prototype_v2/index.html) → list → detail-1~3 → draft-1~3). `docs/variables.css`를 직접 import해서 실제 디자인 토큰으로 스타일링한다 — React 구현 전에 화면 동작·디자인을 확인하고 싶을 때 참고. 이 안의 `plan.md`/`wireframe.md`는 루트 문서와 거의 동일한 최종본이다. (구버전 `docs/prototype/`은 variables.css를 쓰지 않는 임의 색상 초안이라 삭제했다.)
- `docs/design-system.md` — 색상·버튼·입력창·카드·타이포·여백 등 확정된 디자인 토큰과 스펙. 화면을 구현할 때 값의 출처로 삼는다.
- `docs/variables.css` — 위 디자인 시스템을 CSS 변수(`:root`)로 옮긴 파일. 실제 스타일링 시 여기 정의된 변수를 사용한다.
- `docs/design-skill.md` — 새 화면을 디자인/구현할 때 지켜야 할 원칙과 일관성 체크리스트. 화면을 만들고 나면 이 문서의 체크리스트로 검토한다.
- `docs/data-model.md` — Supabase `profiles` 테이블 스키마 설계(컬럼/타입/생성 SQL, camelCase↔snake_case 매핑). T2-b 실제 생성과 T6 insert 구현의 기준 문서.

## PR 워크플로우

이 저장소는 부트캠프/챌린지 형식의 PR 컨벤션을 쓴다.

- **PR 타이틀**: `[아이디_실명] - 이번 작업 한 줄 요약` (예: `[N100_윤솔빈] 주문정보 페이지 개발`).
- **PR 본문**: 주요 작업 리스트, 내가 설명할 수 있는 부분, 아직 이해 못 한 부분, 새로 알게 된 것 — [.github/pull_request_template.md](.github/pull_request_template.md) 참고.
- **자동 병합**([.github/workflows/auto-merge.yml](.github/workflows/auto-merge.yml)): 매일 정해진 시각에 열려있는 PR을 자동 스캔해 병합한다.
  - `main`을 타겟하는 PR → 자동 병합 스킵 (수동 처리 필요).
  - `review` 라벨이 붙은 PR → 스킵.
  - 최근 리뷰가 "변경 요청" 상태 → 연기.
  - 충돌 상태 → 자동으로 close.
  - 위 조건에 해당 안 하면 자동 merge.
