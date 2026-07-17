# Chrome Extension Capture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chrome 확장 아이콘 한 번으로 현재 탭을 저장하고, 성공 알림에서 웹사이트 전환 없이 확장 내부 메모창을 열어 선택적으로 메모를 저장하며, 설치용 폴더와 배포용 ZIP을 재현 가능하게 만든다.

**Architecture:** Manifest V3 서비스 워커가 현재 탭·Supabase 확장 세션·공통 캡처 API를 조합하고, 성공 대상은 `chrome.storage.local`에 보존한 뒤 Chrome 알림 버튼으로 확장 내부 메모창을 연다. 메모는 사용자 토큰과 RLS를 사용하는 좁은 Express API로 수정하며, Vite의 별도 확장 빌드와 Node 패키징 스크립트가 `dist/chrome-extension/`과 `release/amadda-chrome-extension.zip`을 만든다.

**Tech Stack:** TypeScript 6, Vite 8, Vitest 4, Manifest V3 Chrome APIs, Supabase Auth/Postgres RLS, Express 5, adm-zip

---

## 파일 구조

- 생성: `server/insight_memo_service.ts` — 메모 입력 검증, 인증과 저장 결과 계약
- 생성: `server/insight_memo_service.test.ts` — 메모 서비스의 인증·정규화·오류 테스트
- 생성: `server/supabase_insight_memo.ts` — 사용자 토큰과 RLS를 사용하는 메모 저장소
- 생성: `server/supabase_insight_memo.test.ts` — 사용자 범위 update와 오류 매핑 테스트
- 수정: `server/app.ts`, `server/app.test.ts`, `server/index.ts` — `PATCH /api/insights/:id/memo` 연결
- 생성: `extension/src/config/extension_env.ts` — 확장 API·Supabase 공개 설정 검증
- 생성: `extension/src/auth/extension_auth.ts` — Chrome 저장소 세션과 Google OAuth
- 생성: `extension/src/api/extension_api.ts` — 캡처·메모 HTTP 클라이언트
- 생성: `extension/src/model/capture_current_tab.ts` — 현재 탭 저장 유스케이스
- 생성: `extension/src/model/pending_capture_store.ts` — 알림과 메모 대상의 영속 연결
- 생성: `extension/src/background.ts` — Chrome 이벤트와 유스케이스 조합
- 생성: `extension/src/memo.ts`, `extension/src/memo.css`, `extension/memo.html` — 확장 내부 메모창
- 생성: 각 모듈 옆 `*.test.ts` — Chrome API를 경계로 주입한 단위 테스트
- 생성: `extension/manifest.ts`, `extension/manifest.test.ts` — 최소 권한 Manifest 생성 계약
- 생성: `extension/vite.config.ts`, `tsconfig.extension.json` — 독립 확장 빌드
- 생성: `scripts/package_chrome_extension.ts`, `scripts/package_chrome_extension.test.ts` — ZIP 생성과 최상단 구조 검증
- 생성: `extension/README.md` — 로컬 설치, 운영 빌드, OAuth 허용 URL 안내
- 수정: `package.json`, `package-lock.json`, `tsconfig.json`, `tsconfig.node.json`, `.env.example`, `.gitignore` — 명령·타입·환경·산출물 설정

### Task 1: 인증된 메모 전용 API

**Files:**

- Create: `server/insight_memo_service.test.ts`
- Create: `server/insight_memo_service.ts`
- Create: `server/supabase_insight_memo.test.ts`
- Create: `server/supabase_insight_memo.ts`
- Modify: `server/app.test.ts`
- Modify: `server/app.ts`
- Modify: `server/index.ts`

- [ ] **Step 1: 메모 서비스 실패 테스트 작성**

```ts
it('trims and saves a memo for the authenticated insight owner', async () => {
  const store = {
    updateMemo: vi.fn().mockResolvedValue({ status: 'updated' }),
  };
  const service = createInsightMemoService(
    { authenticate: vi.fn().mockResolvedValue(USER_ID) },
    () => store
  );

  await expect(
    service.update('access-token', INSIGHT_ID, { memo: '  회의 참고  ' })
  ).resolves.toEqual({ ok: true });
  expect(store.updateMemo).toHaveBeenCalledWith(
    USER_ID,
    INSIGHT_ID,
    '회의 참고'
  );
});
```

