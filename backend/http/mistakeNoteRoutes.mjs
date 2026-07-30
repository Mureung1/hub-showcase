import { URL } from 'node:url'
import {
  addMistakeNote,
  changeMistakeNoteStatus,
  listMistakeNotes,
  MistakeNoteNotFoundError,
  removeMistakeNote,
  resetMistakeNotes,
  updateMistakeNote,
} from '../modules/mistake-notes/application/mistakeNoteService.mjs'
import { createCorsHeaders, parseJsonBody } from '../shared/http.mjs'
import { isRepositoryUnavailableError } from '../shared/repositoryError.mjs'

export async function handleMistakeNoteApiRequest({
  method,
  url,
  bodyText,
  mistakeNoteRepository,
}) {
  const pathname = new URL(url ?? '/', 'http://localhost').pathname

  if (method === 'OPTIONS' && pathname.startsWith('/api/mistake-notes')) {
    return { status: 204, body: null, headers: createCorsHeaders() }
  }

  if (pathname === '/api/mistake-notes') {
    if (method === 'GET') {
      return {
        status: 200,
        body: await listMistakeNotes({ repository: mistakeNoteRepository }),
        headers: createCorsHeaders(),
      }
    }

    if (method === 'POST') {
      const parsedBody = parseJsonBody(bodyText)
      if (!parsedBody.ok) return invalidJson()

      try {
        const note = await addMistakeNote({
          input: parsedBody.value,
          repository: mistakeNoteRepository,
        })

        return { status: 201, body: { note }, headers: createCorsHeaders() }
      } catch (error) {
        if (isRepositoryUnavailableError(error)) throw error

        return invalidMistakeNote()
      }
    }

    if (method === 'DELETE') {
      await resetMistakeNotes({ repository: mistakeNoteRepository })

      return { status: 200, body: { notes: [] }, headers: createCorsHeaders() }
    }

    return methodNotAllowed('GET, POST, DELETE, OPTIONS')
  }

  const noteMatch = /^\/api\/mistake-notes\/([^/]+)$/.exec(pathname)
  if (!noteMatch) return null

  const id = decodeURIComponent(noteMatch[1])

  if (method === 'PATCH') {
    const parsedBody = parseJsonBody(bodyText)
    if (!parsedBody.ok) return invalidJson()

    try {
      if (isMixedPatch(parsedBody.value)) return invalidMistakeNote()

      const note = isStatusPatch(parsedBody.value)
        ? await changeMistakeNoteStatus({
            id,
            status: parsedBody.value.status,
            repository: mistakeNoteRepository,
          })
        : await updateMistakeNote({
            id,
            input: parsedBody.value,
            repository: mistakeNoteRepository,
          })

      return { status: 200, body: { note }, headers: createCorsHeaders() }
    } catch (error) {
      if (isRepositoryUnavailableError(error)) throw error
      if (error instanceof MistakeNoteNotFoundError) return mistakeNoteNotFound()

      return invalidMistakeNote()
    }
  }

  if (method === 'DELETE') {
    try {
      await removeMistakeNote({ id, repository: mistakeNoteRepository })

      return { status: 200, body: { id }, headers: createCorsHeaders() }
    } catch (error) {
      if (isRepositoryUnavailableError(error)) throw error

      return mistakeNoteNotFound()
    }
  }

  return methodNotAllowed('PATCH, DELETE, OPTIONS')
}

function invalidJson() {
  return {
    status: 400,
    body: { error: 'invalid_json', message: '요청 JSON을 확인해주세요.' },
    headers: createCorsHeaders(),
  }
}

function invalidMistakeNote() {
  return {
    status: 400,
    body: { error: 'invalid_mistake_note', message: '오답 기록 정보를 확인해주세요.' },
    headers: createCorsHeaders(),
  }
}

function mistakeNoteNotFound() {
  return {
    status: 404,
    body: { error: 'mistake_note_not_found', message: '오답 기록을 찾지 못했습니다.' },
    headers: createCorsHeaders(),
  }
}

function isStatusPatch(value) {
  return isObject(value) && Object.keys(value).length === 1 && 'status' in value
}

function isMixedPatch(value) {
  return isObject(value) && 'status' in value && Object.keys(value).length !== 1
}

function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function methodNotAllowed(allow) {
  return {
    status: 405,
    body: { error: 'method_not_allowed', message: '지원하지 않는 요청 방식입니다.' },
    headers: { ...createCorsHeaders(), Allow: allow },
  }
}
