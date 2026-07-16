# Component Implementation Notes

## 기준

- 이 문서는 나의 책장 MVP를 구현할 때 화면과 컴포넌트의 책임, 상태, API 경계를 정리한다.
- 제품 정책은 `client/docs/product-prd.md`, 화면 흐름은 `client/docs/user-flow.md`, 클릭·오류 명세는 `client/docs/click-unit-ui-spec.md`를 따른다.
- P0는 책장과 세션 기록의 저장·조회·재개를 먼저 완성한다. 책이 꺼내져 펼쳐지는 모션, 테마, 친구 서재는 이 구조에 의존하지 않도록 후속으로 분리한다.

## 화면과 컴포넌트 구조

```text
AppShell
├─ AppHeader
├─ OnboardingScreen
├─ BookshelfScreen
│  ├─ ContinueReadingCard
│  ├─ ReadingActivityCalendar (P1)
│  ├─ ShelfSection
│  │  ├─ BookSpine
│  │  └─ EmptyShelf
│  └─ AddBookDialog
│     └─ AddBookForm
├─ BookDetailScreen
│  ├─ BookVisual
│  ├─ BookmarkSummary
│  ├─ StartReadingPanel
│  ├─ SessionRecordPage
│  ├─ FinalReviewPreview
│  └─ SessionRecordDialog
│     └─ SessionRecordForm
└─ Toast and Dialog Layer
```

P1 이후에는 `TimerPanel`, `CompletionReviewDialog`, `CompletionReviewForm`, `FinalReviewPage`, `ReadingActivityCalendar`, `ArchiveBookDialog`, `LatestRecordActions`를 같은 구조에 추가한다. P2에서는 `QuoteCapture`, `OcrReviewDialog`, `TagInput`, `TagChip`, `ThoughtCollectionScreen`, `ReadingFootprint`를 추가한다. 친구 서재와 책장 커스터마이징은 P0 컴포넌트에 조건을 누적하지 않고 별도 화면과 모델로 설계한다.

## 상태 분류

### 서버 상태

서버 응답이 기준이며, 저장 성공 전에 화면을 완료 상태로 바꾸지 않는다.

```text
user
- id, nickname

bookshelf
- books: BookSummary[]

bookDetail
- book: Book
- records: ReadingRecord[]
```

`BookSummary`에는 목록에서 바로 재개 행동을 만들기 위한 `latestRecord`, `nextStartPage`, `recordCount`를 포함한다. 책 상세를 열 때마다 각 책을 다시 요청하지 않도록 목록 API가 필요한 요약을 반환한다.

### 화면 상태

```text
route: onboarding | bookshelf | bookDetail
pathname: / | /bookshelf | /books/{bookId}
selectedBookId
isAddBookOpen
isRecordDialogOpen
isReadingContextActive
isSubmitting
loadError
toast
```

### draft 상태

```text
bookDraft
- title
- author
- initialPage

recordDraft
- endPage
- startPageOverride: nullable
- impression
- quotes: { text: string, page: number | null }[] — P2 이후
- tags: string[] — P2 이후
```

### 파생 상태

```text
latestRecord
nextStartPage = latestRecord.endPage + 1, 없으면 book.initialPage
hasRecords
isEmptyBookshelf
```

`nextStartPage`는 `createdAt DESC, id DESC` 기준의 최신 기록에서 계산하는 제안값이다. 사용자는 다시 읽기·건너뛰기 예외에서만 새 기록 폼의 `startPageOverride`로 수정할 수 있으며, 이전 기록과 연속되는지 강제하지 않는다.

## 공통 컴포넌트

### AppShell

#### 책임

- 현재 사용자와 route를 읽고 온보딩, 내 책장, 책 상세를 전환한다.
- 전역 토스트와 공통 dialog 레이어를 관리한다.
- 서버 로딩·복구 상태를 화면별로 전달한다.

#### 주요 상태와 핸들러

- `user`, `route`, `pathname`, `selectedBookId`, `isReadingContextActive`, `toast`
- `onCompleteOnboarding`
- `onOpenBook`
- `onBackToBookshelf`
- `onShowToast`

