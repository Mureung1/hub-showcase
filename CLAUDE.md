# 팀플 올인원 (Team Project All-in-One)

> 대학생 팀 프로젝트의 시작(언제 모이지?)부터 끝(누가 뭘 얼마나 했지?)까지 하나로 잇는 웹 서비스
> "기능을 모은 게 아니라, 팀플의 실제 흐름을 따라 만든 도구."

**개발자**: 김우현 (컴공 2학년, 1인 프로젝트, 4주)
**부트캠프**: AI Agent Challenge

---

## 프로젝트 개요

### 문제 정의
대학생이 팀 프로젝트를 할 때, 언제 모일지 시간 맞추는 것부터 누가 뭘 얼마나 했는지 파악하는 것까지 흩어진 도구(when2meet, 카톡, 각자 메모)를 오가야 해서 번거롭고, 무임승차가 생겨도 잘 드러나지 않는다.

### 핵심 기능 2개

**A. 태스크 관리** (서비스의 뼈대)
- 할 일 추가, 담당자 지정(1명), 마감일, 상태(대기·진행·완료)
- 진행도 2종 표시: 팀 전체 진행도 + 내 진행도(담당자가 나인 것만)
- 담당자만 완료 처리 가능, 모든 상태 변경은 활동 로그에 기록

**B. 회의시간 매칭** (차별점)
- 프로젝트 기한 기준 실제 날짜×시간 격자에 각자 가능 시간 입력 (주 단위로 전환)
- 겹치는 인원이 많을수록 색이 진해짐
- 전원 가능한 시간을 날짜 순으로 자동 정리해 보여줌

### 확장 기능 (시간 남으면)
- 기여도 시각화 (개수 기반)
- 태스크 난이도 가중치

### 경쟁 서비스와의 차별점
- ClickUp, Notion, Monday 등 통합 협업툴은 기업용이라 무겁고, 회의 기능이 "정해진 일정 캘린더 공유" 방식
- when2meet은 시간 조율만, Trello는 태스크만
- 우리는 **격자식 회의매칭 + 태스크관리 + 대학생 특화 + 초대코드로 가볍게**

---

## 기술 스택

- **프론트엔드**: React (Vite) — `client/`, 전환 완료 (3주차)
- **백엔드**: Node.js + Express
- **DB**: **Supabase(Postgres)로 전환 완료 (3주차)**. `pg`(node-postgres)로 직접 연결(`@supabase/supabase-js` SDK가 아니라 순수 Postgres 커넥션). 접속 URL은 `.env`의 `DATABASE_URL`로 분리(커밋 금지)
- **실시간**: Socket.IO (여유 시)
- **차트**: Chart.js (기여도 시각화 시)

> **현재 상태(3주차 기준)**: `client/`(React, Vite)로 전환 완료. `prototype/` 폴더(순수 HTML/CSS/바닐라 JS)는 이제 참고용 구버전 — 화면/CSS를 React로 옮길 때 원본으로만 참조하고, 더는 직접 수정하지 않는다.
> - `tasks.html`(태스크 관리)은 `client/`의 App/TaskList/TaskItem/ProgressCard 등으로 이전 완료, 실제 API와 연동되어 동작한다.
> - `calendar-match.html`(회의시간 매칭)은 여전히 프로토타입 상태. 실제 날짜 기반 UI(드래그 선택, 겹침 히트맵, 추천)는 동작하지만 가짜 데이터이며 React 전환·백엔드/DB 연동은 아직 안 됨 — 다음 작업 대상.
> - `index.html`은 `calendar-match.html`의 구버전으로 정리 대상.
> - server는 여전히 `prototype/`을 `:3000`에서 정적 서빙하지만(레거시), 실제 개발은 `client/`(`npm run dev`, `:5173`)에서 한다.

### 개발 원칙
- **1개 만들고 → 바로 확인 → Git 저장** 반복
- 매주 끝 = 발표 가능한 상태
- 프로토타입은 완벽하게 만들지 않는다. 방향 확인용.

---

## 화면 구조

```
초대코드 진입 → 이름 선택 → 4자리 핀 (3주차 구현 예정)
  → 내 팀 목록 (홈)
      → 새 프로젝트 만들기 (제목·기한 입력 → 초대코드 생성)
      → 초대코드로 참여
  → 팀 대시보드 (중심 허브)
      → 태스크 관리 화면
      → 회의시간 매칭 화면
```

---

## 설계 결정사항 (엣지케이스)

> **공통 원칙: "진짜 삭제"보다 "보관·기록(soft delete)"**

### 팀 생성 / 방장
- 팀장 역할을 따로 부여하지 않는다. 방을 만든 사람이 자연스럽게 방장.
- 방 생성 시 제목과 기한 입력.

