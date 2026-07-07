# NoticePilot 작업 정리

작성일: 2026-07-07  
브랜치: `N153_전홍찬`  
기준 지시서: `/Users/chan/Downloads/noticepilot_wiki_codex_package/04_Codex_Followup_Instructions.md`

## 1. 현재 상태 요약

NoticePilot은 기존 React + Vite UI skeleton을 유지한 상태에서, 처음 제공된 follow-up 구현 지시서의 프론트엔드 MVP 범위를 대부분 반영한 상태입니다.

현재 작업 트리는 마지막 확인 기준 clean 상태였으며, 주요 변경은 아래 3개 커밋으로 순차 정리되었습니다.

```text
8a89b10 Add NoticePilot utility helpers
56252c0 Add review warnings and export UI
8ba1440 Wire NoticePilot follow-up workflow
```

검증 결과:

```text
npm run build
```

위 명령은 정상 통과했습니다.

개발 서버도 승인 실행으로 아래 명령의 정상 기동을 확인했습니다.

```text
npm run dev -- --host 127.0.0.1
```

## 2. 작업 전 기준 상태

작업 전 프로젝트에는 다음 기능이 이미 있었습니다.

- React + Vite 기반 UI skeleton
- English / Korean UI toggle
- 프로젝트 소개 섹션
- 공지 제목 및 본문 입력 UI
- mock notice analysis 버튼
- mock analysis dashboard
- editable extracted items
- item delete behavior
- task completion toggle
- calendar event selection toggle
- source evidence panel
- Markdown checklist download
- `.ics` export placeholder

원 지시서의 핵심 원칙에 따라 기존 동작은 제거하지 않고 유지했습니다.

유지한 항목:

- 기존 mock analysis flow
- bilingual UI
- edit/delete behavior
- task completion toggle
- calendar event selection toggle
- source evidence panel
- Markdown export
- manual text paste flow

명시적으로 추가하지 않은 항목:

- 인증
- 데이터베이스
- 결제
- Google Calendar API
- 실제 AI API 호출
- Express 백엔드

## 3. 커밋별 작업 내용

### 3.1 `8a89b10 Add NoticePilot utility helpers`

목적: UI 연결 전에 순수 유틸과 검증 계층을 먼저 추가했습니다.

추가 및 변경 파일:

- `src/utils/analysisHandlers.js`
- `src/utils/generateIcs.js`
- `src/utils/generateMarkdown.js`
- `src/utils/privacyPatterns.js`
- `src/utils/storage.js`
- `src/utils/validateAnalysisResult.js`

주요 작업:

- 분석 결과 항목 업데이트 로직을 순수 함수로 분리했습니다.
- `deadlines`, `tasks`, `submissions`, `requirements`, `cautions`, `calendarEvents` 배열을 지원하도록 했습니다.
- `toggleTaskCompleted`, `toggleCalendarEventSelected`, `updateCalendarEventField`를 추가했습니다.
- calendar event exact duplicate 제거 로직을 준비했습니다.
- `.ics` 파일 생성을 위한 `generateIcs` 유틸을 추가했습니다.
- selected calendar event 중 valid `startDate`가 있는 항목만 export 대상으로 삼도록 했습니다.
- all-day event 규칙을 적용했습니다.
- `DTSTART;VALUE=DATE:YYYYMMDD`
- `DTEND;VALUE=DATE:next day in YYYYMMDD`
- Markdown export에 evidence 포함 옵션을 추가했습니다.
- 기본 Markdown export는 기존처럼 간결하게 유지했습니다.
- 개인정보 패턴 감지 유틸을 추가했습니다.
- 이메일 주소 감지
- 전화번호 감지
- 주민등록번호 유사 문자열 감지
- `noticepilot:v1` localStorage 저장/복원 유틸을 추가했습니다.
- schema version 불일치 또는 parsing 실패 시 안전하게 초기화하도록 했습니다.
- analysis result 검증 유틸을 추가했습니다.
- missing arrays normalize
- missing strings normalize
- missing booleans normalize
- missing id 생성
- exact duplicate calendar event 제거
- section limit 적용
- normalization/filtering warning 생성

관련 지시서 항목:

- 2. State Management
- 6. Real ICS Export
- 7. Duplicate Calendar Event Handling
- 8. Warning Structure
- 10. Privacy Warning and Lightweight Pattern Detection
- 11. LocalStorage Persistence
- 12. User Edit Tracking
- 14. Markdown Export Improvement
- 16. Section Limits
- 18. Manual AI Response Validation
- 19. Date Resolution 준비

### 3.2 `56252c0 Add review warnings and export UI`