#### 사용자 안내 책임

- 사용자가 현재 책장에서 보고 있는지, 책 안에서 기록을 보고 있는지 맥락을 잃지 않게 한다.
- 서버 오류를 집중 실패나 기록 실패로 표현하지 않는다.
- 화면 전환 뒤 새 화면의 `h1`에 포커스를 주고, 책장으로 돌아갈 때는 출발한 책등 또는 재개 CTA에 포커스를 돌린다.

#### P0 사용자 복구

- 첫 온보딩은 닉네임을 표시명으로 사용해 새 사용자를 만든다.
- 같은 브라우저에 보관한 `user.id`가 있을 때만 같은 책장을 복구한다. 닉네임으로 기존 사용자를 조회하지 않는다.

### AppHeader

#### 책임

- 서비스 이름과 `내 책장`으로 돌아가는 행동을 제공한다.
- P0에서는 메뉴, 친구, 알림을 넣지 않는다.

### PageRange

#### 책임

- `42–58쪽`처럼 페이지 범위를 일관된 형식으로 표시한다.
- 빈 감상 기록도 페이지 범위와 날짜만으로 의미 있게 보이게 한다.

## 온보딩과 책장

### OnboardingScreen

#### 책임

- 닉네임만으로 사용자를 시작하게 한다.
- 첫 화면에서 책장 꾸미기나 완독 보상보다 `마지막 책갈피에서 다시 시작`이라는 제품 가치를 설명한다.

#### 주요 상태

- `draftNickname`
- `nicknameError`
- `isSubmitting`

#### 주요 핸들러

- `onChangeNickname`
- `onSubmitNickname`

#### 표시 조건

- 공백 닉네임은 제출할 수 없다.
- 사용자 생성 요청 중에는 중복 제출을 막는다.

### BookshelfScreen

#### 책임

- 재방문 사용자의 가장 빠른 재개 지점을 제공한다.
- 읽는 중 책 목록을 보여 주고 책 등록 dialog를 연다.

#### 주요 props/state

- `books: BookSummary[]`
- `isLoading`
- `loadError`
- `isAddBookOpen`
- `onOpenBook`
- `onOpenAddBook`

#### 표시 우선순위

1. `ContinueReadingCard`
2. P1 이후 `ReadingActivityCalendar`
3. `ShelfSection`의 읽는 중 책
4. `AddBookDialog`
5. P1 이후 완독 선반
6. P1 이후 보관함

#### 사용자 안내 책임

- 여러 권 중 어느 것을 다시 열어야 하는지 recent card로 먼저 안내한다.
- 빈 상태를 부족함이나 실패가 아니라 첫 책을 꽂을 자리로 설명한다.

### ContinueReadingCard

#### 책임

- 가장 최근 기록이 있는 읽는 중 책에서 읽기 준비 상태를 한 번의 행동으로 시작하게 한다.

#### 주요 props

- `book`
- `latestRecord`
- `nextStartPage`
- `onContinue`

#### 표시 정보

- 책 제목
- 마지막 페이지와 기록 날짜
- 최근 감상이 있으면 한 줄
- CTA: `{nextStartPage}쪽부터 이어 읽기`

#### 상호작용 규칙

- 카드 표면은 정보를 묶는 컨테이너이며, 내부의 재개 CTA만 클릭 가능하게 한다.
- `onContinue`는 `/books/{bookId}`로 이동하고 `isReadingContextActive = true`를 만든다.

#### 표시 조건

- 기록이 있는 `READING` 책이 있으면 가장 최근 기록의 책을 표시한다.
- 기록이 있는 책이 없고 `READING` 책이 있으면, 가장 최근에 추가한 새 책을 `처음 읽기` CTA로 표시한다.
- `READING` 책이 없을 때만 이 영역을 숨기고 `EmptyShelf`의 CTA를 우선한다.

### ShelfSection

#### 책임

- 같은 상태의 책을 최근 기록 순서로 묶어 보여 준다.
- P0에서는 `READING`만 다루고, P1에서 `COMPLETED`, `ARCHIVED`를 추가한다.

#### 주요 props

