# Bridge 프로토타입 추출 소스 (정제본)

> 출처: `frontend/prototype/Bridge_proto_v2.html`
> Claude 아티팩트 "자기 압축해제형 번들"에서 `<script type="__bundler/template">` 평문 HTML만 추출·정제한 것.
> manifest의 asset 36개는 전부 `font/woff2` 바이너리(디자인 정보 없음)라 제외.
> 이 문서는 **프로토타입에 실재하는 값만** 담는다. 지어낸 값 없음.

---

## 1. 글로벌 CSS (helmet `<style>`)

```css
*{box-sizing:border-box}
body{margin:0;font-family:'Work Sans',system-ui,sans-serif;color:#1b1c1a;-webkit-font-smoothing:antialiased}
a{color:#964735;text-decoration:none}
a:hover{color:#11434c}
textarea::placeholder,input::placeholder{color:rgba(113,120,123,.45)}   /* #71787b @45% */
::selection{background:#bceaf6}

/* Material Symbols 아이콘 */
.msym,.msymf{font-family:'Material Symbols Outlined';font-weight:normal;line-height:1;...}
.msym {font-variation-settings:'FILL' 0,'wght' 300,'GRAD' 0,'opsz' 24}  /* outline */
.msymf{font-variation-settings:'FILL' 1,'wght' 300,'GRAD' 0,'opsz' 24}  /* filled  */

/* 애니메이션 */
@keyframes rise   {from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:none}}       /* 모달/토스트 등장 */
@keyframes unfoldp{0%{opacity:0;transform:translateY(24px) scale(.97)}100%{opacity:1;transform:none}} /* 편지 펼치기 */
@keyframes floatp {0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}               /* 봉투 부유 */
@keyframes pulsew {0%,100%{box-shadow:0 0 0 0 rgba(150,71,53,.30)}50%{box-shadow:0 0 0 16px rgba(150,71,53,0)}} /* 도착 봉투 펄스 */
```

### 앱 배경 (루트 div)
```css
color:#1b1c1a;
background-color:#fbf9f5;
background-image:radial-gradient(#d5c4b1 .5px,transparent .5px),
                 radial-gradient(#d5c4b1 .5px,#fbf9f5 .5px);
background-size:20px 20px;
background-position:0 0,10px 10px;   /* 20px 간격 점 그리드 (원목/종이 질감 아님, 플랫) */
```

---

## 2. 색상 (추출 hex · 빈도 · 실제 용도)

| hex | 빈도 | 실제 쓰임 |
|-----|-----|-----------|
| `#11434c` | 50 | **주색 딥틸.** 브랜드 워드마크, 주요 버튼 bg, 활성 탭/사이드바, 링크 hover, 강조 테두리, 카운트다운 숫자 |
| `#fff` / `#ffffff` | 33 | 편지지·카드 표면(종이), 버튼 텍스트 |
| `#71787b` | 32 | 보조/캡션 텍스트, 플레이스홀더(@45%), 라벨 |
| `#40484a` | 21 | 본문 톤 다크 슬레이트, 편지 본문 텍스트 |
| `#964735` | 20 | **강조 테라코타.** 밀랍 인장(seal) 기본, 링크 기본색, 미읽음 배지, "도착 중" |
| `#e4e2de` | 12 | 웜 그레이 보더/디바이더, 카드 테두리 |
| `#1b1c1a` | 10 | 잉크(거의 검정), 최상위 텍스트 |
| `#c0c8ca` | 9 | 쿨 라이트 그레이, 비활성 봉투 테두리·구분선·괘선 |
| `#463b2d` | 9 | 다크 브라운, 화면 제목 h1, seal 색 옵션 |
| `#f5f3ef` | 4 | 크림 오프화이트, 라인 봉투 bg·사유 칩 기본 bg |
| `#fbf9f5` | 3 | 웜 페이퍼 배경(body bg), 피드백 textarea bg |
| `#d5c4b1` | 3 | 탠/베이지, 배경 점 그리드·장식용 아치 |
| `#9a9a9a` | 3 | 그레이, "없어도 괜찮아요" 힌트·스쳐간 편지 텍스트 |
| `#2d5a64` | 3 | 미드 틸, 활성 사이드바 항목 bg·이어진 편지 배지 |
| `#a2d0db` | 2 | 라이트 틸, 활성 사이드바 항목 fg |
| `#a1ced9` | 1 | 라이트 틸, 토스트 체크 아이콘 |
| `#a9adad` | 1 | 그레이, "Est. 2024" 캡션 |
| `#bceaf6` | 1 | 페일 시안, `::selection` 배경 |
| `#772f1f` | 1 | 다크 러스트, 경고 텍스트("수정할 수 없습니다") |
| `#30312e` | 1 | 니어블랙, 토스트 배경 |
| `#f2f0ed` | 1 | 오프화이트, 토스트 텍스트 |

