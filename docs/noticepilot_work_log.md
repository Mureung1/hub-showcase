# NoticePilot 작업 정리

작성일: 2026-07-07  
브랜치: `N153_전홍찬`  
기준 지시서: `/Users/chan/Downloads/noticepilot_wiki_codex_package/04_Codex_Followup_Instructions.md`

## 1. 현재 상태 요약

NoticePilot은 기존 React + Vite UI skeleton을 유지한 상태에서, 프론트엔드 MVP follow-up 범위와 Express mock analyze API skeleton, 그리고 frontend ↔ server mock analyze wiring까지 반영한 상태입니다.

이전 프론트엔드 MVP 1차 기준에서는 기존 React + Vite UI skeleton을 유지한 상태에서, 처음 제공된 follow-up 구현 지시서의 프론트엔드 MVP 범위를 대부분 반영한 상태였습니다. 해당 기준선은 아래 3개 커밋으로 먼저 정리되었습니다.

```text
8a89b10 Add NoticePilot utility helpers
56252c0 Add review warnings and export UI
8ba1440 Wire NoticePilot follow-up workflow
```

문서 최신화 시작 전 작업 트리는 clean 상태였으며, 현재 구현 기준선은 아래 커밋 흐름으로 정리됩니다.

```text
8a89b10 Add NoticePilot utility helpers
56252c0 Add review warnings and export UI
8ba1440 Wire NoticePilot follow-up workflow
78f5b09 Fix major frontend MVP QA issues
3ec0079 Add Express analyze API skeleton
8f4207b Fix backend analyze API QA issues
fe70e46 Wire frontend server mock analysis
8fd7578 Update work log for server mock wiring
ff666ff Update README for server mock wiring
```

최근 검증 기준:

```text
npm run build
npm run dev:server
npm run dev
GET /api/health
POST /api/analyze
```

Phase 3 QA에서 build, backend health, backend mock analyze, `mode=ai` 501 응답, unsupported mode 400 응답, Vite `/api` proxy, client-side mock flow, server mock flow, overwrite/privacy confirmation, server unavailable error 표시를 확인했습니다.

이전 프론트엔드 MVP 1차 검증에서는 아래 명령의 정상 통과를 확인했습니다.

```text
npm run build
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

Frontend MVP 1차 구현 당시 명시적으로 추가하지 않은 항목:

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
- 당시 다음 단계로 Express/AI/PDF/HWP/OCR 등을 남은 작업으로 정리

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

상태: 완료

구현 내용:

- Express dependency 추가
- `npm run dev:server`, `npm run start:server` script 추가
- `server/src/index.js` 추가
- `GET /api/health` endpoint 추가
- `POST /api/analyze` endpoint 추가
- mock analysis service와 AI service stub 분리
- `mode=mock` 기본 응답 지원
- `mode=ai`는 아직 실제 AI 호출 없이 `501 ai_not_implemented`로 차단
- unsupported mode는 `400 unsupported_mode`로 처리
- server response에도 `validateAnalysisResult` 적용
- section limit, duplicate calendar event 제거, missing field normalize 적용

관련 태그:

- 초기 구현 태그: `express-analyze-skeleton-v1`
- QA fix 포함 태그: `express-analyze-skeleton-qa-v1`

### 18. Manual AI Response Validation

상태: 부분 완료 / backend mock response validation 완료

현재 구현:

- frontend utility로 `src/utils/validateAnalysisResult.js` 구현
- backend utility로 `server/src/utils/validateAnalysisResult.js` 구현
- missing arrays normalize
- missing strings normalize
- booleans normalize
- missing IDs 생성
- duplicate calendar events 제거
- section limits 적용
- warnings 생성
- server validation warning message 안정화
- invalid 또는 누락된 nested object를 안전하게 normalize

남은 작업:

- frontend/server validation utility 공유 구조 검토
- 실제 AI API response validation과 연결
- AI prompt/schema hardening
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

- Frontend MVP 1차 구현 당시에는 `npm install`을 실행하지 않았습니다.
- Frontend MVP 1차 구현 당시에는 의존성 변경이 없어 `package.json`, `package-lock.json`을 수정하지 않았습니다.
- 이후 Express Analyze API Skeleton 단계에서 Express dependency와 server scripts가 추가되었습니다.
- `npm run dev`는 sandbox port binding 제한으로 최초 실패했고, 승인 실행으로 정상 기동을 확인했습니다.

## 5. 현재 남은 핵심 작업

### 5.1 Real AI integration

아직 구현하지 않았습니다.

해야 할 일:

- AI API key는 browser에 노출하지 않음
- Express endpoint를 통해 AI call 수행
- AI prompt/schema hardening
- AI JSON response validation
- invalid JSON/error handling

### 5.2 Advanced extraction

아직 구현하지 않았습니다.

해야 할 일:

- PDF extraction
- HWP/HWPX extraction
- image OCR
- scanned PDF OCR
- 추후 `/api/extract` routing

### 5.3 Date resolution

부분 준비 상태입니다.

해야 할 일:

- absolute date extraction 정책 정교화
- relative date expression 계산
- reference date confidence 적용
- reviewRequired event UX 정리

### 5.4 School-level notice parsing

아직 구현하지 않았습니다.

해야 할 일:

- 학교별 공지 형식 차이 정리
- school-level notice parsing heuristic 또는 prompt rule 추가
- 공지 유형별 field confidence와 reviewRequired 기준 정리

### 5.5 Batch and subscription calendar export

아직 구현하지 않았습니다.

해야 할 일:

- checkbox 기반 batch `.ics` export
- subscription calendar feed 설계
- Google Calendar API 연동 여부는 별도 phase에서 결정

## 6. 주요 파일 역할

### `src/App.jsx`

- 전체 상태 관리
- `useState` 중심 구조 유지
- localStorage 저장/복원 연결
- mock analysis 실행
- server mock analysis 실행
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
- server mock analysis button

### `src/utils/analyzeApi.js`

- frontend server mock analyze API client
- `POST /api/analyze` 호출
- `mode: "mock"` request body 구성
- network / non-2xx / invalid response error normalization

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

### `vite.config.js`

- Vite React plugin 설정
- `/api` dev proxy를 `http://127.0.0.1:3001` Express server로 전달

