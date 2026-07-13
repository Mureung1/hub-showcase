# NoticePilot Frontend MVP QA Checklist

작성일: 2026-07-07  
대상 브랜치: `N153_전홍찬`  
대상 단계: Frontend MVP Follow-up v1  
기준 작업 로그: `noticepilot_work_log.md`

---

## 1. QA 목적

이 문서는 NoticePilot의 **프론트엔드 MVP 1차 구현 상태**를 기준선으로 고정하고, 이후 backend, AI API, 파일 파싱, 날짜 계산, 학교별 batch export 기능을 추가할 때 기존 동작이 깨지지 않았는지 반복 확인하기 위한 QA 문서다.

이 문서의 목적은 단순히 버튼이 눌리는지 확인하는 것이 아니다. NoticePilot이 원래 지향한 목표, 즉 **긴 공지를 실행 가능한 체크리스트와 캘린더 일정 후보로 변환하고, 사용자가 검토·수정·선택한 뒤 export할 수 있는 흐름**이 유지되는지 확인하는 것이다.

---

## 2. 원래 목표지점

NoticePilot의 목표는 단순 요약 앱이 아니다.

목표 흐름은 다음과 같다.

```text
긴 공지
→ 구조화된 분석 결과
→ 사용자 검토/수정
→ 체크리스트 export
→ 선택 일정 .ics export
```

따라서 QA의 중점은 다음이다.

```text
- 사용자가 긴 공지 또는 TXT/MD 파일 내용을 입력할 수 있는가
- 분석 결과가 deadlines, tasks, submissions, requirements, cautions, calendarEvents로 구조화되어 보이는가
- 사용자가 추출 항목을 검토하고 수정하거나 삭제할 수 있는가
- 근거 evidence를 확인할 수 있는가
- Markdown checklist export가 가능한가
- 선택한 calendarEvents만 .ics로 export되는가
- 오류와 경고가 사용자의 다음 행동을 방해하지 않는 방식으로 표시되는가
- localStorage 복원으로 사용 중이던 작업 흐름이 유지되는가
```

---

## 3. 현재 QA 범위

이번 QA는 **frontend MVP follow-up v1**에 한정한다.

### 포함 범위

```text
- 기존 React + Vite UI skeleton 유지 여부
- manual text paste flow
- TXT / MD upload
- ExtractPreview
- mock analysis flow
- analysis dashboard
- item edit/delete
- edited marker
- task completion toggle
- calendar event selection toggle
- warning banner
- error message
- privacy warning and confirmation
- evidence panel
- full Evidence Review mode
- Markdown export
- Markdown evidence option
- real all-day .ics export
- localStorage persistence
- overwrite confirmation
- bilingual UI
```

### 제외 범위

```text
- Express backend
- real AI API call
- server-side validation
- PDF extraction
- HWP / HWPX extraction
- OCR
- advanced date resolution
- time-specific calendar events
- timezone handling
- Google Calendar API
- login / database
- school-level batch parsing
- checkbox-based batch .ics export
- subscription calendar feed
```

---

## 4. QA 통과 기준

이 단계는 다음 조건을 만족하면 통과로 판단한다.

```text
1. npm run build가 성공한다.
2. dev server가 정상 기동된다.
3. 기존 mock analysis flow가 유지된다.
4. TXT / MD 업로드 후 ExtractPreview가 표시된다.
5. unsupported file과 1MB 초과 파일이 차단된다.
6. 분석 결과 항목 수정/삭제/토글이 정상 작동한다.
7. warnings[]가 banner로 표시된다.
8. blocking error는 ErrorMessage로 표시된다.
9. Evidence는 기본 숨김이고, 필요할 때 확인 가능하다.
10. Markdown export가 정상 작동한다.
11. evidence 포함 Markdown export가 정상 작동한다.
12. 선택된 valid all-day calendarEvent만 .ics로 export된다.
13. valid selected event가 없으면 .ics 다운로드가 차단된다.
14. localStorage restore/reset이 정상 작동한다.
15. English/Korean UI toggle이 정상 작동한다.
```

---

## 5. 테스트 환경 기록

QA 실행 시 아래를 기록한다.