기타 rgba: 사이드바 bg `rgba(239,238,234,.82)` + `backdrop-filter:blur(6px)`. 괘선 `rgba(192,200,202,.55) 1px`(= `#c0c8ca`).

### props로 노출된 커스터마이즈 값 (data-props)
```jsonc
"sealColor": { editor:"color", default:"#964735", options:["#964735","#11434c","#463b2d"], section:"밀랍 인장 색" },
"letterFont":{ editor:"enum",  default:"Literata", options:["Literata","Bricolage Grotesque"], section:"편지 글씨체" },
"lined":     { editor:"boolean", default:true, section:"편지지 줄" }
```

---

## 3. 타이포그래피 (font-family 스택 · 용도)

| 폰트 | 용도 |
|------|------|
| **Work Sans** | 기본 body·UI. 버튼, 캡션, 문단, 입력 UI. `body{font-family:'Work Sans',system-ui,sans-serif}` |
| **Source Serif 4** | 화면 제목 h1, **시작 화면 "BRIDGE" 워드마크**(700), 시작 화면 인용구(italic 600), poolCount 큰 숫자(700), 제목 입력·리스트 제목(600) |
| **Literata** | **편지 본문 읽기 폰트**(letterFont 기본값), 리스트 미리보기 텍스트. serif, italic 존재 |
| **Bricolage Grotesque** | **앱 화면(main/send/sent/recommend/storage) "Bridge" 워드마크**(700, uppercase, `letter-spacing:.20em`), Serial No., 대기 카운트다운 큰 숫자, letterFont 대체 옵션 |
| **Material Symbols Outlined** | 아이콘 (`.msym` outline / `.msymf` filled, wght 300) |

> ⚠️ 워드마크 폰트 불일치(프로토타입 내 실재): **시작 화면**은 `Source Serif 4 700`("BRIDGE"), **앱 화면**은 `Bricolage Grotesque 700 uppercase .20em`("Bridge"). 둘 다 그대로 추출된 값이므로 병기한다. 통일 여부는 사용자 확인 필요.

편지 본문 타이포: `font-size:18px; line-height:32px; letter-spacing:-.01em; color:#40484a`.
편지지 괘선: `linear-gradient(rgba(192,200,202,.55) 1px, transparent 1px); background-size:100% 32px` (lined=true일 때).

---

## 4. 화면 상태 머신 (`class Component extends DCLogic`)

### 초기 state
```js
this.state = {
  screen:'start', letter:'', title:'', envelope:null,
  showConfirm:false, showArrived:false,
  phase:'idle', opened:false, replyOpen:false, reply:'', replying:false,
  toast:'', tab:'mine', waitSecs: 24*3600,
  showFeedback:false, feedback:''
};
```

### screen 값 (6종) 과 흐름
```
start ──login()──▶ main
main  ──toSend()──▶ send            (편지 비어있으면 flash 경고)
send  ──askConfirm()──▶ [confirm modal] ──reallySend()──▶ [arrived modal] ──closeArrived()──▶ sent(phase:waiting, 24h 클럭 시작)
sent(waiting) ──fastForward()(데모)──▶ sent(phase:arrived)
sent(arrived) ──openRecommend()──▶ recommend(opened:false)
recommend ──unfold()──▶ recommend(opened:true)
recommend(opened) ──startReply()──▶ main(replying:true)  ──sendReply()──▶ (토스트 후) main 리셋
recommend(opened) ──passBy()──▶ [feedback modal] ──send/closeFeedback()──▶ (토스트 후) main 리셋
사이드바: goMain()▶main / openStorage()▶storage
storage 탭: tab ∈ {mine, received, linked}
```

- `phase` ∈ {idle, waiting, arrived}
- `tab` ∈ {mine, received, linked}
- 클럭: `startClock()` 1초마다 waitSecs 감소, `fmt()`로 `HH:MM:SS` 표기

