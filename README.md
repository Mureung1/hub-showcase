# 유닉스 & Git 명령어 사전

CS 실습을 듣는 대학생이 유닉스/git 명령어를 몰라 헤매는 문제를 해결하기 위한 검색형 명령어 사전입니다. 핵심 기능(명령어 검색/조회)은 순수 프론트엔드로 동작하며, 명령어 데이터는 정적 JS 배열에 저장되어 있습니다. AI 챗봇 등 확장 기능을 위한 백엔드(Node.js/Express)와 DB(Supabase)는 `server/`에 뼈대만 구성된 상태입니다.

우분투 터미널을 흉내 낸 화면(터미널 창 프레임, 컬러 프롬프트, 깜빡이는 커서) 안에서 카테고리를 고르고, 명령어를 검색하고, 클릭해서 상세 설명을 보는 흐름으로 동작합니다.

## 주요 기능

- **카테고리별 명령어 목록**: Unix / Git 두 카테고리로 나눠서 진입
- **실시간 검색**: 이름·요약·설명을 대상으로 입력 즉시 필터링, 매칭 없으면 `command not found` 스타일 에러 표시
- **명령어 상세 보기**: 클릭한 명령어의 설명, 주요 옵션, 터미널 실행 예시를 확인
- **터미널 콘솔 UI**: 우분투 터미널을 흉내 낸 창 프레임, 컬러 프롬프트(`user@host:~$`), 깜빡이는 커서 연출

## 화면 흐름

```
/                → 카테고리 선택 (Unix / Git)
/unix, /git      → 검색창만 표시 → 입력 즉시 실시간 필터링
                   → 매칭 있으면 결과 목록, 없으면 "command not found" 에러
/commands/:id    → 명령어 상세 (설명 + 주요 옵션 + 터미널 예시)
```

## 기술 스택

| 영역 | 사용 기술 | 상태 | 비고 |
| --- | --- | --- | --- |
| 프레임워크 | React 19 | 적용됨 | 함수형 컴포넌트 + Hooks (`useState`, `useMemo`)만 사용 |
| 빌드 도구 | Vite | 적용됨 | 개발 서버(HMR) 및 프로덕션 빌드 |
| 라우팅 | react-router-dom v7 | 적용됨 | `BrowserRouter` + 레이아웃 라우트(`Outlet`)로 화면 전환 |
| 스타일 | Plain CSS (`src/index.css`) | 적용됨 | 별도 UI 라이브러리·CSS 프레임워크 없이 CSS 변수로 팔레트 관리 |
| 데이터(핵심 기능) | 정적 JS 배열 (`src/data/commands.js`) | 적용됨 | 명령어 검색/조회는 여전히 BE/DB 없이 동작 |
| 상태 관리 | React 로컬 상태 | 적용됨 | 전역 상태 관리 라이브러리 없음 (컴포넌트 범위로 충분) |
| 백엔드 | Node.js + Express (`server/`) | 뼈대만 구성 | 확장 기능(AI 챗봇 등)용, 자세한 내용은 `CLAUDE.md` 참고 |
| DB | Supabase (Postgres) | 예정 | 아직 미연동 |

## 시작하기

```bash
npm install
npm run dev      # 개발 서버 실행
npm run build    # 프로덕션 빌드
npm run lint     # eslint 검사
```

## 프로젝트 구조

```
src/
├── App.jsx                        # 라우터 설정
├── data/commands.js                # 명령어 데이터 (유닉스/git)
├── components/
│   ├── TerminalFrame.jsx           # 터미널 창 레이아웃 (Outlet)
│   └── CommandCard.jsx             # 목록 카드
└── pages/
    ├── CategoryHomePage.jsx        # 카테고리 선택 화면
    ├── CommandListPage.jsx         # 검색 + 결과 목록 화면
    └── CommandDetailPage.jsx       # 명령어 상세 화면
```

## 명령어 데이터 구조

`src/data/commands.js`의 각 항목은 아래 형태를 따릅니다.

```js
{
  id: 'unix-grep',            // URL에 그대로 쓰이는 고유 id
  category: 'unix',           // 'unix' | 'git'
  name: 'grep',
  summary: '한 줄 요약',
  description: '자세한 설명',
  options: [{ flag: '-i', desc: '옵션 설명' }],
  examples: [{ command: '실행 예시', desc: '예시 설명' }],
}
```

## 향후 확장 아이디어 (미확정)

- 명령어별 중요도 표시 (가로 막대)
- "과제 제출하기" 같은 상황별 명령어 묶음
- AI 챗봇을 통한 명령어 질의응답

## 개발 문서

- [기획서](docs/plan.md) · [작업 체크리스트(완료 이력)](docs/checklist.md) · [Task 관리(백로그/로드맵)](docs/tasks.md)
- [디자인 시스템](docs/design-system/DESIGN.md)
