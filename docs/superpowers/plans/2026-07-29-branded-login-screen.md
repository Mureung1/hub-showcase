# 브랜드 로그인 화면 개편 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 인증 동작은 유지하면서 로그인 화면을 아맞다의 기존 로고, 브랜드 문장과 단일 Google 로그인 행동을 중심으로 개편한다.

**Architecture:** `pages/login`이 화면 구조와 반응형 스타일을 소유하고 공용 `BrandLogo`, `Button`, `StatusMessage`를 공개 API로 조합한다. `app`과 인증 provider의 계약은 유지하되 일반 로그인 실패 본문만 화면 제목과 중복되지 않게 줄이며, 사용자 노출 문구 변경은 기존 테스트와 UX 라이팅 인벤토리에만 동기화한다.

**Tech Stack:** React 19, TypeScript, CSS custom properties, Vitest, Testing Library

---

## 파일 구조

| 파일                                             | 책임                                                                      |
| ------------------------------------------------ | ------------------------------------------------------------------------- |
| `src/pages/login/ui/login_page.tsx`              | 브랜드 영역과 로그인 영역의 의미 구조, 노출 문구, 기존 인증 callback 조합 |
| `src/pages/login/ui/login_page.css`              | 데스크톱·태블릿 2열과 모바일 상하 배치, 브랜드 강조와 로그인 영역 스타일  |
| `src/pages/login/ui/login_page.test.tsx`         | 로그인 화면의 제목, 주요 행동, 로딩과 실패 뒤 재시도 계약                 |
| `src/features/auth/model/auth_provider.tsx`      | 일반 Google 로그인 시작 실패의 비중복 본문 제공                           |
| `src/features/auth/model/auth_provider.test.tsx` | 변경된 일반 로그인 실패 본문 확인                                         |
| `src/app/app.test.tsx`                           | 온보딩에서 로그인으로 이동한 뒤 인증 성공·실패·취소 흐름 확인             |
| `docs/ux-writing-inventory.md`                   | 확정된 로그인 화면 문구와 검증 위치 기록                                  |

새 컴포넌트와 새 테스트 파일은 만들지 않는다. 기존 테스트 세 종류에서 변경된 사용자 계약만 수정하고, 반응형 CSS의 픽셀 값이나 장식 요소를 검증하는 테스트는 추가하지 않는다.

### Task 1: 브랜드 로그인 화면과 인증 문구 연결

**Files:**

- Modify: `src/pages/login/ui/login_page.test.tsx`
- Modify: `src/features/auth/model/auth_provider.test.tsx`
- Modify: `src/app/app.test.tsx`
- Modify: `src/pages/login/ui/login_page.tsx`
- Modify: `src/pages/login/ui/login_page.css`
- Modify: `src/features/auth/model/auth_provider.tsx`

- [ ] **Step 1: 로그인 화면 기존 테스트의 노출 문구를 새 계약으로 변경**

`src/pages/login/ui/login_page.test.tsx`를 다음 내용으로 교체한다. 기존 두 테스트만 유지하며 테스트 수를 늘리지 않는다.

```tsx
/* @vitest-environment jsdom */
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { DesignSystemProvider } from '@/shared/ui';

import { LoginPage } from './login_page';

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      addEventListener: vi.fn(),
      addListener: vi.fn(),
      dispatchEvent: vi.fn(),
      matches: false,
      media: query,
      onchange: null,
      removeEventListener: vi.fn(),
      removeListener: vi.fn(),
    })),
  });
});

afterEach(() => {
  cleanup();
});

describe('LoginPage', () => {
  it('shows an auth failure and allows another attempt', async () => {
    const user = userEvent.setup();
    const onLogin = vi.fn();
    render(
      <DesignSystemProvider>
        <LoginPage
          errorMessage="Google 공급자 연결 실패"
          isLoading={false}
          onBack={vi.fn()}
          onLogin={onLogin}
        />
      </DesignSystemProvider>
    );

    expect(
      screen.getByRole('heading', { name: '내 보관함으로 들어가기' })
    ).not.toBeNull();
    expect(screen.getByRole('alert').textContent).toContain(
      'Google 공급자 연결 실패'
    );

    await user.click(
      screen.getByRole('button', { name: 'Google로 로그인하기' })
    );

    expect(onLogin).toHaveBeenCalledOnce();
  });

  it('prevents duplicate login attempts while OAuth is starting', () => {
    render(
      <DesignSystemProvider>
        <LoginPage isLoading onBack={vi.fn()} onLogin={vi.fn()} />
      </DesignSystemProvider>
    );

    const button = screen.getByRole('button', {
      name: 'Google에 연결하고 있어요.',
    }) as HTMLButtonElement;

    expect(button.disabled).toBe(true);
  });
});
```

