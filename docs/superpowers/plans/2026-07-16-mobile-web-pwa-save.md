# Mobile Web and Android PWA Save Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 로그인한 사용자가 모바일 웹에서는 클립보드·직접 입력으로, 설치된 Android Chrome PWA에서는 시스템 공유 메뉴로 링크를 확인 후 저장할 수 있게 한다.

**Architecture:** 매니페스트는 공유 값을 `POST /share-target` 폼으로 전달하고 서비스 워커가 이를 `/#share-target?...` same-origin `303` redirect로 바꾼다. fragment는 HTTP 요청에 포함되지 않는다. `app/model`은 인증이 끝난 뒤 로그인 상태에서만 이 fragment를 `android_share` 저장 초안으로 해석하고, 로그인 여부와 관계없이 fragment를 주소에서 제거한다. 기존 `useInsightWorkspace`는 사용자가 저장을 선택했을 때만 소스·제목·URL을 공통 캡처 계약에 넘기며, 저장 페이지는 클립보드 보조 입력과 공유 초안 표시를 담당한다.

**Tech Stack:** React 19, TypeScript, Vite PWA 정적 자산, Vitest, Testing Library, 기존 Supabase 공통 캡처 API.

---

## 파일 구조

- 생성: `src/app/model/pwa_shared_save_draft.ts` — `#share-target` fragment를 `android_share` 저장 초안으로 제한적으로 해석하고 fragment 제거 경로를 만든다.
- 생성: `src/app/model/pwa_shared_save_draft.test.ts` — URL 후보 우선순위, 프로토콜 제한, 제목 처리와 fragment 제거를 검증한다.
- 생성: `src/shared/browser/read_clipboard_text.ts` — 지원되는 브라우저에서만 클립보드 문자열을 읽고 실패를 빈 값으로 바꾼다.
- 생성: `src/shared/browser/read_clipboard_text.test.ts` — 성공·권한 거부·미지원 환경을 검증한다.
- 생성: `src/shared/pwa/register_service_worker.ts` — 프로덕션 브라우저에서 서비스 워커를 등록한다.
- 생성: `src/shared/pwa/register_service_worker.test.ts` — 지원·미지원·등록 실패를 검증한다.
- 생성: `src/features/pwa-install/model/use_pwa_install_prompt.ts` — Android Chrome의 한 번뿐인 설치 안내 상태와 설치 이벤트를 관리한다.
- 생성: `src/features/pwa-install/ui/pwa_install_notice.tsx` — 설치·닫기 선택을 제공하는 안내 UI다.
- 생성: `src/features/pwa-install/ui/pwa_install_notice.css` — 기존 디자인 토큰만 사용하는 안내 스타일이다.
- 생성: `src/features/pwa-install/index.ts` — 기능의 공개 API다.
- 수정: `src/app/app.tsx` 및 `src/app/app.test.tsx` — 인증 상태에 따라 공유 초안을 전달하고 인증 완료 뒤 공유 fragment를 폐기한다.
- 수정: `src/app/authenticated_workspace.tsx` 및 `src/app/authenticated_workspace.test.tsx` — 저장 초안·소스와 설치 안내를 연결한다.
- 수정: `src/app/model/use_insight_workspace.ts` 및 `src/app/model/use_insight_workspace.test.tsx` — `web`과 `android_share`를 보존하는 저장 입력을 지원한다.
- 수정: `src/pages/save/ui/save_page.tsx`, `src/pages/save/ui/save_page.css`, `src/pages/save/ui/save_page.test.tsx` — 클립보드 버튼, 공유 저장 문구, 44px 모바일 제어를 추가한다.
- 수정: `src/main.tsx`, `index.html`, `docs/superpowers/specs/2026-07-16-mobile-web-pwa-save-design.md` — 서비스 워커 등록·매니페스트 연결과 POST 공유 대상 흐름을 반영한다.
- 생성: `public/manifest.webmanifest`, `public/service_worker.js`, `public/icons/amadda-192.png`, `public/icons/amadda-512.png` — 설치와 Android 공유 대상에 필요한 공개 자산이다.

### Task 1: PWA 공유 fragment 해석을 인증 경계 밖으로 새지 않게 만든다

**Files:**

- Create: `src/app/model/pwa_shared_save_draft.ts`
- Test: `src/app/model/pwa_shared_save_draft.test.ts`
- Modify: `src/app/app.tsx`
- Test: `src/app/app.test.tsx`

