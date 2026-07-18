import process from 'node:process'
const trackFileNames = [
  'frontend.json',
  'backend.json',
  'fullstack.json',
  'devops.json',
  'software-engineer.json',
]

export const defaultProvider = 'developer'
export const defaultModel = 'gemini-flash-latest'
export const defaultGoal = '프론트엔드 개발자가 되고 싶어'
export const defaultMissionMinutes = 30
export const curriculumAgentResponseSchema = {
  type: 'OBJECT',
  properties: {
    trackId: { type: 'STRING' },
    levelId: { type: 'STRING' },
    moduleIds: { type: 'ARRAY', items: { type: 'STRING' } },
    title: { type: 'STRING' },
    summary: { type: 'STRING' },
    todayMission: {
      type: 'OBJECT',
      properties: {
        title: { type: 'STRING' },
        detail: { type: 'STRING' },
        durationMinutes: { type: 'NUMBER' },
        fileName: { type: 'STRING' },
      },
      required: ['title', 'detail', 'durationMinutes', 'fileName'],
    },
    rationale: { type: 'STRING' },
  },
  required: ['trackId', 'levelId', 'moduleIds', 'title', 'summary', 'todayMission', 'rationale'],
}
export const defaultFiles = {
  frontend: 'index.html',
  backend: 'main.py',
  fullstack: 'app.tsx',
  devops: 'ops-checklist.sh',
  'software-engineer': 'solution.py',
}

export function loadEnvFiles({ fs, path, repoRoot }) {
  loadEnvFile({ fs, filePath: path.join(repoRoot, '.env') })
  loadEnvFile({ fs, filePath: path.join(repoRoot, 'src', '.env') })
}

