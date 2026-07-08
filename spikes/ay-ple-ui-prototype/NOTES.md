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
| `problem-solving-syllabus.md` | 문제해결글쓰기 checked source | Whether supporting course policy material can be inspected without leaving the review workspace. |
| `week03-lecture.mp3` | 문제해결글쓰기 checked source | Whether media/transcript material can sit beside text sources as ModelingRun input. |
| `outline-rubric.png` | 문제해결글쓰기 checked source | Whether image/OCR material can be inspected as part of the same source set. |

## Current read

User feedback on 2026-07-08: the editor tabs should be the actual selected source rows from the source explorer, not generated workspace surfaces. The prototype now uses pure HTML/CSS radio tabs for the four selected 문제해결글쓰기 resources: `lms-outline-notice.txt`, `problem-solving-syllabus.md`, `week03-lecture.mp3`, and `outline-rubric.png`.

The primary layout is now an AY-PLE three-pane academic workspace: left source panel, center source preview surface, and right AY conversation panel. The center preview stays focused on the selected raw material, while accept/edit/reject controls live inline inside the right-side messages.

User feedback on 2026-07-08: student-facing UI should use familiar language for non-developer college students, not just Korean translations of technical terms. Internal terms such as `ModelingRun`, `ReviewState`, and `TrustedState` stay in docs/code, while visible UI uses phrases like `선택한 자료 정리하기`, `검토 대기`, and `반영됨`.

User feedback on 2026-07-08: the original ChatSidecar felt too far from an actual chat UI. The prototype now uses a compact right dock with agent/user bubbles, inline correction controls inside agent messages, and an input preview while still keeping the conversation scoped to the current review item.

User feedback on 2026-07-08: the original prototype file was too large as a single file. The prototype now keeps shared CSS in `styles.css`, uses `index.html` for 검토 대기, and uses `state-accepted.html` for 반영됨. This keeps the prototype pure HTML/CSS while avoiding inline partials or JavaScript includes.

User feedback on 2026-07-08: preview bodies should not be encoded inside the main workspace shell. The four selected source previews now live as separate HTML files under `previews/`, and the two state shells import them with iframe panels.

User feedback on 2026-07-08: source previews should respect the source extension instead of all looking like the same document. The preview files now render `.txt` as plain text, `.md` as Markdown source plus rendered fields, `.mp3` as an audio/transcript preview, and `.png` as an image/OCR preview.

User feedback on 2026-07-08: generated image mockups were making the app spec and HTML/CSS prototype diverge. Standalone screen mockup images were removed; the remaining generated images are narrow brand assets wired directly into the HTML/CSS prototype.

User feedback on 2026-07-08: the desired ChatSidecar is closer to a VS Code/Codex right-side dock than an inline dropdown. The prototype now pulls the chat out of the review card and renders it as a separate right dock. Pure HTML/CSS can make a persistent docked panel and clickable tabs, but resizing, selected-tab persistence across reloads, and synchronized panel state would need JavaScript.

User feedback on 2026-07-08: the desired workspace uses the familiar left-source, center-document, right-chat structure, but should not imitate an IDE menu or OS chrome. The prototype now uses an AY-PLE header, a left source panel, center document preview, and right AY conversation panel; source selection remains in the explorer instead of becoming the main visual focus.

User feedback on 2026-07-08: the prototype should not import layout decisions from generated images. Confirmed UI decisions should be expressed directly in the app spec and pure HTML/CSS prototype.

User feedback on 2026-07-08: state switching should not live in a header prototype toggle. The pending shell now changes state through the inline `수락` action in the ChatSidecar, and the accepted shell shows the same proposal in-place as `수락됨` followed by an agent completion confirmation.

User feedback on 2026-07-08: the header should not use a separate `workspace-meta` pill cluster. Term and course now live in the left brand area, source count stays only in the source explorer, and the review state appears as a concise `검토 대기`/`반영됨` pill in the ChatSidecar head.

## Verdict placeholder

| Decision | Notes |
| --- | --- |
| Workspace shape | TBD after peer feedback |
| Keep | TBD |
| Change | TBD |
| Delete | This throwaway prototype after the design answer is captured |
