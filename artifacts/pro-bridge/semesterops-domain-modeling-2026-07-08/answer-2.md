## Prototype thesis

Make the first prototype a **review-first academic workspace**, not a dashboard.

The student should immediately understand this rule:

> “SemesterOps found an academic object. You confirm it once. Then timeline and tasks are generated from it.”

That maps directly to the product brief: SemesterOps is not mainly a calendar or chat app; it turns messy RawMaterial into SemesterModel through AgentModeling, StatePatch review, UserConfirmation, TrustedState, and projection surfaces. 

---

# 1. Minimum screens or panels for the prototype

For a one-day static HTML/CSS prototype, I would ship **one main screen with two states**, not a multi-page app.

## Screen A: “Review Workspace”

This is the main prototype screen. It shows a pending agent proposal before the student confirms it.

Use a 3-column layout:

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ Top bar: SemesterOps · 2026 Summer · Local workspace · Run status          │
├───────────────┬──────────────────────────────────────┬────────────────────┤
│ Left rail     │ Main academic object canvas           │ Right review rail  │
│               │                                      │                    │
│ Courses       │ Pending Assignment card               │ Review Queue       │
│ Sources       │ “개요 작성하기”                       │ StatePatch card    │
│ Modeling Run  │ Due date lives here                   │ Evidence preview   │
│               │                                      │ Accept/Edit/Reject │
├───────────────┴──────────────────────────────────────┴────────────────────┤
│ Bottom operational strip: Timeline · Tasks · Projection                    │
└────────────────────────────────────────────────────────────────────────────┘
```

This one screen should include the MVP-required surfaces: SourceList, SourceSelection, ModelingRun start control, Review surface, MarkdownProjection view, and ChatSidecar/agent context in the same workspace. The brief explicitly says those are required MVP capabilities, while final layout is still the UIPrototypeSpike decision. 

## Screen B: “Accepted / Trusted State”

Same layout, but after the user clicks **Accept**.

The purpose is to show propagation:

```text
Assignment becomes trusted
↓
TimelineEntry appears as read-only derived deadline
↓
TaskCandidate can become StudentTask
↓
Evidence remains linked
↓
MarkdownProjection updates
```

In static HTML/CSS, this can be a tab, toggle, or second artboard: **Before review** / **After accept**.

Do not build more than these two states today.

---

# 2. What each panel should show

## A. Left rail: Course + Source context

Purpose: show that SemesterOps starts from messy material, not from manual calendar entry.

Show:

```text
Courses
• 문제해결글쓰기
• 자료구조
• 경영통계

Sources
☑ LMS 공지 · 과제 안내
☐ 강의계획서.pdf
☐ 7주차 수업 메모.png

Modeling Run
Selected: 1 source
Button: Run AgentModeling
Status: 1 StatePatch ready for review
```

The left rail should use product language: **RawMaterial**, **SourceSelection**, **ModelingRun**. The brief’s core loop says the student selects RawMaterial, starts AgentModeling, receives DraftState/ReviewState/StatePatch, then reviews it into TrustedState. 

Do not make the left rail look like a generic file explorer. It is a source-grounded modeling surface.

## B. Main canvas: Academic object detail

Purpose: make `Assignment` visibly first-class.

This should be the largest panel.

Show a card like:

```text
Assignment · Pending review

문제해결글쓰기
개요 작성하기

Due
July 12, 2026 · 23:59 KST
Source of truth: Assignment.dueAt

Submission
Unknown

Requirements
No detailed requirement found yet

Cautions
No caution found yet

Evidence
2 source highlights

Status
Not trusted until accepted
```

The most important visual move: put the due date inside the **Assignment** card, not inside the timeline. Label it:

```text
Owns deadline
Assignment.dueAt
```

The glossary now defines Assignment as a first-class academic requirement that owns due dates, submission details, requirements, cautions, and evidence. It also defines TimelineEntry as a derived calendar/timeline row, not source-of-truth data. 

## C. Right rail: Review Queue + StatePatch

Purpose: show that the agent proposes, but the user confirms.

Show one pending review card:

```text
Review Queue · 1 item

Recommended
Create assignment

문제해결글쓰기
개요 작성하기
Due July 12 · 23:59

This patch will:
+ Create Assignment
+ Link evidence
+ Create TaskCandidate: “개요 초안 작성하기”
→ Timeline deadline will be generated automatically