```text
Date:
Tester:
Branch:
Commit:
OS:
Browser:
Node version:
npm version:
```

예시:

```text
Date: 2026-07-07
Tester:
Branch: N153_전홍찬
Commit:
OS: macOS
Browser: Safari / Chrome
Node version:
npm version:
```

---

## 6. Build / Dev Server

| ID | Check | Expected Result | Status | Notes |
|---|---|---|---|---|
| B-01 | `npm install` | dependencies install successfully | [ ] Pass / [ ] Fail | 의존성 변경이 없으면 생략 가능 |
| B-02 | `npm run build` | production build succeeds | [ ] Pass / [ ] Fail |  |
| B-03 | `npm run dev -- --host 127.0.0.1` | Vite dev server starts | [ ] Pass / [ ] Fail |  |
| B-04 | App loads in browser | no blank screen / no fatal console error | [ ] Pass / [ ] Fail |  |

---

## 7. Existing Flow Regression

| ID | Check | Expected Result | Status | Notes |
|---|---|---|---|---|
| R-01 | App opens with default state | input area and project UI are visible | [ ] Pass / [ ] Fail |  |
| R-02 | Manual notice title input | title can be typed and edited | [ ] Pass / [ ] Fail |  |
| R-03 | Manual notice body input | body text can be typed and edited | [ ] Pass / [ ] Fail |  |
| R-04 | Mock analysis button | mock analysis result appears | [ ] Pass / [ ] Fail |  |
| R-05 | Existing mock flow preserved | prior user flow still works after new features | [ ] Pass / [ ] Fail |  |
| R-06 | Korean/English toggle | visible UI copy switches correctly | [ ] Pass / [ ] Fail |  |

---

## 8. File Input QA

| ID | Check | Expected Result | Status | Notes |
|---|---|---|---|---|
| F-01 | Upload `.txt` file | file content appears in ExtractPreview | [ ] Pass / [ ] Fail |  |
| F-02 | Upload `.md` file | file content appears in ExtractPreview | [ ] Pass / [ ] Fail |  |
| F-03 | Upload unsupported file | blocking error appears; file is not accepted | [ ] Pass / [ ] Fail |  |
| F-04 | Upload file larger than 1MB | blocking error appears; file is not accepted | [ ] Pass / [ ] Fail |  |
| F-05 | Upload does not auto-analyze | user must still click analysis button | [ ] Pass / [ ] Fail |  |
| F-06 | ExtractPreview editable | user can edit extracted text before analysis | [ ] Pass / [ ] Fail |  |
| F-07 | Uploaded file metadata | file name is stored as metadata only | [ ] Pass / [ ] Fail |  |
| F-08 | File object persistence | file object is not stored in localStorage | [ ] Pass / [ ] Fail |  |

---

## 9. Notice Metadata QA

| ID | Check | Expected Result | Status | Notes |
|---|---|---|---|---|
| M-01 | Notice type select | user can select school_notice / assignment / scholarship / competition / job_posting / other | [ ] Pass / [ ] Fail |  |
| M-02 | Empty notice type | empty selection is handled as unknown or safe default | [ ] Pass / [ ] Fail |  |
| M-03 | Publication date input | date can be entered and preserved | [ ] Pass / [ ] Fail |  |
| M-04 | Metadata survives analysis | noticeType and publicationDate are reflected in analysis metadata | [ ] Pass / [ ] Fail |  |

---

## 10. Analysis Dashboard QA

| ID | Check | Expected Result | Status | Notes |
|---|---|---|---|---|
| A-01 | Summary display | short summary appears near dashboard top | [ ] Pass / [ ] Fail |  |
| A-02 | Section rendering | deadlines, tasks, submissions, requirements, cautions, calendarEvents sections render | [ ] Pass / [ ] Fail |  |
| A-03 | Empty section behavior | empty sections do not crash UI | [ ] Pass / [ ] Fail |  |
| A-04 | Warning banner | `analysisResult.warnings[]` appears as banner | [ ] Pass / [ ] Fail |  |
| A-05 | Warning shape | warnings are displayed from `{ type, message }` objects | [ ] Pass / [ ] Fail |  |
| A-06 | Section limit warning | trimmed section creates `section_limit_applied` warning | [ ] Pass / [ ] Fail |  |
| A-07 | Duplicate event warning | exact duplicate event removal creates warning | [ ] Pass / [ ] Fail |  |

