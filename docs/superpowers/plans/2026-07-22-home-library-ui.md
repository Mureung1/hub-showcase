# Home and Library UI Improvement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 홈의 `꺼내보기`를 시각적으로 중앙에 배치하고 설문 기반 예시·명확한 초기화를 제공하며, 홈과 보관함이 공유하는 인사이트 카드를 A3 정보 위계로 단순화한다.

**Architecture:** `HomePage`는 원격 상태 조합만 남기고 검색 입력과 결과를 page slice 내부의 `RetrieveSearchPanel`, `RetrieveResults`로 분리한다. `InsightGrid`는 목록만 담당하고 기존 카드 상태 로직은 entity slice의 `InsightCard`로 이동한다. 검색 랭킹은 유지하되 사용자에게 노출하지 않는 연결 단서 생성 계약은 제거한다.

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library, WDS shared UI adapters, CSS design tokens

---

### Task 1: 연결 단서 없는 꺼내보기 도메인 계약

**Files:**
- Modify: `src/entities/insight/model/retrieve_insights.test.ts`
- Modify: `src/entities/insight/model/retrieve_insights.ts`
- Modify: `CONTEXT.md`
- Modify: `docs/retrieve.md`
- Modify: `docs/discussion.md`

- [ ] **Step 1: 사용자 노출 연결 단서가 결과 계약에 없다는 실패 테스트 작성**

`retrieve_insights.test.ts`의 연결 단서 문자열 전용 테스트를 제거하고, 기존 상위 6개 테스트에 다음 검증을 추가한다.

```ts
expect(retrieved[0]).not.toHaveProperty('connectionClue');
expect(retrieved.every(({ score }) => score > 0)).toBe(true);
```

랭킹 경쟁, 메모 가중치 우선, Top-5 fixture 테스트는 그대로 유지한다.

- [ ] **Step 2: 테스트를 실행해 기존 계약 때문에 실패하는지 확인**

Run: `npm test -- src/entities/insight/model/retrieve_insights.test.ts`

Expected: FAIL because `retrieveInsights()` still adds `connectionClue`.

- [ ] **Step 3: 연결 단서 생성 없이 검색 결과 상위 6개만 반환**

`retrieve_insights.ts`를 다음 최소 계약으로 바꾼다.

```ts
import type { Insight } from './insight';
import { searchInsights, type InsightSearchResult } from './search_insights';

export type RetrievedInsight = InsightSearchResult;

export function retrieveInsights(
  insights: readonly Insight[],
  query: string
): RetrievedInsight[] {
  return searchInsights(insights, query).slice(0, 6);
}
```

`createConnectionClue()`와 `findMatchedToken()`은 삭제한다. `matchedFields`, `matchedTokens`, `score`는 랭킹 검증과 진단을 위한 내부 검색 결과로 유지한다.

- [ ] **Step 4: 활성 제품 문서를 새 결정으로 갱신**

`CONTEXT.md`에서 `연결 단서` 용어 행을 제거하고 `꺼내보기` 정의를 `현재 상황이나 용도를 입력해 관련 인사이트를 최대 6개로 받는 기능`으로 바꾼다.

`docs/retrieve.md`는 다음 원칙으로 수정한다.

```md
- 보관함 검색과 꺼내보기는 같은 결정적 검색 코어를 공유한다.
- 일치 필드와 점수는 결과 정렬에만 사용하고 사용자에게 선정 근거 문장을 표시하지 않는다.
- 꺼내보기는 점수가 높은 최대 6개 인사이트를 보여준다.
```

연결 단서 전용 절, 화면 흐름의 `일치 필드로 연결 단서 생성` 단계, 테스트 기준의 연결 단서 항목을 제거한다. `작업팩`은 `꺼내보기 결과`로 바꾼다.

`docs/discussion.md`의 활성 MVP 흐름과 꺼내보기 절에서도 `작업팩`, 사용자 노출 연결 단서를 각각 `꺼내보기 결과`, 제목·메모·카테고리로 판단하는 카드로 교체한다. 과거 결정 기록을 새 자동 추천 주장으로 바꾸지 않는다.

- [ ] **Step 5: 도메인 테스트와 문서 diff 검사**

Run: `npm test -- src/entities/insight/model/retrieve_insights.test.ts`

Expected: PASS.

