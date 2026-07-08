# PREFER — 순수 HTML/CSS 프로토타입 제작 지시서

## 목적

이 문서 하나만 보고, **React·백엔드 없이 순수 HTML/CSS(+최소한의 바닐라 JS)** 로 "PREFER"(AI 선호도 기반 미팅 스케줄러) 서비스의 **사용자 경험(화면·레이아웃·상호작용·문구)** 을 그대로 재현하는 것이 목표다. 실제 데이터 저장/AI 연동/서버 통신은 전부 하드코딩된 목(mock) 데이터로 대체한다.

> **중요**: "순수 HTML/CSS"라도 아래 상호작용들은 자바스크립트 없이는 구현이 불가능하다 — 모달 열고 닫기, 드래그로 시간표 범위 선택 후 팝업 띄우기, 날짜/시간 커스텀 픽커, 화면 전환. 프레임워크(React 등) 없이 **바닐라 JS**로 이 부분들만 최소한으로 구현하고, 나머지(레이아웃/색상/타이포그래피)는 순수 CSS로 만든다. 실제 클릭 상호작용 없이 "보여주기용 정적 화면"만 필요하다면, 아래 각 화면의 "정적 스냅샷" 상태 하나씩만 별도 HTML 페이지로 만들어도 된다.

---

## 1. 디자인 시스템

### 1.1 색상 변수 (CSS custom properties로 그대로 사용)

```css
:root {
  --color-bg: #f5f6fa;
  --color-surface: #ffffff;
  --color-border: #e2e5ec;
  --color-text: #1f2430;
  --color-text-muted: #6b7280;
  --color-primary: #4f6df5;
  --color-primary-dark: #3b54d6;
  --color-danger: #e5484d;
  --color-success: #2fac66;

  /* 상태 색상: 비선호 < 가능 < 선호 순으로 같은 보라색 계열의 명도/채도가 짙어진다. 불가능만 빨강. */
  --status-undesired-bg: #ede9fe;
  --status-undesired-text: #6d28d9;
  --status-available-bg: #c4b5fd;
  --status-available-text: #4c1d95;
  --status-preferred-bg: #7c3aed;
  --status-preferred-text: #ffffff;
  --status-unavailable-bg: #fbe6e7;
  --status-unavailable-text: #c93338;

  /* 추천 결과 순위 색상 (파란색 계열, 진할수록 높은 순위) */
  --rank-1-bg: #1d4ed8; --rank-1-text: #ffffff;
  --rank-2-bg: #3b82f6; --rank-2-text: #ffffff;
  --rank-3-bg: #60a5fa; --rank-3-text: #ffffff;
  --rank-4-bg: #bfdbfe; --rank-4-text: #1e3a5f;
  --rank-5-bg: #e0edfe; --rank-5-text: #1e3a5f;

  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --shadow-card: 0 1px 3px rgba(20, 24, 40, 0.08);

  font-family: "Pretendard", "Apple SD Gothic Neo", -apple-system, BlinkMacSystemFont, sans-serif;
}
```

### 1.2 공용 컴포넌트 클래스 (그대로 재사용)

- `.page` — 화면 전체 래퍼: `min-height:100vh; display:flex; flex-direction:column; align-items:center; padding:24px 16px 64px;`
- `.container` — 본문 폭 제한: `max-width:720px; display:flex; flex-direction:column; gap:20px;` (`.container-wide`는 `max-width:1080px`)
- `.card` — 흰 배경 박스: `background:#fff; border:1px solid var(--color-border); border-radius:16px; box-shadow:var(--shadow-card); padding:24px; display:flex; flex-direction:column; gap:16px;`
- `.btn` 기본: `padding:10px 16px; border-radius:6px; font-weight:600; font-size:14px; cursor:pointer;`
  - `.btn-primary` = 배경 `--color-primary`, 흰 글씨
  - `.btn-secondary` = 흰 배경 + 테두리
  - `.btn-danger` = 흰 배경 + 빨간 글씨/테두리
  - `.btn-ghost` = 배경 없음, `--color-primary` 글씨
  - `.btn-block` = `width:100%`, `.btn-grow` = `flex:1` (버튼 두 개를 한 줄에 나란히 놓을 때, 주 버튼에 `btn-grow`를 줘서 남는 공간을 채우고 옆의 보조 버튼은 자기 크기만큼만 차지하게 함 — **절대 주 버튼에 `btn-block`을 쓰고 그 옆에 취소 버튼을 두지 말 것. 다음 줄로 밀려 혼자 왼쪽에 남아 어색해짐**)