목적: 유틸을 사용할 수 있는 화면 컴포넌트, 경고/에러 UI, export UI, bilingual copy, 스타일을 추가했습니다.

추가 및 변경 파일:

- `src/components/AnalysisDashboard.jsx`
- `src/components/ConfirmationModal.jsx`
- `src/components/EditableItemCard.jsx`
- `src/components/ErrorMessage.jsx`
- `src/components/EvidenceReview.jsx`
- `src/components/ExportPanel.jsx`
- `src/components/NoticeInput.jsx`
- `src/components/WarningBanner.jsx`
- `src/data/localizedContent.js`
- `src/styles.css`

주요 작업:

- `WarningBanner` 컴포넌트를 추가했습니다.
- warning은 `{ type, message }` 객체 배열을 표시하도록 했습니다.
- `ErrorMessage` 컴포넌트를 추가했습니다.
- 업로드 실패, unsupported file, file size limit, invalid `.ics` export 같은 차단성 문제를 error로 표시할 수 있게 했습니다.
- `ConfirmationModal` 컴포넌트를 추가했습니다.
- 기존 분석 결과 overwrite 확인에 사용할 수 있도록 했습니다.
- 개인정보 패턴 감지 후 계속 진행 여부 확인에 사용할 수 있도록 했습니다.
- `EvidenceReview` 컴포넌트를 추가했습니다.
- 기본 카드에는 evidence를 계속 숨겼습니다.
- 사용자가 원할 때 전체 evidence review를 열 수 있도록 했습니다.
- `AnalysisDashboard` 상단에 warning banner를 표시하도록 했습니다.
- summary는 기존처럼 dashboard 상단에 유지했습니다.
- `EditableItemCard`에 `edited` 표시 pill을 추가했습니다.
- `NoticeInput`을 확장했습니다.
- TXT / MD file input 추가
- Extract preview 추가
- privacy notice 추가
- notice type select 추가
- publication date input 추가
- warning/error 표시 영역 추가
- `ExportPanel`을 확장했습니다.
- Markdown evidence 포함 체크박스 추가
- `.ics` 다운로드 버튼 활성화
- export error 표시
- 한/영 localized copy를 추가했습니다.
- upload 문구
- privacy notice 문구
- warning/error 문구
- confirmation modal 문구
- dashboard warning/evidence review 문구
- export 문구
- edited 표시 문구
- 관련 CSS를 추가했습니다.
- warning banner
- error message
- privacy notice
- extract preview
- modal
- edited pill
- evidence review
- notice metadata layout

관련 지시서 항목:

- 3. TXT / MD File Upload
- 4. Notice Type Input
- 5. Notice Publication Date Input
- 8. Warning Structure
- 9. Error vs Warning Policy
- 10. Privacy Warning and Lightweight Pattern Detection
- 12. User Edit Tracking
- 13. New Notice Overwrite Policy
- 14. Markdown Export Improvement
- 15. Evidence Display
- 20. Summary Display

### 3.3 `8ba1440 Wire NoticePilot follow-up workflow`

목적: 새 유틸과 UI 컴포넌트를 `App.jsx` 흐름에 연결하고 README를 현재 구현 상태에 맞게 갱신했습니다.

추가 및 변경 파일:

- `src/App.jsx`
- `README.md`

주요 작업:

- `sourceText` 중심 흐름을 `extractedText` 중심 흐름으로 전환했습니다.
- manual paste flow는 유지했습니다.
- TXT / MD 업로드 파일을 FileReader로 읽어 `extractedText`에 반영하도록 연결했습니다.
- 업로드 파일명은 `uploadedFileName` metadata로만 저장했습니다.
- unsupported extension은 error로 처리했습니다.
- 1MB 초과 파일은 error로 처리했습니다.
- file read failure도 error로 처리했습니다.
- `userSelectedNoticeType` state를 추가하고 analysis metadata에 연결했습니다.
- 선택하지 않은 경우 `unknown`으로 전달되도록 했습니다.
- `noticePublicationDate` state를 추가하고 analysis metadata에 연결했습니다.
- analysis result validation을 mock result 저장 전에 적용했습니다.
- validation result의 warnings를 `analysisResult.warnings[]`에 저장하도록 했습니다.
- 개인정보 패턴 감지를 분석 전 흐름에 연결했습니다.
- 감지 시 warning banner를 표시했습니다.
- 감지 시 confirmation modal로 계속 진행 여부를 확인했습니다.
- 기존 analysis result가 있을 때 새 mock analysis를 실행하면 overwrite confirmation modal을 띄우도록 했습니다.
- confirm 시 새 result로 교체했습니다.
- cancel 시 기존 상태를 유지했습니다.
- localStorage 저장/복원을 연결했습니다.
- key: `noticepilot:v1`
- language 저장
- noticeTitle 저장
- extractedText/sourceText 저장
- uploadedFileName 저장
- userSelectedNoticeType 저장
- noticePublicationDate 저장
- analysisResult 저장
- clear 시 localStorage도 초기화했습니다.
- 기존 item update/delete 흐름을 `analysisHandlers` 유틸로 교체했습니다.
- task completed toggle 유지
- calendar event selected toggle 유지
- user edit 시 `edited: true` 반영
- `.ics` export 오류를 App의 blocking error 상태와 연결했습니다.
- README를 현재 구현 상태에 맞게 갱신했습니다.
- `.ics export placeholder` 제거
- TXT / MD upload 반영
- 실제 `.ics` export 반영
- localStorage 복원 반영
- 다음 단계에서 Express/AI/PDF/HWP/OCR 등을 남은 작업으로 정리

