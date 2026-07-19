import { URL } from 'node:url'
import {
  addMistakeNote,
  changeMistakeNoteStatus,
  listMistakeNotes,
  removeMistakeNote,
  resetMistakeNotes,
} from '../modules/mistake-notes/application/mistakeNoteService.mjs'
import { createCorsHeaders, parseJsonBody } from '../shared/http.mjs'

export async function handleMistakeNoteApiRequest({ method, url, bodyText, mistakeNoteRepository }) {
  const pathname = new URL(url ?? '/', 'http://localhost').pathname

  if (method === 'OPTIONS' && pathname.startsWith('/api/mistake-notes')) {
    return { status: 204, body: null, headers: createCorsHeaders() }
  }

  if (pathname === '/api/mistake-notes') {
    if (method === 'GET') {
      return { status: 200, body: listMistakeNotes({ repository: mistakeNoteRepository }), headers: createCorsHeaders() }
    }

    if (method === 'POST') {
      const parsedBody = parseJsonBody(bodyText)
      if (!parsedBody.ok) return invalidJson()

      try {
        const note = addMistakeNote({ input: parsedBody.value, repository: mistakeNoteRepository })

        return { status: 201, body: { note }, headers: createCorsHeaders() }
      } catch {
        return invalidMistakeNote()
      }
    }

    if (method === 'DELETE') {
      resetMistakeNotes({ repository: mistakeNoteRepository })

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
      const note = changeMistakeNoteStatus({ id, status: parsedBody.value.status, repository: mistakeNoteRepository })

      return { status: 200, body: { note }, headers: createCorsHeaders() }
    } catch {
      return invalidMistakeNote()
    }
  }

  if (method === 'DELETE') {
    try {
      removeMistakeNote({ id, repository: mistakeNoteRepository })

      return { status: 200, body: { id }, headers: createCorsHeaders() }
    } catch {
      return { status: 404, body: { error: 'mistake_note_not_found', message: '오답 기록을 찾지 못했습니다.' }, headers: createCorsHeaders() }
    }
  }

  return methodNotAllowed('PATCH, DELETE, OPTIONS')
}

function invalidJson() {
  return { status: 400, body: { error: 'invalid_json', message: '요청 JSON을 확인해주세요.' }, headers: createCorsHeaders() }
}

function invalidMistakeNote() {
  return { status: 400, body: { error: 'invalid_mistake_note', message: '오답 기록 정보를 확인해주세요.' }, headers: createCorsHeaders() }
}

function methodNotAllowed(allow) {
  return {
    status: 405,
    body: { error: 'method_not_allowed', message: '지원하지 않는 요청 방식입니다.' },
    headers: { ...createCorsHeaders(), Allow: allow },
  }
}