---

## 11. Item Interaction QA

| ID | Check | Expected Result | Status | Notes |
|---|---|---|---|---|
| I-01 | Edit item field | changed value is reflected immediately | [ ] Pass / [ ] Fail |  |
| I-02 | Edited marker | edited item shows Edited / 수정됨 marker | [ ] Pass / [ ] Fail |  |
| I-03 | Evidence preserved after edit | evidence text is not removed by editing | [ ] Pass / [ ] Fail |  |
| I-04 | Delete item | item is removed from section | [ ] Pass / [ ] Fail |  |
| I-05 | Toggle task completed | task completion state toggles correctly | [ ] Pass / [ ] Fail |  |
| I-06 | Toggle calendar event selected | event selected state toggles correctly | [ ] Pass / [ ] Fail |  |
| I-07 | Update calendar event field | title/date/description edits remain stable | [ ] Pass / [ ] Fail |  |

---

## 12. Evidence QA

| ID | Check | Expected Result | Status | Notes |
|---|---|---|---|---|
| E-01 | Evidence hidden by default | item cards do not show evidence text by default | [ ] Pass / [ ] Fail |  |
| E-02 | Card-level evidence panel | evidence can be opened from individual item | [ ] Pass / [ ] Fail |  |
| E-03 | Full Evidence Review mode | user can open full evidence review | [ ] Pass / [ ] Fail |  |
| E-04 | Evidence Review content | extracted items and evidence are shown together | [ ] Pass / [ ] Fail |  |
| E-05 | Evidence Review close | user can close evidence review and return to dashboard | [ ] Pass / [ ] Fail |  |

---

## 13. Privacy QA

테스트용 입력 예시:

```text
문의: test@example.com
전화: 010-1234-5678
주민등록번호 유사: 900101-1234567
```

| ID | Check | Expected Result | Status | Notes |
|---|---|---|---|---|
| P-01 | Privacy notice visible | privacy notice is visible before analysis | [ ] Pass / [ ] Fail |  |
| P-02 | Email pattern detection | email-like text triggers warning | [ ] Pass / [ ] Fail |  |
| P-03 | Phone pattern detection | phone-like text triggers warning | [ ] Pass / [ ] Fail |  |
| P-04 | RRN-like pattern detection | resident-registration-number-like string triggers warning | [ ] Pass / [ ] Fail |  |
| P-05 | Confirmation modal | user is asked whether to continue | [ ] Pass / [ ] Fail |  |
| P-06 | Continue after confirmation | analysis proceeds if user confirms | [ ] Pass / [ ] Fail |  |
| P-07 | Cancel after warning | analysis is canceled if user declines | [ ] Pass / [ ] Fail |  |
| P-08 | No automatic masking | original text is not automatically changed | [ ] Pass / [ ] Fail |  |

---

## 14. Markdown Export QA

| ID | Check | Expected Result | Status | Notes |
|---|---|---|---|---|
| MD-01 | Default Markdown export | Markdown file downloads successfully | [ ] Pass / [ ] Fail |  |
| MD-02 | Concise default | evidence is not included by default | [ ] Pass / [ ] Fail |  |
| MD-03 | Include evidence option | evidence appears when option is enabled | [ ] Pass / [ ] Fail |  |
| MD-04 | Korean text encoding | Korean text is not broken | [ ] Pass / [ ] Fail |  |
| MD-05 | Edited values | edited item values appear in export | [ ] Pass / [ ] Fail |  |

---

## 15. ICS Export QA

NoticePilot frontend MVP는 all-day event만 지원한다.

적용 규칙:

```text
DTSTART;VALUE=DATE:YYYYMMDD
DTEND;VALUE=DATE:next day in YYYYMMDD
```

