import {
  defaultFiles,
  defaultMissionMinutes,
  normalizeAgentOutput,
} from '../domain/generatedCurriculumPlan.mjs'

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

export async function runCurriculumPlannerAgent({ goal, tracks, config, knowledgeContext = [], fetchImpl = globalThis.fetch }) {
  if (config.provider !== 'developer') {
    throw new Error(`Unsupported curriculum agent provider: ${config.provider}. Supported provider: developer`)
  }

  if (!config.apiKey) {
    throw new Error('GEMINI_API_KEY is missing. Put it in .env or src/.env for local CLI runs.')
  }

  if (typeof fetchImpl !== 'function') {
    throw new Error('A fetch implementation is required to call the Gemini API.')
  }

  return callDeveloperGemini({ apiKey: config.apiKey, model: config.model, goal, tracks, knowledgeContext, fetchImpl })
}

export function createDryRunPayload({ goal, tracks, config, knowledgeContext = [] }) {
  return {
    provider: config.provider,
    model: config.model,
    system_instruction: createSystemInstruction(),
    input: JSON.parse(createPrompt({ goal, tracks, knowledgeContext })),
  }
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

export function createKnowledgeContext(chunks) {
  return chunks.slice(0, 5).map((chunk) => ({
    topic: chunk.topic,
    docTitle: chunk.docTitle,
    sectionHeading: chunk.sectionHeading,
    url: chunk.url,
    chunkText: String(chunk.chunkText ?? '').slice(0, 500),
  }))
}
export function createSystemInstruction() {
  return [
    'You are ICU Curriculum Planner Agent.',
    'Use only the provided curriculum catalog to choose track, level, and modules.',
    'Use knowledgeContext only as official-doc grounding for rationale and learning explanation.',
    'Do not copy long knowledgeContext passages into the response.',
    'Return only valid JSON. Do not wrap the answer in markdown.',
    'Pick one track, one starting level, and exactly three modules from that level.',
    'Use Korean for title, summary, todayMission, and rationale.',
    'Required JSON shape: {"trackId":"string","levelId":"string","moduleIds":["string"],"title":"string","summary":"string","todayMission":{"title":"string","detail":"string","durationMinutes":number,"fileName":"string"},"rationale":"string"}',
  ].join('\n')
}

export function createPrompt({ goal, tracks, knowledgeContext = [] }) {
  return JSON.stringify({
    userGoal: goal,
    catalog: createCatalog(tracks),
    knowledgeContext: createKnowledgeContext(knowledgeContext),
    constraints: {
      useOnlyCatalogData: true,
      moduleCount: 3,
      defaultDurationMinutes: defaultMissionMinutes,
      defaultFiles,
    },
  })
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

async function callDeveloperGemini({ apiKey, model, goal, tracks, knowledgeContext, fetchImpl }) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`
  const response = await fetchImpl(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: createSystemInstruction() }] },
      contents: [{ role: 'user', parts: [{ text: createPrompt({ goal, tracks, knowledgeContext }) }] }],
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
