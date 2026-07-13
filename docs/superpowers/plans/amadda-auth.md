# 아맞다 인증 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Supabase Auth와 Google OAuth를 연결하고, 로그인 전 소개 화면, 별도 로그인 화면, 인증된 사용자 전용 앱 진입 흐름을 만든다.

**Architecture:** 인증 유스케이스와 세션 상태는 `src/features/auth`에 둔다. Supabase 클라이언트는 `src/shared/api`, 환경 변수 검증은 `src/shared/config`에서 단일 인스턴스로 제공한다. `AuthProvider`가 세션 상태를 관리하고, `AuthGate`가 로그인 전 소개 화면, 로그인 화면, 앱 셸 접근을 분기한다.


**FSD note:** 파일 경로는 slice 내부 위치를 표기한다. 외부 import는 각 slice의 `index.ts` public API를 사용하며, 새 slice를 만들 때 필요한 `index.ts`도 함께 추가한다.

**Tech Stack:** React 19, TypeScript, Vite, Supabase Auth, Google OAuth, GSAP, @gsap/react, Vitest, React Testing Library

---

## 범위

이 계획은 `docs/backlog.md`의 `P0. Supabase 인증` 항목을 다룬다.

포함 범위:

- Supabase 클라이언트 설정
- Google OAuth 로그인
- Google 로그인만 제공
- 로그인 전 소개 화면
- 별도 로그인 화면
- 로그인 전 핵심 경험 애니메이션
- 로그인 상태 감지
- 인증된 사용자만 앱 화면 접근
- 로그아웃
- 상단 프로필 메뉴의 최소 계정 기능

제외 범위:

- 이메일/비밀번호 로그인
- 게스트 모드
- 별도 설정 페이지
- 프로필 편집
- RLS 정책 작성

## 파일 구조

- Modify: `package.json`
  - `@supabase/supabase-js`, `gsap`, `@gsap/react` 의존성을 추가한다.
- Create: `src/shared/config/env.ts`
  - Supabase URL과 anon key 환경 변수를 검증한다.
- Create: `src/shared/config/env.test.ts`
  - 환경 변수 누락 시 명확한 오류가 나는지 검증한다.
- Create: `src/shared/api/supabase.ts`
  - Supabase 브라우저 클라이언트를 생성한다.
- Create: `src/features/auth/api/authService.ts`
  - Google 로그인, 로그아웃, 세션 구독 함수를 감싼다.
- Create: `src/features/auth/api/authService.test.ts`
  - Google provider만 사용하는지 검증한다.
- Create: `src/features/auth/model/AuthProvider.tsx`
  - 인증 세션과 사용자 상태를 React Context로 제공한다.
- Create: `src/features/auth/ui/AuthGate.tsx`
  - 로그인 전 화면과 앱 화면을 분기한다.
- Create: `src/features/auth/ui/AuthGate.test.tsx`
  - 비로그인/로그인 상태 분기를 검증한다.
- Create: `src/pages/landing/ui/LandingPage.tsx`
  - 로그인 전 소개 화면을 만든다.
- Create: `src/pages/landing/ui/OnboardingMotionPreview.tsx`
  - 저장 카드가 현재 상황 문장 기준으로 작업팩처럼 모이는 GSAP 시퀀스를 만든다.
- Create: `src/pages/login/ui/LoginPage.tsx`
  - Google 로그인 버튼과 약관/개인정보처리방침 안내를 제공한다.
- Modify: `src/app/AppShell.tsx`
  - 프로필 버튼에서 기본 사용자 정보와 로그아웃 액션을 제공한다.
- Modify: `src/app/App.tsx`
  - 앱 전체를 `AuthProvider`와 `AuthGate`로 감싼다.
- Create: `.env.example`
  - 필요한 공개 환경 변수 이름을 문서화한다.

---

### Task 1: 인증/온보딩 의존성과 환경 변수 검증 추가

**Files:**

- Modify: `package.json`
- Create: `.env.example`
- Create: `src/shared/config/env.ts`
- Create: `src/shared/config/env.test.ts`

- [ ] **Step 1: 인증과 온보딩 애니메이션 의존성 설치**

Run:

```bash
npm install @supabase/supabase-js gsap @gsap/react
```

Expected:

```text
added ... packages
found 0 vulnerabilities
```

- [ ] **Step 2: 환경 변수 예시 파일 작성**