| ID | Check | Expected Result | Status | Notes |
|---|---|---|---|---|
| ICS-01 | Export selected valid event | `.ics` file downloads | [ ] Pass / [ ] Fail |  |
| ICS-02 | Selected only | unselected events are excluded | [ ] Pass / [ ] Fail |  |
| ICS-03 | Valid startDate only | events without valid startDate are excluded | [ ] Pass / [ ] Fail |  |
| ICS-04 | No valid selected event | blocking error appears; no file downloads | [ ] Pass / [ ] Fail |  |
| ICS-05 | All-day format | file contains `DTSTART;VALUE=DATE` and `DTEND;VALUE=DATE` | [ ] Pass / [ ] Fail |  |
| ICS-06 | DTEND next day | one-day event uses next-day DTEND | [ ] Pass / [ ] Fail |  |
| ICS-07 | UID present | each VEVENT has UID | [ ] Pass / [ ] Fail |  |
| ICS-08 | UID stable | repeated export of same event keeps same UID | [ ] Pass / [ ] Fail |  |
| ICS-09 | Korean SUMMARY | Korean title is not broken in file | [ ] Pass / [ ] Fail |  |
| ICS-10 | DESCRIPTION escaping | line breaks, comma, semicolon, backslash do not break file structure | [ ] Pass / [ ] Fail |  |
| ICS-11 | Duplicate event removal | exact duplicate title + startDate is removed | [ ] Pass / [ ] Fail |  |
| ICS-12 | Calendar import smoke test | file imports into at least one calendar app | [ ] Pass / [ ] Fail | App: |

---

## 16. LocalStorage QA

| ID | Check | Expected Result | Status | Notes |
|---|---|---|---|---|
| LS-01 | Storage key | localStorage uses `noticepilot:v1` | [ ] Pass / [ ] Fail |  |
| LS-02 | State restore after refresh | notice text and analysis result restore | [ ] Pass / [ ] Fail |  |
| LS-03 | Language restore | selected language restores | [ ] Pass / [ ] Fail |  |
| LS-04 | Metadata restore | uploadedFileName, noticeType, publicationDate restore | [ ] Pass / [ ] Fail |  |
| LS-05 | Calendar selection restore | selected calendar events restore | [ ] Pass / [ ] Fail |  |
| LS-06 | Clear/reset | clear action removes saved state | [ ] Pass / [ ] Fail |  |
| LS-07 | Invalid saved value | invalid localStorage value fails safely | [ ] Pass / [ ] Fail |  |

---

## 17. Overwrite Confirmation QA

| ID | Check | Expected Result | Status | Notes |
|---|---|---|---|---|
| O-01 | Existing result detection | running new analysis with existing result opens confirmation modal | [ ] Pass / [ ] Fail |  |
| O-02 | Confirm overwrite | current result is replaced | [ ] Pass / [ ] Fail |  |
| O-03 | Cancel overwrite | current result remains unchanged | [ ] Pass / [ ] Fail |  |
| O-04 | Single active session | app does not create multiple saved projects | [ ] Pass / [ ] Fail |  |

---

## 18. Negative / Edge Case QA

| ID | Check | Expected Result | Status | Notes |
|---|---|---|---|---|
| N-01 | Empty notice body | app handles empty input safely | [ ] Pass / [ ] Fail |  |
| N-02 | Very short notice | app does not crash | [ ] Pass / [ ] Fail |  |
| N-03 | Very long but under-limit text | app remains responsive | [ ] Pass / [ ] Fail |  |
| N-04 | Missing analysis arrays | validation normalizes missing arrays to [] | [ ] Pass / [ ] Fail |  |
| N-05 | Missing string fields | validation normalizes missing strings to "" | [ ] Pass / [ ] Fail |  |
| N-06 | Missing event id | validation generates id | [ ] Pass / [ ] Fail |  |
| N-07 | Invalid calendar event | invalid event is filtered or blocked from export | [ ] Pass / [ ] Fail |  |
| N-08 | Section limit exceeded | lower-priority overflow items are trimmed and warning appears | [ ] Pass / [ ] Fail |  |

---

## 19. Known Non-goals for This QA Round

아래 항목이 동작하지 않는 것은 이번 QA 실패가 아니다. 다음 단계 또는 future scope다.