### 파생 값 (renderVals 발췌)
```js
notStart: scr!=='start',
showCountdown: scr==='main' || scr==='sent',
writeBg: (main|send|sent|recommend) ? '#2d5a64' : 'transparent',   writeFg: 위 조건 ? '#a2d0db' : '#40484a',
storageBg: scr==='storage' ? '#2d5a64' : 'transparent',           storageFg: '#a2d0db' | '#40484a',
eb(on)  = on ? '#11434c' : '#c0c8ca',        // 봉투 선택 테두리
lift(on)= on ? 'translateY(-8px)' : 'none',  // 봉투 선택 부양
tabActive(on) = { bg: on?'#11434c':'#fff', fg: on?'#fff':'#40484a', bd: on?'#11434c':'#e4e2de' },
linesStyle: lined ? 'linear-gradient(rgba(192,200,202,.55) 1px, transparent 1px)' : 'none',
serialNo:'BR-2024-0512', poolCount:'1,428',
```

---

## 5. 핵심 컴포넌트 마크업 (정제 · 인라인 스타일 발췌)

### 사이드바 (notStart일 때 고정, width 236px)
```
nav: position:absolute; left:0; width:236px; padding:32px 18px; background:rgba(239,238,234,.82); backdrop-filter:blur(6px); border-right:1px solid #e4e2de
  · 상단 카드: "모음소에 쌓인 편지" 라벨 + poolCount(Source Serif 4 700 36px #11434c) + "통" + "지금도 도착하는 중"(#964735)
  · 메뉴 pill (border-radius:999px): Write(edit_note) / Storage(inventory_2) / Profile(account_circle)
    활성 항목 bg={{writeBg}} #2d5a64 / fg={{writeFg}} #a2d0db
  · 하단: settings 아이콘
```

### 시작 화면 (start)
```
중앙 편지지 카드: background:#ffffff; border-radius:3px; box-shadow:0 24px 60px -18px rgba(27,28,26,.14);
  괘선 background: linear-gradient(rgba(192,200,202,.4) 1px,transparent 1px) size 100% 40px
  · 우상단 원형 배지 rgba(253,152,130,.18) + auto_stories 아이콘 #964735
  · "BRIDGE"  → Source Serif 4 700 40px letter-spacing:.14em #11434c
  · 구분선 52×2px #c0c8ca
  · 인용구 "글이 만나 사람을 이어주는 곳" → Source Serif 4 italic 600 34px #1b1c1a
  · 설명문 Work Sans 16px #71787b
  · 버튼: [로그인] bg #11434c 안쪽 dashed 테두리 rgba(255,255,255,.4) / [회원가입] outline 1.5px #11434c
  · 캡션 "Est. 2024 • Crafted for focus" #a9adad letter-spacing:.22em
  · 우하단 "slow correspondence…" italic #c0c8ca
```

### 메인 편지 작성 (main)
```
header: "Bridge"(Bricolage 700 28px .20em uppercase #11434c) + h1(Source Serif 4 600 30px #463b2d)
        + "A bridge between souls, one stroke at a time."(Work Sans italic 14px #71787b)
답장 모드 배너(replying): bg rgba(17,67,76,.07); border rgba(17,67,76,.18); #11434c; reply 아이콘 + 그만두기
편지지 article: max-width:840px; background:#fff; border-radius:3px; box-shadow:0 20px 50px rgba(27,28,26,.06)
  · 상단 메타: 봉투 아이콘 + Serial No.(Bricolage) / dateStr(ko-KR) + "Seoul, South Korea"
  · 본문: 제목 input(Source Serif 4 600 22px) + noTitle 힌트 "없어도 괜찮아요."(#9a9a9a italic)
          textarea placeholder "친애하는 누군가에게…" height:360px; font:{{letterFont}} 18px/32px #40484a; caret #11434c
          배경 괘선 {{linesStyle}} size 100% 32px
  · 푸터: "자동 저장됨"(check_circle #11434c) + "{{charCount}}자 작성 중"
          + 원형 send 버튼 60px background:{{sealColor}} #964735, 밀랍 질감 inset shadow, send 아이콘
footer: "Bridge"(Bricolage) + "© Bridge — The Art of Slow Correspondence" + Philosophy/Privacy/The Postal Code
```