- [ ] **Step 1: 공유 URL 우선순위와 fragment 삭제의 실패 테스트를 작성한다.**

```ts
it('공유 URL과 제목을 android_share 저장 초안으로 해석한다', () => {
  expect(
    readPwaSharedSaveDraft(
      '#share-target?shared_url=https%3A%2F%2Fexample.com&shared_title=%EA%B8%B0%EC%82%AC'
    )
  ).toEqual({
    source: 'android_share',
    title: '기사',
    url: 'https://example.com',
  });
});

it('공유 URL, 텍스트, 제목 순서로 첫 HTTP URL을 사용한다', () => {
  expect(
    readPwaSharedSaveDraft(
      '#share-target?shared_text=https%3A%2F%2Fexample.com%2Farticle&shared_title=https%3A%2F%2Ffallback.example.com'
    )
  ).toMatchObject({ url: 'https://example.com/article' });
});

it('share-target fragment만 제거하고 pathname과 search를 보존한다', () => {
  expect(
    removePwaSharedSaveFragment(
      '/library?tab=save#share-target?shared_url=https%3A%2F%2Fexample.com'
    )
  ).toBe('/library?tab=save');
  expect(removePwaSharedSaveFragment('/library?tab=save#top')).toBeUndefined();
});
```

- [ ] **Step 2: 테스트가 아직 모듈을 찾지 못해 실패하는지 확인한다.**

Run: `npm test -- src/app/model/pwa_shared_save_draft.test.ts`

Expected: FAIL with a module-not-found error for `pwa_shared_save_draft`.

- [ ] **Step 3: Android PWA 전용 초안 해석기를 구현한다.**

```ts
export type PwaSharedSaveDraft = {
  source: 'android_share';
  title?: string;
  url: string;
};

const SHARE_TARGET_FRAGMENT = '#share-target';
const SHARE_TARGET_QUERY_PREFIX = `${SHARE_TARGET_FRAGMENT}?`;

export function readPwaSharedSaveDraft(
  hash: string
): PwaSharedSaveDraft | undefined {
  const params = readShareTargetParams(hash);
  if (!params) return undefined;
  const url = [
    params.get('shared_url'),
    params.get('shared_text'),
    params.get('shared_title'),
  ]
    .map(findHttpUrl)
    .find((candidate): candidate is string => Boolean(candidate));
  if (!url) return undefined;
  const title = params.get('shared_title')?.trim();
  return {
    source: 'android_share',
    ...(title && title !== url ? { title } : {}),
    url,
  };
}

export function removePwaSharedSaveFragment(path: string): string | undefined {
  const url = new URL(path, 'https://amadda.local');
  if (!readShareTargetParams(url.hash)) return undefined;
  return `${url.pathname}${url.search}`;
}
```

`readShareTargetParams`는 정확히 `#share-target` 또는 `#share-target?`로 시작하는 fragment만 해석한다. `findHttpUrl`은 각 필드에서 `http://` 또는 `https://` 후보만 반환하고, 그 외 프로토콜은 반환하지 않는다. 제목은 trim하고 선택된 URL과 같으면 초안 제목에서 제외한다.

- [ ] **Step 4: 앱이 로그인 상태에서만 초안을 전달하고, 로그아웃 상태에서는 초안을 만들지 않은 채 주소를 정리하도록 실패 테스트를 추가한다.**

```tsx
it('로그인한 공유 진입은 저장 화면에 android_share 초안을 전달한다', async () => {
  window.history.replaceState(
    {},
    '',
    '/?tab=save#share-target?shared_url=https%3A%2F%2Fexample.com'
  );
  render(<App authService={createSignedInAuthService()} />);
  expect(await screen.findByLabelText('링크 URL')).toHaveValue(
    'https://example.com'
  );
  expect(window.location.hash).toBe('');
  expect(window.location.search).toBe('?tab=save');
});

it('로그아웃 상태에서는 공유 초안을 렌더링하거나 캡처하지 않고 주소만 정리한다', async () => {
  window.history.replaceState(
    {},
    '',
    '/?tab=save#share-target?shared_url=https%3A%2F%2Fexample.com'
  );
  render(<App authService={createSignedOutAuthService()} />);
  expect(await screen.findByRole('button', { name: '시작하기' })).toBeVisible();
  expect(screen.queryByLabelText('링크 URL')).not.toBeInTheDocument();
  expect(window.location.hash).toBe('');
  expect(window.location.search).toBe('?tab=save');
});
```