Create `.env.example`:

```text
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

- [ ] **Step 3: 환경 변수 검증 테스트 작성**

Create `src/shared/config/env.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { getClientEnv } from './env';

describe('getClientEnv', () => {
  it('returns Supabase public environment values', () => {
    expect(
      getClientEnv({
        VITE_SUPABASE_URL: 'https://example.supabase.co',
        VITE_SUPABASE_ANON_KEY: 'anon-key',
      })
    ).toEqual({
      supabaseUrl: 'https://example.supabase.co',
      supabaseAnonKey: 'anon-key',
    });
  });

  it('throws when Supabase URL is missing', () => {
    expect(() =>
      getClientEnv({
        VITE_SUPABASE_URL: '',
        VITE_SUPABASE_ANON_KEY: 'anon-key',
      })
    ).toThrow('VITE_SUPABASE_URL');
  });

  it('throws when Supabase anon key is missing', () => {
    expect(() =>
      getClientEnv({
        VITE_SUPABASE_URL: 'https://example.supabase.co',
        VITE_SUPABASE_ANON_KEY: '',
      })
    ).toThrow('VITE_SUPABASE_ANON_KEY');
  });
});
```

- [ ] **Step 4: 실패 확인**

Run:

```bash
npm test -- src/shared/config/env.test.ts
```

Expected:

```text
FAIL src/shared/config/env.test.ts
Cannot find module './env'
```

- [ ] **Step 5: 환경 변수 검증 구현**

Create `src/shared/config/env.ts`:

```ts
type ClientEnvSource = {
  VITE_SUPABASE_ANON_KEY?: string;
  VITE_SUPABASE_URL?: string;
};

export type ClientEnv = {
  supabaseAnonKey: string;
  supabaseUrl: string;
};

function readRequiredEnvValue(
  source: ClientEnvSource,
  key: keyof ClientEnvSource
): string {
  const value = source[key]?.trim();

  if (!value) {
    throw new Error(`${key} 환경 변수가 설정되지 않았습니다.`);
  }

  return value;
}

export function getClientEnv(source: ClientEnvSource = import.meta.env) {
  return {
    supabaseUrl: readRequiredEnvValue(source, 'VITE_SUPABASE_URL'),
    supabaseAnonKey: readRequiredEnvValue(source, 'VITE_SUPABASE_ANON_KEY'),
  } satisfies ClientEnv;
}
```

- [ ] **Step 6: 테스트와 빌드 확인**

Run:

```bash
npm test -- src/shared/config/env.test.ts
npm run build
```

Expected:

```text
3 passed
✓ built in
```

- [ ] **Step 7: 커밋**

Run:

```bash
git add package.json package-lock.json .env.example src/shared/config/env.ts src/shared/config/env.test.ts
git commit -m "feat: Supabase 환경 변수 검증 추가"
```

---

### Task 2: Supabase 클라이언트와 인증 서비스 작성

**Files:**

- Create: `src/shared/api/supabase.ts`
- Create: `src/features/auth/api/authService.ts`
- Create: `src/features/auth/api/authService.test.ts`

- [ ] **Step 1: 인증 서비스 테스트 작성**

Create `src/features/auth/api/authService.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { signInWithGoogle, signOut } from './authService';