```text
- Express /api/analyze가 없음
- 실제 AI API 호출이 없음
- PDF/HWP/OCR 파일 파싱이 없음
- 상대 날짜 계산이 없음
- time-specific calendar event가 없음
- timezone handling이 없음
- 학교별 공지 자동 수집이 없음
- 학교별 체크박스형 batch .ics export가 없음
- calendar subscription feed가 없음
```

단, 이 항목들이 UI에서 이미 구현된 것처럼 오해되게 표시된다면 UX 이슈로 기록한다.

---

## 20. Calendar Tab / Campus Preferences QA

이 섹션은 공지 캘린더 탭, 관심 캠퍼스 설정, 그리고 분석 요청 시점의 사용자 설정 snapshot이 기존 단건 공지 분석 흐름을 깨뜨리지 않는지 확인한다.

### 20.1 Workspace Tab Routing

| ID | Check | Expected Result | Status | Notes |
|---|---|---|---|---|
| CT-01 | Empty hash `/` | URL is normalized to `#analyze`; single notice analysis is shown | [ ] Pass / [ ] Fail | `replaceState`라 뒤로가기 중복 이력 없음 |
| CT-02 | `#analyze` | single notice analysis tab is active | [ ] Pass / [ ] Fail |  |
| CT-03 | `#calendar` | calendar tab is active and renders full-width content | [ ] Pass / [ ] Fail | sidebar 없음 |
| CT-04 | Invalid hash | URL is normalized to `#analyze` | [ ] Pass / [ ] Fail | `replaceState` |
| CT-05 | Tab click history | clicking tabs changes hash; browser Back returns to previous tab | [ ] Pass / [ ] Fail |  |
| CT-06 | Header CTA | header CTA points to supported `#analyze` and reaches workspace | [ ] Pass / [ ] Fail | unsupported `#workspace` 없음 |
| CT-07 | Header brand link | brand link does not emit unsupported `#top` | [ ] Pass / [ ] Fail |  |

### 20.2 Calendar Tab UI

| ID | Check | Expected Result | Status | Notes |
|---|---|---|---|---|
| CAL-01 | Tab label | `공지 캘린더` tab has no `준비 중` badge | [ ] Pass / [ ] Fail |  |
| CAL-02 | Card order | calendar tab shows `관심 캠퍼스 설정` then `구독형 ICS` | [ ] Pass / [ ] Fail | only two cards |
| CAL-03 | No notice placeholder | no notice-list placeholder such as `공지 목록 준비 중` appears | [ ] Pass / [ ] Fail |  |
| CAL-04 | Campus subtitle | `강원대학교 기준` appears as subtitle, not a badge | [ ] Pass / [ ] Fail |  |
| CAL-05 | ICS status badge | only `구독형 ICS` card shows neutral `준비 중` badge | [ ] Pass / [ ] Fail | no button |
| CAL-06 | ICS body copy | body does not repeat `준비 중` and does not mention `크롤러` | [ ] Pass / [ ] Fail |  |
| CAL-07 | Card layout | cards are full-width, white, bordered, and inner content is left-aligned | [ ] Pass / [ ] Fail | 760px max inner width |

### 20.3 Campus Chip Behavior

| ID | Check | Expected Result | Status | Notes |
|---|---|---|---|---|
| CP-01 | Default selection | all campus chips are unselected on first visit | [ ] Pass / [ ] Fail | no localStorage created before change |
| CP-02 | Campus order | chips appear in order: 춘천, 삼척, 도계, 강릉원주 | [ ] Pass / [ ] Fail |  |
| CP-03 | Select chip | selected chip shows check mark and soft blue selected style | [ ] Pass / [ ] Fail |  |
| CP-04 | Deselect chip | selected chip can be deselected | [ ] Pass / [ ] Fail |  |
| CP-05 | All unselected | all campuses can be unselected without validation text | [ ] Pass / [ ] Fail |  |
| CP-06 | Accessibility | chips use native checkbox controls and are keyboard-focusable | [ ] Pass / [ ] Fail | visible focus style |
| CP-07 | Hidden checkbox technique | native checkbox is not `display: none` | [ ] Pass / [ ] Fail | visually hidden technique only |

