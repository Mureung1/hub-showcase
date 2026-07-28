# 인증 후 핵심 앱 시각 체계 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 인증 후 홈·보관함·저장에 눈이 편안한 기본 배경색, 화면별 대표 색상 영역, 기기별 상·하단 내비게이션을 적용한다.

**Architecture:** 디자인 토큰에 인증 후 화면 전용 배경색과 화면별 대표 색상을 추가하고, `AuthenticatedWorkspace`에서만 공용 카드·입력 배경색을 새 값으로 범위 지정한다. 공통 셸은 전체 너비 상단바와 본문을 제공하고, 각 페이지는 첫 행동을 담는 전체 너비 색상 영역과 결과를 담는 본문으로 나눈다. 기존 기능 컴포넌트, API, 데이터 형식과 단일 `AppNavigation` 인스턴스는 유지한다.

**Tech Stack:** React 19, TypeScript 6, Vite 8, Vitest 4, Testing Library, CSS Custom Properties, Wanted Design System

---

## 공개 작업 기록 표현 원칙

이슈와 PR 본문에는 다음 표현을 사용한다.

| 구현 내부 용어        | 이슈와 PR 본문 표현          |
| --------------------- | ---------------------------- |
| `paper`               | 기본 배경색                  |
| `surface`             | 카드·입력 배경색             |
| screen identity color | 화면별 대표 색상             |
| stage                 | 첫 행동을 강조하는 색상 영역 |

PR 본문은 “토큰을 추가했다”가 아니라 “순백색 면적을 줄여 오래 보기 편하게 만들었다”처럼 사용자가 경험하는 변화부터 설명한다. 코드 토큰명, CSS 선택자와 컴포넌트명은 PR 본문의 변경 이유와 결과에 사용하지 않는다.

## 범위와 파일 구조

새 소스 파일은 만들지 않는다. 기존 페이지와 공통 셸의 책임을 유지하면서 다음 파일만 수정한다.

| 파일                                                            | 책임                                               |
| --------------------------------------------------------------- | -------------------------------------------------- |
| `src/shared/config/design-system/tokens.ts`                     | 기본 배경색, 카드·입력 배경색, 화면별 대표 색상 값 |
| `src/shared/config/design-system/tokens.test.ts`                | 승인된 색상 값과 대비 기준                         |
| `src/shared/config/design-system/apply_design_tokens.test.ts`   | CSS 변수 변환 계약                                 |
| `src/app/authenticated_workspace.tsx`                           | 상단바 안의 단일 내비게이션 배치                   |
| `src/app/styles/authenticated_workspace.css`                    | 인증 후 화면에만 적용되는 배경색과 공통 셸         |
| `src/widgets/app-navigation/ui/app_navigation.tsx`              | 현재 화면에 맞는 대표 색상 클래스                  |
| `src/widgets/app-navigation/ui/app_navigation.css`              | `768px` 기준 상단·하단 내비게이션 배치             |
| `src/widgets/app-navigation/ui/app_navigation.test.tsx`         | 현재 화면 클래스와 기존 탭 이동 동작               |
| `src/widgets/app-navigation/ui/app_navigation_contract.test.ts` | 반응형 내비게이션 CSS 계약                         |
| `src/app/authenticated_workspace.test.tsx`                      | 내비게이션 단일 렌더링과 상단바 배치               |
| `src/pages/home/ui/retrieve_search_panel.tsx`                   | 꺼내보기 첫 입력과 실행만 담당                     |
| `src/pages/home/ui/home_page.tsx`                               | 홈 색상 영역, 고정 제안, 결과 영역 조합            |
| `src/pages/home/ui/home_page.css`                               | 홈 대표 색상과 반응형 영역                         |
| `src/pages/home/ui/home_page.test.tsx`                          | 첫 행동과 고정 제안의 영역 분리                    |
| `src/pages/library/ui/library_page.tsx`                         | 보관함 검색 영역과 문맥별 결과 개수                |
| `src/pages/library/ui/library_page.css`                         | 보관함 대표 색상과 결과 본문                       |
| `src/pages/library/ui/library_page.test.tsx`                    | 검색·카테고리별 개수와 영역 배치                   |
| `src/pages/save/ui/save_page.tsx`                               | URL 첫 입력과 저장 후 후속 영역 분리               |
| `src/pages/save/ui/save_page.css`                               | 저장 대표 색상과 후속 입력 본문                    |
| `src/pages/save/ui/save_page.test.tsx`                          | 저장 전·후 영역 분리와 기존 동작                   |
| `src/pages/save/ui/save_page_contract.test.ts`                  | 저장 색상 영역과 모바일 배치                       |
| `DESIGN.md`                                                     | 실행 중인 디자인 계약과 공개 표현 원칙             |

다음 파일과 기능은 수정하거나 새 테스트를 추가하지 않는다.

- 랜딩, 로그인
- 가져오기 대화상자, 카테고리 관리, PWA 안내
- Android 공유 전용 화면
- Chrome 확장 프로그램
- 홈 제안 문구 개인화
- API, 서버, 저장소와 데이터베이스

### Task 1: 인증 후 화면 색상 토큰 추가

**Files:**

- Modify: `src/shared/config/design-system/tokens.test.ts`
- Modify: `src/shared/config/design-system/apply_design_tokens.test.ts`
- Modify: `src/shared/config/design-system/tokens.ts`

- [ ] **Step 1: 기존 토큰 테스트에 승인된 값과 대비 기준을 반영한다**

`tokens.test.ts`의 `designTokens.color` 기대값을 다음과 같이 바꾼다. `canvas`는 범위 밖 화면을 보호하기 위해 `#FFFFFF`을 유지한다.

```ts
expect(designTokens.color).toEqual({
  amber: '#F59E0B',
  ash: '#E1E2E5',
  canvas: '#FFFFFF',
  charcoal: '#25272D',
  coral: '#F04438',
  electricBlue: '#0560FD',
  errorInk: '#D92D20',
  fog: '#C8CAD0',
  graphite: '#363940',
  ink: '#151619',
  libraryCoral: '#C94032',
  lightBlue: '#3A8DFF',
  mist: '#F3F3F5',
  paleBlue: '#C3D9FF',
  paper: '#F4F1E9',
  pewter: '#B0B3BB',
  retrieveBlue: '#1358D8',
  saveGreen: '#08765B',
  signalGreen: '#047857',
  smoke: '#667085',
  surface: '#FFFDF8',
});
```