describe('authService', () => {
  it('starts OAuth with Google provider only', async () => {
    const signInWithOAuth = vi.fn().mockResolvedValue({ error: null });
    const client = {
      auth: {
        signInWithOAuth,
      },
    };

    await signInWithGoogle(client, 'http://localhost:5173');

    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: 'http://localhost:5173',
      },
    });
  });

  it('signs out through Supabase auth', async () => {
    const signOutMock = vi.fn().mockResolvedValue({ error: null });
    const client = {
      auth: {
        signOut: signOutMock,
      },
    };

    await signOut(client);

    expect(signOutMock).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run:

```bash
npm test -- src/features/auth/api/authService.test.ts
```

Expected:

```text
FAIL src/features/auth/api/authService.test.ts
Cannot find module './authService'
```

- [ ] **Step 3: Supabase 클라이언트 생성**

Create `src/shared/api/supabase.ts`:

```ts
import { createClient } from '@supabase/supabase-js';
import { getClientEnv } from './env';

const { supabaseAnonKey, supabaseUrl } = getClientEnv();

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    detectSessionInUrl: true,
    persistSession: true,
  },
});
```

- [ ] **Step 4: 인증 서비스 구현**

Create `src/features/auth/api/authService.ts`:

```ts
import { supabase } from '@/shared/api';

type OAuthClient = {
  auth: {
    signInWithOAuth: (options: {
      options: { redirectTo: string };
      provider: 'google';
    }) => Promise<{ error: Error | null }>;
  };
};

type SignOutClient = {
  auth: {
    signOut: () => Promise<{ error: Error | null }>;
  };
};

export async function signInWithGoogle(
  client: OAuthClient = supabase,
  redirectTo = window.location.origin
) {
  const { error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
    },
  });

  if (error) {
    throw error;
  }
}

export async function signOut(client: SignOutClient = supabase) {
  const { error } = await client.auth.signOut();

  if (error) {
    throw error;
  }
}
```

- [ ] **Step 5: 테스트와 빌드 확인**

Run:

```bash
npm test -- src/features/auth/api/authService.test.ts
npm run build
```

Expected:

```text
2 passed
✓ built in
```

- [ ] **Step 6: 커밋**

Run:

```bash
git add src/shared/api/supabase.ts src/features/auth/api/authService.ts src/features/auth/api/authService.test.ts
git commit -m "feat: Supabase Google 인증 서비스 추가"
```

---

### Task 3: 인증 상태 Provider와 로그인 전 소개 화면 작성

**Files:**

- Create: `src/features/auth/model/AuthProvider.tsx`
- Create: `src/features/auth/ui/AuthGate.tsx`
- Create: `src/features/auth/ui/AuthGate.test.tsx`
- Create: `src/pages/landing/ui/LandingPage.tsx`
- Create: `src/pages/landing/ui/OnboardingMotionPreview.tsx`
- Create: `src/pages/login/ui/LoginPage.tsx`
- Modify: `src/app/App.tsx`

- [ ] **Step 1: 인증 분기 테스트 작성**

Create `src/features/auth/ui/AuthGate.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AuthGate } from './AuthGate';

describe('AuthGate', () => {
  it('renders landing page while signed out', () => {
    render(
      <AuthGate
        authState={{
          status: 'signed-out',
          user: null,
        }}
      >
        <p>앱 화면</p>
      </AuthGate>
    );

    expect(screen.getByRole('heading', { name: '아맞다' })).toBeInTheDocument();
    expect(screen.queryByText('앱 화면')).not.toBeInTheDocument();
  });

  it('renders app while signed in', () => {
    render(
      <AuthGate
        authState={{
          status: 'signed-in',
          user: {
            avatarUrl: null,
            displayName: '최재원',
            email: 'jaewon@example.com',
            id: 'user-id',
          },
        }}
      >
        <p>앱 화면</p>
      </AuthGate>
    );

    expect(screen.getByText('앱 화면')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 실패 확인**

Run:

```bash
npm test -- src/features/auth/ui/AuthGate.test.tsx
```

Expected:

```text
FAIL src/features/auth/ui/AuthGate.test.tsx
Cannot find module './AuthGate'
```

- [ ] **Step 3: AuthProvider 구현**

Create `src/features/auth/model/AuthProvider.tsx`:

```tsx
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/shared/api';

export type AuthUser = {
  avatarUrl: string | null;
  displayName: string;
  email: string | null;
  id: string;
};

export type AuthState =
  | { status: 'loading'; user: null }
  | { status: 'signed-out'; user: null }
  | { status: 'signed-in'; user: AuthUser };

type AuthContextValue = {
  authState: AuthState;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function mapUser(user: User): AuthUser {
  return {
    avatarUrl:
      typeof user.user_metadata.avatar_url === 'string'
        ? user.user_metadata.avatar_url
        : null,
    displayName:
      typeof user.user_metadata.full_name === 'string'
        ? user.user_metadata.full_name
        : user.email ?? '사용자',
    email: user.email ?? null,
    id: user.id,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    status: 'loading',
    user: null,
  });

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) {
        return;
      }

      setAuthState(
        data.session?.user
          ? { status: 'signed-in', user: mapUser(data.session.user) }
          : { status: 'signed-out', user: null }
      );
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthState(
        session?.user
          ? { status: 'signed-in', user: mapUser(session.user) }
          : { status: 'signed-out', user: null }
      );
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(() => ({ authState }), [authState]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error('useAuth는 AuthProvider 내부에서만 사용할 수 있습니다.');
  }

  return value;
}
```

- [ ] **Step 4: LandingPage와 LoginPage 구현**

Create `src/pages/landing/ui/OnboardingMotionPreview.tsx`:

```tsx
import { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

export function OnboardingMotionPreview() {
  const rootRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const reduceMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)'
      ).matches;

      if (reduceMotion) {
        return;
      }

      const timeline = gsap.timeline({ repeat: -1, repeatDelay: 1.2 });
      timeline
        .from('.onboarding-motion__card', {
          opacity: 0,
          stagger: 0.12,
          y: 18,
        })
        .from('.onboarding-motion__situation', { opacity: 0, y: 10 })
        .to('.onboarding-motion__card', {
          stagger: 0.08,
          x: 18,
          y: -8,
        })
        .from('.onboarding-motion__pack', { opacity: 0, y: 16 });
    },
    { scope: rootRef }
  );

  return (
    <div className="onboarding-motion" ref={rootRef} aria-hidden="true">
      <p className="onboarding-motion__situation">
        팀 프로젝트 앱 첫 화면 참고
      </p>
      <div className="onboarding-motion__card">첫 화면 흐름 메모</div>
      <div className="onboarding-motion__card">React 폼 구현 글</div>
      <div className="onboarding-motion__pack">지금 다시 볼 작업팩</div>
    </div>
  );
}
```

주의:

- GSAP은 이 컴포넌트 안에서만 import한다.
- 앱 내부 화면 전환과 버튼/카드 micro interaction에는 Motion 또는 CSS transition을 사용한다.
- `prefers-reduced-motion`에서는 timeline을 만들지 않고 정적 미리보기만 보여준다.

Create `src/pages/landing/ui/LandingPage.tsx`:

```tsx
import { Button } from '@/shared/ui';
import { OnboardingMotionPreview } from './OnboardingMotionPreview';

