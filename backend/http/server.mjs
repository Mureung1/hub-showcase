import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import express from 'express'
import { handleCurriculumApiRequest } from './curriculumRoutes.mjs'
import { handleGitLabAttemptApiRequest } from './gitLabAttemptRoutes.mjs'
import { handleLearningProgressApiRequest } from './learningProgressRoutes.mjs'
import { handleMistakeNoteApiRequest } from './mistakeNoteRoutes.mjs'
import { loadCurriculumTracks } from '../modules/curriculum/adapters/jsonCurriculumCatalogRepository.mjs'
import { createInMemoryGitLabAttemptRepository } from '../modules/git-lab/adapters/inMemoryGitLabAttemptRepository.mjs'
import { createInMemoryLearningProgressRepository } from '../modules/learning-progress/adapters/inMemoryLearningProgressRepository.mjs'
import { createInMemoryMistakeNoteRepository } from '../modules/mistake-notes/adapters/inMemoryMistakeNoteRepository.mjs'
import { loadKnowledgeChunks } from '../modules/knowledge/adapters/jsonlKnowledgeRepository.mjs'
import { createAgentConfig, loadEnvFiles } from '../shared/env.mjs'
import { createCorsHeaders, createRouteNotFoundResponse } from '../shared/http.mjs'

export const defaultCurriculumAgentHost = '127.0.0.1'
export const defaultCurriculumAgentPort = 8787

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')

export function createCurriculumAgentServer(options = {}) {
  return http.createServer(createCurriculumAgentApp(options))
}

export function createCurriculumAgentApp({
  tracks,
  config,
  recommendationProvider,
  progressRepository = createInMemoryLearningProgressRepository(),
  mistakeNoteRepository = createInMemoryMistakeNoteRepository(),
  gitLabAttemptRepository = createInMemoryGitLabAttemptRepository(),
  knowledgeChunks = [],
  logger = console,
} = {}) {
  const app = express()

  app.use((request, response, next) => {
    response.set(createCorsHeaders())
    next()
  })

  app.use(express.text({ type: '*/*', limit: '1mb' }))

  app.use(async (request, response, next) => {
    try {
      const bodyText = typeof request.body === 'string' ? request.body : ''
      const routeContext = {
        method: request.method,
        url: request.originalUrl,
        bodyText,
        tracks,
        config,
        recommendationProvider,
        progressRepository,
        mistakeNoteRepository,
        gitLabAttemptRepository,
        knowledgeChunks,
        logger,
      }
      const result =
        (await handleCurriculumApiRequest(routeContext)) ??
        (await handleLearningProgressApiRequest(routeContext)) ??
        (await handleMistakeNoteApiRequest(routeContext)) ??
        (await handleGitLabAttemptApiRequest(routeContext)) ??
        createRouteNotFoundResponse()

      sendJson(response, result)
    } catch (error) {
      next(error)
    }
  })

  app.use((error, request, response, next) => {
    if (response.headersSent) {
      next(error)
      return
    }

    logger.error(error instanceof Error ? error.message : error)
    sendJson(response, {
      status: 413,
      body: { error: 'request_too_large', message: '요청 본문이 너무 큽니다.' },
      headers: createCorsHeaders(),
    })
  })

  return app
}

export function createRuntimeContext() {
  loadEnvFiles({ fs, path, repoRoot })

  return {
    tracks: loadCurriculumTracks({ fs, path, repoRoot }),
    config: createAgentConfig(),
    progressRepository: createInMemoryLearningProgressRepository(),
    mistakeNoteRepository: createInMemoryMistakeNoteRepository(),
    gitLabAttemptRepository: createInMemoryGitLabAttemptRepository(),
    knowledgeChunks: loadKnowledgeChunks({ fs, path, repoRoot }),
  }
}

export function startCurriculumAgentServer({
  host = process.env.CURRICULUM_AGENT_HOST || defaultCurriculumAgentHost,
  port = Number(process.env.CURRICULUM_AGENT_PORT || defaultCurriculumAgentPort),
  tracks,
  config,
  recommendationProvider,
  progressRepository,
  mistakeNoteRepository,
  gitLabAttemptRepository,
  knowledgeChunks,
  logger = console,
} = {}) {
  const runtimeContext = tracks && config ? {
    tracks,
    config,
    progressRepository,
    mistakeNoteRepository,
    gitLabAttemptRepository,
    knowledgeChunks,
  } : createRuntimeContext()
  const server = createCurriculumAgentServer({ ...runtimeContext, recommendationProvider, logger })

  server.listen(port, host, () => {
    logger.log(`Curriculum Agent API listening on http://${host}:${port}`)
  })

  return server
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  startCurriculumAgentServer()
}

function sendJson(response, { status, body, headers = createCorsHeaders() }) {
  response.set(headers)
  response.status(status)

  if (body === null) {
    response.end()
    return
  }

  response.json(body)
}
