import { Router } from 'express'

import {
  DEFAULT_AI_CONTEXT_CONFIG,
  RESOURCE_TYPE,
  RESOURCE_UPLOAD,
  isAiContextConfig,
  isProjectIcon,
  isProjectStatus,
  isResourceType,
  isTaskStatus,
} from '@teamflow/shared'

import { createAuthenticationMiddleware } from '../lib/auth.js'
import { TeamFlowApiError } from './aiErrors.js'
import {
  TeamFlowConflictError,
  TeamFlowNotFoundError,
  TeamFlowValidationError,
} from './teamFlowRepository.js'

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIME_TYPE_PATTERN = /^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/i
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const DEFAULT_AI_AGENT_COLOR = '#6950b8'

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value ?? {}, key)
}

function calendarDate(value, optional = false) {
  if (optional && (value === '' || value == null)) return true
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value
}

function cleanString(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function cleanFileName(value) {
  return cleanString(value).replace(/[\p{Cc}\\/]/gu, '_')
}

function validHttpUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return false
  try {
    const url = new URL(value.trim())
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function validateProject(body, { partial = false } = {}) {
  const value = {}
  const fields = {}
  const keys = ['name', 'description', 'status', 'startDate', 'endDate', 'iconKey']
  const included = keys.filter((key) => hasOwn(body, key))
  if (partial && included.length === 0) fields.body = '수정할 프로젝트 정보를 입력해 주세요.'

  if (!partial || hasOwn(body, 'name')) {
    value.name = cleanString(body?.name)
    if (!value.name || value.name.length > 120) fields.name = '프로젝트 이름은 1자 이상 120자 이하여야 합니다.'
  }
  if (!partial || hasOwn(body, 'description')) {
    value.description = cleanString(body?.description)
    if (value.description.length > 500) fields.description = '설명은 500자 이하여야 합니다.'
  }
  if (!partial || hasOwn(body, 'status')) {
    value.status = body?.status
    if (!isProjectStatus(value.status)) fields.status = '프로젝트 상태를 확인해 주세요.'
  }
  if (!partial || hasOwn(body, 'startDate')) {
    value.startDate = body?.startDate ?? ''
    if (!calendarDate(value.startDate, true)) fields.startDate = '시작일을 확인해 주세요.'
  }
  if (!partial || hasOwn(body, 'endDate')) {
    value.endDate = body?.endDate ?? ''
    if (!calendarDate(value.endDate, true)) fields.endDate = '종료일을 확인해 주세요.'
  }
  if (hasOwn(body, 'iconKey')) {
    value.iconKey = body.iconKey
    if (!isProjectIcon(value.iconKey)) fields.iconKey = '프로젝트 아이콘을 확인해 주세요.'
  }
  if (
    hasOwn(value, 'startDate')
    && hasOwn(value, 'endDate')
    && value.startDate
    && value.endDate
    && value.endDate < value.startDate
  ) fields.endDate = '종료일은 시작일보다 빠를 수 없습니다.'

  return Object.keys(fields).length ? { fields } : { value }
}

function validateMemberPatch(body) {
  const value = {
    role: cleanString(body?.role),
    description: cleanString(body?.description),
    color: cleanString(body?.color) || '#3a6898',
  }
  const fields = {}
  if (!value.role || value.role.length > 120) fields.role = '역할은 1자 이상 120자 이하여야 합니다.'
  if (value.description.length > 500) fields.description = '소개는 500자 이하여야 합니다.'
  if (!/^#[0-9a-f]{6}$/i.test(value.color)) fields.color = '색상 값을 확인해 주세요.'
  return Object.keys(fields).length ? { fields } : { value }
}

export function validateTaskCreateInput(body) {
  const value = {
    projectId: cleanString(body?.projectId),
    title: cleanString(body?.title),
    assigneeId: cleanString(body?.assigneeId),
    dueDate: body?.dueDate ?? '',
    status: body?.status,
    description: body?.description === undefined ? '' : body.description,
  }
  const fields = {}
  if (!UUID_PATTERN.test(value.projectId)) fields.projectId = '프로젝트 ID를 확인해 주세요.'
  if (!value.title || value.title.length > 200) fields.title = '제목은 1자 이상 200자 이하여야 합니다.'
  if (!UUID_PATTERN.test(value.assigneeId)) fields.assigneeId = '담당자 ID를 확인해 주세요.'
  if (!calendarDate(value.dueDate)) fields.dueDate = '마감일을 확인해 주세요.'
  if (!isTaskStatus(value.status)) fields.status = '진행 상태를 확인해 주세요.'
  if (typeof value.description !== 'string' || value.description.length > 2000) fields.description = '설명은 2000자 이하여야 합니다.'
  return Object.keys(fields).length ? { fields } : { value }
}

function validateTaskPatch(body) {
  const value = {}
  const fields = {}
  const keys = ['title', 'assigneeId', 'dueDate', 'status', 'description']
  if (!keys.some((key) => hasOwn(body, key))) fields.body = '수정할 할 일 정보를 입력해 주세요.'

  if (hasOwn(body, 'title')) {
    value.title = cleanString(body.title)
    if (!value.title || value.title.length > 200) fields.title = '제목은 1자 이상 200자 이하여야 합니다.'
  }
  if (hasOwn(body, 'assigneeId')) {
    value.assigneeId = cleanString(body.assigneeId)
    if (!UUID_PATTERN.test(value.assigneeId)) fields.assigneeId = '담당자 ID를 확인해 주세요.'
  }
  if (hasOwn(body, 'dueDate')) {
    value.dueDate = body.dueDate
    if (!calendarDate(value.dueDate)) fields.dueDate = '마감일을 확인해 주세요.'
  }
  if (hasOwn(body, 'status')) {
    value.status = body.status
    if (!isTaskStatus(value.status)) fields.status = '진행 상태를 확인해 주세요.'
  }
  if (hasOwn(body, 'description')) {
    value.description = body.description
    if (typeof value.description !== 'string' || value.description.length > 2000) fields.description = '설명은 2000자 이하여야 합니다.'
  }
  return Object.keys(fields).length ? { fields } : { value }
}

function validateNote(body, { partial = false } = {}) {
  const value = {}
  const fields = {}
  const keys = ['title', 'content']
  if (partial && !keys.some((key) => hasOwn(body, key))) fields.body = '수정할 노트 정보를 입력해 주세요.'

  if (!partial || hasOwn(body, 'title')) {
    value.title = typeof body?.title === 'string' ? body.title.trim() : ''
    if (!value.title || value.title.length > 200) fields.title = '노트 제목은 1자 이상 200자 이하여야 합니다.'
  }
  if (!partial || hasOwn(body, 'content')) {
    value.content = body?.content
    if (typeof value.content !== 'string' || value.content.length > 100000) fields.content = '노트 내용은 100,000자 이하여야 합니다.'
  }
  return Object.keys(fields).length ? { fields } : { value }
}

function validateResource(body, { partial = false } = {}) {
  const value = {}
  const fields = {}
  const keys = ['name', 'description', 'type', 'parentId', 'url']
  if (partial && !keys.some((key) => hasOwn(body, key))) fields.body = '수정할 자료 정보를 입력해 주세요.'

  if (!partial || hasOwn(body, 'name')) {
    value.name = cleanString(body?.name)
    if (!value.name || value.name.length > 200) fields.name = '자료 이름은 1자 이상 200자 이하여야 합니다.'
  }
  if (!partial || hasOwn(body, 'description')) {
    value.description = cleanString(body?.description)
    if (value.description.length > 2000) fields.description = '설명은 2000자 이하여야 합니다.'
  }
  if (!partial || hasOwn(body, 'type')) {
    value.type = body?.type
    if (!isResourceType(value.type)) fields.type = '자료 유형을 확인해 주세요.'
  }
  if (!partial || hasOwn(body, 'parentId')) {
    value.parentId = body?.parentId || null
    if (value.parentId !== null && !UUID_PATTERN.test(value.parentId)) fields.parentId = '폴더 ID를 확인해 주세요.'
  }
  if (!partial || hasOwn(body, 'url')) {
    value.url = cleanString(body?.url) || null
    if (value.url && (value.url.length > 2048 || !validHttpUrl(value.url))) fields.url = '2048자 이하의 http 또는 https 주소를 입력해 주세요.'
  }

  if (value.type === RESOURCE_TYPE.FOLDER) {
    if (value.parentId) fields.parentId = '폴더는 자료실 루트에만 만들 수 있습니다.'
    if (value.url) fields.url = '폴더에는 외부 주소를 저장할 수 없습니다.'
  }
  if (value.type === RESOURCE_TYPE.LINK && !value.url) fields.url = '링크 자료에는 외부 주소가 필요합니다.'

  return Object.keys(fields).length ? { fields } : { value }
}

function validateResourceUpload(body) {
  const value = {
    name: cleanString(body?.name),
    description: cleanString(body?.description),
    parentId: body?.parentId || null,
    originalName: cleanFileName(body?.originalName),
    mimeType: (cleanString(body?.mimeType) || 'application/octet-stream').toLocaleLowerCase('en-US'),
    sizeBytes: body?.sizeBytes,
  }
  const fields = {}

  if (!value.name || value.name.length > 200) fields.name = '자료 이름은 1자 이상 200자 이하여야 합니다.'
  if (value.description.length > 2000) fields.description = '설명은 2000자 이하여야 합니다.'
  if (value.parentId !== null && !UUID_PATTERN.test(value.parentId)) fields.parentId = '폴더 ID를 확인해 주세요.'
  if (!value.originalName || value.originalName.length > 200) fields.file = '올바른 파일을 선택해 주세요.'
  if (!MIME_TYPE_PATTERN.test(value.mimeType)) fields.file = '파일 형식을 확인해 주세요.'
  if (!Number.isSafeInteger(value.sizeBytes) || value.sizeBytes <= 0 || value.sizeBytes > RESOURCE_UPLOAD.MAX_BYTES) {
    fields.file = `파일 크기는 1바이트 이상 ${Math.floor(RESOURCE_UPLOAD.MAX_BYTES / 1024 / 1024)}MB 이하여야 합니다.`
  }

  value.type = /^image\/(?!svg\+xml$)/i.test(value.mimeType)
    ? RESOURCE_TYPE.IMAGE
    : RESOURCE_TYPE.DOCUMENT

  return Object.keys(fields).length ? { fields } : { value }
}

function validateInvitation(body) {
  const email = cleanString(body?.inviteeEmail ?? body?.email).toLocaleLowerCase('en-US')
  return EMAIL_PATTERN.test(email) && email.length <= 320
    ? { value: { email } }
    : { fields: { email: '올바른 이메일 주소를 입력해 주세요.' } }
}

function validateAiAgentCreate(body) {
  const value = {
    name: cleanString(body?.name),
    role: cleanString(body?.role),
    description: body?.description === undefined ? '' : cleanString(body.description),
    color: body?.color === undefined ? DEFAULT_AI_AGENT_COLOR : cleanString(body.color),
    instructions: body?.instructions === undefined ? '' : body.instructions,
    contextConfig: body?.contextConfig === undefined
      ? { ...DEFAULT_AI_CONTEXT_CONFIG }
      : body.contextConfig,
  }
  const fields = {}

  if (!value.name || value.name.length > 80) {
    fields.name = 'AI Agent 이름은 1자 이상 80자 이하여야 합니다.'
  }
  if (!value.role || value.role.length > 120) {
    fields.role = '역할은 1자 이상 120자 이하여야 합니다.'
  }
  if (body?.description !== undefined && typeof body.description !== 'string') {
    fields.description = '소개는 500자 이하여야 합니다.'
  } else if (value.description.length > 500) {
    fields.description = '소개는 500자 이하여야 합니다.'
  }
  if (!/^#[0-9a-f]{6}$/i.test(value.color)) {
    fields.color = '색상 값을 확인해 주세요.'
  }
  if (typeof value.instructions !== 'string' || value.instructions.length > 10_000) {
    fields.instructions = '역할 지시사항은 10,000자 이하여야 합니다.'
  }
  if (!isAiContextConfig(value.contextConfig)) {
    fields.contextConfig = '다섯 가지 프로젝트 컨텍스트 설정을 확인해 주세요.'
  }

  return Object.keys(fields).length ? { fields } : { value }
}

function validateAiAgentPatch(body) {
  const value = {}
  const fields = {}
  const keys = ['name', 'role', 'description', 'color', 'instructions', 'contextConfig', 'enabled']
  if (!keys.some((key) => hasOwn(body, key))) fields.body = '수정할 AI Agent 정보를 입력해 주세요.'

  if (hasOwn(body, 'name')) {
    value.name = cleanString(body.name)
    if (!value.name || value.name.length > 80) fields.name = 'AI Agent 이름은 1자 이상 80자 이하여야 합니다.'
  }
  if (hasOwn(body, 'role')) {
    value.role = cleanString(body.role)
    if (!value.role || value.role.length > 120) fields.role = '역할은 1자 이상 120자 이하여야 합니다.'
  }
  if (hasOwn(body, 'description')) {
    value.description = cleanString(body.description)
    if (typeof body.description !== 'string' || value.description.length > 500) {
      fields.description = '소개는 500자 이하여야 합니다.'
    }
  }
  if (hasOwn(body, 'color')) {
    value.color = cleanString(body.color)
    if (!/^#[0-9a-f]{6}$/i.test(value.color)) fields.color = '색상 값을 확인해 주세요.'
  }
  if (hasOwn(body, 'instructions')) {
    value.instructions = body.instructions
    if (typeof value.instructions !== 'string' || value.instructions.length > 10_000) {
      fields.instructions = '역할 지시사항은 10,000자 이하여야 합니다.'
    }
  }
  if (hasOwn(body, 'contextConfig')) {
    value.contextConfig = body.contextConfig
    if (!isAiContextConfig(value.contextConfig)) {
      fields.contextConfig = '다섯 가지 프로젝트 컨텍스트 설정을 확인해 주세요.'
    }
  }
  if (hasOwn(body, 'enabled')) {
    value.enabled = body.enabled
    if (typeof value.enabled !== 'boolean') fields.enabled = '활성 상태를 확인해 주세요.'
  }

  return Object.keys(fields).length ? { fields } : { value }
}

function validateAiRun(body) {
  const taskId = cleanString(body?.taskId)
  return UUID_PATTERN.test(taskId)
    ? { value: { taskId } }
    : { fields: { taskId: '할 일 ID를 확인해 주세요.' } }
}

function validateAiCredential(body) {
  const value = {
    apiKey: cleanString(body?.apiKey),
    acknowledgedFreeTierPolicy: body?.acknowledgedFreeTierPolicy,
  }
  const fields = {}
  if (!value.apiKey || value.apiKey.length > 512) {
    fields.apiKey = 'Gemini API 키를 확인해 주세요.'
  }
  if (value.acknowledgedFreeTierPolicy !== true) {
    fields.acknowledgedFreeTierPolicy = '무료 티어 데이터 처리 안내에 동의해 주세요.'
  }
  return Object.keys(fields).length ? { fields } : { value }
}

function validationError(response, fields) {
  response.status(400).json({
    error: { code: 'VALIDATION_ERROR', message: '입력값을 확인해 주세요.', fields },
  })
}

function validId(response, key, value) {
  if (UUID_PATTERN.test(value)) return true
  validationError(response, { [key]: `${key}를 확인해 주세요.` })
  return false
}

function routeError(response, error) {
  if (error instanceof TeamFlowApiError) {
    response.status(error.status).json({
      error: { code: error.code, message: error.message },
      ...(error.aiRun ? { aiRun: error.aiRun } : {}),
      ...(error.task ? { task: error.task } : {}),
    })
    return
  }
  if (error instanceof TeamFlowValidationError) {
    validationError(response, error.fields)
    return
  }
  if (error instanceof TeamFlowNotFoundError) {
    response.status(404).json({
      error: { code: 'NOT_FOUND', message: error.message },
    })
    return
  }
  if (error instanceof TeamFlowConflictError) {
    response.status(409).json({
      error: { code: 'CONFLICT', message: error.message },
    })
    return
  }
  response.status(503).json({
    error: { code: 'TEAMFLOW_STORE_UNAVAILABLE', message: 'TeamFlow 저장소에 연결할 수 없습니다.' },
  })
}

function asyncRoute(handler) {
  return async (request, response) => {
    try {
      await handler(request, response)
    } catch (error) {
      routeError(response, error)
    }
  }
}

export function createTeamFlowRouter({ authVerifier, repositoryFactory, demoRepository }) {
  const router = Router()

  router.get('/demo', asyncRoute(async (_request, response) => {
    response.status(200).json(await demoRepository.loadDemo())
  }))

  router.use(createAuthenticationMiddleware({ authVerifier, repositoryFactory }))

  router.get('/ai-credentials/gemini', asyncRoute(async (request, response) => {
    response.status(200).json({
      credential: await request.teamFlow.repository.getAiCredentialMetadata(),
    })
  }))

  router.put('/ai-credentials/gemini', async (request, response) => {
    const validation = validateAiCredential(request.body)
    if (validation.fields) return validationError(response, validation.fields)
    return asyncRoute(async () => {
      response.status(200).json({
        credential: await request.teamFlow.repository.saveAiCredential(validation.value.apiKey),
      })
    })(request, response)
  })

  router.delete('/ai-credentials/gemini', asyncRoute(async (request, response) => {
    response.status(200).json({
      credential: await request.teamFlow.repository.deleteAiCredential(),
    })
  }))

  router.get('/bootstrap', asyncRoute(async (request, response) => {
    response.status(200).json(await request.teamFlow.repository.load())
  }))

  router.get('/invitations', asyncRoute(async (request, response) => {
    response.status(200).json({ invitations: await request.teamFlow.repository.listInvitations() })
  }))

  router.post('/projects', async (request, response) => {
    const validation = validateProject(request.body)
    if (validation.fields) return validationError(response, validation.fields)
    return asyncRoute(async () => {
      response.status(201).json({ project: await request.teamFlow.repository.createProject(validation.value) })
    })(request, response)
  })

  router.patch('/projects/:projectId', async (request, response) => {
    if (!validId(response, 'projectId', request.params.projectId)) return
    const validation = validateProject(request.body, { partial: true })
    if (validation.fields) return validationError(response, validation.fields)
    return asyncRoute(async () => {
      response.status(200).json({ project: await request.teamFlow.repository.updateProject(request.params.projectId, validation.value) })
    })(request, response)
  })

  router.delete('/projects/:projectId', async (request, response) => {
    if (!validId(response, 'projectId', request.params.projectId)) return
    return asyncRoute(async () => {
      response.status(200).json({ projectId: await request.teamFlow.repository.deleteProject(request.params.projectId) })
    })(request, response)
  })

  router.post('/projects/:projectId/invitations', async (request, response) => {
    if (!validId(response, 'projectId', request.params.projectId)) return
    const validation = validateInvitation(request.body)
    if (validation.fields) return validationError(response, validation.fields)
    return asyncRoute(async () => {
      response.status(201).json({ invitation: await request.teamFlow.repository.createInvitation(request.params.projectId, validation.value) })
    })(request, response)
  })

  for (const [action, method] of [
    ['accept', 'acceptInvitation'],
    ['reject', 'rejectInvitation'],
  ]) {
    router.post(`/invitations/:invitationId/${action}`, async (request, response) => {
      if (!validId(response, 'invitationId', request.params.invitationId)) return
      return asyncRoute(async () => {
        const result = await request.teamFlow.repository[method](request.params.invitationId)
        response.status(200).json(action === 'accept'
          ? { result }
          : { invitationId: result.invitationId ?? request.params.invitationId })
      })(request, response)
    })
  }

  router.delete('/invitations/:invitationId', async (request, response) => {
    if (!validId(response, 'invitationId', request.params.invitationId)) return
    return asyncRoute(async () => {
      const result = await request.teamFlow.repository.cancelInvitation(request.params.invitationId)
      response.status(200).json({ invitationId: result.invitationId ?? request.params.invitationId })
    })(request, response)
  })

  router.patch('/members/:memberId', async (request, response) => {
    if (!validId(response, 'memberId', request.params.memberId)) return
    const validation = validateMemberPatch(request.body)
    if (validation.fields) return validationError(response, validation.fields)
    return asyncRoute(async () => {
      response.status(200).json({ member: await request.teamFlow.repository.updateMember(request.params.memberId, validation.value) })
    })(request, response)
  })

  router.delete('/members/:memberId', async (request, response) => {
    if (!validId(response, 'memberId', request.params.memberId)) return
    return asyncRoute(async () => {
      const result = await request.teamFlow.repository.deleteMember(request.params.memberId)
      response.status(200).json(typeof result === 'string' ? { memberId: result } : result)
    })(request, response)
  })

  router.post('/projects/:projectId/ai-agents', async (request, response) => {
    if (!validId(response, 'projectId', request.params.projectId)) return
    const validation = validateAiAgentCreate(request.body)
    if (validation.fields) return validationError(response, validation.fields)
    return asyncRoute(async () => {
      response.status(201).json(await request.teamFlow.repository.createAiAgent(
        request.params.projectId,
        validation.value,
      ))
    })(request, response)
  })

  router.patch('/ai-agents/:memberId', async (request, response) => {
    if (!validId(response, 'memberId', request.params.memberId)) return
    const validation = validateAiAgentPatch(request.body)
    if (validation.fields) return validationError(response, validation.fields)
    return asyncRoute(async () => {
      response.status(200).json(await request.teamFlow.repository.updateAiAgent(
        request.params.memberId,
        validation.value,
      ))
    })(request, response)
  })

  router.post('/ai-agents/:memberId/runs', async (request, response) => {
    if (!validId(response, 'memberId', request.params.memberId)) return
    const validation = validateAiRun(request.body)
    if (validation.fields) return validationError(response, validation.fields)
    return asyncRoute(async () => {
      response.status(201).json(await request.teamFlow.repository.createAiRun(
        request.params.memberId,
        validation.value.taskId,
      ))
    })(request, response)
  })

  router.post('/ai-runs/:runId/apply', async (request, response) => {
    if (!validId(response, 'runId', request.params.runId)) return
    return asyncRoute(async () => {
      response.status(200).json(await request.teamFlow.repository.applyAiRun(request.params.runId))
    })(request, response)
  })

  router.post('/ai-runs/:runId/reject', async (request, response) => {
    if (!validId(response, 'runId', request.params.runId)) return
    return asyncRoute(async () => {
      response.status(200).json(await request.teamFlow.repository.rejectAiRun(request.params.runId))
    })(request, response)
  })

  router.post('/tasks', async (request, response) => {
    const validation = validateTaskCreateInput(request.body)
    if (validation.fields) return validationError(response, validation.fields)
    return asyncRoute(async () => {
      response.status(201).json({ task: await request.teamFlow.repository.createTask(validation.value) })
    })(request, response)
  })

  router.patch('/tasks/:taskId', async (request, response) => {
    if (!validId(response, 'taskId', request.params.taskId)) return
    const validation = validateTaskPatch(request.body)
    if (validation.fields) return validationError(response, validation.fields)
    return asyncRoute(async () => {
      response.status(200).json({ task: await request.teamFlow.repository.updateTask(request.params.taskId, validation.value) })
    })(request, response)
  })

  router.delete('/tasks/:taskId', async (request, response) => {
    if (!validId(response, 'taskId', request.params.taskId)) return
    return asyncRoute(async () => {
      response.status(200).json({ taskId: await request.teamFlow.repository.deleteTask(request.params.taskId) })
    })(request, response)
  })

  router.post('/projects/:projectId/notes', async (request, response) => {
    if (!validId(response, 'projectId', request.params.projectId)) return
    const validation = validateNote(request.body)
    if (validation.fields) return validationError(response, validation.fields)
    return asyncRoute(async () => {
      response.status(201).json({ note: await request.teamFlow.repository.createNote(request.params.projectId, validation.value) })
    })(request, response)
  })

  router.patch('/notes/:noteId', async (request, response) => {
    if (!validId(response, 'noteId', request.params.noteId)) return
    const validation = validateNote(request.body, { partial: true })
    if (validation.fields) return validationError(response, validation.fields)
    return asyncRoute(async () => {
      response.status(200).json({ note: await request.teamFlow.repository.updateNote(request.params.noteId, validation.value) })
    })(request, response)
  })

  router.delete('/notes/:noteId', async (request, response) => {
    if (!validId(response, 'noteId', request.params.noteId)) return
    return asyncRoute(async () => {
      response.status(200).json({ noteId: await request.teamFlow.repository.deleteNote(request.params.noteId) })
    })(request, response)
  })

  router.post('/projects/:projectId/resource-uploads', async (request, response) => {
    if (!validId(response, 'projectId', request.params.projectId)) return
    const validation = validateResourceUpload(request.body)
    if (validation.fields) return validationError(response, validation.fields)
    return asyncRoute(async () => {
      response.status(201).json(await request.teamFlow.repository.createResourceUpload(request.params.projectId, validation.value))
    })(request, response)
  })

  router.post('/resources/:resourceId/complete-upload', async (request, response) => {
    if (!validId(response, 'resourceId', request.params.resourceId)) return
    return asyncRoute(async () => {
      response.status(200).json({ resource: await request.teamFlow.repository.completeResourceUpload(request.params.resourceId) })
    })(request, response)
  })

  router.post('/resources/:resourceId/download-url', async (request, response) => {
    if (!validId(response, 'resourceId', request.params.resourceId)) return
    return asyncRoute(async () => {
      response.status(200).json(await request.teamFlow.repository.createResourceDownloadUrl(request.params.resourceId))
    })(request, response)
  })

  router.post('/projects/:projectId/resources', async (request, response) => {
    if (!validId(response, 'projectId', request.params.projectId)) return
    const validation = validateResource(request.body)
    if (validation.fields) return validationError(response, validation.fields)
    return asyncRoute(async () => {
      response.status(201).json({ resource: await request.teamFlow.repository.createResource(request.params.projectId, validation.value) })
    })(request, response)
  })

  router.patch('/resources/:resourceId', async (request, response) => {
    if (!validId(response, 'resourceId', request.params.resourceId)) return
    const validation = validateResource(request.body, { partial: true })
    if (validation.fields) return validationError(response, validation.fields)
    return asyncRoute(async () => {
      response.status(200).json({ resource: await request.teamFlow.repository.updateResource(request.params.resourceId, validation.value) })
    })(request, response)
  })

  router.delete('/resources/:resourceId', async (request, response) => {
    if (!validId(response, 'resourceId', request.params.resourceId)) return
    return asyncRoute(async () => {
      response.status(200).json({ resourceId: await request.teamFlow.repository.deleteResource(request.params.resourceId) })
    })(request, response)
  })

  return router
}