기존 대비 테스트 하나를 다음 테스트로 교체한다. 별도의 색상 테스트 파일은 만들지 않는다.

```ts
it('keeps text readable on the approved page and screen backgrounds', () => {
  expect(
    contrastRatio(designTokens.color.smoke, designTokens.color.canvas)
  ).toBeGreaterThanOrEqual(4.5);
  expect(
    contrastRatio(designTokens.color.signalGreen, designTokens.color.canvas)
  ).toBeGreaterThanOrEqual(4.5);
  expect(
    contrastRatio(designTokens.color.ink, designTokens.color.paper)
  ).toBeGreaterThanOrEqual(4.5);
  expect(
    contrastRatio(designTokens.color.ink, designTokens.color.surface)
  ).toBeGreaterThanOrEqual(4.5);

  for (const background of [
    designTokens.color.retrieveBlue,
    designTokens.color.libraryCoral,
    designTokens.color.saveGreen,
  ]) {
    expect(
      contrastRatio(designTokens.color.surface, background)
    ).toBeGreaterThanOrEqual(4.5);
  }
});
```

`apply_design_tokens.test.ts`의 정확한 변수 목록에 다음 항목을 추가하고 총 개수를 `83`으로 바꾼다.

```ts
'--color-library-coral': '#C94032',
'--color-paper': '#F4F1E9',
'--color-retrieve-blue': '#1358D8',
'--color-save-green': '#08765B',
'--color-surface': '#FFFDF8',
```

`applyDesignTokens` 테스트에는 다음 직접 검증만 추가한다.

```ts
expect(customRoot.style.getPropertyValue('--color-paper')).toBe('#F4F1E9');
expect(customRoot.style.getPropertyValue('--color-surface')).toBe('#FFFDF8');
```

- [ ] **Step 2: 토큰 테스트가 승인된 새 값 때문에 실패하는지 확인한다**

Run:

```powershell
npm test -- src/shared/config/design-system/tokens.test.ts src/shared/config/design-system/apply_design_tokens.test.ts
```

Expected: `designTokens.color`에 새 키가 없고 CSS 변수 개수가 `78`이라서 FAIL.

- [ ] **Step 3: 색상 타입과 런타임 값을 추가한다**

`tokens.ts`의 `ColorTokenName`에 다음 이름을 추가한다.

```ts
type ColorTokenName =
  | 'amber'
  | 'ash'
  | 'canvas'
  | 'charcoal'
  | 'coral'
  | 'electricBlue'
  | 'errorInk'
  | 'fog'
  | 'graphite'
  | 'ink'
  | 'libraryCoral'
  | 'lightBlue'
  | 'mist'
  | 'paleBlue'
  | 'paper'
  | 'pewter'
  | 'retrieveBlue'
  | 'saveGreen'
  | 'signalGreen'
  | 'smoke'
  | 'surface';
```

`designTokens.color`는 Step 1의 기대값과 같은 키 순서와 값으로 바꾼다. `apply_design_tokens.ts`는 기존의 모든 그룹 자동 변환 방식을 그대로 사용하므로 수정하지 않는다.

- [ ] **Step 4: 토큰 테스트가 통과하는지 확인한다**

Run:

```powershell
npm test -- src/shared/config/design-system/tokens.test.ts src/shared/config/design-system/apply_design_tokens.test.ts
```

Expected: 두 파일의 테스트가 모두 PASS.

- [ ] **Step 5: 토큰 변경을 커밋한다**

```powershell
git add src/shared/config/design-system/tokens.ts src/shared/config/design-system/tokens.test.ts src/shared/config/design-system/apply_design_tokens.test.ts
git commit -m "feat: 인증 후 화면 색상 토큰 추가"
```

### Task 2: 공통 셸과 반응형 내비게이션 개편

**Files:**

- Modify: `src/widgets/app-navigation/ui/app_navigation.test.tsx`
- Modify: `src/widgets/app-navigation/ui/app_navigation_contract.test.ts`
- Modify: `src/app/authenticated_workspace.test.tsx`
- Modify: `src/widgets/app-navigation/ui/app_navigation.tsx`
- Modify: `src/widgets/app-navigation/ui/app_navigation.css`
- Modify: `src/app/authenticated_workspace.tsx`
- Modify: `src/app/styles/authenticated_workspace.css`

- [ ] **Step 1: 기존 테스트에 단일 내비게이션과 반응형 배치 계약을 추가한다**

`app_navigation.test.tsx`의 기존 테스트에서 내비게이션을 가져와 현재 화면 클래스를 확인한다.

```ts
const navigation = screen.getByRole('navigation', { name: '주요 화면' });

expect(navigation.classList.contains('app-navigation--home')).toBe(true);
```

`app_navigation_contract.test.ts`의 기존 고정 너비 테스트를 다음 계약으로 교체한다.

```ts
it('uses the header flow from 768px and a fixed bottom bar below it', () => {
  expect(appNavigationStyles).toMatch(
    /@media \(min-width:\s*768px\)\s*\{[\s\S]*?div\.app-navigation[\s\S]*?position:\s*static;[\s\S]*?width:\s*auto;/
  );
  expect(appNavigationStyles).toMatch(
    /@media \(max-width:\s*767px\)\s*\{[\s\S]*?div\.app-navigation[\s\S]*?position:\s*fixed;[\s\S]*?bottom:\s*max\(var\(--spacing-3\),\s*env\(safe-area-inset-bottom,\s*0px\)\);/
  );
});
```

`authenticated_workspace.test.tsx`의 `moves between the home, library, and save tabs` 테스트에 다음 검증을 추가한다.

```ts
const navigations = screen.getAllByRole('navigation', { name: '주요 화면' });

expect(navigations).toHaveLength(1);
expect(navigations[0].closest('.workspace-header')).not.toBeNull();
```

- [ ] **Step 2: 새 배치 계약이 현재 구조에서 실패하는지 확인한다**

Run:

```powershell
npm test -- src/widgets/app-navigation/ui/app_navigation.test.tsx src/widgets/app-navigation/ui/app_navigation_contract.test.ts src/app/authenticated_workspace.test.tsx -t "renders the workspace tabs|uses the header flow|moves between the home"
```

