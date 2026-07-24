# 사용자 카테고리 관리 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 사용자가 카테고리를 만들고 이름과 색상을 관리하며, 저장 화면·인사이트 카드·보관함 필터에서 같은 카테고리를 선택하도록 구현한다.

**Architecture:** 사용자 소유의 `categories` 테이블을 만들고 인사이트에는 `category_id` 하나만 저장한다. 이름과 색상은 카테고리 목록에서 가져오므로 한 번 수정하면 연결된 필터와 카드가 함께 바뀐다. 카테고리 이름은 보관함의 정확한 단어 검색에만 사용하며 꺼내보기 검색 입력에는 포함하지 않는다.

**Tech Stack:** React 19, TypeScript 6, Supabase PostgreSQL·RLS·PL/pgSQL, WDS 3.11, Vitest, React Testing Library, pgTAP

---

## 구현 뒤 달라지는 흐름

현재 `insights.category`는 인사이트 한 건에 붙은 자유 문자열이다. 사용자가 새 이름을 입력해도 보관함 필터가 생기지 않고, 필터와 색상은 코드에 고정되어 있다.

구현 뒤에는 다음 흐름을 사용한다.

1. 사용자가 이름과 24개 색상 중 하나를 골라 카테고리를 만든다.
2. 저장 화면과 카드 수정 화면에서 자신의 카테고리 하나를 선택한다.
3. 보관함은 `전체 → 사용자 카테고리 → 미분류` 순서로 필터를 보여준다.
4. 이름이나 색상을 바꾸면 연결된 모든 필터와 카드에 반영된다.
5. 카테고리를 삭제하면 인사이트는 남고 `미분류`로 이동한다.

한 인사이트에 여러 카테고리 연결, 직접 정렬, AI 추천, 자유 색상 선택은 이번 작업에 포함하지 않는다.

## 구조 결정

### 데이터

- `categories`: `id`, `user_id`, `name`, `color_key`, `sort_order`, 생성·수정 시각
- `insights.category_id`: 비어 있을 수 있는 카테고리 ID
- `(category_id, user_id) → categories(id, user_id)` 복합 외래키로 다른 사용자의 카테고리 연결 차단
- 카테고리 삭제 함수에서 연결된 인사이트를 `null`로 바꾼 뒤 카테고리 삭제
- 기존 `insights.category` 문자열은 이전과 되돌리기를 위해 이번 배포에서 보존

### 프론트엔드

- `entities/category`: 타입, 이름 검증, 저장소 계약과 Supabase 구현
- `features/category-management`: 관리 모달과 생성·수정·삭제 행동
- `entities/insight`: `categoryId`만 소유
- `app`: 카테고리 ID와 실제 카테고리 목록을 결합
- `pages/save`, `pages/library`: 선택 UI와 관리 진입점 표시
- `shared/ui`: WDS Select·Modal 어댑터와 24개 색상 팔레트

### 검색

- 보관함 검색은 `categoryId`로 찾은 카테고리 이름을 정확한 단어 검색에 사용한다.
- 꺼내보기의 `retrieveInsights`에는 카테고리 이름 해석기를 전달하지 않는다.
- 카테고리 이름 변경은 꺼내보기 검색 결과에 영향을 주지 않는다.

## 검증 범위

새 테스트 파일은 세 개만 만든다.

1. `supabase/tests/database/category_management.test.sql`: 사용자 격리와 삭제 시 미분류 유지
2. `src/entities/category/api/supabase_category_repository.test.ts`: Supabase 행·오류 변환
3. `src/app/model/use_category_workspace.test.tsx`: 생성 → 변경 → 삭제 상태

화면은 기존 `src/app/authenticated_workspace.test.tsx`에 대표 흐름 한 건만 추가한다. 24개 색상 각각, 문구, 간격과 단순 버튼 클릭에는 별도 테스트를 만들지 않는다. 각 작업에서는 관련 테스트만 실행하고 전체 검증은 마지막에 한 번 수행한다.

---

### Task 1: 데이터베이스 구조와 기존 데이터 이전

**Files:**

- Create: `supabase/migrations/20260724000100_add_user_categories.sql`
- Create: `supabase/tests/database/category_management.test.sql`

