## 1. Diagnosis of the current modeling problem

The conceptual confusion is that the current model mixes **academic meaning**, **student operations**, and **calendar projection** into peer objects.

SemesterOps’ own brief says the core job is not to be a calendar app or AI chat surface, but to turn messy RawMaterial into a trusted SemesterModel through StatePatch review and UserConfirmation.  The glossary also already hints at the right split: `Assignment` and `Exam` are first-class academic objects, while `TaskCandidate` is a proposed student action and `ScheduleItem` is a time-based event or deadline representation.  The problem is that `ScheduleItem` is currently too broad: it is acting both as a canonical event record and as a calendar row derived from assignments/exams.

The clean distinction should be:

| Concept                | Correct role                                                                                                                                                                                                     |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Course`               | First-class academic container. A course owns assignments, exams, materials, notices, and course-level schedule facts.                                                                                           |
| `RawMaterial`          | First-class source/provenance object. It is not interpreted state; it is preserved evidence.                                                                                                                     |
| `Assignment`           | First-class academic requirement. It owns the assignment’s academic facts.                                                                                                                                       |
| `Exam`                 | First-class academic assessment. It owns the exam’s academic facts.                                                                                                                                              |
| `TaskCandidate`        | Review-time proposal for a possible student action. It is not an assignment, not an exam, and not trusted work yet.                                                                                              |
| `StudentTask` / `Task` | Trusted operational action after user acceptance. Optional, linked to an assignment/exam/material or standalone.                                                                                                 |
| `ScheduleItem`         | Should not be the source of truth for assignment due dates or exam times. Use it either as a derived timeline row, or split it into `TimelineEntry` projection plus `ScheduleEvent` canonical standalone events. |
| `StatePatch`           | First-class proposed transaction. It is how AgentModeling, GUI actions, and UserCorrection propose changes.                                                                                                      |
| `ReviewState`          | Queue/state layer containing pending patches, uncertainties, and task candidates. Not an academic object.                                                                                                        |
| `TrustedState`         | The accepted canonical semester graph. Not an object students see directly.                                                                                                                                      |

The strongest design rule: **an academic fact should have exactly one owner**.

So:

* “An assignment exists because the course requires work” → `Assignment`.
* “The assignment is due July 12 at 11:59 PM” → `Assignment.dueAt`.
* “A deadline appears on the calendar” → derived `TimelineEntry` from `Assignment.dueAt`.
* “The student should draft an outline” → `TaskCandidate`, then maybe accepted into `StudentTask`.
* “The student plans to work on it Friday afternoon” → `StudentTask.plannedFor`, not `Assignment.dueAt`.

The current brief already separates RawState, DraftState, ReviewState, TrustedState, and ArtifactState, and says TrustedState’s source of truth is UserConfirmation rather than the agent.  This means the domain model should optimize for reviewable canonical facts, not for letting the agent populate every view object.

---

## 2. Recommended model

### Core recommendation

Keep **Assignment** and **Exam** first-class. Make **task lists and timelines composed views over those objects**, not parallel state stores.

I would use this canonical model:

```ts
Course
RawMaterial
EvidenceRef

Assignment
Exam
ScheduleEvent        // standalone schedule facts only
TaskCandidate        // ReviewState only
StudentTask          // Trusted operational task after acceptance