Expected: 현재 내비게이션이 `workspace-header` 밖에 있고 데스크톱 CSS가 없어서 FAIL.

- [ ] **Step 3: 현재 화면 클래스를 내비게이션에 전달한다**

`app_navigation.tsx`에서 `NavigationBar`의 `className`을 다음과 같이 바꾼다.

```tsx
<NavigationBar
  className={`app-navigation app-navigation--${tab}`}
  items={NAVIGATION_ITEMS}
  onValueChange={onTabChange}
  value={tab}
/>
```

- [ ] **Step 4: 내비게이션 인스턴스를 상단바 안으로 이동한다**

`authenticated_workspace.tsx`의 상단바를 다음 구조로 바꾼다.

```tsx
<header className="workspace-header">
  <div className="workspace-header__inner">
    <div className="workspace-brand">
      <BrandLogo className="workspace-brand__mark" />
      <span className="workspace-brand__name">아맞다</span>
      <span aria-hidden="true" className="workspace-brand__divider" />
      <h1>{getScreenTitle(activeTab)}</h1>
    </div>
    <AppNavigation onTabChange={setActiveTab} tab={activeTab} />
    {accountControl ?? (
      <p className="workspace-connection-status">이 계정의 보관함에 저장해요</p>
    )}
  </div>
</header>
```

기존 `CategoryManager` 뒤에 있던 다음 렌더링은 삭제한다.

```tsx
<AppNavigation onTabChange={setActiveTab} tab={activeTab} />
```

- [ ] **Step 5: 인증 후 셸에만 새 배경색을 범위 지정한다**

`authenticated_workspace.css`의 셸과 상단바, 본문 규칙을 다음과 같이 바꾼다.

```css
.workspace-shell {
  --color-canvas: var(--color-surface);
  width: 100%;
  min-width: 0;
  min-height: 100vh;
  background: var(--color-paper);
}

.workspace-header {
  border-bottom: 1px solid var(--color-ash);
  background: var(--color-canvas);
}

.workspace-header__inner {
  display: grid;
  width: min(var(--layout-content-width), calc(100% - var(--spacing-8)));
  min-height: 64px;
  align-items: center;
  margin-inline: auto;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  gap: var(--spacing-4);
}

.workspace-header__inner > :last-child {
  justify-self: end;
}

.workspace-main {
  min-height: 680px;
  padding: 0 0 var(--spacing-20);
  background: var(--color-paper);
}

.workspace-warnings {
  display: grid;
  width: min(var(--layout-content-width), calc(100% - var(--spacing-8)));
  margin: var(--spacing-6) auto;
  gap: var(--spacing-3);
}

@media (max-width: 767px) {
  .workspace-header__inner {
    width: min(calc(100% - var(--spacing-6)), var(--layout-content-width));
    grid-template-columns: minmax(0, 1fr) auto;
    gap: var(--spacing-3);
  }

  .workspace-brand__divider,
  .workspace-header h1 {
    display: none;
  }

  .workspace-connection-status {
    max-width: 160px;
    overflow: hidden;
    font-size: var(--typography-meta-size);
    line-height: var(--typography-meta-line-height);
    text-overflow: ellipsis;
  }

  .workspace-main {
    padding-bottom: calc(88px + env(safe-area-inset-bottom, 0px));
  }
}
```

기존 `.workspace-brand`, `.workspace-brand__mark`, `.workspace-brand__name`, `.workspace-brand__divider`, `.workspace-header h1`, `.workspace-connection-status`, `.workspace-note` 규칙은 색상 토큰만 상속하도록 유지한다. `.workspace-warnings`는 위의 가운데 정렬 규칙으로 교체한다.

- [ ] **Step 6: 넓은 화면과 모바일 내비게이션 CSS를 구현한다**

`app_navigation.css`를 다음 내용으로 교체한다.

```css
div.app-navigation.app-navigation--home {
  --app-navigation-active-color: var(--color-retrieve-blue);
}

div.app-navigation.app-navigation--library {
  --app-navigation-active-color: var(--color-library-coral);
}

div.app-navigation.app-navigation--save {
  --app-navigation-active-color: var(--color-save-green);
}

@media (min-width: 768px) {
  div.app-navigation.navigation-bar[wds-component='bottom-navigation'] {
    position: static;
    width: auto;
    min-width: 280px;
    min-height: 44px;
    border: 0;
    border-radius: 0;
    background: transparent;
  }

  div.app-navigation.navigation-bar[wds-component='bottom-navigation']
    button.navigation-bar__item[wds-component='bottom-navigation-item'] {
    min-width: 72px;
    min-height: 44px;
    padding: var(--spacing-2) var(--spacing-3);
    border-radius: 0;
  }

  div.app-navigation.navigation-bar[wds-component='bottom-navigation']
    button.navigation-bar__item[wds-component='bottom-navigation-item']
    svg {
    display: none;
  }

  div.app-navigation.navigation-bar[wds-component='bottom-navigation']
    button.navigation-bar__item[wds-component='bottom-navigation-item'][aria-current='page'] {
    background: transparent;
    box-shadow: inset 0 -2px 0 var(--app-navigation-active-color);
  }
}

@media (max-width: 767px) {
  div.app-navigation.navigation-bar[wds-component='bottom-navigation'] {
    position: fixed;
    z-index: 10;
    right: 50%;
    bottom: max(var(--spacing-3), env(safe-area-inset-bottom, 0px));
    width: min(420px, calc(100% - var(--spacing-8)));
    transform: translateX(50%);
  }

  div.app-navigation.navigation-bar[wds-component='bottom-navigation']
    button.navigation-bar__item[wds-component='bottom-navigation-item'][aria-current='page'] {
    color: var(--app-navigation-active-color);
  }
}
```

- [ ] **Step 7: 공통 셸과 내비게이션 테스트가 통과하는지 확인한다**

Run:

```powershell
npm test -- src/widgets/app-navigation/ui/app_navigation.test.tsx src/widgets/app-navigation/ui/app_navigation_contract.test.ts src/app/authenticated_workspace.test.tsx -t "renders the workspace tabs|uses the header flow|moves between the home"
```

Expected: 선택한 세 계약이 PASS.

- [ ] **Step 8: 공통 셸 변경을 커밋한다**

