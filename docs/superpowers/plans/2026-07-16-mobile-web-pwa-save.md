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
- 생성: `src/shared/pwa/install_prompt_event_store.ts` — React 렌더 전에 `beforeinstallprompt`를 보관하고 `appinstalled`에서 폐기하는 브라우저 이벤트 저장소다.
- 생성: `src/shared/pwa/install_prompt_event_store.test.ts` — 선행 이벤트 보관, 중복 시작, 구독과 설치 완료 정리를 검증한다.
- 생성: `src/shared/pwa/register_service_worker.ts` — 프로덕션 브라우저에서만 서비스 워커를 등록한다.
- 생성: `src/shared/pwa/register_service_worker.test.ts` — 프로덕션·개발·미지원·등록 실패를 검증한다.
- 생성: `src/shared/pwa/pwa_assets_contract.test.ts` — 매니페스트, 서비스 워커 POST 처리, HTML 연결과 PNG 크기를 실제 공개 자산에서 검증한다.
- 생성: `src/shared/pwa/index.ts` — PWA 브라우저 어댑터의 공개 API다.
- 생성: `src/features/pwa-install/model/use_pwa_install_prompt.ts` — Android Chrome의 한 번뿐인 설치 안내 정책을 저장 성공과 이벤트 도착 순서에 무관하게 관리한다.
- 생성: `src/features/pwa-install/model/use_pwa_install_prompt.test.tsx` — 표시 순서, 브라우저 제한, 저장소 실패, prompt 1회와 설치 완료 정리를 검증한다.
- 생성: `src/features/pwa-install/ui/pwa_install_notice.tsx` — 설치·닫기 선택을 제공하는 안내 UI다.
- 생성: `src/features/pwa-install/ui/pwa_install_notice.css` — 기존 디자인 토큰만 사용하는 안내 스타일이다.
- 생성: `src/features/pwa-install/index.ts` — 기능의 공개 API다.
- 수정: `src/app/app.tsx` 및 `src/app/app.test.tsx` — 인증 상태에 따라 공유 초안을 전달하고 인증 완료 뒤 공유 fragment를 폐기한다.
- 수정: `src/app/authenticated_workspace.tsx` 및 `src/app/authenticated_workspace.test.tsx` — 저장 초안·소스와 설치 안내를 연결한다.
- 수정: `src/app/model/use_insight_workspace.ts` 및 `src/app/model/use_insight_workspace.test.tsx` — `web`과 `android_share`를 보존하는 저장 입력을 지원한다.
- 수정: `src/pages/save/ui/save_page.tsx`, `src/pages/save/ui/save_page.css`, `src/pages/save/ui/save_page.test.tsx` — 클립보드 버튼, 공유 저장 문구, 44px 모바일 제어를 추가한다.
- 수정: `src/main.tsx`, `index.html`, `docs/development-architecture.md`, `docs/superpowers/specs/2026-07-16-mobile-web-pwa-save-design.md` — React 이전 이벤트 캡처, 서비스 워커 등록, 매니페스트 연결, `features` 경계와 POST 공유 대상 흐름을 반영한다.
- 생성: `public/manifest.webmanifest`, `public/service_worker.js`, `public/icons/amadda-192.png`, `public/icons/amadda-512.png` — 설치와 Android 공유 대상에 필요한 공개 자산이다.

### Task 1: PWA 공유 fragment 해석을 인증 경계 밖으로 새지 않게 만든다

**Files:**

- Create: `src/app/model/pwa_shared_save_draft.ts`
- Test: `src/app/model/pwa_shared_save_draft.test.ts`
- Modify: `src/app/app.tsx`
- Test: `src/app/app.test.tsx`

- [x] **Step 1: 공유 URL 우선순위와 fragment 삭제의 실패 테스트를 작성한다.**

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

- [x] **Step 2: 테스트가 아직 모듈을 찾지 못해 실패하는지 확인한다.**

Run: `npm test -- src/app/model/pwa_shared_save_draft.test.ts`

Expected: FAIL with a module-not-found error for `pwa_shared_save_draft`.

- [x] **Step 3: Android PWA 전용 초안 해석기를 구현한다.**

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

- [x] **Step 4: 앱이 로그인 상태에서만 초안을 전달하고, 로그아웃 상태에서는 초안을 만들지 않은 채 주소를 정리하도록 실패 테스트를 추가한다.**

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

- [x] **Step 5: 인증 상태별 공유 초안 처리와 주소 정리를 구현한다.**

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

- [x] **Step 6: targeted tests pass and commit the authentication-safe share entry.**

Run: `npm test -- src/app/model/pwa_shared_save_draft.test.ts src/app/app.test.tsx`

Expected: PASS.

```bash
git add src/app/model/pwa_shared_save_draft.ts src/app/model/pwa_shared_save_draft.test.ts src/app/app.tsx src/app/app.test.tsx
git commit -m "feat: PWA 공유 저장 진입 처리"
```

**Task 1 실제 검증 (2026-07-17):**