- `.badge` — 알약 모양 태그: `border-radius:999px; padding:3px 10px; font-size:12px; font-weight:600;` + 상태별 색상(`badge-available`/`badge-preferred`/`badge-undesired`/`badge-unavailable`)
- `.modal-overlay` — `position:fixed; inset:0; background:rgba(15,18,30,.45); display:flex; align-items:center; justify-content:center; padding:16px; z-index:50;`
- `.modal` — `max-width:420px; width:100%; max-height:calc(100vh - 32px); overflow-y:auto; border-radius:16px; padding:28px; display:flex; flex-direction:column; gap:16px;` (**높이 제한과 내부 스크롤 필수** — 필드 많은 모달이 짧은 화면에서 잘리는 걸 방지)
- `.input` — `border:1px solid var(--color-border); border-radius:6px; padding:10px 12px; font-size:14px;`
- `.progress-bar-track`/`.progress-bar-fill` — 8px 높이 진행바, `fill`은 `background:var(--color-primary)`
- `.link-box` — 점선 테두리 박스, 링크/코드 표시용: `border:1px dashed var(--color-border); border-radius:6px; padding:10px 12px; background:var(--color-bg); word-break:break-all;`

### 1.3 반응형

- 720px 이하: `.page` 패딩 축소, 폼 2열(`.form-row`)이 1열로 스택
- 900px 이하: 투표 화면의 "채팅+그리드" 2열 레이아웃이 1열로 스택

---

## 2. 전체 화면 흐름 (사이트맵)

```
[랜딩 "/"]
  ├─ "새 약속 만들기" 클릭 → [약속 만들기 모달]
  │     └─ 제출 성공 → [허브 "/m/:id"] (URL 이동) + 위에 [생성 완료 모달] 자동 표시
  ├─ "기존 약속 참여하기" 클릭 → [참여하기 모달]
  │     └─ 제출 성공 → [허브 "/m/:id"] (URL 이동)
  └─ (참여 링크를 직접 클릭해서 들어온 경우) → 바로 [허브 "/m/:id"]로 이동

[허브 "/m/:id"] — 로그인 안 된 상태면 [인라인 참여 모달] 자동 표시
  ├─ "약속 투표하기" → [투표 화면 "/m/:id/vote"]
  ├─ "추천 결과 보기" → [추천 결과 "/m/:id/results"]
  ├─ "최종 결과 보기" → [최종 결과 "/m/:id/final"]
  └─ "투표 마감하기" → [마감 확인 모달] → 확인 시 → [추천 결과]

[투표 화면] → "투표 완료" → [AI 해석 확인 "/m/:id/vote/confirm"] → "투표 완료" → [응답 완료 "/m/:id/vote/done"]
[추천 결과] → 칸 클릭 → 팝업 → "이 시간으로 확정" → [최종 결과]
```

라우트(파일명 매핑 제안 — 실제 URL 라우팅 없이 그냥 개별 HTML 파일로 만들어도 됨):
| 화면 | 파일명 제안 |
|---|---|
| 랜딩 | `index.html` |
| 허브 | `hub.html` |
| 투표 화면 | `vote.html` |
| AI 해석 확인 | `vote-confirm.html` |
| 응답 완료 | `vote-done.html` |
| 추천 결과 | `results.html` |
| 최종 결과 | `final.html` |

---

## 3. 화면별 상세 스펙

### 3.1 랜딩 (`index.html`)

**레이아웃**: 2단 그리드 (`grid-template-columns: 1fr 1fr; gap:56px;` / 760px 이하에서는 1단으로).

**왼쪽 컬럼** (순서대로, 각 요소는 `opacity:0 → 1`, `translateY(10px) → 0`으로 페이드인. `animation-delay`를 0ms, 80ms, 160ms, 240ms, 320ms 순으로 스태거):
1. 브랜드 라벨: `PREFER` (보라색, 굵게, 13px, letter-spacing)
2. 헤드라인(34px, 굵게): `가능한 시간` (회색, `--color-text-muted`) + 😐 이모지 + `보다,` 줄바꿈 `더 ` + `좋은 시간` (보라색, `--color-primary`) + 😊 이모지 + `을.`
   - 정확한 마크업: `<span class="dim">가능한 시간</span>😐보다,<br/>더 <span class="strong">좋은 시간</span>😊을.`
