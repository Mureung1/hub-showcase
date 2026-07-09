# Stitch 초기 디자인 프롬프트 — 아카이브

> 리뷰 관리 AI 에이전트 웹 대시보드의 초기 UI 생성에 사용한 프롬프트 기록이다.
> 최종 기획: [기획서.md](./기획서.md) · 최종 결과: [HTML·CSS 프로토타입](../stitch_reviewjigi_ai_dashboard/index.html)
> 색상과 일부 세부 문구는 이후 검토에서 변경되었으므로 최종 결과물은 기획서와 HTML 프로토타입을 기준으로 한다.
> 서비스명은 **"리뷰지기"를 임시로 사용**한다 (확정 시 일괄 교체).

---

## 1. 서비스 요약

- 배달 매장 사장님의 리뷰 관리를 대신하는 AI 에이전트. 리뷰를 유형별로 분류하고, 답글 초안을 만들어주고, 리뷰를 분석하고, 악성 리뷰(블랙컨슈머) 대응을 안내한다.
- **MVP 핵심 흐름**: 리뷰 수동 입력 → AI 유형 분류 → 답글 초안 확인·수정 → **복사해서 배민에 직접 붙여넣기** (MVP에는 자동 게시 없음 → 게시 버튼 대신 "답글 복사하기"가 1차 액션)
- 악성 의심 리뷰는 답글 에디터 대신 **대응 매뉴얼**로 연결된다.

## 2. 사용자와 디자인 원칙

**사용자**: 배달 매장을 운영하는 소상공인 사장님. 40~60대 비중이 높고 IT에 익숙하지 않으며, 영업 중 짬짬이 확인한다.

| 원칙 | 적용 |
|---|---|
| 크고 명확하게 | 본문 16px 이상, 화면당 정보 밀도 낮게, 1차 버튼은 화면당 하나만 크게 |
| 쉬운 말 | 전문용어 금지. "감성 분석" → "손님 반응", "토픽 추출" → "자주 나온 말" |
| 안심시키기 | 악성 리뷰는 절대 자동 처리하지 않음을 UI로 보여줌(경고 배너 + 수동 확인). 법적 안내에는 "법률 자문이 아닌 일반 정보" 고지 문구 필수 |
| 빈 상태 설계 | 리뷰 0건(첫 사용), 분석 데이터 부족(10건 미만) 상태를 반드시 디자인 — "과거 리뷰 붙여넣기" 유도 |
| 반응형 | 데스크톱 우선이되 사장님은 폰 사용이 많으므로 모바일 대응 전제 |

## 3. 스타일 가이드

| 항목 | 값 |
|---|---|
| 무드 | 따뜻하고 친근하되 신뢰감 있게 (음식·배달 연상 + 지켜준다는 안심) |
| 배경 | `#F8F7F4` (라이트), 카드 화이트 |
| 주 색상 | 웜 오렌지 `#F97316` (1차 버튼, 포인트) |
| 텍스트 | 다크 네이비그레이 `#1F2937` |
| 유형 배지 | 칭찬 `#16A34A` 그린 · 불만 `#F59E0B` 앰버 · 문의 `#3B82F6` 블루 · 악성 의심 `#DC2626` 레드 |
| 위험도 배지 | ① 단순 불만 그레이 · ② 정당한 클레임 앰버 · ③ 악성 레드 |
| 컴포넌트 | 카드 기반, 라운드 12px, 부드러운 그림자 |
| 폰트 | Pretendard 계열, 본문 16px+, 숫자(통계)는 크게 |
| 언어 | 모든 UI 텍스트 한국어 존댓말 |

## 4. 정보 구조

좌측 사이드바 내비게이션 (상단바에는 매장명 표시):

| 메뉴 | 화면 | 비고 |
|---|---|---|
| 홈 | 대시보드 홈 | 요약 + 처리 필요 리뷰 큐 |
| 리뷰함 | 리뷰 목록 → 리뷰 상세·답글 | 핵심 화면 |
| 리뷰 입력 | 수동 입력 (단건/일괄) | MVP 전용 — Phase 2 자동 수집 시 축소 예정 |
| 분석 리포트 | 손님 반응 리포트 | |
| 블랙컨슈머 대응 | 사건 리스트 → 대응 매뉴얼 | |
| 매장 설정 | 프로필·톤앤매너 (+자동화 수준은 Phase 2 표시) | |

## 5. 화면별 상세

### 5.1 대시보드 홈
- 상단 통계 카드 4개: 신규 리뷰 / 답글 대기 / 평균 별점 / 악성 의심(레드 강조)
- 최근 30일 손님 반응(긍정·부정) 추이 라인 차트
- 인사이트 카드 리스트 (예: "최근 2주간 배달 지연 불만이 3배 늘었어요")
- "지금 처리가 필요한 리뷰" 큐: 악성 의심 우선 정렬, 카드마다 "AI 답글 확인" 버튼