### 기한 처리
- 기한이 지나면 자동 삭제하지 않고 **보관(archive) 상태**로 전환.
- 실제 삭제는 방장이 직접 삭제 버튼을 눌렀을 때만.

### 초대코드 / 멀티팀 진입
- 팀 생성 시 시스템이 고유 코드 자동 생성. (원안 — 코드 자동 생성·재발급 로직은 아직 미구현)
- 방장은 재발급 가능. **재발급 시 이전 코드는 즉시 무효화.** (미구현)
- **확정·구현(3주차)**: `teams.invite_code` 컬럼 추가 완료(team 1 = `'TEAM01'`으로 수동 테스트 중). 흐름은 "초대코드 입력 → `GET /api/teams/by-code?code=XXXX`로 조회 → 있으면 그 팀 id를 `localStorage`(`teamplan_currentTeamId`)에 저장, `currentMemberId`와 동일한 방식 → 이후 모든 요청에 이 team_id를 실어 보냄"으로 확정.
  - 서버 쪽 조회 API(`teamModel.getTeamByInviteCode`, `GET /api/teams/by-code`)까지는 구현 완료.
  - **초대코드를 입력받는 화면 자체는 아직 미구현(예정)** — 지금은 `client/src/App.jsx`의 `currentTeamId`가 `1`로 임시 고정돼 있고, 여러 팀을 넘나드는 것도 아직 안 됨.

### 팀 나가기 / 삭제
- 팀원이 나가도 **활동 기록·완료한 태스크는 유지** ("나간 멤버"로 표시).
  - 이유: 무임승차 방지가 취지인데, 나가면 기록이 사라지면 증거 인멸이 가능해짐.
- 나간 사람의 미완료 담당 태스크는 "담당자 없음"으로 전환.

### 로그인 방식
- 아이디/비밀번호가 아니라 **이름 선택 방식**으로 확정. JWT/bcrypt 사용 안 함.
- "초대코드 진입 → 이름 선택 → 4자리 핀" 흐름은 아직 미구현 — 다중 팀(초대코드) 기능이 없어서 뒤로 미뤄짐.
- 3주차 현재는 헤더 우측 `UserSelect`(아바타+이름 드롭다운) 컴포넌트로 React 전환 완료. 선택한 사람은 `localStorage`(`teamplan_currentMemberId`)에 저장되고, 새로고침해도 그 사람이 실제로 지금 팀원 목록에 있는지 검증한 뒤 유지 — 2주차 `tasks.html`의 이름 선택 로직을 그대로 React state로 옮긴 것.

> **3주차에 해결함**: `server/src/currentTeamId.js`에 팀 id가 `1`로 하드코딩되어 여러 컨트롤러가 그대로 가져다 쓰던 문제를 해결하려고 "현재 팀을 요청에서 어떻게 알아낼지"를 먼저 결정 — **team_id를 요청 파라미터로 전달**하는 방식(GET은 쿼리, POST/PATCH/DELETE는 body)으로 통일했다. `availabilityController.js`가 이미 쓰던 방식을 나머지로 넓힌 것이고, 로그인 없이 memberId를 그대로 신뢰하는 것과 같은 철학이다(세션/쿠키는 도입 안 함 — 프론트/백엔드가 배포 시 다른 도메인이 될 수 있어 쿠키 설정 부담을 피함).
> `taskController`·`memberController`·`activityLogController`는 `CURRENT_TEAM_ID` import를 제거하고 `req.query.team_id`/`req.body.team_id`를 읽도록 바뀌었다(없거나 정수가 아니면 400). `server/src/currentTeamId.js`는 아직 안 지웠고, `teamController.js`의 `getCurrentTeam`만 여전히 이 값을 쓴다 — 초대코드 입장 화면이 붙으면 마지막으로 정리할 곳.
> client도 `api/tasks.js`·`members.js`·`activityLogs.js`가 전부 teamId를 받아 실어 보내도록 수정 완료(`App.jsx`의 `currentTeamId` state, 지금은 1로 임시 고정). 남은 건 이 값을 진짜 초대코드 입력으로 채우는 화면(위 "초대코드 / 멀티팀 진입" 섹션 참고, 아직 예정).

