# Design Direction

## Purpose

이 문서는 현재 구현된 독서 집중 모임 MVP를 참고 이미지의 무드에 맞춰 다시 디자인하기 위한 기준 문서다. 목표는 기능을 바꾸는 것이 아니라, 같은 흐름을 더 따뜻하고 신뢰감 있는 "조용한 독서 라운지"처럼 느끼게 만드는 것이다.

유지해야 할 제품 루프는 `짧게 시작 -> 정해진 시간 동안 읽기 -> 끝난 직후 기록 -> 내 기록에서 다시 읽기`다.

## Reference Read

참고 이미지 경로:

- `/mnt/c/Users/aidu2/Downloads/design1.jpg`
- `/mnt/c/Users/aidu2/Downloads/design2.jpg`
- `/mnt/c/Users/aidu2/Downloads/design3.jpg`
- `/mnt/c/Users/aidu2/Downloads/design4.jpg`

이미지에서 가져올 방향:

- `design1`: 서재, 책장, 기록 카드, 감정 태그, 따뜻한 종이색 배경. 독서 앱에 가장 직접적으로 맞는 레퍼런스다.
- `design2`: 세이지 그린, 유기적인 곡선, 큰 세리프 타이포, 부드러운 상담/웰니스 무드. 앱 전체의 정서적 톤에 참고한다.
- `design3`: 자연 소재 커머스 UI, 명확한 히어로, 아이콘 신뢰 배지, 제품 카드의 정돈된 밀도. 방 카드와 빠른 시작 카드에 참고한다.
- `design4`: 인테리어 스튜디오형 편집 레이아웃, 넓은 여백, 큰 세리프 제목, 얇은 선, 블랙 CTA. PC 웹 레이아웃의 밀도와 고급감을 참고한다.

직접 복제하지 말고, 공통 원칙만 제품에 맞게 번역한다. 외부 이미지나 책 표지 이미지를 그대로 사용하지 않는다.

## Core Concept

디자인 키워드는 `Quiet Reading Lounge`다.

앱은 생산성 대시보드처럼 보이면 안 된다. 사용자가 방에 들어갔을 때 "누가 시키는 집중"이 아니라 "조용한 서재 한쪽 자리에 앉는 느낌"을 받아야 한다. 커뮤니티성은 크게 떠들썩하게 보여주지 않고, 같은 리듬으로 읽는 사람들의 존재감만 은근히 보여준다.

핵심 인상:

- 따뜻한 종이와 나무 선반
- 세이지와 모스 그린의 차분함
- 큰 세리프 제목과 작은 산세리프 설명
- 얇은 라인 아이콘과 북마크 같은 배지
- 낮은 채도의 CTA, 과한 glow나 purple gradient 없음

## Visual Tokens

### Color

기본 팔레트는 크림, 세이지, 모스, 오크, 잉크로 제한한다.

```text
paper:       #f5efe3
paper-deep:  #eadfcf
card:        #fffaf1
sage:        #dfe6c4
sage-strong: #aebd82
moss:        #3f5632
moss-deep:   #26351f
oak:         #b88955
clay:        #9d6744
ink:         #252018
muted-ink:   #6f675b
line:        rgba(63, 86, 50, 0.18)
soft-shadow: rgba(60, 48, 30, 0.12)
```

사용 원칙:

- 배경은 `paper`와 `paper-deep`의 아주 약한 레이어로 만든다.
- 주요 CTA는 `moss` 또는 `moss-deep`을 쓴다.
- 보조 CTA와 태그는 `sage`, `card`, `oak`을 섞는다.
- 오류는 붉은색을 쓰되 채도를 낮춰 전체 톤과 충돌하지 않게 한다.
- 보라색, 네온색, 다색 그라디언트는 쓰지 않는다.

### Typography

제목은 세리프, 본문과 UI 컨트롤은 산세리프를 쓴다.

권장:

- Display: `Cormorant Garamond`, `Fraunces`, `Libre Baskerville`, `Georgia`, serif
- UI/body: 현재 프로젝트의 `Geist Variable`, `Pretendard`, sans-serif 유지

적용 원칙:

- 화면 제목과 큰 섹션 제목은 세리프를 쓴다.
- 버튼, 입력, 라벨, 수치, 상태 배지는 산세리프를 쓴다.
- 제목은 넓게 키우되 자간을 억지로 벌리지 않는다.
- 긴 한국어 문장은 줄 길이를 짧게 잡고, 한 화면에 너무 많은 설명을 쌓지 않는다.

### Shape And Surface

기본 표면은 종이 카드처럼 보여야 한다.

- Page shell: 최대 너비 1120px에서 중앙 정렬
- Hero radius: 32px
- Card radius: 22px to 28px
- Button radius: 999px 또는 14px
- Border: 1px solid `line`
- Shadow: 넓고 부드러운 낮은 그림자
- Divider: 얇은 선 또는 선반처럼 보이는 horizontal rail

카드 안쪽 여백은 넉넉하게 잡되, MVP 정보가 묻히지 않게 한다.

### Icon And Ornament

아이콘은 `lucide-react`의 얇은 라인 스타일을 유지한다.

- stroke는 1.5 to 1.75 느낌으로 가볍게 보이게 한다.
- 책, 잎, 북마크, 램프, 시계, 펜 아이콘을 우선한다.
- 장식용 아이콘은 `aria-hidden` 처리한다.
- 의미가 있는 아이콘 버튼은 반드시 `aria-label`을 둔다.

장식은 배경의 곡선, 선반 라인, 작은 잎사귀 모티프 정도로 제한한다. 과한 blob, glow, floating object는 피한다.

## Layout System

전체 앱은 PC 웹 MVP를 기준으로 한다. 모바일은 MVP 범위 밖이지만, 좁은 화면에서 깨지지 않게 1열로 자연스럽게 내려가야 한다.

페이지 구조:

- 상단에는 얇고 조용한 header를 둔다.
- 본문은 `section` 단위의 editorial layout으로 나눈다.
- 주요 화면은 좌측에 큰 메시지, 우측에 실행 카드 또는 상태 카드를 배치한다.
- 목록 화면은 상단 히어로와 하단 카드 그리드를 분리한다.
- 진행 중 세션과 기록 대기는 최상단에서 바로 보이게 한다.

공간감:

- 화면 바깥 배경은 크림색으로 넓게 둔다.
- 주요 컨텐츠는 paper card 위에 올라간 듯 보여준다.
- 카드끼리 붙이지 말고, 선반 또는 테이블 위에 놓인 개체처럼 간격을 둔다.

## Screen Direction

### Onboarding

목표는 "회원가입"이 아니라 "오늘 읽을 자리 만들기"처럼 느끼게 하는 것이다.

구조:

- 큰 세리프 headline: `오늘 읽을 자리를 먼저 정해요`
- 보조 카피: 로그인 없이 닉네임만으로 시작하고 브라우저에 저장됨을 짧게 안내
- 닉네임 입력 카드는 따뜻한 종이 패널로 구성
- `시작하기`는 moss CTA
- `샘플 데이터로 둘러보기`는 얇은 outline 또는 sage 버튼
- 제품 설명은 카드 3개 이하로 압축

시각 요소:

- 책장/독서 램프를 직접 이미지로 쓰기보다 CSS 선반 라인과 작은 book tile로 표현
- `14일 내 3회 세션` 목표는 작은 bookmark badge로 표시

### Room List

목표는 방 목록을 관리 테이블이 아니라 "읽을 분위기를 고르는 서가"처럼 보이게 하는 것이다.

구조:

- 상단 hero에 현재 사용자 이름과 오늘의 CTA를 표시
- `빠른 시작`, `방 만들기`, `내 기록`은 action strip으로 분명히 나눈다.
- 기록 대기 배너는 최상단에서 눈에 띄되 경고처럼 보이지 않게 한다.
- 방 카드는 2열 또는 3열 그리드로 두고, 각 카드는 작은 책 등표/북마크 느낌의 accent rail을 가진다.

방 카드 정보 우선순위:

- 방 제목
- 15/30/60분
- 토론 없음 또는 짧은 대화
- 입문자 환영
- 최근 완료 기록
- 참여자와 감상 수

스타일:

- 카드 배경은 `card`
- 카드 상단 또는 좌측에 `moss`, `oak`, `sage-strong` accent strip
- hover는 살짝 위로 이동하거나 그림자만 증가
- hover가 없어도 클릭 가능성이 보이게 버튼/화살표를 유지