### 5.2 리뷰함 (목록)
- 필터 탭: 전체/칭찬/불만/문의/악성 의심 + 답글 상태 드롭다운(초안 대기/확인 필요/완료)
- 리뷰 카드: 플랫폼 칩(배민) · 별점 · 닉네임 · 날짜 · 본문 2줄 · 주문 메뉴 태그 · 유형 배지 · 답글 상태 칩
- 악성 의심 카드는 왼쪽에 얇은 레드 보더
- 빈 상태: 일러스트 + "리뷰 입력하러 가기" CTA

### 5.3 리뷰 상세 & 답글 작성 (핵심 화면)
- 2단 레이아웃. 좌: 원본 리뷰(별점·전문·메뉴·날짜·유형 배지) + AI 분류 근거 한 줄
- 우: AI 답글 초안 에디터 — 수정 가능한 텍스트영역, 글자수, "다시 생성", 톤 칩(기본/더 정중하게/짧게)
- 1차 버튼 **"답글 복사하기"** + 보조 문구 "복사한 답글을 배민 사장님 페이지에 붙여넣어 주세요" + "완료로 표시"
- 악성 의심 리뷰: 답글 에디터 대신 레드 경고 배너 + "대응 매뉴얼 보기" 버튼

### 5.4 리뷰 입력 (MVP 수동 입력)
- 탭 1 "한 건씩 입력": 플랫폼 선택(배민 기본)·별점·본문·주문 메뉴(선택)·날짜 → "입력하고 분류하기", 우측에 분류 결과 실시간 미리보기 카드
- 탭 2 "한꺼번에 붙여넣기": 대형 붙여넣기 영역 → 자동 분리된 리뷰 목록 미리보기(행별 유형 배지) → 확인 버튼
- 콜드 스타트 대응: "과거 리뷰도 붙여넣으면 분석이 빨라져요" 안내

### 5.5 분석 리포트
- 기간 선택(주간/월간/직접 선택)
- 카드 그리드: 긍정·부정·중립 도넛 / 별점 추이 라인 / 카테고리(맛·양·배달·포장·서비스)별 언급 막대(긍·부정 분리) / 메뉴별 키워드 표
- 하단 인사이트 카드
- 데이터 부족 상태: "리뷰가 10건 이상 모이면 리포트를 보여드릴게요" + 진행 표시

### 5.6 블랙컨슈머 대응 센터
- 좌: 사건 리스트(위험도 배지 ①②③, 닉네임, 날짜)
- 우: 사건 상세 — 위험도 배너 + 4단계 스테퍼:
  1. 답글 작성 가이드 → 2. 플랫폼 신고 절차 → 3. 증거 수집 체크리스트(체크박스+파일 첨부) → 4. 법적 대응 안내
- 4단계에는 고지 박스 필수: **"일반적인 정보 안내이며 법률 자문이 아닙니다"**
- 하단: 사례 아카이브 표(반복 고객 추적)

### 5.7 매장 설정
- 매장 프로필: 매장명, 업종
- 답글 톤앤매너: 인사말, 말투 선택 칩(존댓말/친근한/간결한), 이모지 사용 토글, 진행 중 이벤트, **금지 표현 태그 입력**
- 우측에 선택한 톤이 반영된 샘플 답글 미리보기 카드
- 하단 "답글 자동화 수준" 라디오 카드 3개(수동 승인/조건부 자동/완전 자동) — **"Phase 2 예정" 칩 + 비활성 상태**로 표시

---

## 6. 부록 — Stitch 프롬프트 (복사용)

사용 순서: ① stitch.withgoogle.com에서 **Web** 모드 선택 → ② 아래 [공통 스타일] + [화면 1] 프롬프트를 합쳐 첫 화면 생성 → ③ 같은 프로젝트에서 화면 2~7을 하나씩 추가 생성 → ④ 세부 수정은 짧은 추가 지시로 반복.
프롬프트는 영문이 결과가 안정적이라 영문으로 작성했고, **UI 문구는 한국어로 출력**되도록 지시해 두었다.

### 공통 스타일 (모든 프롬프트 앞에 붙이기)

```text
Design a responsive web dashboard app called "리뷰지기" for Korean small restaurant owners (ages 40-60, not tech-savvy) that manages delivery-app customer reviews with AI. Warm, friendly, trustworthy feel. Light theme: background #F8F7F4, white cards with 12px rounded corners and soft shadows, primary warm orange #F97316, dark navy-gray text #1F2937. Large readable typography (min 16px body), generous spacing, low information density, one clear primary button per screen. All UI text in Korean, polite tone. Left sidebar navigation: 홈, 리뷰함, 리뷰 입력, 분석 리포트, 블랙컨슈머 대응, 매장 설정. Top bar shows store name "행복분식 강남점".
```