StatePatch
Uncertainty
ReviewItem           // optional wrapper around StatePatch/Uncertainty
MarkdownProjection   // artifact/projection, never source of truth
TimelineEntry        // derived read model, not canonical
```

### Canonical entities

#### `Course`

A `Course` is the academic parent. It should be trusted from Init or added through a high-confidence user-confirmed patch.

Owns:

```ts
Course {
  id
  termId
  name
  code?
  instructor?
  credits?
  defaultMeetingPattern?
  defaultLocation?
  status
}
```

Does **not** own assignment due dates or exam scopes. Those belong to the relevant assignment or exam.

#### `RawMaterial`

A `RawMaterial` is preserved original input: LMS notice, syllabus, PDF, slide deck, image, note, etc. The glossary defines it as an original artifact preserved before interpretation. 

Owns:

```ts
RawMaterial {
  id
  kind              // lms_notice, pdf, image, note, syllabus, etc.
  originalPath
  checksum
  importedAt
  sourceLabel?
  extractedTextRef?
  courseHint?
}
```

Does **not** own structured facts. It supports evidence.

#### `EvidenceRef`

Do not just attach evidence at entity level. Attach it to **field paths** whenever possible.

```ts
EvidenceRef {
  id
  rawMaterialId
  targetRef          // Assignment:asg_001, Exam:exam_001, etc.
  fieldPath          // "dueAt", "submission.method", "scope", etc.
  locator?           // page, text range, image bounding box, slide number
  quote?
  confidence?
}
```

This lets the Review UI show “why do we believe this due date?” without duplicating the fact.

#### `Assignment`

An `Assignment` is the source of truth for coursework requirements.

```ts
Assignment {
  id
  courseId
  title
  description?
  dueAt?
  duePrecision?       // exact_minute, date_only, unknown_time, inferred
  timeZone?
  submission?: {
    method?           // LMS, email, in-person, GitHub, unknown
    channel?
    format?
  }
  requirements: RequirementBlock[]
  scope?: ScopeBlock[]
  cautions: CautionBlock[]
  gradingRelevance?: GradingInfo
  status              // not_started, in_progress, submitted, cancelled, unknown
  evidenceRefs[]
  uncertaintyRefs[]
}
```

Owns:

* Due date/deadline.
* Submission method.
* Required scope.
* Required output/format.
* Caution notes.
* Grading relevance if assignment-specific.
* Assignment-specific uncertainties.

Does **not** own:

* Calendar row state.
* Student planning dates.
* Draft/review actions as tasks.

#### `Exam`

An `Exam` is the source of truth for assessments.

```ts
Exam {
  id
  courseId
  title
  examKind            // quiz, midterm, final, oral_exam, etc.
  startsAt?
  endsAt?
  datePrecision?
  timeZone?
  location?
  scope: ScopeBlock[]
  allowedMaterials?
  gradingRelevance?
  prepGuidance?
  status              // scheduled, completed, cancelled, unknown
  evidenceRefs[]
  uncertaintyRefs[]
}
```

Owns:

* Exam date/time.
* Exam location.
* Exam scope.
* Exam-specific prep guidance.
* Allowed materials.
* Exam-specific grading relevance.

Does **not** own:

* Study tasks.
* Calendar projection rows.
* Generic course schedule.

#### `ScheduleEvent`

Use this only for **standalone time facts** that are not better modeled as assignments or exams.

Examples:

* Regular class meeting.
* Makeup class.
* Cancelled class.
* Office hour.
* Department event.
* Presentation session that is not yet modeled as an assignment or exam.
* “Bring laptop to class on July 15” if you decide not to model it as a task.

```ts
ScheduleEvent {
  id
  courseId?
  title
  kind                // class_meeting, makeup_class, office_hour, holiday, other
  startsAt
  endsAt?
  timeZone
  location?
  linkedObjectRef?    // optional, but not for duplicating due dates
  evidenceRefs[]
}
```

Important: if the event is “assignment due” or “exam starts”, do **not** create a canonical `ScheduleEvent`. Derive a timeline row from `Assignment` or `Exam`.

#### `TimelineEntry`

This is what the schedule/calendar UI reads. It should be a projection, not trusted state.

```ts
TimelineEntry {
  id                  // deterministic, e.g. "tl_assignment_due_asg_001"
  kind                // assignment_due, exam_time, schedule_event, task_plan
  sourceRef           // Assignment:asg_001, Exam:exam_001, ScheduleEvent:evt_001
  courseId
  title
  startsAt
  endsAt?
  location?
  displayStatus?
}
```

It is generated from:

```ts
Assignment.dueAt
Exam.startsAt / Exam.endsAt
ScheduleEvent.startsAt / endsAt
StudentTask.plannedFor
```

If persisted for performance, treat it as a **materialized cache**. It should be rebuildable. The user should not directly edit `TimelineEntry.startsAt`; the UI should route the edit to the owning source object.

#### `TaskCandidate`

`TaskCandidate` is a proposal, not a trusted task. The brief currently places `TaskCandidate` in ReviewState, which is the right instinct. 

```ts
TaskCandidate {
  id
  targetRef?          // Assignment, Exam, RawMaterial, Course, or null
  courseId?
  actionType          // read, draft, submit, review, study, prepare, ask_professor
  title
  rationale?
  suggestedPlan?: {
    plannedFor?
    startAfter?
    estimateMinutes?
  }
  deadlineRef?        // points to Assignment.dueAt or Exam.startsAt
  ownDeadline?        // only if standalone, not linked to assignment/exam deadline
  evidenceRefs[]
  status              // pending, accepted_as_task, rejected, merged
}
```

The critical rule: **linked TaskCandidates should not own `dueAt`.**

For a candidate like “개요 초안 작성하기”, the deadline should be read through:

```ts
deadlineRef = {
  entity: "Assignment",
  id: "asg_outline_001",
  fieldPath: "dueAt"
}
```

The task candidate can propose a plan date, such as “start drafting July 10,” but the assignment deadline remains owned by the assignment.

#### `StudentTask`

A `StudentTask` is what a user accepts into their operational task list.

```ts
StudentTask {
  id
  targetRef?
  courseId?
  title
  actionType
  plannedFor?
  reminderAt?
  estimateMinutes?
  status              // todo, doing, done, dismissed
  deadlineRef?        // inherited from linked academic object
  ownDeadline?        // only for standalone tasks
  createdFromCandidateId?
}
```

It owns:

* The student’s action state.
* Planned work time.
* Reminder time.
* Completion state.

It does **not** own the academic due date if linked to an assignment or exam.

---

### Ownership of specific facts

| Fact                         | Canonical owner                                         |
| ---------------------------- | ------------------------------------------------------- |
| Assignment due date          | `Assignment.dueAt`                                      |
| Assignment submission method | `Assignment.submission`                                 |
| Assignment required scope    | `Assignment.scope` / `Assignment.requirements`          |
| Assignment caution notes     | `Assignment.cautions`                                   |
| Assignment grading relevance | `Assignment.gradingRelevance`                           |
| Exam date/time               | `Exam.startsAt`, `Exam.endsAt`                          |
| Exam location                | `Exam.location`                                         |
| Exam scope                   | `Exam.scope`                                            |
| Regular class meeting        | `Course.defaultMeetingPattern` or `ScheduleEvent`       |
| Makeup/cancelled class       | `ScheduleEvent`                                         |
| Student’s plan to work       | `StudentTask.plannedFor`                                |
| Student reminder             | `StudentTask.reminderAt`                                |
| Source/provenance            | `RawMaterial` + `EvidenceRef`                           |
| Unclear extracted fact       | `Uncertainty` linked to entity field path               |
| Calendar row                 | Derived `TimelineEntry`                                 |
| Assignment task list row     | `TaskCandidate` or `StudentTask` linked to `Assignment` |

---

## 3. Worked example

Assume the current semester is using Korea time and the due date is July 12, 2026 at 11:59 PM KST.

### Canonical state

```json
{
  "Course": {
    "id": "course_problem_writing",
    "name": "문제해결글쓰기",
    "termId": "term_2026_summer",
    "status": "trusted"
  }
}
```

```json
{
  "RawMaterial": {
    "id": "raw_lms_notice_001",
    "kind": "lms_notice",
    "sourceLabel": "LMS 과제 공지",
    "importedAt": "2026-07-08T13:30:00+09:00"
  }
}
```

```json
{
  "Assignment": {
    "id": "asg_outline_001",
    "courseId": "course_problem_writing",
    "title": "개요 작성하기",
    "dueAt": "2026-07-12T23:59:00+09:00",
    "duePrecision": "exact_minute",
    "timeZone": "Asia/Seoul",
    "submission": {
      "method": "unknown"
    },
    "requirements": [],
    "scope": [],
    "cautions": [],
    "gradingRelevance": {
      "status": "unknown"
    },
    "status": "not_started",
    "evidenceRefs": [
      "ev_asg_outline_title",
      "ev_asg_outline_due"
    ],
    "uncertaintyRefs": [
      "unc_submission_method_unknown"
    ]
  }
}
```

```json
{
  "EvidenceRef": [
    {
      "id": "ev_asg_outline_title",
      "rawMaterialId": "raw_lms_notice_001",
      "targetRef": "Assignment:asg_outline_001",
      "fieldPath": "title",
      "quote": "개요 작성하기"
    },
    {
      "id": "ev_asg_outline_due",
      "rawMaterialId": "raw_lms_notice_001",
      "targetRef": "Assignment:asg_outline_001",
      "fieldPath": "dueAt",
      "quote": "7월 12일 23:59까지"
    }
  ]
}
```

```json
{
  "TaskCandidate": {
    "id": "tc_draft_outline_001",
    "targetRef": "Assignment:asg_outline_001",
    "courseId": "course_problem_writing",
    "actionType": "draft",
    "title": "개요 초안 작성하기",
    "deadlineRef": {
      "entity": "Assignment",
      "id": "asg_outline_001",
      "fieldPath": "dueAt"
    },
    "suggestedPlan": {
      "plannedFor": "2026-07-11T14:00:00+09:00"
    },
    "status": "pending"
  }
}
```

No canonical `ScheduleItem` is created for the July 12 deadline.

### Derived timeline row

The schedule UI derives this:

```json
{
  "TimelineEntry": {
    "id": "tl_assignment_due_asg_outline_001",
    "kind": "assignment_due",
    "sourceRef": "Assignment:asg_outline_001",
    "courseId": "course_problem_writing",
    "title": "문제해결글쓰기 · 개요 작성하기 마감",
    "startsAt": "2026-07-12T23:59:00+09:00",
    "displayStatus": "not_started"
  }
}
```

### What each UI reads

| UI surface             | Reads from                                                                                        |
| ---------------------- | ------------------------------------------------------------------------------------------------- |
| Assignment detail view | `Assignment`, `Course`, `EvidenceRef`, linked `RawMaterial`, linked `TaskCandidate`/`StudentTask` |
| Task review/list view  | `TaskCandidate` or `StudentTask`, then follows `targetRef` to `Assignment.dueAt`                  |
| Schedule/calendar view | Derived `TimelineEntry` union over `Assignment`, `Exam`, `ScheduleEvent`, `StudentTask`           |
| Source/evidence panel  | `RawMaterial` + `EvidenceRef`                                                                     |
| MarkdownProjection     | Rendered from trusted canonical entities, not edited as source of truth                           |

This matches the brief’s Source of Truth strategy: SQLite plus original RawMaterial are the source of truth, while MarkdownProjection is only a human-readable artifact. 

---

## 4. StatePatch implications

The agent should propose **canonical facts only once**. It should not write:

```txt
Assignment.dueAt = July 12 23:59
ScheduleItem.at = July 12 23:59
TaskCandidate.dueAt = July 12 23:59
```

It should write:

```txt
Assignment.dueAt = July 12 23:59
TaskCandidate.deadlineRef -> Assignment.dueAt
TimelineEntry is derived
```

### Example StatePatch

```json
{
  "id": "patch_add_outline_assignment_001",
  "runId": "run_2026_07_08_001",
  "patchType": "create_assignment_with_task_candidate",
  "sourceIds": ["raw_lms_notice_001"],
  "summary": "문제해결글쓰기 과제 ‘개요 작성하기’를 7월 12일 23:59 마감으로 추가합니다.",
  "recommendedChoice": "accept",
  "riskLevel": "medium",
  "requiresConfirmation": true,
  "status": "pending",
  "changes": [
    {
      "op": "create",
      "entity": "Assignment",
      "tempId": "tmp_asg_outline",
      "value": {
        "courseId": "course_problem_writing",
        "title": "개요 작성하기",
        "dueAt": "2026-07-12T23:59:00+09:00",
        "duePrecision": "exact_minute",
        "timeZone": "Asia/Seoul",
        "submission": {
          "method": "unknown"
        },
        "requirements": [],
        "scope": [],
        "cautions": [],
        "gradingRelevance": {
          "status": "unknown"
        },
        "status": "not_started"
      }
    },
    {
      "op": "create",
      "entity": "TaskCandidate",
      "tempId": "tmp_tc_draft_outline",
      "value": {
        "targetRef": "Assignment:tmp_asg_outline",
        "courseId": "course_problem_writing",
        "actionType": "draft",
        "title": "개요 초안 작성하기",
        "deadlineRef": {
          "entity": "Assignment",
          "id": "tmp_asg_outline",
          "fieldPath": "dueAt"
        },
        "suggestedPlan": {
          "plannedFor": "2026-07-11T14:00:00+09:00"
        }
      }
    },
    {
      "op": "create",
      "entity": "Uncertainty",
      "tempId": "tmp_unc_submission_method",
      "value": {
        "targetRef": "Assignment:tmp_asg_outline",
        "fieldPath": "submission.method",
        "message": "제출 방식은 원문에서 확실히 확인되지 않았습니다."
      }
    }
  ],
  "evidence": [
    {
      "rawMaterialId": "raw_lms_notice_001",
      "targetRef": "Assignment:tmp_asg_outline",
      "fieldPath": "title",
      "quote": "개요 작성하기"
    },
    {
      "rawMaterialId": "raw_lms_notice_001",
      "targetRef": "Assignment:tmp_asg_outline",
      "fieldPath": "dueAt",
      "quote": "7월 12일 23:59까지"
    }
  ],
  "mustNotCreate": [
    "ScheduleItem for the assignment deadline",
    "TaskCandidate.dueAt duplicating Assignment.dueAt"
  ]
}
```

The `mustNotCreate` field does not need to be a real schema field. It illustrates a validator rule: **a patch that creates an assignment deadline and also creates a separate schedule deadline for the same fact should be rejected or rewritten.**

### User correction propagation

Suppose the user corrects the date to July 13 at 11:59 PM.

The correction should become one canonical edit:

```json
{
  "id": "patch_correct_outline_due_001",
  "patchType": "correct_assignment_due_date",
  "summary": "‘개요 작성하기’ 마감일을 7월 13일 23:59로 수정합니다.",
  "sourceIds": ["user_correction_001"],
  "recommendedChoice": "accept",
  "requiresConfirmation": true,
  "status": "accepted",
  "changes": [
    {
      "op": "replace",
      "entity": "Assignment",
      "id": "asg_outline_001",
      "fieldPath": "dueAt",
      "oldValue": "2026-07-12T23:59:00+09:00",
      "newValue": "2026-07-13T23:59:00+09:00"
    }
  ],
  "evidence": [
    {
      "targetRef": "Assignment:asg_outline_001",
      "fieldPath": "dueAt",
      "source": "UserCorrection",
      "quote": "마감은 7월 13일 11:59 PM입니다."
    }
  ]
}
```

Then:

* Assignment UI shows July 13.
* Task UI follows `deadlineRef` and shows July 13.
* Schedule UI regenerates `TimelineEntry.startsAt` from `Assignment.dueAt`.
* MarkdownProjection regenerates from TrustedState.
* No fan-out update is needed.
* WorkspaceHistory can checkpoint the accepted/edited StatePatch and TrustedState change, which matches the brief’s history model around UserConfirmation and patch changes. 

This is the main payoff: **correction changes one fact, and every view updates because it reads through links/projections.**

---

## 5. Alternative models

### Alternative A: Duplicate fields across Assignment, ScheduleItem, and TaskCandidate

Example:

```txt
Assignment.dueAt = July 12 23:59
ScheduleItem.at = July 12 23:59
TaskCandidate.dueAt = July 12 23:59
```

Reject this.

It looks simple at extraction time but becomes expensive at review time. The user corrects one date and the app has to decide whether to update three records. If one was user-edited, one was agent-generated, and one was imported from a syllabus, conflict resolution becomes a product problem. This also makes StatePatch harder to understand: the Review UI shows multiple changes that are actually one fact.

### Alternative B: Everything is a generic task/event

In this model, an assignment is just a task with a due date, and an exam is just a calendar event.

Reject this.

It destroys academic meaning. An assignment has submission method, requirements, scope, cautions, grading relevance, and evidence. An exam has assessment type, scope, location, allowed materials, and preparation guidance. If those become generic metadata on tasks/events, the product loses the first-class UI that students need.

This would also blur the difference between “the course requires this” and “I plan to work on this.” The user explicitly called out that difference, and the domain model should preserve it.

### Alternative C: Everything is a facet

Example:

```txt
Entity
EntityFacet(type = "deadline")
EntityFacet(type = "coursework")
EntityFacet(type = "assessment")
EntityFacet(type = "task")
EntityFacet(type = "evidence")
```

Reject this for MVP.

It is flexible, but too abstract for the product. The app needs a clean Assignment view, Exam view, Review queue, and task list. The agent also needs a stable output contract. A facet system makes the model theoretically extensible but pushes complexity into UI composition, validation, and review copy.

A limited version is acceptable later: for example, `EvidenceRef`, `Uncertainty`, or maybe an owned `DateAnchor` child record. But do not make Assignment and Exam themselves generic bags of facets.

### Alternative D: Global `ScheduleItem` as the universal time source

In this model, assignments and exams do not own dates. Every date is a `ScheduleItem`, and assignments/exams link to it.

Reject this as the primary MVP model.

It centralizes time, but it makes the academic object feel dependent on a calendar abstraction. A due date is not first a calendar event; it is a property of the assignment. A calendar row is the projection. For MVP, direct academic ownership is easier to explain, review, and correct.

A future internal `DateAnchor` child can be introduced if you need multiple temporal roles like `availableFrom`, `draftDueAt`, `presentationAt`, `gracePeriodEndsAt`, and `latePenaltyStartsAt`. But it should be owned by the academic object, not by a global schedule object.

---

## 6. MVP recommendation

I would ship this model first:

```txt
Course
RawMaterial
EvidenceRef
Assignment
Exam
ScheduleEvent
TaskCandidate
StudentTask
Uncertainty
StatePatch
MarkdownProjection
TimelineEntry      // derived only
```

Be strict about these MVP invariants:

1. **Assignment and Exam are first-class academic objects.**
   Do not reduce them to tasks or calendar events.

2. **Assignment due dates live only on Assignment.**
   The schedule UI derives deadline rows from `Assignment.dueAt`.

3. **Exam dates live only on Exam.**
   The schedule UI derives exam rows from `Exam.startsAt` / `Exam.endsAt`.

4. **TaskCandidate is review-time only.**
   Accepting one creates a `StudentTask`; rejecting one removes it from the review queue.

5. **Linked tasks do not duplicate academic deadlines.**
   A linked task uses `deadlineRef`, not `dueAt`.

6. **Use `ScheduleEvent` only for standalone schedule facts.**
   Class meetings, makeup classes, cancellations, office hours: yes. Assignment deadlines and exam times: no.

7. **Use `TimelineEntry` as the calendar read model.**
   It can be a SQLite view or materialized cache, but it is rebuildable and not directly patched.

8. **StatePatch may change canonical entities, not projections.**
   The agent proposes assignment facts, exam facts, standalone schedule events, and task candidates. It does not propose duplicate calendar rows for facts already owned by assignments/exams.

My opinionated naming recommendation: rename the current broad `ScheduleItem` concept before implementation. Use:

```txt
ScheduleEvent = canonical standalone event
TimelineEntry = derived calendar/timeline row
```

That one rename will remove much of the confusion.

The product model then becomes easy to explain to students:

> “SemesterOps found an assignment. It has a deadline. That deadline appears on your calendar. SemesterOps also suggests actions you may want to take before the deadline.”

That sentence maps cleanly to:

```txt
Assignment -> Assignment.dueAt -> TimelineEntry
Assignment -> TaskCandidate -> StudentTask
RawMaterial -> EvidenceRef -> Assignment fields
StatePatch -> ReviewState -> UserConfirmation -> TrustedState
```

That is the balance I would ship: first-class academic objects, derived operational views, and StatePatch as the only path from agent guess to trusted state.