### 태스크
- 담당자는 태스크당 **1명**. 둘이 같이 할 일은 각자 항목을 따로 추가.
- **담당자 없는 태스크** 허용.
- 상태 변경(대기·진행·완료)과 **삭제**는 담당자가 있으면 **담당자 본인만** 가능, 담당자 없는 태스크는 아무나 가능.
  - 계획서 원안은 "완료 처리만 담당자 제한"이었으나, 상태 변경 전체(대기·진행·완료)와 삭제까지로 넓혀서 구현함.
  - 로그인이 없으므로 memberId를 매 요청 body/param으로 실어 보내고 서버는 그대로 신뢰 (2주차에 구현 완료)
  - **멀티팀 대비 IDOR 방지(3주차 확정·구현)**: 상태 변경·삭제·복원·제목·담당자·마감일 수정 6개 API 전부, 요청의 `team_id`와 태스크의 실제 소속 팀이 다르면 **404**로 막고(담당자 검증 403과는 다른, "존재 자체를 숨기는" 응답), 그다음에 담당자 검증(403)을 한다. 순서는 항상 팀 검증(404) → 담당자 검증(403). 다른 팀 소속인 걸 알려주면 안 된다는 OWASP IDOR 가이드를 따른 것.
- 완료↔미완료 **되돌리기는 허용**하되, 모든 변경을 활동 로그에 기록.
  - 이유: 금지하면 실수 복구 불가. 투명성(기록)으로 조작을 억제하는 게 낫다.
- 마감일은 목록에서 텍스트를 클릭하면 바로 수정/삭제(지우기)할 수 있다. 계획서 원안엔 없었지만 2주차에 추가로 구현함. 권한 규칙은 상태 변경/삭제와 동일(담당자 본인만, 없으면 누구나).
- 제목·담당자도 3주차에 같은 방식(클릭 → 인라인 편집)으로 추가 구현함. 권한 규칙 동일. `PATCH /api/tasks/:id/title`, `PATCH /api/tasks/:id/assignee`.
- soft delete된(삭제된) 태스크는 "삭제된 항목 보기" 토글로 볼 수 있고, 담당자 본인만(없으면 누구나) 복원 가능(`GET /api/tasks/archived`, `PATCH /api/tasks/:id/restore`) — 3주차에 추가 구현.
- 권한 체크 로직(`canMemberChange`)은 3주차에 TDD로 개발 — `client/src/utils/permission.js`와 `server/src/utils/permission.js`에 각각 같은 로직·같은 테스트 케이스로 존재(아래 "부트캠프 요구사항 반영" 참고). client/server가 서로 다른 런타임이라 코드를 공유할 수 없어서 파일은 두 벌, 테스트로 동일 동작을 보장.

### 기여도
- 개수 기반으로 계산 (완료한 태스크 수 + 활동 기록).
- 담당자만 완료 처리하므로 "담당자 = 완료한 사람"이 되어 귀속이 명확.

---

## 디자인 시스템

보라 계열 라이트 테마 + 다크 카드 포인트.

### 핵심 원칙
1. **보라는 아껴 쓴다.** 배경은 따뜻한 오프화이트. 보라는 버튼·강조·진행바에만.
2. **다크 카드는 포인트.** 가장 중요한 섹션 하나만. 페이지당 1~2개.
3. **라운드는 넉넉하게.** 작은 요소 9~14px, 카드 20px, 큰 카드 28px.
4. **배경은 순백이 아니다.** 매일 보는 도구라 눈이 편해야 한다.

### CSS 변수 (그대로 사용)

```css
:root {
  --color-primary: #6C5CE7;
  --color-primary-hover: #5A4BD1;
  --color-primary-light: #A29BFE;
  --color-primary-subtle: #EFECFC;

  --bg-page: #F7F5F6;
  --bg-surface: #FFFFFF;
  --bg-dark: #1A1726;
  --bg-dark-alt: #262238;

  --text-primary: #1A1726;
  --text-secondary: #5C5670;
  --text-muted: #948FA4;
  --text-on-primary: #FFFFFF;
  --text-on-dark: #FFFFFF;
  --text-on-dark-muted: #A8A3BB;

  --border-subtle: rgba(26,23,38,0.05);
  --border-default: rgba(26,23,38,0.10);
  --border-dark: rgba(255,255,255,0.07);

  --color-info: #2F80ED;
  --color-info-light: #4DA3FF;
  --color-success: #0F7A57;
  --color-success-bg: #E4F7EF;

  --font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Pretendard', 'Apple SD Gothic Neo', sans-serif;
  --font-size-body: 15px;
  --font-size-sm: 13px;
  --font-size-xs: 11px;

  --radius-sm: 9px;
  --radius-md: 14px;
  --radius-lg: 20px;
  --radius-xl: 28px;
  --radius-full: 9999px;

  --shadow-sm: 0 1px 3px rgba(26,23,38,0.03);
  --shadow-md: 0 4px 18px rgba(26,23,38,0.05);
  --shadow-lg: 0 14px 36px rgba(26,23,38,0.07);
  --shadow-primary: 0 8px 24px rgba(108,92,231,0.22);

  --transition-fast: 160ms ease;
  --transition-base: 280ms cubic-bezier(0.4,0,0.2,1);
}
```