```powershell
git add src/app/authenticated_workspace.tsx src/app/styles/authenticated_workspace.css src/app/authenticated_workspace.test.tsx src/widgets/app-navigation/ui/app_navigation.tsx src/widgets/app-navigation/ui/app_navigation.css src/widgets/app-navigation/ui/app_navigation.test.tsx src/widgets/app-navigation/ui/app_navigation_contract.test.ts
git commit -m "feat: 반응형 내비게이션과 공통 셸 개편"
```

### Task 3: 홈 첫 행동과 고정 제안 영역 분리

**Files:**

- Modify: `src/pages/home/ui/home_page.test.tsx`
- Modify: `src/pages/home/ui/retrieve_search_panel.tsx`
- Modify: `src/pages/home/ui/home_page.tsx`
- Modify: `src/pages/home/ui/home_page.css`

- [ ] **Step 1: 기존 홈 테스트에 영역 분리 계약을 추가한다**

`defines a centered retrieval axis with responsive suggestion columns` 테스트가 다음 규칙을 확인하도록 바꾼다.

```ts
const stageRule = getCssRule(styles, '.home-page__stage');
const heroRule = getCssRule(styles, '.home-page__hero');
const bodyRule = getCssRule(styles, '.home-page__body');

expect(stageRule).toContain('background: var(--color-retrieve-blue);');
expect(heroRule).toContain('width: min(820px, 100%);');
expect(heroRule).toContain('margin-inline: auto;');
expect(bodyRule).toContain(
  'width: min(var(--layout-content-width), calc(100% - var(--spacing-8)));'
);
```

`keeps survey situations and helper without legacy fallback before submission` 테스트에 다음 DOM 경계를 추가한다.

```ts
const queryInput = screen.getByRole('textbox', {
  name: '지금 꺼내 보고 싶은 상황',
});
const suggestion = screen.getByRole('button', {
  name: '과제 참고자료 다시 찾기',
});

expect(queryInput.closest('.home-page__stage')).not.toBeNull();
expect(suggestion.closest('.home-page__body')).not.toBeNull();
expect(suggestion.closest('.home-page__stage')).toBeNull();
```

- [ ] **Step 2: 현재 한 컴포넌트에 섞인 제안 영역 때문에 테스트가 실패하는지 확인한다**

Run:

```powershell
npm test -- src/pages/home/ui/home_page.test.tsx -t "defines a centered retrieval axis|keeps survey situations"
```

Expected: `.home-page__stage`와 `.home-page__body`가 없어 FAIL.

- [ ] **Step 3: `RetrieveSearchPanel`을 첫 검색 행동만 렌더링하도록 줄인다**

`RetrieveSearchPanelProps`에서 `onSituationClick`, `selectedSituation`, `situations`를 제거한다. `SuggestedSituation` 타입은 외부 공개 타입 호환을 위해 같은 파일에 유지한다.

컴포넌트 반환값은 다음 form 하나로 바꾼다.

```tsx
return (
  <form className="home-page__search" onSubmit={onRetrieve}>
    <label htmlFor="retrieve-query">지금 꺼내 보고 싶은 상황</label>
    <div className="home-page__search-row">
      <ClearableTextField
        clearLabel="입력 지우기"
        height={52}
        id="retrieve-query"
        onChange={(event) => onQueryChange(event.currentTarget.value)}
        onClear={onClearQuery}
        placeholder="예: 과제 참고자료 다시 찾기"
        value={query}
        width="100%"
      />
      <Button
        className="home-page__search-action"
        hierarchy="primary"
        size="large"
        type="submit"
      >
        꺼내보기
      </Button>
    </div>
  </form>
);
```

`ChoiceChip` import는 `retrieve_search_panel.tsx`에서 제거한다.

- [ ] **Step 4: 홈을 색상 영역과 본문으로 조합한다**

`home_page.tsx`에서 `ChoiceChip`을 `@/shared/ui`에서 import하고 `return`의 최상위 구조를 다음과 같이 바꾼다.

```tsx
return (
  <section className="home-page" aria-labelledby="retrieve-title">
    <div className="home-page__stage">
      <header className="home-page__hero">
        <p className="home-page__kicker">꺼내보기</p>
        <h2 id="retrieve-title">지금 필요한 인사이트를 꺼내 보세요</h2>
        <RetrieveSearchPanel
          onClearQuery={onClearQuery}
          onQueryChange={onQueryChange}
          onRetrieve={onRetrieve}
          query={query}
        />
      </header>
    </div>

    <div className="home-page__body">
      <div className="home-page__suggestion-panel" aria-label="추천 상황">
        <div className="home-page__suggestions">
          {situations.map((situation) => (
            <ChoiceChip
              key={situation.query}
              onClick={() => onSituationClick(situation)}
              selected={selectedSituation === situation.query}
              size="medium"
              type="button"
            >
              {situation.label}
            </ChoiceChip>
          ))}
        </div>
        <p className="home-page__summary">
          떠오르는 단어나 지금 하는 일을 짧게 적어 보세요.
        </p>
      </div>

      {libraryState === 'loading' ? (
        <LoadingState label="꺼내볼 인사이트를 불러오고 있어요" />
      ) : libraryState === 'unavailable' ? (
        <div className="home-page__no-results">
          <EmptyState
            actionLabel="다시 불러오기"
            description="네트워크와 로그인 상태를 확인한 뒤 다시 불러와 주세요."
            onAction={onRetryLoad}
            title="보관함을 불러오지 못해 꺼내볼 수 없어요"
          />
        </div>
      ) : insightCount === 0 ? (
        <div className="home-page__no-results">
          <EmptyState
            actionLabel="인사이트 저장하기"
            description="첫 인사이트를 저장하면 지금 상황에 맞는 자료를 다시 꺼낼 수 있어요."
            onAction={onOpenSave}
            title="아직 저장한 인사이트가 없어요"
          />
        </div>
      ) : (
        <RetrieveResults
          onOpenLibrary={onOpenLibrary}
          results={results}
          submittedQuery={submittedQuery}
        />
      )}
    </div>
  </section>
);
```

- [ ] **Step 5: 홈 색상 영역과 본문 CSS를 적용한다**

`home_page.css`에서 최상위 영역 규칙을 다음 값으로 바꾸고, 기존 결과 카드 규칙은 유지한다.