- [ ] **Step 2: 앱 조합 테스트의 기존 세 흐름을 새 제목과 버튼 문구로 변경**

`src/app/app.test.tsx`의 로그인 관련 세 테스트를 다음 내용으로 교체한다. 일반 로그인 시작 실패는 제목과 본문을 합친 alert 전체 문구를 확인해 중복을 검출한다.

```tsx
it('enters the workspace only after a signed-in session arrives', async () => {
  const user = userEvent.setup();
  const createInsightRepository = vi.fn(() => createRepository());
  const app = renderApp(createInsightRepository);
  app.emit(null);

  await user.click(
    screen.getAllByRole('button', { name: '아맞다 시작하기' })[0]
  );

  expect(
    screen.getByRole('heading', { name: '내 보관함으로 들어가기' })
  ).not.toBeNull();
  expect(
    screen.getByRole('button', { name: 'Google로 로그인하기' })
  ).not.toBeNull();

  await user.click(screen.getByRole('button', { name: 'Google로 로그인하기' }));

  expect(app.service.signInWithGoogle).toHaveBeenCalledWith(
    window.location.origin
  );
  expect(screen.queryByRole('heading', { name: '홈' })).toBeNull();

  app.emit({
    user: {
      email: 'member@example.com',
      id: 'user-1',
      user_metadata: { full_name: '테스트 사용자' },
    },
  });

  expect(screen.getByRole('heading', { name: '홈' })).not.toBeNull();
  expect(createInsightRepository).toHaveBeenCalledWith('user-1');
  expect(
    screen.getByRole('heading', {
      name: '지금 필요한 인사이트를 꺼내 보세요',
    })
  ).not.toBeNull();
});

it('shows a retryable message when Google login cannot start', async () => {
  const user = userEvent.setup();
  const app = renderSignedOutApp();
  vi.mocked(app.service.signInWithGoogle)
    .mockRejectedValueOnce(new Error('Google 공급자 연결 실패'))
    .mockResolvedValueOnce(undefined);

  await user.click(
    screen.getAllByRole('button', { name: '아맞다 시작하기' })[0]
  );
  await user.click(screen.getByRole('button', { name: 'Google로 로그인하기' }));

  expect(screen.getByRole('alert').textContent).toBe(
    '로그인하지 못했어요다시 시도해 주세요.'
  );

  await user.click(screen.getByRole('button', { name: 'Google로 로그인하기' }));

  expect(app.service.signInWithGoogle).toHaveBeenCalledTimes(2);
});

it('returns an OAuth cancellation directly to the retryable login screen', () => {
  window.history.replaceState(
    {},
    '',
    '/?error=access_denied&error_description=The+user+cancelled'
  );
  const app = renderApp();

  app.emit(null);

  expect(
    screen.getByRole('heading', { name: '내 보관함으로 들어가기' })
  ).not.toBeNull();
  expect(screen.getByRole('alert').textContent).toContain(
    'Google 로그인을 취소했어요.'
  );
  expect(
    screen.getByRole('button', { name: 'Google로 로그인하기' })
  ).not.toBeNull();
});
```

