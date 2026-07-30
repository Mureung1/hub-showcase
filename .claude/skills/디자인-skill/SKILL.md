---
name: 디자인-skill
description: 멘토 매칭 서비스 UI를 만들거나 스타일링할 때 사용한다. UI, 화면, 컴포넌트, 스타일 관련 작업이면 명시적 요청이 없어도 반드시 이 스킬을 확인해야 한다. 멘토/멘티 화면을 위한 공통 CSS 디자인 토큰과 재사용 가능한 클래스(색상, 타이포그래피, 여백, 라운드, 카드, 입력창, 버튼, 태그, 하단 CTA 바 포함)를 제공한다.
---

# 멘토 디자인 시스템

멘토 매칭 서비스의 화면을 새로 만들거나 수정할 때 이 스킬을 사용한다.

## CSS 소스

공통 스타일 소스로 `assets/mentor-design-skill.css`를 사용한다.

HTML/CSS 프로토타입의 경우:

```html
<link rel="stylesheet" href="assets/mentor-design-skill.css">
```

React의 경우:

```jsx
import "./styles/mentor-design-skill.css";
```

## 시각적 규칙

- 주요 액션 색상으로 `#2563eb`을 사용한다.
- 페이지 배경으로 `#eef3f8`을 사용한다.
- 흰색 카드에 옅은 테두리와 은은한 그림자를 사용한다.
- 제목에는 거의 검정에 가까운 텍스트를, 보조 텍스트에는 블루그레이 계열의 muted 텍스트를 사용한다.
- 한글 텍스트에는 system UI와 `Noto Sans KR`을 함께 사용한다.
- 카드, 필드, 태그, 버튼의 기본 radius로 `8px`을 사용한다.
- 콘텐츠 너비는 `980px` 내외로 유지한다.
- 마케팅용 히어로 레이아웃보다는 컴팩트한 서비스 UI 레이아웃을 우선한다.

## 재사용 가능한 클래스

일회성 스타일을 추가하기 전에 다음 클래스들을 우선 사용한다:

- `.page-header`
- `.page-container`
- `.stack`
- `.eyebrow`
- `.page-title`
- `.card-title`
- `.body-text`
- `.muted-text`
- `.card`
- `.card-muted-box`
- `.field`
- `.button`
- `.button-primary`
- `.button-soft`
- `.button-neutral`
- `.tag`
- `.tag-list`
- `.cta-bar`
- `.cta-bar-fixed`

## 멘토 화면 가이드

- 각 멘토 프로필 또는 요청 항목에는 `.card`를 사용한다.
- 연구 키워드에는 `.tag-list`와 `.tag`를 사용한다.
- 전공, 연구실, 가능 시간 등의 메타데이터에는 `.card-muted-box`를 사용한다.
- 프로필 상세 보기 같은 보조 액션에는 `.button-soft`를 사용한다.
- 미팅 신청과 같은 주요 액션에는 `.button-primary`를 사용한다.
- 하단 고정 신청 바에는 `.cta-bar.cta-bar-fixed`를 사용한다.

## 폼 가이드

- 텍스트 입력창과 textarea에는 `.field`를 사용한다.
- 제출 액션에는 `.button-primary`를 사용한다.
- 뒤로가기/취소 액션에는 `.button-neutral` 또는 `.button-soft`를 사용한다.

## 피해야 할 것

- 명시적으로 요청받지 않는 한 다른 주요 팔레트를 도입하지 않는다.
- 일반적인 카드와 컨트롤에는 `10px`를 넘는 큰 radius를 사용하지 않는다.
- 이미 존재하는 토큰이 있는데 색상, 여백, 그림자를 하드코딩하지 않는다.