```css
.home-page {
  min-width: 0;
  background: var(--color-paper);
}

.home-page__stage {
  padding: var(--spacing-12) var(--spacing-4);
  background: var(--color-retrieve-blue);
}

.home-page__hero {
  display: grid;
  width: min(820px, 100%);
  margin-inline: auto;
  justify-items: center;
  gap: var(--spacing-4);
  text-align: center;
}

.home-page__kicker,
.home-page__hero h2,
.home-page__search label {
  color: var(--color-surface);
}

.home-page__body {
  display: grid;
  width: min(var(--layout-content-width), calc(100% - var(--spacing-8)));
  margin-inline: auto;
  padding: var(--spacing-8) 0 var(--spacing-20);
  gap: var(--spacing-10);
}

.home-page__suggestion-panel {
  display: grid;
  width: min(820px, 100%);
  margin-inline: auto;
  gap: var(--spacing-3);
}
```

기존 `.home-page__kicker`, `.home-page__hero h2`, `.home-page__search label`의 `color: var(--color-ink)` 또는 `color: var(--color-graphite)` 선언은 `color: var(--color-surface)`로 교체한다. 뒤쪽 규칙이 대표 색상 영역의 밝은 글자색을 다시 덮어쓰지 않게 한다.

모바일 규칙에는 다음 값만 추가한다.

```css
@media (max-width: 767px) {
  .home-page__stage {
    padding: var(--spacing-8) var(--spacing-4);
  }

  .home-page__body {
    width: min(calc(100% - var(--spacing-6)), var(--layout-content-width));
    padding-top: var(--spacing-6);
    gap: var(--spacing-8);
  }
}
```

- [ ] **Step 6: 홈의 직접 영향 테스트가 통과하는지 확인한다**

Run:

```powershell
npm test -- src/pages/home/ui/home_page.test.tsx -t "defines a centered retrieval axis|keeps survey situations|reports situation selection"
```

Expected: 색상 영역, 고정 제안 영역과 기존 제안 클릭 동작이 PASS.

- [ ] **Step 7: 홈 변경을 커밋한다**

```powershell
git add src/pages/home/ui/retrieve_search_panel.tsx src/pages/home/ui/home_page.tsx src/pages/home/ui/home_page.css src/pages/home/ui/home_page.test.tsx
git commit -m "feat: 홈 첫 행동과 결과 영역 분리"
```

### Task 4: 보관함 검색과 문맥별 개수 배치

**Files:**

- Modify: `src/pages/library/ui/library_page.test.tsx`
- Modify: `src/pages/library/ui/library_page.tsx`
- Modify: `src/pages/library/ui/library_page.css`

- [ ] **Step 1: 기존 테스트에 영역과 문맥별 개수 계약을 추가한다**

첫 CSS 테스트에서 다음 값을 확인한다.

```ts
const stageRule = getCssRule(styles, '.library-page__stage');
const headerRule = getCssRule(styles, '.library-page__header');
const bodyRule = getCssRule(styles, '.library-page__body');

expect(stageRule).toContain('background: var(--color-library-coral);');
expect(headerRule).toContain('width: min(820px, 100%);');
expect(bodyRule).toContain(
  'width: min(var(--layout-content-width), calc(100% - var(--spacing-8)));'
);
```

기존 테스트에 새 테스트 케이스를 만들지 않고 다음 assertion을 각각 추가한다.

```ts
// 검색어가 있고 결과가 없을 때
expect(screen.getByText('검색 결과 0개')).not.toBeNull();

// 개발 카테고리에 결과가 없을 때
expect(screen.getByText('개발 0개')).not.toBeNull();

// 전체 보관함에 인사이트 한 개가 있을 때
expect(screen.getByText('인사이트 1개')).not.toBeNull();
```

- [ ] **Step 2: 현재 장식적 개수 배치 때문에 테스트가 실패하는지 확인한다**

Run:

```powershell
npm test -- src/pages/library/ui/library_page.test.tsx -t "centers the library header|keeps a no-result query|distinguishes a category-only|기존 보관함"
```

Expected: `.library-page__stage`, `.library-page__body`와 문맥별 개수 문구가 없어 FAIL.

- [ ] **Step 3: 현재 조건을 설명하는 개수 문구를 계산한다**

`activeCategoryLabel` 계산 다음에 아래 값을 추가한다.

```ts
const resultCountLabel = hasQuery
  ? `검색 결과 ${insights.length}개`
  : activeCategory === 'all'
    ? `인사이트 ${insights.length}개`
    : `${activeCategoryLabel} ${insights.length}개`;
```

기존 헤더의 절대 배치된 `{insights.length}개` span과 검색 결과용 `visually-hidden` status는 삭제한다.

- [ ] **Step 4: 검색을 대표 색상 영역으로 옮기고 카테고리와 개수를 본문에 둔다**

`LibraryPage`의 헤더부터 content 시작 전까지를 다음 구조로 바꾼다.

```tsx
<div className="library-page__stage">
  <header className="library-page__header">
    <div className="library-page__heading">
      <p className="library-page__kicker">보관함</p>
      <h2 id="library-title">
        {activeCategory === 'all' ? '전체 인사이트' : activeCategoryLabel}
      </h2>
      <p className="library-page__summary">
        카테고리와 검색으로 저장한 인사이트를 빠르게 찾아 보세요.
      </p>
    </div>
    <div className="library-page__search">
      <label htmlFor="global-search">보관함 검색</label>
      <SearchField
        id="global-search"
        onChange={(event) => onQueryChange(event.currentTarget.value)}
        onReset={() => onQueryChange('')}
        placeholder="제목, 메모, 카테고리, 도메인이나 URL 검색"
        ref={searchInputRef}
        size="medium"
        value={query}
        width="100%"
      />
    </div>
    {hasLibraryInsights && !loading && !unavailable ? (
      <Button
        className="library-page__import-action"
        hierarchy="secondary"
        onClick={onOpenImport}
        size="small"
        type="button"
      >
        인사이트 가져오기
      </Button>
    ) : null}
  </header>
</div>

<div className="library-page__body">
  <div className="library-page__work-area">
    <div className="library-page__filter">
      <div className="library-page__filter-heading">
        <span className="library-page__label">카테고리</span>
        {onManageCategories ? (
          <Button
            aria-label="카테고리 관리"
            disabled={categoryManagementDisabled}
            hierarchy="ghost"
            onClick={onManageCategories}
            size="small"
            type="button"
          >
            관리
          </Button>
        ) : null}
      </div>
      <CategoryFilter
        onValueChange={onCategoryChange}
        options={categoryOptions}
        value={activeCategory}
      />
    </div>
  </div>

  {!loading && !unavailable && hasLibraryInsights ? (
    <p className="library-page__result-count" role="status">
      {resultCountLabel}
    </p>
  ) : null}

  <div className="library-page__content">
```

