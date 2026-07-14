# SaaS Landing Page Interactions & Animations

모던 SaaS 랜딩페이지에서 공통적으로 쓰이는
hover/click 인터랙션과 스크롤 애니메이션 패턴 모음. 특정 사이트의 실제 코드를
역추출한 것이 아니라, 이 카테고리 사이트들에서 관용적으로 쓰이는 표준 패턴을
정리한 참고 자료임. 프로젝트에 적용할 때는 색상/타이밍 값을 브랜드에 맞게 조정할 것.

## 언제 이 스킬을 쓰나

- "Linear/Vercel/Kiro 스타일 랜딩페이지 만들어줘" 같은 요청
- 마케팅 페이지, 제품 소개 페이지, 온보딩 히어로 섹션 작업
- 카드/버튼/네비게이션에 "세련된 느낌"의 마이크로 인터랙션이 필요할 때

---

## 1. 기본 트랜지션 원칙

```css
:root {
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);   /* 빠르게 시작, 부드럽게 감속 - 대부분의 hover에 사용 */
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1); /* 진입/퇴장 대칭 애니메이션 */
  --dur-fast: 150ms;   /* 버튼, 링크 hover */
  --dur-base: 250ms;   /* 카드, 아이콘 상태 변화 */
  --dur-slow: 500ms;   /* 섹션 등장, 큰 레이아웃 변화 */
}
```

- `transition-property`는 항상 명시적으로 지정 (all은 피함 → 예상 못한 속성까지 애니메이션되는 문제 방지)
- 대부분의 hover 트랜지션은 **150~250ms**, scroll-reveal은 **400~600ms**가 자연스러움

### 실측 확인됨 (kiro.dev, devtools Computed 탭 캡처)

Kiro.dev는 커스텀 이징이 아니라 **Tailwind CSS 기본 유틸리티 클래스**를 그대로 사용:

```css
/* Tailwind 기본 transition-all 클래스 */
.transition-all {
  transition-property: all;
  transition-timing-function: cubic-bezier(.4, 0, .2, 1); /* Tailwind 기본 ease */
  transition-duration: .15s;
}

/* 반응형 유틸리티 조합 예시 (버튼 너비 제어) */
.\[\&_button\]\:w-full button { width: 100%; }
@media (min-width: 1024px) {
  .\[\&_button\]\:lg\:w-fit button {
    width: fit-content; /* -moz-fit-content 폴백 포함 */
  }
}
```

**시사점**: 화려한 커스텀 이징보다 Tailwind 프리셋(`transition-all`, `duration-150`, 기본 ease) 위주로 실용적으로 구성됨. 이 스타일을 재현할 때는 커스텀 cubic-bezier를 새로 만들기보다 Tailwind 기본 유틸리티(`transition-all duration-150`)를 그대로 쓰는 게 더 정확한 재현임.

> 참고: `transition-property: all`은 위 "명시적으로 지정" 원칙과 배치되지만, 실제 프로덕션 사이트(Kiro 포함)에서는 성능보다 개발 편의성 때문에 `transition-all`을 그대로 쓰는 경우가 흔함. 프로토타입/랜딩페이지엔 무방, 복잡한 인터랙티브 앱에는 명시적 property 지정 권장.

---

## 2. 네비게이션 링크 hover

```css
.nav-link {
  position: relative;
  color: var(--text-secondary);
  transition: color var(--dur-fast) var(--ease-out);
}
.nav-link:hover {
  color: var(--text-primary);
}

/* 밑줄이 왼쪽에서 오른쪽으로 그려지는 언더라인 */
.nav-link::after {
  content: "";
  position: absolute;
  left: 0; bottom: -2px;
  width: 100%; height: 1px;
  background: currentColor;
  transform: scaleX(0);
  transform-origin: right;
  transition: transform var(--dur-base) var(--ease-out);
}
.nav-link:hover::after {
  transform: scaleX(1);
  transform-origin: left;
}
```

---

## 3. Primary 버튼 (CTA)

```css
.btn-primary {
  background: #fff;
  color: #000;
  border-radius: 9999px;
  transition: transform var(--dur-fast) var(--ease-out),
              box-shadow var(--dur-fast) var(--ease-out);
}
.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 20px rgba(255,255,255,0.15);
}
.btn-primary:active {
  transform: translateY(0px) scale(0.98);
}

/* 화살표 아이콘이 hover 시 오른쪽으로 살짝 이동 */
.btn-primary .icon-arrow {
  transition: transform var(--dur-fast) var(--ease-out);
}
.btn-primary:hover .icon-arrow {
  transform: translateX(3px);
}
```

---

## 4. 카드 hover (기능 소개 카드, 제품 카드)

