# 보조 화면과 핵심 화면 시각 일관성 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 넓은 보조 배경면에 인증 후 화면의 배경색 체계를 적용하고, 카테고리 표시·꺼내보기 정렬·저장 화면 이름·검색어 지우기 위치를 승인된 기준으로 맞춘다.

**Architecture:** 공용 대화상자는 넓은 배경 영역에만 카드·입력 배경색을 직접 적용하고 자식의 색상 변수는 재정의하지 않는다. 가져오기, 홈, 보관함, 저장과 공용 입력의 기존 FSD 경계 안에서 CSS와 문구만 최소 수정하며 기능·상태·데이터 흐름은 유지한다.

**Tech Stack:** React 19, TypeScript, CSS Custom Properties, WDS adapter, Vitest, Testing Library

---

## 구현 파일 구조

| 파일                                                                               | 책임                                            |
| ---------------------------------------------------------------------------------- | ----------------------------------------------- |
| `src/shared/ui/modal/modal.css`                                                    | 포털 대화상자의 넓은 외곽 배경면                |
| `src/features/insight-import/ui/insight_import_dialog.css`                         | 가져오기 선택 영역·작업 영역·Footer의 배경 구분 |
| `src/shared/ui/category-filter/category_filter.css`                                | 보관함 카테고리 색상 표시 크기                  |
| `src/pages/home/ui/home_page.css`                                                  | 꺼내보기 대표 영역의 왼쪽 정렬                  |
| `src/pages/home/ui/home_page.test.tsx`                                             | 기존 대표 영역 CSS 계약의 정렬 기준             |
| `src/pages/save/ui/save_page.tsx`                                                  | 일반·공유 저장의 작은 화면 이름                 |
| `src/pages/save/ui/save_page.test.tsx`                                             | 기존 공유 저장 테스트의 화면 이름 계약          |
| `src/shared/ui/text-field/text_field.css`                                          | 검색어 지우기 버튼 내부 정렬                    |
| `docs/superpowers/specs/2026-07-29-auxiliary-surface-visual-consistency-design.md` | 승인된 설계와 범위                              |

PWA 설치 안내는 현재 런타임이 이미 승인한 A안과 일치하므로 파일을 수정하지 않고 최종 시각 확인만 수행한다.

### Task 0: 격리 작업공간 준비와 직접 관련 테스트 기준선 확인

**Files:**

- Verify only: `package-lock.json`
- Local only: `.env.local`
- Test: `src/shared/ui/modal/modal.test.tsx`
- Test: `src/features/insight-import/ui/insight_import_dialog_contract.test.ts`
- Test: `src/pages/home/ui/home_page.test.tsx`
- Test: `src/pages/save/ui/save_page.test.tsx`
- Test: `src/shared/ui/text-field/text_field.test.tsx`

- [ ] **Step 1: 루트의 로컬 환경 설정을 작업 트리에 복사**

```powershell
Copy-Item -LiteralPath 'C:\hub\.env.local' -Destination '.env.local'
```

Expected: 작업 트리에 Git에서 무시되는 `.env.local`이 생기고 파일 내용은 출력하지 않는다.

- [ ] **Step 2: 의존성 설치**

```powershell
npm install
```

Expected: exit code 0.

- [ ] **Step 3: 설치가 추적 파일을 바꾸지 않았는지 확인**

```powershell
git status --short
```

Expected: 설계·계획 문서 외에 `package-lock.json` 등 추적 파일 변경이 없다.

- [ ] **Step 4: 직접 관련된 기존 테스트만 기준선으로 실행**

```powershell
npm test -- src/shared/ui/modal/modal.test.tsx src/features/insight-import/ui/insight_import_dialog_contract.test.ts src/pages/home/ui/home_page.test.tsx src/pages/save/ui/save_page.test.tsx src/shared/ui/text-field/text_field.test.tsx
```

Expected: 지정한 5개 테스트 파일만 PASS. 전체 테스트 모음은 실행하지 않는다.

### Task 1: 대화상자의 넓은 배경면만 정리

**Files:**