3. 서브텍스트(14px, 회색): `모두가 가능한 시간 중에서도 각자의 선호를 반영해` 줄바꿈 `가장 만족스러운 약속 시간을 찾아드려요.`
4. 버튼 2개 (가로 나열, gap 10px): `새 약속 만들기`(primary) / `기존 약속 참여하기`(secondary)
5. 번호 리스트(13px, 회색, line-height 2): `1. 가능한 시간 선택` / `2. 선호·비선호 입력` / `3. 최적 시간 추천`

**오른쪽 컬럼**: 흰 카드(`max-width:320px`, 둥근 모서리, 그림자) 안에:
- "7월" 텍스트(굵게)
- 요일 헤더 5개(월~금) + 날짜 그리드(5열, 7~26 숫자). 14, 15, 18, 20번 날짜만 `--status-available-bg`/`text` 색으로 강조(둥근 배경, 굵게), 나머지는 회색.
- 구분선 아래: 말풍선 `"목요일 오후가 좋아요"` + 캡션(회색, 12px) `선호 시간으로 반영할까요?`

**동작**: "새 약속 만들기" → 약속 만들기 모달 열기. "기존 약속 참여하기" → 참여하기 모달 열기.

---

### 3.2 약속 만들기 모달

`.modal` 안, 제목 `새 약속 만들기`.

필드 (세로로, 각 `.form-group`):
1. **약속 제목** — 텍스트 입력, placeholder `예) 팀 프로젝트 회의`
2. **후보 날짜** — `DateRangePicker` 커스텀 컴포넌트 (아래 4.3 참고). 접힌 상태 텍스트: `날짜 범위를 선택하세요` / 선택 후 `2026.07.20 ~ 2026.07.24` 형식
3. **만남 가능 시간대** — `TimeRangePicker` 커스텀 컴포넌트 (아래 4.4 참고). 접힌 상태 `시간대를 선택하세요` / 선택 후 `12:00 ~ 20:00`
4. **응답 마감 (선택)** — `<input type="datetime-local">`
5. **약속 전체 인원수** — `<input type="number" min="1">`, placeholder `예) 5`
6. 2열(`.form-row`): **생성자 이름** / **관리자 비밀번호**(`type=password`)
7. 경고 문구(12px, 회색): `⚠ 비밀번호를 잊으면 관리자로 다시 접속할 수 없어요. 꼭 기억해주세요.`
8. 버튼 줄(한 줄, `flex-wrap:nowrap`): `약속 만들기`(primary, `flex:1`) + `취소`(secondary, 고정폭)

**동작(목업)**: "약속 만들기" 클릭 → 아무 검증 없이 바로 허브 화면으로 이동 + 생성 완료 모달을 그 위에 띄운다.

---

### 3.3 생성 완료 모달 (허브 화면 위에 자동으로 뜸)

제목: `약속이 생성되었어요 🎉`
설명: `아래 링크를 참여자에게 공유해주세요.`
- 라벨 `참여 링크` + `.link-box`(예: `http://localhost:5173/m/abc123`) + `링크 복사` 버튼(secondary, 작게). 클릭 시 버튼 텍스트가 잠깐 `복사됨!`으로 바뀜(1.5초 후 원상복구)
- 하단 `닫기` 버튼(primary, block) → 모달만 닫힘 (허브는 그대로 보임)

---

### 3.4 참여하기 모달 (랜딩에서 열림)

제목: `약속 참여하기`

필드:
1. **참여 링크** — 텍스트 입력, placeholder `공유받은 링크를 붙여넣으세요`
2. **이름**
3. **간편 비밀번호**(`type=password`)
4. 안내문(12px, 회색): `이름과 비밀번호로 나중에 다시 참여하면 재투표(응답 수정)할 수 있어요. 생성자 이름과 관리자 비밀번호를 입력하면 관리자로 접속돼요.`
5. 버튼 줄(nowrap): `참여하기`(primary, grow) + `취소`(secondary)

