# AY-PLE UI Prototype Notes

## Prototype question

| Item | Answer |
| --- | --- |
| Question | What should the first AY-PLE review-first academic workspace look like? |
| Scenario | 문제해결글쓰기 / 개요 작성하기 / 2026-07-12 23:59 |
| Main artifact | [index.html](index.html) |
| Applied state | [state-accepted.html](state-accepted.html) |
| Shared CSS | [styles.css](styles.css) |
| Brand assets | [assets/ay-ple-logo.png](assets/ay-ple-logo.png), [assets/ay-ple-mark.png](assets/ay-ple-mark.png), [assets/ay-profile.png](assets/ay-profile.png) |
| Source previews | [previews/](previews/) |
| Run command | `open spikes/ay-ple-ui-prototype/index.html` |
| Target viewport | Designed for 1920x1080, fitted to the current browser viewport to avoid page scroll |
| Constraint | Pure HTML/CSS only for the camp daily prototype |

## Tabs

| Editor tab | Source explorer row | What it tests |
| --- | --- | --- |
| `lms-outline-notice.txt` | 문제해결글쓰기 checked source | Whether the center surface reads as the opened source selected from the explorer. |
| `problem-solving-syllabus.pdf` | 문제해결글쓰기 checked source | Whether a syllabus PDF can appear as extracted Markdown with edit/preview controls. |

## Current read

User feedback on 2026-07-08: the editor tabs should be the actual selected source rows from the source explorer, not generated workspace surfaces. The prototype now uses pure HTML/CSS radio tabs for the two selected 문제해결글쓰기 resources: `lms-outline-notice.txt` and `problem-solving-syllabus.pdf`.

The primary layout is now an AY-PLE three-pane academic workspace: left source panel, center source preview surface, and right AY conversation panel. The center preview stays focused on the selected raw material, while accept/edit/reject controls live inline inside the right-side messages.

User feedback on 2026-07-08: student-facing UI should use familiar language for non-developer college students, not just Korean translations of technical terms. Internal terms such as `ModelingRun`, `ReviewState`, and `TrustedState` stay in docs/code, while visible UI uses phrases like `선택한 자료 정리하기`, `검토 대기`, and `반영됨`.

User feedback on 2026-07-08: the original ChatSidecar felt too far from an actual chat UI. The prototype now uses a compact right dock with agent/user bubbles, inline correction controls inside agent messages, and an input preview while still keeping the conversation scoped to the current review item.

User feedback on 2026-07-08: the original prototype file was too large as a single file. The prototype now keeps shared CSS in `styles.css`, uses `index.html` for 검토 대기, and uses `state-accepted.html` for 반영됨. This keeps the prototype pure HTML/CSS while avoiding inline partials or JavaScript includes.

User feedback on 2026-07-08: preview bodies should not be encoded inside the main workspace shell. The selected source previews now live as separate HTML files under `previews/`, and the two state shells import them with iframe panels.

User feedback on 2026-07-08: `mp3` and `png` selected sources made the preview feel broader than the assignment scenario. The source explorer still shows the surrounding materials and other courses, but only `lms-outline-notice.txt` and `problem-solving-syllabus.pdf` are selected and opened as preview tabs. The txt preview looks like a plain text file, while the syllabus preview uses Markdown extracted from the PDF.

User feedback on 2026-07-08: file previews should not put editing controls inside the PDF content, and txt files should not look like Markdown pages. The prototype now moves the `편집하기` / `프리뷰 보기` control to the editor toolbar, similar to Obsidian's editing/reading mode switch. The selected txt source renders as a plain text file in both modes, and the syllabus PDF renders as either extracted Markdown source or a Markdown preview.

User feedback on 2026-07-08: AY interpretation such as `AY가 참고한 문장` should not be encoded into the source preview itself. The prototype now keeps file previews clean and moves evidence into a separate bottom panel under the source preview.

User feedback on 2026-07-08: fitting every downstream surface into one screen would over-constrain the product too early. The prototype now fixes only SourceSelection review and assignment acceptance briefing, while timeline, recommended tasks, and reading projections remain follow-up UX surfaces.

