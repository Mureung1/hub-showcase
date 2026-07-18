import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { handleCurriculumApiRequest } from './curriculumRoutes.mjs'
import { loadCurriculumTracks } from '../modules/curriculum/adapters/jsonCurriculumCatalogRepository.mjs'
import { createAgentConfig, loadEnvFiles } from '../shared/env.mjs'
import { readRequestBody, writeJson } from '../shared/http.mjs'

export const defaultCurriculumAgentHost = '127.0.0.1'
export const defaultCurriculumAgentPort = 8787

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')

export function createCurriculumAgentServer({ tracks, config, recommendationProvider, logger = console }) {
  return http.createServer(async (request, response) => {
    try {
      const bodyText = await readRequestBody(request)
      const result = await handleCurriculumApiRequest({
        method: request.method,
        url: request.url,
        bodyText,
        tracks,
        config,
        recommendationProvider,
        logger,
      })

      writeJson(response, result.status, result.body, result.headers)
    } catch (error) {
      logger.error(error instanceof Error ? error.message : error)
      writeJson(response, 413, { error: 'request_too_large', message: '요청 본문이 너무 큽니다.' })
    }
  })
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
  recommendationProvider,
  logger = console,
} = {}) {
  const runtimeContext = tracks && config ? { tracks, config } : createRuntimeContext()
  const server = createCurriculumAgentServer({ ...runtimeContext, recommendationProvider, logger })

  server.listen(port, host, () => {
    logger.log(`Curriculum Agent API listening on http://${host}:${port}`)
  })

  return server
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  startCurriculumAgentServer()
}