type LandingPageProps = {
  onStart: () => void;
};

const highlights = [
  'URL과 짧은 메모를 바로 보관해요.',
  '정리는 나중에 필요한 만큼만 해요.',
  '지금 하는 일에 맞게 다시 꺼내봐요.',
];

export function LandingPage({ onStart }: LandingPageProps) {
  return (
    <main className="landing-page">
      <section className="landing-page__content">
        <p className="section-kicker">인사이트 저장소</p>
        <h1>아맞다</h1>
        <p>
          저장해둔 인사이트를 현재 상황이나 목적에 맞게 다시 꺼내보세요.
        </p>
        <ul>
          {highlights.map((highlight) => (
            <li key={highlight}>{highlight}</li>
          ))}
        </ul>
        <Button onClick={onStart}>서비스 경험하기</Button>
      </section>
      <OnboardingMotionPreview />
    </main>
  );
}
```

Create `src/pages/login/ui/LoginPage.tsx`:

```tsx
import { signInWithGoogle } from '@/features/auth';
import { Button } from '@/shared/ui';

type LoginPageProps = {
  onBack: () => void;
};

export function LoginPage({ onBack }: LoginPageProps) {
  return (
    <main className="login-page">
      <button className="back-button" type="button" onClick={onBack}>
        서비스 소개로
      </button>
      <section className="login-panel">
        <h1>환영합니다!</h1>
        <p>로그인 후 나만의 보관함과 꺼내보기를 사용할 수 있어요.</p>
        <Button onClick={() => void signInWithGoogle()}>
          Google로 시작하기
        </Button>
        <p className="login-helper">간편 로그인</p>
        <p className="terms-notice">
          로그인 시 이용약관 및 개인정보처리방침에 동의하게 됩니다.
        </p>
      </section>
    </main>
  );
}
```

- [ ] **Step 5: AuthGate 구현**

Create `src/features/auth/ui/AuthGate.tsx`:

```tsx
import type { ReactNode } from 'react';
import { useState } from 'react';
import { LandingPage } from '@/pages/landing';
import { LoginPage } from '@/pages/login';
import type { AuthState } from './AuthProvider';
import { useAuth } from './AuthProvider';

type AuthGateProps = {
  authState?: AuthState;
  children: ReactNode;
};

type AuthGateContentProps = {
  authState: AuthState;
  children: ReactNode;
};

type AuthEntryScreen = 'landing' | 'login';

