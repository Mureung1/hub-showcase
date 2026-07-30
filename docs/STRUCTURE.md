# 프로젝트 구조

najoong(나중)의 폴더·파일 구성 안내. 데이터 흐름과 분류 파이프라인의 상세는
[ARCHITECTURE.md](./ARCHITECTURE.md)를 참고.

## 전체 트리

```
najoong/
├── app/                  # Next.js App Router (페이지·API 라우트)
│   ├── layout.js         #   루트 레이아웃 — 폰트(Pretendard), 메타데이터
│   ├── page.js           #   메인 화면 오케스트레이터 — 상태·이벤트 핸들러의 중심
│   ├── globals.css       #   전역 스타일 (웜 클레이 팔레트 CSS 변수 포함)
│   └── api/parse/route.js#   URL 파싱 API — OG 메타 추출 + 형식·주제 분류 (서버 전용)
├── components/           # UI 컴포넌트 (PascalCase.jsx)
├── lib/                  # 순수 로직·데이터 계층 (camelCase.js)
├── public/               # 정적 파일
├── supabase/schema.sql   # DB 스키마 (테이블·RLS 정책) — 대시보드 SQL Editor에서 실행
├── docs/                 # 문서·발표자료
├── showcase/             # 과제 제출용 소개 자료 (스크린샷·메타)
└── .claude/skills/       # Claude Code용 디자인 가이드 스킬
```

## app/ — 라우팅과 화면 조립

| 파일 | 역할 |
|---|---|
| `layout.js` | 루트 레이아웃. Pretendard 폰트 로드, `<html lang="ko">`, 메타데이터 |
| `page.js` | 유일한 페이지. 링크·카테고리 상태, 게스트/로그인 분기, 저장·삭제·이동 핸들러를 모두 쥐고 하위 컴포넌트에 내려준다 |
| `api/parse/route.js` | `POST /api/parse`. 대상 URL을 fetch해 OG 메타를 뽑고, `lib/classify`(형식)와 `lib/classifyTopic`(주제, LLM)을 호출해 분류 결과까지 돌려준다. `GEMINI_API_KEY`는 여기(서버)에서만 쓰인다 |

## components/ — UI 컴포넌트

모두 `page.js`(또는 서로)에서 조립되는 프레젠테이션 계층. 데이터 접근은
props/콜백으로만 하고 직접 DB를 만지지 않는다.

| 파일 | 역할 |
|---|---|
| `HomeView.jsx` | 홈 화면 — URL 입력(DrawerInput)과 저장 진행 상태 |
| `DrawerInput.jsx` | 서랍 모양 URL 입력창 + 손잡이형 저장 버튼 (SVG 일러스트) |
| `FeedView.jsx` | 카테고리별 링크 피드 — 검색·목록 |
| `LinkCard.jsx` | 링크 한 장 카드 — 썸네일, 제목, 시간, 삭제·이동 메뉴 |
| `DomainThumb.jsx` | 썸네일 대체 표시 — 이미지 없는 링크에 도메인 첫 글자 |
| `Sidebar.jsx` | 데스크톱 사이드바 — 카테고리 트리 탐색·추가·이름변경·삭제 |
| `MobileHeader.jsx` | 모바일 상단 바 + 카테고리 드로어 (탐색·편집) |
| `MobileTabBar.jsx` | 모바일 하단 탭바 — 대분류 간 빠른 이동 |
| `DrawerLogin.jsx` | 서랍 애니메이션 로그인 모달 — 이메일/Google OAuth |
| `AuthModal.jsx` | (구버전) 이전 로그인 모달 — 현재 어디서도 사용되지 않음 |

## lib/ — 로직·데이터 계층

| 파일 | 역할 | 실행 위치 |
|---|---|---|
| `supabase.js` | Supabase 클라이언트 생성 (env 미설정이면 `null` → 게스트 모드) | 클라이언트 |
| `db.js` | Supabase CRUD — 링크·카테고리. 로그인 사용자 전용 | 클라이언트 |
| `storage.js` | 비회원 저장소(localStorage) + 게스트 한도(`GUEST_LIMIT`) | 클라이언트 |
| `categories.js` | 카테고리 트리 유틸 — buildTree, 탐색, `FALLBACK_TOPIC`("기타") | 공용 |
| `classify.js` | 형식(영상·글·상품…) 판정 — og:type과 도메인 규칙 기반 | 서버 |
| `classifyTopic.js` | 주제(대분류·세부주제) 판정 — Gemini LLM 호출, 실패 시 "기타" 폴백 | 서버 전용 |
| `domainRules.js` | 도메인 → 대분류 시드 매핑 (youtube→영상 등) | 서버 |
| `format.js` | 표시용 포맷 유틸 — `timeAgo` (상대 시간) | 클라이언트 |

## 데이터 저장 위치

- **로그인 사용자**: Supabase (`links`, `categories` 테이블, RLS로 본인 데이터만).
  스키마는 `supabase/schema.sql` — 마이그레이션 도구 없이 대시보드에서 직접 실행한다.
- **비회원(게스트)**: localStorage (`najoong:links`, `najoong:categories`).
  로그인하면 `page.js`가 게스트 데이터를 Supabase로 이관 후 정리한다.

## 설정 파일

| 파일 | 역할 |
|---|---|
| `jsconfig.json` | `@/` 경로 별칭 (`@/lib/db` → `lib/db.js`) |
| `next.config.mjs` | Next.js 설정 |
| `eslint.config.mjs`, `postcss.config.mjs` | 린트·PostCSS(Tailwind) 설정 |
| `.env.local` | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `GEMINI_API_KEY` — git 미추적 |

## 문서

- `README.md` — 프로젝트 소개·실행 방법
- `SETUP.md` — Supabase 등 환경 설정 절차
- `docs/ARCHITECTURE.md` — 분류 파이프라인·데이터 흐름 상세
- `CLAUDE.md`, `AGENTS.md`, `.claude/skills/` — AI 도구용 작업 가이드