- RED: `pwa_shared_save_draft`와 앱 공유 진입의 대상 테스트에서 7건 실패와 9건 통과를 확인했다.
- GREEN: 같은 2개 파일의 대상 테스트 16건이 모두 통과했다.
- 정적 검증: 대상 ESLint와 Prettier 검사가 통과했고 `92f153b`로 커밋했다.

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
- Create: `src/shared/pwa/install_prompt_event_store.ts`
- Test: `src/shared/pwa/install_prompt_event_store.test.ts`
- Create: `src/shared/pwa/register_service_worker.ts`
- Test: `src/shared/pwa/register_service_worker.test.ts`
- Test: `src/shared/pwa/pwa_assets_contract.test.ts`
- Create: `src/shared/pwa/index.ts`
- Create: `src/features/pwa-install/model/use_pwa_install_prompt.ts`
- Test: `src/features/pwa-install/model/use_pwa_install_prompt.test.tsx`
- Create: `src/features/pwa-install/ui/pwa_install_notice.tsx`
- Create: `src/features/pwa-install/ui/pwa_install_notice.css`
- Test: `src/features/pwa-install/ui/pwa_install_notice.test.tsx`
- Create: `src/features/pwa-install/index.ts`
- Modify: `index.html`
- Modify: `src/main.tsx`
- Modify: `src/app/authenticated_workspace.tsx`
- Test: `src/app/authenticated_workspace.test.tsx`
- Modify: `docs/development-architecture.md`
- Modify: `docs/superpowers/specs/2026-07-16-mobile-web-pwa-save-design.md`

- [ ] **Step 1: React보다 먼저 설치 이벤트를 보관하는 저장소의 실패 테스트를 작성한다.**

```ts
it('구독 전 발생한 설치 이벤트를 보관하고 기본 UI를 막는다', () => {
  const target = new EventTarget();
  const store = createInstallPromptEventStore();
  const promptEvent = createBeforeInstallPromptEvent();
  store.start(target);
  target.dispatchEvent(promptEvent);

  expect(promptEvent.preventDefault).toHaveBeenCalledOnce();
  expect(store.getSnapshot().prompt).toBe(promptEvent);
});

it('중복 start와 appinstalled를 안전하게 처리한다', () => {
  const target = new EventTarget();
  const store = createInstallPromptEventStore();
  store.start(target);
  store.start(target);
  target.dispatchEvent(createBeforeInstallPromptEvent());
  target.dispatchEvent(new Event('appinstalled'));

  expect(store.getSnapshot()).toEqual({ installed: true, prompt: undefined });
});
```

- [ ] **Step 2: 설치 이벤트 저장소가 없어 테스트가 실패하는지 확인한다.**

Run: `npm test -- src/shared/pwa/install_prompt_event_store.test.ts`

Expected: FAIL with a module-not-found error.

- [ ] **Step 3: 수명 이벤트 저장소와 순서 독립 설치 안내 정책을 구현한다.**

```ts
export type InstallPromptSnapshot = {
  installed: boolean;
  prompt?: BeforeInstallPromptEvent;
};

export type InstallPromptEventStore = {
  discardPrompt(): void;
  getSnapshot(): InstallPromptSnapshot;
  start(target: EventTarget): void;
  subscribe(listener: () => void): () => void;
  takePrompt(): BeforeInstallPromptEvent | undefined;
};

export const pwaInstallPromptEvents = createInstallPromptEventStore();
```

`start()`는 멱등이며 `beforeinstallprompt`에서 `preventDefault()` 후 prompt를 보관하고, `appinstalled`에서 prompt를 제거하고 `installed: true`를 발행한다. `takePrompt()`는 실제 prompt 호출 전에 이벤트를 원자적으로 제거한다. React 정책, Android 판별과 `localStorage`는 이 shared 저장소가 알지 않는다.

`usePwaInstallPrompt()`는 `useSyncExternalStore`로 저장소를 구독하고 다음 조건이 모두 참일 때 한 번만 안내를 연다.

```ts
const canReveal =
  isAndroidGoogleChrome(navigatorIdentity) &&
  hasSuccessfulSave &&
  Boolean(snapshot.prompt) &&
  !snapshot.installed &&
  !wasSeen;
```

이벤트→저장 성공과 저장 성공→이벤트 순서를 각각 테스트한다. 표시 직전 `amadda.pwa-install-notice.v1 = "seen"`을 기록하고, 저장소 읽기·쓰기가 실패하면 안내만 숨기는 fail-closed 정책을 사용한다. `install()`은 `takePrompt()` 뒤 `prompt()`와 `userChoice`를 한 번만 기다리고, `dismiss()`는 저장된 prompt를 폐기한다. Android 판별은 `userAgentData.platform === "Android"`와 `Google Chrome` 브랜드를 우선하고, UA 폴백은 `Android`와 `Chrome/`을 요구하면서 `SamsungBrowser`, `EdgA`, `OPR`, `Firefox`, WebView를 제외한다.

- [ ] **Step 4: 서비스 워커 등록과 공개 PWA 자산의 실패 테스트를 작성한다.**

