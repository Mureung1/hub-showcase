We decided to adopt the domain model you recommended:
Assignment and Exam are first-class academic objects.
Assignment.dueAt and Exam.startsAt/endsAt own academic time facts.
ScheduleEvent is only for standalone schedule facts.
TimelineEntry is a derived read model.
TaskCandidate is review-time only, and accepted actions become StudentTask.
Linked tasks reference academic deadlines instead of duplicating them.

Now help translate this model into today's MVP product brief and static HTML/CSS prototype.

Question:
What should the first prototype screen composition be so that a student immediately understands this model?

Please propose:
1. The minimum set of screens or panels for the prototype
2. What each panel should show
3. How the “문제해결글쓰기 / 개요 작성하기 / July 12 23:59” example should appear across:
   - Assignment UI
   - Review Queue
   - Timeline
   - Task list
   - Evidence/source panel
4. Which UI elements should be visibly first-class, and which should be derived/read-only
5. What not to prototype today to keep scope tight

Be opinionated and optimize for a one-day camp deliverable.