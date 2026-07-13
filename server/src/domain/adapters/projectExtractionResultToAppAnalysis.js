import { z } from 'zod'
import { ExtractionResultSchema } from '../schemas/extractionSchema.js'
import {
  AppUserPreferencesSnapshotSchema,
  parseAppAnalysis,
} from '../../schemas/appAnalysisSchema.js'

export const AppAnalysisProjectionContextSchema = z
  .object({
    title: z.string(),
    userSelectedNoticeType: z.string(),
    noticePublicationDate: z.string(),
    uploadedFileName: z.string(),
    referenceDate: z.string(),
    userPreferencesSnapshot: AppUserPreferencesSnapshotSchema.optional(),
  })
  .strict()

const AppAnalysisProjectionArgumentsSchema = z
  .object({
    extractionResult: ExtractionResultSchema,
    projectionContext: AppAnalysisProjectionContextSchema,
  })
  .strict()

function getFirstEvidenceText(value) {
  return value.evidence[0]?.exactText || ''
}

function getNextDate(value) {
  const date = new Date(`${value}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + 1)
  return date.toISOString().slice(0, 10)
}

function createBaseItemProjection(item) {
  return {
    id: item.itemId,
    evidence: getFirstEvidenceText(item),
    edited: false,
    dateExpression: item.dateExpression,
    normalizedDate: item.normalizedDate || '',
    confidence: item.confidence,
    reviewRequired: item.reviewRequired,
  }
}

function projectDeadline(item) {
  return {
    ...createBaseItemProjection(item),
    title: item.title,
    date: item.normalizedDate || '',
    time: item.normalizedTime || '',
    description: item.description,
  }
}

function projectTask(item) {
  return {
    ...createBaseItemProjection(item),
    title: item.title,
    dueDate: item.normalizedDate || '',
    completed: false,
    description: item.description,
  }
}

function projectSubmission(item) {
  return {
    ...createBaseItemProjection(item),
    title: item.title,
    description: item.description,
  }
}

function projectRequirement(item) {
  return {
    ...createBaseItemProjection(item),
    title: item.title,
    description: item.description,
  }
}

function projectCaution(item) {
  return {
    ...createBaseItemProjection(item),
    title: item.title,
    description: item.description,
  }
}

const itemProjectionByKind = {
  deadline: ['deadlines', projectDeadline],
  task: ['tasks', projectTask],
  submission: ['submissions', projectSubmission],
  requirement: ['requirements', projectRequirement],
  caution: ['cautions', projectCaution],
}

function projectCalendarEventCandidate(candidate, projectionContext) {
  const hasDate = candidate.normalizedDate !== null
  const evidence = getFirstEvidenceText(candidate)

  return {
    id: candidate.candidateId,
    title: candidate.title,
    startDate: hasDate ? candidate.normalizedDate : '',
    endDate: hasDate ? getNextDate(candidate.normalizedDate) : '',
    time: candidate.normalizedTime || '',
    description: candidate.description || evidence,
    selected: hasDate,
    allDay: candidate.isAllDay !== false,
    evidence,
    edited: false,
    reviewRequired: candidate.reviewRequired,
    dateConfidence: candidate.confidence,
    dateSource: 'core_extraction',
    referenceDate: projectionContext.referenceDate,
    originalDateExpression: candidate.dateExpression,
    eventType: candidate.eventType,
    normalizedDate: candidate.normalizedDate || '',
    confidence: candidate.confidence,
  }
}

export function projectExtractionResultToAppAnalysis(input) {
  const { extractionResult, projectionContext } =
    AppAnalysisProjectionArgumentsSchema.parse(input)

  const appAnalysis = {
    title: projectionContext.title,
    summary: extractionResult.summary,
    detectedNoticeType: extractionResult.detectedNoticeType,
    userSelectedNoticeType: projectionContext.userSelectedNoticeType,
    noticePublicationDate: projectionContext.noticePublicationDate,
    uploadedFileName: projectionContext.uploadedFileName,
    deadlines: [],
    tasks: [],
    submissions: [],
    requirements: [],
    cautions: [],
    calendarEvents: extractionResult.calendarEventCandidates.map((candidate) =>
      projectCalendarEventCandidate(candidate, projectionContext),
    ),
    warnings: extractionResult.warnings.map((warning) => ({
      type: warning.type,
      message: warning.message,
    })),
  }

  extractionResult.items.forEach((item) => {
    const [sectionName, projectItem] = itemProjectionByKind[item.kind]
    appAnalysis[sectionName].push(projectItem(item))
  })

  if (projectionContext.userPreferencesSnapshot !== undefined) {
    appAnalysis.metadata = {
      userPreferencesSnapshot: projectionContext.userPreferencesSnapshot,
    }
  }

  return parseAppAnalysis(appAnalysis)
}