- [ ] **Step 1: 실패하는 pgTAP 테스트 작성**

한 파일에서 다음 8개 항목을 검증한다.

1. `categories` 테이블 존재
2. `categories` RLS 활성화
3. 로그인 사용자의 생성·조회 성공
4. 다른 사용자 카테고리 조회 결과 0건
5. 다른 사용자 카테고리 수정 결과 0건
6. 다른 사용자 카테고리를 내 인사이트에 연결하면 외래키 오류
7. `delete_user_category` 호출 성공
8. 삭제 뒤 인사이트 행은 남고 `category_id is null`

Run:

```powershell
npx supabase test db supabase/tests/database/category_management.test.sql
```

Expected: 테이블과 함수가 없어 FAIL.

- [ ] **Step 2: 확장 마이그레이션 작성**

다음 제약을 SQL에 명시한다.

- 이름: 공백 제거 뒤 1~50자
- 사용자별 이름: 연속 공백과 대소문자를 정규화한 값으로 unique
- 색상 키: `slate`, `blue`, `indigo`, `violet`, `green`, `teal`, `amber`, `coral` 각 3단계, 총 24개
- 정렬 순서: 0 이상
- RLS: 본인 행의 CRUD만 허용
- 외래키: `category_id`와 `user_id`를 함께 확인

기존 문자열은 사용자별 정규화 이름으로 묶고 생성순 `sort_order`를 부여한다. 고정 이름은 현재 색상을 이어받는다.

| 이름       | 색상 키 |
| ---------- | ------- |
| 개발       | green-2 |
| 디자인     | blue-2  |
| 팀프로젝트 | amber-2 |
| 공부       | slate-2 |
| 취업       | coral-2 |

나머지 이름은 24개 팔레트 순서로 반복 배정한다. 이전 직후 비어 있지 않은 legacy 문자열 중 `category_id is null`인 행이 있으면 migration을 실패시킨다.

`delete_user_category(uuid)`는 `security invoker`로 작성하고 `authenticated`만 실행한다. 호출 사용자 소유를 확인하고, 같은 사용자의 인사이트만 `category_id = null`로 바꾼 뒤 카테고리를 삭제한다. 어느 단계든 실패하면 transaction 전체를 되돌린다.

- [ ] **Step 3: 데이터베이스 테스트 실행 후 커밋**

```powershell
npx supabase test db supabase/tests/database/category_management.test.sql
git add supabase/migrations/20260724000100_add_user_categories.sql supabase/tests/database/category_management.test.sql
git commit -m "feat: 사용자 카테고리 데이터 구조"
```

Expected: 8개 assertion PASS.

---

### Task 2: 팔레트와 카테고리 저장소

**Files:**

- Create: `src/shared/config/design-system/category_palette.ts`
- Modify: `src/shared/config/design-system/index.ts`
- Create: `src/entities/category/model/category.ts`
- Create: `src/entities/category/model/category_repository.ts`
- Create: `src/entities/category/api/supabase_category_repository.ts`
- Create: `src/entities/category/api/supabase_category_repository.test.ts`
- Create: `src/entities/category/index.ts`
- Create: `src/app/model/create_browser_category_repository.ts`

- [ ] **Step 1: 저장소 테스트 작성 후 RED 확인**

테스트는 목록 행 변환, 정규화한 이름과 색상 저장, 삭제 RPC 호출을 한 흐름으로 검증한다. PostgreSQL `23505`는 `duplicate`, `42501`은 `permission-denied`로 변환한다.

```powershell
npx vitest run src/entities/category/api/supabase_category_repository.test.ts
```

Expected: category 모듈이 없어 FAIL.

- [ ] **Step 2: 팔레트와 도메인 계약 구현**

`CategoryColorKey`는 Task 1의 24개 키와 정확히 일치시킨다. 실제 HEX 값은 `category_palette.ts` 한 곳에서 관리한다.

```ts
type Category = {
  colorKey: CategoryColorKey;
  createdAt: string;
  id: string;
  name: string;
  sortOrder: number;
  updatedAt: string;
};

type CategoryInput = {
  colorKey: CategoryColorKey;
  name: string;
};
```

