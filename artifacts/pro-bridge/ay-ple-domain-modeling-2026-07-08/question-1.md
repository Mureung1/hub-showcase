You are helping design the domain model for AY-PLE, a local-first academic agent app.

I attached the current product brief and glossary. Please read them first, but do not assume the current model is correct. I want you to challenge the model and propose a cleaner one.

Context:
AY-PLE takes messy semester materials from a student, such as syllabus text, LMS notices, PDFs, notes, and images. AY interprets those materials and proposes structured academic state. The user reviews, corrects, and confirms the proposed changes before they become trusted app state.

The modeling problem:
We are struggling with the relationship between these concepts:

- Assignment
- Exam
- TaskCandidate
- ScheduleItem
- Course
- RawMaterial
- StatePatch
- ReviewState
- TrustedState

Example:
A course named “문제해결글쓰기” has an assignment named “개요 작성하기”.
It must be submitted by July 12 at 11:59 PM.
The source text may also mention submission method, required scope, caution notes, grading relevance, or unclear details.

The design tension:
Assignment and Exam feel like first-class academic objects that deserve built-in app UI.
But TaskCandidate and ScheduleItem also seem necessary for task lists and timelines.
We do not want the AI to fill duplicated fields across multiple objects, such as Assignment.dueAt, ScheduleItem.at, and TaskCandidate.dueAt, causing inconsistent state.
We also do not want an over-abstract “everything is a facet” model if it makes the product hard to understand or implement.

Please propose a domain model that balances:
1. Clear product concepts for students
2. Minimal duplicated source-of-truth fields
3. Good UI composition for assignment views, exam views, task views, and timeline/calendar views
4. Agent-friendly output structure
5. User review through StatePatch
6. Future extensibility without making the MVP too abstract

Please answer in this structure:

1. Diagnosis of the current modeling problem
   - What is conceptually confused?
   - Which objects should be first-class?
   - Which objects should be projections, derived views, links, or independent records?

2. Recommended model
   - Define the canonical entities.
   - Define ownership of due dates, exam dates, locations, requirements, scope, cautions, and evidence.
   - Explain whether TaskCandidate and ScheduleItem are independent objects, derived objects, projections, or linked operational objects.

3. Worked example
   Use the “문제해결글쓰기 / 개요 작성하기 / July 12 11:59 PM” example.
   Show how it would be represented in the model.
   Show what the assignment UI, task UI, and schedule UI would read from.

4. StatePatch implications
   Explain how the AI should propose changes without duplicating facts.
   Show an example StatePatch for the assignment.
   Show how a user correction to the due date should propagate.

5. Alternative models
   Give 2-3 alternative designs and explain why you reject them.

6. MVP recommendation
   Give the simplest model you would actually ship first.
   Be opinionated. Avoid vague “it depends” answers.

Important:
Please distinguish academic meaning from operational views.
For example, “an assignment exists because the course requires work” is different from “a deadline appears on a calendar” or “the student should draft an outline”.