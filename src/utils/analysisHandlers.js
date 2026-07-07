const sectionNames = [
  'deadlines',
  'tasks',
  'submissions',
  'requirements',
  'cautions',
  'calendarEvents',
]

function isKnownSection(sectionName) {
  return sectionNames.includes(sectionName)
}

function shouldMarkEdited(updates) {
  const toggleOnlyFields = ['completed', 'selected']
  return Object.keys(updates).some((field) => !toggleOnlyFields.includes(field))
}

export function updateSectionItem(analysisResult, sectionName, itemId, updates) {
  if (!analysisResult || !isKnownSection(sectionName)) {
    return analysisResult
  }

  return {
    ...analysisResult,
    [sectionName]: analysisResult[sectionName].map((item) =>
      item.id === itemId
        ? { ...item, ...updates, edited: item.edited || shouldMarkEdited(updates) }
        : item,
    ),
  }
}

export function deleteSectionItem(analysisResult, sectionName, itemId) {
  if (!analysisResult || !isKnownSection(sectionName)) {
    return analysisResult
  }

  return {
    ...analysisResult,
    [sectionName]: analysisResult[sectionName].filter((item) => item.id !== itemId),
  }
}

export function toggleTaskCompleted(analysisResult, itemId, completed) {
  return updateSectionItem(analysisResult, 'tasks', itemId, { completed })
}

export function toggleCalendarEventSelected(analysisResult, itemId, selected) {
  return updateSectionItem(analysisResult, 'calendarEvents', itemId, { selected })
}

export function updateCalendarEventField(analysisResult, itemId, updates) {
  return updateSectionItem(analysisResult, 'calendarEvents', itemId, updates)
}

export function removeDuplicateCalendarEvents(analysisResult) {
  if (!analysisResult) {
    return { analysisResult, removedCount: 0 }
  }

  const seenEvents = new Set()
  let removedCount = 0

  const calendarEvents = analysisResult.calendarEvents.filter((event) => {
    const duplicateKey = `${event.title}::${event.startDate}`

    if (seenEvents.has(duplicateKey)) {
      removedCount += 1
      return false
    }

    seenEvents.add(duplicateKey)
    return true
  })

  return {
    analysisResult: {
      ...analysisResult,
      calendarEvents,
    },
    removedCount,
  }
}