- [ ] **Step 3: 인증 provider 기존 테스트의 일반 로그인 실패 본문을 변경**

`src/features/auth/model/auth_provider.test.tsx`의 `surfaces a mobile OAuth callback failure as a retryable sign-in error` 테스트에서 기대 문구만 다음처럼 바꾼다.

```tsx
it('surfaces a mobile OAuth callback failure as a retryable sign-in error', () => {
  const auth = createServiceMock();
  render(
    <AuthProvider service={auth.service}>
      <AuthProbe />
    </AuthProvider>
  );

  act(() => auth.emitSignInFailure('android-share'));

  expect(screen.getByText('다시 시도해 주세요.')).not.toBeNull();
  expect(screen.getByText('공유 OAuth 복귀 1')).not.toBeNull();
});
```

- [ ] **Step 4: 변경된 기존 테스트가 현재 구현에서 실패하는지 확인**

Run:

```powershell
npm test -- src/pages/login/ui/login_page.test.tsx src/features/auth/model/auth_provider.test.tsx src/app/app.test.tsx
```

Expected: FAIL. 현재 화면에는 `내 보관함으로 들어가기`, `Google로 로그인하기`가 없고 provider는 `Google 로그인에 실패했어요. 다시 시도해 주세요.`를 반환한다.

- [ ] **Step 5: 로그인 화면 의미 구조와 문구를 구현**

`src/pages/login/ui/login_page.tsx`를 다음 내용으로 교체한다.

```tsx
import { BrandLogo, Button, StatusMessage } from '@/shared/ui';

import './login_page.css';

export type LoginPageProps = {
  errorMessage?: string;
  isLoading?: boolean;
  onBack: () => void;
  onLogin: () => void;
};

export function LoginPage({
  errorMessage,
  isLoading = false,
  onBack,
  onLogin,
}: LoginPageProps) {
  return (
    <main className="login-shell" aria-labelledby="login-title">
      <div className="login-brand">
        <div className="login-brand-lockup">
          <BrandLogo className="login-brand-logo" />
          <span className="login-brand-name">아맞다</span>
        </div>

        <p className="visually-hidden">
          저장한 인사이트를 내 보관함에서 이어 보세요.
        </p>
        <p className="login-brand-message" aria-hidden="true">
          <span className="login-brand-line">
            <span>저장한</span>
            <span className="login-brand-highlight login-brand-highlight-blue">
              인사이트
            </span>
            <span className="login-brand-particle">를</span>
          </span>
          <span className="login-brand-line">내 보관함에서</span>
          <span className="login-brand-line">
            <span className="login-brand-highlight login-brand-highlight-amber">
              이어
            </span>
            <span>보세요.</span>
          </span>
        </p>
      </div>

      <section className="login-panel" aria-labelledby="login-title">
        <div className="login-content">
          <h1 id="login-title">내 보관함으로 들어가기</h1>
          <p className="login-description">
            Google 계정으로 로그인하면 저장한 인사이트를 바로 볼 수 있어요.
          </p>

          {errorMessage ? (
            <StatusMessage title="로그인하지 못했어요" variant="error">
              <p>{errorMessage}</p>
            </StatusMessage>
          ) : null}

          <Button
            aria-label={isLoading ? 'Google에 연결하고 있어요.' : undefined}
            disabled={isLoading}
            fullWidth
            hierarchy="primary"
            loading={isLoading}
            onClick={onLogin}
            size="large"
            type="button"
          >
            {isLoading ? 'Google에 연결하고 있어요.' : 'Google로 로그인하기'}
          </Button>

          <p className="terms-notice">
            로그인하면 이용약관과 개인정보처리방침에 동의해요.
          </p>

          <Button
            className="login-back-action"
            hierarchy="ghost"
            onClick={onBack}
            type="button"
          >
            서비스 소개로 돌아가기
          </Button>
        </div>
      </section>
    </main>
  );
}
```

- [ ] **Step 6: 데스크톱·태블릿·모바일 스타일을 구현**