- Modify: `src/shared/ui/modal/modal.css`
- Modify: `src/features/insight-import/ui/insight_import_dialog.css`
- Test: `src/shared/ui/modal/modal.test.tsx`
- Test: `src/features/insight-import/ui/insight_import_dialog_contract.test.ts`
- Stage: `docs/superpowers/specs/2026-07-29-auxiliary-surface-visual-consistency-design.md`
- Stage: `docs/superpowers/plans/2026-07-29-auxiliary-surface-visual-consistency.md`

- [ ] **Step 1: 공용 대화상자의 외곽 배경만 카드·입력 배경색으로 변경**

`src/shared/ui/modal/modal.css`의 대화상자 규칙을 다음과 같이 수정한다.

```css
div.ui-modal[role='dialog'] {
  border-radius: var(--radius-card);
  background: var(--color-surface);
  color: var(--color-ink);
}
```

`--color-canvas`를 재정의하지 않는다. 그래야 대화상자 안의 기존 흰색 버튼, 입력과 선택 항목이 그대로 유지된다.

- [ ] **Step 2: 가져오기 Desktop·Tablet의 선택 영역과 Footer 배경을 구분**

`src/features/insight-import/ui/insight_import_dialog.css`에서 넓은 배경 영역만 다음 값으로 바꾼다.

```css
.insight-import-dialog__source-navigation {
  /* 기존 layout 선언 유지 */
  background: var(--color-paper);
}

div.insight-import-dialog .ui-modal__footer {
  /* 기존 border와 flex 선언 유지 */
  background: var(--color-surface);
}
```

`button.insight-import-dialog__source-option`, 파일 입력, Notion 패널, 요약 카드와 최근 기록의 `var(--color-canvas)`는 변경하지 않는다.

- [ ] **Step 3: Mobile 상단 선택 영역의 넓은 배경만 카드·입력 배경색으로 변경**

같은 CSS의 `@media (max-width: 767px)` 안에서 다음 선언만 수정한다.

```css
.insight-import-dialog__source-navigation {
  /* 기존 Mobile layout 선언 유지 */
  background: var(--color-surface);
}
```

선택된 탭의 Mist 배경, 버튼 색상과 Mobile 전체 화면 구조는 유지한다.

- [ ] **Step 4: 대화상자와 가져오기 계약 테스트 실행**

```powershell
npm test -- src/shared/ui/modal/modal.test.tsx src/features/insight-import/ui/insight_import_dialog_contract.test.ts
```

Expected: 2개 테스트 파일 PASS.

- [ ] **Step 5: 변경 범위 확인**

```powershell
git diff -- src/shared/ui/modal/modal.css src/features/insight-import/ui/insight_import_dialog.css
```

Expected: 넓은 배경 영역의 `background` 선언만 바뀌고 `--color-canvas` 재정의나 버튼·입력 색상 변경이 없다.

- [ ] **Step 6: 첫 번째 변경 묶음 커밋**

```powershell
git add docs/superpowers/specs/2026-07-29-auxiliary-surface-visual-consistency-design.md docs/superpowers/plans/2026-07-29-auxiliary-surface-visual-consistency.md src/shared/ui/modal/modal.css src/features/insight-import/ui/insight_import_dialog.css
git commit -m "style: 보조 화면 배경면 정리"
```

Expected: 커밋 성공.

### Task 2: 카테고리 표시와 꺼내보기 정렬 통일

**Files:**

- Modify: `src/shared/ui/category-filter/category_filter.css`
- Modify: `src/pages/home/ui/home_page.css`
- Modify: `src/pages/home/ui/home_page.test.tsx`
- Test: `src/pages/home/ui/home_page.test.tsx`

- [ ] **Step 1: 기존 홈 CSS 계약 테스트를 왼쪽 정렬 기준으로 변경**

`src/pages/home/ui/home_page.test.tsx`의 첫 테스트 이름과 `heroRule` 기대값을 수정한다.

```tsx
it('defines a left-aligned retrieval axis with responsive suggestion columns', () => {
  // 기존 CSS 읽기와 다른 기대값 유지
  expect(heroRule).toContain('width: min(820px, 100%);');
  expect(heroRule).toContain('margin-inline: auto;');
  expect(heroRule).toContain('justify-items: start;');
  expect(heroRule).toContain('text-align: left;');
});
```

