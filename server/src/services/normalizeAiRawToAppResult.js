import { z } from 'zod'
import {
  AdapterContextSchema,
  LegacyAiExtractionMetadataSchema,
  normalizeAiRawToExtractionResult,
  projectExtractionResultToAppAnalysis,
} from '../domain/adapters/index.js'
import { CanonicalNoticeSchema } from '../domain/schemas/canonicalNoticeSchema.js'
import { safeParseAiRawAnalysis } from '../schemas/aiRawSchema.js'
import {
  parseAppAnalysis,
  safeParseAppAnalysis,
} from '../schemas/appAnalysisSchema.js'
import { createValidationError } from '../utils/validationResult.js'

const datePattern = /^\d{4}-\d{2}-\d{2}$/

const sectionByKind = {
  deadline: 'deadlines',
  task: 'tasks',
  submission: 'submissions',
  requirement: 'requirements',
  caution: 'cautions',
}

const DomainAdapterCompatibilityOptionsSchema = z
  .object({
    canonicalNotice: CanonicalNoticeSchema,
    context: AdapterContextSchema,
    extractionMetadata: LegacyAiExtractionMetadataSchema,
  })
  .strict()

function isValidDate(value) {
  if (!datePattern.test(value)) {
    return false
  }

  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

function getNextDate(value) {
  if (!isValidDate(value)) {
    return ''
  }

  const date = new Date(`${value}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + 1)
  return date.toISOString().slice(0, 10)
}

function normalizeWarning(warning, index) {
  if (typeof warning === 'string') {
    return {
      type: 'ai_raw_warning',
      message: warning,
    }
  }

  return {
    type: warning.type || `ai_raw_warning_${index + 1}`,
    message: warning.message,
  }
}

function createStableId(prefix, item, index) {
  const source = [
    prefix,
    item.kind || item.eventType || '',
    item.title,
    item.normalizedDate,
    item.dateExpression,
    item.evidence,
  ].join('|')

  let hash = 0

  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 31 + source.charCodeAt(index)) >>> 0
  }

  return `${prefix}-${index + 1}-${hash.toString(36)}`
}

function createBaseItem(item, sectionName, index) {
  return {
    id: createStableId(sectionName, item, index),
    evidence: item.evidence,
    edited: false,
    dateExpression: item.dateExpression,
    normalizedDate: item.normalizedDate,
    confidence: item.confidence,
    reviewRequired: item.reviewRequired,
  }
}

function normalizeDeadline(item, index) {
  return {
    ...createBaseItem(item, 'deadlines', index),
    title: item.title,
    date: item.normalizedDate,
    time: '',
    description: item.description,
  }
}

function normalizeTask(item, index) {
  return {
    ...createBaseItem(item, 'tasks', index),
    title: item.title,
    dueDate: item.normalizedDate,
    completed: false,
    description: item.description,
  }
}

function normalizeSubmission(item, index) {
  return {
    ...createBaseItem(item, 'submissions', index),
    title: item.title,
    description: item.description,
  }
}

function normalizeRequirement(item, index) {
  return {
    ...createBaseItem(item, 'requirements', index),
    title: item.title,
    description: item.description,
  }
}

function normalizeCaution(item, index) {
  return {
    ...createBaseItem(item, 'cautions', index),
    title: item.title,
    description: item.description,
  }
}

const itemNormalizers = {
  deadline: normalizeDeadline,
  task: normalizeTask,
  submission: normalizeSubmission,
  requirement: normalizeRequirement,
  caution: normalizeCaution,
}

function normalizeCalendarEvent(candidate, index, options) {
  const hasValidDate = isValidDate(candidate.normalizedDate)

  return {
    id: createStableId('event', candidate, index),
    title: candidate.title,
    startDate: hasValidDate ? candidate.normalizedDate : '',
    endDate: hasValidDate ? getNextDate(candidate.normalizedDate) : '',
    time: '',
    allDay: true,
    description: candidate.evidence,
    selected: hasValidDate,
    evidence: candidate.evidence,
    edited: false,
    reviewRequired: candidate.reviewRequired || !hasValidDate,
    dateConfidence: candidate.confidence,
    dateSource: 'ai_raw',
    referenceDate: options.referenceDate || options.noticePublicationDate || '',
    originalDateExpression: candidate.dateExpression,
    eventType: candidate.eventType,
    normalizedDate: candidate.normalizedDate,
    confidence: candidate.confidence,
  }
}

function createEmptyAppResult(aiRaw, options) {
  return {
    title: options.title || options.noticeTitle || '',
    summary: aiRaw.summary,
    detectedNoticeType: options.detectedNoticeType || '',
    userSelectedNoticeType: options.userSelectedNoticeType || 'unknown',
    noticePublicationDate: options.noticePublicationDate || '',
    uploadedFileName: options.uploadedFileName || '',
    deadlines: [],
    tasks: [],
    submissions: [],
    requirements: [],
    cautions: [],
    calendarEvents: [],
    warnings: aiRaw.warnings.map(normalizeWarning),
  }
}

function normalizeAiRawToAppResultLegacy(aiRawInput, options) {
  const aiRawResult = safeParseAiRawAnalysis(aiRawInput)

  if (!aiRawResult.success) {
    throw createValidationError({
      code: 'AI_RAW_SCHEMA_INVALID',
      message: 'AI raw response did not match NoticePilot schema.',
      cause: aiRawResult.error,
    })
  }

  const aiRaw = aiRawResult.data
  const appResult = createEmptyAppResult(aiRaw, options)

  aiRaw.items.forEach((item, index) => {
    const sectionName = sectionByKind[item.kind]
    const normalizeItem = itemNormalizers[item.kind]
    appResult[sectionName].push(normalizeItem(item, index))
  })

  appResult.calendarEvents = aiRaw.calendarEventCandidates.map((candidate, index) =>
    normalizeCalendarEvent(candidate, index, options),
  )

  const appValidationResult = safeParseAppAnalysis(appResult)

  if (!appValidationResult.success) {
    throw createValidationError({
      code: 'APP_ANALYSIS_SCHEMA_INVALID',
      message: 'Normalized analysis result did not match NoticePilot app schema.',
      cause: appValidationResult.error,
      statusCode: 500,
    })
  }

  return appValidationResult.data
}

function normalizeAiRawToAppResultWithDomainAdapters(aiRawInput, options) {
  const domainAdapter = DomainAdapterCompatibilityOptionsSchema.parse(
    options.domainAdapter,
  )
  const extractionResult = normalizeAiRawToExtractionResult({
    aiRawAnalysis: aiRawInput,
    canonicalNotice: domainAdapter.canonicalNotice,
    extractionMetadata: domainAdapter.extractionMetadata,
    context: domainAdapter.context,
  })
  const appResult = projectExtractionResultToAppAnalysis({
    extractionResult,
    projectionContext: {
      title: options.title || options.noticeTitle || '',
      userSelectedNoticeType: options.userSelectedNoticeType || 'unknown',
      noticePublicationDate: options.noticePublicationDate || '',
      uploadedFileName: options.uploadedFileName || '',
      referenceDate: options.referenceDate || options.noticePublicationDate || '',
      userPreferencesSnapshot: options.userPreferencesSnapshot,
    },
  })

  if (!options.detectedNoticeType) {
    return appResult
  }

  return parseAppAnalysis({
    ...appResult,
    detectedNoticeType: options.detectedNoticeType,
  })
}

export function normalizeAiRawToAppResult(aiRawInput, options = {}) {
  if (options.domainAdapter === undefined) {
    return normalizeAiRawToAppResultLegacy(aiRawInput, options)
  }

  return normalizeAiRawToAppResultWithDomainAdapters(aiRawInput, options)
}
