# Component Code Patterns (React)

이 문서는 `default-design-rule` 스킬이 참조하는 **기존에 확립된 컴포넌트 코드 패턴**이다.
새 컴포넌트를 만들 때는 여기 있는 컴포넌트와 최대한 같은 구조(파일 구성, props 네이밍,
className 네이밍, 상태 처리 방식)를 따른다. 여기 없는 새로운 컴포넌트를 만들 때도
이 패턴들을 참고해서 "이 시스템에서 만들었을 법한" 방식으로 만든다.

## 공통 규칙

- 모든 컴포넌트는 `import '../styles/tokens.css'`(또는 프로젝트 경로에 맞게)를 최상단, 또는
  앱 전역에서 한 번만 로드한다고 가정한다. 컴포넌트 파일에 매번 넣지 않아도 되지만,
  이 스킬로 새 컴포넌트를 만들 때는 CSS 변수(`var(--td-...)`)가 이미 로드돼 있다고 전제한다.
- **색상, 폰트, radius, spacing 값을 절대 하드코딩하지 않는다.** 항상 `tokens.css`의
  CSS 변수를 참조한다. 새 값이 필요하면(토큰에 없는 값) 토큰 파일에 먼저 추가하고 쓴다.
- className은 `td-` 접두사 + BEM 스타일(`td-block__element--modifier`)을 쓴다.
  예: `td-button`, `td-button--primary`, `td-button--secondary`, `td-card__image`.
- 컴포넌트 파일 하나당: `ComponentName.jsx` + `ComponentName.css` 쌍으로 분리한다
  (CSS-in-JS, styled-components, Tailwind 클래스 사용하지 않음 — 순수 CSS 파일).
- Props는 다음 순서로 관례를 둔다: 필수 콘텐츠 props → 상태/variant props(`variant`,
  `status` 등) → 이벤트 핸들러(`onClick` 등) → `className`(추가 확장용, optional).
- 함수형 컴포넌트 + 이름 있는 export를 기본으로 한다 (`export function Button(...)`),
  default export는 페이지 최상위 컴포넌트에만 사용한다.

---

## Button

```jsx
// Button.jsx
import './Button.css';

export function Button({
  children,
  variant = 'primary', // 'primary' | 'secondary' | 'icon'
  onClick,
  className = '',
}) {
  return (
    <button
      className={`td-button td-button--${variant} ${className}`.trim()}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
```

```css
/* Button.css */
.td-button {
  font-family: var(--td-font-family);
  font-size: 14px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  padding: 10px 20px;
  transition: background-color 0.15s ease, transform 0.15s ease;
}

.td-button--primary {
  background: var(--td-primary-container);
  color: var(--td-on-primary);
  border-radius: var(--td-radius-full); /* 버튼은 pill 모양 */
}

.td-button--secondary {
  background: var(--td-mint-green);
  color: var(--td-primary);
  border-radius: var(--td-radius); /* 8px */
}

.td-button--icon {
  background: transparent;
  color: var(--td-primary);
  border-radius: var(--td-radius-full);
  padding: 8px;
}
.td-button--icon:hover {
  background: var(--td-surface-container-low);
}
```

## Card (product card)

```jsx
// ProductCard.jsx
import './ProductCard.css';

export function ProductCard({ image, category, title, price, progress }) {
  return (
    <div className="td-card">
      <div className="td-card__image">
        <img src={image} alt={title} />
        {category && <span className="td-card__tag">{category}</span>}
      </div>
      <div className="td-card__body">
        <p className="td-card__title td-body-lg">{title}</p>
        <p className="td-card__price td-label-md">{price}</p>
        <ProgressBar value={progress} />
      </div>
    </div>
  );
}
```

```css
/* ProductCard.css */
.td-card {
  background: var(--td-surface-container-lowest);
  border-radius: var(--td-radius-card); /* 20px */
  box-shadow: var(--td-shadow-card);
  padding: 16px;
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}
.td-card:hover {
  box-shadow: var(--td-shadow-card-hover);
  transform: scale(var(--td-scale-hover));
}

.td-card__image {
  position: relative;
  background: var(--td-surface-muted);
  border-radius: var(--td-radius); /* 8px */
  overflow: hidden;
}
.td-card__image img {
  width: 100%;
  display: block;
}

.td-card__tag {
  position: absolute;
  top: 6px;
  left: 6px;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(6px);
  border-radius: 6px;
  padding: 2px 8px;
  font-family: var(--td-font-family);
  font-size: 11px;
  font-weight: 700;
  color: var(--td-on-surface);
}
```

## Progress Bar

```jsx
// ProgressBar.jsx
import './ProgressBar.css';

export function ProgressBar({ value /* 0–100 */ }) {
  return (
    <div className="td-progress">
      <div className="td-progress__fill" style={{ width: `${value}%` }} />
    </div>
  );
}
```

```css
/* ProgressBar.css */
.td-progress {
  height: 8px;
  border-radius: var(--td-radius-full);
  background: var(--td-surface-container-high);
  overflow: hidden;
}
.td-progress__fill {
  height: 100%;
  background: var(--td-primary-container);
  border-radius: var(--td-radius-full);
}
```

## Input (search)

```jsx
// SearchInput.jsx
import './SearchInput.css';

export function SearchInput({ value, onChange, placeholder = '검색' }) {
  return (
    <div className="td-input">
      <SearchIcon className="td-input__icon" />
      <input
        className="td-input__field"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}
```

```css
/* SearchInput.css */
.td-input {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--td-surface-container-lowest);
  border: 1px solid var(--td-border-light);
  border-radius: var(--td-radius-full);
  padding: 10px 16px;
  transition: border-color 0.15s ease;
}
.td-input:focus-within {
  border-color: var(--td-primary);
}
.td-input__field {
  border: none;
  outline: none;
  font-family: var(--td-font-family);
  font-size: 14px;
  flex: 1;
  background: transparent;
  color: var(--td-on-surface);
}
```

## Chip / Tag

이미 `ProductCard`의 `.td-card__tag`가 대표 패턴. 카드 밖에서 단독으로 쓸 때는:

```jsx
// Chip.jsx
import './Chip.css';

export function Chip({ children }) {
  return <span className="td-chip td-label-sm">{children}</span>;
}
```

```css
/* Chip.css */
.td-chip {
  display: inline-block;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(6px);
  border-radius: 6px;
  padding: 2px 8px;
  color: var(--td-on-surface);
}
```