```ts
it('프로덕션 지원 환경에서만 루트 서비스 워커를 등록한다', async () => {
  const register = vi.fn().mockResolvedValue({});
  await registerServiceWorker({
    enabled: true,
    serviceWorker: { register },
  });
  expect(register).toHaveBeenCalledWith('/service_worker.js', { scope: '/' });
});

it('개발·미지원·등록 거부는 웹 저장을 중단하지 않는다', async () => {
  await expect(
    registerServiceWorker({ enabled: false, serviceWorker: undefined })
  ).resolves.toBeUndefined();
});
```

`pwa_assets_contract.test.ts`는 실제 `manifest.webmanifest`를 JSON으로 읽어 `id`, `start_url`, `scope`, `display`, 192/512 아이콘과 아래 공유 대상을 검증한다. `service_worker.js`는 가상 `self`에서 실행해 정확한 same-origin `POST /share-target`만 `respondWith`하고, 결과가 공유 필드를 보존한 `303` fragment redirect인지 확인한다. GET·다른 경로·다른 origin은 건드리지 않고, 파싱 실패는 `/` 303으로 끝나며 네트워크 `fetch`나 캡처 API를 호출하지 않아야 한다. PNG signature와 IHDR 실제 크기, `index.html`의 manifest·theme-color·`no-referrer`, `main.tsx`의 React 이전 이벤트 저장소 시작도 검증한다.

- [ ] **Step 5: 프로덕션 전용 등록과 POST 공유 대상 자산을 구현한다.**

```ts
export async function registerServiceWorker({
  enabled = import.meta.env.PROD,
  serviceWorker = navigator.serviceWorker,
}: RegisterServiceWorkerOptions = {}): Promise<void> {
  if (!enabled || !serviceWorker) return;
  try {
    await serviceWorker.register('/service_worker.js', { scope: '/' });
  } catch {
    // PWA 보조 기능 실패가 일반 웹 저장을 막지 않게 격리한다.
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

`public/service_worker.js`는 install에서 `self.skipWaiting()`, activate에서 `clients.claim()`을 수행한다. same-origin의 정확한 `POST /share-target`만 가로채 `shared_title`, `shared_text`, `shared_url` 문자열을 URL 인코딩하고 `/#share-target?...` 절대 주소로 향하는 `303` 응답을 반환한다. 필드당 8 KiB를 넘는 값, `File`과 알 수 없는 필드는 버리고 파싱 실패는 `/`로 303 이동한다. redirect fragment는 후속 HTTP 요청에 포함되지 않으며 공유 폼을 서버로 전달하거나 자동 저장하지 않는다. 캐시와 오프라인 동작은 구현하지 않는다.

`index.html`에는 `/manifest.webmanifest`, `theme-color: #0560FD`, `Referrer-Policy: no-referrer`를 연결한다. `main.tsx`는 `applyDesignTokens()`와 React render보다 먼저 `pwaInstallPromptEvents.start(window)`를 호출하고 렌더 뒤 `void registerServiceWorker()`를 호출한다. 등록 함수 내부의 `import.meta.env.PROD` 가드가 개발 서비스 워커 오염을 막는다. 아이콘은 현재 `BrandLogo`의 Electric Blue·Amber 북마크 두 장을 흰 Canvas 위에 안전 여백을 두고 렌더링한 192×192·512×512 PNG다.

- [ ] **Step 6: 저장 성공과 설치 이벤트의 두 순서를 통합 검증한다.**

```tsx
const promptEvent = createBeforeInstallPromptEvent();
pwaInstallPromptEvents.start(window);
fireEvent(window, promptEvent);
await user.click(screen.getByRole('button', { name: '저장하기' }));
expect(await screen.findByText('더 빠르게 저장하기')).toBeVisible();
expect(promptEvent.preventDefault).toHaveBeenCalledOnce();
await user.click(screen.getByRole('button', { name: '나중에' }));
expect(localStorage.getItem('amadda.pwa-install-notice.v1')).toBe('seen');
```

반대 순서도 별도 테스트한다. 첫 저장 성공 뒤 prompt 이벤트를 발생시켜도 안내가 한 번 나타나야 한다. 데스크톱 Chrome, iPhone, Samsung Internet, Android Edge·Firefox, 기존 seen, 저장 실패와 prompt 부재에서는 나타나지 않는다. 설치 버튼 더블 클릭에도 실제 `prompt()`는 한 번이고, `appinstalled`는 표시 전·표시 중 상태를 정리한다. `AuthenticatedWorkspace`는 현재 draft revision의 저장 성공에만 `recordSuccessfulSave()`를 호출하고 `PwaInstallNotice`를 조합한다.

- [ ] **Step 7: PWA 전체 대상 검증 후 커밋한다.**

Run: `npm test -- src/shared/pwa src/features/pwa-install src/app/authenticated_workspace.test.tsx && npm run build`

Expected: PASS and a Vite production build containing `manifest.webmanifest`, icons, and `service_worker.js`.

```bash
git add public index.html src/main.tsx src/shared/pwa src/features/pwa-install src/app/authenticated_workspace.tsx src/app/authenticated_workspace.test.tsx docs/development-architecture.md docs/superpowers/specs/2026-07-16-mobile-web-pwa-save-design.md docs/superpowers/plans/2026-07-16-mobile-web-pwa-save.md
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