`normalizeCategoryName`은 앞뒤 공백을 제거하고 연속 공백을 하나로 줄인다. 빈 이름, 50자 초과, 팔레트에 없는 색상을 외부 요청 전에 거부한다.

- [ ] **Step 3: Supabase 저장소 구현**

- `list`: `sort_order → created_at → id` 순 조회
- `create`: 정규화한 이름, 색상, hook에서 계산한 다음 `sortOrder` 저장
- `update`: 현재 사용자와 ID를 함께 확인하고 이름·색상 변경
- `delete`: `delete_user_category` RPC 호출
- 행 파싱: 사용자 ID, UUID, 색상 키, 정렬 순서, ISO 시각 검증

잘못된 행은 `corrupted-entry` 경고로 제외한다. 생성·수정 성공 결과에는 서버가 반환한 `Category`를 포함한다.

- [ ] **Step 4: 저장소 테스트 실행 후 커밋**

```powershell
npx vitest run src/entities/category/api/supabase_category_repository.test.ts
git add src/shared/config/design-system src/entities/category src/app/model/create_browser_category_repository.ts
git commit -m "feat: 사용자 카테고리 저장소"
```

Expected: PASS.

---

### Task 3: 인사이트를 카테고리 ID에 연결

**Files:**

- Modify: `src/entities/insight/model/insight.ts`
- Modify: `src/entities/insight/model/insight_capture.ts`
- Modify: `src/entities/insight/model/parse_insight.ts`
- Modify: `src/entities/insight/model/search_insights.ts`
- Modify: `src/entities/insight/api/supabase_insight_repository.ts`
- Modify: `src/app/model/create_repository_insight_capture_service.ts`
- Modify: `src/app/model/use_insight_workspace.ts`
- Modify: `server/supabase_insight_capture.ts`
- Modify: 기존 insight·capture·workspace 테스트의 category fixture

- [ ] **Step 1: 핵심 테스트를 `categoryId` 계약으로 변경해 RED 확인**

```ts
type InsightContextInput = {
  categoryId: string | null;
  memo: string;
  title: string;
};
```

`search_insights.test.ts`에는 카테고리 해석기가 없으면 이름이 검색되지 않고, 해석기를 전달한 보관함 검색에서는 검색되는 한 쌍만 추가한다.

```powershell
npx vitest run src/entities/insight/model/search_insights.test.ts src/entities/insight/api/supabase_insight_repository.test.ts src/app/model/use_insight_workspace.test.tsx server/supabase_insight_capture.test.ts
```

Expected: `categoryId` 계약이 없어 FAIL.

- [ ] **Step 2: 모델과 저장소 변경**

- `Insight.category`를 `categoryId: string | null`로 교체
- `filterInsights`는 `all`, `uncategorized`, 실제 UUID로 필터
- `searchInsights`는 선택적인 `getCategoryName(categoryId)`만 보관함 검색에서 사용
- 클라이언트와 서버 select·insert·update를 legacy `category`에서 `category_id`로 교체
- 새 저장은 `categoryId: null`, 중복 URL 반환은 현재 `category_id` 보존
- local storage parser와 fixture도 새 모델로 변경

`useInsightWorkspace`에는 카테고리 삭제 RPC 성공 뒤 해당 ID를 가진 로컬 인사이트만 `categoryId: null`로 바꾸는 `detachCategory`를 추가한다.

- [ ] **Step 3: 영향받은 기존 테스트 실행 후 커밋**

```powershell
npx vitest run src/entities/insight src/app/model/use_insight_workspace.test.tsx src/app/model/create_repository_insight_capture_service.test.ts server/supabase_insight_capture.test.ts server/insight_capture_service.test.ts
git add src/entities/insight src/app/model/use_insight_workspace.ts src/app/model/use_insight_workspace.test.tsx src/app/model/create_repository_insight_capture_service.ts src/app/model/create_repository_insight_capture_service.test.ts server
git commit -m "refactor: 인사이트 카테고리 식별자 연결"
```

Expected: 관련 기존 행동과 새 검색 경계 PASS.

---

### Task 4: 카테고리 목록과 변경 상태

**Files:**

- Create: `src/app/model/use_category_workspace.ts`
- Create: `src/app/model/use_category_workspace.test.tsx`