**동작(목업)**: 아무 이름이나 입력하고 제출하면 허브로 이동. **"관리자 이름"으로 입력하면 관리자 화면 버전의 허브를, 다른 이름이면 참여자 화면 버전의 허브를 보여주도록 목업 데이터를 분기**해두면 좋다 (아래 3.5 참고).

---

### 3.5 허브 (`hub.html`) — 관리자 화면 / 참여자 화면 두 버전 필요

로그인 안 된 상태(URL만 직접 열었을 때)로 들어오면, 허브 내용 대신 **인라인 참여 모달**을 자동으로 띄운다 (3.4와 동일한 필드, 제목만 `이 약속에 참여하려면 이름과 비밀번호를 알려주세요`). 배경엔 `참여 정보를 확인하는 중...` 텍스트만 있는 빈 페이지.

로그인된 상태의 공통 상단:
- 배지: `{이름}님으로 참여 중 (관리자)` 또는 `{이름}님으로 참여 중 (참여자)` — `badge-available` 스타일
- 제목(22px, 굵게): 약속 제목
- 서브텍스트: `2026.07.20 (월) ~ 2026.07.24 (금) · 12:00~20:00`

카드 1 (상태/진행):
- 상태 배지(`badge-preferred` 스타일): `응답 중` / `응답 마감` / `추천 결과 생성됨` / `최종 확정` 중 하나 + 오른쪽에 마감 시각(있으면)
- 진행바: `N명 중 M명 완료` + 퍼센트 (`ProgressBar`, 4.6 참고)
- 참여 링크 표시(`.link-box`) + `링크 복사` 버튼
- 버튼: 상태가 `응답 중`이면 `약속 투표하기`(primary). 그 외 상태면 `추천 결과 보기`(secondary). `최종 확정` 상태면 추가로 `최종 결과 보기`(secondary)
- **상태가 `응답 중`일 때만**: `투표 마감하기` 버튼(danger). 클릭 시:
  - **관리자**면 → 마감 확인 모달(3.5.1) 오픈
  - **참여자**면 → 버튼 아래 빨간 글씨로 `관리자만 가능합니다!` 표시(2.5초 후 사라짐), 아무 동작 안 함
- **관리자이고 상태가 `응답 마감`/`추천 결과 생성됨`**일 때: `투표 다시 열기` 버튼(secondary) 추가

카드 2 (**관리자에게만 보임**): 제목 `참여 현황`. 참여자 이름 + 완료/미완료 배지 목록 (`badge-preferred`=완료, `badge-unavailable`=미완료).

#### 3.5.1 마감 확인 모달
제목: `투표를 마감할까요?`
- 진행바(카드 1과 동일)
- 안내문: `정말 마감하시겠어요? 마감 후에도 필요하면 언제든 다시 열 수 있어요.`
- 버튼 줄(nowrap): `마감할게요`(danger, grow) + `취소`(secondary)
- "마감할게요" 클릭 → 추천 결과 화면으로 이동

---

### 3.6 투표 화면 (`vote.html`)

로그인 안 됐으면 3.5와 동일한 인라인 참여 모달.

상단:
- 제목: `{약속제목} · 일정 입력`
- 서브텍스트: `{이름}님, 시간표를 드래그해서 범위를 선택하면 상태를 고를 수 있어요.`
- 안내 문구(카드 없이 그냥 텍스트): `💡 선호는 **+1점**, 비선호는 **-1점**으로 계산돼요. 모든 참여자의 선호·비선호를 종합해서 가장 좋은 시간을 추천해드려요.`

본문: 2열 그리드(`280px 1fr`, 900px 이하에서 1열):
- **왼쪽**: 채팅 패널(4.7 참고) — 목업이라 실제 AI 응답 없이, 아무 메시지나 보내면 고정된 안내문(`AI 연동은 이 프로토타입에서 생략했어요` 등)만 돌려줘도 됨
- **오른쪽**: `PreferenceGrid` (4.1 핵심 컴포넌트, 반드시 구현)

하단: 버튼 줄(nowrap): `투표 완료`(primary, grow) + `허브로 돌아가기`(secondary)

---

### 3.7 AI 해석 확인 (`vote-confirm.html`)

상단: 제목 `AI 해석 결과 확인`, 서브텍스트 `입력하신 내용을 색으로 정리했어요. 잘못된 부분이 있으면 드래그해서 다시 지정할 수 있어요.`