Run: `git diff --check`

Expected: no output.

- [ ] **Step 6: 커밋**

```bash
git add CONTEXT.md docs/retrieve.md docs/discussion.md src/entities/insight/model/retrieve_insights.ts src/entities/insight/model/retrieve_insights.test.ts
git commit -m "refactor: 꺼내보기 연결 단서 계약 제거"
```

### Task 2: 접근 가능한 홈 검색 초기화 어댑터

**Files:**
- Modify: `src/shared/ui/text-field/text_field.tsx`
- Modify: `src/shared/ui/text-field/text_field.css`
- Modify: `src/shared/ui/text-field/text_field.test.tsx`
- Modify: `src/shared/ui/text-field/index.ts`
- Modify: `src/shared/ui/index.ts`

- [ ] **Step 1: 값이 있을 때만 초기화 버튼을 노출하는 실패 테스트 작성**

`text_field.test.tsx`에 다음 테스트를 추가한다.

```tsx
it('shows an accessible clear action only for a non-empty controlled value', async () => {
  const user = userEvent.setup();
  const onClear = vi.fn();
  const { rerender } = render(
    <DesignSystemProvider>
      <ClearableTextField
        aria-label="상황"
        clearLabel="입력 지우기"
        onClear={onClear}
        value="프로젝트"
      />
    </DesignSystemProvider>
  );

  await user.click(screen.getByRole('button', { name: '입력 지우기' }));
  expect(onClear).toHaveBeenCalledOnce();

  rerender(
    <DesignSystemProvider>
      <ClearableTextField
        aria-label="상황"
        clearLabel="입력 지우기"
        onClear={onClear}
        value=""
      />
    </DesignSystemProvider>
  );

  expect(screen.queryByRole('button', { name: '입력 지우기' })).toBeNull();
});
```

테스트 import에 `ClearableTextField`를 추가한다.

- [ ] **Step 2: 테스트를 실행해 export 부재로 실패하는지 확인**

Run: `npm test -- src/shared/ui/text-field/text_field.test.tsx`

Expected: FAIL because `ClearableTextField` is not exported.

- [ ] **Step 3: WDS 내부 초기화를 대체하는 접근 가능한 어댑터 구현**

`text_field.tsx`에 다음 controlled adapter를 추가한다.

```tsx
export type ClearableTextFieldProps = Omit<
  TextFieldProps,
  'onReset' | 'trailingContent'
> & {
  clearLabel: string;
  onClear: () => void;
};

export const ClearableTextField = forwardRef<
  HTMLInputElement,
  ClearableTextFieldProps
>(function ClearableTextField(
  { className, clearLabel, onClear, value, ...props },
  ref
) {
  const hasValue = typeof value === 'string' && value.length > 0;

  return (
    <WdsTextField
      {...props}
      className={clsx('ui-field', 'ui-field--clearable', className)}
      ref={ref}
      trailingContent={
        hasValue ? (
          <button
            aria-label={clearLabel}
            className="ui-field__clear"
            onClick={onClear}
            type="button"
          >
            ×
          </button>
        ) : undefined
      }
      value={value}
    />
  );
});
```

`text_field.css`에서 `.ui-field--clearable [data-role='text-field-reset']`을 숨기고 `.ui-field__clear`에 44px 최소 터치 영역, transparent 배경, token 색상, visible focus 규칙을 적용한다. `clearLabel`은 `aria-label`로만 전달하며 화면 텍스트를 추가하지 않는다.

`text-field/index.ts`와 `shared/ui/index.ts`에서 named export한다.

- [ ] **Step 4: 어댑터 테스트와 타입 검사 실행**

Run: `npm test -- src/shared/ui/text-field/text_field.test.tsx`

Expected: PASS.

Run: `npm run build:web`

Expected: PASS with no TypeScript error.

- [ ] **Step 5: 커밋**

```bash
git add src/shared/ui/text-field src/shared/ui/index.ts
git commit -m "feat: 접근 가능한 검색 입력 초기화 추가"
```

### Task 3: A3 인사이트 카드와 컴포넌트 분리

**Files:**
- Create: `src/entities/insight/ui/insight_card.tsx`
- Modify: `src/entities/insight/ui/insight_grid.tsx`
- Modify: `src/entities/insight/ui/insight_grid.css`
- Modify: `src/entities/insight/ui/insight_grid.test.tsx`