Buttons:
Accept
Edit
Reject
```

Show the StatePatch shape visually, not as JSON:

```text
StatePatch
Type: create_assignment_with_task_candidate
Risk: Medium
Recommended choice: Accept
Needs confirmation
```

The brief says ReviewState contains items needing confirmation, TrustedState is based on UserConfirmation, and StatePatch is the structured change proposal with summary, recommendedChoice, changes, evidence, risk, confirmation requirement, and status. 

## D. Evidence/source panel

Purpose: show why the user can trust or correct the proposal.

This can be inside the right rail under the Review card, or as a drawer opened from the Assignment card.

Show:

```text
Evidence

LMS 공지 · 과제 안내
“개요 작성하기”
→ Assignment.title

“7월 12일 23:59까지”
→ Assignment.dueAt

Unclear
제출 방식은 원문에서 확실히 확인되지 않았습니다.
```

The evidence panel should point to **fields**, not just the whole assignment.

Good:

```text
“7월 12일 23:59까지” → Assignment.dueAt
```

Bad:

```text
Source: LMS notice
```

## E. Bottom operational strip: Timeline + Tasks + Projection

Purpose: distinguish academic meaning from operational views.

Use three compact tabs/cards.

### Timeline card

```text
Timeline · Derived

Jul 12 · 23:59
개요 작성하기 deadline
문제해결글쓰기

Generated from Assignment.dueAt
Read-only here · Edit assignment
```

Do not show a standalone `ScheduleEvent` for this deadline.

### Tasks card

Before acceptance:

```text
Task candidates · Review only

Suggested action
개요 초안 작성하기

Linked to Assignment: 개요 작성하기
Deadline: follows Assignment.dueAt
Button: Accept as task
```

After acceptance:

```text
My tasks

□ 개요 초안 작성하기
Linked assignment: 개요 작성하기
Deadline: July 12 · 23:59
Plan: unset
```

The UI copy must avoid implying that the task owns the deadline. The glossary says StudentTask is a trusted operational action, and when linked to an Assignment or Exam it references that academic object’s deadline instead of duplicating it. 

### Projection card

Keep this tiny:

```text
Projection

semester-overview.md updated after confirmation
courses/문제해결글쓰기/overview.md
review-queue.md
```

Label it:

```text
Readable artifact · not source of truth
```

The brief says MarkdownProjection is guaranteed in three forms for MVP and is not the source of truth; SQLite plus RawMaterial are the source-of-truth strategy. 

## F. ChatSidecar

For today, do not build a full chat product. Show a collapsed or narrow sidecar, maybe at bottom right:

```text
Agent sidecar

I found one assignment in the selected LMS notice.
The due date is supported by the phrase “7월 12일 23:59까지”.
Submission method is unclear.

Ask:
[Why did you classify this as an assignment?]
[What happens if I edit the due date?]
```

This demonstrates CoControl without turning the prototype into a chatbot. The brief says GUI and ChatSidecar should operate on the same live SemesterModel, not separate states. 

---

# 3. How the example should appear across surfaces

## Assignment UI

This is the canonical home of the academic fact.

```text
Assignment

Course
문제해결글쓰기

Title
개요 작성하기

Due
July 12, 2026 · 23:59 KST
Source of truth: Assignment.dueAt

Submission
Unknown

Requirements
Not found in selected source

Cautions
Not found in selected source

Evidence
“개요 작성하기”
“7월 12일 23:59까지”
```

Add a small explanatory badge:

```text
First-class academic object
```

And near the deadline:

```text
Used by timeline and linked tasks
```

This makes the model legible without explaining database structure.

## Review Queue

Show the pending StatePatch as the active thing the student must decide on.

```text
Recommended patch

Create Assignment
문제해결글쓰기 · 개요 작성하기

Detected deadline
July 12 · 23:59

Also suggested
TaskCandidate: 개요 초안 작성하기

Evidence
2 highlights

Recommended choice
Accept

[Accept] [Edit] [Reject]
```

The phrase “Also suggested” matters. It tells the student that the task is not the assignment.

## Timeline

Before acceptance:

```text
Timeline preview · Pending

Jul 12 · 23:59
개요 작성하기 deadline
Will appear after accepting assignment
Generated from Assignment.dueAt
```

After acceptance:

```text
Timeline · Derived

Jul 12 · 23:59
개요 작성하기 deadline
문제해결글쓰기

Read-only timeline row
Edit source: Assignment.dueAt
```

Do not call this a `ScheduleEvent`. A standalone ScheduleEvent is for class meetings, makeup classes, cancellations, office hours, and similar standalone time facts—not assignment deadlines.

## Task list

Before the user accepts the suggested action:

```text
Task candidates · Needs review

Suggested
개요 초안 작성하기

Reason
To prepare for the assignment “개요 작성하기”

Deadline
Follows Assignment.dueAt: July 12 · 23:59