본문: 카드 안에 `PreferenceGrid` (투표 화면과 동일 컴포넌트, 이전 화면에서 선택한 상태를 그대로 이어받아 표시 — 목업에선 그냥 임의의 몇 칸을 선호/비선호/불가능으로 미리 채워둔 예시로 대체)

하단: 버튼 줄(nowrap): `투표 완료`(primary, grow) + `허브로 돌아가기`(secondary)

---

### 3.8 응답 완료 (`vote-done.html`)

- 카드(가운데 정렬): 제목 `응답이 완료됐어요 ✅`, 서브텍스트 `다른 참여자들의 응답이 모이면 추천 결과를 확인할 수 있어요.`
- 카드: 제목 `내 응답 요약`, 아래 `날짜 시간` + 상태배지 목록 (비어있으면 `지정한 시간이 없어요 (전부 가능으로 처리됨).`)
- 버튼 3개(가로): `내 응답 수정하기`(secondary) / `약속 링크 공유하기`(secondary) / `약속 메인으로`(primary)

---

### 3.9 추천 결과 (`results.html`)

상단: 제목 `추천 결과`, 서브텍스트 `참석 가능 인원이 가장 많은 시간을 우선으로, 선호도가 높고 비선호가 적은 순서로 최대 5순위까지 색으로 보여드려요. 색칠된 칸을 눌러 자세히 볼 수 있어요.`

본문: 카드 안에 `RecommendationGrid` (4.2 핵심 컴포넌트, 반드시 구현)

**참여자 화면일 땐** 그리드 아래 문구: `최종 시간 확정은 약속 생성자만 할 수 있어요.`

하단: `허브로 돌아가기`(secondary)

---

### 3.10 최종 결과 (`final.html`)

- 카드(가운데 정렬): 캡션 `최종 확정된 약속 시간이에요`, 큰 제목(22px) `2026.07.21 (화) 18:00`, 서브텍스트에 확정 이유(`전원 참석 가능하며 선호 응답이 가장 많아 최종 확정되었습니다.` 등)
- 카드: 제목 `결과 공유하기`, `.link-box`(최종 결과 URL) + `링크 복사` 버튼, 안내문 `확정 이후에는 결과 조회만 가능하고, 응답 수정은 지원하지 않아요.`
- `허브로 돌아가기`(secondary)

---

## 4. 핵심 인터랙티브 컴포넌트 (반드시 구현)

### 4.1 PreferenceGrid — 시간표 그리드 (드래그 선택 + 팝업)

**목적**: 여러 날짜(열) × 30분 단위 시간(행)을 한 화면에 동시에 보여주고, 드래그로 범위를 선택하면 팝업이 떠서 상태(가능/선호/비선호/불가능)를 고를 수 있게 한다.

**구조**:
```
[범례: 배지 4개(비선호/가능/선호/불가능) + "드래그로 범위를 선택해보세요" + "↺ 실행 취소" 버튼(비활성 가능)]
[스크롤 가능한 그리드 영역 (max-height: min(58vh, 480px), 자체 스크롤)]
  헤더 행: 빈칸(52px) | 날짜1 헤더 | 날짜2 헤더 | ...
    각 날짜 헤더: 날짜 라벨("7/20 (월)") + 세로로 쌓인 버튼 2개("전체 가능"/"전체 불가능")
  각 시간 행: 시간 라벨("12:00") | 셀 | 셀 | ...
    각 셀: 20px 높이 버튼, 배경색 = 그 칸의 현재 상태 색상
```
CSS Grid: `grid-template-columns: 52px repeat(N, minmax(46px, 1fr));` — 날짜가 많아도 가로 스크롤 없이 웬만하면 한 화면에 들어오도록 최소 폭을 작게(46px) 잡는다. 시간 라벨 열과 날짜 헤더 행은 `position: sticky`로 고정.