200자를 넘는 메모, 잘못된 UUID, 인증 실패, 대상 없음과 쓰기 실패도 각각 제한된 실패 이유를 반환하게 작성한다.

- [ ] **Step 2: 서비스 테스트가 구현 부재로 실패하는지 확인**

Run: `npm test -- server/insight_memo_service.test.ts`

Expected: `createInsightMemoService` 모듈을 찾지 못해 FAIL

- [ ] **Step 3: 최소 메모 서비스 구현**

```ts
export type InsightMemoResult =
  | { ok: true }
  | {
      ok: false;
      reason:
        'invalid-request' | 'not-found' | 'permission-denied' | 'write-failed';
    };

export type ServerInsightMemoService = {
  update(
    accessToken: string,
    insightId: string,
    request: unknown
  ): Promise<InsightMemoResult>;
};
```

인증 뒤 UUID와 `{ memo: string }`를 검증하고 Unicode 문자 수 200자 이하만 허용한다. 메모는 trim 후 빈 문자열이면 `null`로 저장한다.

- [ ] **Step 4: Supabase 저장소 실패 테스트 작성**

```ts
it('updates only the authenticated user insight', async () => {
  const store = createSupabaseInsightMemoStore(client);

  await expect(
    store.updateMemo(USER_ID, INSIGHT_ID, '회의 참고')
  ).resolves.toEqual({
    status: 'updated',
  });
  expect(query.eq).toHaveBeenNthCalledWith(1, 'id', INSIGHT_ID);
  expect(query.eq).toHaveBeenNthCalledWith(2, 'user_id', USER_ID);
});
```

- [ ] **Step 5: Supabase 저장소 테스트의 RED 확인 후 최소 구현**

Run: `npm test -- server/supabase_insight_memo.test.ts`

Expected: 모듈 부재로 FAIL

`.from('insights').update({ memo }).eq('id', insightId).eq('user_id', userId).select('id').maybeSingle()`만 수행하고 RLS 오류는 `permission-denied`, 빈 결과는 `not-found`, 나머지는 `write-failed`로 변환한다.

- [ ] **Step 6: API 라우트 실패 테스트 작성과 RED 확인**

```ts
const response = await request(createApp({ memoService }))
  .patch(`/api/insights/${INSIGHT_ID}/memo`)
  .set('Authorization', 'Bearer access-token')
  .send({ memo: '회의 참고' });

expect(response.status).toBe(200);
expect(memoService.update).toHaveBeenCalledWith('access-token', INSIGHT_ID, {
  memo: '회의 참고',
});
```

Run: `npm test -- server/app.test.ts`

Expected: 라우트가 없어 404로 FAIL

- [ ] **Step 7: 라우트와 운영 조합 구현**

`CreateAppOptions`에 `memoService`를 추가하고 `PATCH /api/insights/:insightId/memo`를 기존 8KB JSON·Bearer·안전한 오류 처리 경계에 연결한다. `server/index.ts`는 같은 Supabase 공개 설정으로 캡처와 메모 서비스를 생성한다.

- [ ] **Step 8: 관련 서버 테스트 통과 확인**

Run: `npm test -- server/insight_memo_service.test.ts server/supabase_insight_memo.test.ts server/app.test.ts`

Expected: 모든 관련 테스트 PASS

- [ ] **Step 9: 서버 단위 커밋**

```bash
git add server/app.ts server/app.test.ts server/index.ts server/insight_memo_service.ts server/insight_memo_service.test.ts server/supabase_insight_memo.ts server/supabase_insight_memo.test.ts
git commit -m "feat: 인사이트 메모 전용 API"
```

### Task 2: 확장 공개 설정, 인증과 HTTP 클라이언트

**Files:**

- Create: `extension/src/config/extension_env.test.ts`
- Create: `extension/src/config/extension_env.ts`
- Create: `extension/src/auth/extension_auth.test.ts`
- Create: `extension/src/auth/extension_auth.ts`
- Create: `extension/src/api/extension_api.test.ts`
- Create: `extension/src/api/extension_api.ts`

