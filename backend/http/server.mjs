import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import express from 'express'
import { handleCurriculumApiRequest } from './curriculumRoutes.mjs'
import { handleGitLabAttemptApiRequest } from './gitLabAttemptRoutes.mjs'
import { handleHealthApiRequest } from './healthRoutes.mjs'
import { handleLearningProgressApiRequest } from './learningProgressRoutes.mjs'
import { handleMistakeNoteApiRequest } from './mistakeNoteRoutes.mjs'
import { handleCodeRunApiRequest } from './codeRunRoutes.mjs'
import { handleTutorApiRequest } from './tutorRoutes.mjs'
import { loadCurriculumTracks } from '../modules/curriculum/adapters/jsonCurriculumCatalogRepository.mjs'
import { createInMemoryGeneratedCurriculumRepository } from '../modules/curriculum/adapters/inMemoryGeneratedCurriculumRepository.mjs'
import { createSqliteGeneratedCurriculumRepository } from '../modules/curriculum/adapters/sqliteGeneratedCurriculumRepository.mjs'
import { createSupabaseGeneratedCurriculumRepository } from '../modules/curriculum/adapters/supabaseGeneratedCurriculumRepository.mjs'
import { createInMemoryGitLabAttemptRepository } from '../modules/git-lab/adapters/inMemoryGitLabAttemptRepository.mjs'
import { createInMemoryGitLabAttemptRecorder } from '../modules/git-lab/adapters/inMemoryGitLabAttemptRecorder.mjs'
import { createSqliteGitLabAttemptRepository } from '../modules/git-lab/adapters/sqliteGitLabAttemptRepository.mjs'
import { createSqliteGitLabAttemptRecorder } from '../modules/git-lab/adapters/sqliteGitLabAttemptRecorder.mjs'
import { createSupabaseGitLabAttemptRepository } from '../modules/git-lab/adapters/supabaseGitLabAttemptRepository.mjs'
import { createSupabaseGitLabAttemptRecorder } from '../modules/git-lab/adapters/supabaseGitLabAttemptRecorder.mjs'
import { createInMemoryLearningProgressRepository } from '../modules/learning-progress/adapters/inMemoryLearningProgressRepository.mjs'
import { createSqliteLearningProgressRepository } from '../modules/learning-progress/adapters/sqliteLearningProgressRepository.mjs'
import { createSupabaseLearningProgressRepository } from '../modules/learning-progress/adapters/supabaseLearningProgressRepository.mjs'
import { createInMemoryMistakeNoteRepository } from '../modules/mistake-notes/adapters/inMemoryMistakeNoteRepository.mjs'
import { createSqliteMistakeNoteRepository } from '../modules/mistake-notes/adapters/sqliteMistakeNoteRepository.mjs'
import { createSupabaseMistakeNoteRepository } from '../modules/mistake-notes/adapters/supabaseMistakeNoteRepository.mjs'
import { loadKnowledgeChunks } from '../modules/knowledge/adapters/jsonlKnowledgeRepository.mjs'
import { createAgentConfig, loadEnvFiles } from '../shared/env.mjs'
import { createCorsHeaders, createRouteNotFoundResponse } from '../shared/http.mjs'
import { isRepositoryUnavailableError } from '../shared/repositoryError.mjs'
import { createSqliteDatabase } from '../shared/sqliteDatabase.mjs'
import { createSupabaseServerClient } from '../shared/supabaseClient.mjs'

export const defaultCurriculumAgentHost = '127.0.0.1'
export const defaultCurriculumAgentPort = 8787

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const defaultStaticRoots = [path.join(repoRoot, 'dist'), path.join(repoRoot, 'dist-preview')]

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
  gitLabAttemptRecorder,
  generatedCurriculumRepository = createInMemoryGeneratedCurriculumRepository(),
  knowledgeChunks = [],
  staticRoots = defaultStaticRoots,
  repositoryMode = 'in-memory',
  logger = console,
} = {}) {
  const app = express()

  app.set('trust proxy', true)

  app.use((request, response, next) => {
    response.set(createCorsHeaders())
    next()
  })

  app.use(express.text({ type: '*/*', limit: '1mb' }))

  app.use(async (request, response, next) => {
    if (!request.path.startsWith('/api')) {
      next()
      return
    }

    try {
      const bodyText = typeof request.body === 'string' ? request.body : ''
      const routeContext = {
        method: request.method,
        url: request.originalUrl,
        bodyText,
        ip: request.ip,
        tracks,
        config,
        recommendationProvider,
        progressRepository,
        mistakeNoteRepository,
        gitLabAttemptRepository,
        gitLabAttemptRecorder,
        generatedCurriculumRepository,
        knowledgeChunks,
        repositoryMode,
        logger,
      }
      const result =
        (await handleHealthApiRequest(routeContext)) ??
        (await handleCurriculumApiRequest(routeContext)) ??
        (await handleLearningProgressApiRequest(routeContext)) ??
        (await handleMistakeNoteApiRequest(routeContext)) ??
        (await handleGitLabAttemptApiRequest(routeContext)) ??
        (await handleCodeRunApiRequest(routeContext)) ??
        (await handleTutorApiRequest(routeContext)) ??
        createRouteNotFoundResponse()

      sendJson(response, result)
    } catch (error) {
      next(error)
    }
  })

  const existingStaticRoots = staticRoots.filter((staticRoot) => fs.existsSync(staticRoot))
  for (const staticRoot of existingStaticRoots) {
    app.use(express.static(staticRoot))
  }

  app.use((request, response, next) => {
    if (!['GET', 'HEAD'].includes(request.method) || existingStaticRoots.length === 0) {
      next()
      return
    }

    const indexPath = path.join(existingStaticRoots[0], 'index.html')
    if (!fs.existsSync(indexPath)) {
      next()
      return
    }

    response.sendFile(indexPath)
  })
  app.use((error, request, response, next) => {
    if (response.headersSent) {
      next(error)
      return
    }

    if (isRepositoryUnavailableError(error)) {
      logger.error({
        code: error.code,
        resource: error.resource,
        operation: error.operation,
        repositoryCode: error.repositoryCode,
      })
      sendJson(response, {
        status: 503,
        body: { error: 'repository_unavailable', message: '학습 데이터를 저장하거나 불러오지 못했습니다.' },
        headers: createCorsHeaders(),
      })
      return
    }

    const requestTooLarge = error?.status === 413 || error?.type === 'entity.too.large'
    logger.error(error instanceof Error ? error.message : error)
    sendJson(response, requestTooLarge ? {
      status: 413,
      body: { error: 'request_too_large', message: '요청 본문이 너무 큽니다.' },
      headers: createCorsHeaders(),
    } : {
      status: 500,
      body: { error: 'internal_server_error', message: '서버 요청 처리에 실패했습니다.' },
      headers: createCorsHeaders(),
    })
  })

  return app
}

