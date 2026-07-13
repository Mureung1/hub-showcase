---
name: meetry-page-builder
description: >-
  대학생 대면 소통 서비스(meetry)의 디자인 가이드(design.md) 및 완성된 반응형 웹 레이아웃을 기반으로 새로운 HTML 페이지를 생성하는 스킬.
  사용자가 "새 페이지 만들어줘", "~~ 페이지 추가해줘", "meetry 디자인으로 ~~를 만들어줘" 등의 요청을 할 때 활성화.
  오렌지 브랜드 컬러, 데스크톱 2컬럼 레이아웃, 상/하단 하이브리드 네비게이션, 필터 토글 접기 디자인 시스템을 일관되게 적용한다.
---

# meetry 페이지 빌더 스킬

이 스킬은 `docs/design.md`에 정의된 디자인 가이드와 완성된 `docs/community.html` 반응형 구조를 철저히 따라 meetry 서비스의 새로운 HTML 페이지를 생성한다.

## 디자인 시스템 핵심 토큰

디자인 가이드 전문: [`docs/design.md`](../../docs/design.md)  
레퍼런스 피드 화면: [`docs/community.html`](../../docs/community.html)  
상세 컴포넌트 가이드: [`references/components.md`](./references/components.md)  
CSS 베이스 템플릿: [`resources/base.css`](./resources/base.css)  
페이지 템플릿: [`resources/page-template.html`](./resources/page-template.html)

### 색상 (Color Tokens)
```css
--color-primary:       #FF6B35;   /* 태그 테두리, 불릿 */
--color-primary-cta:   #FF5A1F;   /* 플로팅/주요 액션 버튼 */
--color-primary-light: #FFF3EC;   /* 연한 오렌지 틴트(태그 배경) */
--color-text-primary:  #1A1A1A;   /* 제목, 기본 강조 텍스트 */
--color-text-secondary:#4B5563;   /* 부제목, 본문 텍스트 */
--color-text-tertiary: #9CA3AF;   /* 비활성 탭, 보조 설명 */
--color-text-meta:      #9CA3AF;   /* 메타 정보, 날짜 */
--color-bg:            #FFFFFF;   /* 카드/화면 백그라운드 */
--color-divider:       #F3F4F6;   /* 구분선 */
--color-body-bg:       #F3F4F6;   /* 데스크톱 전체 배경 */
```

### 타이포그래피
- 폰트: `'Noto Sans KR', 'Apple SD Gothic Neo', sans-serif`
- 로고: `'Outfit', sans-serif`, Bold(700), 오렌지 컬러
- 페이지 타이틀: 19px, Bold(700), `#1A1A1A`
- 카드 제목: 17px, Bold(700), `#1A1A1A`
- 본문 미리보기: 14.5px, Regular(400), `#4B5563`
- 카테고리 태그: 12px, Medium(500), `#FF6B35`

---

## 페이지 생성 및 리팩토링 절차

새 페이지를 만들거나 수정할 때 반드시 아래 순서를 따른다.

### Step 1: 기획 요건 분석
- 페이지가 어떤 데이터를 나타내는지 (예: 상세 정보, 글작성 폼, 대화 목록 등)
- 반응형 레이아웃 구성 요소를 어떻게 나눌지 정의 (예: 모바일에서는 하단 탭 바, 데스크톱에서는 2컬럼 우측 사이드바 구조 제공)

### Step 2: 파일 생성 및 템플릿 복사
- 새 HTML 파일은 `docs/` 디렉토리에 생성 (Kebab-case 권장, 예: `post-detail.html`)
- [`resources/page-template.html`](./resources/page-template.html)을 전체 복사하여 뼈대로 삼는다.

### Step 3: 웹 반응형 CSS 레이아웃 구조 조립
- 모바일 해상도(767px 이하): `max-width: 430px`, 하단 고정 내비게이션 바 노출
- 데스크톱 해상도(768px 이상): `max-width: 1060px` 확장, 헤더 우측 메뉴 탭 활성화, 하단 내비게이션 바 자동 감춤
- 2컬럼 배치가 필요한 경우 `.glist-layout`, `.feed-column`, `.sidebar-column` 클래스를 활용해 7:3 비율로 좌우 분할 제공

### Step 4: 컴포넌트 및 로직 연동
- [`references/components.md`](./references/components.md)를 참조하여 알맞은 컴포넌트(Header, Cards, Modal Dialog 등)를 삽입한다.
- 1:1 대화 연결 등 페이지 전환이 매끄럽게 흐르도록 `localStorage`와 데이터 상태를 공유/연동시킨다. (스토리지 키: `meetry-app-system-data`)

### Step 5: 자가 체크리스트
- [ ] 브랜딩 로고가 `meetry` 오렌지 색상으로 정상 표기되는가?
- [ ] 브라우저 탭 이름이 `meetry — [서비스명]`으로 되어 있는가?
- [ ] 768px 이상에서 2컬럼 반응형 레이아웃이 자연스럽게 적용되는가?
- [ ] 태그 필터 바가 존재할 경우 토글(`필터 접기/열기`) 버튼이 정상 작동하는가?
- [ ] 글 등록 및 상세 보기가 모바일에서는 전체 모달, 데스크톱에서는 가운데 플로팅 다이얼로그 팝업 형태로 작동하는가?
- [ ] 모든 데이터의 저장 및 영속화에 `meetry-app-system-data` LocalStorage 키를 올바르게 사용하는가?
- [ ] `prototype.html`에는 일절 간섭하지 않고 독립적으로 동작하는가?

---

## 주요 페이지 템플릿 목록

| 페이지 유형 | 권장 파일명 | 구성 핵심 |
|------------|------------|---------|
| 글목록 (커뮤니티) | `community.html` | 태그 필터 토글 + 2컬럼 구조 + 미니 프로필 사이드바 |
| 상세 보기 | `post-detail.html` | 뒤로가기 헤더 + 본문 상세 + 작성자 프로필 + 1:1 대화 신청 다이얼로그 |
| 글 작성 | `write-post.html` | 폼 레이아웃 + 학년/전공/주제 단일 선택 칩 + 보상 옵션 |
| 대화 목록 | `chat-list.html` | 참여 중인 1:1 대화 리스트 + 안 읽은 메시지 뱃지 실시간 연동 |
| 1:1 채팅방 | `chat-room.html` | 헤더 뒤로가기 + 실시간 스크롤 하단 고정 + 봇 자동 답변 시뮬레이션 |
| 내 프로필 | `my-profile.html` | 사용자 요약 정보 카드 + 활동 통계(글 수, 대화 수) + 내가 작성한 글 목록 |