**드래그 동작 (바닐라 JS)**:
1. 셀에서 `mousedown` → 드래그 시작 좌표(날짜 인덱스, 시간 인덱스) 기록, 드래그 모드 진입
2. 드래그 중 다른 셀 위로 `mouseenter`(=`mouseover`) → 끝 좌표 갱신, 시작~끝 사이 사각 범위의 모든 셀에 `selecting` 시각 효과(파란 테두리) 적용
3. 아무 데서나 `mouseup`(전역 리스너) → 드래그 종료, 선택된 범위 계산 → 마우스 위치 근처에 **상태 선택 팝업**(4.5) 표시
4. 팝업에서 상태 하나 클릭 → 선택 범위의 모든 셀 상태를 그 값으로 일괄 변경, 팝업 닫힘
5. 단순 클릭(드래그 없이 mousedown+mouseup 같은 칸)도 범위 크기 1로 동일하게 동작

**날짜별 전체 선택 버튼**: "전체 가능"/"전체 불가능" 클릭 시 그 날짜의 모든 시간 셀을 한 번에 해당 상태로 변경 (팝업 없이 즉시 적용).

**실행 취소(undo)**: 상태를 변경할 때마다 이전 전체 상태를 히스토리 스택에 저장. "↺ 실행 취소" 클릭 시 마지막 저장 상태로 복원, 스택에서 pop. 히스토리가 비어있으면 버튼 비활성화.

**셀 상태 → 색상 매핑**: `available`→`--status-available-*`, `preferred`→`--status-preferred-*`, `undesired`→`--status-undesired-*`, `unavailable`→`--status-unavailable-*`. 기본값은 `available`.

---

### 4.2 RecommendationGrid — 추천 결과 그리드

PreferenceGrid와 시각적으로 같은 뼈대(날짜×시간 스크롤 그리드, sticky 헤더)지만:
- 드래그 없음, **클릭만** 동작
- 각 셀은 후보로 뽑힌 시간(1~5순위)이면 순위 색상(`--rank-N-*`)으로 칠하고 **가운데에 순위 숫자**(1~5)를 표시. 후보가 아닌 칸은 회색 배경 + 점선 테두리, 클릭 불가(`disabled`)
- **동점 처리**: 여러 시간이 완전히 동점이면 같은 순위 숫자/색을 공유한다 (예: 월요일 오전 전체가 전부 1순위로 표시될 수 있음 — 정상 동작)
- 후보 칸 클릭 → 클릭 위치 근처에 팝업 표시: `{순위}순위 · {날짜} {시간}` 제목 + 추천 이유 문장(`5명 모두 참석 가능하며...`) + 배지 3개(가능/선호/비선호 인원수) + (관리자만) `이 시간으로 확정` 버튼(primary, block)
- 팝업 바깥 클릭 시 닫힘
- 그리드 위에 범례: 1~5순위 색상 배지 + "해당 없음" 배지

---

### 4.3 DateRangePicker — 날짜 범위 커스텀 픽커

- 접힌 상태: 버튼처럼 보이는 입력창(`.drp-field`, `.input`과 동일 스타일). 값 없으면 `날짜 범위를 선택하세요`, 있으면 `2026.07.20 ~ 2026.07.24`
- 클릭 시 아래에 팝오버(`position:absolute`, 카드 스타일) 오픈: 월 이동 화살표(‹ ›) + "2026년 7월" 제목 + 요일 헤더(일~토) + 날짜 그리드(7열)
- **첫 클릭** = 시작일 지정 (그 날짜만 강조, 안내문 `종료일을 선택하세요`로 바뀜)
- **두 번째 클릭**: 이전 클릭한 날짜보다 빠르면 새 시작일로 재설정(계속 열림 유지). 늦거나 같으면 종료일로 확정 → 팝오버 자동 닫힘
- 범위 안의 날짜는 연한 배경(`--status-available-bg`), 시작/종료일은 진한 배경(`--color-primary`) + 흰 글씨
- 바깥 클릭 시 팝오버 닫힘

---

### 4.4 TimeRangePicker — 시간 범위 커스텀 픽커

- 접힌 상태: `시간대를 선택하세요` / `12:00 ~ 20:00`
- 클릭 시 팝오버: 00:00~23:30까지 30분 간격 시간 목록을 2열 그리드로, 세로 스크롤(`max-height:220px`)
- DateRangePicker와 동일한 2단계 클릭 로직(첫 클릭=시작, 두번째 클릭=종료, 종료가 시작보다 빠르면 새 시작으로 재설정)

---

### 4.5 StatusPickerPopup — 상태 선택 팝업 (PreferenceGrid용)