기존 breakpoint와 제안 열 수 기대값은 삭제하지 않는다.

- [ ] **Step 2: 수정한 테스트가 현재 중앙 정렬 CSS에서 실패하는지 확인**

```powershell
npm test -- src/pages/home/ui/home_page.test.tsx
```

Expected: `.home-page__hero`에 `justify-items: start` 또는 `text-align: left`가 없어 FAIL.

- [ ] **Step 3: 꺼내보기 대표 영역 내부를 왼쪽 정렬**

`src/pages/home/ui/home_page.css`의 `.home-page__hero`를 다음과 같이 수정한다.

```css
.home-page__hero {
  display: grid;
  width: min(820px, 100%);
  margin-inline: auto;
  justify-items: start;
  gap: var(--spacing-4);
  text-align: left;
}
```

820px 최대 너비, 가운데 배치된 컨테이너와 검색의 기존 반응형 배치는 유지한다.

- [ ] **Step 4: 카테고리 필터 색상 표시를 승인한 12px으로 확대**

`src/shared/ui/category-filter/category_filter.css`의 표시 크기만 다음과 같이 수정한다.

```css
.category-filter__mark {
  width: var(--spacing-3);
  height: var(--spacing-3);
  border-radius: var(--radius-button);
  background: var(--category-color);
  flex: 0 0 auto;
}
```

버튼 높이, padding, gap과 선택 상태는 변경하지 않는다. 순수 CSS 크기를 고정하는 새 단위 테스트는 추가하지 않는다.

- [ ] **Step 5: 홈 화면의 기존 테스트 실행**

```powershell
npm test -- src/pages/home/ui/home_page.test.tsx
```

Expected: PASS.

- [ ] **Step 6: 두 번째 변경 묶음 커밋**

```powershell
git add src/pages/home/ui/home_page.css src/pages/home/ui/home_page.test.tsx src/shared/ui/category-filter/category_filter.css
git commit -m "style: 홈 정렬과 카테고리 표시 정리"
```

Expected: 커밋 성공.

### Task 3: 저장 화면 이름과 검색어 지우기 위치 정리

**Files:**

- Modify: `src/pages/save/ui/save_page.tsx`
- Modify: `src/pages/save/ui/save_page.test.tsx`
- Modify: `src/shared/ui/text-field/text_field.css`
- Test: `src/pages/save/ui/save_page.test.tsx`
- Test: `src/shared/ui/text-field/text_field.test.tsx`

- [ ] **Step 1: 기존 공유 저장 테스트에 작은 화면 이름 계약 추가**

`src/pages/save/ui/save_page.test.tsx`의 `공유 제목을 저장 전에 보이고 수정값을 전달한다` 테스트에 다음 기대값을 추가한다.

```tsx
expect(screen.getByText('저장')).not.toBeNull();
expect(screen.queryByText('URL을 입력하면 바로 저장해요')).toBeNull();
```

기존 공유 제목 입력과 변경값 전달 기대값은 유지한다.

- [ ] **Step 2: 수정한 테스트가 현재 공유 저장 화면에서 실패하는지 확인**

```powershell
npm test -- src/pages/save/ui/save_page.test.tsx
```

Expected: 공유 저장 화면에 `저장`이 없어 FAIL.

- [ ] **Step 3: 일반·공유 저장의 작은 화면 이름을 `저장`으로 통일**

`src/pages/save/ui/save_page.tsx`의 조건부 작은 문구를 다음 한 줄로 바꾼다.

```tsx
<p className="save-page__kicker">저장</p>
```

일반 저장 큰 제목 `URL을 입력하면 바로 저장해요`와 공유 저장 큰 제목 `공유한 링크를 저장할까요?`는 유지한다.

- [ ] **Step 4: 검색어 지우기 기호를 기존 버튼 중앙에 배치**

`src/shared/ui/text-field/text_field.css`의 기존 버튼 규칙에 `place-items`만 추가한다.

```css
button.ui-field__clear {
  display: grid;
  width: 44px;
  min-width: 44px;
  min-height: 44px;
  height: 44px;
  padding: 0;
  border: 0;
  border-radius: var(--radius-button);
  place-items: center;
  background: transparent;
  color: var(--color-graphite);
}
```