### 색 사용 규칙
- 팀 진행도 = 보라 그라데이션 (`--color-primary` → `--color-primary-light`)
- 개인 진행도 = 파랑 그라데이션 (`--color-info` → `--color-info-light`)
- 완료 상태 = 초록 (`--color-success`)
- **빨강 금지**: 진행률·완료 표시에 절대 쓰지 않는다. 빨강은 경고/삭제/마감임박 전용.

### 히트맵 격자 (회의시간 매칭)
```css
.lv0 { background:#F2F0F4; }   /* 0명 */
.lv1 { background:#DED9FB; }   /* 1명 */
.lv2 { background:#BCB2F7; }   /* 2명 */
.lv3 { background:#9384EF; }   /* 3명 */
.lv4 { background:#6C5CE7; }   /* 전원 */
```

### 레이아웃 기본값
- 본문 최대 너비 `720px`, 가운데 정렬
- 페이지 여백 상하 `48px`, 좌우 `24px`
- 카드 간격 `12px`, 섹션 간격 `20px`

---

## Git / PR 작업 흐름

**저장소**: `jsjsbs7233/hub` (fork)
**작업 브랜치**: `N048_김우현`

### 작업 시작 전
```bash
cd ~/hub
git switch N048_김우현
git pull origin N048_김우현
```

### 커밋 (작업 단위마다, 여러 개로 나눔)
```bash
git add .
git commit -m "작업 내용 요약"
```
- **한 번에 몰아서 커밋하지 않는다.** 기능 하나 완성 → 확인 → 커밋 반복.
- 커밋 메시지는 따옴표까지 한 줄로 붙여넣기.

### push
```bash
git push origin N048_김우현
```
거부되면(`! [rejected] ... fetch first`):
```bash
git pull origin N048_김우현
git push origin N048_김우현
```

### PR 만들기
```
https://github.com/jsjsbs7233/hub/pull/new/N048_김우현
```

**⚠️ 반드시 확인**
- **base: `N048_김우현`** ← 기본값이 `main`이므로 드롭다운에서 변경 필수
- compare: `N048_김우현`
- `Able to merge` 확인

**제목 형식**: `[N048_김우현] 이번 작업을 한 문장으로 요약`

**라벨**: 오른쪽 사이드바 `Labels`에서 선택 (복수 가능)

**PR 내용 템플릿**
```markdown
## 주요 작업 리스트
## 내가 설명할 수 있는 부분
## 아직 이해 못 한 부분
## 새로 알게 된 것
```
- 동작 화면 스크린샷 포함 (드래그&드롭)

**마무리**: PR 링크(주소창 URL) 저장 → 제출 폼에 사용

### 문서 위치
- 기획서: hub 저장소 Wiki
- 엣지케이스: hub 저장소 Wiki
- README에 문서 링크 걸기 (**개인 브랜치에** 남길 것, 운영진 안내)

---

## 자주 만나는 오류

| 오류 | 원인 | 해결 |
|------|------|------|
| `error: switch 'm' requires a value` | 커밋 메시지 누락 | `git commit -m "메시지"` 전체를 한 줄로 |
| `! [rejected] ... fetch first` | GitHub에 없는 변경사항 존재 | `git pull` 먼저 하고 push |
| `pathspec 'xxx' did not match` | 그런 파일 없음 (오타) | `ls`로 파일명 확인 |
| `warning: LF will be replaced by CRLF` | 줄바꿈 방식 차이 | **무시해도 됨** |
| `git log`에서 못 빠져나옴 | 페이지 뷰어 모드 | **`q`** 키 |
| vim 편집기가 뜸 | merge 커밋 메시지 확인 | `:wq` 입력 후 Enter |
| PowerShell에서 `npm`/`vite` 실행 시 "이 시스템에서 스크립트 실행이 금지되어 있으므로..." | PowerShell 실행 정책(ExecutionPolicy)이 스크립트 실행을 막음 | PowerShell 대신 **cmd(명령 프롬프트)**에서 실행 |
| API를 고쳤는데 서버 재시작해도 계속 옛날 동작(예: 새로 만든 라우트가 404) | 3000번 포트를 예전 `node src/app.js` 프로세스가 이미 점유 중이라 새 프로세스가 안 뜨거나 옛 프로세스가 계속 응답 | `netstat -ano \| findstr :3000`으로 점유 중인 PID 확인 → 작업 관리자나 `taskkill /F /PID <번호>`로 종료 후 재시작 |
| 새로 추가한 라우트(예: `GET /api/tasks/archived`)가 계속 404 | Express는 라우트를 등록 순서대로 검사하다 첫 매치에서 멈춤 — `GET /:id`처럼 뭐든 매치하는 동적 라우트가 `/archived`보다 위에 있으면 그게 먼저 가로챔 | 고정 경로(`/archived`, `/:id/restore` 등)를 `:id` 같은 동적 라우트보다 **위에** 배치 |

