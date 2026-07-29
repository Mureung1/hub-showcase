# Initial Load Error Alert Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 앱 초기화 실패 시 마스코트를 포함한 차단형 중앙 Alert를 표시하고, 페이지 새로고침 없이 초기화를 다시 실행한다.

**Architecture:** 새 `ErrorAlertModal`은 오류 표현과 재시도 이벤트 전달만 담당한다. `App`은 초기화 시도 번호를 상태로 관리하고, 재시도 시 로딩 상태로 돌아간 뒤 기존 익명 로그인·최초 API 요청 흐름을 다시 실행한다.

**Tech Stack:** React 19, TypeScript, CSS, Vitest, Testing Library

## Global Constraints

- 기존 `frontend/src/shared/ui/ErrorState/`와 기능별 인라인 오류 화면은 변경하지 않는다.
- 브라우저 기본 `alert()`와 페이지 전체 새로고침을 사용하지 않는다.
- 배경 클릭과 `Esc`로 닫히지 않는 차단형 모달로 구현한다.
- 기존 `frontend/src/assets/mascot/mascot-default&complete.png`를 장식 이미지로 사용한다.
- 자동 재시도, 재시도 횟수 제한, 오류 유형별 메시지 분기는 추가하지 않는다.

---

## File Structure

- Create: `frontend/src/shared/ui/ErrorAlertModal/ErrorAlertModal.tsx` — 오류 모달의 의미 구조와 재시도 이벤트를 담당한다.
- Create: `frontend/src/shared/ui/ErrorAlertModal/ErrorAlertModal.css` — 전체 화면 배경, 중앙 카드, 마스코트와 버튼 스타일을 담당한다.
- Create: `frontend/src/shared/ui/ErrorAlertModal/ErrorAlertModal.test.tsx` — 렌더링, 접근성 계약, 재시도 이벤트를 검증한다.
- Modify: `frontend/src/app/App.tsx` — 초기화 재실행 상태와 오류 모달 연결을 담당한다.
- Modify: `frontend/src/app/App.test.tsx` — 초기 실패 및 재시도 성공 흐름을 검증한다.

### Task 1: ErrorAlertModal 공통 컴포넌트

**Files:**
- Create: `frontend/src/shared/ui/ErrorAlertModal/ErrorAlertModal.tsx`
- Create: `frontend/src/shared/ui/ErrorAlertModal/ErrorAlertModal.css`
- Test: `frontend/src/shared/ui/ErrorAlertModal/ErrorAlertModal.test.tsx`

**Interfaces:**
- Consumes: `onRetry: () => void`
- Produces: `ErrorAlertModal({ onRetry }: ErrorAlertModalProps): JSX.Element`

- [ ] **Step 1: 렌더링과 재시도 이벤트를 검증하는 실패 테스트 작성**

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import ErrorAlertModal from './ErrorAlertModal'

describe('ErrorAlertModal', () => {
  it('마스코트가 있는 차단형 오류 대화상자를 표시하고 재시도를 전달한다', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()

    const { container } = render(<ErrorAlertModal onRetry={onRetry} />)

    const dialog = screen.getByRole('alertdialog', {
      name: '잠시 문제가 생겼어요',
      description: '콘텐츠를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.',
    })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(container.querySelector('img')).toHaveAttribute('alt', '')

    await user.click(screen.getByRole('button', { name: '다시 시도' }))

    expect(onRetry).toHaveBeenCalledOnce()
  })
})
```

- [ ] **Step 2: 테스트를 실행해 RED 확인**

Run:

```bash
cd frontend
npm test -- src/shared/ui/ErrorAlertModal/ErrorAlertModal.test.tsx
```

Expected: `ErrorAlertModal` 모듈이 없어서 테스트 수집이 실패한다. 파일을 생성하되 빈 컴포넌트로 바꿔 테스트 본문이 `FAILED`가 되는 것을 확인한 후 구현한다.

- [ ] **Step 3: 최소 컴포넌트 구현**

```tsx
import mascotDefault from '../../../assets/mascot/mascot-default&complete.png'
import './ErrorAlertModal.css'

type ErrorAlertModalProps = {
  onRetry: () => void
}

export default function ErrorAlertModal({ onRetry }: ErrorAlertModalProps) {
  return (
    <div className="error-alert-backdrop">
      <section
        className="error-alert-modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="error-alert-title"
        aria-describedby="error-alert-description"
      >
        <img className="error-alert-mascot" src={mascotDefault} alt="" />
        <h2 id="error-alert-title">잠시 문제가 생겼어요</h2>
        <p id="error-alert-description">
          콘텐츠를 불러오지 못했어요.
          <br />
          잠시 후 다시 시도해 주세요.
        </p>
        <button type="button" className="btn-primary" onClick={onRetry}>
          다시 시도
        </button>
      </section>
    </div>
  )
}
```

```css
.error-alert-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(32, 36, 44, 0.36);
}

.error-alert-modal {
  width: min(100%, 327px);
  padding: 28px 24px 24px;
  border: 1px solid var(--rule);
  border-radius: 24px;
  background: var(--paper-raised);
  box-shadow: 0 18px 50px rgba(32, 36, 44, 0.18);
  text-align: center;
}

.error-alert-mascot {
  width: 88px;
  height: 88px;
  margin-bottom: 14px;
  object-fit: contain;
}