버튼 크기, 접근 가능한 이름, 클릭과 포커스 복구 로직은 변경하지 않는다.

- [ ] **Step 5: 저장과 공용 입력의 기존 테스트 실행**

```powershell
npm test -- src/pages/save/ui/save_page.test.tsx src/shared/ui/text-field/text_field.test.tsx
```

Expected: 2개 테스트 파일 PASS. 검색어 지우기 동작에 새 테스트를 추가하지 않는다.

- [ ] **Step 6: 세 번째 변경 묶음 커밋**

```powershell
git add src/pages/save/ui/save_page.tsx src/pages/save/ui/save_page.test.tsx src/shared/ui/text-field/text_field.css
git commit -m "style: 저장 화면 이름과 입력 지우기 정렬"
```

Expected: 커밋 성공.

### Task 4: 빌드 검증과 실제 화면 확인

**Files:**

- Verify: `src/shared/ui/modal/modal.css`
- Verify: `src/features/insight-import/ui/insight_import_dialog.css`
- Verify: `src/shared/ui/category-filter/category_filter.css`
- Verify: `src/pages/home/ui/home_page.css`
- Verify: `src/pages/save/ui/save_page.tsx`
- Verify: `src/shared/ui/text-field/text_field.css`
- Verify only: `src/features/pwa-install/ui/pwa_install_notice.css`

- [ ] **Step 1: 변경한 TypeScript 파일만 lint**

```powershell
npx eslint src/pages/home/ui/home_page.test.tsx src/pages/save/ui/save_page.tsx src/pages/save/ui/save_page.test.tsx
```

Expected: exit code 0.

- [ ] **Step 2: Web 빌드**

```powershell
npm run build:web
```

Expected: TypeScript, Vite Web build와 client bundle 검증 PASS. Android와 Chrome 확장 빌드는 실행하지 않는다.

- [ ] **Step 3: 공백 오류와 최종 범위 확인**

```powershell
git diff --check origin/main...HEAD
git diff --stat origin/main...HEAD
git status --short
```

Expected: 공백 오류가 없고, 설계·계획 문서와 명시한 UI 파일만 변경되며 작업 트리가 깨끗하다.

- [ ] **Step 4: PWA 안내가 변경되지 않았는지 확인**

```powershell
git diff --exit-code origin/main -- src/features/pwa-install/ui/pwa_install_notice.tsx src/features/pwa-install/ui/pwa_install_notice.css
```

Expected: 출력 없이 exit code 0. 현재 A안과 일치하는 PWA 안내에 불필요한 변경이 없다.

- [ ] **Step 5: 로컬 Web 화면 실행**

```powershell
npm run dev:client -- --host 127.0.0.1 --port 5192
```

Expected: `http://127.0.0.1:5192/`에서 앱이 열린다.

- [ ] **Step 6: 세 너비에서 승인 항목만 직접 확인**

브라우저 viewport를 차례로 `390×844`, `768×1024`, `1280×900`으로 설정하고 다음 항목만 확인한다.

1. 가져오기와 카테고리 관리의 넓은 배경면은 바뀌고 흰색 버튼·입력·선택 항목은 그대로다.
2. 가져오기는 768px 이상에서 왼쪽 선택 영역이 기본 배경색이고 767px 이하에서 상단 탭으로 유지된다.
3. 카테고리 필터 색상 표시가 12px이며 문구를 압박하지 않는다.
4. 꺼내보기 제목과 검색 영역이 왼쪽 기준선에 맞는다.
5. 일반·공유 저장의 작은 화면 이름은 `저장`이다.
6. 값을 입력했을 때 검색어 지우기 `×`가 44px 버튼 중앙에 놓인다.

Expected: 여섯 항목이 모두 승인된 설계와 일치한다.

- [ ] **Step 7: 추가 변경 없이 검증 결과 기록**

시각 확인에서 문제가 없다면 변경하지 않은 테스트를 추가로 실행하거나 수정하지 않는다. 문제가 있으면 원인이 있는 대상 CSS만 수정하고 해당 파일에 직접 연결된 테스트와 화면만 다시 확인한다.