- `title`
- `books`
- `emptyMessage`
- `onOpenBook`

### BookSpine

#### 책임

- 책장 목록에서 한 권을 인식하고 책 상세로 이동시키는 상호작용 가능한 책등이다.
- 좁은 책등의 정보 밀도를 낮추고, 제목과 다음 시작 위치만 보여 준다.

#### 주요 props

- `book`
- `nextStartPage`
- `onOpen`

#### 표시 정보

- 책 제목
- 다음 시작 페이지 또는 `첫 읽기`

#### 구현 기준

- 색상과 폭은 `book.id`에서 결정해 새로고침 뒤에도 같은 책을 시각적으로 인식하게 한다.
- `/books/{bookId}`로 가는 링크로 구현하며, 제목·선택적 저자·등록일·다음 시작 페이지를 접근 가능한 이름으로 제공한다.
- 제목과 저자가 모두 같은 책은 상세의 보조 정보에서 등록일을 보여 구별한다.
- 날짜·감상·기록 수는 좁은 책등에 넣지 않고 `ContinueReadingCard`와 상세 화면에서 보여 준다.

### EmptyShelf

#### 책임

- 빈 책장에 하나의 명확한 다음 행동을 제시한다.

#### 주요 props

- `onAddBook`

#### 문구

- 제목: `첫 책이 들어올 자리예요.`
- CTA: `읽고 있는 책 추가`

### AddBookDialog / AddBookForm

#### 책임

- 새 책을 최소 입력으로 등록하고 책 상세로 이동한다.

#### 주요 상태

- `bookDraft.title`
- `bookDraft.author`
- `bookDraft.initialPage`
- `validationErrors`
- `isSubmitting`

#### 주요 핸들러

- `onChangeTitle`
- `onChangeAuthor`
- `onChangeInitialPage`
- `onSubmit`
- `onCancel`

#### 검증과 사용자 안내

- 제목은 공백 제거 후 1자 이상이다.
- 저자는 비워 둘 수 있다.
- 시작 페이지 기본값은 1이며, 이미 읽던 책을 등록하는 경우 변경할 수 있다.
- 저장 실패 시 입력값을 유지한다.

## 책 상세와 세션 기록

### BookDetailScreen

#### 책임

- 한 권의 책을 펼친 독서 노트처럼 보여 준다.
- 가장 최근 책갈피에서 다시 읽기와 세션 기록 저장을 연결한다.

#### 주요 props/state

- `book`
- `records`
- `nextStartPage`
- `isLoading`
- `isRecordDialogOpen`
- `isReadingContextActive`
- `onOpenRecordDialog`
- `onStartReading`
- `onBackToBookshelf`

#### 표시 우선순위

1. `BookVisual`과 제목
2. `BookmarkSummary`
3. `StartReadingPanel`
4. `SessionRecordPage` 목록
5. `FinalReviewPreview`

#### 사용자 안내 책임

- 세션 기록을 시간순으로 쌓아 독서 노트처럼 보이게 한다.
- 기록을 모두 읽게 하기 전에 최근 책갈피와 이어 읽기 CTA를 먼저 보여 준다.

### BookVisual

#### 책임

- 책 상세의 제목, 선택적 저자, 상태를 보여 준다.
- P0에서는 외부 표지 이미지·디자인 해금과 결합하지 않고, `BookSpine`의 큰 변형 또는 단순한 텍스트 책 식별자로 구현한다.

### BookmarkSummary

#### 책임

- 마지막으로 읽은 위치와 최근 감상을 요약한다.

#### 주요 props

- `latestRecord`
- `nextStartPage`
- `initialPage`

#### 표시 조건

- 기록이 있으면 `지난번 {endPage}쪽까지 읽었어요.`를 표시한다.
- 기록이 없으면 `{initialPage}쪽부터 시작해 볼까요?`를 표시한다.

### StartReadingPanel

#### 책임

- 사용자가 다음 시작 페이지를 확인하고 읽기·기록 흐름을 시작하게 한다.
- P0에서는 타이머를 강제하거나 집중을 판정하지 않는다.

#### 주요 props