- [ ] **Step 1: 생성 → 변경 → 삭제 상태 테스트 작성 후 RED 확인**

한 테스트에서 다음 순서를 검증한다.

1. `개발`, `green-2` 생성 후 목록 반영
2. `프론트엔드`, `blue-2`로 변경 후 같은 ID 교체
3. 삭제 후 목록 제거와 `onCategoryDeleted(id)` 호출
4. 실패 응답에서는 목록 유지

```powershell
npx vitest run src/app/model/use_category_workspace.test.tsx
```

Expected: hook이 없어 FAIL.

- [ ] **Step 2: workspace hook 구현**

- repository 변경 시 목록 다시 조회
- mutation은 동시에 하나만 실행
- 생성 전 대소문자·공백을 정규화해 중복 확인
- 다음 `sortOrder`는 현재 최댓값 + 1
- 서버 성공 결과로 목록 갱신
- 삭제 성공 뒤에만 `onCategoryDeleted`
- 실패 시 목록과 입력 유지

- [ ] **Step 3: 상태 테스트 실행 후 커밋**

```powershell
npx vitest run src/app/model/use_category_workspace.test.tsx
git add src/app/model/use_category_workspace.ts src/app/model/use_category_workspace.test.tsx
git commit -m "feat: 사용자 카테고리 상태 관리"
```

Expected: PASS.

---

### Task 5: 선택 UI와 관리 모달

**Files:**

- Create: `src/shared/ui/select/select.tsx`
- Create: `src/shared/ui/select/index.ts`
- Create: `src/shared/ui/modal/modal.tsx`
- Create: `src/shared/ui/modal/index.ts`
- Modify: `src/shared/ui/chip/chip.tsx`
- Modify: `src/shared/ui/chip/chip.css`
- Modify: `src/shared/ui/category-filter/category_filter.tsx`
- Modify: `src/shared/ui/category-filter/category_filter.css`
- Modify: `src/shared/ui/index.ts`
- Create: `src/features/category-management/ui/category_manager.tsx`
- Create: `src/features/category-management/ui/category_manager.css`
- Create: `src/features/category-management/index.ts`

- [ ] **Step 1: WDS 어댑터와 색상 표시 구현**

- WDS `Select`, `Modal`은 `shared/ui`에서만 import
- `CategoryTag`와 `CategoryFilterOption`은 기존 `tone` 대신 `colorKey` 사용
- 실제 색상은 `categoryPalette[colorKey]`를 CSS 변수로 전달
- `전체`와 `미분류`는 중립색 사용

- [ ] **Step 2: 관리 모달 구현**

첫 화면에는 카테고리 목록과 `새 카테고리` 버튼을 둔다. 항목을 누르면 이름·색상 수정 화면을 열고, 삭제는 확인 화면을 한 번 거친다.

색상은 6열 × 4행의 원형 버튼으로 배치한다.

- 최소 44px 터치 영역
- 선택 항목에 테두리와 체크 표시
- 각 색상에 `진한 파랑`, `파랑`, `연한 파랑` 형태의 접근 가능한 이름
- 생성·수정·삭제 실패 시 입력과 현재 화면 유지
- 삭제 안내: 연결된 인사이트가 미분류로 이동함을 명시

- [ ] **Step 3: 기존 공통 UI 테스트만 갱신 후 커밋**

`chip.test.tsx`와 `category_filter.test.tsx`의 tone fixture를 대표 `colorKey`로 바꾼다. 팔레트별 테스트는 추가하지 않는다.

```powershell
npx vitest run src/shared/ui/chip/chip.test.tsx src/shared/ui/category-filter/category_filter.test.tsx
git add src/shared/ui src/features/category-management
git commit -m "feat: 카테고리 선택과 관리 화면"
```

Expected: PASS.

---

### Task 6: 저장·카드·보관함 연결

**Files:**

- Modify: `src/entities/insight/ui/insight_card.tsx`
- Modify: `src/entities/insight/ui/insight_grid.tsx`
- Modify: `src/pages/save/ui/save_page.tsx`
- Modify: `src/pages/library/ui/library_page.tsx`
- Modify: `src/app/model/workspace_seed.ts`
- Modify: `src/app/authenticated_workspace.tsx`
- Modify: 관련 기존 화면 테스트
- Modify: `src/app/authenticated_workspace.test.tsx`

