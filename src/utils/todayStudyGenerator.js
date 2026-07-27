import { STUDY_TASK_TEMPLATES_BY_EXAM } from '../constants/studyTaskTemplates'

export function createTodayStudyTasks({ examType, dailyStudyPlan }) {
  const templatesByArea = STUDY_TASK_TEMPLATES_BY_EXAM[examType]

  if (!templatesByArea || !Array.isArray(dailyStudyPlan)) {
    return []
  }

  return dailyStudyPlan.flatMap((planItem) => {
    const templates = templatesByArea[planItem.area]

    if (!templates || templates.length === 0 || planItem.minutes <= 0) {
      return []
    }

    const baseMinutes = Math.floor(planItem.minutes / templates.length)
    const remainderMinutes = planItem.minutes % templates.length

    return templates.map((title, index) => ({
      id: `${examType}-${planItem.area}-${index}`,
      area: planItem.area,
      title,
      minutes: baseMinutes + (index === templates.length - 1 ? remainderMinutes : 0),
      isWeak: planItem.isWeak,
    }))
  })
}