### 화면 1 — 대시보드 홈

```text
Dashboard home screen. Top row of 4 stat cards: "신규 리뷰 12건", "답글 대기 5건", "평균 별점 4.6", "악성 의심 1건" (red accent). Below left: line chart of positive vs negative review trend over the last 30 days, titled "손님 반응 추이". Below right: insight cards with lightbulb icons, e.g. "최근 2주간 배달 지연 불만이 3배 늘었어요". Bottom section "지금 처리가 필요한 리뷰": review cards with platform chip (배민), star rating, review snippet, colored type badge (칭찬 green #16A34A, 불만 amber #F59E0B, 문의 blue #3B82F6, 악성 의심 red #DC2626), and a primary button "AI 답글 확인". Malicious-suspect card sorted first.
```

### 화면 2 — 리뷰함 (목록)

```text
Review inbox screen titled "리뷰함". Filter tabs: 전체, 칭찬, 불만, 문의, 악성 의심, plus a dropdown filter "답글 상태" (초안 대기 / 확인 필요 / 완료). Vertical list of review cards: 배민 platform chip, 1-5 star rating, customer nickname, date, 2-line review text, ordered-menu tag, colored type badge, reply-status chip. Malicious-suspect cards have a thin red left border. Include pagination and an empty state with a friendly illustration and CTA button "리뷰 입력하러 가기".
```

### 화면 3 — 리뷰 상세 & 답글 작성

```text
Review detail and reply screen, two-column layout. Left column: original review card with star rating, full review text, ordered menu, date, type badge "불만", and one line "AI 분류: 불만 (배달 지연)". Right column: AI reply draft editor — editable textarea pre-filled with a polite Korean apology reply, character count, secondary button "다시 생성", tone chips (기본 / 더 정중하게 / 짧게), large primary button "답글 복사하기" with helper text "복사한 답글을 배민 사장님 페이지에 붙여넣어 주세요", and a subtle "완료로 표시" button. Also show a variant state: when the review is malicious-suspect, replace the editor with a red warning banner and a button "대응 매뉴얼 보기".
```

### 화면 4 — 리뷰 입력

```text
Manual review input screen titled "리뷰 입력" with two tabs. Tab 1 "한 건씩 입력": form with platform select (배달의민족 default), star rating selector, review textarea, optional ordered-menu input, date picker, primary button "입력하고 분류하기"; on the right, a live preview card showing the AI-detected type badge. Tab 2 "한꺼번에 붙여넣기": large paste textarea with hint text, below it a parsed review list preview with a type badge per row, and a confirm button. Include friendly helper copy "과거 리뷰도 붙여넣으면 분석이 빨라져요" for non-tech users.
```

### 화면 5 — 분석 리포트

```text
Analytics report screen titled "분석 리포트" with a period selector (주간 / 월간 / 직접 선택). Card grid: donut chart of 긍정/부정/중립 ratio titled "손님 반응"; line chart "별점 추이"; horizontal bar chart of category mentions (맛, 양, 배달, 포장, 서비스) each split into positive/negative; table of keywords by menu item. Bottom: insight cards like "포장 관련 칭찬이 늘고 있어요". Also show a low-data empty state: "리뷰가 10건 이상 모이면 리포트를 보여드릴게요" with a progress indicator.
```

### 화면 6 — 블랙컨슈머 대응 센터

```text
Black-consumer response center, two-pane layout. Left pane: case list with risk badges — "① 단순 불만" gray, "② 정당한 클레임" amber, "③ 악성" red — each with nickname and date. Right pane: selected case detail with a red risk banner and a 4-step stepper: 1) 답글 작성 가이드, 2) 플랫폼 신고 절차, 3) 증거 수집 체크리스트 (checkboxes and file upload), 4) 법적 대응 안내. Step 4 must include an info disclaimer box: "일반적인 정보 안내이며 법률 자문이 아닙니다". Bottom: archive table "사례 아카이브" listing past cases for repeat-offender tracking.
```

### 화면 7 — 매장 설정

```text
Store settings screen titled "매장 설정" with sections: 매장 프로필 (store name, business category); 답글 톤앤매너 (greeting phrase input, tone chips 존댓말/친근한/간결한, emoji toggle, ongoing event input, forbidden-phrase tag input labeled "금지 표현"); on the right, a preview card showing a sample AI reply in the chosen tone. Bottom section "답글 자동화 수준" with three radio cards: 수동 승인 / 조건부 자동 / 완전 자동, shown disabled with a chip "Phase 2 예정".
```
