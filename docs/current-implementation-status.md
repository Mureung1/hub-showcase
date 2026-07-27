# Current Implementation Status

> 기준일: 2026-07-27. 이 문서는 계획 문서보다 현재 코드와 머지된 기능을 우선해 설명합니다.

## 구현된 사용자 흐름

1. Google Identity Services 버튼으로 로그인하고 서버 `HttpSession`을 복구합니다.
2. Google Books 검색 결과에서 판본을 골라 읽는 중 책으로 등록합니다.
3. 읽는 중 책은 페이지에 통합된 3D 서가에서 선택합니다.
4. 책이 꺼내지고 펼쳐진 뒤 DOM 기반 상세 화면에서 마지막 책갈피부터 읽습니다.
5. 선택적 타이머, 끝난 페이지, 짧은 감상과 글귀를 독서 기록으로 저장합니다.
6. 완독·보관·복귀, 최신 기록 수정·삭제, 최근 12주 읽기 기록 달력을 사용할 수 있습니다.
7. 책장 오른쪽의 무작위 글귀 배너에서 해당 책을 다시 펼칠 수 있습니다.

글귀는 독서 기록과 같은 요청에서 만들 수 있지만 독립된 데이터로 저장됩니다. 기록을 삭제해도 글귀는 유지됩니다. `quote_exposures`는 배너 노출과 다시 펼치기 행동만 최소 범위로 측정합니다.

## 인증과 데이터 경계

- 브라우저는 Google ID token을 `POST /api/auth/google`에 한 번 전달합니다.
- 서버는 token의 대상 사용자와 서명을 검증한 뒤 사용자 ID를 `HttpSession`에 저장합니다.
- 이후 책·기록·글귀 요청에는 `userId`를 받지 않습니다. 서버가 세션 사용자와 리소스 소유권을 확인합니다.
- 상태 변경 요청은 세션 응답에서 받은 CSRF token을 `X-CSRF-Token`으로 보냅니다.
- 진행 중인 타이머만 `sessionStorage`에 남고, 사용자 데이터는 MySQL에 저장됩니다.

## 현재 공개 API

| 영역 | Method | Path |
| --- | --- | --- |
| 인증 | `POST` | `/api/auth/google` |
| 인증 | `GET` | `/api/auth/session` |
| 인증 | `POST` | `/api/auth/logout` |
| 책 | `GET` | `/api/books/search?q=` |
| 책 | `POST` | `/api/books` |
| 책장 | `GET` | `/api/bookshelf` |
| 책 | `GET` | `/api/books/{bookId}` |
| 책 | `PATCH` | `/api/books/{bookId}/status` |
| 기록 | `POST` | `/api/books/{bookId}/records` |
| 기록 | `PATCH` | `/api/books/{bookId}/records/{recordId}` |
| 기록 | `DELETE` | `/api/books/{bookId}/records/{recordId}` |
| 활동 | `GET` | `/api/reading-activity?from=&to=` |
| 글귀 | `GET` | `/api/quotes/random` |
| 글귀 | `GET` | `/api/books/{bookId}/quotes` |
| 글귀 | `POST` | `/api/books/{bookId}/quotes` |
| 글귀 | `PATCH` | `/api/quotes/{quoteId}` |
| 글귀 | `DELETE` | `/api/quotes/{quoteId}` |
| 측정 | `POST` | `/api/quote-exposures` |
| 측정 | `POST` | `/api/quote-exposures/{exposureId}/open` |

## 프런트엔드 구조

`App.jsx`는 세션 복구와 최상위 화면 전환만 담당합니다.

```text
App
├─ OnboardingPage
└─ BookshelfPage
   ├─ AddBookDialog
   ├─ ReadingBookshelf
   │  ├─ ThreeBookshelf
   │  └─ ReadingActivityCalendar
   └─ BookDetailScreen
      ├─ TimerPanel
      ├─ SessionRecordDialog
      └─ ReadingRecordList
```

3D는 읽는 중 책의 위치·선택·꺼내기·펼치기에만 사용합니다. 페이지 배경, 글귀 배너, 입력과 상세 정보는 DOM으로 유지합니다. 3D 모듈은 지연 로딩하며 DPR 상한을 두고, `prefers-reduced-motion` 사용자는 펼치기 연출을 건너뜁니다.

## 남은 검증과 후속 범위

- 로컬 Google 로그인부터 책 등록, 기록·글귀 저장, 글귀 기반 재개, 기록 정정, 완독·보관·복원과 새로고침 복구까지 2026-07-27 실제 브라우저에서 확인했습니다.
- 키보드 포커스 복귀와 요청 중 dialog 유지도 실제 브라우저와 회귀 테스트로 확인했습니다.
- 배포 환경 구성과 smoke test는 아직 완료하지 않았습니다.
- OCR, 생각 태그, 알림, 친구 서재와 확장된 독서 발자취는 현재 구현 범위가 아닙니다.
- 책 상세를 URL 상태로 복구하는 deep link는 필요가 확인될 때 구현합니다.