- [ ] **Step 1: 확장 환경 검증 테스트 작성과 RED 확인**

```ts
expect(
  parseExtensionEnv({
    VITE_EXTENSION_API_ORIGIN: 'https://amadda.example',
    VITE_SUPABASE_URL: 'https://project.supabase.co',
    VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_public',
  })
).toEqual({
  apiOrigin: 'https://amadda.example',
  publishableKey: 'sb_publishable_public',
  supabaseUrl: 'https://project.supabase.co',
});
```

Run: `npm test -- extension/src/config/extension_env.test.ts`

Expected: 모듈 부재로 FAIL

- [ ] **Step 2: 로컬 기본값과 운영 HTTPS 검증 구현**

환경 값이 없으면 로컬 개발용 `http://localhost:3001`, `http://127.0.0.1:54321`, 공개 키 placeholder를 사용한다. 값이 명시되면 API와 Supabase 운영 원점은 HTTPS만 허용하고 비밀키 형식을 거부한다.

- [ ] **Step 3: Chrome 저장소와 OAuth 실패 테스트 작성**

```ts
it('launches Google OAuth once and persists the returned session', async () => {
  const token = await auth.getAccessToken({ interactive: true });

  expect(signInWithOAuth).toHaveBeenCalledWith({
    options: { redirectTo, skipBrowserRedirect: true },
    provider: 'google',
  });
  expect(launchWebAuthFlow).toHaveBeenCalledWith({
    interactive: true,
    url: oauthUrl,
  });
  expect(setSession).toHaveBeenCalledWith({
    access_token: 'access',
    refresh_token: 'refresh',
  });
  expect(token).toBe('access');
});
```

저장 세션 재사용, 만료 세션 갱신, 비대화형 메모 요청의 인증 실패와 OAuth 오류도 분리한다.

- [ ] **Step 4: 인증 테스트 RED 확인 후 최소 구현**

Run: `npm test -- extension/src/auth/extension_auth.test.ts`

Expected: 모듈 부재로 FAIL

`chrome.storage.local` async adapter를 Supabase `createClient`에 주입하고, `flowType: 'implicit'`, `autoRefreshToken: false`, `detectSessionInUrl: false`, `persistSession: true`로 설정한다. `chrome.identity.getRedirectURL('auth')`와 `launchWebAuthFlow()`의 최종 fragment에서 access·refresh token을 읽어 `setSession()`한다.

- [ ] **Step 5: 확장 API 실패 테스트 작성과 RED 확인**

```ts
expect(fetcher).toHaveBeenCalledWith(
  'https://amadda.example/api/insights/capture',
  expect.objectContaining({
    body: JSON.stringify({ source: 'chrome_extension', title, url }),
    headers: expect.objectContaining({ Authorization: 'Bearer access-token' }),
    method: 'POST',
  })
);
```

Run: `npm test -- extension/src/api/extension_api.test.ts`

Expected: 모듈 부재로 FAIL

- [ ] **Step 6: 캡처·메모 API 클라이언트 구현과 GREEN 확인**

캡처 응답은 기존 `InsightCaptureResult`의 필수 필드만 안전하게 파싱한다. 메모는 `PATCH /api/insights/:id/memo`를 호출한다. 네트워크·JSON·계약 오류는 내부 내용을 버리고 `write-failed`로 반환한다.

Run: `npm test -- extension/src/config/extension_env.test.ts extension/src/auth/extension_auth.test.ts extension/src/api/extension_api.test.ts`

Expected: 모든 관련 테스트 PASS

- [ ] **Step 7: 확장 기반 커밋**

```bash
git add extension/src/config extension/src/auth extension/src/api
git commit -m "feat: Chrome 확장 인증과 API 연결"
```

### Task 3: 현재 탭 저장, 알림과 메모 대상 연결

**Files:**

- Create: `extension/src/model/capture_current_tab.test.ts`
- Create: `extension/src/model/capture_current_tab.ts`
- Create: `extension/src/model/pending_capture_store.test.ts`
- Create: `extension/src/model/pending_capture_store.ts`
- Create: `extension/src/background.test.ts`
- Create: `extension/src/background.ts`

- [ ] **Step 1: 현재 탭 저장 유스케이스 테스트 작성**