- [ ] **Step 5: 인증 상태별 공유 초안 처리와 주소 정리를 구현한다.**

```tsx
const sharedSaveDraft = useMemo(
  () => authState.status === 'signed-in' ? readPwaSharedSaveDraft(window.location.hash) : undefined,
  [authState.status]
);

useEffect(() => {
  const nextPath = removePwaSharedSaveFragment(`${window.location.pathname}${window.location.search}${window.location.hash}`);
  if (!nextPath || authState.status === 'loading') return;
  window.history.replaceState({}, '', nextPath);
}, [authState.status]);

<AuthenticatedWorkspace initialSaveDraft={sharedSaveDraft} ... />
```

이 effect는 인증 상태가 확정된 로그인·로그아웃 상태 모두에서 일시적인 `#share-target` fragment만 제거하고 pathname과 search를 보존한다. 초안은 제거 전에 로그인 상태에서만 만들며, 다른 hash는 변경하지 않는다.

- [ ] **Step 6: targeted tests pass and commit the authentication-safe share entry.**

Run: `npm test -- src/app/model/pwa_shared_save_draft.test.ts src/app/app.test.tsx`

Expected: PASS.

```bash
git add src/app/model/pwa_shared_save_draft.ts src/app/model/pwa_shared_save_draft.test.ts src/app/app.tsx src/app/app.test.tsx
git commit -m "feat: PWA 공유 저장 진입 처리"
```

### Task 2: 캡처 계약과 저장 화면을 소스 인지형으로 만든다

**Files:**

- Modify: `src/app/model/use_insight_workspace.ts`
- Test: `src/app/model/use_insight_workspace.test.tsx`
- Modify: `src/app/authenticated_workspace.tsx`
- Test: `src/app/authenticated_workspace.test.tsx`
- Modify: `src/pages/save/ui/save_page.tsx`
- Test: `src/pages/save/ui/save_page.test.tsx`

- [x] **Step 1: `android_share` 저장이 제목·URL·소스를 보존해야 한다는 실패 테스트를 작성한다.**

```tsx
await act(async () => {
  result.current.saveInsight({
    source: 'android_share',
    title: '공유 제목',
    url: 'https://example.com',
  });
});
expect(captureService.capture).toHaveBeenCalledWith({
  source: 'android_share',
  title: '공유 제목',
  url: 'https://example.com',
});
```

- [x] **Step 2: 테스트가 문자열만 받는 기존 API 때문에 실패하는지 확인한다.**

Run: `npm test -- src/app/model/use_insight_workspace.test.tsx`

Expected: FAIL because `saveInsight` accepts a string.

- [x] **Step 3: 저장 입력 타입과 공통 캡처 전달을 구현한다.**

```ts
export type SaveInsightInput = {
  source: InsightCaptureSource;
  title?: string;
  url: string;
};

const saveInsight = useCallback(
  async (input: SaveInsightInput): Promise<SaveInsightResult> => {
    return runMutation(
      async () => {
        const captureResult = await captureService.capture(input);
        // 기존 성공·실패·업서트 로직을 그대로 적용한다.
      },
      { ok: false, reason: 'write-failed' }
    );
  },
  [captureService, repository, runMutation]
);
```

- [x] **Step 4: 공유 진입이 저장 탭과 제목 문구를 열되 자동 저장하지 않는 실패 테스트를 작성한다.**

```tsx
render(
  <AuthenticatedWorkspace
    initialSaveDraft={{
      source: 'android_share',
      title: '공유 제목',
      url: 'https://example.com',
    }}
    repository={repository}
    captureService={captureService}
  />
);
expect(
  await screen.findByRole('heading', { name: '공유한 링크를 보관할까요?' })
).toBeVisible();
expect(screen.getByLabelText('링크 URL')).toHaveValue('https://example.com');
expect(captureService.capture).not.toHaveBeenCalled();
await user.click(screen.getByRole('button', { name: '저장하기' }));
expect(captureService.capture).toHaveBeenCalledWith({
  source: 'android_share',
  title: '공유 제목',
  url: 'https://example.com',
});
```

- [x] **Step 5: 작업공간의 초기 저장 초안과 일반 저장 초기화를 구현한다.**