- `nextStartPage`
- `onOpenRecordDialog`
- `isReadingContextActive`
- `onStartReading`
- `timerAvailable` — P1 이후

#### CTA 정책

- 주 CTA: `{nextStartPage}쪽부터 이어 읽기`
- 읽은 뒤 CTA: `이번 읽기 기록 남기기`
- 타이머는 P1에서만 `집중 시간 정하기(선택)`으로 추가한다.
- 주 CTA를 누르면 `isReadingContextActive`를 시작하고 `다 읽고 돌아오면 기록을 남겨 주세요.` 안내와 기록 CTA를 보여 준다. 일반 책등 클릭은 이 상태를 만들지 않는다.

### SessionRecordPage

#### 책임

- 하나의 세션 기록을 책 안의 한 장으로 표시한다.

#### 주요 props

- `record`

#### 표시 정보

- 기록 날짜
- `PageRange`
- 선택적인 짧은 감상

#### 표시 조건

- 감상이 비어 있으면 감상 영역을 만들지 않는다.
- 목록은 오래된 기록부터 보여 준다.
- P1에서만 가장 최근 기록에 `LatestRecordActions`를 연결한다. 이전 기록은 읽기 전용이다.

### SessionRecordDialog / SessionRecordForm

#### 책임

- 페이지 범위와 선택적 감상을 받아 서버에 저장한다.

#### 주요 props/state

- `bookId`
- `nextStartPage`
- `recordDraft.endPage`
- `recordDraft.startPageOverride`
- `recordDraft.impression`
- `recordDraft.quotes` — P2 이후
- `recordDraft.tags` — P2 이후
- `validationErrors`
- `isSubmitting`
- `onSave`
- `onCancel`

#### 검증 정책

- 끝난 페이지는 1 이상의 정수다.
- 끝난 페이지는 자동 시작 위치 또는 사용자가 바꾼 시작 위치보다 작을 수 없다.
- 감상은 선택이다.
- P2에서 글귀와 생각 태그는 선택이며, 생각 태그는 최대 3개다.
- 감상 없이 저장해도 성공한다.

#### 시작 위치 예외 처리

- 기본 시작 위치는 `nextStartPage`이며 입력 필드로 노출하지 않는다.
- 다시 읽기나 건너뛰기가 필요할 때만 `시작 위치 직접 바꾸기`를 열어 `startPageOverride`를 입력한다.
- 끝난 페이지 입력 뒤에는 계산된 `startPage–endPage` 범위를 미리 보여 준다.
- 범위와 `endPage - startPage + 1`로 계산한 페이지 수는 `role="status"`로 알린다.

#### 성공과 실패 처리

- `POST /api/books/{bookId}/records`가 성공하면 dialog를 닫고, 서버 응답 기준의 새 기록과 `nextStartPage`를 책 상세에 반영한다.
- 실패하면 입력값을 유지하며 오류와 재시도 CTA를 보여 준다.
- 응답이 불확실하게 끊기면 같은 저장을 자동 재시도하지 않고 `getBook`으로 먼저 서버 기록을 확인한다.

### FinalReviewPreview

#### 책임

- 완독 뒤 열릴 마지막 서평 페이지를 P0에서 부담 없이 예고한다.

#### 표시 정책

- `완독하면 이 책의 마지막 장에 긴 서평을 남길 수 있어요.`라는 한 줄 안내만 표시한다.
- P0에서는 잠금 해제, 긴 서평 저장, 완독 상태 변경을 수행하지 않는다.

## P1 이후 컴포넌트

### ReadingActivityCalendar

- 최근 12주의 기록 날짜를 GitHub 잔디형 격자로 보여 준다.
- `reading_records.createdAt`을 날짜별로 묶어 기록 수를 계산한다.
- 빈 날짜는 실패나 결석으로 표시하지 않으며, 기록 수는 색 농도로만 구분한다.
- 날짜를 가리키면 날짜와 기록 수를 tooltip 또는 접근 가능한 설명으로 제공한다.

### TimerPanel

- 타이머는 `StartReadingPanel`의 보조 기능이다.
- 상태는 `durationMinutes`, `startedAt`, `remainingSeconds` 같은 일시 UI 상태로만 둔다.
- 타이머 종료나 중단은 기록 저장 가능 여부를 바꾸지 않는다.