관련 지시서 항목:

- 1. Development Rules
- 2. State Management
- 3. TXT / MD File Upload
- 4. Notice Type Input
- 5. Notice Publication Date Input
- 6. Real ICS Export
- 7. Duplicate Calendar Event Handling
- 8. Warning Structure
- 9. Error vs Warning Policy
- 10. Privacy Warning and Lightweight Pattern Detection
- 11. LocalStorage Persistence
- 12. User Edit Tracking
- 13. New Notice Overwrite Policy
- 14. Markdown Export Improvement
- 15. Evidence Display
- 16. Section Limits
- 19. Date Resolution 준비
- 20. Summary Display
- 21. Build and Regression Requirements

## 4. 원 지시서 항목별 진행 상태

### 1. Development Rules

상태: 완료

보존한 동작:

- mock analysis flow
- bilingual UI
- edit/delete behavior
- task completion toggle
- calendar event selection toggle
- source evidence panel
- Markdown export
- manual text paste

추가하지 않은 항목:

- authentication
- database
- payment
- Google Calendar API

### 2. State Management

상태: 완료

구현 내용:

- `App.jsx + useState` 구조 유지
- `useReducer`, Context, Zustand, Redux, custom hook 도입 없음
- 반복 update/delete/toggle 로직을 `src/utils/analysisHandlers.js`로 분리

### 3. TXT / MD File Upload

상태: 완료

구현 내용:

- `.txt`, `.md`만 accept
- unsupported extension reject
- 1MB limit 적용
- FileReader 기반 client-only read
- 서버 업로드 없음
- 업로드 직후 자동 분석 없음
- file content를 `extractedText`에 반영
- file object 저장 없음
- file name만 metadata로 저장
- Extract preview 표시
- 사용자가 분석 전 텍스트를 확인/수정할 수 있음

### 4. Notice Type Input

상태: 완료

구현 내용:

- optional notice type select 추가
- 지원 값:
- `school_notice`
- `assignment`
- `scholarship`
- `competition`
- `job_posting`
- `other`
- state 이름: `userSelectedNoticeType`
- 선택하지 않으면 `unknown`으로 analysis metadata에 반영
- `detectedNoticeType` 필드 준비
- advanced routing은 구현하지 않음

### 5. Notice Publication Date Input

상태: 완료

구현 내용:

- optional publication date input 추가
- state 이름: `noticePublicationDate`
- analysis metadata에 반영
- 상대 날짜 자동 계산은 구현하지 않음

### 6. Real ICS Export

상태: 완료

구현 내용:

- 기존 disabled placeholder를 실제 `.ics` 다운로드로 교체
- selected calendar events만 포함
- valid `startDate`가 있는 event만 포함
- all-day event만 지원
- timezone/time-specific event 미지원
- Google Calendar API 미연동
- valid selected event가 없으면 error 표시 후 다운로드하지 않음

적용 규칙:

```text
DTSTART;VALUE=DATE:YYYYMMDD
DTEND;VALUE=DATE:next day in YYYYMMDD
```

### 7. Duplicate Calendar Event Handling

상태: 완료

구현 내용:

- exact duplicate만 제거
- 기준: `title + startDate`
- 첫 번째 event 유지
- 이후 duplicate 제거
- 제거 시 warning 추가
- fuzzy duplicate detection 미구현

### 8. Warning Structure

상태: 완료

구현 내용:

```js
{
  type: "",
  message: ""
}
```

- plain string warning 미사용
- `analysisResult.warnings[]`를 analysis warning 저장 위치로 사용
- full severity/linking system은 구현하지 않음

