# Design Skill — UI 토큰 및 컴포넌트 모음

간단한 디자인 스킬 패키지입니다. CSS 변수(토큰)와 스코프된 컴포넌트 스타일을 포함합니다. 데모 파일(`index.html`)을 열어 디자인을 확인하세요.

사용법

1. 파일을 프로젝트에 복사합니다: `design-tokens.css`, `skill.css` (또는 호스팅 경로)
2. HTML에 포함합니다:

```html
<link rel="stylesheet" href="path/to/design-tokens.css">
<link rel="stylesheet" href="path/to/skill.css">
```

3. 마크업 클래스는 `ds-` 접두사를 사용합니다. 예: `<div class="ds-card">` 등의 컴포넌트를 사용하세요.

간단한 예시

```html
<div class="ds-card">
  <h3>리뷰 제목</h3>
  <p class="ds-text">리뷰 내용...</p>
</div>
```

확장과 맞춤화

- 토큰(`design-tokens.css`)의 변수 값을 변경하면 전체 디자인 톤이 바뀝니다.
- `skill.css`를 참고해 필요한 컴포넌트를 복사·확장해 사용하세요.