기존 `.library-page__content`의 loading, unavailable, empty, `InsightGrid` 분기는 그대로 유지하고 닫는 태그를 `body`, `section` 순서로 맞춘다.

- [ ] **Step 5: 보관함 색상 영역과 결과 본문 CSS를 적용한다**

다음 영역 규칙을 사용한다.

```css
.library-page {
  min-width: 0;
  background: var(--color-paper);
}

.library-page__stage {
  padding: var(--spacing-12) var(--spacing-4);
  background: var(--color-library-coral);
}

.library-page__header {
  display: grid;
  width: min(820px, 100%);
  margin-inline: auto;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
  gap: var(--spacing-4);
}

.library-page__heading,
.library-page__search {
  display: grid;
  gap: var(--spacing-2);
}

.library-page__heading {
  grid-column: 1 / -1;
}

.library-page__kicker,
.library-page__header h2,
.library-page__summary,
.library-page__search label {
  color: var(--color-surface);
}

.library-page__body {
  display: grid;
  width: min(var(--layout-content-width), calc(100% - var(--spacing-8)));
  margin-inline: auto;
  padding: var(--spacing-8) 0 var(--spacing-20);
  gap: var(--spacing-4);
}

.library-page__work-area {
  display: grid;
  gap: var(--spacing-4);
}

.library-page__result-count {
  color: var(--color-graphite);
  font-size: var(--typography-label-size);
  font-weight: 700;
  line-height: var(--typography-label-line-height);
}
```

기존에 함께 묶여 있던 `.library-page__kicker, .library-page__label` 색상 규칙은 분리한다. `.library-page__kicker`는 `var(--color-surface)`, 본문의 `.library-page__label`은 `var(--color-graphite)`를 사용한다. 기존 헤더 제목, 설명과 검색 label의 어두운 글자색 선언은 밝은 글자색으로 교체한다.

모바일에서는 헤더를 한 열로 바꾸고 가져오기 버튼과 본문 폭을 다음과 같이 조정한다.

```css
@media (max-width: 767px) {
  .library-page__stage {
    padding: var(--spacing-8) var(--spacing-4);
  }

  .library-page__header {
    grid-template-columns: minmax(0, 1fr);
  }

  .library-page__import-action {
    width: 100%;
  }

  .library-page__body {
    width: min(calc(100% - var(--spacing-6)), var(--layout-content-width));
    padding-top: var(--spacing-6);
  }

  .library-page__filter > .category-filter {
    justify-content: flex-start;
  }
}
```

- [ ] **Step 6: 보관함의 직접 영향 테스트가 통과하는지 확인한다**

Run:

```powershell
npm test -- src/pages/library/ui/library_page.test.tsx -t "centers the library header|keeps a no-result query|distinguishes a category-only|기존 보관함"
```

Expected: 검색, 카테고리, 전체 보관함의 개수와 영역 배치가 PASS.

- [ ] **Step 7: 보관함 변경을 커밋한다**

```powershell
git add src/pages/library/ui/library_page.tsx src/pages/library/ui/library_page.css src/pages/library/ui/library_page.test.tsx
git commit -m "feat: 보관함 검색과 결과 개수 재배치"
```

### Task 5: 저장 첫 행동과 후속 입력 영역 분리

**Files:**

- Modify: `src/pages/save/ui/save_page.test.tsx`
- Modify: `src/pages/save/ui/save_page_contract.test.ts`
- Modify: `src/pages/save/ui/save_page.tsx`
- Modify: `src/pages/save/ui/save_page.css`

- [ ] **Step 1: 기존 저장 테스트에 전·후 영역 계약을 추가한다**

`asks for optional personal context only after the URL is saved` 테스트에서 다음 경계를 확인한다.

```ts
const followupHeading = screen.getByRole('heading', {
  name: '언제 다시 쓰고 싶은가요?',
});

expect(followupHeading.closest('.save-page__body')).not.toBeNull();
expect(followupHeading.closest('.save-page__stage')).toBeNull();
```

`reports URL changes and save submission` 테스트에 다음 검증을 추가한다.

```ts
expect(
  screen.getByRole('textbox', { name: 'URL' }).closest('.save-page__stage')
).not.toBeNull();
```

`save_page_contract.test.ts`의 기존 테스트에 색상 영역과 본문 폭 계약을 추가한다.

```ts
expect(savePageStyles).toMatch(
  /\.save-page__stage\s*\{[^}]*background:\s*var\(--color-save-green\);/s
);
expect(savePageStyles).toMatch(
  /\.save-page__body\s*\{[^}]*width:\s*min\(720px,\s*calc\(100%\s*-\s*var\(--spacing-8\)\)\);/s
);
```

- [ ] **Step 2: 현재 단일 카드 구조에서 새 영역 테스트가 실패하는지 확인한다**

Run:

```powershell
npm test -- src/pages/save/ui/save_page.test.tsx src/pages/save/ui/save_page_contract.test.ts -t "asks for optional personal context|reports URL changes|keeps the clipboard"
```

Expected: `.save-page__stage`와 `.save-page__body`가 없어 FAIL.

- [ ] **Step 3: 제목과 URL 저장 form을 대표 색상 영역으로 묶는다**

`save_page.tsx`의 section 안에서 header와 첫 form을 다음 wrapper로 감싼다.

```tsx
<div className="save-page__stage">
  <div className="save-page__stage-inner">
    <header className="save-page__header">
      {!isSharedSave ? (
        <p className="save-page__kicker">URL을 입력하면 바로 저장해요</p>
      ) : null}
      <h2 id="save-title">
        {isSharedSave
          ? '공유한 링크를 저장할까요?'
          : 'URL을 입력하면 바로 저장해요'}
      </h2>
      <p>
        먼저 인사이트를 저장하고 제목, 메모와 카테고리는 나중에 추가해도
        돼요.
      </p>
    </header>

    <form
      aria-busy={isSaving}
      className="save-page__form"
      noValidate
      onSubmit={onSave}
    >
```