```tsx
export type AuthenticatedWorkspaceProps = {
  initialSaveDraft?: SaveInsightInput;
  // 기존 props
};

const [activeTab, setActiveTab] = useState<WorkspaceTab>(() =>
  initialSaveDraft ? 'save' : 'home'
);
const [saveDraft, setSaveDraft] = useState<SaveInsightInput>(
  () => initialSaveDraft ?? { source: 'web', url: '' }
);

const saveResult = await saveInsight(saveDraft);
function handleSaveUrlChange(url: string) {
  setSaveDraft((draft) => ({ ...draft, url }));
  resetSaveFeedback();
}
```

The skip handler resets `saveDraft` to `{ source: 'web', url: '' }`, so a later ordinary save cannot inherit the Android share source or title.

- [x] **Step 6: 저장 페이지에 공유 문구를 표시하되 기존 직접 입력 필드를 유지한다.**

```tsx
export type SavePageProps = {
  isSharedSave?: boolean;
  // 기존 props
};

<h2 id="save-title">{isSharedSave ? '공유한 링크를 보관할까요?' : 'URL만 넣고 바로 보관해요'}</h2>
<TextField aria-label="링크 URL" id="save-url" ... />
```

- [x] **Step 7: 계약·작업공간·페이지 테스트를 통과시키고 커밋한다.**

Run: `npm test -- src/app/model/use_insight_workspace.test.tsx src/app/authenticated_workspace.test.tsx src/pages/save/ui/save_page.test.tsx`

Expected: PASS.

```bash
git add src/app/model/use_insight_workspace.ts src/app/model/use_insight_workspace.test.tsx src/app/authenticated_workspace.tsx src/app/authenticated_workspace.test.tsx src/pages/save/ui/save_page.tsx src/pages/save/ui/save_page.test.tsx
git commit -m "feat: 공유 저장 초안과 캡처 소스 연결"
```

### Task 3: 모바일 저장 화면에 실패해도 막히지 않는 클립보드 보조 동작을 추가한다

**Files:**

- Create: `src/shared/browser/read_clipboard_text.ts`
- Test: `src/shared/browser/read_clipboard_text.test.ts`
- Modify: `src/pages/save/ui/save_page.tsx`
- Modify: `src/pages/save/ui/save_page.css`
- Test: `src/pages/save/ui/save_page.test.tsx`
- Modify: `src/app/authenticated_workspace.tsx`

- [x] **Step 1: 클립보드 성공·미지원·권한 거부의 실패 테스트를 작성한다.**

```ts
it('클립보드 텍스트를 trim 해서 반환한다', async () => {
  vi.stubGlobal('navigator', {
    clipboard: { readText: vi.fn().mockResolvedValue(' https://example.com ') },
  });
  await expect(readClipboardText()).resolves.toBe('https://example.com');
});

it('미지원 또는 읽기 실패는 빈 문자열을 반환한다', async () => {
  vi.stubGlobal('navigator', {});
  await expect(readClipboardText()).resolves.toBe('');
});
```

- [x] **Step 2: 새 helper가 없어 테스트가 실패하는지 확인한다.**

Run: `npm test -- src/shared/browser/read_clipboard_text.test.ts`

Expected: FAIL with a module-not-found error.

- [x] **Step 3: 브라우저 API를 감싼 최소 helper를 구현한다.**

```ts
export async function readClipboardText(): Promise<string> {
  try {
    return (await navigator.clipboard?.readText?.())?.trim() ?? '';
  } catch {
    return '';
  }
}
```

- [x] **Step 4: 저장 페이지 버튼이 읽은 URL만 채우고 직접 입력을 항상 남긴다는 실패 테스트를 작성한다.**

```tsx
await user.click(screen.getByRole('button', { name: '클립보드에서 붙여넣기' }));
expect(onPasteFromClipboard).toHaveBeenCalledTimes(1);
expect(screen.getByLabelText('링크 URL')).toBeVisible();
```

- [x] **Step 5: 버튼·작업공간 연결·모바일 스타일을 구현한다.**

```tsx
<Button
  hierarchy="secondary"
  onClick={onPasteFromClipboard}
  size="medium"
  type="button"
>
  클립보드에서 붙여넣기
</Button>
```

`AuthenticatedWorkspace`는 버튼 이벤트에서 `readClipboardText()`를 await하고 빈 값이 아닐 때만 `handleSaveUrlChange`에 전달한다. `save_page.css`의 `@media (max-width: 767px)`에서는 버튼과 URL 입력·저장 버튼을 전폭으로 두고 `.save-page__form`의 각 버튼 최소 높이를 `44px`으로 유지한다.