### 20.4 Campus Preference Storage

| ID | Check | Expected Result | Status | Notes |
|---|---|---|---|---|
| CPS-01 | Storage key | campus preferences use `noticepilot:campus-preferences:v1` | [ ] Pass / [ ] Fail | separate from `noticepilot:v1` |
| CPS-02 | First visit | no campus preference localStorage is created before first campus change | [ ] Pass / [ ] Fail |  |
| CPS-03 | First change | first campus change creates campus preference localStorage | [ ] Pass / [ ] Fail |  |
| CPS-04 | Storage shape | payload has `version`, `activeInstitution`, and `institutionPreferences.kangwon` | [ ] Pass / [ ] Fail | no root `updatedAt` |
| CPS-05 | updatedAt timing | `updatedAt` changes only after user-initiated campus persistence | [ ] Pass / [ ] Fail |  |
| CPS-06 | Refresh restore | selected campuses restore after refresh | [ ] Pass / [ ] Fail |  |
| CPS-07 | Invalid campus ID | invalid stored IDs are ignored in app state | [ ] Pass / [ ] Fail | storage is not rewritten on read |
| CPS-08 | Duplicate campus ID | duplicates are removed in app state | [ ] Pass / [ ] Fail | fixed order |
| CPS-09 | Broken JSON | app falls back to defaults without UI error | [ ] Pass / [ ] Fail | invalid storage not removed on read |
| CPS-10 | Storage failure | failure text appears if persistence fails | [ ] Pass / [ ] Fail | current screen state still changes |
| CPS-11 | Clear notice | notice clear/reset does not clear campus preferences | [ ] Pass / [ ] Fail | `noticepilot:v1` only |
| CPS-12 | Success status | success text appears after save, refreshes on repeat save, and clears within cap | [ ] Pass / [ ] Fail | 5s / 8s cap |

### 20.5 Analyze Snapshot / Non-regression

| ID | Check | Expected Result | Status | Notes |
|---|---|---|---|---|
| SNAP-01 | Request payload | `/api/analyze` request includes `userPreferencesSnapshot` | [ ] Pass / [ ] Fail | exact field name |
| SNAP-02 | Snapshot source | snapshot uses current in-memory App state, not localStorage re-read | [ ] Pass / [ ] Fail | storage failure case included |
| SNAP-03 | Client mock metadata | client-side mock result includes `metadata.userPreferencesSnapshot` | [ ] Pass / [ ] Fail | output sections unchanged |
| SNAP-04 | Server metadata | server mock response includes normalized `metadata.userPreferencesSnapshot` | [ ] Pass / [ ] Fail | after backend server is running |
| SNAP-05 | Old saved results | saved analysis without `metadata.userPreferencesSnapshot` still restores and exports | [ ] Pass / [ ] Fail | no backfill required |
| SNAP-06 | Top-level metadata | `userSelectedNoticeType`, `noticePublicationDate`, `uploadedFileName`, `detectedNoticeType` remain top-level | [ ] Pass / [ ] Fail |  |
| SNAP-07 | Export unchanged | Markdown export remains unchanged by campus preferences | [ ] Pass / [ ] Fail |  |
| SNAP-08 | ICS export unchanged | `.ics` export remains unchanged by campus preferences | [ ] Pass / [ ] Fail |  |
| SNAP-09 | Analysis output unchanged | campus preferences do not alter mock analysis sections | [ ] Pass / [ ] Fail | inert metadata only |
| SNAP-10 | Campus constants | frontend/backend campus IDs match exactly | [ ] Pass / [ ] Fail | chuncheon, samcheok, dogye, gangneung_wonju |

---

## 21. QA Summary Template

QA 완료 후 아래를 작성한다.

```text
QA Date:
Tester:
Branch:
Commit:

Overall Result:
[ ] Pass
[ ] Conditional Pass
[ ] Fail

Critical Issues:
-

Major Issues:
-

Minor Issues:
-

Regression Risk:
[ ] Low
[ ] Medium
[ ] High

Recommended Next Action:
[ ] Tag current version
[ ] Fix issues then retest
[ ] Proceed to Express backend skeleton
[ ] Proceed to AI integration
[ ] Rework frontend UX before backend
```

