import { WEAK_AREAS_BY_EXAM } from '../constants/examAreas'

export function createDailyStudyPlan({ examType, dailyStudyMinutes, weakAreas }) {
  const areas = WEAK_AREAS_BY_EXAM[examType]

  if (!areas || dailyStudyMinutes <= 0) {
    return []
  }

  const validWeakAreas = areas.filter((area) => weakAreas.includes(area))
  const shouldSplitEvenly = validWeakAreas.length === 0 || validWeakAreas.length === areas.length

  if (shouldSplitEvenly) {
    const weakAreaSet = new Set(validWeakAreas)
    return distributeMinutes(areas, dailyStudyMinutes).map((minutes, index) => ({
      area: areas[index],
      minutes,
      isWeak: weakAreaSet.has(areas[index]),
    }))
  }

  const weakAreaSet = new Set(validWeakAreas)
  const normalAreas = areas.filter((area) => !weakAreaSet.has(area))
  const weakTotalMinutes = Math.round(dailyStudyMinutes * 0.7)
  const normalTotalMinutes = dailyStudyMinutes - weakTotalMinutes
  const weakMinutes = distributeMinutes(validWeakAreas, weakTotalMinutes)
  const normalMinutes = distributeMinutes(normalAreas, normalTotalMinutes)
  let weakIndex = 0
  let normalIndex = 0

  return areas.map((area) => {
    if (weakAreaSet.has(area)) {
      const minutes = weakMinutes[weakIndex]
      weakIndex += 1
      return { area, minutes, isWeak: true }
    }

    const minutes = normalMinutes[normalIndex]
    normalIndex += 1
    return { area, minutes, isWeak: false }
  })
}

function distributeMinutes(areas, totalMinutes) {
  const baseMinutes = Math.floor(totalMinutes / areas.length)
  const remainingMinutes = totalMinutes % areas.length

  return areas.map((_, index) => baseMinutes + (index < remainingMinutes ? 1 : 0))
}
