/* global fetch */
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dataDir = path.join(repoRoot, 'data')
const model = process.env.GEMINI_MODEL || 'gemini-flash-latest'
const defaultFiles = {
  frontend: 'index.html',
  backend: 'main.py',
  fullstack: 'app.tsx',
  devops: 'ops-checklist.sh',
  'software-engineer': 'solution.py',
}

function readJson(fileName) {
  return JSON.parse(fs.readFileSync(path.join(dataDir, fileName), 'utf8'))
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue
    const [key, ...rest] = trimmed.split('=')
    if (!process.env[key]) process.env[key] = rest.join('=').replace(/^[`'"]|[`'"]$/g, '')
  }
}

loadEnvFile(path.join(repoRoot, '.env'))
loadEnvFile(path.join(repoRoot, 'src', '.env'))

const tracks = [
  readJson('frontend.json'),
  readJson('backend.json'),
  readJson('fullstack.json'),
  readJson('devops.json'),
  readJson('software-engineer.json'),
]

function createCatalog() {
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

function systemInstruction() {
  return [
    'You are ICU Curriculum Planner Agent.',
    'Use only the provided curriculum catalog.',
    'Return only valid JSON. Do not wrap the answer in markdown.',
    'Pick one track, one starting level, and exactly three modules from that level.',
    'Use Korean for title, summary, todayMission, and rationale.',
    'Required JSON shape: {"trackId":"string","levelId":"string","moduleIds":["string"],"title":"string","summary":"string","todayMission":{"title":"string","detail":"string","durationMinutes":number,"fileName":"string"},"rationale":"string"}',
  ].join('\n')
}

function prompt(goal) {
  return JSON.stringify({
    userGoal: goal,
    catalog: createCatalog(),
    constraints: {
      useOnlyCatalogData: true,
      moduleCount: 3,
      defaultDurationMinutes: 30,
      defaultFiles,
    },
  })
}

function parseArgs(argv) {
  return {
    dryRun: argv.includes('--dry-run'),
    compact: argv.includes('--compact'),
    goal: argv.filter((arg) => !arg.startsWith('--')).join(' ').trim() || '프론트엔드 개발자가 되고 싶어',
  }
}

async function callGemini(apiKey, goal) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemInstruction() }] },
      contents: [{ role: 'user', parts: [{ text: prompt(goal) }] }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
      },
    }),
  })
  const text = await response.text()
  if (!response.ok) throw new Error(`Gemini API request failed (${response.status}): ${text}`)
  const body = JSON.parse(text)
  const outputText = extractOutputText(body)
  if (!outputText) throw new Error('Gemini API response did not include output text')
  return normalize(JSON.parse(extractJson(outputText)))
}

function extractOutputText(body) {
  const blocks = []
  for (const step of body.steps ?? []) for (const content of step.content ?? []) if (typeof content.text === 'string') blocks.push(content.text)
  for (const candidate of body.candidates ?? []) for (const part of candidate.content?.parts ?? []) if (typeof part.text === 'string') blocks.push(part.text)
  return blocks.join('\n').trim()
}

function extractJson(text) {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(text.trim())
  const candidate = fenced?.[1] ?? text.trim()
  const start = candidate.indexOf('{')
  const end = candidate.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) throw new Error('Gemini output did not contain a JSON object')
  return candidate.slice(start, end + 1)
}

function normalize(output) {
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
      durationMinutes: Number(output.todayMission?.durationMinutes || 30),
      fileName: String(output.todayMission?.fileName || defaultFiles[track.trackId]),
    },
    rationale: String(output.rationale || '사용자 목표와 가장 가까운 시작 단계를 선택했습니다.'),
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.dryRun) {
    console.log(JSON.stringify({ model, system_instruction: systemInstruction(), input: JSON.parse(prompt(args.goal)) }, null, 2))
    return
  }
  if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is missing. Put it in .env or src/.env for local CLI runs.')
  const output = await callGemini(process.env.GEMINI_API_KEY, args.goal)
  console.log(JSON.stringify(output, null, args.compact ? 0 : 2))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})

