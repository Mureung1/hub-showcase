export const SECTION_LIMITS = {
  deadlines: 8,
  tasks: 30,
  submissions: 20,
  requirements: 30,
  cautions: 20,
  calendarEvents: 12,
}

const sectionNames = Object.keys(SECTION_LIMITS)

function makeWarning(type, message) {
  return { type, message }
}

function normalizeString(value) {
  return typeof value === 'string' ? value : ''
}

function normalizeBoolean(value, fallback = false) {
  return typeof value === 'boolean' ? value : fallback
}

function normalizeItem(item, sectionName, index) {
  const normalizedItem = {
    ...item,
    id: normalizeString(item.id) || `${sectionName}-${index + 1}`,
    evidence: normalizeString(item.evidence),
    edited: normalizeBoolean(item.edited),
  }

  if ('title' in normalizedItem) {
    normalizedItem.title = normalizeString(normalizedItem.title)
  }

  if ('text' in normalizedItem) {
    normalizedItem.text = normalizeString(normalizedItem.text)
  }

  if ('description' in normalizedItem) {
    normalizedItem.description = normalizeString(normalizedItem.description)
  }

  if ('completed' in normalizedItem || sectionName === 'tasks') {
    normalizedItem.completed = normalizeBoolean(normalizedItem.completed)
  }

  if (sectionName === 'calendarEvents') {
    normalizedItem.title = normalizeString(normalizedItem.title)
    normalizedItem.startDate = normalizeString(normalizedItem.startDate)
    normalizedItem.endDate = normalizeString(normalizedItem.endDate)
    normalizedItem.time = normalizeString(normalizedItem.time)
    normalizedItem.description = normalizeString(normalizedItem.description)
    normalizedItem.selected = normalizeBoolean(normalizedItem.selected)
    normalizedItem.allDay = normalizeBoolean(normalizedItem.allDay, true)
    normalizedItem.reviewRequired = normalizeBoolean(normalizedItem.reviewRequired)
    normalizedItem.dateConfidence = normalizeString(normalizedItem.dateConfidence)
    normalizedItem.dateSource = normalizeString(normalizedItem.dateSource)
    normalizedItem.referenceDate = normalizeString(normalizedItem.referenceDate)
    normalizedItem.originalDateExpression = normalizeString(
      normalizedItem.originalDateExpression,
    )
  }

  return normalizedItem
}

function normalizeSection(rawSection, sectionName, warnings, copy) {
  if (!Array.isArray(rawSection)) {
    warnings.push(makeWarning('normalized_fields', copy.normalizedFields(sectionName)))
    return []
  }

  const normalizedItems = rawSection.map((item, index) =>
    normalizeItem(item || {}, sectionName, index),
  )

  if (normalizedItems.length <= SECTION_LIMITS[sectionName]) {
    return normalizedItems
  }

  warnings.push(
    makeWarning(
      'section_limit_applied',
      copy.sectionLimitApplied(sectionName, SECTION_LIMITS[sectionName]),
    ),
  )

  return normalizedItems.slice(0, SECTION_LIMITS[sectionName])
}

function removeExactCalendarDuplicates(calendarEvents, warnings, copy) {
  const seenEvents = new Set()
  let removedCount = 0

  const dedupedEvents = calendarEvents.filter((event) => {
    const duplicateKey = `${event.title}::${event.startDate}`

    if (seenEvents.has(duplicateKey)) {
      removedCount += 1
      return false
    }

    seenEvents.add(duplicateKey)
    return true
  })

  if (removedCount) {
    warnings.push(
      makeWarning('duplicate_calendar_events', copy.duplicatesRemoved(removedCount)),
    )
  }

  return dedupedEvents
}

export function validateAnalysisResult(rawResult, copy) {
  const warnings = Array.isArray(rawResult?.warnings)
    ? rawResult.warnings.filter(
        (warning) => warning?.type && typeof warning.message === 'string',
      )
    : []

  const normalizedResult = {
    ...rawResult,
    title: normalizeString(rawResult?.title),
    summary: normalizeString(rawResult?.summary),
    detectedNoticeType: normalizeString(rawResult?.detectedNoticeType),
    userSelectedNoticeType: normalizeString(rawResult?.userSelectedNoticeType),
    noticePublicationDate: normalizeString(rawResult?.noticePublicationDate),
    uploadedFileName: normalizeString(rawResult?.uploadedFileName),
  }

  sectionNames.forEach((sectionName) => {
    normalizedResult[sectionName] = normalizeSection(
      rawResult?.[sectionName],
      sectionName,
      warnings,
      copy,
    )
  })

  normalizedResult.calendarEvents = removeExactCalendarDuplicates(
    normalizedResult.calendarEvents,
    warnings,
    copy,
  )

  normalizedResult.warnings = warnings

  return normalizedResult
}
