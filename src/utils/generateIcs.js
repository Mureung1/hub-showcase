const datePattern = /^\d{4}-\d{2}-\d{2}$/

function isValidDate(value) {
  if (!datePattern.test(value)) {
    return false
  }

  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

function toIcsDate(value) {
  return value.replaceAll('-', '')
}

function getNextDate(value) {
  const date = new Date(`${value}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + 1)
  return date.toISOString().slice(0, 10)
}

function escapeIcsText(value = '') {
  return String(value)
    .replaceAll('\\', '\\\\')
    .replaceAll('\n', '\\n')
    .replaceAll(',', '\\,')
    .replaceAll(';', '\\;')
}

function createEventUid(event) {
  return `${event.id || event.title}-${event.startDate}@noticepilot.local`
}

export function getExportableCalendarEvents(analysisResult) {
  if (!analysisResult) {
    return []
  }

  return analysisResult.calendarEvents.filter(
    (event) => event.selected && isValidDate(event.startDate),
  )
}

export function generateIcs(analysisResult) {
  const events = getExportableCalendarEvents(analysisResult)

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//NoticePilot//Calendar Export//EN',
    'CALSCALE:GREGORIAN',
    ...events.flatMap((event) => [
      'BEGIN:VEVENT',
      `UID:${escapeIcsText(createEventUid(event))}`,
      `SUMMARY:${escapeIcsText(event.title)}`,
      `DTSTART;VALUE=DATE:${toIcsDate(event.startDate)}`,
      `DTEND;VALUE=DATE:${toIcsDate(getNextDate(event.startDate))}`,
      event.description ? `DESCRIPTION:${escapeIcsText(event.description)}` : '',
      'END:VEVENT',
    ]),
    'END:VCALENDAR',
    '',
  ]
    .filter(Boolean)
    .join('\r\n')
}
