import { Router } from 'express'

import { isTaskStatus } from '@teamflow/shared'

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function isValidCalendarDate(value) {
  if (!DATE_PATTERN.test(value)) {
    return false
  }

  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value
}

export function validateTaskCreateInput(body) {
  const fields = {}
  const projectId = typeof body?.projectId === 'string' ? body.projectId.trim() : ''
  const title = typeof body?.title === 'string' ? body.title.trim() : ''
  const assigneeId = typeof body?.assigneeId === 'string' ? body.assigneeId.trim() : ''
  const dueDate = typeof body?.dueDate === 'string' ? body.dueDate : ''
  const status = body?.status
  const description = body?.description === undefined ? '' : body.description

  if (!projectId || projectId.length > 100) {
    fields.projectId = '프로젝트 ID를 확인해주세요.'
  }

  if (!title || title.length > 200) {
    fields.title = '제목은 1자 이상 200자 이하여야 합니다.'
  }

  if (!assigneeId || assigneeId.length > 100) {
    fields.assigneeId = '담당자 ID를 확인해주세요.'
  }

  if (!isValidCalendarDate(dueDate)) {
    fields.dueDate = '마감일은 YYYY-MM-DD 형식의 실제 날짜여야 합니다.'
  }

  if (!isTaskStatus(status)) {
    fields.status = '진행 상태를 확인해주세요.'
  }

  if (typeof description !== 'string' || description.length > 2000) {
    fields.description = '설명은 2000자 이하여야 합니다.'
  }

  if (Object.keys(fields).length > 0) {
    return { fields }
  }

  return {
    value: {
      projectId,
      title,
      assigneeId,
      dueDate,
      status,
      description,
    },
  }
}

function unavailableResponse(response) {
  return response.status(503).json({
    error: {
      code: 'TASK_STORE_UNAVAILABLE',
      message: '할 일 저장소에 연결할 수 없습니다.',
    },
  })
}

export function createTaskRouter({ taskRepository }) {
  const router = Router()

  router.get('/', async (_request, response) => {
    try {
      const tasks = await taskRepository.listTasks()
      response.status(200).json({ tasks })
    } catch {
      unavailableResponse(response)
    }
  })

  router.post('/', async (request, response) => {
    const validation = validateTaskCreateInput(request.body)

    if (validation.fields) {
      response.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: '입력값을 확인해주세요.',
          fields: validation.fields,
        },
      })
      return
    }

    try {
      const task = await taskRepository.createTask(validation.value)
      response.status(201).json({ task })
    } catch {
      unavailableResponse(response)
    }
  })

  return router
}