```ts
await controller.capture({
  title: 'Article',
  url: 'https://example.com/article',
});

expect(api.capture).toHaveBeenCalledWith('access-token', {
  source: 'chrome_extension',
  title: 'Article',
  url: 'https://example.com/article',
});
expect(notifications.showSaved).toHaveBeenCalledWith({
  created: true,
  insightId: INSIGHT_ID,
  title: 'Article',
});
```

내부 페이지, 인증 실패, 중복과 네트워크 실패를 각각 기대 문구로 테스트한다.

- [ ] **Step 2: RED 확인 후 최소 유스케이스 구현**

Run: `npm test -- extension/src/model/capture_current_tab.test.ts`

Expected: 모듈 부재로 FAIL

HTTP(S) 탭만 허용하고, 사용자 클릭 경로에서 대화형 토큰을 얻어 공통 캡처 API를 호출한다. 성공 시 새 저장은 `저장됨`, 중복은 `이미 저장됨`, 실패는 재시도 가능한 짧은 알림만 보낸다.

- [ ] **Step 3: 영속 메모 대상 저장소 테스트와 구현**

알림 ID `capture:<insightId>`와 `{ insightId, title }`을 `chrome.storage.local`에 저장·조회·삭제하는 테스트를 먼저 실패시킨 뒤 구현한다. 서비스 워커 재시작 뒤에도 알림 버튼이 같은 대상을 열어야 한다.

- [ ] **Step 4: Chrome 이벤트 연결 테스트 작성과 RED 확인**

```ts
registerBackground(chromeApi, services);

expect(chromeApi.action.onClicked.addListener).toHaveBeenCalledOnce();
expect(
  chromeApi.notifications.onButtonClicked.addListener
).toHaveBeenCalledOnce();
expect(chromeApi.runtime.onMessage.addListener).toHaveBeenCalledOnce();
```

알림 첫 버튼은 `memo.html?insightId=...&title=...`인 확장 URL을 `type: 'popup'` 창으로 열고, 메모 메시지는 비대화형 토큰으로 API를 호출하는지 검증한다.

Run: `npm test -- extension/src/background.test.ts`

Expected: 모듈 부재로 FAIL

- [ ] **Step 5: 서비스 워커 조합 구현과 관련 GREEN 확인**

이벤트 리스너에서 Promise 거부를 밖으로 노출하지 않는다. 사용자가 알림을 닫거나 메모창을 연 뒤에는 pending 대상을 정리하고, 메모 실패는 링크 캡처 결과를 변경하지 않는다.

Run: `npm test -- extension/src/model extension/src/background.test.ts`

Expected: 모든 관련 테스트 PASS

- [ ] **Step 6: 즉시 저장 커밋**

```bash
git add extension/src/model extension/src/background.ts extension/src/background.test.ts
git commit -m "feat: Chrome 현재 탭 즉시 저장"
```

### Task 4: 확장 내부 메모창

**Files:**

- Create: `extension/src/memo.test.ts`
- Create: `extension/src/memo.ts`
- Create: `extension/src/memo_contract.test.ts`
- Create: `extension/src/memo.css`
- Create: `extension/memo.html`

- [ ] **Step 1: 메모창 사용자 흐름 테스트 작성**

```ts
mountMemoPage({ document, location, runtime, window });
await user.type(screen.getByLabelText('한 줄 메모'), '회의 참고');
await user.click(screen.getByRole('button', { name: '메모 저장' }));

expect(runtime.sendMessage).toHaveBeenCalledWith({
  insightId: INSIGHT_ID,
  memo: '회의 참고',
  type: 'save-insight-memo',
});
```

잘못된 대상, 빈 메모, 200자 제한, 전송 실패 시 입력 보존과 성공 후 닫기를 테스트한다.

- [ ] **Step 2: RED 확인 후 접근 가능한 메모창 구현**

Run: `npm test -- extension/src/memo.test.ts`

Expected: 모듈 부재로 FAIL

제목은 `textContent`로만 표시하고, visible label·`maxlength="200"`·상태 영역·저장·닫기 버튼을 제공한다. 제출 중 중복 요청을 막고 실패 시 `aria-live` 오류와 재시도를 유지한다.