function AuthGateContent({ authState, children }: AuthGateContentProps) {
  const [entryScreen, setEntryScreen] = useState<AuthEntryScreen>('landing');

  if (authState.status === 'loading') {
    return <p className="loading-message">로그인 상태를 확인하고 있습니다.</p>;
  }

  if (authState.status === 'signed-out') {
    if (entryScreen === 'login') {
      return <LoginPage onBack={() => setEntryScreen('landing')} />;
    }

    return <LandingPage onStart={() => setEntryScreen('login')} />;
  }

  return <>{children}</>;
}

function AuthGateWithContext({ children }: { children: ReactNode }) {
  const { authState } = useAuth();

  return <AuthGateContent authState={authState}>{children}</AuthGateContent>;
}

export function AuthGate({ authState, children }: AuthGateProps) {
  if (authState) {
    return <AuthGateContent authState={authState}>{children}</AuthGateContent>;
  }

  return <AuthGateWithContext>{children}</AuthGateWithContext>;
}
```

- [ ] **Step 6: App에 인증 게이트 연결**

Modify `src/app/App.tsx`:

```tsx
import { useState } from 'react';
import { AppShell } from '@/app/AppShell';
import { AuthGate } from '@/features/auth';
import { AuthProvider } from '@/features/auth';
import type { AppTab } from '@/shared/model';
import { DEFAULT_APP_TAB } from '@/shared/model';
import { HomePage } from '@/pages/home';
import { LibraryPage } from '@/pages/library';
import { SavePage } from '@/pages/save';

function AuthenticatedApp() {
  const [activeTab, setActiveTab] = useState<AppTab>(DEFAULT_APP_TAB);

  return (
    <AppShell activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'library' ? <LibraryPage /> : null}
      {activeTab === 'home' ? <HomePage /> : null}
      {activeTab === 'save' ? <SavePage /> : null}
    </AppShell>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AuthGate>
        <AuthenticatedApp />
      </AuthGate>
    </AuthProvider>
  );
}
```

- [ ] **Step 7: 테스트와 빌드 확인**

Run:

```bash
npm test -- src/features/auth/ui/AuthGate.test.tsx
npm run build
```

Expected:

```text
2 passed
✓ built in
```

- [ ] **Step 8: 커밋**

Run:

```bash
git add package.json package-lock.json src/features/auth/model/AuthProvider.tsx src/features/auth/ui/AuthGate.tsx src/features/auth/ui/AuthGate.test.tsx src/pages/landing/ui/LandingPage.tsx src/pages/landing/ui/OnboardingMotionPreview.tsx src/pages/login/ui/LoginPage.tsx src/app/App.tsx
git commit -m "feat: 인증 게이트와 로그인 전 화면 구현"
```

---

### Task 4: 프로필 메뉴에 로그아웃 연결

**Files:**

- Modify: `src/app/AppShell.tsx`
- Create: `src/app/AppShell.auth.test.tsx`

- [ ] **Step 1: 프로필 메뉴 테스트 작성**

Create `src/app/AppShell.auth.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AppShell } from './AppShell';