### `server/src/index.js`

- Express app 생성
- JSON body limit `1mb` 적용
- `GET /api/health` 제공
- `/api/analyze` router mount
- server-level error response normalization
- 기본 실행 host/port: `127.0.0.1:3001`

### `server/src/routes/analyzeRoutes.js`

- `POST /api/analyze` route
- `mode: "mock"` / `mode: "ai"`만 허용
- unsupported mode를 `400 unsupported_mode`로 처리
- raw analysis result를 server-side validation 후 response로 반환

### `server/src/services/mockAnalysisService.js`

- Express server mock analysis result 생성
- 입력 language/title/text/metadata를 반영한 mock response 생성
- 실제 AI 호출 없이 frontend schema와 server validation 경로 검증

### `server/src/services/aiAnalysisService.js`

- 실제 AI integration을 위한 stub
- 현재 `mode: "ai"` 요청은 `501 ai_not_implemented`로 차단

### `server/src/utils/validateAnalysisResult.js`

- backend analysis result normalization
- missing field/default value 처리
- section limits와 duplicate calendar event 제거
- server validation warning 생성

## 7. 검증 로그

Frontend MVP 1차 마지막 확인 build:

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

참고:

- 최신 Phase 3 검증 결과는 16장에 별도로 정리했습니다.

## 8. 커밋 순서

현재 구현 기준 커밋:

```text
8a89b10 Add NoticePilot utility helpers
56252c0 Add review warnings and export UI
8ba1440 Wire NoticePilot follow-up workflow
78f5b09 Fix major frontend MVP QA issues
3ec0079 Add Express analyze API skeleton
8f4207b Fix backend analyze API QA issues
fe70e46 Wire frontend server mock analysis
8fd7578 Update work log for server mock wiring
ff666ff Update README for server mock wiring
```

각 커밋의 의도:

1. Utility helpers
   - behavior를 직접 UI에 연결하기 전 순수 함수와 검증 계층을 추가

2. Review warnings and export UI
   - 사용자에게 보이는 input, warning, error, evidence review, export UI를 추가

3. Follow-up workflow wiring
   - App 상태와 전체 사용자 흐름에 기능을 연결하고 README를 갱신

4. Frontend MVP QA fix
   - major QA issue를 수정하고 `frontend-mvp-followup-v1` 기준선을 고정

5. Express analyze API skeleton
   - `/api/health`, `/api/analyze`, mock service, AI stub, server validation을 추가

6. Backend QA fix
   - `mock` / `ai` mode 정책, `501 ai_not_implemented`, unsupported mode 400, server validation 안정성을 정리

7. Frontend server mock wiring
   - Vite `/api` proxy와 `src/utils/analyzeApi.js`를 통해 server mock 분석 버튼을 실제 Express mock endpoint에 연결

8. Documentation sync
   - server mock wiring 이후 작업 로그와 README를 현재 실행 방식에 맞게 갱신

## 9. 주의 사항