- [ ] **Step 3: 디자인 계약 테스트 작성과 RED 확인**

`memo_contract.test.ts`는 CSS가 raw 색상 대신 디자인 토큰을 쓰고 입력·버튼 최소 높이 44px, `:focus-visible` 2px Electric Blue, 오류 text·성공 text를 색 외 문구로 제공하는지 확인한다.

Run: `npm test -- extension/src/memo_contract.test.ts`

Expected: CSS·HTML 계약 부재로 FAIL

- [ ] **Step 4: White Canvas 메모 스타일과 token 주입 구현**

`memo.ts` 시작 시 `applyDesignTokens()`를 호출한다. 360px 안팎의 한 열 화면, 1px Ash 경계, Canvas 배경, Charcoal primary action, 반복 애니메이션 없는 상태를 구현한다.

- [ ] **Step 5: 메모창 테스트 GREEN 확인**

Run: `npm test -- extension/src/memo.test.ts extension/src/memo_contract.test.ts`

Expected: 모든 관련 테스트 PASS

- [ ] **Step 6: 메모창 커밋**

```bash
git add extension/memo.html extension/src/memo.ts extension/src/memo.test.ts extension/src/memo.css extension/src/memo_contract.test.ts
git commit -m "feat: 확장 내부 선택 메모창"
```

### Task 5: Manifest, 빌드와 ZIP 패키징

**Files:**

- Create: `extension/manifest.test.ts`
- Create: `extension/manifest.ts`
- Create: `extension/vite.config.ts`
- Create: `tsconfig.extension.json`
- Create: `scripts/package_chrome_extension.test.ts`
- Create: `scripts/package_chrome_extension.ts`
- Create: `extension/README.md`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `tsconfig.json`
- Modify: `tsconfig.node.json`
- Modify: `.env.example`
- Modify: `.gitignore`

- [ ] **Step 1: 최소 권한 Manifest 테스트 작성과 RED 확인**

```ts
expect(manifest.permissions).toEqual([
  'activeTab',
  'identity',
  'notifications',
  'storage',
]);
expect(manifest.action).not.toHaveProperty('default_popup');
expect(JSON.stringify(manifest)).not.toContain('<all_urls>');
expect(JSON.stringify(manifest)).not.toContain('scripting');
```

Run: `npm test -- extension/manifest.test.ts`

Expected: 모듈 부재로 FAIL

- [ ] **Step 2: Manifest 생성과 독립 Vite 빌드 구현**

Manifest는 `background.js` 모듈 서비스 워커, `activeTab`·`identity`·`notifications`·`storage`, API·Supabase 원점만 포함한다. Vite는 `background.ts`와 `memo.html`을 `dist/chrome-extension/`에 빌드하고 Manifest와 기존 아맞다 PNG 아이콘을 복사한다.

- [ ] **Step 3: ZIP 패키저 실패 테스트 작성과 RED 확인**

```ts
await packageChromeExtension({ inputDirectory, outputFile });
const entries = new AdmZip(outputFile)
  .getEntries()
  .map((entry) => entry.entryName);

expect(entries).toContain('manifest.json');
expect(entries).toContain('background.js');
expect(entries).not.toContain('chrome-extension/manifest.json');
```

Run: `npm test -- scripts/package_chrome_extension.test.ts`

Expected: 모듈 부재로 FAIL

- [ ] **Step 4: 패키저와 npm 명령 구현**

`adm-zip@0.6.0`과 `@types/chrome`을 개발 의존성으로 추가한다. `packageChromeExtension()`은 빌드 폴더에 Manifest가 없으면 실패하고, `release/`를 만든 뒤 폴더 내용만 ZIP 루트에 넣는다.

```json
{
  "build": "npm run build:web && npm run build:extension",
  "build:web": "tsc -b tsconfig.app.json tsconfig.node.json && vite build",
  "build:extension": "tsc -p tsconfig.extension.json && vite build --config extension/vite.config.ts",
  "package:extension": "npm run build:extension && tsx scripts/package_chrome_extension.ts",
  "format": "prettier --write \"src/**/*.{ts,tsx,css}\" \"server/**/*.ts\" \"extension/**/*.{ts,css,html,md}\" \"scripts/**/*.ts\" \"*.{js,ts,json,html}\"",
  "format:check": "prettier --check \"src/**/*.{ts,tsx,css}\" \"server/**/*.ts\" \"extension/**/*.{ts,css,html,md}\" \"scripts/**/*.ts\" \"*.{js,ts,json,html}\""
}
```