---

## Claude에게 요청할 때

### 작업은 잘게 쪼개서
큰 덩어리로 요청하면 AI도 실패하고 검증도 어렵다. 화면 요소 하나 = 작업 하나 단위로.

예: "회의시간 매칭 만들어줘" (X)
→ "격자 UI만 만들어줘" → "칸 클릭 기능 추가해줘" → "겹침 색 표시해줘" (O)

### 코드 검토 요청 시
"검사해줘"보다 구체적으로:
```
이 코드를 검토만 해줘. 수정하지는 말고:
- 나중에 실제 서비스로 발전시킬 때 문제가 될 부분
- 중복되거나 정리하면 좋을 부분
- 놓친 예외 상황이나 약점
비판적으로 지적하고, 왜 문제인지 초보자도 이해하게 설명해줘.
```

### 화면 만들 때
위 디자인 시스템의 CSS 변수를 그대로 사용할 것. 색을 임의로 정하지 말 것.

## 디렉토리 구조 (3주차 기준 실제 구조)
teamplan/
├── client/                    # React (Vite) — 전환 완료
│   ├── src/
│   │   ├── components/        # 화면 부품 (Header, TaskList, TaskItem, ProgressCard, AddTaskForm, ArchivedTasks, Toast, Editable* 등). 컴포넌트 옆에 같은 이름의 .css를 둠(컴포넌트별 css)
│   │   ├── api/                # 서버 요청 코드 (axios). client.js(공통 인스턴스), tasks.js, members.js, activityLogs.js
│   │   ├── utils/               # DOM 없는 순수 함수 (date, members, tasks, storage, permission) + permission.test.js
│   │   ├── styles/             # design-system.css (CSS 변수 + 공통 리셋)
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── pages/              # (예정, 아직 없음) 로그인/팀목록 등 여러 화면이 생기면 분리
│   ├── index.html
│   └── package.json
│
├── server/                    # Express
│   ├── src/
│   │   ├── routes/            # 주소 → controller 연결 (안내)
│   │   ├── controllers/       # 요청 처리 로직 (판단)
│   │   ├── models/            # DB 다루는 코드, pg Pool 기반 (DB)
│   │   ├── utils/              # permission.js(권한 체크) + permission.test.js
│   │   ├── currentTeamId.js    # 팀 id 하드코딩(=1). teamController.getCurrentTeam만 아직 이 값을 씀(나머지 컨트롤러는 req의 team_id로 전환 완료) — 초대코드 화면 붙으면 정리 예정
│   │   ├── db.js               # pg Pool 생성 (Supabase 연결)
│   │   ├── init-db.js          # (레거시) SQLite 시절 테이블 생성 스크립트, 지금은 안 씀 — 아래 "서버 실행 순서" 참고
│   │   ├── app.js              # 서버 시작점
│   │   └── middleware/         # (예정, 아직 없음)
│   ├── db/                    # 예전 SQLite 파일(teamplan.db)이 남아있지만 이제 안 씀 — Supabase가 실제 DB
│   └── package.json
│
├── CLAUDE.md
└── README.md
폴더 역할 기억법: routes는 안내, controllers는 판단, models는 DB, middleware는 검문.

처음부터 완벽히 나누려 하지 말 것. 헷갈리면 Claude Code에게 "이 코드는 어디에 넣는 게 맞아?"라고 물어볼 것.


## 라이브러리
server
라이브러리|용도
express|서버 프레임워크
pg|DB 연결 (Supabase Postgres, node-postgres)
cors|프론트-백 통신 허용
dotenv|비밀 설정값(.env) 관리
vitest|테스트 도구 (devDependency, 권한 체크 로직 TDD용)

> `better-sqlite3`는 아직 `package.json`에 남아있지만 **더 이상 사용하지 않음** — `db.js`에서 pg로 전환하면서 이전 코드는 주석 처리만 해두고(되돌릴 때 대비) 지우진 않음. 새로 `npm install` 할 때 아래 "better-sqlite3 설치 실패 시 대응"이 여전히 뜰 수 있어서 항목은 남겨둠.
> `nodemon`은 계획엔 있었지만 실제로 설치돼 있지 않음(수동으로 `node src/app.js` 재실행 중) — 필요해지면 그때 설치.
> bcrypt, jsonwebtoken은 로그인 방식이 "이름 선택"으로 확정되면서 더 이상 필요 없어 계획에서 제외

