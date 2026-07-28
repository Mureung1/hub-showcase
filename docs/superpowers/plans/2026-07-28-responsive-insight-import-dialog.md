# Responsive Insight Import Dialog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 가져오기 대화상자의 소스 선택을 Desktop·Tablet 왼쪽 레일과 Mobile 상단 탭으로 재배치하고, 활성 소스 오류와 단계별 주요 행동을 작업 문맥 안에 고정한다.

**Architecture:** `InsightImportDialog`의 기존 controller와 Notion hook을 상태의 단일 원천으로 유지한다. 소스 선택 마크업만 feature 내부의 작은 named component로 분리하고, 같은 DOM을 CSS media query로 왼쪽 레일 또는 상단 탭으로 배치한다. 공유 `Modal`은 수정하지 않고 이미 제공하는 `footer` 슬롯과 feature class를 사용해 본문 스크롤과 단계별 하단 행동을 분리한다.

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library, WDS adapter through `@/shared/ui`, CSS custom properties from `DESIGN.md`

---

## 실행 전 확인

- 작업 이슈: [#86](https://github.com/ppre1ude/hub/issues/86)
- 작업 브랜치: `style/86-responsive-import-dialog`
- 작업 트리: `C:\hub\.worktrees\issue-86`
- 승인 설계: `docs/superpowers/specs/2026-07-28-responsive-insight-import-dialog-design.md`
- 필수 기준: `AGENTS.md`, `DESIGN.md`, `docs/**/*.md`
- 후속 문구 작업: [#87](https://github.com/ppre1ude/hub/issues/87). 이번 계획에서는 기존 문구를 개정하지 않는다.

테스트를 실행하는 PowerShell 프로세스에는 기존 로컬 공개 설정을 값 출력 없이 주입한다.

```powershell
$envFile = 'C:\hub\.env.local'
Get-Content -Encoding UTF8 -LiteralPath $envFile |
  Where-Object { $_ -match '^\s*[A-Za-z_][A-Za-z0-9_]*\s*=' } |
  ForEach-Object {
    $parts = $_ -split '=', 2
    $name = $parts[0].Trim()
    $value = $parts[1].Trim()
    if (
      ($value.StartsWith('"') -and $value.EndsWith('"')) -or
      ($value.StartsWith("'") -and $value.EndsWith("'"))
    ) {
      $value = $value.Substring(1, $value.Length - 2)
    }
    [Environment]::SetEnvironmentVariable($name, $value, 'Process')
  }
```

## 파일 구조

- Create: `src/features/insight-import/ui/insight_import_source_selector.tsx`
  - 소스 종류, 접근 가능한 이름과 반응형으로 재배치할 단일 선택기 DOM을 소유한다.
- Modify: `src/features/insight-import/ui/insight_import_dialog.tsx`
  - 기존 상태를 선택기, 활성 소스 패널, 단일 단계 본문과 footer에 조합한다.
- Modify: `src/features/insight-import/ui/import_field_mapping.tsx`
  - 대화상자 footer의 외부 submit 버튼이 기존 form을 제출할 수 있는 opt-in 계약을 제공한다.
- Modify: `src/features/insight-import/ui/insight_import_dialog.css`
  - Desktop·Tablet 레일, Mobile 전체 화면·상단 탭, 스크롤 영역과 고정 footer를 정의한다.
- Modify: `src/features/insight-import/ui/insight_import_dialog.test.tsx`
  - 선택 상태, 오류 문맥, 잠금, footer와 기존 종단 간 흐름을 검증한다.
- Modify: `src/features/insight-import/ui/import_field_mapping.test.tsx`
  - 외부 submit 버튼 계약과 기존 기본 submit 버튼 호환을 검증한다.
- Modify: `src/features/insight-import/ui/insight_import_dialog_contract.test.ts`
  - 반응형 구조, design token과 금지 시각 효과를 정적 계약으로 검증한다.

### Task 1: 접근 가능한 소스 선택기 분리

**Files:**

- Create: `src/features/insight-import/ui/insight_import_source_selector.tsx`
- Modify: `src/features/insight-import/ui/insight_import_dialog.tsx:104-106,204-229`
- Test: `src/features/insight-import/ui/insight_import_dialog.test.tsx:2,56`

- [ ] **Step 1: 소스 선택 그룹과 선택 상태의 실패 테스트 작성**

`insight_import_dialog.test.tsx`의 Testing Library import에 `within`을 추가하고 다음 테스트를 `describe` 첫 부분에 넣는다.

```tsx
import {
  act,
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
```

```tsx
it('가져올 위치를 하나의 선택 그룹으로 제공한다', async () => {
  const user = userEvent.setup();
  renderDialog({ service: createService() });

  const sourceGroup = screen.getByRole('group', { name: '가져올 위치' });
  const fileButton = within(sourceGroup).getByRole('button', {
    name: '파일에서 가져오기',
  });
  const notionButton = within(sourceGroup).getByRole('button', {
    name: 'Notion에서 가져오기',
  });
  const pasteButton = within(sourceGroup).getByRole('button', {
    name: '링크 붙여넣기',
  });

  expect(fileButton.textContent).toBe('파일');
  expect(notionButton.textContent).toBe('Notion');
  expect(pasteButton.textContent).toBe('링크');
  expect(fileButton.getAttribute('aria-pressed')).toBe('false');

  await user.click(fileButton);

  expect(fileButton.getAttribute('aria-pressed')).toBe('true');
  expect(notionButton.getAttribute('aria-pressed')).toBe('false');
  expect(pasteButton.getAttribute('aria-pressed')).toBe('false');
});
```

- [ ] **Step 2: 선택기 테스트가 기존 독립 버튼 구조에서 실패하는지 확인**

Run:

```powershell
npm test -- src/features/insight-import/ui/insight_import_dialog.test.tsx -t "가져올 위치를 하나의 선택 그룹으로 제공한다"
```

Expected: `가져올 위치` group을 찾지 못하거나 버튼의 visible text가 기존 긴 문구여서 FAIL.

- [ ] **Step 3: 단일 DOM을 사용하는 source selector 구현**

`insight_import_source_selector.tsx`를 다음 내용으로 만든다.

```tsx
import { Button } from '@/shared/ui';

export type InsightImportSource = 'file' | 'notion' | 'paste';

export const INSIGHT_IMPORT_SOURCE_LABELS = {
  file: '파일에서 가져오기',
  notion: 'Notion에서 가져오기',
  paste: '링크 붙여넣기',
} as const satisfies Record<InsightImportSource, string>;

const SOURCE_OPTIONS = [
  { label: '파일', value: 'file' },
  { label: 'Notion', value: 'notion' },
  { label: '링크', value: 'paste' },
] as const satisfies readonly {
  label: string;
  value: InsightImportSource;
}[];

export type InsightImportSourceSelectorProps = {
  disabled: boolean;
  onSelect: (source: InsightImportSource) => void;
  selected: InsightImportSource | null;
};

export function InsightImportSourceSelector({
  disabled,
  onSelect,
  selected,
}: InsightImportSourceSelectorProps) {
  return (
    <div
      aria-label="가져올 위치"
      className="insight-import-dialog__source-navigation"
      role="group"
    >
      <span className="insight-import-dialog__source-navigation-label">
        가져올 위치
      </span>
      {SOURCE_OPTIONS.map(({ label, value }) => (
        <Button
          aria-label={INSIGHT_IMPORT_SOURCE_LABELS[value]}
          aria-pressed={selected === value}
          className="insight-import-dialog__source-option"
          disabled={disabled}
          hierarchy="ghost"
          key={value}
          onClick={() => onSelect(value)}
          type="button"
        >
          {label}
        </Button>
      ))}
    </div>
  );
}
```

`insight_import_dialog.tsx`에서 기존 inline union을 새 type으로 바꾸고 세 Button을 selector로 교체한다.

```tsx
import {
  INSIGHT_IMPORT_SOURCE_LABELS,
  InsightImportSourceSelector,
  type InsightImportSource,
} from './insight_import_source_selector';
```

```tsx
const [sourceSelected, setSourceSelected] =
  useState<InsightImportSource | null>(
    initialNotionConnectionId || initialNotionError ? 'notion' : null
  );
```

```tsx
<InsightImportSourceSelector
  disabled={false}
  onSelect={setSourceSelected}
  selected={sourceSelected}
/>
```

- [ ] **Step 4: 선택기와 기존 가져오기 흐름 테스트 통과 확인**

Run:

```powershell
npm test -- src/features/insight-import/ui/insight_import_dialog.test.tsx
```

Expected: 새 선택 그룹 테스트와 기존 파일·링크·Notion 테스트 모두 PASS.

- [ ] **Step 5: 소스 선택기 구조 커밋**

```powershell
git add src/features/insight-import/ui/insight_import_source_selector.tsx src/features/insight-import/ui/insight_import_dialog.tsx src/features/insight-import/ui/insight_import_dialog.test.tsx
git commit -m "feat: 가져오기 소스 선택 레일 구조"
```

### Task 2: 활성 소스 작업 패널과 오류 문맥 구성

**Files:**

- Modify: `src/features/insight-import/ui/insight_import_dialog.tsx:104-182,193-347`
- Test: `src/features/insight-import/ui/insight_import_dialog.test.tsx:195-231`

- [ ] **Step 1: 분석 잠금과 오류 위치의 실패 테스트 작성**

기존 `분석 중 액션을 비활성화하고 안전한 오류를 alert로 알린다` 테스트에 다음 검증을 추가한다.

```tsx
const sourceGroup = screen.getByRole('group', { name: '가져올 위치' });
const sourceButtons = within(sourceGroup).getAllByRole('button');

expect(
  sourceButtons.every((button) => (button as HTMLButtonElement).disabled)
).toBe(true);
```

오류가 resolve된 뒤 기존 alert 검증을 다음처럼 활성 panel 기준으로 강화한다.

```tsx
const pastePanel = screen.getByRole('region', {
  name: '링크 붙여넣기',
});
const alert = await within(pastePanel).findByRole('alert', {
  name: '가져오기를 진행하지 못했어요',
});
expect(alert.textContent).not.toContain('https://example.com');
```

같은 테스트 끝에 다른 소스로 바꿨을 때 이전 오류가 잘못 따라오지 않는지 추가한다.

```tsx
await user.click(
  within(sourceGroup).getByRole('button', {
    name: '파일에서 가져오기',
  })
);

expect(
  screen.queryByRole('alert', {
    name: '가져오기를 진행하지 못했어요',
  })
).toBeNull();

await user.click(
  within(sourceGroup).getByRole('button', {
    name: '링크 붙여넣기',
  })
);

expect(
  (
    screen.getByRole('textbox', {
      name: '가져올 링크',
    }) as HTMLTextAreaElement
  ).value
).toBe('https://example.com');
```

- [ ] **Step 2: 기존 구조가 source 잠금과 panel 오류 조건을 만족하지 못하는지 확인**

Run:

```powershell
npm test -- src/features/insight-import/ui/insight_import_dialog.test.tsx -t "분석 중 액션을 비활성화하고 안전한 오류를 alert로 알린다"
```

Expected: source buttons가 활성 상태이거나 `링크 붙여넣기` region을 찾지 못해 FAIL.

- [ ] **Step 3: 오류 소스와 source 잠금 파생 상태 추가**

`InsightImportDialog`의 local state와 분석 함수에 다음 상태를 추가한다.

```tsx
const [controllerErrorSource, setControllerErrorSource] = useState<Exclude<
  InsightImportSource,
  'notion'
> | null>(null);
```

```tsx
async function analyze() {
  setControllerErrorSource('paste');
  await controller.analyzePastedText(pastedText);
}

async function analyzeFile(file: File | undefined) {
  if (file) {
    setControllerErrorSource('file');
    await controller.analyzeFile(file);
  }
}
```

닫기와 `resetSource`에서 `setControllerErrorSource(null)`을 호출한다. 렌더 직전에는 다음 파생 값을 둔다.

```tsx
const isSourceLocked =
  controller.stage === 'analyzing' ||
  ['connecting', 'analyzing', 'mapping'].includes(notion.stage);
const sourceHeadingId = sourceSelected
  ? `insight-import-${sourceSelected}-title`
  : undefined;
```

- [ ] **Step 4: source stage를 navigation과 scrollable panel로 재조합**

기존 전역 StatusMessage 두 개와 `insight-import-dialog__source` block을 제거하고 source stage를 다음 구조로 바꾼다. 파일 input, TextArea, Notion checkbox·진행 상태·mapping form과 `ImportHistory`의 기존 props와 문구는 그대로 이 구조 안으로 이동한다.

```tsx
{
  isSourceStage ? (
    <div className="insight-import-dialog__stage insight-import-dialog__stage--source">
      <InsightImportSourceSelector
        disabled={isSourceLocked}
        onSelect={setSourceSelected}
        selected={sourceSelected}
      />

      <section
        aria-label={sourceSelected ? undefined : '가져오기 작업'}
        aria-labelledby={sourceHeadingId}
        className="insight-import-dialog__source-panel"
      >
        {sourceSelected ? (
          <h3 id={sourceHeadingId}>
            {INSIGHT_IMPORT_SOURCE_LABELS[sourceSelected]}
          </h3>
        ) : (
          <p className="insight-import-dialog__source-prompt">
            가져올 위치를 선택해 주세요.
          </p>
        )}

        {controller.errorMessage && controllerErrorSource === sourceSelected ? (
          <StatusMessage title="가져오기를 진행하지 못했어요" variant="error">
            {controller.errorMessage}
          </StatusMessage>
        ) : null}

        {sourceSelected === 'notion' && notion.errorMessage ? (
          <StatusMessage title="Notion 연결을 확인해 주세요" variant="error">
            {notion.errorMessage}
          </StatusMessage>
        ) : null}

        {sourceSelected === 'file' ? (
          <div className="insight-import-dialog__file">
            <label htmlFor="insight-import-file">가져올 파일</label>
            <input
              accept=".csv,.json,.html,.htm,.md,.markdown,.txt,.zip"
              aria-describedby="insight-import-file-help"
              disabled={controller.stage === 'analyzing'}
              id="insight-import-file"
              onChange={(event) =>
                void analyzeFile(event.currentTarget.files?.[0])
              }
              type="file"
            />
            <p id="insight-import-file-help">
              CSV, JSON, HTML, Markdown, 텍스트, ZIP을 지원합니다. 원본 파일은
              서버에 업로드하지 않으며, 일반 파일은 10 MiB, ZIP은 20 MiB까지
              선택할 수 있습니다.
            </p>
          </div>
        ) : null}

        {sourceSelected === 'paste' ? (
          <div className="insight-import-dialog__paste">
            <label htmlFor="insight-import-pasted-text">가져올 링크</label>
            <TextArea
              disabled={controller.stage === 'analyzing'}
              id="insight-import-pasted-text"
              onChange={(event) => setPastedText(event.currentTarget.value)}
              rows={7}
              value={pastedText}
            />
            <Button
              disabled={
                controller.stage === 'analyzing' ||
                pastedText.trim().length === 0
              }
              hierarchy="primary"
              onClick={() => void analyze()}
              type="button"
            >
              {controller.stage === 'analyzing' ? '분석 중' : '분석하기'}
            </Button>
          </div>
        ) : null}

        {sourceSelected === 'notion' ? (
          <div className="insight-import-dialog__notion">
            <p>
              Notion 공식 화면에서 가져올 페이지를 직접 선택합니다. 읽기 권한만
              사용하고 가져오기가 끝나면 연결을 해제합니다.
            </p>

            {notion.stage === 'idle' || notion.stage === 'error' ? (
              <>
                <label className="insight-import-dialog__notion-checkbox">
                  <input
                    checked={includeNotionPageUrls}
                    onChange={(event) =>
                      setIncludeNotionPageUrls(event.currentTarget.checked)
                    }
                    type="checkbox"
                  />
                  Notion 페이지 자체 주소도 가져오기
                </label>
                <p>
                  Notion 안에 저장한 외부 링크가 아니라 선택한 페이지도 원문으로
                  보관할 때만 사용합니다.
                </p>
                <Button
                  hierarchy="primary"
                  onClick={() => void notion.start(includeNotionPageUrls)}
                  type="button"
                >
                  Notion 연결하기
                </Button>
              </>
            ) : null}

            {notion.stage === 'connecting' || notion.stage === 'analyzing' ? (
              <section aria-live="polite" role="status">
                <strong>
                  {notion.workspaceName ?? 'Notion 작업 공간'} 분석 중
                </strong>
                <p>
                  완료한 요청 {notion.requestCount}개 · 후보{' '}
                  {notion.candidateCount}개
                </p>
                <Button
                  hierarchy="secondary"
                  onClick={() => void notion.cancel()}
                  type="button"
                >
                  연결 취소
                </Button>
              </section>
            ) : null}

            {notion.stage === 'mapping' ? (
              <NotionFieldMappingForm
                onSubmit={(mappings) => void notion.submitMappings(mappings)}
                requests={notion.mappingRequests}
              />
            ) : null}
          </div>
        ) : null}

        {notion.stage === 'idle' || notion.stage === 'error' ? (
          <ImportHistory
            entries={controller.history}
            errorMessage={controller.historyErrorMessage}
            loading={controller.isHistoryLoading}
            onDelete={controller.deleteRecord}
            onUndo={controller.undo}
          />
        ) : null}
      </section>
    </div>
  ) : null;
}
```

분석 이후 단계는 다음처럼 정확히 한 개의 scroll stage를 갖게 바꾼다.

- Preview 조건문의 fragment를 `className="insight-import-dialog__stage insight-import-dialog__stage--single"`인 `div`로 교체한다.
- Generic field mapping 조건문의 fragment도 같은 두 class를 가진 `div`로 교체한다.
- Result의 기존 `insight-import-dialog__result` div에 `insight-import-dialog__stage insight-import-dialog__stage--single` 두 class를 추가한다.

- [ ] **Step 5: source panel 테스트와 전체 dialog 테스트 통과 확인**

Run:

```powershell
npm test -- src/features/insight-import/ui/insight_import_dialog.test.tsx
```

Expected: 10개 dialog 테스트 모두 PASS.

- [ ] **Step 6: 작업 패널과 오류 문맥 커밋**

```powershell
git add src/features/insight-import/ui/insight_import_dialog.tsx src/features/insight-import/ui/insight_import_dialog.test.tsx
git commit -m "feat: 가져오기 작업 패널과 오류 문맥 정리"
```

### Task 3: 단계별 주요 행동을 Modal footer로 이동

**Files:**

- Modify: `src/features/insight-import/ui/import_field_mapping.tsx:11-75`
- Modify: `src/features/insight-import/ui/insight_import_dialog.tsx:38-475,477-592`
- Test: `src/features/insight-import/ui/import_field_mapping.test.tsx:39-117`
- Test: `src/features/insight-import/ui/insight_import_dialog.test.tsx:93-193,334-411`

- [ ] **Step 1: 외부 submit과 footer 위치의 실패 테스트 작성**

`import_field_mapping.test.tsx`에 다음 테스트를 추가한다.

```tsx
it('대화상자 footer의 외부 버튼으로 form을 제출한다', async () => {
  const user = userEvent.setup();
  const onSubmit = vi.fn();
  const requests: ImportFieldMappingRequest[] = [
    {
      fields: ['url'],
      sourceKey: 'file.csv',
      suggested: {
        memoField: null,
        sourceKey: 'file.csv',
        titleField: null,
        urlField: 'url',
      },
    },
  ];

  render(
    <DesignSystemProvider>
      <ImportFieldMappingForm
        formId="import-field-mapping-form"
        onSubmit={onSubmit}
        requests={requests}
        showSubmitButton={false}
      />
      <button form="import-field-mapping-form" type="submit">
        외부 계속
      </button>
    </DesignSystemProvider>
  );

  expect(screen.queryByRole('button', { name: '계속' })).toBeNull();

  await user.click(screen.getByRole('button', { name: '외부 계속' }));

  expect(onSubmit).toHaveBeenCalledWith([
    {
      memoField: null,
      sourceKey: 'file.csv',
      titleField: null,
      urlField: 'url',
    },
  ]);
});
```

기존 링크 종단 간 테스트에는 다음 footer 위치 검증을 추가한다.

```tsx
expect(analyzeButton.closest('.ui-modal__footer')).toBeTruthy();
```

미리보기 진입 뒤에는 다음을 추가한다.

```tsx
expect(
  screen.getByRole('button', { name: '가져오기' }).closest('.ui-modal__footer')
).toBeTruthy();
```

결과 진입 뒤에는 다음을 추가한다.

```tsx
expect(
  screen.getByRole('button', { name: '완료' }).closest('.ui-modal__footer')
).toBeTruthy();
```

- [ ] **Step 2: footer 계약 테스트가 실패하는지 확인**

Run:

```powershell
npm test -- src/features/insight-import/ui/import_field_mapping.test.tsx src/features/insight-import/ui/insight_import_dialog.test.tsx
```

Expected: 새 props type 오류 또는 외부 submit 미지원, 기존 action이 content에 있어 FAIL.

- [ ] **Step 3: generic field mapping에 외부 submit opt-in 추가**

`ImportFieldMappingProps`와 form·submit 렌더를 다음처럼 확장한다.

```tsx
export type ImportFieldMappingProps = {
  disabled?: boolean;
  formId?: string;
  onSubmit: (mappings: ImportFieldMappingValue[]) => void;
  requests: readonly ImportFieldMappingRequest[];
  showSubmitButton?: boolean;
};
```

```tsx
function ImportFieldMappingFields({
  disabled = false,
  formId,
  onSubmit,
  requests,
  showSubmitButton = true,
}: ImportFieldMappingProps) {
```

```tsx
<form
  className="insight-import-dialog__field-mapping"
  id={formId}
  onSubmit={submit}
>
```

기존 form 마지막 submit 버튼을 다음 조건으로 감싼다.

```tsx
{
  showSubmitButton ? (
    <Button disabled={disabled} hierarchy="primary" type="submit">
      계속
    </Button>
  ) : null;
}
```

- [ ] **Step 4: dialog 단계별 footer 함수 구현**

`insight_import_dialog.tsx` 상단에 form ID를 추가한다.

```tsx
const IMPORT_FIELD_MAPPING_FORM_ID = 'insight-import-field-mapping-form';
const NOTION_FIELD_MAPPING_FORM_ID = 'insight-import-notion-field-mapping-form';
```

`InsightImportDialog` 안에 다음 footer renderer를 추가하고 `Modal`에 `footer={renderDialogFooter()}`를 전달한다.

```tsx
function renderDialogFooter() {
  if (isPreviewStage && controller.prepared) {
    return (
      <>
        <Button hierarchy="ghost" onClick={resetSource} type="button">
          다시 선택
        </Button>
        <Button
          disabled={
            controller.stage === 'committing' ||
            !controller.canCommit ||
            invalidNewCategory
          }
          hierarchy="primary"
          onClick={() => void controller.commit()}
          type="button"
        >
          {controller.stage === 'committing' ? '가져오는 중' : '가져오기'}
        </Button>
      </>
    );
  }

  if (controller.stage === 'field-mapping') {
    return (
      <>
        <Button hierarchy="ghost" onClick={resetSource} type="button">
          다시 선택
        </Button>
        <Button
          form={IMPORT_FIELD_MAPPING_FORM_ID}
          hierarchy="primary"
          type="submit"
        >
          계속
        </Button>
      </>
    );
  }

  if (
    controller.stage === 'result' &&
    controller.prepared &&
    controller.result
  ) {
    return (
      <>
        <Button hierarchy="ghost" onClick={resetSource} type="button">
          다른 링크 가져오기
        </Button>
        <Button
          hierarchy="primary"
          onClick={() => handleOpenChange(false)}
          type="button"
        >
          완료
        </Button>
      </>
    );
  }

  if (!isSourceStage) {
    return null;
  }

  const closeButton = (
    <Button
      hierarchy="ghost"
      onClick={() => handleOpenChange(false)}
      type="button"
    >
      취소
    </Button>
  );

  if (controller.stage === 'analyzing') {
    return (
      <>
        {closeButton}
        <Button disabled hierarchy="primary" type="button">
          분석 중
        </Button>
      </>
    );
  }

  if (sourceSelected === 'paste') {
    return (
      <>
        {closeButton}
        <Button
          disabled={pastedText.trim().length === 0}
          hierarchy="primary"
          onClick={() => void analyze()}
          type="button"
        >
          분석하기
        </Button>
      </>
    );
  }

  if (sourceSelected === 'notion') {
    if (notion.stage === 'idle' || notion.stage === 'error') {
      return (
        <>
          {closeButton}
          <Button
            hierarchy="primary"
            onClick={() => void notion.start(includeNotionPageUrls)}
            type="button"
          >
            Notion 연결하기
          </Button>
        </>
      );
    }

    if (notion.stage === 'mapping') {
      return (
        <>
          <Button
            hierarchy="ghost"
            onClick={() => void notion.cancel()}
            type="button"
          >
            연결 취소
          </Button>
          <Button
            form={NOTION_FIELD_MAPPING_FORM_ID}
            hierarchy="primary"
            type="submit"
          >
            계속
          </Button>
        </>
      );
    }

    if (notion.stage === 'connecting' || notion.stage === 'analyzing') {
      return (
        <Button
          hierarchy="secondary"
          onClick={() => void notion.cancel()}
          type="button"
        >
          연결 취소
        </Button>
      );
    }
  }

  return closeButton;
}
```

source panel의 `분석하기`, `Notion 연결하기`, `연결 취소`, preview·generic mapping·result의 `insight-import-dialog__actions` block을 제거한다. 입력, 진행 상태와 Undo 확인 행동은 본문에 유지한다.

- [ ] **Step 5: 두 field mapping form을 footer submit과 연결**

generic mapping 사용부를 다음처럼 바꾼다.

```tsx
<ImportFieldMappingForm
  formId={IMPORT_FIELD_MAPPING_FORM_ID}
  onSubmit={(mappings) => void controller.submitFieldMappings(mappings)}
  requests={controller.fieldMappingRequests}
  showSubmitButton={false}
/>
```

내부 Notion mapping wrapper와 fields props에 `formId: string`을 추가하고 form에 ID를 연결한다.

```tsx
function NotionFieldMappingForm({
  formId,
  ...props
}: {
  formId: string;
  onSubmit: (mappings: NotionFieldMapping[]) => void;
  requests: NotionFieldMappingRequest[];
}) {
  return (
    <NotionFieldMappingFields
      formId={formId}
      key={JSON.stringify(props.requests)}
      {...props}
    />
  );
}
```

```tsx
function NotionFieldMappingFields({
  formId,
  onSubmit,
  requests,
}: {
  formId: string;
  onSubmit: (mappings: NotionFieldMapping[]) => void;
  requests: NotionFieldMappingRequest[];
}) {
```

```tsx
<form
  className="insight-import-dialog__field-mapping"
  id={formId}
  onSubmit={(event) => {
    event.preventDefault();
    onSubmit(mappings);
  }}
>
```

Notion form 내부의 `계속` Button은 제거하고 사용부에 form ID를 전달한다.

```tsx
<NotionFieldMappingForm
  formId={NOTION_FIELD_MAPPING_FORM_ID}
  onSubmit={(mappings) => void notion.submitMappings(mappings)}
  requests={notion.mappingRequests}
/>
```

- [ ] **Step 6: footer와 전체 행동 회귀 테스트 통과 확인**

Run:

```powershell
npm test -- src/features/insight-import/ui/import_field_mapping.test.tsx src/features/insight-import/ui/insight_import_dialog.test.tsx
```

Expected: field mapping 3개와 dialog 10개 테스트 모두 PASS.

- [ ] **Step 7: footer 행동 커밋**

```powershell
git add src/features/insight-import/ui/import_field_mapping.tsx src/features/insight-import/ui/import_field_mapping.test.tsx src/features/insight-import/ui/insight_import_dialog.tsx src/features/insight-import/ui/insight_import_dialog.test.tsx
git commit -m "feat: 가져오기 단계별 하단 액션 고정"
```

### Task 4: Desktop 레일과 Mobile 전체 화면 CSS 구현

**Files:**

- Modify: `src/features/insight-import/ui/insight_import_dialog.css:1-289`
- Modify: `src/features/insight-import/ui/insight_import_dialog_contract.test.ts:20-37`

- [ ] **Step 1: 반응형 구조와 token 사용의 실패 계약 작성**

기존 두 번째 contract test를 다음 내용으로 바꾼다.

```ts
it('Desktop source rail과 Mobile 전체 화면 계약을 지킨다', () => {
  const css = readFileSync(
    resolve(UI_DIRECTORY, 'insight_import_dialog.css'),
    'utf8'
  );

  expect(css).toMatch(
    /grid-template-columns:\s*calc\(var\(--spacing-20\) \+ var\(--spacing-20\)\)\s*minmax\(0, 1fr\)/iu
  );
  expect(css).toContain('.insight-import-dialog__source-navigation');
  expect(css).toContain('.insight-import-dialog__source-panel');
  expect(css).toContain('overflow-y: auto');
  expect(css).toContain('@media (max-width: 767px)');
  expect(css).toContain('grid-template-columns: 1fr');
  expect(css).toContain('flex-direction: row');
  expect(css).toContain('width: 100vw');
  expect(css).toContain('max-width: 100vw');
  expect(css).toContain('height: 100dvh');
  expect(css).toContain('env(safe-area-inset-bottom)');
  expect(css).toContain('border: 1px solid var(--color-ash)');
  expect(css).toContain('border-radius: var(--radius-card)');
  expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/iu);
  expect(css).not.toMatch(/box-shadow|gradient|animation/iu);
});
```

- [ ] **Step 2: 현재 CSS가 레일·전체 화면 계약에서 실패하는지 확인**

Run:

```powershell
npm test -- src/features/insight-import/ui/insight_import_dialog_contract.test.ts
```

Expected: source navigation, 100dvh와 safe-area 계약을 찾지 못해 FAIL.

- [ ] **Step 3: modal scroll shell과 Desktop source rail 스타일 추가**

`insight_import_dialog.css` 상단의 기존 `.insight-import-dialog`와 source stack 스타일을 다음 구조로 교체한다.

```css
div.insight-import-dialog[role='dialog'] {
  max-height: calc(100dvh - var(--spacing-8));
  color: var(--color-ink);
}

div.insight-import-dialog .ui-modal__content {
  display: flex;
  min-height: 0;
  overflow: hidden;
  flex: 1;
  flex-direction: column;
}

.insight-import-dialog__stage {
  min-height: 0;
  flex: 1;
}

.insight-import-dialog__stage--source {
  display: grid;
  overflow: hidden;
  border-top: 1px solid var(--color-ash);
  grid-template-columns:
    calc(var(--spacing-20) + var(--spacing-20))
    minmax(0, 1fr);
}

.insight-import-dialog__stage--single,
.insight-import-dialog__source-panel {
  overflow-y: auto;
}

.insight-import-dialog__stage--single {
  padding-top: var(--spacing-4);
}

.insight-import-dialog__source-navigation {
  display: flex;
  min-width: 0;
  padding: var(--spacing-3);
  border-right: 1px solid var(--color-ash);
  background: var(--color-mist);
  flex-direction: column;
  gap: var(--spacing-1);
}

.insight-import-dialog__source-navigation-label {
  padding: var(--spacing-2);
  color: var(--color-smoke);
  font-size: var(--typography-meta-size);
  font-weight: 700;
  line-height: var(--typography-meta-line-height);
}

button.insight-import-dialog__source-option.ui-button {
  width: 100%;
  border-color: transparent;
  justify-content: flex-start;
}

button.insight-import-dialog__source-option.ui-button[aria-pressed='true'] {
  border-color: var(--color-ash);
  background: var(--color-canvas);
  color: var(--color-ink);
  font-weight: 700;
}

.insight-import-dialog__source-panel {
  display: flex;
  min-width: 0;
  padding: var(--spacing-5);
  flex-direction: column;
  gap: var(--spacing-4);
}

.insight-import-dialog__source-panel > h3,
.insight-import-dialog__source-prompt {
  margin: 0;
}

.insight-import-dialog__source-prompt {
  color: var(--color-graphite);
}

div.insight-import-dialog .ui-modal__footer {
  flex: 0 0 auto;
  border-top: 1px solid var(--color-ash);
  background: var(--color-canvas);
}
```

기존 preview, collection, history, result, mapping과 summary 스타일은 유지한다. 더 이상 렌더하지 않는 `.insight-import-dialog__source`와 `.insight-import-dialog__actions` selector는 제거한다.

- [ ] **Step 4: Mobile 전체 화면과 상단 탭 재배치 추가**

기존 `@media (max-width: 767px)` 시작 부분에 다음 스타일을 추가한다.

```css
@media (max-width: 767px) {
  div.ui-modal.insight-import-dialog[role='dialog'] {
    width: 100vw;
    max-width: 100vw;
    height: 100dvh;
    max-height: 100dvh;
    border-radius: 0;
  }

  .insight-import-dialog__stage--source {
    grid-template-columns: 1fr;
    grid-template-rows: auto minmax(0, 1fr);
  }

  .insight-import-dialog__source-navigation {
    padding: 0;
    border-right: 0;
    border-bottom: 1px solid var(--color-ash);
    background: var(--color-canvas);
    flex-direction: row;
    gap: 0;
  }

  .insight-import-dialog__source-navigation-label {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    clip-path: inset(50%);
    white-space: nowrap;
  }

  button.insight-import-dialog__source-option.ui-button {
    min-width: 0;
    border-radius: 0;
    justify-content: center;
    flex: 1;
  }

  button.insight-import-dialog__source-option.ui-button[aria-pressed='true'] {
    border-color: transparent;
    border-bottom-color: var(--color-charcoal);
    background: var(--color-mist);
  }

  .insight-import-dialog__source-panel {
    padding: var(--spacing-4);
  }

  div.insight-import-dialog .ui-modal__footer {
    padding-bottom: max(var(--spacing-4), env(safe-area-inset-bottom));
  }

  div.insight-import-dialog .ui-modal__footer > .ui-button {
    min-width: 0;
    flex: 1;
  }
}
```

같은 media query 안의 기존 summary 2열, field mapping 1열, history·confirmation 세로 전환은 유지한다.

- [ ] **Step 5: CSS 계약과 UI 테스트 통과 확인**

Run:

```powershell
npm test -- src/features/insight-import/ui/insight_import_dialog_contract.test.ts src/features/insight-import/ui/insight_import_dialog.test.tsx src/features/insight-import/ui/import_field_mapping.test.tsx
```

Expected: contract 2개, dialog 10개, field mapping 3개 모두 PASS.

- [ ] **Step 6: CSS·TSX formatting과 lint 확인**

Run:

```powershell
npx prettier --write "src/features/insight-import/ui/insight_import_source_selector.tsx" "src/features/insight-import/ui/insight_import_dialog.tsx" "src/features/insight-import/ui/import_field_mapping.tsx" "src/features/insight-import/ui/insight_import_dialog.css" "src/features/insight-import/ui/insight_import_dialog.test.tsx" "src/features/insight-import/ui/import_field_mapping.test.tsx" "src/features/insight-import/ui/insight_import_dialog_contract.test.ts"
npm run lint
```

Expected: Prettier 완료, ESLint 0 errors.

- [ ] **Step 7: 반응형 레이아웃 커밋**

```powershell
git add src/features/insight-import/ui/insight_import_dialog.css src/features/insight-import/ui/insight_import_dialog_contract.test.ts src/features/insight-import/ui/insight_import_dialog.tsx src/features/insight-import/ui/insight_import_source_selector.tsx src/features/insight-import/ui/import_field_mapping.tsx src/features/insight-import/ui/insight_import_dialog.test.tsx src/features/insight-import/ui/import_field_mapping.test.tsx
git commit -m "style: 가져오기 대화상자 반응형 레이아웃"
```

### Task 5: 전체 회귀와 시각 QA

**Files:**

- Verify: `src/features/insight-import/ui/*`
- Verify: `src/shared/ui/modal/*`
- Update only after verification: GitHub issue `#86`

- [ ] **Step 1: 전체 자동 테스트 실행**

Run:

```powershell
npm test -- --reporter=dot
```

Expected: 134개 test files, 872개 이상의 tests, 0 failures.

- [ ] **Step 2: lint, formatting과 production build 실행**

Run:

```powershell
npm run format:check
npm run lint
npm run build
```

Expected: formatting·lint 0 errors, web·extension production build 성공, client bundle secret 검사 성공.

- [ ] **Step 3: 로컬 앱에서 네 viewport 시각 검증**

Run:

```powershell
npm run dev
```

브라우저에서 로그인한 뒤 보관함의 가져오기 대화상자를 열고 다음 viewport를 각각 확인한다.

- `1440 × 900`: 왼쪽 레일, 오른쪽 작업 panel, 고정 footer
- `768 × 1024`: 왼쪽 레일 유지, panel overflow와 긴 기록
- `390 × 844`: 전체 화면, 상단 탭, safe-area footer
- `320 × 568`: 잘림 없는 제목·오류·입력, 44px action

각 viewport에서 파일, Notion, 링크를 전환하고 다음을 확인한다.

- 선택 상태가 경계·배경·굵기와 `aria-pressed`로 전달된다.
- 오류가 활성 소스 panel 안에 있고 입력값이 유지된다.
- 분석 중 source selector가 잠긴다.
- Preview 진입 뒤 source selector가 사라지고 전체 폭을 사용한다.
- Footer의 `분석하기`, `Notion 연결하기`, `가져오기`, `완료`가 본문 스크롤과 무관하게 보인다.
- 키보드 Tab 순서가 source selector → 입력 → footer 순서이며 focus outline이 잘리지 않는다.

- [ ] **Step 4: diff 범위와 금지 변경 확인**

Run:

```powershell
git status --short
git diff origin/main...HEAD --stat
git diff origin/main...HEAD --check
git diff origin/main...HEAD -- src/features/insight-import/ui src/shared/ui/modal docs/superpowers
```

Expected:

- API, model, Supabase, Notion server와 배포 파일 변경 없음
- `src/shared/ui/modal` 변경 없음
- raw color, box-shadow, gradient와 animation 추가 없음
- #87에서 다룰 제품 문구 개정 없음

- [ ] **Step 5: 이슈에 검증 근거를 남기고 검토 상태로 전환**

[#86](https://github.com/ppre1ude/hub/issues/86)에 자동 테스트 개수, build 결과, 네 viewport와 접근성 확인 결과, 남은 제한을 댓글로 남긴다. Project Status를 `검토 중`으로 바꾸되 이슈를 닫거나 PR을 자동 병합하지 않는다.