### 9. Error vs Warning Policy

상태: 완료

Error로 처리한 항목:

- unsupported file type
- file size limit exceeded
- file read failure
- `.ics` export attempted with no valid selected event

Warning으로 처리한 항목:

- duplicate calendar events removed
- normalized fields
- section limit applied
- privacy-like pattern detection

### 10. Privacy Warning and Lightweight Pattern Detection

상태: 완료

구현 내용:

- 분석 전 privacy notice 표시
- client-side pattern detection 추가
- email address
- phone number
- resident-registration-number-like strings
- 감지 시 warning banner와 confirmation modal 표시
- 자동 masking/editing 없음
- 사용자가 계속 진행 여부 결정

### 11. LocalStorage Persistence

상태: 완료

구현 내용:

- storage key: `noticepilot:v1`
- schema version 적용
- 저장 항목:
- language
- noticeTitle
- sourceText
- extractedText
- analysisResult
- selected calendar event state
- uploadedFileName
- userSelectedNoticeType
- noticePublicationDate
- parsing 실패 또는 schema version 불일치 시 안전 초기화
- file object 저장 없음

### 12. User Edit Tracking

상태: 완료

구현 내용:

- 사용자가 extracted item field를 수정하면 `edited: true`
- evidence field 유지
- 카드에 `Edited` / `수정됨` 표시
- original values/history 저장 없음

### 13. New Notice Overwrite Policy

상태: 완료

구현 내용:

- 기존 analysis result가 있을 때 새 mock analysis 실행 시 confirmation modal 표시
- confirm 시 현재 result 교체
- cancel 시 기존 state 유지
- single active notice analysis session 유지
- multiple saved notice projects 미구현

### 14. Markdown Export Improvement

상태: 완료

구현 내용:

- “Include evidence in Markdown” 옵션 추가
- 기본 export는 concise checklist 유지
- 옵션 활성화 시 각 item 아래 evidence text 포함
- full review-report export mode 미구현

### 15. Evidence Display

상태: 완료

구현 내용:

- 기본 item card에는 evidence 숨김 유지
- 기존 Evidence button/source evidence panel 유지
- 전체 Evidence Review mode 토글 추가
- 기본 화면을 evidence로 clutter하지 않음

### 16. Section Limits

상태: 완료

구현 내용:

```js
const SECTION_LIMITS = {
  deadlines: 8,
  tasks: 30,
  submissions: 20,
  requirements: 30,
  cautions: 20,
  calendarEvents: 12
};
```

- section limit 적용 유틸 추가
- 초과 항목은 저장하지 않고 trim
- `section_limit_applied` warning 추가
- `overflowItems` 미구현

### 17. Express /api/analyze Skeleton

상태: 보류

사유:

- 원 지시서에 “Add an Express server only if this task scope includes backend work”라고 되어 있음
- 현재 작업 범위에서는 backend 제외로 판단

남은 작업:

- `server/src/index.js`
- `server/src/routes/analyzeRoutes.js`
- `server/src/services/mockAnalysisService.js`
- `server/src/services/aiAnalysisService.js`
- `server/src/utils/validateAnalysisResult.js`
- `POST /api/analyze`

### 18. Manual AI Response Validation

상태: 부분 완료

현재 구현:

- frontend utility로 `src/utils/validateAnalysisResult.js` 구현
- missing arrays normalize
- missing strings normalize
- booleans normalize
- missing IDs 생성
- duplicate calendar events 제거
- section limits 적용
- warnings 생성

남은 작업:

- backend scope 진입 시 server utility로 이동 또는 공유 구조 정리
- AI API response validation과 연결
- Zod 도입 여부는 추후 결정

### 19. Date Resolution

상태: 준비 완료 / 실제 계산 미구현

현재 구현:

- `noticePublicationDate` metadata 추가
- calendar event에 date resolution 대비 필드 normalize:
- `reviewRequired`
- `dateConfidence`
- `dateSource`
- `referenceDate`
- `originalDateExpression`

남은 작업:

- 상대 날짜 실제 계산 로직
- reliable reference date 우선순위 적용
- vague expression 처리 정책 강화

### 20. Summary Display

상태: 완료

구현 내용:

- `summary` field 유지
- AnalysisDashboard 상단에 summary 표시 유지
- dashboard의 중심은 deadlines, tasks, submissions, requirements, cautions, calendar events 유지
- collapsible summary 미구현

### 21. Build and Regression Requirements

상태: 대부분 완료

확인 완료:

- `npm run build`
- `npm run dev -- --host 127.0.0.1`
- 기존 mock analysis flow 유지
- bilingual UI 유지
- edit/delete behavior 유지
- task completion toggle 유지
- calendar event selection toggle 유지
- evidence panel 유지
- Markdown export 유지
- real `.ics` export 구현
- TXT / MD upload 구현
- ExtractPreview 구현
- unsupported file type reject 구현

참고:

- `npm install`은 실행하지 않았습니다.
- 의존성 변경이 없어 `package.json`, `package-lock.json`은 수정하지 않았습니다.
- `npm run dev`는 sandbox port binding 제한으로 최초 실패했고, 승인 실행으로 정상 기동을 확인했습니다.

## 5. 현재 남은 핵심 작업

### 5.1 Backend scope

아직 구현하지 않았습니다.

해야 할 일:

- Express server skeleton 추가
- `/api/analyze` endpoint 추가
- mock analysis service와 real AI service stub 분리
- frontend mock analysis flow 유지
- validation을 server response에도 적용

### 5.2 Real AI integration

아직 구현하지 않았습니다.

해야 할 일:

- AI API key는 browser에 노출하지 않음
- Express endpoint를 통해 AI call 수행
- AI JSON response validation
- invalid JSON/error handling

### 5.3 Advanced extraction

아직 구현하지 않았습니다.

해야 할 일:

- PDF extraction
- HWP/HWPX extraction
- image OCR
- scanned PDF OCR
- 추후 `/api/extract` routing

### 5.4 Date resolution

부분 준비 상태입니다.

해야 할 일:

- absolute date extraction 정책 정교화
- relative date expression 계산
- reference date confidence 적용
- reviewRequired event UX 정리

## 6. 주요 파일 역할

### `src/App.jsx`

- 전체 상태 관리
- `useState` 중심 구조 유지
- localStorage 저장/복원 연결
- mock analysis 실행
- overwrite confirmation
- privacy confirmation
- file upload handling
- analysis result validation
- item update/delete 연결

### `src/components/NoticeInput.jsx`

- notice title input
- TXT / MD upload
- privacy notice
- ExtractPreview
- notice type select
- publication date input
- warning/error display
- mock analysis button

### `src/components/AnalysisDashboard.jsx`

- summary display
- warning banner
- evidence review toggle
- extracted item sections display

### `src/components/ExportPanel.jsx`

- Markdown download
- Markdown evidence option
- `.ics` download
- export error display

### `src/utils/validateAnalysisResult.js`

- analysis result normalization
- section limits
- duplicate calendar event handling
- validation warnings
- date resolution field defaults

### `src/utils/generateIcs.js`

- selected valid calendar events filtering
- all-day `.ics` generation

### `src/utils/storage.js`

- `noticepilot:v1` localStorage persistence
- schema version handling
- safe reset on parse/version failure

### `src/utils/privacyPatterns.js`

- email pattern detection
- phone pattern detection
- resident-registration-number-like pattern detection

### `src/utils/generateMarkdown.js`

- concise Markdown checklist export
- optional evidence export

## 7. 검증 로그

마지막 확인된 build:

```text
npm run build
```

결과:

```text
vite v8.1.3 building client environment for production...
✓ 50 modules transformed.
✓ built
```

유틸 확인:

- Markdown evidence option returns evidence text
- section limit trims tasks to 30 and adds `section_limit_applied`
- privacy pattern detection finds `email,phone`

개발 서버 확인:

```text
npm run dev -- --host 127.0.0.1
```

결과:

```text
VITE v8.1.3 ready
Local: http://127.0.0.1:5173/
```

## 8. 커밋 순서

현재 follow-up 작업 커밋:

```text
8a89b10 Add NoticePilot utility helpers
56252c0 Add review warnings and export UI
8ba1440 Wire NoticePilot follow-up workflow
```

각 커밋의 의도:

1. Utility helpers
   - behavior를 직접 UI에 연결하기 전 순수 함수와 검증 계층을 추가

2. Review warnings and export UI
   - 사용자에게 보이는 input, warning, error, evidence review, export UI를 추가

3. Follow-up workflow wiring
   - App 상태와 전체 사용자 흐름에 기능을 연결하고 README를 갱신

## 9. 주의 사항

- 현재 구현은 frontend MVP 범위입니다.
- Express backend는 아직 없습니다.
- 실제 AI 분석은 아직 없습니다.
- mock analysis flow는 의도적으로 유지되어 있습니다.
- `.ics` export는 all-day selected event만 지원합니다.
- time-specific event와 timezone handling은 아직 없습니다.
- Google Calendar API integration은 없습니다.
- localStorage에는 file object를 저장하지 않고 metadata만 저장합니다.