- `position:fixed`, 클릭했던 마우스 좌표 근처에 표시(화면 밖으로 안 나가도록 `Math.min(x, window.innerWidth-220)` 식으로 보정)
- 제목: `어떤 상태로 지정할까요?`
- 2×2 버튼 그리드: 선호 / 가능 / 비선호 / 불가능 (각 상태 색상으로 배경 칠함)
- 바깥 클릭 또는 Esc 키 → 취소하고 닫힘

---

### 4.6 ProgressBar

`{완료}명 중 {완료}명 완료` 텍스트 + 오른쪽에 퍼센트, 아래에 8px 높이 바(트랙 회색, 채움 `--color-primary`, `width` 트랜지션).

---

### 4.7 ChatPanel (목업)

- 최대 높이 420px 카드, 배경 `--color-bg`
- 메시지 목록(세로 스크롤, max-height 260px): assistant 메시지는 왼쪽 정렬 흰 말풍선, user 메시지는 오른쪽 정렬 파란(`--color-primary`) 말풍선 + 흰 글씨
- 하단 입력창 + `전송` 버튼(작은 primary 버튼)
- 첫 메시지(고정, assistant): `후보 일정 중 참석할 수 없는 날짜나 시간이 있나요? 채팅으로 편하게 알려주거나 아래 시간표를 드래그해서 직접 선택할 수 있어요.`

---

## 5. 목업 데이터 예시

```js
const mockMeeting = {
  title: "팀 프로젝트 회의",
  startDate: "2026-07-20", endDate: "2026-07-24",
  startTime: "12:00", endTime: "20:00",
  status: "collecting", // collecting | closed | recommended | finalized
  deadline: "2026-07-19T23:59",
  totalParticipants: 5,
  submittedCount: 3,
  creatorName: "김민준",
  joinLink: "http://localhost:5173/m/abc123",
};

const mockParticipants = [
  { name: "김민준", submitted: true },
  { name: "이서연", submitted: true },
  { name: "박도윤", submitted: false },
];

const mockCandidates = [
  { rank: 1, date: "2026-07-21", time: "18:00", availableCount: 5, preferredCount: 3, undesiredCount: 0,
    reason: "전원 참석 가능, 3명 선호, 비선호 없음합니다." },
  { rank: 1, date: "2026-07-21", time: "18:30", availableCount: 5, preferredCount: 3, undesiredCount: 0,
    reason: "전원 참석 가능, 3명 선호, 비선호 없음합니다." }, // 동점 예시
  { rank: 2, date: "2026-07-22", time: "17:30", availableCount: 5, preferredCount: 4, undesiredCount: 1,
    reason: "전원 참석 가능, 4명 선호, 1명 비선호합니다." },
];

const mockFinalResult = {
  date: "2026-07-21", time: "18:00",
  rationale: "전원 참석 가능하며 선호 응답이 가장 많아 최종 확정되었습니다.",
};
```

날짜 라벨 포맷 함수(재사용): `"2026-07-21" → "7/21 (화)"` — 요일 배열 `["일","월","화","수","목","금","토"]`, `new Date(dateStr).getDay()`로 인덱싱.

---

## 6. 체크리스트 (구현 후 스스로 확인)

- [ ] 랜딩 페이드인 애니메이션이 순차적으로 나타나는가
- [ ] 약속 만들기/참여하기 모달이 배경을 어둡게 깔고 가운데 뜨는가, 필드가 많아도 모달 안에서 스크롤되는가
- [ ] "약속 만들기"와 "취소" 버튼이 같은 줄에 나란히 있는가 (절대 취소 버튼이 다음 줄에 혼자 남으면 안 됨)
- [ ] PreferenceGrid에서 마우스 드래그로 여러 칸을 선택하면 파란 테두리로 하이라이트되다가, 마우스를 떼면 팝업이 뜨는가
- [ ] 팝업에서 상태를 고르면 선택했던 모든 칸이 한 번에 색이 바뀌는가
- [ ] "↺ 실행 취소"가 마지막 변경을 되돌리는가
- [ ] RecommendationGrid에서 동점 후보들이 같은 색/숫자로 표시되는가
- [ ] 관리자 화면과 참여자 화면에서 허브의 버튼 구성이 다르게 보이는가 (참여현황 카드, 마감 버튼 동작 등)
- [ ] 모바일 폭(375px)에서 레이아웃이 깨지지 않는가