---

## 22. Suggested Git Action After Passing QA

이 QA를 통과하면 현재 상태를 기준선으로 태그 처리한다.

```bash
git tag frontend-mvp-followup-v1
```

또는 별도 QA 브랜치를 유지한다.

```bash
git checkout -b frontend-mvp-qa
```

---

## 23. QA Reviewer Guidance

검토자는 기능 목록만 보지 말고 다음 질문을 중심으로 확인한다.

```text
1. 사용자가 긴 공지를 넣고 구조화된 결과를 검토할 수 있는가?
2. 추출 결과가 사용자의 행동으로 이어질 수 있는가?
3. evidence가 AI 결과 검증에 충분히 접근 가능한가?
4. export 결과가 실제로 쓸 수 있는 형태인가?
5. 오류와 경고가 구분되어 사용자의 다음 행동을 명확하게 하는가?
6. 이후 Express/AI/backend를 붙여도 현재 프론트 흐름이 유지될 구조인가?
```

이 질문에 대부분 긍정적으로 답할 수 있으면, frontend MVP follow-up v1은 QA 기준으로 통과 처리할 수 있다.

---

## 24. 2026-07-09 Calendar / Export QA Notes

이 실행 기록은 공지 캘린더 탭, 캠퍼스 설정 저장, Markdown export, `.ics` export에 대한 Codex 브라우저 QA 결과다.

### 실행 환경

```text
Date: 2026-07-09
App URL: http://127.0.0.1:5174/
Frontend command: npm run dev -- --host 127.0.0.1
Browser: Codex in-app browser
Language: Korean UI
```

### 통과 확인

```text
- #calendar 탭에서 캠퍼스 선택 UI가 렌더링됨
- 캠퍼스 선택을 춘천 + 도계로 변경하면 저장 완료 문구가 표시됨
- 새로고침 후에도 춘천 + 도계 선택 상태가 유지됨
- #calendar에서 #analyze로 브라우저 Back 이동이 동작함
- 샘플 공지 분석 전에는 Markdown / .ics 다운로드 버튼이 비활성화됨
- 샘플 공지 분석 후 Markdown / .ics 다운로드 버튼이 활성화됨
- Markdown 다운로드 클릭 후 최신 파일이 Downloads에 생성됨
- .ics 다운로드 클릭 후 최신 파일이 Downloads에 생성됨
- 다운로드 클릭 후 브라우저 콘솔 오류가 없음
```

생성 파일 확인:

```text
Markdown: /Users/chan/Downloads/noticepilot-checklist-ko (2).md
ICS: /Users/chan/Downloads/noticepilot-calendar-ko (1).ics
```

파일 내용 확인:

```text
- Markdown 파일은 샘플 공지 제목, 요약, 마감일, 할 일, 제출물 섹션을 포함함
- .ics 파일은 BEGIN:VCALENDAR, BEGIN:VEVENT, SUMMARY, DTSTART;VALUE=DATE, DTEND;VALUE=DATE를 포함함
- .ics 날짜는 20260720 시작, 20260721 종료로 all-day next-day DTEND 규칙을 따름
```

### 제한사항 / 후속 확인

```text
- Codex 브라우저 플러그인의 read-only page scope에서는 localStorage가 노출되지 않아 raw browser localStorage 값을 직접 읽지 못함
- javascript: URL 방식의 localStorage 추출은 브라우저 보안 정책으로 차단되어 우회하지 않음
- 대신 저장 지속성은 새로고침으로 확인했고, raw payload shape는 campusPreferences helper 직렬화 결과로 검증함
- Blob 기반 다운로드는 플러그인의 waitForEvent('download')로 잡히지 않아 timeout이 발생함
- 대신 Downloads 폴더의 최신 생성 파일과 파일 내용을 확인해 실제 다운로드를 검증함
- valid selected event가 없는 경우의 .ics 차단 메시지는 2026-07-09 브라우저 확인으로 닫힘
- 외부 캘린더 앱 import smoke test는 2026-07-09 사용자 제공 캘린더 스크린샷으로 닫힘
```