- [ ] **Step 1: 대표 사용자 흐름 테스트 작성 후 RED 확인**

기존 통합 테스트에 다음 흐름 한 건을 추가한다.

1. 관리 모달에서 `프론트엔드` 카테고리 생성
2. 인사이트에 해당 카테고리 선택
3. 보관함 필터와 카드에 같은 이름 표시
4. 카테고리 삭제
5. 인사이트가 삭제되지 않고 미분류에서 표시

```powershell
npx vitest run src/app/authenticated_workspace.test.tsx
```

Expected: 관리 버튼과 선택 UI가 없어 FAIL.

- [ ] **Step 2: 자유 입력을 선택 UI로 교체**

저장 화면과 카드 수정 화면은 `미분류`와 실제 카테고리 목록을 보여준다. 목록 아래 `새 카테고리 만들기`를 두고, 생성 성공 시 반환된 ID를 현재 draft에 바로 선택한다.

카드는 `categoryId`와 일치하는 카테고리의 이름과 색상을 표시한다. `entities/insight`는 category entity를 import하지 않고 화면에 필요한 `{ id, name, colorKey }` 구조만 props로 받는다.

- [ ] **Step 3: 실제 보관함 필터와 관리 버튼 연결**

필터 순서는 `전체 → sortOrder 순 사용자 카테고리 → 미분류`다. `카테고리` 제목 옆에 `관리` 버튼을 둔다. 선택 중인 카테고리를 삭제하면 `전체`로 이동한다.

`AuthenticatedWorkspace`에서 두 repository와 hook을 조합한다. 삭제 성공 콜백은 `detachCategory`를 호출한다. 보관함 검색에만 ID→이름 map을 넘기고 `retrieveInsights`에는 넘기지 않는다.

카테고리 목록 로드 실패 시 인사이트는 보여주고 카테고리 선택·관리만 비활성화한다.

- [ ] **Step 4: 화면 관련 테스트 실행 후 커밋**

```powershell
npx vitest run src/app/authenticated_workspace.test.tsx src/pages/save/ui/save_page.test.tsx src/pages/library/ui/library_page.test.tsx src/entities/insight/ui/insight_grid.test.tsx
git add src/app/authenticated_workspace.tsx src/app/authenticated_workspace.test.tsx src/app/model/workspace_seed.ts src/pages/save src/pages/library src/entities/insight/ui
git commit -m "feat: 카테고리 관리 사용자 흐름"
```

Expected: 대표 흐름과 기존 화면 행동 PASS.

---

### Task 7: 최종 검증

- [ ] **Step 1: 전체 검증을 한 번 실행**

```powershell
npx supabase test db
npm test
npm run lint
npm run format:check
npm run build
```

Expected: 데이터베이스, 단위·통합 테스트, lint, format, 타입 검사와 production build PASS.

- [ ] **Step 2: legacy 사용과 변경 범위 확인**

```powershell
rg -n "\bcategory\b" src server | rg "insight|capture|repository"
git status --short
git diff --check
git log --oneline main..HEAD
```

확인 기준:

- 새 코드가 `insights.category`를 select·insert·update하지 않는다.
- `.codex-tmp/`, `output/`은 추적하지 않는다.
- #71과 관련 없는 파일이 커밋에 포함되지 않는다.
- 검증 수정이 없으면 별도 커밋을 만들지 않는다.

## 완료 조건

- 카테고리 이름과 색상이 사용자별로 저장된다.
- 저장 화면과 카드 수정에서 자유 문자열을 입력할 수 없다.
- 새 카테고리가 보관함 필터와 카드에 같은 이름·색상으로 나타난다.
- 이름과 색상 변경이 연결된 모든 화면에 반영된다.
- 카테고리를 삭제해도 인사이트는 남고 미분류에서 찾을 수 있다.
- 다른 사용자의 카테고리를 조회·변경·삭제하거나 자신의 인사이트에 연결할 수 없다.
- 카테고리 이름은 보관함 검색에만 사용되고 꺼내보기 입력에는 포함되지 않는다.
- 기존 문자열은 `category_id`로 누락 없이 이전되고 legacy 열은 이번 배포에서 보존된다.