> **Supabase 전환 완료(3주차)**: `@supabase/supabase-js`(Supabase 전용 SDK)가 아니라 **`pg`로 Postgres 연결 문자열에 직접 접속**하는 방식을 택함 — Supabase Auth/Storage 등 SDK 전용 기능은 안 쓰고 순수 DB로만 사용 중이라는 뜻. 접속 URL은 `.env`의 `DATABASE_URL`에 넣고 `.gitignore`로 커밋 방지(이미 `server/.gitignore`에 `.env` 포함돼 있음).

client
라이브러리|용도
react, react-dom|Vite가 기본 설치
axios|서버 요청 (fetch 대신 이걸로 통일)
vitest|테스트 도구 (devDependency, 권한 체크 로직 TDD용)

> react-router-dom(화면 이동), chart.js(기여도 차트)는 계획에는 있으나 아직 미설치 — 여러 화면(로그인/팀목록 등)이나 기여도 시각화를 실제로 만들 때 추가.

better-sqlite3 설치 실패 시 대응
증상: 설치할 때 gyp ERR!, node-gyp rebuild failed, MSBuild.exe ENOENT 같은 에러.
원인: better-sqlite3는 C++ 컴파일이 필요한데, 윈도우에 빌드 도구(Visual Studio Build Tools, Python)가 없으면 실패한다.

대응 순서

일단 그냥 설치 시도. Node.js LTS 버전이면 미리 컴파일된 바이너리가 있어 그냥 되는 경우가 많다.
실패하면 → Node.js 내장 SQLite 사용 검토. (최신 Node.js에 기본 내장, 설치 불필요. 다만 자료가 적음)
그래도 안 되면 → 빌드 도구 설치 (Visual Studio Build Tools + Python). 시간이 오래 걸림.

중요: 이 에러가 떠도 당황하지 말 것. 흔한 문제이고 해결책이 있다.

## 서버 / API 규칙

포트: 프론트 5173 (Vite), 백엔드 3000
API 주소: 앞에 /api 붙이기

/api/tasks — 태스크. GET(목록) · GET /archived(삭제된 태스크 목록) · POST(추가) · PATCH /:id(상태 변경) · PATCH /:id/due-date(마감일만 수정) · PATCH /:id/title(제목 수정) · PATCH /:id/assignee(담당자 수정) · PATCH /:id/restore(복원) · DELETE /:id(soft delete)
/api/teams — 팀. GET /current(현재 팀, 아직 `currentTeamId.js`의 하드코딩된 team 1 기준) · GET /by-code?code=XXXX(초대코드로 팀 조회, 3주차 신규 — `{id, name}` 반환, 코드 없으면 400/못 찾으면 404)
/api/members — 팀원 이름 목록 (이름 선택용, 로그인 아님)
/api/activity-logs — 활동 로그 조회 (태스크 제목·담당자 이름까지 JOIN해서 반환)

> **3주차 현재**: `client/`가 실제 화면이라 개발할 땐 `cd client && npm run dev`(:5173)로 접속한다. server(:3000)는 API 전용으로 쓰고, `prototype/` 정적 서빙(`http://localhost:3000/tasks.html`)은 2주차 산물이 남아있는 것뿐이라 이제 참고용 — 실제 개발/확인은 5173에서 한다.

개발 중 터미널 두 개 띄우기: `cd server && node src/app.js`(3000) / `cd client && npm run dev`(5173)

나중에 귀찮아지면 concurrently 도입 검토

> **서버 실행 순서 주의(3주차부터 바뀜)**: DB가 Supabase로 전환되면서 테이블이 이미 클라우드에 만들어져 있다 — `npm run init-db`는 **이제 안 돌려도 된다**. `cd server && node src/app.js`만 실행하면 됨. (`src/init-db.js`는 SQLite 시절 스크립트라 지금 실행해도 pg Pool 위에서 그대로 안 돌아간다 — 남겨두긴 했지만 실질적으로 레거시.)




## 파일 이름 규칙

React 컴포넌트: TaskCard.jsx (대문자 시작, 붙여쓰기)
일반 파일: taskController.js (소문자 시작, 붙여쓰기)
폴더: components, routes (전부 소문자)


## 커밋 메시지 규칙
feat: 새 기능 추가
fix: 버그 수정
docs: 문서 작업
style: 디자인/포맷 변경 (기능 동일)
refactor: 코드 정리 (기능 동일)
chore: 잡일 (라이브러리 설치, 설정)
예시
feat: 회의시간 매칭 격자 UI 추가
fix: 완료 체크가 진행률에 반영 안 되는 문제 수정
docs: 기획서 추가