- [ ] **Step 5: 설치·운영 설정 문서 작성**

`extension/README.md`에 다음을 기록한다.

1. `npm run build:extension`
2. `chrome://extensions` → 개발자 모드 → 압축해제된 확장 로드 → `dist/chrome-extension/`
3. `npm run package:extension` → `release/amadda-chrome-extension.zip`
4. 운영 빌드 전 `VITE_EXTENSION_API_ORIGIN`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` 설정
5. 설치한 확장의 `chrome.identity.getRedirectURL()`을 Supabase OAuth 허용 URL에 등록

- [ ] **Step 6: 빌드·ZIP 계약 검증**

Run: `npm test -- extension/manifest.test.ts scripts/package_chrome_extension.test.ts`

Expected: 모든 관련 테스트 PASS

Run: `npm run package:extension`

Expected: `dist/chrome-extension/manifest.json`과 `release/amadda-chrome-extension.zip` 생성, ZIP 최상단에 `manifest.json`

- [ ] **Step 7: 패키징 커밋**

```bash
git add .env.example .gitignore package.json package-lock.json tsconfig.json tsconfig.node.json tsconfig.extension.json extension/manifest.ts extension/manifest.test.ts extension/vite.config.ts extension/README.md scripts/package_chrome_extension.ts scripts/package_chrome_extension.test.ts
git commit -m "chore: Chrome 확장 빌드와 ZIP 패키징"
```

### Task 6: 전체 검증, 이슈 문서와 PR

**Files:**

- Modify: `docs/superpowers/plans/2026-07-17-chrome-extension-capture.md`
- GitHub: Issue #39, Project #3, Pull Request

- [ ] **Step 1: 전체 변경 포맷**

Run: `npm run format`

Expected: 확장·스크립트 경로도 포함해 변경 파일이 Prettier 규칙을 따름

- [ ] **Step 2: 전체 품질 게이트**

Run: `npm test`

Expected: 전체 테스트 PASS

Run: `npm run lint`

Expected: PASS

Run: `npm run format:check`

Expected: PASS

Run: `npm run build`

Expected: 웹과 Chrome 확장 빌드 PASS

Run: `npm run package:extension`

Expected: ZIP 생성 PASS

Run: `git diff --check`

Expected: 출력 없음

- [ ] **Step 3: 범위와 비밀값 검사**

Run: `git diff --name-only origin/main...HEAD`

Expected: #39의 서버 메모 API, 확장, 빌드·문서 파일만 표시

Run: `rg -n -i "service_role|client_secret" extension server scripts dist/chrome-extension`

Expected: 비밀값 없음

- [ ] **Step 4: 계획과 Issue #39에 실제 결과 반영**

완료된 체크박스와 실제 검증 결과를 이 계획에 기록한다. Issue #39에는 확정한 확장 내부 메모 흐름, 설계·설치 문서 경로와 사람이 Chrome에서 확인할 네 항목을 추가한다.

- [ ] **Step 5: 최종 문서 커밋**

```bash
git add docs/superpowers/plans/2026-07-17-chrome-extension-capture.md
git commit -m "docs: Chrome 확장 검증과 설치 안내"
```

- [ ] **Step 6: 푸시와 한국어 PR 생성**

브랜치를 upstream과 함께 푸시하고 제목·본문이 모두 한국어인 준비된 PR을 만든다. 본문에는 `Closes #39`, 변경 요약, 실제 검증 명령·결과와 실제 Chrome에서 확인할 설치·로그인·즉시 저장·메모 흐름을 포함한다.

- [ ] **Step 7: Project 검토 중 전환**

Project #3의 필드·선택지·#39 항목 ID를 다시 조회하고 #39 상태를 `검토 중`으로 변경한다. PR URL과 사람이 수행할 한 가지 다음 행동인 실제 Chrome 검수를 보고한다.
