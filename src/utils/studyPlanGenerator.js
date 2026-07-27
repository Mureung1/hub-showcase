import { WEAK_AREAS_BY_EXAM } from '../constants/examAreas'

export function createDailyStudyPlan({ examType, dailyStudyMinutes, weakAreas, priorityArea = '' }) {
  const areas = WEAK_AREAS_BY_EXAM[examType]

  if (!areas || dailyStudyMinutes <= 0) {
    return []
  }

  const validWeakAreas = areas.filter((area) => weakAreas.includes(area))
  const validPriorityArea = validWeakAreas.includes(priorityArea) ? priorityArea : ''

  if (validPriorityArea && validWeakAreas.length < areas.length) {
    return createPriorityStudyPlan({
      areas,
      dailyStudyMinutes,
      priorityArea: validPriorityArea,
      weakAreas: validWeakAreas,
    })
  }

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

export function createAdaptiveDailyStudyPlan({ examType, dailyStudyMinutes, weakAreas = [], previousRecord = null }) {
  const areas = WEAK_AREAS_BY_EXAM[examType]

  if (!areas || dailyStudyMinutes <= 0) {
    return {
      priorityArea: '',
      reason: '이전 기록이 없어 처음 선택한 취약 영역을 기준으로 계획을 만들었습니다.',
      previousRecordDate: null,
      plan: [],
    }
  }

  if (!previousRecord) {
    const plan = createDailyStudyPlan({ examType, dailyStudyMinutes, weakAreas })
    const priorityArea = weakAreas.find((area) => areas.includes(area)) || plan[0]?.area || ''

    return {
      priorityArea,
      reason: '이전 기록이 없어 처음 선택한 취약 영역을 기준으로 계획을 만들었습니다.',
      previousRecordDate: null,
      plan,
    }
  }

  const validWeakAreas = areas.filter((area) => weakAreas.includes(area))
  const weakAreaSet = new Set(validWeakAreas)
  const generatedTasks = Array.isArray(previousRecord.generatedTasks) ? previousRecord.generatedTasks : []
  const completedTaskIds = Array.isArray(previousRecord.completedTaskIds) ? previousRecord.completedTaskIds : []
  const completedTaskIdSet = new Set(completedTaskIds)
  const scoresByArea = new Map(areas.map((area) => [area, 0]))
  const tasksByArea = new Map(areas.map((area) => [area, []]))

  generatedTasks.forEach((task) => {
    if (tasksByArea.has(task.area)) {
      tasksByArea.get(task.area).push(task)

      if (!completedTaskIdSet.has(task.id)) {
        scoresByArea.set(task.area, scoresByArea.get(task.area) + 2)
      }
    }
  })

  if (areas.includes(previousRecord.nextPriorityArea)) {
    scoresByArea.set(previousRecord.nextPriorityArea, scoresByArea.get(previousRecord.nextPriorityArea) + 4)
  }

  if (areas.includes(previousRecord.difficultArea)) {
    scoresByArea.set(previousRecord.difficultArea, scoresByArea.get(previousRecord.difficultArea) + 3)
  }

  validWeakAreas.forEach((area) => {
    scoresByArea.set(area, scoresByArea.get(area) + 1)
  })

  areas.forEach((area) => {
    const areaTasks = tasksByArea.get(area)

    if (areaTasks.length > 0 && areaTasks.every((task) => completedTaskIdSet.has(task.id))) {
      scoresByArea.set(area, scoresByArea.get(area) - 1)
    }
  })

  const priorityArea = chooseAdaptivePriorityArea({
    areas,
    scoresByArea,
    weakAreas: validWeakAreas,
    nextPriorityArea: previousRecord.nextPriorityArea,
    difficultArea: previousRecord.difficultArea,
  })
  const weights = areas.map((area) => Math.max(1, 1 + scoresByArea.get(area)))
  const minutesByArea = distributeWeightedMinutes({ totalMinutes: dailyStudyMinutes, weights, minimumMinutes: 5 })
  const plan = areas.map((area, index) => ({
    area,
    minutes: minutesByArea[index],
    isWeak: weakAreaSet.has(area),
    isPriority: area === priorityArea,
    adaptiveScore: scoresByArea.get(area),
  }))

  return {
    priorityArea,
    reason: createAdaptiveReason({ priorityArea, previousRecord }),
    previousRecordDate: previousRecord.studyDate || previousRecord.recordDate || null,
    plan,
  }
}

export function getPriorityAreaFromNote({ areas, weakAreas, weakAreaNote }) {
  if (!Array.isArray(areas) || !Array.isArray(weakAreas) || !weakAreaNote) {
    return ''
  }

  const normalizedNote = weakAreaNote.toLowerCase()

  return areas.find((area) => weakAreas.includes(area) && normalizedNote.includes(area.toLowerCase())) || ''
}

function createPriorityStudyPlan({ areas, dailyStudyMinutes, priorityArea, weakAreas }) {
  const weakAreaSet = new Set(weakAreas)
  const otherWeakAreas = weakAreas.filter((area) => area !== priorityArea)
  const normalAreas = areas.filter((area) => !weakAreaSet.has(area))
  const priorityMinutes = Math.round(dailyStudyMinutes * 0.4)
  const otherWeakTotalMinutes = Math.round(dailyStudyMinutes * 0.4)
  const normalTotalMinutes = dailyStudyMinutes - priorityMinutes - otherWeakTotalMinutes
  const otherWeakMinutes = distributeMinutes(otherWeakAreas, otherWeakTotalMinutes)
  const normalMinutes = distributeMinutes(normalAreas, normalTotalMinutes)
  let otherWeakIndex = 0
  let normalIndex = 0

  return areas.map((area) => {
    if (area === priorityArea) {
      return { area, minutes: priorityMinutes, isWeak: true, isPriority: true }
    }

    if (weakAreaSet.has(area)) {
      const minutes = otherWeakMinutes[otherWeakIndex]
      otherWeakIndex += 1
      return { area, minutes, isWeak: true }
    }

    const minutes = normalMinutes[normalIndex]
    normalIndex += 1
    return { area, minutes, isWeak: false }
  })
}

function distributeMinutes(areas, totalMinutes) {
  if (areas.length === 0) {
    return []
  }

  const baseMinutes = Math.floor(totalMinutes / areas.length)
  const remainingMinutes = totalMinutes % areas.length

  return areas.map((_, index) => baseMinutes + (index < remainingMinutes ? 1 : 0))
}

function distributeWeightedMinutes({ totalMinutes, weights, minimumMinutes }) {
  if (weights.length === 0) {
    return []
  }

  const minimumTotal = minimumMinutes * weights.length

  if (totalMinutes <= minimumTotal) {
    return distributeMinutes(weights, totalMinutes)
  }

  const distributableMinutes = totalMinutes - minimumTotal
  const totalWeight = weights.reduce((total, weight) => total + weight, 0)
  const rawShares = weights.map((weight) => (distributableMinutes * weight) / totalWeight)
  const floorShares = rawShares.map(Math.floor)
  let remainingMinutes = distributableMinutes - floorShares.reduce((total, minutes) => total + minutes, 0)
  const order = rawShares
    .map((share, index) => ({ index, remainder: share - floorShares[index] }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index)

  const minutes = floorShares.map((share) => share + minimumMinutes)

  order.forEach(({ index }) => {
    if (remainingMinutes > 0) {
      minutes[index] += 1
      remainingMinutes -= 1
    }
  })

  return minutes
}

function chooseAdaptivePriorityArea({ areas, scoresByArea, weakAreas, nextPriorityArea, difficultArea }) {
  const highestScore = Math.max(...areas.map((area) => scoresByArea.get(area)))
  const candidates = areas.filter((area) => scoresByArea.get(area) === highestScore)

  if (candidates.includes(nextPriorityArea)) {
    return nextPriorityArea
  }

  if (candidates.includes(difficultArea)) {
    return difficultArea
  }

  const weakCandidate = weakAreas.find((area) => candidates.includes(area))

  if (weakCandidate) {
    return weakCandidate
  }

  return candidates[0] || ''
}

function createAdaptiveReason({ priorityArea, previousRecord }) {
  const previousDate = previousRecord.studyDate || previousRecord.recordDate || '이전'
  const generatedTasks = Array.isArray(previousRecord.generatedTasks) ? previousRecord.generatedTasks : []
  const completedTaskIds = Array.isArray(previousRecord.completedTaskIds) ? previousRecord.completedTaskIds : []
  const incompleteCount = generatedTasks.filter((task) => task.area === priorityArea && !completedTaskIds.includes(task.id)).length
  const reasons = []

  if (incompleteCount > 0) {
    reasons.push(`${priorityArea} 미완료 항목이 많고`)
  }

  if (previousRecord.nextPriorityArea === priorityArea) {
    reasons.push('다음 우선 영역으로 선택되어')
  } else if (previousRecord.difficultArea === priorityArea) {
    reasons.push('가장 어려웠던 영역으로 기록되어')
  }

  if (reasons.length === 0) {
    reasons.push('이전 학습 기록을 바탕으로')
  }

  return `${previousDate} 기록에서 ${reasons.join(' ')} 오늘 ${priorityArea} 비중을 높였습니다.`
}