### 봉투 선택 (send)
```
h1 "어떤 봉투에 담을까요?" · 봉투 3종 카드(190×130):
  기본 봉투: bg #fff, SVG 봉투 stroke #11434c, seal circle #964735
  라인 봉투: bg #f5f3ef, 추가 줄 path, seal circle #11434c
  밀랍 봉투: bg #fff, stroke #964735 dasharray "5 3", seal #964735
선택 시 테두리 {{envNBorder}}=eb, 부양 {{envNLift}}=translateY(-8px)
경고 배지: bg rgba(150,71,53,.08); border rgba(150,71,53,.28); #772f1f; lock 아이콘 + "수정할 수 없습니다"
버튼: [다시 쓰기] outline #c0c8ca / [모음소로 보내기] #11434c
```

### 발송 후 대기 (sent)
```
waiting: h1 "편지가 모음소에 잘 도착했어요" + 부유 봉투 SVG(floatp 5s) + "Next letter prompt" 라벨
         + 카운트다운 {{waitLabel}} Bricolage 700 52px #11434c tabular-nums
         + [24시간 빨리감기 (데모)] dashed pill
arrived: h1 "추천 편지가 도착했어요" + 도착 봉투 SVG(pulsew 2.2s, 클릭 openRecommend) + "새 편지 도착 · AI 추천" 배지 #964735
```

### 추천 편지 답장 (recommend)
```
notOpened: h1 "낯선 이의 편지" + 봉투 SVG(클릭 unfold) + "봉투를 눌러 펼치기"
opened(unfoldp 애니메이션):
  좌: AI 배너 "AI는 두 편지 모두 '새로운 시작'이라는 주제를 담고 있다고 판단했습니다."(auto_awesome)
      편지 article(From "모음소의 누군가" / BR-2024-0488), 본문 {{letterFont}} 18px/32px #40484a
  우: 카드 "이 편지에, 어떻게 답할까요?" + [답장 쓰기]#11434c(startReply) / [스쳐 가기]outline(passBy)
```

### 저장소 (storage)
```
탭 pill 3개: 내가 쓴 편지(mine) / 받은 편지(received) / 이어진 편지(linked)  ← tabActive 색
mine    항목: history_edu 점선 아이콘박스 + 제목(Source Serif 4 600) + 미리보기(Literata #71787b) + 날짜
received 항목: {{r.icon}}(mark_email_unread/drafts) + from "모음소 · 익명" + 텍스트 + 배지({{r.badgeColor}})
              미읽음 #964735 / "읽음·답장 안 함" #71787b, 스쳐간 편지는 italic #9a9a9a
linked  항목: forum 아이콘 + "이어진 대화" + 배지 bg #2d5a64 ("전송 중"/"대화 진행")
```

### 공통 오버레이
```
카운트다운 pill (fixed bottom-right, main·sent): bg rgba(228,226,222,.92) blur; schedule 아이콘 + {{waitLabel}}(Bricolage 20px #11434c)
CONFIRM  모달: lock 아이콘 원형 rgba(150,71,53,.12) #964735; "정말 보낼까요?"; [취소]/[보내기]#11434c
ARRIVED  모달: mark_email_read 원형 rgba(17,67,76,.10) #11434c; "모음소에 잘 도착했어요"; "24시간 뒤 AI가 고른 편지"
FEEDBACK 모달: tune 아이콘; "잠깐, 짧은 의견을 들려주세요"; 사유 칩 3개(주제가 안 맞았어요/이미 아는 이야기/마음이 가지 않았어요) 선택 시 #11434c; textarea(bg #fbf9f5)
TOAST: fixed bottom-center; bg #30312e; color #f2f0ed; check_circle #a1ced9; rise 애니메이션
모달 backdrop: rgba(27,28,26,.42~.45); 카드 border-radius:6px; rise .25s
```

---

## 6. 인터랙션·서비스 규칙 (문구에서 확정된 것)

- 편지는 **보내면 수정 불가** (lock 강조 반복).
- 발송 → **24시간 뒤** AI가 고른 추천 편지 도착.
- 답장 전송 → **8시간 뒤** 상대에게 전달.
- **"스쳐 가기"** = 답장하지 않고 넘김 → 저장소에 흔적만 남고, 피드백(추천 품질 개선) 선택 수집.
- 완전 **익명**: 발신자 표기 "모음소의 누군가" / "모음소 · 익명".
- **자동 저장**.
- **모음소** = 편지가 모이는 풀(pool). poolCount "1,428통".
- Serial No. 형식 `BR-2024-XXXX`.
- 슬로건: "The Art of Slow Correspondence" / "slow correspondence…" / "글이 만나 사람을 이어주는 곳".
- 로케일: Seoul, South Korea · Est. 2024 · 날짜 `ko-KR` long 포맷.
