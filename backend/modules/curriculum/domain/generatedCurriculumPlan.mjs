import { URL } from 'node:url'

export const defaultMissionMinutes = 30

export const defaultFiles = {
  frontend: 'index.html',
  backend: 'main.py',
  fullstack: 'app.tsx',
  devops: 'ops-checklist.sh',
  'software-engineer': 'solution.py',
}

export const defaultModes = {
  frontend: 'react',
  backend: 'python',
  fullstack: 'react',
  devops: 'linux',
  'software-engineer': 'python',
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

  const fileName = String(output.todayMission?.fileName || defaultFiles[track.trackId])
  const mode = normalizeWorkspaceMode(output.todayMission?.mode) || inferWorkspaceMode({ fileName, trackId: track.trackId })

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
      fileName,
      mode,
    },
    rationale: String(output.rationale || '사용자 목표와 가장 가까운 시작 단계를 선택했습니다.'),
  }
}

export function createGeneratedCurriculumPlan({ goal, recommendation, tracks }) {
  const track = tracks.find((item) => item.trackId === recommendation.trackId)
  if (!track) throw new Error(`Unknown trackId for generated plan: ${recommendation.trackId}`)

  const level = track.levels.find((item) => item.levelId === recommendation.levelId)
  if (!level) throw new Error(`Unknown levelId for generated plan: ${recommendation.levelId}`)

  const selectedModules = recommendation.moduleIds
    .map((moduleId) => level.modules.find((module) => module.moduleId === moduleId))
    .filter(Boolean)

  if (selectedModules.length === 0) {
    throw new Error('Generated plan requires at least one selected module')
  }

  return {
    id: `${track.trackId}-curriculum-plan`,
    goal,
    title: recommendation.title,
    summary: recommendation.summary,
    estimatedDuration: `${getTotalEstimatedWeeks(track)}주 로드맵`,
    focusRole: track.trackName,
    todayMission: recommendation.todayMission,
    steps: selectedModules.map((module, index) => createGeneratedCurriculumStep(module, level, index)),
    sources: createGeneratedCurriculumSources(selectedModules),
  }
}

function normalizeWorkspaceMode(value) {
  return value === 'react' || value === 'linux' || value === 'docker' || value === 'python' ? value : null
}

function inferWorkspaceMode({ fileName, trackId }) {
  const normalizedFileName = String(fileName || '').toLowerCase()
  if (normalizedFileName === 'dockerfile' || normalizedFileName.endsWith('.dockerfile')) return 'docker'
  if (normalizedFileName.endsWith('.jsx') || normalizedFileName.endsWith('.tsx') || normalizedFileName.endsWith('.js')) return 'react'
  if (normalizedFileName.endsWith('.sh')) return 'linux'
  if (normalizedFileName.endsWith('.py')) return 'python'
  return defaultModes[trackId] || 'react'
}

function normalizeDurationMinutes(value) {
  const duration = Number(value)
  if (!Number.isFinite(duration) || duration < 15 || duration > 60) return defaultMissionMinutes

  return Math.round(duration)
}

function getTotalEstimatedWeeks(track) {
  return track.levels.reduce((total, level) => total + Number(level.estimatedWeeks || 0), 0)
}

function createGeneratedCurriculumStep(module, level, index) {
  return {
    id: module.moduleId,
    title: module.title,
    detail: createModuleDetail(module),
    outcome: index === 0 ? level.goal : `${module.title}를 실습으로 설명할 수 있습니다.`,
    durationLabel: `Week ${index + 1}`,
  }
}

function createModuleDetail(module) {
  const topicSummary = Array.isArray(module.topics) ? module.topics.slice(0, 3).join(', ') : ''

  return topicSummary ? `${topicSummary}를 순서대로 학습합니다.` : `${module.title}를 학습합니다.`
}

function createGeneratedCurriculumSources(modules) {
  const sourceMap = new Map()

  for (const module of modules) {
    for (const resource of module.resources ?? []) {
      if (!sourceMap.has(resource.url)) {
        sourceMap.set(resource.url, {
          title: resource.label,
          type: resource.type === 'official-doc' ? 'official_docs' : 'practice_guide',
          urlLabel: getUrlLabel(resource.url),
        })
      }
    }
  }

  return [...sourceMap.values()]
}

function getUrlLabel(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}