```css
.feature-card {
  border: 1px solid var(--border-subtle);
  transition: border-color var(--dur-base) var(--ease-out),
              transform var(--dur-base) var(--ease-out),
              background var(--dur-base) var(--ease-out);
}
.feature-card:hover {
  border-color: var(--border-hover);
  transform: translateY(-4px);
  background: var(--surface-elevated);
}
```

- 카드 내부 아이콘/일러스트에는 `transform: scale(1.05)` 정도의 미세한 확대만 추가 (과하면 싸구려 느낌)
- 그림자보다 **border-color 변화 + 미세한 translateY**가 요즘 트렌드 (Linear/Vercel 계열)

---

## 5. 반복/타이핑 텍스트 애니메이션 (히어로 헤딩)

같은 문구가 살짝 다른 스타일로 겹쳐 렌더링되는 경우, 보통 아래 중 하나:

**(A) Fade-in 교체형** — 문구가 페이드인/아웃하며 교체
```css
.hero-heading-variant {
  position: absolute;
  opacity: 0;
  animation: heading-fade 6s var(--ease-in-out) infinite;
}
@keyframes heading-fade {
  0%, 100% { opacity: 0; transform: translateY(8px); }
  10%, 90% { opacity: 1; transform: translateY(0); }
}
```

**(B) 텍스트 스크램블/디코드형** — 랜덤 글자가 정답 글자로 수렴 (더 테크한 느낌)
```js
function scrambleText(el, finalText, duration = 800) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let frame = 0;
  const totalFrames = Math.floor(duration / 16);
  const interval = setInterval(() => {
    el.textContent = finalText
      .split("")
      .map((char, i) => {
        if (i < (frame / totalFrames) * finalText.length) return char;
        return char === " " ? " " : chars[Math.floor(Math.random() * chars.length)];
      })
      .join("");
    frame++;
    if (frame > totalFrames) clearInterval(interval);
  }, 16);
}
```

---

## 6. 스크롤 트리거 등장 애니메이션

IntersectionObserver 기반 — lazy-load된 이미지/섹션이 뷰포트에 들어올 때 fade+slide

```js
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.15, rootMargin: "0px 0px -60px 0px" }
);
document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
```

```css
.reveal {
  opacity: 0;
  transform: translateY(24px);
  transition: opacity var(--dur-slow) var(--ease-out),
              transform var(--dur-slow) var(--ease-out);
}
.reveal.is-visible {
  opacity: 1;
  transform: translateY(0);
}
```

- 섹션마다 `transition-delay`를 50~100ms씩 stagger 주면 순차 등장 효과
- React라면 `framer-motion`의 `whileInView` prop이 동일 역할

```jsx
import { motion } from "framer-motion";

<motion.div
  initial={{ opacity: 0, y: 24 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true, amount: 0.15 }}
  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
>
  {content}
</motion.div>
```

---

## 7. 모델/드롭다운 셀렉터 (호버 시 서브메뉴 등)

```css
.dropdown-trigger { position: relative; }
.dropdown-menu {
  opacity: 0;
  visibility: hidden;
  transform: translateY(-8px);
  transition: opacity var(--dur-base) var(--ease-out),
              transform var(--dur-base) var(--ease-out),
              visibility 0s var(--dur-base);
}
.dropdown-trigger:hover .dropdown-menu,
.dropdown-trigger:focus-within .dropdown-menu {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
  transition-delay: 0s;
}
```

---

## 8. 로고/파트너 marquee (무한 슬라이드)

```css
.logo-track {
  display: flex;
  gap: 48px;
  animation: marquee 25s linear infinite;
}
@keyframes marquee {
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); } /* 콘텐츠를 2배 복제해서 이어붙임 */
}
.logo-track:hover {
  animation-play-state: paused;
}
```

---

## 9. 코드/터미널 데모 재생 (asciinema-style cast)

`Loading cast file...` 같은 placeholder는 보통 asciinema 캐스트 재생 컴포넌트:
- 페이지 로드 후 지연 재생(autoplay muted, 스크롤 진입 시 시작)
- 터미널 프레임 안에서 타이핑 커서 깜빡임(`animation: blink 1s step-end infinite`)

```css
.terminal-cursor {
  animation: blink 1s step-end infinite;
}
@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}
```

---

## 체크리스트 (적용 시)

- [ ] 모든 hover는 150~250ms, ease-out 계열 곡선 사용
- [ ] `transition: all` 금지, 속성 명시
- [ ] 카드 hover는 그림자보다 border+translateY 우선 고려
- [ ] 스크롤 등장은 IntersectionObserver 또는 framer-motion `whileInView`
- [ ] 반복 텍스트/타이핑 효과는 과용 금지 — 히어로 1곳 정도만
- [ ] 다크 테마 기준 그림자는 `rgba(255,255,255,0.x)` glow 방식이 자연스러움
- [ ] prefers-reduced-motion 미디어 쿼리로 접근성 대응

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```