- [x] **Step 6: helper와 저장 페이지의 테스트를 통과시키고 커밋한다.**

Run: `npm test -- src/shared/browser/read_clipboard_text.test.ts src/pages/save/ui/save_page.test.tsx src/app/authenticated_workspace.test.tsx`

Expected: PASS.

```bash
git add src/shared/browser/read_clipboard_text.ts src/shared/browser/read_clipboard_text.test.ts src/pages/save/ui/save_page.tsx src/pages/save/ui/save_page.css src/pages/save/ui/save_page.test.tsx src/app/authenticated_workspace.tsx src/app/authenticated_workspace.test.tsx
git commit -m "feat: 모바일 저장 클립보드 붙여넣기"
```

**Task 2~3 실제 검증 (2026-07-17):**

- RED: 공유 제목 입력, 저장 완료 뒤 클립보드 초안 교체, 전용 모바일 CSS 계약에 대한 집중 테스트에서 4건 실패를 확인했다.
- GREEN: 같은 집중 테스트는 3개 파일에서 5건 모두 통과했다.
- 대상 회귀: `use_insight_workspace`, `authenticated_workspace`, `save_page`, 저장 페이지 CSS 계약, 클립보드 helper의 5개 파일에서 50건 모두 통과했다.
- 정적 검증: 대상 ESLint와 Prettier 검사가 통과했고 `npm run build`가 성공했다. Vite의 500 kB 초과 청크 경고는 남아 있다.

### Task 4: 설치 가능한 Android PWA와 첫 저장 설치 안내를 만든다

**Files:**

- Create: `public/manifest.webmanifest`
- Create: `public/service_worker.js`
- Create: `public/icons/amadda-192.png`
- Create: `public/icons/amadda-512.png`
- Create: `src/shared/pwa/register_service_worker.ts`
- Test: `src/shared/pwa/register_service_worker.test.ts`
- Create: `src/features/pwa-install/model/use_pwa_install_prompt.ts`
- Create: `src/features/pwa-install/ui/pwa_install_notice.tsx`
- Create: `src/features/pwa-install/ui/pwa_install_notice.css`
- Create: `src/features/pwa-install/index.ts`
- Modify: `index.html`
- Modify: `src/main.tsx`
- Modify: `src/app/authenticated_workspace.tsx`
- Test: `src/app/authenticated_workspace.test.tsx`
- Modify: `docs/superpowers/specs/2026-07-16-mobile-web-pwa-save-design.md`

- [ ] **Step 1: 서비스 워커 등록의 지원·미지원·실패 테스트를 작성한다.**

```ts
it('서비스 워커가 지원되면 루트 범위로 등록한다', async () => {
  const register = vi.fn().mockResolvedValue({});
  vi.stubGlobal('navigator', { serviceWorker: { register } });
  await registerServiceWorker();
  expect(register).toHaveBeenCalledWith('/service_worker.js', { scope: '/' });
});

it('서비스 워커 미지원과 등록 실패는 앱을 중단하지 않는다', async () => {
  vi.stubGlobal('navigator', {});
  await expect(registerServiceWorker()).resolves.toBeUndefined();
});
```

- [ ] **Step 2: 아직 없는 등록 모듈이 테스트를 실패시키는지 확인한다.**

Run: `npm test -- src/shared/pwa/register_service_worker.test.ts`

Expected: FAIL with a module-not-found error.

- [ ] **Step 3: 서비스 워커 등록과 정적 PWA 자산을 구현한다.**

```ts
export async function registerServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  try {
    await navigator.serviceWorker.register('/service_worker.js', {
      scope: '/',
    });
  } catch {
    // 설치 보조 기능의 실패는 로그인한 웹 저장을 막지 않는다.
  }
}
```

`public/manifest.webmanifest`는 `name`, `short_name`, `id`, `start_url`, `scope`, `display: "standalone"`, 192px·512px PNG 아이콘과 다음 POST 공유 대상을 선언한다.

```json
"share_target": {
  "action": "/share-target",
  "method": "POST",
  "enctype": "application/x-www-form-urlencoded",
  "params": { "title": "shared_title", "text": "shared_text", "url": "shared_url" }
}
```