완벽하게 지킬 필요 없음. 헷갈리면 feat:. 자주 쓰는 3개만 기억: feat, fix, docs.


## 개발 원칙

과도한 설계를 피한다. 작은 프로젝트는 단순한 구조로.
1개 만들고 → 바로 확인 → 커밋 반복.
완벽한 구조를 미리 짜려다 시작도 못 하는 게 더 나쁘다. 필요해지면 그때 나눈다.
프로토타입은 완벽할 필요 없다. 방향 확인용.
기능을 늘리지 말고 핵심 2개(태스크 관리, 회의시간 매칭)를 꼼꼼히 완성한다.

## 하지 말 것

- 외부 UI 라이브러리 금지 (Material-UI, Ant Design 등). 직접 만든 CSS 변수 디자인 시스템 사용.
- 기능을 임의로 추가하지 말 것. 핵심 2개(태스크 관리, 회의시간 매칭)에 집중.
- 데이터를 실제로 삭제하지 말 것. 보관(archive) 또는 기록 남기기.
- 진행률·완료 표시에 빨강 사용 금지. 빨강은 경고/삭제/마감임박 전용.
- 색상을 임의로 정하지 말 것. 디자인 시스템의 CSS 변수만 사용.

## 2주차 진행 상황

작업 계획: `docs/plan_태스크관리_2주차 (1).md`

- **완료** (1~13 전부): 1(DB 테이블) · 2(태스크 CRUD API) · 3(이름 선택 UI + localStorage) · 4(상태 변경 API) · 5(권한 체크) · 6(활동 로그 자동 기록) · 7(태스크 목록 화면) · 8(추가 폼) · 9(상태 변경 UI) · 10(진행도 바 2종) · 11(soft delete) · 12(활동 로그 화면) · 13(마감임박 표시 + 마감일 과거 선택 제한 + D-day 표시 + 브라우저 알림)
- 2주차 계획서 작업은 모두 마무리됨
- **계획서엔 없었지만 추가로 구현**: 마감일 인라인 수정(`PATCH /api/tasks/:id/due-date`), file:// 알림 권한 미저장 문제 해결을 위한 정적 파일 서빙(`http://localhost:3000/tasks.html`)
- 2주차 발표자료: 저장소 루트 `발표자료_2.html` → GitHub Pages 배포: https://jsjsbs7233.github.io/hub/발표자료_2.html (Settings → Pages, branch: `N048_김우현` / root)

## 3주차 계획 (이번 주)

**순서**: Supabase 전환 → React 전환 → 회의시간 매칭 연동 → 배포

1. **DB: SQLite → Supabase 전환** — ✅ **완료**. `pg`로 `DATABASE_URL` 연결, models 전부 pg 문법으로 전환.
2. **React 전환** — ✅ **완료**. `prototype/tasks.html`의 바닐라 JS를 `client/`(Vite)로 옮김. 아래 "3주차 진행 상황" 참고.
3. **회의시간 매칭 백엔드/DB 연동** — 예정. 현재 `calendar-match.html`은 가짜 데이터로만 동작하는 프로토타입, 아직 React 전환도 안 됨.
4. **배포** — 예정.

### 부트캠프 요구사항 반영 (이번 주)
- 아키텍처 다이어그램을 mermaid로 그려서 README에 포함 — 예정
- 핵심 기능 1개는 TDD(테스트를 먼저 작성하고 구현)로 개발 — ✅ **완료**. 태스크 권한 체크(`canMemberChange`)를 client/server 양쪽에서 테스트 먼저 작성 → 실패 확인(red) → 구현(green) 순서로 진행.

## 3주차 진행 상황

