# Desktop App (Electron/IDE-style) Interactions & Animations

Electron 기반 에디터/IDE 계열 데스크톱 앱(예: DevChat/ICU, VS Code, Cursor 스타일)에서
쓰이는 인터랙션·애니메이션 패턴 모음. 마케팅 랜딩페이지와 달리 **상시 노출되는 작업 화면**이
전제이므로, 화려한 연출보다 절제되고 네이티브스러운 반응성이 우선.

## 언제 이 스킬을 쓰나

- Electron/Tauri 기반 데스크톱 앱 UI 작업
- 에디터 패널, 사이드바, 탭, 스플릿 뷰가 있는 IDE류 화면
- AI 스트리밍 응답, 코드 실행 결과, 힌트/리뷰 표시 등 비동기 상태가 있는 화면
- `saas-landing-interactions-SKILL.md`와는 별도로 사용 — 랜딩페이지 패턴(스크롤 reveal, marquee, 히어로 텍스트 효과)은 이 앱 유형에는 적용하지 않음

---

## 0. 기본 원칙

- **트랜지션은 짧고 은은하게**: 100~200ms, `ease-out` 정도. 랜딩페이지의 300ms+ 화려한 연출은 "장난감 같다"는 인상을 줌
- **hover보다 focus/active/selected 상태가 우선**: 마우스보다 키보드 중심 워크플로우가 많음
- **`transition-all` 지양**: 에디터는 리렌더링이 잦으므로 명시적 property 지정이 성능상 중요
- **다크 테마 기본, 은은한 대비**: 순수 검정(#000)보다 `#1e1e1e` ~ `#16161d` 계열이 눈 피로도 낮음

```css
:root {
  --dur-instant: 80ms;   /* 버튼 press, 체크박스 토글 */
  --dur-fast: 150ms;     /* 탭 전환, hover */
  --dur-base: 200ms;     /* 패널 슬라이드, 모달 등장 */
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
}
```

---

## 1. 탭 / 사이드바 아이템 선택 상태

Hover는 보조 신호일 뿐, **선택된(active) 상태 표시가 핵심**.

```css
.tab {
  border-bottom: 2px solid transparent;
  color: var(--text-secondary);
  transition: color var(--dur-fast) var(--ease-out),
              border-color var(--dur-fast) var(--ease-out);
}
.tab:hover {
  color: var(--text-primary);
  background: var(--surface-hover); /* 아주 은은하게, opacity 5~8% 수준 */
}
.tab.is-active {
  color: var(--text-primary);
  border-bottom-color: var(--accent);
}

.sidebar-item.is-selected {
  background: var(--surface-selected);
  border-left: 2px solid var(--accent);
}
```

키보드 포커스는 반드시 별도 스타일로 구분 (마우스 hover와 혼동 금지):
```css
.tab:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: -2px;
}
```

---

## 2. 패널 리사이즈 (Monaco Editor split-screen 등)

```css
.splitter {
  width: 4px;
  cursor: col-resize;
  background: transparent;
  transition: background var(--dur-fast) var(--ease-out);
}
.splitter:hover,
.splitter.is-dragging {
  background: var(--accent);
}

/* 드래그 중에는 iframe/에디터 위에 투명 오버레이를 씌워서
   마우스가 에디터 내부 텍스트 선택을 트리거하지 않도록 함 */
.resize-overlay {
  position: fixed;
  inset: 0;
  cursor: col-resize;
  z-index: 9999;
}
```

```js
function usePanelResize(onResize) {
  const [isDragging, setDragging] = useState(false);

  const startDrag = (e) => {
    setDragging(true);
    const startX = e.clientX;

    const handleMove = (moveEvent) => {
      const delta = moveEvent.clientX - startX;
      onResize(delta); // 부모 state 업데이트, requestAnimationFrame으로 스로틀 권장
    };
    const handleUp = () => {
      setDragging(false);
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
    };
    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
  };

  return { isDragging, startDrag };
}
```

- 드래그 중 실시간 리사이즈는 `requestAnimationFrame`으로 스로틀링 (매 mousemove마다 리렌더하면 끊김)
- 리사이즈 자체엔 transition 넣지 않음 (실시간 드래그에 transition 걸면 손이 밀리는 듯한 랙 발생) — 오직 손을 뗀 후 스냅 애니메이션에만 짧은 transition

---

## 3. AI 스트리밍 응답 (DevChat 핵심 패턴)

**타이핑 인디케이터** (응답 대기 중):
```css
.typing-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--text-secondary);
  animation: typing-bounce 1.2s ease-in-out infinite;
}
.typing-dot:nth-child(2) { animation-delay: 0.15s; }
.typing-dot:nth-child(3) { animation-delay: 0.3s; }

@keyframes typing-bounce {
  0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
  30% { transform: translateY(-4px); opacity: 1; }
}
```

**스트리밍 텍스트 등장** (토큰 단위로 텍스트가 이어질 때):
```css
.stream-token {
  animation: token-in 150ms ease-out;
}
@keyframes token-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
```
- 토큰마다 개별 애니메이션은 성능 부담 → 실무에서는 애니메이션 없이 그냥 텍스트를 append만 하고, **커서 blink만** 마지막 글자 뒤에 표시하는 방식이 더 흔하고 성능도 좋음

```css
.stream-cursor::after {
  content: "▍";
  animation: blink 1s step-end infinite;
  color: var(--accent);
}
@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}
```

---

## 4. 코드 실행 결과 / 테스트 통과-실패 피드백

```css
.result-success {
  border-left: 3px solid var(--success);
  animation: result-slide-in var(--dur-base) var(--ease-out);
}
.result-error {
  border-left: 3px solid var(--danger);
  animation: result-slide-in var(--dur-base) var(--ease-out),
             shake 300ms ease-in-out;
}

@keyframes result-slide-in {
  from { opacity: 0; transform: translateY(-6px); }
  to   { opacity: 1; transform: translateY(0); }
}
/* 실패 시 아주 미세한 shake로 주의 환기 (과하면 짜증나므로 진폭 최소화) */
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-2px); }
  75% { transform: translateX(2px); }
}
```

- 에러 라인 하이라이트는 Monaco의 `deltaDecorations` API로 처리 (CSS만으로는 에디터 내부 라인 제어 불가)
- 성공/실패 색상은 채도를 낮춰서(`success: #4ade80` 대신 `#86efac` 계열처럼) 장시간 작업 시 눈 피로 방지

---

## 5. 힌트 / 리뷰 패널 등장

```css
.hint-panel {
  animation: hint-in var(--dur-base) var(--ease-out);
  transform-origin: top;
}
@keyframes hint-in {
  from { opacity: 0; transform: scaleY(0.95) translateY(-4px); }
  to   { opacity: 1; transform: scaleY(1) translateY(0); }
}
```

- 힌트 단계(1→2→3차)가 올라갈수록 패널이 완전히 새로 마운트되지 않고, **기존 패널 안에서 콘텐츠만 교체 + 짧은 crossfade** 권장 (매번 패널이 통째로 사라졌다 나타나면 산만함)

```css
.hint-content {
  animation: crossfade 200ms ease-out;
}
@keyframes crossfade {
  from { opacity: 0; }
  to   { opacity: 1; }
}
```

---

## 6. 모달 / 토스트 (완료 축하, 에러 알림)

```css
.modal-overlay {
  background: rgba(0,0,0,0.5);
  animation: overlay-in var(--dur-fast) var(--ease-out);
}
.modal-content {
  animation: modal-in var(--dur-base) var(--ease-out);
}
@keyframes overlay-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes modal-in {
  from { opacity: 0; transform: scale(0.96) translateY(8px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}

.toast {
  animation: toast-in var(--dur-base) var(--ease-out);
}
@keyframes toast-in {
  from { opacity: 0; transform: translateX(100%); }
  to   { opacity: 1; transform: translateX(0); }
}
```

- 완료 축하(단계 클리어) 모달은 이 앱의 감성(개발+인문학적 톤)에 맞게 과한 콘페티보다 **절제된 체크마크 애니메이션 + 은은한 accent glow** 추천

```css
.checkmark-circle {
  stroke-dasharray: 48;
  stroke-dashoffset: 48;
  animation: draw-check 400ms ease-out forwards;
}
@keyframes draw-check {
  to { stroke-dashoffset: 0; }
}
```

---

## 7. 버튼 (앱 내부용 — 랜딩페이지 CTA와 다름)

```css
.app-btn {
  transition: background var(--dur-fast) var(--ease-out),
              transform var(--dur-instant) var(--ease-out);
}
.app-btn:hover {
  background: var(--surface-hover);
}
.app-btn:active {
  transform: scale(0.97);
}
.app-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* 실행 중 로딩 상태 */
.app-btn.is-loading {
  pointer-events: none;
}
.app-btn.is-loading .spinner {
  animation: spin 700ms linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
```

- translateY(-1px) 같은 "붕 뜨는" hover는 앱 내부 버튼엔 과함 — 배경색 변화 정도로 충분

---

## 8. 테마 전환 (다크/라이트)

```css
:root, [data-theme] {
  transition: background-color var(--dur-base) var(--ease-out),
              color var(--dur-base) var(--ease-out);
}
```
- 전체 앱에 transition을 걸면 테마 전환 시 모든 요소가 부드럽게 바뀜 (단, 초기 로드 시 깜빡임 방지를 위해 첫 렌더 후에만 transition 클래스 부여)

---

## 9. 키보드 중심 인터랙션

- `Cmd/Ctrl+Enter`: 코드 실행 — 버튼에 짧은 press 애니메이션(`scale(0.97)` 100ms)을 트리거해서 "실행됐다"는 시각 피드백 제공 (키보드로 눌러도 버튼이 반응해야 일관성 있음)
- 포커스 이동 시 컨테이너 스크롤은 `scroll-behavior: smooth` + `scrollIntoView({ block: "nearest" })`
- 커맨드 팔레트(Cmd+K 등) 등장은 모달과 동일한 `modal-in` 패턴 재사용

---

## 체크리스트

- [ ] 모든 트랜지션 100~200ms 이내, 랜딩페이지보다 짧게
- [ ] hover보다 active/selected/focus-visible 상태 우선 설계
- [ ] 리사이즈/드래그 중엔 transition 제거 (스냅 시에만 적용)
- [ ] AI 스트리밍은 토큰 단위 애니메이션 대신 append + 커서 blink로 성능 확보
- [ ] 에러 피드백은 shake 진폭 최소화 (2px 이내)
- [ ] 완료/축하 연출은 과하지 않게, 앱 톤에 맞는 절제된 스타일
- [ ] `transition-all` 대신 명시적 property 지정
- [ ] prefers-reduced-motion 대응 동일 적용

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```