`public/service_worker.js`는 install에서 `self.skipWaiting()`, activate에서 `clients.claim()`을 수행한다. 또한 same-origin `POST /share-target`만 가로채 폼의 `shared_title`, `shared_text`, `shared_url`을 URL 인코딩하고 `/#share-target?...`로 향하는 `303` 응답을 반환한다. redirect의 fragment는 후속 HTTP 요청에 포함되지 않으며, 공유 폼을 서버로 전달하거나 자동 저장하지 않는다. 캐시와 오프라인 동작은 구현하지 않는다. `index.html`에는 `/manifest.webmanifest`와 기존 시각 토큰에 맞춘 `theme-color`를 연결하고, `main.tsx`는 앱 bootstrap 후 `void registerServiceWorker()`를 호출한다. 아이콘은 기존 아마다 마크와 같은 흰 배경·짙은 테두리·보라색 사각 점으로 192×192, 512×512 PNG를 생성한다.

- [ ] **Step 4: Android Chrome에서 첫 저장 성공 뒤 한 번만 안내되는 실패 테스트를 작성한다.**

```tsx
fireEvent(window, new Event('beforeinstallprompt'));
await user.click(screen.getByRole('button', { name: '저장하기' }));
expect(await screen.findByText('더 빠르게 저장하기')).toBeVisible();
await user.click(screen.getByRole('button', { name: '나중에' }));
expect(localStorage.getItem('amadda.pwa-install-notice.v1')).toBe('seen');
```

- [ ] **Step 5: Android Chrome 한정 설치 안내와 저장 성공 연결을 구현한다.**

```tsx
const { dismiss, install, isVisible, revealAfterSuccessfulSave } =
  usePwaInstallPrompt();

if (saveResult.ok) {
  revealAfterSuccessfulSave();
}

{
  isVisible ? (
    <PwaInstallNotice onDismiss={dismiss} onInstall={() => void install()} />
  ) : null;
}
```

The hook accepts a testable `userAgent` and storage dependency, keeps the deferred `beforeinstallprompt` event in a ref, and writes `amadda.pwa-install-notice.v1 = "seen"` before displaying. It only enables on Android Chrome user agents; iPhone, non-Chrome Android, absent event, and previously seen state all return no notice.

- [ ] **Step 6: PWA assets and installation notice tests pass, then commit.**

Run: `npm test -- src/shared/pwa/register_service_worker.test.ts src/app/authenticated_workspace.test.tsx && npm run build`

Expected: PASS and a Vite production build containing `manifest.webmanifest`, icons, and `service_worker.js`.

```bash
git add public/manifest.webmanifest public/service_worker.js public/icons/amadda-192.png public/icons/amadda-512.png index.html src/main.tsx src/shared/pwa/register_service_worker.ts src/shared/pwa/register_service_worker.test.ts src/features/pwa-install src/app/authenticated_workspace.tsx src/app/authenticated_workspace.test.tsx docs/superpowers/specs/2026-07-16-mobile-web-pwa-save-design.md
git commit -m "feat: Android PWA 공유 설치 지원"
```

### Task 5: 전체 회귀 검증과 실기기 확인을 준비한다

**Files:**

- Modify: `docs/superpowers/plans/2026-07-16-mobile-web-pwa-save.md` — 완료한 checkbox와 실제 검증 결과를 기록한다.

- [ ] **Step 1: 타입·정적 규칙·전체 테스트를 실행한다.**

Run: `npm run format:check && npm run lint && npm test && npm run build`

Expected: every command exits 0; existing desktop tests and the new mobile/PWA tests pass.

- [ ] **Step 2: 데스크톱과 모바일 폭에서 수동 UI 회귀를 확인한다.**

Run: `npm run dev:client`

Expected: desktop preserves home/library/save navigation; at 390px the save page is one column, URL input remains editable, and all visible controls are at least 44px tall.

- [ ] **Step 3: Android Chrome 실기기 확인을 사용자에게 요청한다.**

Use a production HTTPS deployment, install the PWA, then share a Chrome page to `아맞다에 저장`. Confirm the save page receives URL/title, no item appears until `저장하기`, and the saved item is visible in that account's library. This step requires the user's Android device and is the only external validation gate.

- [ ] **Step 4: 검증 결과를 기록하고 구현 커밋의 상태를 공유한다.**

```bash
git status --short
git log --oneline --decorate -5
```

Expected: no unintended files, all local commits scoped to issue #37, and a clear handoff point for Android Chrome verification.