- 현재 구현은 frontend MVP, Express analyze API skeleton, Frontend ↔ Server mock analyze wiring을 포함합니다.
- frontend에는 기존 client-side mock analysis 버튼과 별도 server mock analysis 버튼이 함께 존재합니다.
- server mock analysis는 Vite `/api` proxy를 통해 Express `POST /api/analyze` mock mode를 호출합니다.
- 실제 AI 분석은 아직 없습니다.
- mock analysis flow는 의도적으로 유지되어 있습니다.
- `.ics` export는 all-day selected event만 지원합니다.
- time-specific event와 timezone handling은 아직 없습니다.
- Google Calendar API integration은 없습니다.
- localStorage에는 file object를 저장하지 않고 metadata만 저장합니다.

## 10. Frontend MVP QA 결과

상태: 완료

태그:

```text
frontend-mvp-followup-v1
```

관련 커밋:

```text
78f5b09 Fix major frontend MVP QA issues
```

QA 문서:

- `docs/qa/frontend-mvp-regression-checklist.md`
- `docs/qa/frontend-mvp-qa-backlog.md`

정리:

- Frontend MVP follow-up v1은 QA 기준선으로 태그 처리했습니다.
- major frontend QA issue는 `78f5b09`에서 수정했습니다.
- 기존 mock analysis flow, manual text paste flow, English/Korean UI, edit/delete/toggle/export 흐름은 유지했습니다.
- minor backlog는 별도 QA backlog 문서에 남겨두었습니다.

## 11. Express Analyze API Skeleton 구현

상태: 완료

초기 태그:

```text
express-analyze-skeleton-v1
```

관련 커밋:

```text
3ec0079 Add Express analyze API skeleton
```

구현 파일:

- `server/src/index.js`
- `server/src/routes/analyzeRoutes.js`
- `server/src/services/mockAnalysisService.js`
- `server/src/services/aiAnalysisService.js`
- `server/src/utils/validateAnalysisResult.js`
- `package.json`
- `package-lock.json`

구현 내용:

- Express server skeleton 추가
- `GET /api/health` 추가
- `POST /api/analyze` 추가
- mock analysis service 추가
- AI service stub 추가
- server-side analysis result validation 추가
- `npm run dev:server`, `npm run start:server` script 추가

범위 제한:

- 실제 AI API 호출은 아직 구현하지 않았습니다.
- frontend는 이후 Phase 3에서 server mock endpoint 호출 경로가 추가되었습니다.
- 기존 frontend mock analysis flow는 유지했습니다.

## 12. Backend QA 및 major issue 수정 결과

상태: 완료

QA fix 포함 태그:

```text
express-analyze-skeleton-qa-v1
```

Backend QA 단계 기준:

```text
8f4207b Fix backend analyze API QA issues
```

QA 문서:

- `docs/qa/backend-analyze-api-checklist.md`

수정 내용:

- backend analyze route에서 `mock` / `ai` mode만 허용하도록 정리했습니다.
- unsupported mode는 `400 unsupported_mode`로 응답합니다.
- `mode=ai`는 실제 AI 미구현 상태를 명확히 `501 ai_not_implemented`로 응답합니다.
- server validation utility가 누락/비정상 field를 더 안전하게 normalize하도록 수정했습니다.
- warning은 `{ type, message }` 구조를 유지합니다.
- section limit과 duplicate calendar event 제거가 server response에도 적용됩니다.

## 13. 태그 기준선

현재 기준선:

```text
frontend-mvp-followup-v1
express-analyze-skeleton-v1
express-analyze-skeleton-qa-v1
fe70e46 Wire frontend server mock analysis
8fd7578 Update work log for server mock wiring
ff666ff Update README for server mock wiring
```

문서 최신화 직전 HEAD:

```text
ff666ff Update README for server mock wiring
```

의미:

- `frontend-mvp-followup-v1`: Frontend MVP follow-up QA 완료 기준선
- `express-analyze-skeleton-v1`: Express `/api/analyze` skeleton 초기 구현 기준선
- `express-analyze-skeleton-qa-v1`: backend QA major issue 수정 완료 기준선
- `fe70e46`: Frontend ↔ Server mock analyze wiring 완료 커밋 기준선
- `8fd7578`: server mock wiring 내용을 작업 로그에 반영한 문서 기준선
- `ff666ff`: server mock wiring 내용을 README에 반영한 문서 기준선

참고:

- Phase 3 wiring에는 아직 별도 태그를 만들지 않았습니다.

## 14. 현재 남은 작업

현재 남은 핵심 작업:

- Real AI API integration
- AI prompt/schema hardening
- Advanced file extraction: PDF / HWP / HWPX / OCR
- Advanced date resolution
- School-level notice parsing
- Checkbox-based batch `.ics` export
- Subscription calendar feed