- [ ] **Step 1: A3 카드 계약 실패 테스트 작성**

첫 메타데이터 테스트에 다음 검증을 추가한다.

```ts
expect(document.querySelector('.insight-card__thumbnail')).toBeNull();
expect(document.querySelector('.insight-card__connection-clue')).toBeNull();
expect(screen.getByText('example.com')).not.toBeNull();
expect(screen.getByRole('list', { name: '카테고리 목록' })).not.toBeNull();
```

카테고리가 없는 기존 테스트는 `미분류`, `카테고리 없음` 텍스트도 없음을 확인한다.

```ts
expect(screen.queryByText('미분류')).toBeNull();
expect(screen.queryByText('카테고리 없음')).toBeNull();
```

- [ ] **Step 2: 테스트를 실행해 가상 썸네일 때문에 실패하는지 확인**

Run: `npm test -- src/entities/insight/ui/insight_grid.test.tsx`

Expected: FAIL because `.insight-card__thumbnail` still exists.

- [ ] **Step 3: 카드 상태 로직을 entity 내부 컴포넌트로 이동**

`insight_grid.tsx`의 `type InsightCardProps`부터 `getThumbnailLabel`까지를 `insight_card.tsx`로 기계적으로 이동한다. 새 파일은 `useEffect`, `useId`, `useRef`, `useState`, `FormEvent`, shared UI, insight model과 URL 정규화 import를 소유한다. `InsightCard`와 `InsightCardProps`를 named export하고 `SourceAction`, `createEditDraft`, `getCardButton`, `getNextManageTrigger`, `CATEGORY_TONES`, `getCategoryTone`은 파일 내부 함수로 유지한다. 이동 후 `connectionClue` prop·분기와 `getThumbnailLabel` 함수만 삭제한다.

```ts
export type InsightCardProps = {
  insight: Insight;
  onDeleteInsight?: (insightId: string) => Promise<InsightMutationResult>;
  onDeletionFocusFallback?: () => void;
  onEditFocusFallback?: () => void;
  onUpdateInsight?: (
    insightId: string,
    context: InsightContextInput
  ) => Promise<InsightMutationResult>;
};

```

읽기 모드의 `insight-card__body` JSX는 다음 내용으로 교체한다.

```tsx
<div className="insight-card__body">
  <p className="insight-card__domain">{insight.domain}</p>
  <h3 className="insight-card__title">{insight.title}</h3>
  {insight.memo ? <p className="insight-card__memo">{insight.memo}</p> : null}
  {insight.category ? (
    <ul className="insight-card__categories" aria-label="카테고리 목록">
      <li>
        <CategoryTag
          className="insight-card__category"
          tone={getCategoryTone(insight.category)}
        >
          {insight.category}
        </CategoryTag>
      </li>
    </ul>
  ) : null}
</div>
```

`InsightGrid`는 배열 mapping만 담당한다.

```tsx
export function InsightGrid({
  insights,
  onDeleteInsight,
  onDeletionFocusFallback,
  onEditFocusFallback,
  onUpdateInsight,
}: InsightGridProps) {
  return (
    <div className="insight-grid">
      {insights.map((insight) => (
        <InsightCard
          insight={insight}
          key={insight.id}
          onDeleteInsight={onDeleteInsight}
          onDeletionFocusFallback={onDeletionFocusFallback}
          onEditFocusFallback={onEditFocusFallback}
          onUpdateInsight={onUpdateInsight}
        />
      ))}
    </div>
  );
}
```

mapping 시 `insights` prop이 `InsightCard`로 전달되지 않도록 필요한 callback만 명시적으로 전달한다.

- [ ] **Step 4: 썸네일·연결 단서 스타일 제거와 카드 높이 재조정**

`insight_grid.css`에서 `.insight-card__thumbnail`, `.insight-card__connection-clue` 규칙을 삭제한다. 카드 grid row는 본문과 footer만 사용한다.

```css
.insight-card {
  display: grid;
  min-width: 0;
  min-height: 240px;
  grid-template-rows: 1fr auto;
}
```

카테고리 목록의 `flex-wrap`과 tone tag, 메모·카테고리 조건부 렌더링은 유지한다. raw 색상이나 shadow를 추가하지 않는다.