### Quick Start

목표는 빠르게 타이머로 보내는 것이 아니라, 부담 없는 리추얼 선택처럼 보이게 하는 것이다.

구조:

- 제목: `오늘의 읽기 리듬을 고르세요`
- 4개 템플릿을 ritual card로 구성
- 각 카드에는 시간, 분위기, 추천 상황을 명확히 표시
- 이미 진행 중 세션이나 기록 대기가 있으면 새 선택보다 복귀 CTA를 우선한다.

카드 톤:

- `30분 조용히 읽기`: moss
- `15분 짧게 시작`: sage
- `토론 없이 한 줄 감상`: oak
- `입문자 환영 방`: paper card with moss outline

### Room Create

목표는 설정 폼이 아니라 "독서 자리를 만드는 카드"처럼 느끼게 하는 것이다.

구조:

- 제목/설명 입력은 넓은 paper form card에 배치
- 시간 선택은 segmented card로 시각화
- 토론 여부와 입문자 환영은 작은 toggle row
- 오류는 필드 바로 아래에 표시

주의:

- 입력 필드 label은 항상 보여준다.
- 필수 입력 오류는 `aria-describedby`, `aria-invalid`를 연결한다.
- 긴 설명을 쓰지 않아도 방을 만들 수 있게 placeholder가 예시를 준다.

### Room Detail

목표는 "시작 전 확인"을 명확하게 하면서도 방 분위기를 기대하게 하는 것이다.

구조:

- 상단에 방 제목과 설명을 크게 표시
- 빠른 시작 유입이면 `30분 조용히 읽기 방이 준비됐어요`를 bookmark badge로 표시
- 세션 시간, 토론 여부, 입문자 여부를 3개 info tile로 배치
- 최근 완료 기록과 감상 수는 작은 shelf stats로 표시
- 주요 CTA는 `30분 읽기 시작`, `15분 읽기 시작`처럼 구체적으로 쓴다.

스타일:

- CTA는 진한 moss pill button
- `다시 고르기` 또는 `목록으로`는 조용한 secondary action
- 방 상세은 큰 card 하나와 우측 작은 stats card 조합이 적합하다.

### Timer

목표는 생산성 타이머보다 "독서 중인 자리"에 가깝게 보이게 하는 것이다.

구조:

- 가장 큰 요소는 남은 시간
- 타이머는 원형 progress 또는 큰 paper circle로 표현
- 방 제목과 세션 조건은 작게 유지
- active 상태에서는 기록 CTA를 비활성화하고 이유를 명확히 표시
- 종료 후에는 `기록 작성하기` CTA가 가장 먼저 보인다.

스타일:

- 배경은 다른 화면보다 더 조용하게, 장식을 줄인다.
- 이탈 횟수는 경고색보다 muted text와 작은 icon으로 표시한다.
- 타이머 숫자는 `tabular-nums`를 적용한다.

### Record Form

목표는 과제 제출 폼이 아니라 "책을 덮기 전 한 줄 일지"처럼 보이게 하는 것이다.

구조:

- 상단에 세션 요약 카드
- 책 제목
- 감상
- 페이지 범위
- 저장 CTA
- `나중에 작성` 또는 뒤로 가기는 secondary action

스타일:

- textarea는 노트 카드처럼 보이게 한다.
- 페이지 입력은 작은 2열 field로 배치한다.
- 보조 문구 `정확하지 않아도 괜찮아요`는 muted ink로 표시한다.

### Records

목표는 기록 목록을 데이터 로그가 아니라 개인 독서 저널처럼 보이게 하는 것이다.

구조:

- 상단에는 최근 14일 목표 진행률을 작고 명확하게 표시
- 완료 기록, 기록 대기, 샘플을 badge로 구분
- 기록 카드는 책 제목, 날짜, 페이지 범위, 감상 한 줄을 우선 표시
- 상세는 모달로 열고, `방에 다시 입장` 또는 `같은 방 다시 읽기` CTA를 유지한다.

스타일:

- 기록 카드는 journal entry 카드
- 샘플 데이터는 `샘플` badge를 붙이고 실제 진행률과 구분
- `기록 대기`는 따뜻한 oak 계열 badge로 표시한다.

### Dialogs And Empty States

모달은 작은 종이 카드처럼 보이되, destructive action은 명확히 분리한다.

빈 상태는 한 가지 다음 행동만 강조한다.

예시:

- 방이 없을 때: `첫 독서 자리를 만들어 볼까요?`
- 기록이 없을 때: `아직 남긴 문장이 없어요`
- 기록 대기: `책을 덮기 전에 한 줄만 남기면 완료돼요`

## Copy Tone

문장은 따뜻하지만 과하게 감성적이지 않아야 한다. 사용자가 해야 할 행동을 바로 알 수 있어야 한다.

권장 문구:

- `오늘 읽을 자리를 고르세요`
- `30분 조용히 읽기 방이 준비됐어요`
- `책을 덮기 전에 한 줄만 남겨요`
- `정확하지 않아도 괜찮아요. 오늘 읽은 범위를 대략 남겨주세요.`
- `샘플은 목표 진행률에 포함되지 않아요`

피할 문구:

- `최고의 독서 경험`
- `AI 추천으로 완벽하게`
- `폭발적인 성장`
- `지금 바로 생산성을 올리세요`

## Motion

모션은 적게 쓰고 의미 있게 쓴다.

허용:

- 화면 진입 시 card opacity + translateY 8px 이내
- 카드 hover 시 translateY -2px 이내
- progress 변화는 transform 또는 stroke 기반
- dialog open/close opacity + scale 0.98 to 1

제약:

- interaction feedback은 200ms 이하
- 큰 blur, glow, backdrop-filter animation 금지
- layout property animation 금지
- `prefers-reduced-motion` 존중
- loop animation은 쓰지 않는다.

## Accessibility

디자인 변경 시 기능 접근성을 후퇴시키면 안 된다.

필수:

- 모든 icon-only button에는 `aria-label`
- 입력 필드에는 visible label
- 오류 메시지는 필드와 연결
- focus outline은 제거하지 말고 디자인 톤에 맞게 커스텀
- 색만으로 상태를 구분하지 않기
- dialog는 기존 shadcn/Radix focus trap 유지
- 카드 전체 클릭을 쓰더라도 내부에 명확한 button/link affordance 제공

## Implementation Notes

현재 프로젝트 기준:

- React/Vite 앱은 `client/src/App.jsx`
- 전역 테마는 `client/src/styles.css`
- shadcn/ui 로컬 컴포넌트는 `client/src/components/ui`
- 주요 제품 문서는 `client/docs`

구현 방향:

- 먼저 `styles.css`의 theme token을 새 팔레트와 radius로 정리한다.
- 기존 view/state/localStorage 로직은 유지하고 JSX className 중심으로 화면을 재구성한다.
- 세리프 display font는 가능하면 fontsource 패키지로 추가하되, 의존성 추가가 부담이면 `Georgia` fallback으로 먼저 구현한다.
- 새 이미지를 외부에서 가져오지 말고 CSS shape, line, card, icon으로 분위기를 만든다.
- shadcn primitives는 유지하되, 버튼/카드/입력의 className을 제품 톤에 맞춰 변형한다.
- 제품 용어 정책은 `client/docs/product-prd.md`를 따른다. 특히 `readyToRecord`는 화면에 직접 노출하지 않고 `기록 대기`로만 표시한다.

## Acceptance Criteria

디자인 수정 후 다음 기준을 만족해야 한다.

- 첫 화면에서 앱이 독서/서재/라운지 계열 서비스로 즉시 인식된다.
- `빠른 시작`, `기록 대기`, `기록 작성하기` CTA가 기존보다 더 명확하다.
- 방 카드와 기록 카드가 일반 SaaS 카드가 아니라 독서 제품의 카드처럼 보인다.
- 참고 이미지의 크림/세이지/모스/오크 무드가 보이지만, 직접 복제처럼 보이지 않는다.
- 보라색 그라디언트, 과한 glow, 무의미한 장식 blob이 없다.
- 온보딩부터 기록 저장까지 기존 MVP 플로우가 그대로 작동한다.
- keyboard focus, label, dialog 접근성이 유지된다.
