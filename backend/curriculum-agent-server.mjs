import { Buffer } from 'node:buffer'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import process from 'node:process'
import { URL, fileURLToPath } from 'node:url'
import {
  createAgentConfig,
  createGeneratedCurriculumPlan,
  loadCurriculumTracks,
  loadEnvFiles,
  runCurriculumPlannerAgent,
} from './agents/curriculum-planner-agent-core.mjs'

export const defaultCurriculumAgentHost = '127.0.0.1'
export const defaultCurriculumAgentPort = 8787
export const curriculumRecommendationPath = '/api/curriculum/recommend'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

export function createCurriculumAgentServer({ tracks, config, runAgent = runCurriculumPlannerAgent, logger = console }) {
  return http.createServer(async (request, response) => {
    try {
      const bodyText = await readRequestBody(request)
      const result = await handleCurriculumApiRequest({
        method: request.method,
        url: request.url,
        bodyText,
        tracks,
        config,
        runAgent,
        logger,
      })

      writeJson(response, result.status, result.body, result.headers)
    } catch (error) {
      logger.error(error instanceof Error ? error.message : error)
      writeJson(response, 413, { error: 'request_too_large', message: '요청 본문이 너무 큽니다.' })
    }
  })
}

export async function handleCurriculumApiRequest({
  method,
  url,
  bodyText,
  tracks,
  config,
  runAgent = runCurriculumPlannerAgent,
  logger = console,
}) {
  const pathname = new URL(url ?? '/', 'http://localhost').pathname

  if (method === 'OPTIONS') {
    return { status: 204, body: null, headers: createCorsHeaders() }
  }

  if (pathname !== curriculumRecommendationPath) {
    return {
      status: 404,
      body: { error: 'not_found', message: '지원하지 않는 API 경로입니다.' },
      headers: createCorsHeaders(),
    }
  }

  if (method !== 'POST') {
    return {
      status: 405,
      body: { error: 'method_not_allowed', message: 'POST 요청만 지원합니다.' },
      headers: { ...createCorsHeaders(), Allow: 'POST, OPTIONS' },
    }
  }

  const parsedBody = parseJsonBody(bodyText)
  if (!parsedBody.ok) {
    return {
      status: 400,
      body: { error: 'invalid_json', message: '요청 JSON을 확인해주세요.' },
      headers: createCorsHeaders(),
    }
  }

  const goal = typeof parsedBody.value.goal === 'string' ? parsedBody.value.goal.trim() : ''
  if (!goal) {
    return {
      status: 400,
      body: { error: 'invalid_goal', message: '학습 목표를 입력해주세요.' },
      headers: createCorsHeaders(),
    }
  }

  try {
    const recommendation = await runAgent({ goal, tracks, config })
    const plan = createGeneratedCurriculumPlan({ goal, recommendation, tracks })

    return { status: 200, body: { plan }, headers: createCorsHeaders() }
  } catch (error) {
    logger.error(error instanceof Error ? error.message : error)
    const message = error instanceof Error ? error.message : ''
    const status = message.includes('GEMINI_API_KEY') ? 500 : 502

    return {
      status,
      body: {
        error: status === 500 ? 'agent_configuration_error' : 'curriculum_agent_failed',
        message: '커리큘럼 생성에 실패했습니다. 서버 설정과 모델 응답을 확인해주세요.',
      },
      headers: createCorsHeaders(),
    }
  }
}

export function createRuntimeContext() {
  loadEnvFiles({ fs, path, repoRoot })

  return {
    tracks: loadCurriculumTracks({ fs, path, repoRoot }),
    config: createAgentConfig(),
  }
}

export function startCurriculumAgentServer({
  host = process.env.CURRICULUM_AGENT_HOST || defaultCurriculumAgentHost,
  port = Number(process.env.CURRICULUM_AGENT_PORT || defaultCurriculumAgentPort),
  tracks,
  config,
  runAgent,
  logger = console,
} = {}) {
  const runtimeContext = tracks && config ? { tracks, config } : createRuntimeContext()
  const server = createCurriculumAgentServer({ ...runtimeContext, runAgent, logger })

  server.listen(port, host, () => {
    logger.log(`Curriculum Agent API listening on http://${host}:${port}`)
  })

  return server
}

async function readRequestBody(request, maxBytes = 1_000_000) {
  const chunks = []
  let totalBytes = 0

  for await (const chunk of request) {
    totalBytes += chunk.length
    if (totalBytes > maxBytes) {
      throw new Error('Request body exceeded the size limit')
    }

    chunks.push(chunk)
  }

  return Buffer.concat(chunks).toString('utf8')
}

function parseJsonBody(bodyText) {
  try {
    return { ok: true, value: JSON.parse(bodyText || '{}') }
  } catch {
    return { ok: false, value: null }
  }
}

function writeJson(response, status, body, headers = createCorsHeaders()) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...headers })
  response.end(body === null ? '' : JSON.stringify(body))
}

function createCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  startCurriculumAgentServer()
}