- [ ] **Step 5: 카드 회귀 테스트 실행**

Run: `npm test -- src/entities/insight/ui/insight_grid.test.tsx`

Expected: all card render, edit, delete, unsafe URL and focus tests PASS.

- [ ] **Step 6: 커밋**

```bash
git add src/entities/insight/ui/insight_card.tsx src/entities/insight/ui/insight_grid.tsx src/entities/insight/ui/insight_grid.css src/entities/insight/ui/insight_grid.test.tsx
git commit -m "refactor: A3 인사이트 카드 컴포넌트 분리"
```

### Task 4: 설문 기반 검색 패널과 결과 컴포넌트

**Files:**
- Create: `src/pages/home/ui/retrieve_search_panel.tsx`
- Create: `src/pages/home/ui/retrieve_results.tsx`
- Modify: `src/pages/home/ui/home_page.tsx`
- Modify: `src/pages/home/ui/home_page.test.tsx`
- Modify: `src/app/model/workspace_seed.ts`
- Modify: `src/app/authenticated_workspace.tsx`
- Modify: `src/app/authenticated_workspace.test.tsx`

- [ ] **Step 1: 승인된 문구와 초기화 동작 실패 테스트 작성**

`home_page.test.tsx`의 초기 상태 테스트를 다음 계약으로 교체한다.

```ts
expect(screen.queryByText(/개인 인사이트 저장소/)).toBeNull();
expect(
  screen.queryByRole('heading', { name: '이런 상황에서 시작해보세요' })
).toBeNull();
expect(
  screen.getByText('떠오르는 단어나 지금 하고 있는 일을 짧게 적어보세요.')
).not.toBeNull();
expect(screen.queryByText('작업팩')).toBeNull();
```

default situations를 승인된 여섯 개로 만들고 각 버튼이 존재하는지 검증한다. result fixture에서는 `connectionClue`를 제거하고 `InsightGrid`가 제목·메모·카테고리를 렌더링하는지만 확인한다.

`HomePageProps`에 `onClearQuery: vi.fn()`을 추가하고 값이 있을 때 `입력 지우기` 버튼을 누르면 callback이 한 번 호출되는 테스트를 작성한다.

`authenticated_workspace.test.tsx`에는 다음 end-to-end state test를 추가한다.

```ts
await user.click(
  screen.getByRole('button', { name: '디자인·개발 레퍼런스 찾기' })
);
expect(screen.getByRole('status').textContent).toContain('결과 1개');

await user.click(screen.getByRole('button', { name: '입력 지우기' }));
expect(screen.queryByRole('status')).toBeNull();
expect(screen.queryByRole('article')).toBeNull();
expect(
  screen.getByRole('button', { name: '디자인·개발 레퍼런스 찾기' })
).not.toBeNull();
```

- [ ] **Step 2: 홈과 workspace 테스트를 실행해 실패 확인**

Run: `npm test -- src/pages/home/ui/home_page.test.tsx src/app/authenticated_workspace.test.tsx`

Expected: FAIL because old examples, summary, workpack copy and clear callback remain.

- [ ] **Step 3: 설문 기반 seed 적용**

`workspace_seed.ts`의 상황을 정확히 다음 값으로 교체한다.

```ts
export const SUGGESTED_SITUATIONS: SuggestedSituation[] = [
  { label: '과제 참고자료 다시 찾기', query: '과제 참고자료 다시 찾기' },
  { label: '프로젝트에 쓸 자료 꺼내기', query: '프로젝트에 쓸 자료 꺼내기' },
  { label: '공모전 아이디어 발전시키기', query: '공모전 아이디어 발전시키기' },
  { label: '여행·취미 계획 다시 이어가기', query: '여행 취미 계획 다시 이어가기' },
  { label: '디자인·개발 레퍼런스 찾기', query: '디자인 개발 레퍼런스 찾기' },
  { label: '저장해둔 영상 골라보기', query: '저장한 영상 골라보기' },
];
```

표시 label은 자연스러운 문구를 유지하고 query의 가운데점은 검색 토큰 경계로 단순화한다.

- [ ] **Step 4: 검색 패널 컴포넌트 구현**

`retrieve_search_panel.tsx`는 다음 props만 받는다.