function loadEnvFile({ fs, filePath }) {
  if (!fs.existsSync(filePath)) return

  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue

    const [key, ...rest] = trimmed.split('=')
    if (!process.env[key]) process.env[key] = rest.join('=').replace(/^[`'"]|[`'"]$/g, '')
  }
}

export function loadCurriculumTracks({ fs, path, repoRoot }) {
  const dataDir = path.join(repoRoot, 'data')

  return trackFileNames.map((fileName) => JSON.parse(fs.readFileSync(path.join(dataDir, fileName), 'utf8')))
}

export function createAgentConfig(env = process.env) {
  return {
    provider: env.CURRICULUM_AGENT_PROVIDER || env.GEMINI_PROVIDER || defaultProvider,
    model: env.GEMINI_MODEL || defaultModel,
    apiKey: env.GEMINI_API_KEY,
  }
}

export function parseCliArgs(argv) {
  return {
    dryRun: argv.includes('--dry-run'),
    compact: argv.includes('--compact'),
    goal: argv.filter((arg) => !arg.startsWith('--')).join(' ').trim() || defaultGoal,
  }
}

export function createDryRunPayload({ goal, tracks, config }) {
  return {
    provider: config.provider,
    model: config.model,
    system_instruction: createSystemInstruction(),
    input: JSON.parse(createPrompt({ goal, tracks })),
  }
}

export async function runCurriculumPlannerAgent({ goal, tracks, config, fetchImpl = globalThis.fetch }) {
  if (config.provider !== 'developer') {
    throw new Error(`Unsupported curriculum agent provider: ${config.provider}. Supported provider: developer`)
  }

  if (!config.apiKey) {
    throw new Error('GEMINI_API_KEY is missing. Put it in .env or src/.env for local CLI runs.')
  }

  if (typeof fetchImpl !== 'function') {
    throw new Error('A fetch implementation is required to call the Gemini API.')
  }

  return callDeveloperGemini({ apiKey: config.apiKey, model: config.model, goal, tracks, fetchImpl })
}

export function createCatalog(tracks) {
  return tracks.map((track) => ({
    trackId: track.trackId,
    trackName: track.trackName,
    description: track.description,
    levels: track.levels.map((level) => ({
      levelId: level.levelId,
      levelNumber: level.levelNumber,
      title: level.title,
      goal: level.goal,
      estimatedWeeks: level.estimatedWeeks,
      modules: level.modules.map((module) => ({
        moduleId: module.moduleId,
        title: module.title,
        topics: module.topics,
        practiceIdeas: module.practiceIdeas,
        resources: module.resources,
      })),
    })),
  }))
}

export function createSystemInstruction() {
  return [
    'You are ICU Curriculum Planner Agent.',
    'Use only the provided curriculum catalog.',
    'Return only valid JSON. Do not wrap the answer in markdown.',
    'Pick one track, one starting level, and exactly three modules from that level.',
    'Use Korean for title, summary, todayMission, and rationale.',
    'Required JSON shape: {"trackId":"string","levelId":"string","moduleIds":["string"],"title":"string","summary":"string","todayMission":{"title":"string","detail":"string","durationMinutes":number,"fileName":"string"},"rationale":"string"}',
  ].join('\n')
}

export function createPrompt({ goal, tracks }) {
  return JSON.stringify({
    userGoal: goal,
    catalog: createCatalog(tracks),
    constraints: {
      useOnlyCatalogData: true,
      moduleCount: 3,
      defaultDurationMinutes: defaultMissionMinutes,
      defaultFiles,
    },
  })
}

function normalizeDurationMinutes(value) {
  const duration = Number(value)
  if (!Number.isFinite(duration) || duration < 15 || duration > 60) return defaultMissionMinutes

  return Math.round(duration)
}
async function callDeveloperGemini({ apiKey, model, goal, tracks, fetchImpl }) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`
  const response = await fetchImpl(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: createSystemInstruction() }] },
      contents: [{ role: 'user', parts: [{ text: createPrompt({ goal, tracks }) }] }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
        responseSchema: curriculumAgentResponseSchema,
      },
    }),
  })
  const text = await response.text()
  if (!response.ok) throw new Error(`Gemini API request failed (${response.status}): ${text}`)

  const body = JSON.parse(text)
  const outputText = extractOutputText(body)
  if (!outputText) throw new Error('Gemini API response did not include output text')

  return normalizeAgentOutput({ output: JSON.parse(extractJson(outputText)), tracks })
}

export function extractOutputText(body) {
  const blocks = []

  for (const step of body.steps ?? []) {
    for (const content of step.content ?? []) {
      if (typeof content.text === 'string') blocks.push(content.text)
    }
  }

  for (const candidate of body.candidates ?? []) {
    for (const part of candidate.content?.parts ?? []) {
      if (typeof part.text === 'string') blocks.push(part.text)
    }
  }

  return blocks.join('\n').trim()
}

export function extractJson(text) {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(text.trim())
  const candidate = fenced?.[1] ?? text.trim()
  const start = candidate.indexOf('{')
  const end = candidate.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) throw new Error('Gemini output did not contain a JSON object')

  return candidate.slice(start, end + 1)
}

export function normalizeAgentOutput({ output, tracks }) {
  const track = tracks.find((item) => item.trackId === output.trackId)
  if (!track) throw new Error(`Unknown trackId from Gemini: ${output.trackId}`)

  const level = track.levels.find((item) => item.levelId === output.levelId)
  if (!level) throw new Error(`Unknown levelId from Gemini: ${output.levelId}`)

  const modules = (Array.isArray(output.moduleIds) ? output.moduleIds : [])
    .map((moduleId) => level.modules.find((module) => module.moduleId === moduleId))
    .filter(Boolean)
  if (modules.length === 0) throw new Error('Gemini output did not select valid moduleIds')

  return {
    trackId: track.trackId,
    trackName: track.trackName,
    levelId: level.levelId,
    levelTitle: level.title,
    moduleIds: modules.map((module) => module.moduleId),
    title: String(output.title || `${track.trackName} 커리큘럼`),
    summary: String(output.summary || level.goal),
    todayMission: {
      title: String(output.todayMission?.title || `${modules[0].title} 실습`),
      detail: String(output.todayMission?.detail || modules[0].practiceIdeas[0] || level.goal),
      durationMinutes: normalizeDurationMinutes(output.todayMission?.durationMinutes),
      fileName: String(output.todayMission?.fileName || defaultFiles[track.trackId]),
    },
    rationale: String(output.rationale || '사용자 목표와 가장 가까운 시작 단계를 선택했습니다.'),
  }
}