`src/pages/login/ui/login_page.css`를 다음 내용으로 교체한다.

```css
.login-shell {
  display: grid;
  grid-template-columns: minmax(0, 3fr) minmax(360px, 2fr);
  min-height: 100svh;
  background: var(--color-surface);
}

.login-brand {
  display: grid;
  grid-template-rows: auto 1fr;
  gap: var(--spacing-12);
  min-width: 0;
  padding: clamp(var(--spacing-8), 5vw, var(--spacing-20));
  overflow: hidden;
  background: var(--color-paper);
}

.login-brand-lockup {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  color: var(--color-ink);
}

.login-brand-logo {
  width: var(--spacing-10);
  height: var(--spacing-10);
  flex: 0 0 auto;
}

.login-brand-name {
  font-size: var(--typography-section-title-size);
  font-weight: 800;
  line-height: var(--typography-section-title-line-height);
}

.login-brand-message {
  display: grid;
  align-content: center;
  align-self: center;
  gap: var(--spacing-2);
  margin: 0;
  color: var(--color-ink);
  font-size: clamp(48px, 5.8vw, 80px);
  font-weight: 800;
  letter-spacing: -0.05em;
  line-height: 0.98;
}

.login-brand-line {
  display: flex;
  align-items: center;
  gap: 0.12em;
  width: max-content;
  max-width: 100%;
  white-space: nowrap;
}

.login-brand-particle {
  margin-left: -0.08em;
}

.login-brand-highlight {
  display: inline-flex;
  align-items: center;
  padding: 0.08em 0.16em;
  border-radius: var(--radius-label);
  letter-spacing: -0.03em;
  line-height: 1;
}

.login-brand-highlight-blue {
  color: var(--color-surface);
  background: var(--color-electric-blue);
}

.login-brand-highlight-amber {
  color: var(--color-ink);
  background: var(--color-amber);
}

.login-panel {
  display: grid;
  min-width: 0;
  padding: clamp(var(--spacing-8), 5vw, var(--spacing-16));
  border-left: 1px solid var(--color-ash);
  background: var(--color-surface);
  place-items: center;
}

.login-content {
  display: grid;
  gap: var(--spacing-4);
  width: min(420px, 100%);
}

.login-content h1 {
  margin: 0;
  color: var(--color-ink);
  font-size: var(--typography-screen-title-size);
  line-height: var(--typography-screen-title-line-height);
}

.login-description {
  margin: 0 0 var(--spacing-2);
  color: var(--color-graphite);
  font-size: var(--typography-body-size);
  line-height: var(--typography-body-line-height);
}

.terms-notice {
  margin: 0;
  color: var(--color-graphite);
  font-size: var(--typography-meta-size);
  line-height: var(--typography-meta-line-height);
}

.login-back-action {
  width: fit-content;
  min-height: 44px;
  justify-self: start;
  margin-top: var(--spacing-2);
}

@media (min-width: 768px) and (max-width: 1199px) {
  .login-shell {
    grid-template-columns: minmax(0, 56fr) minmax(340px, 44fr);
  }

  .login-brand {
    padding: var(--spacing-8);
  }

  .login-brand-message {
    font-size: clamp(36px, 4.8vw, 56px);
  }

  .login-panel {
    padding: var(--spacing-8);
  }
}

@media (max-width: 767px) {
  .login-shell {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;
  }

  .login-brand {
    min-height: min(38svh, 320px);
    gap: var(--spacing-10);
    padding: var(--spacing-6) var(--spacing-5) var(--spacing-8);
  }

  .login-brand-logo {
    width: var(--spacing-8);
    height: var(--spacing-8);
  }

  .login-brand-name {
    font-size: var(--typography-card-title-size);
    line-height: var(--typography-card-title-line-height);
  }

  .login-brand-message {
    gap: var(--spacing-1);
    font-size: clamp(32px, 8.8vw, 44px);
  }

  .login-panel {
    align-items: start;
    padding: var(--spacing-10) var(--spacing-5) var(--spacing-12);
    border-top: 1px solid var(--color-ash);
    border-left: 0;
  }
}
```