```ts
export type RetrieveSearchPanelProps = {
  onClearQuery: () => void;
  onQueryChange: (value: string) => void;
  onRetrieve: (event: FormEvent<HTMLFormElement>) => void;
  onSituationClick: (situation: SuggestedSituation) => void;
  query: string;
  selectedSituation: string;
  situations: SuggestedSituation[];
};
```

전체 JSX는 `꺼내보기` kicker, 제목, visible label, `ClearableTextField`, `꺼내보기` submit button, ChoiceChip 목록과 고정 도움말 순서로 구성한다. `ClearableTextField`에는 `clearLabel="입력 지우기"`와 `onClear={onClearQuery}`를 전달한다. ChoiceChip의 화면 label은 그대로 사용하고 접근 가능한 이름에 불필요한 `상황으로 꺼내보기` 접미사를 붙이지 않는다.

- [ ] **Step 5: 결과 컴포넌트 구현**

`retrieve_results.tsx`는 빈 제출 query면 `null`을 반환한다. 결과가 있으면 다음 구조를 사용한다.

```tsx
<section className="home-page__results" aria-labelledby="home-results-title">
  <div className="home-page__results-heading">
    <h2 id="home-results-title">현재 상황과 연결된 인사이트</h2>
    <p aria-live="polite" className="home-page__results-status" role="status">
      “{submittedQuery}” 결과 {results.length}개
    </p>
  </div>
  <InsightGrid insights={results.map(({ insight }) => insight)} />
</section>
```

결과 없음 EmptyState 제목은 `“${submittedQuery}” 결과가 없어요`, 설명은 `입력은 그대로 두었어요. 단어를 줄이거나 다른 상황을 선택해보세요.`로 한다. 보관함 보기 행동은 유지한다.

- [ ] **Step 6: HomePage를 상태 조합 컴포넌트로 축소**

`HomePage`는 항상 `RetrieveSearchPanel`을 먼저 렌더링하고, 그 아래에서 loading, unavailable, empty library, `RetrieveResults` 중 하나를 선택한다. 제출 query가 없고 library가 ready이면 추가 초기 안내 영역을 렌더링하지 않는다.

- [ ] **Step 7: workspace 초기화 handler 구현**

`authenticated_workspace.tsx`에 다음 함수를 추가해 HomePage로 전달한다.

```ts
function handleRetrieveClear() {
  setRetrieveQuery('');
  setSubmittedRetrieveQuery('');
  setSelectedSituation('');
}
```

기존 직접 입력은 제출 전까지 이전 결과를 유지하고, 명시적인 × 초기화만 결과를 즉시 비운다. 예시 선택은 지금처럼 입력과 제출 query를 동시에 갱신한다.

- [ ] **Step 8: 홈과 workspace 테스트 통과 확인**

Run: `npm test -- src/pages/home/ui/home_page.test.tsx src/app/authenticated_workspace.test.tsx`

Expected: PASS with no `작업팩`, connection clue or old suggestion assertions.

- [ ] **Step 9: 커밋**

```bash
git add src/pages/home/ui src/app/model/workspace_seed.ts src/app/authenticated_workspace.tsx src/app/authenticated_workspace.test.tsx
git commit -m "feat: 설문 기반 꺼내보기 흐름 개선"
```

### Task 5: 홈·보관함의 시각적 중앙 정렬

**Files:**
- Modify: `src/pages/home/ui/home_page.css`
- Modify: `src/pages/home/ui/home_page.test.tsx`
- Modify: `src/pages/library/ui/library_page.css`
- Modify: `src/pages/library/ui/library_page.test.tsx`

- [ ] **Step 1: 중앙 정렬 CSS 계약 실패 테스트 작성**

각 page 테스트에서 CSS를 읽어 다음 규칙을 확인한다.

```ts
expect(getCssRule(homeStyles, '.home-page__hero')).toContain(
  'margin-inline: auto;'
);
expect(getCssRule(homeStyles, '.home-page__hero')).toContain(
  'text-align: center;'
);
expect(getCssRule(libraryStyles, '.library-page__header')).toContain(
  'margin-inline: auto;'
);
expect(getCssRule(libraryStyles, '.library-page__work-area')).toContain(
  'width: min(820px, 100%);'
);
```

library helper는 home test의 `getCssRule`과 같은 구현을 파일 아래에 둔다.

