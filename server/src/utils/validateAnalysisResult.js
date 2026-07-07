export const SECTION_LIMITS = {
  deadlines: 8,
  tasks: 30,
  submissions: 20,
  requirements: 30,
  cautions: 20,
  calendarEvents: 12,
}

export const serverValidationWarnings = {
  normalizedFields: (sectionName) =>
    `${sectionName} was missing or invalid and was normalized.`,
  sectionLimitApplied: (sectionName, limit) =>
    `${sectionName} was trimmed to the MVP limit of ${limit} items.`,
  duplicatesRemoved: (count) =>
    `${count} duplicate calendar event${count === 1 ? '' : 's'} removed.`,
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

function normalizePlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function normalizeBaseItem(rawItem, sectionName, index) {
  return {
    id: normalizeString(rawItem.id) || `${sectionName}-${index + 1}`,
    evidence: normalizeString(rawItem.evidence),
    edited: normalizeBoolean(rawItem.edited),
  }
}

function normalizeTitleOrText(rawItem) {
  return normalizeString(rawItem.title) || normalizeString(rawItem.text)
}

function normalizeDeadline(item, sectionName, index) {
  const rawItem = normalizePlainObject(item)

  return {
    ...normalizeBaseItem(rawItem, sectionName, index),
    title: normalizeString(rawItem.title),
    date: normalizeString(rawItem.date),
    time: normalizeString(rawItem.time),
    description: normalizeString(rawItem.description),
  }
}

function normalizeTask(item, sectionName, index) {
  const rawItem = normalizePlainObject(item)

  return {
    ...normalizeBaseItem(rawItem, sectionName, index),
    title: normalizeString(rawItem.title),
    dueDate: normalizeString(rawItem.dueDate),
    completed: normalizeBoolean(rawItem.completed),
    description: normalizeString(rawItem.description),
  }
}

function normalizeSubmission(item, sectionName, index) {
  const rawItem = normalizePlainObject(item)

  return {
    ...normalizeBaseItem(rawItem, sectionName, index),
    title: normalizeString(rawItem.title),
    description: normalizeString(rawItem.description),
  }
}

function normalizeRequirement(item, sectionName, index) {
  const rawItem = normalizePlainObject(item)

  return {
    ...normalizeBaseItem(rawItem, sectionName, index),
    title: normalizeTitleOrText(rawItem),
    description: normalizeString(rawItem.description),
  }
}

function normalizeCaution(item, sectionName, index) {
  const rawItem = normalizePlainObject(item)

  return {
    ...normalizeBaseItem(rawItem, sectionName, index),
    title: normalizeTitleOrText(rawItem),
    description: normalizeString(rawItem.description),
  }
}

function normalizeCalendarEvent(item, sectionName, index) {
  const rawItem = normalizePlainObject(item)

  return {
    ...normalizeBaseItem(rawItem, sectionName, index),
    title: normalizeString(rawItem.title),
    startDate: normalizeString(rawItem.startDate),
    endDate: normalizeString(rawItem.endDate),
    time: normalizeString(rawItem.time),
    description: normalizeString(rawItem.description),
    selected: normalizeBoolean(rawItem.selected),
    allDay: normalizeBoolean(rawItem.allDay, true),
    reviewRequired: normalizeBoolean(rawItem.reviewRequired),
    dateConfidence: normalizeString(rawItem.dateConfidence),
    dateSource: normalizeString(rawItem.dateSource),
    referenceDate: normalizeString(rawItem.referenceDate),
    originalDateExpression: normalizeString(rawItem.originalDateExpression),
  }
}

const itemNormalizers = {
  deadlines: normalizeDeadline,
  tasks: normalizeTask,
  submissions: normalizeSubmission,
  requirements: normalizeRequirement,
  cautions: normalizeCaution,
  calendarEvents: normalizeCalendarEvent,
}

function normalizeSection(rawSection, sectionName, warnings, copy) {
  if (!Array.isArray(rawSection)) {
    warnings.push(makeWarning('normalized_fields', copy.normalizedFields(sectionName)))
    return []
  }

  const normalizeItem = itemNormalizers[sectionName]
  const normalizedItems = rawSection.map((item, index) =>
    normalizeItem(item, sectionName, index),
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

export function validateAnalysisResult(rawResult, copy = serverValidationWarnings) {
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