export function createRuntimeContext() {
  loadEnvFiles({ fs, path, repoRoot })

  const repositories = createRuntimeRepositories()

  return {
    tracks: loadCurriculumTracks({ fs, path, repoRoot }),
    config: createAgentConfig(),
    ...repositories,
    knowledgeChunks: loadKnowledgeChunks({ fs, path, repoRoot }),
    repositoryMode: repositories.repositoryMode,
  }
}

export function createRuntimeRepositories(
  env = process.env,
  { supabaseClientFactory = createSupabaseServerClient } = {},
) {
  const repositoryMode = env.ICU_REPOSITORY_MODE || 'in-memory'

  if (repositoryMode === 'in-memory') {
    const mistakeNoteRepository = createInMemoryMistakeNoteRepository()
    const gitLabAttemptRepository = createInMemoryGitLabAttemptRepository()

    return {
      repositoryMode,
      progressRepository: createInMemoryLearningProgressRepository(),
      mistakeNoteRepository,
      gitLabAttemptRepository,
      gitLabAttemptRecorder: createInMemoryGitLabAttemptRecorder({
        attemptRepository: gitLabAttemptRepository,
        mistakeNoteRepository,
      }),
      generatedCurriculumRepository: createInMemoryGeneratedCurriculumRepository(),
    }
  }

  if (repositoryMode === 'sqlite') {
    const database = createSqliteDatabase({ dbPath: env.ICU_SQLITE_PATH, repoRoot })
    const mistakeNoteRepository = createSqliteMistakeNoteRepository(database)
    const gitLabAttemptRepository = createSqliteGitLabAttemptRepository(database)

    return {
      repositoryMode,
      sqliteDatabase: database,
      progressRepository: createSqliteLearningProgressRepository(database),
      mistakeNoteRepository,
      gitLabAttemptRepository,
      gitLabAttemptRecorder: createSqliteGitLabAttemptRecorder({
        database,
        attemptRepository: gitLabAttemptRepository,
        mistakeNoteRepository,
      }),
      generatedCurriculumRepository: createSqliteGeneratedCurriculumRepository(database),
    }
  }

  if (repositoryMode === 'supabase') {
    const supabaseClient = supabaseClientFactory({
      url: env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || env.VITE_SUPABASE_URL,
      secretKey: env.SUPABASE_SECRET_KEY,
    })

    return {
      repositoryMode,
      supabaseClient,
      progressRepository: createSupabaseLearningProgressRepository(supabaseClient),
      mistakeNoteRepository: createSupabaseMistakeNoteRepository(supabaseClient),
      gitLabAttemptRepository: createSupabaseGitLabAttemptRepository(supabaseClient),
      gitLabAttemptRecorder: createSupabaseGitLabAttemptRecorder(supabaseClient),
      generatedCurriculumRepository: createSupabaseGeneratedCurriculumRepository(supabaseClient),
    }
  }

  throw new Error(`Unsupported ICU_REPOSITORY_MODE: ${repositoryMode}`)
}

export function startCurriculumAgentServer({
  host = process.env.CURRICULUM_AGENT_HOST || (process.env.PORT ? '0.0.0.0' : defaultCurriculumAgentHost),
  port = Number(process.env.PORT || process.env.CURRICULUM_AGENT_PORT || defaultCurriculumAgentPort),
  tracks,
  config,
  recommendationProvider,
  progressRepository,
  mistakeNoteRepository,
  gitLabAttemptRepository,
  gitLabAttemptRecorder,
  generatedCurriculumRepository,
  knowledgeChunks,
  logger = console,
} = {}) {
  const runtimeContext = tracks && config ? {
    tracks,
    config,
    progressRepository,
    mistakeNoteRepository,
    gitLabAttemptRepository,
    gitLabAttemptRecorder,
    generatedCurriculumRepository,
    knowledgeChunks,
  } : createRuntimeContext()
  const server = createCurriculumAgentServer({ ...runtimeContext, recommendationProvider, logger })

  server.listen(port, host, () => {
    logger.log(`Curriculum Agent API listening on http://${host}:${port}`)
    logger.log(`repository mode: ${runtimeContext.repositoryMode ?? 'in-memory'}`)
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