.error-alert-modal h2 {
  margin-bottom: 8px;
  font-size: 20px;
  letter-spacing: -0.02em;
}

.error-alert-modal p {
  margin-bottom: 22px;
  color: var(--ink-soft);
  font-size: 14px;
  line-height: 1.6;
}
```

- [ ] **Step 4: 컴포넌트 테스트로 GREEN 확인**

Run:

```bash
cd frontend
npm test -- src/shared/ui/ErrorAlertModal/ErrorAlertModal.test.tsx
```

Expected: 1 test passed.

- [ ] **Step 5: 컴포넌트 커밋**

```bash
git add frontend/src/shared/ui/ErrorAlertModal
git commit -m "feat: 초기 로딩 오류 Alert 추가"
```

### Task 2: App 초기화 재시도 연결

**Files:**
- Modify: `frontend/src/app/App.tsx`
- Modify: `frontend/src/app/App.test.tsx`

**Interfaces:**
- Consumes: `ErrorAlertModal({ onRetry })`
- Produces: 초기화 실패 후 `다시 시도`를 누르면 `ensureAnonymousSession()`과 최초 API 요청을 다시 실행하는 App 상태 전이

- [ ] **Step 1: 초기 실패와 재시도 성공을 검증하는 실패 테스트 작성**

`frontend/src/app/App.test.tsx`의 mock 선언 뒤에 다음 import를 추가한다.

```tsx
import { ensureAnonymousSession } from '../auth/supabase'
```

`describe('App startup')`의 `beforeEach`에서 익명 로그인 mock도 초기화한다.

```tsx
vi.mocked(ensureAnonymousSession).mockReset()
vi.mocked(ensureAnonymousSession).mockResolvedValue({ access_token: 'token' })
```

기존 초기화 실패 테스트를 다음 두 테스트로 교체한다.

```tsx
it('shows the project error alert when initialization fails', async () => {
  vi.mocked(api.getUserInterests).mockRejectedValue(new Error('boom'))

  render(<App />)

  expect(
    await screen.findByRole('alertdialog', { name: '잠시 문제가 생겼어요' }),
  ).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '다시 시도' })).toBeInTheDocument()
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
})

it('retries anonymous sign-in and initial API requests without reloading the page', async () => {
  const user = userEvent.setup()
  vi.mocked(api.getUserInterests)
    .mockRejectedValueOnce(new Error('boom'))
    .mockResolvedValueOnce({
      hasCompletedOnboarding: false,
      interests: [],
    })
  vi.mocked(api.getInterests).mockResolvedValue([
    {
      id: 'interest-1',
      name: 'IT·개발',
      displayOrder: 1,
      launchStatus: 'active',
      riskLevel: 'low',
      emptyStateMessage: null,
    },
  ])

  render(<App />)
  await user.click(
    await screen.findByRole('button', { name: '다시 시도' }),
  )

  expect(await screen.findByRole('button', { name: 'IT·개발' })).toBeInTheDocument()
  expect(ensureAnonymousSession).toHaveBeenCalledTimes(2)
  expect(api.getUserInterests).toHaveBeenCalledTimes(2)
})
```

- [ ] **Step 2: App 테스트를 실행해 RED 확인**

Run:

```bash
cd frontend
npm test -- src/app/App.test.tsx
```

Expected: `alertdialog`를 찾지 못하고 `다시 시도` 버튼이 없어 실패한다.

- [ ] **Step 3: App에 오류 모달과 초기화 재실행 상태 추가**

`frontend/src/app/App.tsx`에 컴포넌트를 import한다.

```tsx
import ErrorAlertModal from '../shared/ui/ErrorAlertModal/ErrorAlertModal'
```

`App`의 상태와 effect를 다음 구조로 변경한다.

```tsx
const [appState, setAppState] = useState<AppState>({ status: 'loading' })
const [initializationAttempt, setInitializationAttempt] = useState(0)

useEffect(() => {
  let cancelled = false

  async function start() {
    try {
      await ensureAnonymousSession()
      const userInterests = await api.getUserInterests()
      if (cancelled) return

      if (userInterests.hasCompletedOnboarding) {
        setAppState({ status: 'today' })
        return
      }

      const interests = await api.getInterests()
      if (cancelled) return
      setAppState({ status: 'onboarding', interests, selectedIds: [] })
    } catch {
      if (!cancelled) setAppState({ status: 'error' })
    }
  }

  start()
  return () => {
    cancelled = true
  }
}, [initializationAttempt])

function retryInitialization() {
  setAppState({ status: 'loading' })
  setInitializationAttempt((attempt) => attempt + 1)
}
```

기존 오류 문구 반환을 교체한다.

```tsx
if (appState.status === 'error') {
  return <ErrorAlertModal onRetry={retryInitialization} />
}
```

- [ ] **Step 4: App 테스트로 GREEN 확인**

Run:

```bash
cd frontend
npm test -- src/app/App.test.tsx
```

Expected: App startup 테스트를 포함한 해당 파일 전체 통과.

- [ ] **Step 5: 전체 프론트 회귀 검증**

Run:

```bash
cd frontend
npm test
npm run typecheck
npm run lint
npm run build
```

Expected: 모든 명령이 exit code 0으로 종료된다.

- [ ] **Step 6: App 연결 커밋**

```bash
git add frontend/src/app/App.tsx frontend/src/app/App.test.tsx
git commit -m "feat: 초기 로딩 오류 재시도 연결"
```