- **SQLite → Supabase(Postgres) 마이그레이션**: `db.js`를 `pg` Pool로 전환(이전 better-sqlite3 코드는 롤백 대비 주석으로 보존), `taskModel`/`memberModel`/`activityLogModel`/`taskController`를 전부 `async`/`await` + pg 파라미터(`$1, $2...`) 문법으로 전환. 마이그레이션 과정에서 `memberController.js`(그리고 뒤늦게 발견한 `activityLogController.js`)가 async 모델 함수를 `await` 없이 호출해 `{}`를 반환하던 버그도 같이 잡음.
- **React 전환**: `client/`(Vite)에 태스크 화면 전체를 컴포넌트로 재구성 — `Header`/`UserSelect`(이름 선택, localStorage), `ProgressCard`(팀/내 진행도), `TaskList`/`TaskItem`, `AddTaskForm`, `Toast`(권한 없음 알림), `ArchivedTasks`/`ArchivedTaskItem`(삭제된 태스크). 유틸 함수(`utils/`)와 API 호출(`api/`, axios)도 프로토타입에서 그대로 분리 이전.
- **인라인 수정**: 마감일에 이어 **제목·담당자**도 클릭 → 그 자리에서 편집 → 저장이 가능하도록 확장(`EditableTitle`/`EditableAssignee`/`EditableDueDate`). 서버에 `PATCH /:id/title`, `PATCH /:id/assignee` 신규 추가.
- **삭제된 태스크 보기·복원 UI**: "삭제된 항목 보기" 토글 + 복원 버튼. 서버에 `GET /api/tasks/archived`, `PATCH /api/tasks/:id/restore` 신규 추가.
- **권한 로직 TDD**: `canMemberChange(task, memberId)`를 client에서 먼저 테스트 6개 작성(실패 확인) → 구현(통과) → server에도 동일 로직·동일 테스트로 복제 → 양쪽의 인라인 중복 코드(`TaskList.jsx`, `taskController.js` 등)를 각자의 `utils/permission.js` import로 정리. `client`/`server` 둘 다 Vitest 설치, `npm test`로 실행.
- **자잘한 버그 수정**: `app.js`의 SQLite 전용 테이블 확인 코드 제거, `memberController.js`/`taskRoutes.js` 관련 버그·순서 수정 (자세한 원인은 "자주 만나는 오류" 표 참고).

## 향후 기능 후보 (4주차 이후)

- 태스크 파일 첨부 + 첨부 시 팀원 알림 (실시간 알림 구조 필요)

## 참고

- 기획서: docs/planning-doc.md
- 디자인 규칙: 이 문서의 "디자인 시스템" 섹션
- 설계 결정사항(엣지케이스): 이 문서의 "설계 결정사항" 섹션
- 개발 환경 규칙: 이 문서의 "개발 환경 결정사항" 섹션

## 회의시간 매칭 - 상세 설계

### 팀원 수 대응
- 팀 최대 인원: 8명. 대학생 팀플은 보통 3~6명, 많아야 8명. 무제한으로 열면 격자 UI가 복잡해지고 대학생 특화라는 정체성도 흐려진다.
- 색 농도는 "가능 인원 수"가 아니라 **"전체 팀원 대비 비율"**로 계산한다.
  - 0% / 25% / 50% / 75% / 100% 5단계
  - 이렇게 하면 팀이 3명이든 8명이든 동일한 색 체계를 쓸 수 있다.
- 프로토타입에서는 4명 고정. 실제 개발 시 비율 계산으로 반영할 것.

### 날짜 기반 구조
- 요일(월~금) 격자가 아니라 실제 날짜 기반. 팀플은 몇 주에 걸쳐 진행되므로 "화요일 2시"로는 부족하다.
- 팀 생성 시 입력한 프로젝트 기한을 자동으로 캘린더 범위로 사용한다. (사용자가 날짜를 두 번 입력하지 않아도 됨)
- 화면은 주 단위로 전환. 가로 스크롤보다 구현이 쉽고 사용 패턴에도 맞다.
- 시간대는 10시~21시, 1시간 단위 (12칸). 대학생은 오전 9시 회의를 잘 하지 않고 저녁 시간대가 오히려 모이기 좋다.
- 추천 회의 시간은 겹치는 인원 순이 아니라 날짜 순으로 정렬. 팀플은 한 번 만나고 끝나지 않으므로, 기간 전체의 회의 일정을 그릴 수 있어야 한다.

### UI 패턴에 대한 입장
- 색 농도로 겹침을 표현하는 히트맵은 when2meet, 모두의 시간 등에서 검증된 관용적 패턴이다. 새로운 UI를 발명하기보다 익숙한 패턴을 쓰는 것이 사용자에게 낫다.
- 차별점은 UI가 아니라 이 기능이 태스크 관리와 한 곳에 있다는 것, 그리고 기간 전체의 회의 일정을 그린다는 것이다.

### 내 팀 목록 (홈 화면)

- 로그인 직후 도착하는 홈 화면. 사용자가 속한 모든 팀을 카드로 표시.
- 각 팀 카드에 표시할 것:
  - 팀 이름
  - D-day (마감까지 남은 일수)
  - 진행률 바 (완료 태스크 / 전체 태스크)
  - 방장 닉네임 · 팀원 수
- 상단에 "새 프로젝트" / "초대코드로 참여" 버튼 두 개
- 보관(archive)된 팀은 목록 아래쪽에 흐리게(opacity 0.65) 표시하고 "보관됨" 뱃지를 붙인다. 데이터는 유지되며 다시 열 수 있다.
- 정렬: 진행 중인 팀 우선, 그 안에서는 마감이 임박한 순.