기존 URL form의 모든 필드, 오류 `StatusMessage`, 저장 버튼을 이 form 안에 그대로 유지하고 `form`, `stage-inner`, `stage` 순서로 닫는다. 입력 오류는 URL 필드 바로 뒤에 남아 첫 행동의 오류 문맥을 유지한다.

- [ ] **Step 4: 저장 완료 이후 내용만 본문에 렌더링한다**

기존 `saveComplete` 분기를 다음 body 안으로 옮긴다.

```tsx
{saveComplete ? (
  <div className="save-page__body">
    <div className="save-page__followup">
      <StatusMessage title="인사이트를 저장했어요" variant="success">
        <p>보관함에 추가했어요. 지금 정리하지 않아도 돼요.</p>
      </StatusMessage>
      <form
        className="save-page__context-form"
        noValidate
        onSubmit={onContextSave}
      >
```

기존 제목, 메모, 카테고리, 저장 상태와 건너뛰기 동작은 이 form 안에 그대로 유지하고 `form`, `followup`, `body` 순서로 닫는다.

- [ ] **Step 5: 저장 색상 영역과 후속 입력 본문 CSS를 적용한다**

`save_page.css`의 최상위 카드 규칙을 다음 구조로 교체한다.

```css
.save-page {
  min-width: 0;
  background: var(--color-paper);
  overflow-wrap: anywhere;
}

.save-page__stage {
  padding: var(--spacing-12) var(--spacing-4);
  background: var(--color-save-green);
}

.save-page__stage-inner {
  display: grid;
  width: min(720px, 100%);
  margin-inline: auto;
  gap: var(--spacing-6);
}

.save-page__header {
  display: grid;
  gap: var(--spacing-2);
}

.save-page__kicker,
.save-page__header h2,
.save-page__header > p:last-child,
.save-page__form > label {
  color: var(--color-surface);
}

.save-page__body {
  display: grid;
  width: min(720px, calc(100% - var(--spacing-8)));
  margin-inline: auto;
  padding: var(--spacing-8) 0 var(--spacing-20);
}

.save-page__followup {
  display: grid;
  padding: var(--spacing-6);
  border: 1px solid var(--color-ash);
  border-radius: var(--radius-card);
  background: var(--color-canvas);
  gap: var(--spacing-6);
}
```

기존 `.save-page__kicker`, `.save-page__header h2`, `.save-page__header > p:last-child`, `.save-page__form label`의 어두운 글자색은 `var(--color-surface)`로 교체한다. form, 상태, 카테고리 선택과 action의 나머지 규칙은 유지한다. 모바일에서는 다음 값으로 바꾼다.

```css
@media (max-width: 767px) {
  .save-page__stage {
    padding: var(--spacing-8) var(--spacing-4);
  }

  .save-page__body {
    width: min(calc(100% - var(--spacing-6)), 720px);
    padding-top: var(--spacing-6);
  }

  .save-page__followup {
    padding: var(--spacing-4);
    gap: var(--spacing-5);
  }

  button.save-page__clipboard-action {
    width: 100%;
  }
}
```

- [ ] **Step 6: 저장의 직접 영향 테스트가 통과하는지 확인한다**

Run:

```powershell
npm test -- src/pages/save/ui/save_page.test.tsx src/pages/save/ui/save_page_contract.test.ts -t "asks for optional personal context|reports URL changes|클립보드 보조 버튼|keeps the clipboard"
```

Expected: URL 첫 행동은 색상 영역, 후속 맥락은 본문에 있고 기존 저장·붙여넣기 동작이 PASS.

- [ ] **Step 7: 저장 변경을 커밋한다**

```powershell
git add src/pages/save/ui/save_page.tsx src/pages/save/ui/save_page.css src/pages/save/ui/save_page.test.tsx src/pages/save/ui/save_page_contract.test.ts
git commit -m "feat: 저장 첫 행동과 후속 입력 분리"
```

### Task 6: 디자인 계약 갱신과 최소 통합 검증

**Files:**

- Modify: `DESIGN.md`

- [ ] **Step 1: 실행 중인 디자인 계약을 새 화면과 일치시킨다**

`DESIGN.md`에 다음 내용을 반영한다.

