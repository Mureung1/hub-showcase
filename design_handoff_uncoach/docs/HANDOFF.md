# 언코(Uncoach) 작업 인수인계

**대상**: 이 프로젝트를 이어받는 다른 AI 에이전트 또는 개발자
**기준 시점**: 2026-07-27, `main` = `dfb5c9e`
**라이브**: https://uncoach-pi.vercel.app
**챌린지 PR**: [connect-AIAgentChallenge-26-1/hub#2000](https://github.com/connect-AIAgentChallenge-26-1/hub/pull/2000) (base `N041`, CLEAN/MERGEABLE)

---

## 0. 시작 전에 반드시 알아야 할 것

### 작업 디렉터리를 틀리면 엉뚱한 리포에 커밋한다

```
✅ C:\Users\김아영\Desktop\언코\design_handoff_uncoach   ← git 리포(zer8m/uncoach), 여기서만 커밋
   └── web/                                            ← 유일한 코드베이스(Next.js). 배포 대상
❌ C:\Users\김아영\Desktop\언코                          ← git 리포 아님. 여기서 git 치면 홈 디렉터리
                                                          리포(zer8m/HelloWorld)가 잡힌다
```

Vercel의 **Root Directory 설정이 `web`** 이다. 리포 루트가 아니라 `web/`이 빌드된다.

### 검증 환경

- 브라우저 스크린샷을 못 찍는다(Browser pane 미표시). **DOM을 직접 읽어 검증**해야 한다:
  `javascript_tool` + `getComputedStyle` / `getBoundingClientRect` / `innerText`.
- 프로덕션은 `curl`로 확인 불가. Vercel 봇 챌린지(403 `X-Vercel-Mitigated: challenge`)에 걸린다. 브라우저로만.
- **Service Worker가 낡은 번들을 계속 서빙한다.** dev에서 "고쳤는데 안 바뀐다" 싶으면:
  ```js
  (await navigator.serviceWorker.getRegistrations()).forEach(r => r.unregister());
  (await caches.keys()).forEach(k => caches.delete(k));
  ```
  이걸 몰라서 멀쩡한 코드를 캐시 문제로 오진할 뻔했다.
- **Gemini 무료 티어 쿼터가 자주 소진된다**(429, "약 N초 뒤에 다시 시도"). 채점·뉴스 로딩이 전부 막힌다.
  UI 검증은 `window.fetch`를 스텁해서 진행할 수 있다(아래 5-3 참고).

### 보안 제약(사용자 지시)

- `GEMINI_API_KEY`는 `web/.env.local`에만 존재. `web/.gitignore:34`의 `.env*`가 덮는다.
- 절대 커밋 금지, 클라이언트 코드 금지, 터미널 출력 금지.
- 커밋 전 `git diff --cached --name-only | grep -i env`로 확인하는 습관.

### 커밋 규칙(`CLAUDE.md`)

- **`Co-Authored-By` 트레일러 금지** — 이 프로젝트 `.claude/settings.json`에 `attribution.commit`이 없다.
- 문서 파일은 명시적 요청 없이 만들지 않는다. 루트에 작업 파일 금지(`/src`, `/docs`, `/scripts` 사용).
- 커밋 메시지 본문은 한국어.

---

## 1. 지금까지 한 일 (커밋)

| 커밋 | 내용 |
|---|---|
| `37181d0` | Stitch zip6 리디자인 반영, 타이포 통일(Pretendard 단일), 목데이터 → 실데이터 |
| `bc34afa` | 사이드바 폭 계산 오류로 화면 우측이 잘리던 버그, 차트 막대 정리, 모바일 하단 탭 |
| `184612f` | 뉴스 훈련 기록 저장, XP·레벨 기준 확립, XP 파밍 구멍 차단 |
| `dd49a72` | 뉴스 전용 루브릭 채점표 |
| `cc08f47` | 직업별 상황 분류 정상화(61→75개) |
| `290385a` | 내 상황 직접 쓰기 복원 — 한 문장 입력 → 상대·긴장·채점 기준까지 생성 |
| `829035d` | 회원가입 후 정보 등록으로 연결 + 훈련 모드 순서(대화-메일-뉴스) |
| `711aff3` | 챌린지 제출용 `showcase/` 추가(가이드 폴더 구조, 검사기 통과) |
| `39546b8` | 메일 본문 칸이 내용만큼 늘어나게(내부 스크롤바 제거) |
| `dfb5c9e` | **뉴스 요약 복붙 탐지** — 지문 그대로 옮기면 감점(아래 1-5) |

### 1-1. 레이아웃 잘림 (`bc34afa`) — 근본 원인 1줄

`DashboardLayout.tsx`의 `<main>`이 `md:ml-64 w-full`이었다. 사이드바 자리로 왼쪽 마진 256px을 주면서
폭은 `100%`를 그대로 줘서 **총 폭 = 화면 + 256px**. 부모의 `overflow-x-hidden`이 넘친 오른쪽 256px을
스크롤 없이 잘라냈다. → `w-full` 제거(블록 요소라 남은 폭을 자동으로 채운다).

같이 고친 것:
- **모바일에 내비게이션이 아예 없었다.** 사이드바가 `hidden md:flex`인데 대체 UI가 없어서, 768px 미만에선
  홈에 들어오면 다른 화면으로 갈 방법이 전혀 없었다 → 하단 탭 4개 추가.
- 성장 궤적 막대의 `height:67%`가 **실제로 0px로 렌더**되고 있었다. 부모가 `flex-1`+`h-full` 체인이라
  높이가 `auto`로 남아 %가 해석 불가였다 → 눈금·격자·막대를 `absolute`로 배치.
- 성장 궤적 세로축이 `A B C D`인데 막대 높이는 점수(0~100) 선형이었다(67점 막대가 "C" 눈금에 안 걸림)
  → 축을 `100/75/50/25` 점수 눈금으로, 등급은 말풍선으로.
- 홈 차트 눈금 상한이 `max(1, …)`라 **1회 훈련이 차트를 꽉 채웠다** → 상한 최소 4.
- 통계 히트맵의 `aspect-square`가 카드 폭을 따라가 **한 칸이 100px 블록**이었다 → 폭 280px 제한.

### 1-2. XP·레벨 기준 (`184612f`)

```
XP = 세션 총점 합(0~100 each)
   + 고유 sid 수 × 20      (새 상황 보너스)
   + 훈련한 날 수 × 10      (매일 첫 훈련 보너스)

레벨업 요구치 = 100 + 100n   (Lv1→2는 200, Lv2→3은 300…)
누적: Lv5 = 1,400(약 15세션) / Lv10 = 5,400(약 50세션)
```

**왜 "고유 개수"인가**: 기록 순서와 무관하게 같은 값이 나와야 한다. history를 언제 다시 계산해도 결과가
같아야 별도 저장 없이 파생 계산만으로 굴릴 수 있다. 레벨 곡선은 고정 300에서 체증형으로 바꿨다(초반 진입이 너무 더뎠다).

**막은 파밍 구멍 2개**:
1. 메일 훈련이 **채점할 때마다** `addSession`을 호출했다 → 고쳐 쓸수록 XP가 불었다.
   대화 훈련처럼 "세션 마치기"에서 최종 1건만 저장하도록 통일.
2. 뉴스 sid를 기사마다 다르게 두면 매번 "새 상황 +20"을 받는다 → `news:<카테고리>`로 고정.

### 1-4. 직업별 상황 분류 (`cc08f47`)

전제가 세 군데서 깨져 있었다.
1. **`situationsForRole`이 필터가 아니라 정렬이었다.** '내 직업 먼저, 나머지도 뒤에' 붙여서
   대학생에게 민원 응대·환자 보호자 설명이 그대로 노출됐다 → 실제로 걸러내도록 수정.
2. **medium 오분류 7건**(chat→email). 공문·제안서·견적서·콜드메일이 카톡 말풍선으로 떴다.
   대화 화면은 상대가 턴을 주고받는 구조라 '작성해서 보내는 글'과 맞지 않는다.
3. **직업별 개수 불균형.** 1번을 고치면 간호사·교사·개발자는 메일이 0개라 픽커가 빈 화면이 된다
   → 12개 직업 전부 대화 3개·메일 2개 이상이 되도록 14개 추가(총 75개).

**상황을 추가·수정할 때 지킬 것**: `roles`는 `situations.ts`의 `ROLES`에 있는 이름만 쓴다(오타 하나면
그 상황이 영영 안 보인다). `medium`은 '상대가 답을 주고받는가'로 가른다 — 공문·안내문·제안서는 email.
회귀 테스트(`situations.test.ts`)가 태그 누락·오타·직업별 최소 개수를 막는다.

### 1-3. 뉴스 루브릭 (`dd49a72`)

대화·메일은 3축(맥락·의도 40 / 관계·격식 30 / 전략·표현 30)으로 채점한다. 뉴스 요약엔 **상대가 없어서
"관계·격식" 축이 성립하지 않는다.** 그래서 자체 축을 만들었다:

| 축 | 가중치 | 1점 | 2점 | 3점 |
|---|---|---|---|---|
| ① 핵심 포착 | 40 | 곁가지를 핵심으로 잡음 | 방향은 맞지만 두루뭉술 | 무슨 일이고 왜 중요한지 정확 |
| ② 사실 정확성 | 30 | 기사에 없거나 어긋남 | 수치·주체가 부정확 | 기사와 정확히 일치 |
| ③ 압축·표현 | 30 | 늘어놓았거나 안 읽힘 | 뜻은 통하나 군더더기 | 짧고 명료 |

- Gemini가 **이 기준으로 직접 채점**한다(축별 1~3점 + 근거 한 문장). 이전엔 pass/partial/miss 판정만 받아
  축 점수를 **글자 수·포착률로 역산**했다 — 루브릭이 아니라 대리지표였고, 짧게 쓰면 간결성 만점이 나왔다.
- `verdict`는 이제 3축 총점에서 파생한다(≥80 pass / ≥50 partial / 그 외 miss). 판정과 점수가 어긋날 수 없다.
- **가중치를 40/30/30으로 맞춘 건 의도적**이다. 저장은 기존 `SessionRecord.scores` 3칸을 그대로 쓰고
  `totalOf`·궤적·통계·레벨이 전부 무변경으로 호환된다. 슬롯 대응은 `toScores()` 한 곳에만 있다.

### 1-5. 뉴스 요약 복붙 탐지 (`dfb5c9e`, 2026-07-27)

지문 첫 문장을 **그대로 복붙하면 3축 만점(100)**이 나오던 구멍. 요약을 배우는 훈련인데 복사가 최적
전략이 되던 셈이라 채점 자체가 무너져 있었다.

- `news-score.ts`에 `copyOverlap`/`isCopied` 추가. 요약↔지문의 **가장 긴 연속 일치 어절 구간**을 DP로
  재서(O(n·m), 지문 250×요약 50 남짓이라 충분), 요약의 60% 이상이 6어절 넘게 통째로 겹치면 복붙으로 본다.
  조사를 살려 토큰화해서(`발표했다`≠`발표한`) 바꿔 쓴 건 안 걸리고, 고유명사·수치 같은 짧은 필연적 겹침도 통과.
- `summary/route.ts`에서 복붙이면 **핵심 포착·압축 두 축을 1점**으로 내리고 축별 이유·코치 메시지를 교체.
  **사실 정확성은 건드리지 않는다** — 베낀 글은 실제로 정확하므로 여기서 깎으면 없는 흠을 지어내는 셈이고
  루브릭 문구(`사실이 어긋난다`)와도 모순된다. 결과: 만점 → 약 53점(partial) + "그대로 베꼈어요" 피드백.
- **미결 판단**: 지금은 복붙이 partial(≈53)까지만 떨어진다. miss로 확실히 실패시키려면 정확성 축까지 1점으로
  내려야 하는데, 위 이유로 보류했다. 사용자에게 강도가 적절한지 물어둔 상태(답 대기).

---

## 2. 파일 지도 (이번 작업 관련만)

```
web/src/
├── lib/domain/
│   ├── gamification.ts      XP·레벨·스트릭·배지. 전부 history 파생, 별도 저장 없음
│   ├── news-score.ts        뉴스 루브릭 3축 정의 + 저장 슬롯 변환(toScores/fromScores)
│   ├── situations.ts        3축 정의, totalOf(총점), modeOf/MODE_LABEL/MODE_ICON, newsSid
│   ├── types.ts             SessionRecord(+title), SummaryResult(+scores/reasons)
│   └── *.test.ts            vitest 119개
├── lib/scoring/
│   └── context-system.ts    Gemini 프롬프트. NEWS_SUMMARY_SYSTEM이 루브릭 기준을 문자열로 갖는다
├── app/api/context/summary/route.ts   축 점수 파싱·clamp·verdict 파생
├── components/stitch/
│   ├── DashboardLayout.tsx  사이드바 오프셋 + 모바일 하단 탭
│   ├── SideNav.tsx          NAV_ITEMS를 export(하단 탭과 공유)
│   └── Feedback.tsx         ScoreCard / RubricTable / FeedbackItem — 채점 UI 공용
└── components/screens/      Home, History, Stats, TrainingModes, News, NewsPicker, Chat, Mail …
```

**⚠️ 같이 고쳐야 하는 쌍**:
- `news-score.ts`의 `NEWS_AXES` ↔ `context-system.ts`의 `NEWS_SUMMARY_SYSTEM` 프롬프트 안 기준 문구.
  둘이 어긋나면 화면에 보이는 기준과 실제 채점 기준이 달라진다.

---

## 3. 지켜야 할 설계 원칙

1. **화면에 뜨는 숫자는 전부 `app.history`에서 나와야 한다.** 목데이터·하드코딩 금지.
   이번에 NewsPicker의 "+50 XP", "12개의 새로운 뉴스"가 전부 허구였고, 8개 카드 중 3개는 중복 매핑이라
   **고른 것과 다른 분야 기사를 가져왔다**. 5개 실제 카테고리로 정리했다.
2. **훈련 모드 판별은 `modeOf(sid, sit)` 한 곳에서만.** 화면마다 `sit.medium === "email"`로 따로 분기하면
   상황 목록에 없는 뉴스 기록이 "대화 훈련"으로 샌다(실제로 그랬다).
3. **기록은 "세션 마치기"에서 1건만.** 채점할 때마다 저장하면 재시도가 곧 XP다.
4. **모델 출력은 항상 방어한다.** `clampLevel`이 0·5·문자열·null을 1~3으로 자른다.
   (`Number(null)`이 0이라 "값 없음"이 최저점으로 떨어지던 버그가 있었다 — 테스트가 잡았다.)
5. **타이포는 Pretendard 단일.** 한글·라틴이 한 벌인 폰트라야 화면에서 폰트가 갈리지 않는다.
   Tailwind v4에서 `@layer base` 안에 쓴 규칙이 컴파일 결과에서 사라지는 함정이 있다 — 레이어 밖에 둔다.

---

## 4. 남은 일

### 이번 주 계획 (월~목) — 계정 전환 후 여기서 이어감

사용자가 UI 수정·기능 강화·테스트를 병행하며 목요일에 테스트로 마무리하기로 했다.

| 요일 | 상태 | 작업 |
|---|---|---|
| **월** | ✅ 완료(`dfb5c9e`) | 뉴스 복붙 탐지 + 유닛 테스트 5개 (위 1-5) |
| **화** | ⬜ 다음 | ① 설정 목표 항목 비어있는 것 연결 ② 뉴스 기록 축별 점수 화면 구분 표시 |
| **수** | ⬜ | 카톡 캡처 업로드 경로를 실제 이미지로 검증·수정 + UI 잔손질, 브라우저 e2e |
| **목** | ⬜ | 신규 로직 테스트 구멍 채우기, `tsc`+vitest+build 전체 통과, 배포 |

> 진행 방식은 subagent 병렬(파일 3+·교차모듈일 때만). 단건 수정은 직접. 매일 만진 로직엔 그날 테스트 1개.

### 확인 필요 (우선)
- **새 뉴스 프롬프트의 실제 응답을 못 봤다.** Gemini 쿼터 소진으로 스텁 응답으로만 검증했다.
  쿼터가 풀리면 실제로 `scores`/`reasons`가 규격대로 오는지 확인할 것. 어긋나도 `clampLevel` 폴백이
  포착률 기준으로 메우게 해뒀지만, 그건 다시 대리지표다.

### 미해결 (화·수 작업 대상)
- **설정 화면 `내 정보 → 목표: -`가 비어 있다.** 온보딩의 관심 분야가 거기까지 오지 않는 것으로 보인다.
  (`Onboarding.tsx` → `Profile.goal` / `Profile.interests` → `Settings.tsx` 경로 확인 필요) — **화요일**
- **뉴스 기록의 축별 점수 표시.** 저장 슬롯을 의미가 아니라 가중치로만 짝지어서, 궤적에서 뉴스의 "격식"
  점수를 대화·메일과 같은 뜻으로 오해하게 된다. 화면에서 뉴스는 별도 라벨로 구분해야 한다 — **화요일**
- **캡처(카톡 캡처) 업로드 경로가 실제 이미지로 검증된 적 없다.** 삭제된 예전 버전에서 그대로 넘어왔다.
  `compressImage` → `/api/capture` → 채점 흐름을 진짜 이미지로 확인 — **수요일**
- **Firebase Auth 미완**: 콘솔에서 이메일/Google 제공업체를 켜야 로그인이 완성된다(사용자 몫).

### 확인 대기 (사용자 답)
- 복붙 감점 강도가 partial(≈53)로 충분한지, miss까지 내릴지 (1-5 참고).
- `showcase.json`의 `githubUser: "zer8m(김아영)"` 실명 노출 확인.

### 알려진 한계(버그 아님)
- 뉴스 훈련의 3축 저장 슬롯은 의미가 아니라 **가중치로만** 짝지은 것이다. 궤적 그래프에서 뉴스 기록의
  축별 점수를 대화·메일과 같은 의미로 읽으면 안 된다. `news-score.ts` 상단 주석에 명시돼 있다.
- 상황은 75개, 12개 직업 × (대화 3+ / 메일 2+). 직업 태그는 상황당 1개(중복 태그 없음).
- 뉴스 카테고리는 5개(`market`/`tech`/`sports`/`culture`/`society`). 늘리려면
  `news-categories.ts`와 `NewsPicker.tsx`의 `STYLE` 맵을 같이 고친다.

---

## 5. 작업 절차

### 5-1. 검증 (커밋 전 필수)
```bash
cd design_handoff_uncoach/web
npx tsc --noEmit          # 타입
npx vitest run            # 119개
npm run build             # 프로덕션 빌드
```
`tsc`는 느리면 5분을 넘긴다. 백그라운드로 돌리고 결과를 기다릴 것.

### 5-2. 배포
```bash
cd design_handoff_uncoach
git checkout -b fix/<이름>
git add web/src                              # web/.claude/ 는 로컬 설정, 스테이징 금지
git diff --cached --name-only | grep -i env  # 아무것도 안 나와야 한다
git commit                                   # Co-Authored-By 붙이지 말 것
git fetch origin main && git checkout main
git merge --ff-only fix/<이름>
git push origin main                         # → Vercel 자동 배포
```
푸시 후 브라우저로 라이브 확인. 새 빌드가 반영됐는지는 바뀐 DOM 속성으로 판별한다
(예: `document.querySelector('main').className`에 `w-full`이 사라졌는지).

### 5-3. Gemini 쿼터가 막혔을 때 UI 검증
```js
// 브라우저 콘솔 / javascript_tool
const of = window.fetch;
const J = o => Promise.resolve(new Response(JSON.stringify(o), {headers:{'content-type':'application/json'}}));
window.fetch = function(u) {
  const s = String(u);
  if (s.includes('/api/context/news'))    return J({ passage: { /* NewsPassage */ } });
  if (s.includes('/api/context/summary')) return J({ scores:{grasp:3,accuracy:2,concision:1}, reasons:{}, captured:[], missed:[], verdict:"partial", coach:"" });
  return of.apply(this, arguments);
};
```
`fetchNewsPassage`는 `{passage: …}` **래퍼**를 기대한다(`api.ts:103`). 래퍼를 빼면 조용히 null이 된다.

### 5-4. 기록을 직접 넣어 표시 경로만 검증
```js
const g = await fetch('/api/state').then(r => r.json());
const s = g.state;
s.history.push({ d:"7.24", sid:"news:market", scores:{context:3,register:2,strategy:1}, ts:Date.now(), title:"기사 제목" });
await fetch('/api/state', { method:'PUT', headers:{'content-type':'application/json'}, body:JSON.stringify({state:s}) });
localStorage.removeItem('uncoach-state');  // 서버 상태로 다시 읽게
location.href = '/';
```

---

## 6. 인프라

| 항목 | 값 |
|---|---|
| 배포 | Vercel Hobby(무료), 계정 `ytinrete`, 프로젝트 `uncoach`, Root Directory `web` |
| 리포 | GitHub `zer8m/uncoach` (main 브랜치가 프로덕션) |
| DB | Supabase Postgres(`unco`, 싱가포르), Transaction pooler(6543) → `DATABASE_URL` |
| LLM | Gemini 단일 provider(`gemini-2.5-flash`). 필요한 키는 `GEMINI_API_KEY` 하나 |
| 스택 | Next.js 16(Turbopack), React 19, Tailwind CSS v4, TypeScript, vitest |

- Firebase는 안 쓴다(Blaze 요금제가 필요해 기각). `unco-965ab.web.app`은 고아 상태로 방치.
- **Anthropic SDK는 제거됐다.** `ANTHROPIC_API_KEY` 불필요.
- `web/AGENTS.md` 경고: 이 Next.js는 학습 데이터와 API·규약이 다를 수 있다. 코드 쓰기 전
  `node_modules/next/dist/docs/`의 해당 가이드를 읽을 것.