describe('AppShell profile menu', () => {
  it('renders profile email and calls sign out', async () => {
    const handleSignOut = vi.fn();
    const user = userEvent.setup();

    render(
      <AppShell
        activeTab="home"
        onSignOut={handleSignOut}
        onTabChange={() => undefined}
        user={{
          avatarUrl: null,
          displayName: '최재원',
          email: 'jaewon@example.com',
          id: 'user-id',
        }}
      >
        <p>홈 화면</p>
      </AppShell>
    );

    await user.click(screen.getByRole('button', { name: '프로필 메뉴 열기' }));

    expect(screen.getByText('jaewon@example.com')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '로그아웃' }));

    expect(handleSignOut).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run:

```bash
npm test -- src/app/AppShell.auth.test.tsx
```

Expected:

```text
FAIL src/app/AppShell.auth.test.tsx
Unable to find an accessible element with the role "button" and name "로그아웃"
```

- [ ] **Step 3: AppShell 수정**

Modify `src/app/AppShell.tsx` so it accepts `user` and `onSignOut`:

```tsx
import { useState } from 'react';
import type { ReactNode } from 'react';
import { BottomNavigation } from '@/widgets/bottom-navigation';
import type { AuthUser } from '@/features/auth';
import { signOut } from '@/features/auth';
import type { AppTab } from '@/shared/model';
import { getAppTabLabel } from '@/shared/model';

type AppShellProps = {
  activeTab: AppTab;
  children: ReactNode;
  onSignOut?: () => void | Promise<void>;
  onTabChange: (tab: AppTab) => void;
  user?: AuthUser;
};

export function AppShell({
  activeTab,
  children,
  onSignOut = signOut,
  onTabChange,
  user,
}: AppShellProps) {
  const activeLabel = getAppTabLabel(activeTab);
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <div>
          <p className="app-shell__eyebrow">아맞다</p>
          <h1>{activeLabel}</h1>
        </div>
        <div className="profile-menu">
          <button
            aria-expanded={profileOpen}
            aria-label="프로필 메뉴 열기"
            className="profile-button"
            onClick={() => setProfileOpen((current) => !current)}
            type="button"
          >
            {user?.displayName.slice(0, 1) ?? '나'}
          </button>
          {profileOpen ? (
            <div className="profile-menu__panel">
              <strong>{user?.displayName ?? '사용자'}</strong>
              {user?.email ? <span>{user.email}</span> : null}
              <button onClick={() => void onSignOut()} type="button">
                로그아웃
              </button>
            </div>
          ) : null}
        </div>
      </header>
      <main aria-label={`${activeLabel} 화면`} className="app-shell__main">
        {children}
      </main>
      <BottomNavigation activeTab={activeTab} onTabChange={onTabChange} />
    </div>
  );
}
```

- [ ] **Step 4: App에서 사용자 정보 전달**

Modify `AuthenticatedApp` inside `src/app/App.tsx`:

```tsx
function AuthenticatedApp() {
  const [activeTab, setActiveTab] = useState<AppTab>(DEFAULT_APP_TAB);
  const { authState } = useAuth();

  return (
    <AppShell
      activeTab={activeTab}
      onTabChange={setActiveTab}
      user={authState.status === 'signed-in' ? authState.user : undefined}
    >
      {activeTab === 'library' ? <LibraryPage /> : null}
      {activeTab === 'home' ? <HomePage /> : null}
      {activeTab === 'save' ? <SavePage /> : null}
    </AppShell>
  );
}
```

Also add import:

```ts
import { useAuth } from '@/features/auth';
```

- [ ] **Step 5: 테스트와 빌드 확인**

Run:

```bash
npm test -- src/app/AppShell.auth.test.tsx
npm run build
```

Expected:

```text
1 passed
✓ built in
```

- [ ] **Step 6: 커밋**

Run:

```bash
git add src/app/AppShell.tsx src/app/AppShell.auth.test.tsx src/app/App.tsx
git commit -m "feat: 프로필 메뉴 로그아웃 연결"
```

---

## Self-Review

**Spec coverage:**

- Google OAuth만 로그인 방식으로 제공한다.
- 로그인 전 소개 화면에 서비스명, 한 줄 소개, 핵심 경험 미리보기, `서비스 경험하기` CTA가 있다.
- `서비스 경험하기` CTA 이후 별도 로그인 화면에서 Google 로그인 버튼과 약관/개인정보처리방침 안내를 제공한다.
- 인증 상태를 감지하고 비로그인 사용자의 앱 접근을 막는다.
- 로그아웃 기능과 기본 프로필 정보 표시가 포함된다.
- 별도 설정 페이지는 만들지 않는다.

**Placeholder scan:**

- 금지된 자리표시자 표현은 본문에 사용하지 않았다.
- 모든 코드 변경 단계는 파일 경로와 코드 블록을 포함한다.

**Type consistency:**

- `AuthState`, `AuthUser`, `AppShellProps`의 사용자 정보 타입 흐름이 일치한다.
- `signInWithGoogle`은 Google provider만 허용한다.

## Execution Handoff

계획 작성이 완료되었고 `docs/superpowers/plans/amadda-auth.md`에 저장되었다. 실행 방식은 두 가지다.

**1. Subagent-Driven (recommended)** - 태스크마다 새 subagent를 투입하고, 각 태스크 사이에 리뷰하며 빠르게 반복한다.

**2. Inline Execution** - 현재 세션에서 `executing-plans` 방식으로 실행하고, 중간 체크포인트마다 검토한다.

어떤 방식으로 실행할지 선택한다.