```markdown
- 인증 후 기본 배경색: `#F4F1E9`
- 인증 후 카드·입력 배경색: `#FFFDF8`
- 홈 대표 색상: `#1358D8`
- 보관함 대표 색상: `#C94032`
- 저장 대표 색상: `#08765B`
- `768px` 이상: 흰색 계열 상단바 안의 상단 내비게이션
- `767px` 이하: 브랜드 상단바와 고정 하단 내비게이션
- 색상 영역에는 제목과 첫 행동까지만 배치
- 오류는 입력 가까이, 로딩·빈 상태·성공과 후속 입력은 기본 배경색 본문에 배치
```

공개 표현 지침도 다음 문장으로 남긴다.

```markdown
GitHub 이슈와 PR 본문은 `Paper`, `Surface`, 토큰명 같은 구현 내부 용어 대신 `기본 배경색`, `카드·입력 배경색`, `화면별 대표 색상`처럼 결과를 바로 이해할 수 있는 표현을 사용한다.
```

- [ ] **Step 2: 수정한 파일만 포맷과 린트로 확인한다**

Run:

```powershell
npx prettier --check src/shared/config/design-system/tokens.ts src/shared/config/design-system/tokens.test.ts src/shared/config/design-system/apply_design_tokens.test.ts src/app/authenticated_workspace.tsx src/app/styles/authenticated_workspace.css src/widgets/app-navigation/ui/app_navigation.tsx src/widgets/app-navigation/ui/app_navigation.css src/widgets/app-navigation/ui/app_navigation.test.tsx src/widgets/app-navigation/ui/app_navigation_contract.test.ts src/app/authenticated_workspace.test.tsx src/pages/home/ui/retrieve_search_panel.tsx src/pages/home/ui/home_page.tsx src/pages/home/ui/home_page.css src/pages/home/ui/home_page.test.tsx src/pages/library/ui/library_page.tsx src/pages/library/ui/library_page.css src/pages/library/ui/library_page.test.tsx src/pages/save/ui/save_page.tsx src/pages/save/ui/save_page.css src/pages/save/ui/save_page.test.tsx src/pages/save/ui/save_page_contract.test.ts DESIGN.md
npx eslint src/shared/config/design-system/tokens.ts src/shared/config/design-system/tokens.test.ts src/shared/config/design-system/apply_design_tokens.test.ts src/app/authenticated_workspace.tsx src/widgets/app-navigation/ui/app_navigation.tsx src/widgets/app-navigation/ui/app_navigation.test.tsx src/widgets/app-navigation/ui/app_navigation_contract.test.ts src/app/authenticated_workspace.test.tsx src/pages/home/ui/retrieve_search_panel.tsx src/pages/home/ui/home_page.tsx src/pages/home/ui/home_page.test.tsx src/pages/library/ui/library_page.tsx src/pages/library/ui/library_page.test.tsx src/pages/save/ui/save_page.tsx src/pages/save/ui/save_page.test.tsx src/pages/save/ui/save_page_contract.test.ts
```

Expected: 두 명령 모두 exit code `0`.

- [ ] **Step 3: 변경 범위에 직접 연결된 테스트만 한 번 더 실행한다**

Run:

```powershell
npm test -- src/shared/config/design-system/tokens.test.ts src/shared/config/design-system/apply_design_tokens.test.ts
npm test -- src/widgets/app-navigation/ui/app_navigation.test.tsx src/widgets/app-navigation/ui/app_navigation_contract.test.ts src/app/authenticated_workspace.test.tsx -t "renders the workspace tabs|uses the header flow|moves between the home"
npm test -- src/pages/home/ui/home_page.test.tsx -t "defines a centered retrieval axis|keeps survey situations|reports situation selection"
npm test -- src/pages/library/ui/library_page.test.tsx -t "centers the library header|keeps a no-result query|distinguishes a category-only|기존 보관함"
npm test -- src/pages/save/ui/save_page.test.tsx src/pages/save/ui/save_page_contract.test.ts -t "asks for optional personal context|reports URL changes|클립보드 보조 버튼|keeps the clipboard"
```

Expected: 선택한 토큰, 내비게이션, 홈, 보관함, 저장 테스트만 PASS. 랜딩, 로그인, 가져오기, 확장 프로그램 테스트는 실행하지 않는다.

- [ ] **Step 4: 웹 빌드로 TypeScript와 번들 계약을 확인한다**

Run:

```powershell
npm run build:web
```

Expected: TypeScript build, Vite web build와 클라이언트 번들 검증이 exit code `0`. Chrome 확장 빌드는 실행하지 않는다.

- [ ] **Step 5: 세 기준 너비에서 실제 화면을 확인한다**

개발 서버를 실행한다.

```powershell
npm run dev
```

인앱 브라우저에서 인증 후 홈, 보관함, 저장을 다음 너비로 확인한다.

| 너비     | 직접 확인할 항목                                                         |
| -------- | ------------------------------------------------------------------------ |
| `390px`  | 브랜드 상단바, 고정 하단 내비게이션, 한 열 입력, 마지막 콘텐츠 가림 여부 |
| `768px`  | 상단 내비게이션 전환, 대표 색상 영역의 경계, 입력과 버튼 배치            |
| `1280px` | 상단바 내부 `1200px`, 첫 행동 `820px`, 결과 본문 `1200px` 정렬           |

각 너비에서 다음 세 화면만 확인한다.

- 홈: 검색은 파란 색상 영역, 고정 제안과 결과는 기본 배경색 본문
- 보관함: 검색은 코럴 색상 영역, 카테고리·문맥별 개수·결과는 본문
- 저장: URL 입력은 초록 색상 영역, 저장 완료와 추가 입력은 본문

오류 상태는 저장 URL에 잘못된 값을 한 번 입력해 필드 가까이 표시되는지만 확인한다. 관련 없는 전체 사용자 여정은 반복하지 않는다.

- [ ] **Step 6: 대표 스크린샷 후보를 실제 카드 크기로 비교한다**

`1280px` 홈, 보관함, 저장 캡처를 프로젝트 갤러리의 16:9 카드 크기로 축소한다. 홈 단일 장면 후보 A와 가장 식별력이 높은 다른 한 장만 나란히 비교한다.

확인 기준:

- 축소 후에도 제품 이름과 첫 행동을 읽을 수 있다.
- 대표 색상 영역이 카드 사이에서 제품을 식별하게 한다.
- 결과 카드가 너무 작아져 정보 잡음이 되지 않는다.

대표 이미지는 사용자가 두 후보를 확인한 뒤 확정한다.

- [ ] **Step 7: 디자인 계약 문서와 검증 결과를 커밋한다**

```powershell
git add DESIGN.md
git commit -m "docs: 인증 후 핵심 앱 디자인 계약 갱신"
```

- [ ] **Step 8: 공개 이슈와 PR에는 직관적인 표현만 사용한다**

#90 완료 체크와 PR 본문은 다음 결과 중심 표현으로 작성한다.

```markdown
## 변경 이유

순백색이 넓게 이어지는 화면의 밝기 부담을 줄이고, 홈·보관함·저장의 첫 행동을 한눈에 구분할 수 있도록 화면을 개편했습니다.

## 변경 결과

- 기본 배경색과 카드·입력 배경색을 분리했습니다.
- 홈, 보관함, 저장에 서로 다른 대표 색상을 적용했습니다.
- 데스크톱·태블릿은 상단 내비게이션, 모바일은 하단 내비게이션을 사용합니다.
- 보관함의 인사이트 개수를 현재 검색·카테고리 결과 가까이 옮겼습니다.
- 검색, 저장, 가져오기와 데이터 형식은 변경하지 않았습니다.

## 검증

- 390px, 768px, 1280px에서 홈·보관함·저장을 확인했습니다.
- 변경된 색상, 내비게이션과 세 화면에 직접 연결된 테스트만 실행했습니다.
- 웹 빌드를 확인했습니다.
```

PR 본문에는 `Paper`, `Surface`, `stage`, `canvas`, CSS 변수명과 컴포넌트명을 사용하지 않는다.