User feedback on 2026-07-08: generated image mockups were making the app spec and HTML/CSS prototype diverge. Standalone screen mockup images were removed; the remaining generated images are narrow brand assets wired directly into the HTML/CSS prototype.

User feedback on 2026-07-08: the desired ChatSidecar is closer to a VS Code/Codex right-side dock than an inline dropdown. The prototype now pulls the chat out of the review card and renders it as a separate right dock. Pure HTML/CSS can make a persistent docked panel and clickable tabs, but resizing, selected-tab persistence across reloads, and synchronized panel state would need JavaScript.

User feedback on 2026-07-08: the desired workspace uses the familiar left-source, center-document, right-chat structure, but should not imitate an IDE menu or OS chrome. The prototype now uses an AY-PLE header, a left source panel, center document preview, and right AY conversation panel; source selection remains in the explorer instead of becoming the main visual focus.

User feedback on 2026-07-08: the prototype should not import layout decisions from generated images. Confirmed UI decisions should be expressed directly in the app spec and pure HTML/CSS prototype.

User feedback on 2026-07-08: state switching should not live in a header prototype toggle. The pending shell now changes state through the inline `수락` action in the ChatSidecar, and the accepted shell shows the same proposal in-place as `수락됨` followed by an agent completion confirmation.

User feedback on 2026-07-08: the header should not use a separate `workspace-meta` pill cluster. Term and course now live in the left brand area, source count stays only in the source explorer, and the review state appears as a concise `검토 대기`/`반영됨` pill in the ChatSidecar head.

User feedback on 2026-07-08: the existing dark theme still felt too developer-oriented for AY-PLE. The prototype now follows a light-first academic workspace direction: warm paper surfaces, ink text, brand coral/green/yellow accents, and an AY panel that reads as a companion chat rather than a terminal-like sidecar.

User feedback on 2026-07-08: mobile layout feedback was pulling effort away from the desktop review workspace. The prototype keeps 1920x1080 desktop as the validation target, while mobile work stays deferred by the repository interface scope.

## Verdict placeholder

| Decision | Notes |
| --- | --- |
| Workspace shape | 지속적으로 보이는 자료 목록 / 원본 미리보기 / AY 채팅, 대화 안의 검토 결정 |
| Keep | TBD |
| Change | TBD |
| Delete | This throwaway prototype after the design answer is captured |

## 발표용 guided demo

| 항목 | 내용 |
| --- | --- |
| 검증 질문 | AI Agent를 처음 접하는 사람이 90초 안에 AY-PLE가 Agent 제품인 이유를 이해할 수 있는가? |
| 기본 artifact | [guided-demo.html](guided-demo.html) |
| 보조 파일 | [guided-demo.css](guided-demo.css), [guided-demo.js](guided-demo.js) |
| 실행 명령 | `npm run demo:week1` 실행 후 `http://127.0.0.1:4174/spikes/ay-ple-ui-prototype/guided-demo.html`을 연다. |
| 상태 | Backend, model 호출, persistence가 없는 결정적 in-memory 발표 흐름 |
| 발표 deep link | `?variant=workspace&step=1&present=1`부터 `?step=7`까지 |
| 조작 | 자료 선택, 정리 시작, activity/제안 action, 명시적 수락·수정·거절, 이전·다음·초기화, 키보드 화살표와 URL 상태를 제공한다. 7단계는 제안의 수락 action으로만 진입한다. |

일곱 장면은 흩어진 자료, 자료 선택, 작업 위임, 사용자에게 보이는 Agent activity, 원본 근거, 사용자 검토, 확인된 학기 상태 순서로 진행한다. `workspace`는 자료 목록, 원본 미리보기와 AY 대화를 하나의 제품 경험으로 함께 보여주므로 발표 기본 view로 사용한다. `focus`는 현재 장면을 강조하고 `agent`는 action log에 더 많은 공간을 준다. Floating switcher는 throwaway prototype의 일부이며 제안하는 제품 UI가 아니다.

발표 verdict는 아직 열려 있다. Peer feedback 뒤 처음 보는 사람이 AY가 하는 일과 사용자 수락이 AI 제안을 확인된 학기 상태와 구분하는 이유를 모두 설명할 수 있는지 기록한다.
