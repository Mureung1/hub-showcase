# Use first-class academic objects with derived operational views

SemesterOps will model Assignment and Exam as first-class academic objects that own academic facts such as due dates, exam times, requirements, scope, location, cautions, and evidence. Timeline and task surfaces will not duplicate those facts: TimelineEntry is a derived read model, ScheduleEvent is reserved for standalone schedule facts, and linked StudentTask records reference Assignment or Exam deadlines instead of owning duplicate due dates.

This decision avoids the review and correction problems caused by populating the same fact into Assignment, ScheduleItem, and TaskCandidate fields, while preserving product-specific UI for assignments and exams. We reject both "everything is a generic task/event" and "everything is a generic facet" for the MVP because they either erase academic meaning or make the first prototype too abstract to explain.
