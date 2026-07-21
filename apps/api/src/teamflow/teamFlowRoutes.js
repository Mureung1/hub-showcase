import { Router } from 'express'

import { isProjectStatus, isTaskStatus } from '@teamflow/shared'

import { createAuthenticationMiddleware } from '../lib/auth.js'
import { TeamFlowNotFoundError } from './teamFlowRepository.js'

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function calendarDate(value, optional = false) {
  if (optional && (value === '' || value == null)) return true
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value
}

function cleanString(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function validateProject(body) {
  const value = {
    name: cleanString(body?.name),
    description: cleanString(body?.description),
    status: body?.status,
    startDate: body?.startDate ?? '',
    endDate: body?.endDate ?? '',
  }
  const fields = {}
  if (!value.name || value.name.length > 120) fields.name = '프로젝트 이름은 1자 이상 120자 이하여야 합니다.'
  if (value.description.length > 500) fields.description = '설명은 500자 이하여야 합니다.'
  if (!isProjectStatus(value.status)) fields.status = '프로젝트 상태를 확인해 주세요.'
  if (!calendarDate(value.startDate, true)) fields.startDate = '시작일을 확인해 주세요.'
  if (!calendarDate(value.endDate, true)) fields.endDate = '종료일을 확인해 주세요.'
  if (value.startDate && value.endDate && value.endDate < value.startDate) fields.endDate = '종료일은 시작일보다 빠를 수 없습니다.'
  return Object.keys(fields).length ? { fields } : { value }
}

function validateProjectPeriod(body) {
  const value = { startDate: body?.startDate ?? '', endDate: body?.endDate ?? '' }
  const fields = {}
  if (!calendarDate(value.startDate)) fields.startDate = '시작일을 확인해 주세요.'
  if (!calendarDate(value.endDate)) fields.endDate = '종료일을 확인해 주세요.'
  if (!fields.startDate && !fields.endDate && value.endDate < value.startDate) fields.endDate = '종료일은 시작일보다 빠를 수 없습니다.'
  return Object.keys(fields).length ? { fields } : { value }
}

function validateMember(body) {
  const value = {
    name: cleanString(body?.name),
    initial: cleanString(body?.initial),
    role: cleanString(body?.role),
    description: cleanString(body?.description),
    color: cleanString(body?.color) || '#3a6898',
  }
  const fields = {}
  if (!value.name || value.name.length > 80) fields.name = '이름은 1자 이상 80자 이하여야 합니다.'
  if (!value.initial || Array.from(value.initial).length > 4) fields.initial = '이니셜을 확인해 주세요.'
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

function validationError(response, fields) {
  response.status(400).json({
    error: { code: 'VALIDATION_ERROR', message: '입력값을 확인해 주세요.', fields },
  })
}

function routeError(response, error) {
  if (error instanceof TeamFlowNotFoundError) {
    response.status(404).json({
      error: { code: 'NOT_FOUND', message: '요청한 데이터를 찾을 수 없습니다.' },
    })
    return
  }
  response.status(503).json({
    error: { code: 'TEAMFLOW_STORE_UNAVAILABLE', message: 'TeamFlow 저장소에 연결할 수 없습니다.' },
  })
}

export function createTeamFlowRouter({ authVerifier, repositoryFactory, demoRepository }) {
  const router = Router()

  router.get('/demo', async (_request, response) => {
    try {
      response.status(200).json(await demoRepository.loadDemo())
    } catch (error) {
      routeError(response, error)
    }
  })

  router.use(createAuthenticationMiddleware({ authVerifier, repositoryFactory }))

  router.get('/bootstrap', async (request, response) => {
    try {
      response.status(200).json(await request.teamFlow.repository.load())
    } catch (error) {
      routeError(response, error)
    }
  })

  router.post('/projects', async (request, response) => {
    const validation = validateProject(request.body)
    if (validation.fields) return validationError(response, validation.fields)
    try {
      response.status(201).json({ project: await request.teamFlow.repository.createProject(validation.value) })
    } catch (error) {
      routeError(response, error)
    }
  })

  router.patch('/projects/:projectId', async (request, response) => {
    if (!UUID_PATTERN.test(request.params.projectId)) return validationError(response, { projectId: '프로젝트 ID를 확인해 주세요.' })
    const validation = validateProjectPeriod(request.body)
    if (validation.fields) return validationError(response, validation.fields)
    try {
      response.status(200).json({ project: await request.teamFlow.repository.updateProject(request.params.projectId, validation.value) })
    } catch (error) {
      routeError(response, error)
    }
  })

  router.post('/projects/:projectId/members', async (request, response) => {
    if (!UUID_PATTERN.test(request.params.projectId)) return validationError(response, { projectId: '프로젝트 ID를 확인해 주세요.' })
    const validation = validateMember(request.body)
    if (validation.fields) return validationError(response, validation.fields)
    try {
      response.status(201).json({ member: await request.teamFlow.repository.createMember(request.params.projectId, validation.value) })
    } catch (error) {
      routeError(response, error)
    }
  })

  router.post('/tasks', async (request, response) => {
    const validation = validateTaskCreateInput(request.body)
    if (validation.fields) return validationError(response, validation.fields)
    try {
      response.status(201).json({ task: await request.teamFlow.repository.createTask(validation.value) })
    } catch (error) {
      routeError(response, error)
    }
  })

  router.patch('/tasks/:taskId', async (request, response) => {
    if (!UUID_PATTERN.test(request.params.taskId)) return validationError(response, { taskId: '할 일 ID를 확인해 주세요.' })
    if (!isTaskStatus(request.body?.status)) return validationError(response, { status: '진행 상태를 확인해 주세요.' })
    try {
      response.status(200).json({ task: await request.teamFlow.repository.updateTask(request.params.taskId, { status: request.body.status }) })
    } catch (error) {
      routeError(response, error)
    }
  })

  router.delete('/tasks/:taskId', async (request, response) => {
    if (!UUID_PATTERN.test(request.params.taskId)) return validationError(response, { taskId: '할 일 ID를 확인해 주세요.' })
    try {
      response.status(200).json({ taskId: await request.teamFlow.repository.deleteTask(request.params.taskId) })
    } catch (error) {
      routeError(response, error)
    }
  })

  return router
}