### CompletionReviewDialog / FinalReviewPage

- `완독으로 옮기기`에서 책 상태를 `COMPLETED`로 바꾸고 선택적 긴 서평을 저장한다.
- 긴 서평을 쓰지 않아도 완독 처리는 가능하다.
- `FinalReviewPage`는 긴 서평과 시간순 세션 감상 모아보기를 함께 보여 준다.

### ArchiveBookDialog

- `잠시 보관하기`가 실패나 삭제가 아니라는 점을 설명하고 책 상태를 `ARCHIVED`로 바꾼다.
- 보관함에서는 `다시 읽는 중으로 옮기기`를 제공하며, 기록과 마지막 책갈피를 유지한다.
- 보관 확인과 다시 읽는 중 복귀 모두 성공한 서버 응답 뒤에만 선반을 갱신한다.

### LatestRecordActions

- 가장 최근 기록에만 수정·삭제 행동을 제공한다.
- 수정 또는 삭제가 성공하면 책 상세과 책장 목록을 다시 조회해 마지막 책갈피와 `nextStartPage`를 갱신한다.
- 이전 기록에는 이 행동을 노출하지 않는다.
- 수정 dialog는 기존 끝난 페이지와 감상을 채운다. 삭제는 다음 시작 페이지 재계산을 알리는 확인 dialog를 거친다.

## P2 글귀·생각 태그·모아보기 컴포넌트

### QuoteCapture / OcrReviewDialog

- `QuoteCapture`는 직접 입력과 카메라·이미지 OCR 진입점을 제공하고, 하나의 세션에 선택적인 글귀를 추가한다.
- `OcrReviewDialog`는 인식된 텍스트를 자동 저장하지 않고 문장 선택, 오탈자 수정, 선택적 책 속 페이지 입력을 받은 뒤 확정한다.
- OCR 요청 실패, 낮은 인식 정확도, 파일 형식·권한 오류는 각각 안내하고 직접 입력한 draft를 잃지 않는다.
- 클라이언트는 OCR 원본 이미지를 기본적으로 영구 상태에 보관하지 않으며, 서버도 별도 동의가 없는 한 추출 완료 뒤 폐기한다.

### TagInput / TagChip

- `TagInput`은 `위안`, `슬픔`, `따뜻함`, `깨달음` 같은 추천값과 직접 입력으로 세션 기록에 최대 3개의 선택 태그를 추가한다.
- 해시 기호를 강제하지 않고, 앞뒤 공백과 중복을 정리한다.
- `TagChip`은 책 상세의 기록 페이지와 생각 모아보기 결과에서 같은 표현으로 사용한다.

### ThoughtCollectionScreen

- 사용자가 특정 생각 태그와 연결된 자기 기록을 책과 무관하게 세션 단위로 모아 보는 화면이다.
- 결과에는 태그, 책 제목, 페이지 범위, 날짜, 짧은 감상과 저장한 글귀를 표시한다.
- P2의 API client는 태그 검색 결과와 OCR 요청 상태를 일반 책 상세 조회와 분리해 관리한다.

## API Client 경계

P0의 API client는 화면 컴포넌트에서 분리한다.

```text
createUser(input)
createBook(userId, input)
getBooks(userId, status)
getBook(bookId)
createReadingRecord(bookId, input)
```

- `BookshelfScreen`은 `getBooks` 결과를 읽고 `createBook` 성공 뒤 목록을 갱신한다.
- `BookDetailScreen`은 `getBook` 결과를 읽고 `createReadingRecord` 성공 뒤 상세를 갱신한다.
- 서버 오류 형식과 loading/retry 처리는 API client와 화면의 경계에서 일관되게 처리한다.

P1에서는 다음 경계를 추가한다.

```text
updateBookStatus(bookId, status)
updateLatestReadingRecord(bookId, recordId, input)
deleteLatestReadingRecord(bookId, recordId)
```

- 기록 수정·삭제의 권한 여부와 갱신된 `nextStartPage` 계산은 서버가 판단한다.