- [ ] **Step 7: 일반 Google 로그인 시작 실패 본문을 줄임**

`src/features/auth/model/auth_provider.tsx`의 `getActionErrorMessage`를 다음처럼 변경한다. 로그아웃 실패 문구와 OAuth callback의 구체적인 취소·실패 문구는 바꾸지 않는다.

```tsx
function getActionErrorMessage(action: AuthAction) {
  return action === 'sign-in'
    ? '다시 시도해 주세요.'
    : '로그아웃하지 못했어요. 다시 시도해 주세요.';
}
```

- [ ] **Step 8: 변경된 기존 테스트가 통과하는지 확인**

Run:

```powershell
npm test -- src/pages/login/ui/login_page.test.tsx src/features/auth/model/auth_provider.test.tsx src/app/app.test.tsx
```

Expected: 세 테스트 파일 PASS. 새 테스트 파일이나 CSS 전용 테스트는 생성되지 않는다.

- [ ] **Step 9: 구현 파일을 포맷하고 변경 범위만 린트**

Run:

```powershell
npx prettier --write src/pages/login/ui/login_page.tsx src/pages/login/ui/login_page.css src/pages/login/ui/login_page.test.tsx src/features/auth/model/auth_provider.tsx src/features/auth/model/auth_provider.test.tsx src/app/app.test.tsx
npx eslint src/pages/login/ui/login_page.tsx src/pages/login/ui/login_page.test.tsx src/features/auth/model/auth_provider.tsx src/features/auth/model/auth_provider.test.tsx src/app/app.test.tsx
```

Expected: Prettier 완료, ESLint 오류 0개.

- [ ] **Step 10: 화면과 인증 문구 변경을 커밋**

```powershell
git add -- src/pages/login/ui/login_page.tsx src/pages/login/ui/login_page.css src/pages/login/ui/login_page.test.tsx src/features/auth/model/auth_provider.tsx src/features/auth/model/auth_provider.test.tsx src/app/app.test.tsx
git commit -m "feat: 브랜드 로그인 화면 개편"
```

### Task 2: UX 라이팅 기록 동기화

**Files:**

- Modify: `docs/ux-writing-inventory.md`

- [ ] **Step 1: 로그인 화면 두 행과 인증 provider 행을 최종 문구로 갱신**

`docs/ux-writing-inventory.md`의 로그인 관련 행을 다음 내용으로 교체한다.

```markdown
| 로그인 | 브랜드·이동·제목·설명 | 서비스 소개로; 로그인; 환영합니다!; 로그인 후 나만의 보관함과 꺼내보기를 사용할 수 있어요. | 저장한 인사이트를 내 보관함에서 이어 보세요.; 서비스 소개로 돌아가기; 내 보관함으로 들어가기; Google 계정으로 로그인하면 저장한 인사이트를 바로 볼 수 있어요. | 개정 | 브랜드 경험과 로그인 뒤 도달할 곳을 설명하고 불필요한 환영·메타 문구 제거 | `src/pages/login/ui/login_page.tsx` | `login_page.test.tsx`·수동 검수 |
| 로그인 | 오류·진행·주요 행동·약관 | 로그인하지 못했습니다; Google 로그인 연결 중; Google로 시작하기; 간편 로그인; 로그인 시 이용약관 및 개인정보처리방침에 동의하게 됩니다. | 로그인하지 못했어요; 다시 시도해 주세요.; Google에 연결하고 있어요.; Google로 로그인하기; 로그인하면 이용약관과 개인정보처리방침에 동의해요. | 개정 | 실패 제목과 다음 행동을 나누고 주요 행동의 결과를 명확히 표현 | `src/pages/login/ui/login_page.tsx` | `login_page.test.tsx` |
| 인증 provider | 인증 오류 | Google 로그인에 실패했습니다. {reason}; 로그아웃에 실패했습니다. {reason}; 알 수 없는 인증 오류가 발생했습니다.; 로그인을 완료하지 못했어요. | 다시 시도해 주세요.; 로그아웃하지 못했어요. 다시 시도해 주세요.; 로그인에 실패했어요. 다시 시도해 주세요.; 로그인을 완료하지 못했어요. | 개정 | 화면 제목과 중복되지 않는 로그인 복구 행동, 동작별 안전한 오류와 해요체 | `src/features/auth/model/auth_provider.tsx` | `auth_provider.test.tsx` |
```