- [ ] **Step 2: CSS 계약 테스트 실패 확인**

Run: `npm test -- src/pages/home/ui/home_page.test.tsx src/pages/library/ui/library_page.test.tsx`

Expected: FAIL because the hero and library tools are still left anchored.

- [ ] **Step 3: 홈의 중앙 검색 열과 넓은 결과 영역 구현**

`home_page.css`에서 다음 핵심 규칙을 적용한다.

```css
.home-page__hero {
  display: grid;
  width: min(820px, 100%);
  margin-inline: auto;
  justify-items: center;
  text-align: center;
}

.home-page__search {
  width: 100%;
  text-align: left;
}

.home-page__suggestions {
  display: grid;
  width: 100%;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}
```

search row는 input과 CTA가 한 중심축에서 읽히도록 유지하고, 결과 영역은 shell의 전체 content width를 사용한다. 767px 이하에서는 suggestion을 1열, CTA를 전체 너비로 둔다. 중간 breakpoint가 필요하면 2열을 추가하되 raw pixel spacing 대신 token을 사용한다.

- [ ] **Step 4: 보관함의 중앙 도구 열과 넓은 카드 그리드 구현**

`LibraryPage`의 header와 work area에 같은 제한 너비를 준다. CSS 핵심 계약은 다음과 같다.

```css
.library-page__header,
.library-page__work-area {
  width: min(820px, 100%);
  margin-inline: auto;
}

.library-page__header {
  text-align: center;
}

.library-page__filter {
  justify-items: center;
}

.library-page__search {
  width: 100%;
  max-width: none;
  text-align: left;
}
```

카드 목록 `.library-page__content`는 제한 너비를 적용하지 않는다. 모바일에서 header count와 제목이 겹치지 않도록 세로 배치한다.

- [ ] **Step 5: page CSS 계약과 UI 상태 테스트 실행**

Run: `npm test -- src/pages/home/ui/home_page.test.tsx src/pages/library/ui/library_page.test.tsx`

Expected: PASS.

Run: `npm test -- src/entities/insight/ui/insight_grid.test.tsx`

Expected: PASS.

- [ ] **Step 6: 커밋**

```bash
git add src/pages/home/ui/home_page.css src/pages/home/ui/home_page.test.tsx src/pages/library/ui/library_page.css src/pages/library/ui/library_page.test.tsx
git commit -m "style: 홈·보관함 중앙 레이아웃 정렬"
```

### Task 6: 전체 회귀 검증과 문서 일치 확인

**Files:**
- Modify if needed: files already changed in Tasks 1-5 only

- [ ] **Step 1: 관련 테스트 전체 실행**

Run:

```bash
npm test -- src/entities/insight/model/retrieve_insights.test.ts src/entities/insight/ui/insight_grid.test.tsx src/shared/ui/text-field/text_field.test.tsx src/pages/home/ui/home_page.test.tsx src/pages/library/ui/library_page.test.tsx src/app/authenticated_workspace.test.tsx
```

Expected: PASS.

- [ ] **Step 2: Windows 줄바꿈 민감 테스트를 제외한 전체 회귀 실행**

Run: `npm test -- --exclude server/supabase_migration_ci.test.ts`

Expected: all included test files PASS. 제외 이유는 기준선에서 확인한 CRLF-only failure이며 이번 변경 파일과 관련이 없다.

- [ ] **Step 3: 정적 검사와 프로덕션 빌드 실행**

Run: `npm run lint`

Expected: PASS.

Run: `npm run format:check`

Expected: PASS.

Run: `npm run build:web`

Expected: PASS and client bundle verification succeeds.

- [ ] **Step 4: 사용자 문구와 제거 항목 정적 검색**

Run:

```bash
rg -n "작업팩|connectionClue|insight-card__thumbnail|insight-card__connection-clue|이런 상황에서 시작해보세요|개인 인사이트 저장소입니다" src CONTEXT.md docs/retrieve.md docs/discussion.md
```

Expected: no active runtime or active-document matches. 테스트 이름이나 역사 문서가 아니라 이번 검색 범위에서는 출력이 없어야 한다.

- [ ] **Step 5: diff와 작업 트리 확인**

Run: `git diff --check`

Expected: no output.

Run: `git status --short`

Expected: only intentional files, or empty after prior commits.