[Accept as task] [Dismiss]
```

After accepting the task:

```text
My tasks

□ 개요 초안 작성하기
For: 개요 작성하기
Due: July 12 · 23:59 from Assignment.dueAt
Plan: Add work time
```

If the student edits the task plan, the editable field should be:

```text
Planned work time
```

Not:

```text
Due date
```

## Evidence/source panel

Show the source text and field mapping:

```text
Source
LMS 공지 · 과제 안내

Extracted highlights

“개요 작성하기”
Mapped to Assignment.title

“7월 12일 23:59까지”
Mapped to Assignment.dueAt

Unclear from source
Submission method
Required scope
Caution notes
Grading relevance
```

The evidence panel should make uncertainty visible, not hidden. This supports the brief’s trust model: AI output becomes trusted only through review, correction, and UserConfirmation. 

---

# 4. Which UI elements should be visibly first-class vs derived/read-only

## Visibly first-class

These should look like real product objects with their own cards, detail views, and actions.

| UI element      | Why                                          |
| --------------- | -------------------------------------------- |
| `Course`        | Student thinks by course first.              |
| `Assignment`    | Owns academic requirement facts.             |
| `Exam`          | Owns academic assessment facts.              |
| `RawMaterial`   | Original source must remain inspectable.     |
| `StatePatch`    | User confirmation unit.                      |
| `StudentTask`   | Trusted operational action after acceptance. |
| `ScheduleEvent` | Only for standalone schedule facts.          |

In the prototype, `Assignment` should be the hero object.

## Derived or read-only

These should be visually marked as generated, linked, or read-only.

| UI element                          | UI treatment                                            |
| ----------------------------------- | ------------------------------------------------------- |
| `TimelineEntry`                     | Badge: “Derived”. Link: “Edit source object”.           |
| Assignment deadline row in timeline | Read-only. Generated from `Assignment.dueAt`.           |
| Exam row in timeline                | Read-only. Generated from `Exam.startsAt/endsAt`.       |
| Linked task deadline                | Read-only. Follows assignment/exam deadline.            |
| MarkdownProjection                  | Readable artifact. Not editable as state.               |
| Evidence highlights                 | Read-only source mapping, unless creating a correction. |
| `TaskCandidate`                     | Pending recommendation, not trusted task.               |

Use visible chips:

```text
Owns fact
Derived
Pending review
Trusted
Follows Assignment.dueAt
Readable artifact
```

These chips will do more than a diagram. They make the model understandable in the UI itself.

---

# 5. What not to prototype today

Be ruthless. Do not prototype these yet:

| Do not prototype                           | Why                                                                                                                |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| Full calendar month/week view              | It will make the product look like a calendar app. A small timeline strip is enough.                               |
| Drag-and-drop deadline editing in timeline | It violates the model unless routed through Assignment/Exam editing. Too much for day one.                         |
| Full task manager                          | The task list only needs to prove TaskCandidate → StudentTask and linked deadline behavior.                        |
| Exam detail screen                         | Include an exam placeholder/card pattern if needed, but build the Assignment flow first.                           |
| ScheduleEvent creation UI                  | It is not needed for the “개요 작성하기” example.                                                                        |
| Full Markdown editor                       | MarkdownProjection is not source of truth. Show preview only.                                                      |
| Full ChatSidecar conversation              | Show contextual agent notes and two suggested prompts.                                                             |
| WorkspaceHistory UI                        | Important later, but not needed to teach the domain model today.                                                   |
| Custom templates                           | Explicitly out of MVP scope.                                                                                       |
| LMS login/import flow                      | Out of MVP scope and distracts from RawMaterial intake.                                                            |
| External calendar sync                     | Out of MVP scope; the brief lists external calendar upload as excluded.                                            |
| Automatic submission or assignment solving | Out of scope and bad product signaling. The brief excludes automatic submission and assignment-answer delegation.  |

---

# One-day deliverable recommendation

Build **one static HTML file** with:

1. A top bar.
2. Left rail with course/source/modeling run.
3. Center `Assignment` detail card.
4. Right `Review Queue` card with Accept/Edit/Reject.
5. Evidence drawer/card.
6. Bottom strip with Timeline, Task candidates/My tasks, and Projection preview.
7. A simple toggle: **Pending Review** / **After Accept**.

The headline on the page should be:

```text
Review what the agent found before it becomes your semester state.
```

The central assignment card should say:

```text
개요 작성하기
Due July 12 · 23:59
This deadline belongs to the Assignment.
Timeline and tasks read from it.
```

That single screen will teach the model better than a data diagram.