- [ ] **Step 2: 제거하기로 한 런타임 문구가 남아 있지 않은지 확인**

Run:

```powershell
rg -n "아맞다에 오신 걸 환영해요|Google로 시작하기|간편 로그인|온보딩에서 보던 흐름 그대로" src/pages/login src/app
```

Expected: 결과 없음.

- [ ] **Step 3: 문서 인코딩과 diff 형식을 확인**

Run:

```powershell
$content = Get-Content -LiteralPath 'docs/ux-writing-inventory.md' -Raw -Encoding utf8
if ($content.Contains([char]0xFFFD)) { throw 'UTF-8 replacement character detected' }
git diff --check
```

Expected: UTF-8 replacement character 없음, `git diff --check` 오류 없음.

- [ ] **Step 4: UX 라이팅 기록을 커밋**

```powershell
git add -- docs/ux-writing-inventory.md
git commit -m "docs: 로그인 UX 라이팅 기록 갱신"
```

### Task 3: 필요한 범위의 최종 검증

**Files:**

- Verify: `src/pages/login/ui/login_page.tsx`
- Verify: `src/pages/login/ui/login_page.css`
- Verify: `src/features/auth/model/auth_provider.tsx`
- Verify: `src/app/app.test.tsx`

- [ ] **Step 1: 변경 범위의 기존 테스트만 다시 실행**

Run:

```powershell
npm test -- src/pages/login/ui/login_page.test.tsx src/features/auth/model/auth_provider.test.tsx src/app/app.test.tsx
```

Expected: 세 테스트 파일 PASS. 홈, 보관함, 저장과 가져오기 테스트는 이 변경의 검증 범위가 아니므로 실행하지 않는다.

- [ ] **Step 2: 프론트엔드 빌드로 타입과 번들을 확인**

Run:

```powershell
npm run build:web
```

Expected: TypeScript, Vite build와 client bundle 검증 PASS.

- [ ] **Step 3: 로컬 화면을 세 크기에서 확인**

Run:

```powershell
npm run dev:client -- --host 127.0.0.1 --port 5178 --strictPort
```

`http://127.0.0.1:5178/`에서 `아맞다 시작하기`를 눌러 로그인 화면으로 이동하고 `390px`, `768px`, `1280px` viewport만 확인한다.

Expected:

- `390px`: 기존 아맞다 로고와 브랜드 문장이 위에 있고 로그인 제목과 Google 버튼이 그 아래에서 잘리지 않는다.
- `768px`: 브랜드 영역과 로그인 영역이 2열이며 제목, 설명, 버튼이 좁아지거나 가로로 넘치지 않는다.
- `1280px`: 두 영역이 약 `60:40`으로 보이고 로그인 영역이 별도 카드처럼 보이지 않는다.
- 모든 크기: 네 칸 임시 마크, `환영해요`, `간편 로그인`, 회색 약관 상자, 기본 그림자와 그라데이션이 없다.
- 모든 크기: `Google로 로그인하기`, 로딩 중 `Google에 연결하고 있어요.`, `서비스 소개로 돌아가기`가 동작한다.

- [ ] **Step 4: 최종 작업 상태를 확인**

Run:

```powershell
git status --short --branch
git log -3 --oneline
```

Expected: 의도한 구현·문서 커밋만 존재하고 작업 트리가 깨끗하다.