제거된 이전 남은 작업:

- Express `/api/analyze` skeleton
- Frontend ↔ Server mock analyze wiring

사유:

- Express Analyze API Skeleton은 `express-analyze-skeleton-v1`에서 구현 완료했습니다.
- backend QA major issue는 `express-analyze-skeleton-qa-v1`에서 수정 완료했습니다.
- Frontend ↔ Server mock analyze wiring은 `fe70e46`에서 구현 및 QA 완료했습니다.

## 15. Frontend ↔ Server Mock Analyze Wiring 구현

상태: 완료

관련 커밋:

```text
fe70e46 Wire frontend server mock analysis
```

구현 파일:

- `src/App.jsx`
- `src/components/NoticeInput.jsx`
- `src/data/localizedContent.js`
- `src/utils/analyzeApi.js`
- `vite.config.js`

구현 내용:

- 기존 `Analyze mock notice` / `샘플 공지 분석` client-side mock flow를 유지했습니다.
- 별도 `Analyze via server mock` / `서버 mock 분석` 버튼을 추가했습니다.
- `src/utils/analyzeApi.js`에서 `POST /api/analyze` 호출 유틸을 추가했습니다.
- request body에는 `mode: "mock"`, `language`, `noticeTitle`, `noticeText`, `extractedText`, `userSelectedNoticeType`, `noticePublicationDate`, `uploadedFileName`을 포함합니다.
- Vite dev proxy로 `/api` 요청을 `http://127.0.0.1:3001`에 전달합니다.
- server mock 분석에도 기존 overwrite confirmation을 적용했습니다.
- server mock 분석에도 privacy pattern confirmation을 적용했습니다.
- server response는 frontend `validateAnalysisResult` 경로를 통과한 뒤 `analysisResult`에 저장합니다.
- server warning과 frontend validation warning은 `analysisResult.warnings[]`에 보존합니다.
- server unavailable, non-2xx, unsupported mode, AI not implemented, invalid/empty response에 대한 input error copy를 추가했습니다.
- server mock loading state를 추가하고 server mock 버튼만 loading 중 disabled 처리합니다.

범위 제한:

- 실제 AI API 호출은 추가하지 않았습니다.
- `mode: "ai"`는 일반 사용자 UI로 노출하지 않았습니다.
- PDF / HWP / HWPX / OCR, DB, 로그인, Google Calendar API는 추가하지 않았습니다.
- `.ics` export 범위는 변경하지 않았습니다.

## 16. Phase 3 QA 결과

검증 명령:

```text
npm run build
git diff --check
npm run dev:server
npm run dev
```

확인 결과:

- `npm run build` 통과
- `git diff --check` 통과
- backend `GET /api/health` 정상 응답 확인
- backend `POST /api/analyze` mock mode 정상 응답 확인
- backend `mode: "ai"`는 기존대로 `501 ai_not_implemented` 유지
- backend unknown explicit mode는 기존대로 `400 unsupported_mode` 유지
- Vite `/api` proxy가 Express server로 요청을 전달하는 것 확인
- 기존 client-side mock analysis 버튼이 계속 동작하는 것 확인
- server mock analysis 버튼이 server mock result와 warning을 렌더링하는 것 확인
- server mock analysis에서 overwrite confirmation 동작 확인
- server mock analysis에서 privacy confirmation 동작 확인
- server unavailable 시 input error가 표시되고 결과가 생성되지 않는 것 확인
- server mock result 이후 edit/delete/task toggle/export 버튼 상태 확인
- English/Korean server mock button label 확인

## 17. 현재 남은 작업

현재 남은 핵심 작업:

- Real AI API integration
- AI prompt/schema hardening
- Advanced file extraction: PDF / HWP / HWPX / OCR
- Advanced date resolution
- School-level notice parsing
- Checkbox-based batch `.ics` export
- Subscription calendar feed

## 18. 다음 단계: Real AI API Integration / Prompt Schema Hardening

권장 다음 작업:

1. Express `mode: "ai"` 구현 범위와 provider 선택을 별도 phase로 확정합니다.
2. AI API key는 browser에 노출하지 않고 server-only env var로 처리합니다.
3. prompt output schema와 frontend/backend validation contract를 정리합니다.
4. invalid JSON, schema mismatch, provider failure, timeout 정책을 정합니다.
5. 기존 client-side mock과 server mock path는 regression 기준선으로 유지합니다.

주의:

- 실제 AI API integration은 server mock wiring과 분리된 다음 phase로 진행하는 것이 안전합니다.
- 인증, DB, 결제, Google Calendar API는 아직 scope에 포함하지 않습니다.
