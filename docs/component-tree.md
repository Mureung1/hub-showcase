# 컴포넌트 트리와 state 배치

핵심 화면(가이드형 에디터)을 컴포넌트로 분리하면서, "어떻게 렌더링하지?"가 아니라 **"렌더링에 영향을 미치는 state가 무엇이지?"** 관점으로 화면 구조를 정리한 문서다.

## 앱 전체 트리

```
App (BrowserRouter + Routes)
 └ Layout                     내비게이션 · 배경 오브 · <Outlet/> · 푸터
    ├ HomePage                히어로 + 진행 중 챌린지 + 최신 문서 3개
    │   ├ ChallengeCard ─ TagBadge
    │   └ DocumentCard  ─ TagBadge
    ├ ArchivePage             문서 목록 + 필터/정렬
    │   └ DocumentCard  ─ TagBadge
    ├ DocumentDetailPage      문서 상세 + 섹션별 코멘트
    │   ├ TagBadge
    │   └ DocumentSection × N ─ CommentItem · CommentForm
    ├ TemplatePickerPage      템플릿 4종 선택
    ├ EditorPage ★핵심 화면    가이드형 에디터 (아래 상세)
    ├ ChallengesPage
    │   ├ ChallengeCard ─ TagBadge
    │   └ DocumentCard  ─ TagBadge
    ├ GuidePage               정적 가이드 문서
    └ MyPage                  내 초안·발행 문서
        └ DocumentCard  ─ TagBadge
```

각 컴포넌트는 자기 몫만 그린다 — `DocumentCard`는 "문서 한 장"만 알면 되고, 목록 전체(필터·정렬)는 페이지가 책임진다.

## 핵심 화면(EditorPage) 분리 전/후

**분리 전** — 페이지 하나가 278줄로 메타 패널 폼, 섹션 편집 UI, 가이드 패널 마크업을 전부 들고 있었다.

```
EditorPage (278줄)
 └ (메타 패널 + 섹션 편집 + 가이드 aside 마크업 전부 인라인)
    └ CommentItem
```

**분리 후** — 화면의 부품 단위로 잘라냈다. 처음부터 잘게 나누지 않고, 큰 컴포넌트로 화면이 도는 것을 확인한 뒤 반복되는 덩어리(섹션 한 줄)와 독립적인 덩어리(메타 패널)를 분리했다.

```
EditorPage                    state·핸들러 전부 보유 (컨테이너)
 ├ EditorMetaPanel            제목·태그 입력 + 액션 버튼 (presentational)
 └ EditorSection  × N         섹션 한 줄: 제목 input + textarea + 가이드 aside
    └ CommentItem             AI 피드백 코멘트
```

## state는 어디에 사는가

state는 전부 `EditorPage`에 남겼다(상태 끌어올리기 / 단일 출처). 자식 컴포넌트는 props로 값을 받아 그리기만 하고, 자기 state가 없다.

| state | 의미 | 바뀌는 순간 (→ 리렌더 트리거) |
| --- | --- | --- |
| `title` | 문서 제목 | 제목 input 타이핑 |
| `gameTag` / `systemTag` | 필수 태그 | 태그 input 타이핑 |
| `feedbackWanted` | 피드백 요청 배지 | 체크박스 클릭 |
| `sections` | 섹션 배열 `{id, guideKey, heading, content}` | 섹션 내용 입력·추가·삭제 |
| `aiComments` | 섹션 id → AI 코멘트 배열 | "AI 피드백 받기" 응답 도착 |
| `aiLoading` | AI 호출 중 여부 | 피드백 요청 시작/종료 |
| `savedAt` | 마지막 임시저장 시각 | "임시저장" 클릭 |
| `publishError` | 발행 검증 에러 메시지 | 태그 없이 "발행" 클릭 |

`sections`를 바꿀 때는 항상 새 배열을 만들어 교체한다(`map`/`filter`/spread). React는 "새 값이 이전 값과 다른가"로 리렌더를 결정하므로 `push` 같은 직접 변경은 화면에 반영되지 않는다.

## 데이터 흐름: props down, events up

값은 아래로(`EditorPage` → `title`, `section`, `aiComments` …), 이벤트는 콜백으로 위로(`onTitleChange`, `onChange(patch)`, `onRemove` …) 흐른다. 예를 들어 섹션 textarea에 타이핑하면:

```
textarea onChange
  → EditorSection이 onChange({ content }) 호출   (이벤트가 위로)
  → EditorPage의 updateSection이 setSections(새 배열)  (state 변경)
  → React가 바뀐 EditorSection만 새 props로 다시 그림   (값이 아래로)
```

리스트 렌더링의 key는 배열 인덱스가 아니라 각 섹션의 고유 `id`를 쓴다 — 섹션을 중간에서 삭제해도 React가 남은 줄을 정확히 구별하기 위해서다.

## 같은 패턴 반복: 문서 상세 화면 분리

에디터에서 한 분리를 상세 화면(DocumentDetailPage)에서 한 번 더 반복했다.

```
DocumentDetailPage            doc 로딩, liked/bookmarked/localComments/openSectionId 보유
 └ DocumentSection  × N       섹션 본문 + 코멘트 목록 + 폼 열기 버튼
    ├ CommentItem             코멘트 한 개
    └ CommentForm             코멘트 입력 폼 — text를 자체 state로 보유 ★
```

★ 표시가 이번 반복의 핵심 차이다. 에디터의 자식들은 state가 하나도 없는 presentational 컴포넌트지만, `CommentForm`은 **입력 중인 텍스트를 자기 안에 지역 state로 가둔다**. 입력 중인 값은 이 폼 밖의 누구도 알 필요가 없기 때문이다 — 등록 버튼을 누르는 순간에만 `onSubmit(text)` 콜백으로 완성된 값을 부모에게 올린다.

## state vs props

| | state | props |
|---|---|---|
| 무엇 | 컴포넌트가 **스스로 소유하고 바꾸는** 값 | 부모가 **내려주는 읽기 전용** 값 |
| 변경 | `setXxx()` 호출 → 그 컴포넌트(와 자식들)가 리렌더 | 자식이 직접 못 바꿈 — 콜백 props를 불러 부모의 state 변경을 요청 |
| 예시 | `CommentForm`의 `text`, `EditorPage`의 `sections` | `DocumentSection`이 받는 `section`, `comments`, `onSubmitComment` |

**어디에 둘지 결정하는 질문**: "이 값을 누가 알아야 하는가?"

- 여러 컴포넌트가 같이 봐야 한다 → 공통 부모의 state로 끌어올리고 props로 내려준다 (예: `sections`는 `EditorPage`가 소유 — 각 `EditorSection`과 발행 로직이 함께 쓴다)
- 한 컴포넌트만 알면 된다 → 그 컴포넌트의 지역 state로 가둔다 (예: `CommentForm`의 입력 중 텍스트)

같은 값이라도 소유자에게는 state고, 그걸 내려받는 자식에게는 props다. 값은 아래로, 이벤트는 위로 — 이 한 방향 흐름이 유지되는 한 "이 화면이 왜 이렇게 그려졌지?"의 답은 항상 소유자의 state 하나만 보면 된다.
