import backendTrack from '../../shared/curriculum/backend.json'
import devopsTrack from '../../shared/curriculum/devops.json'
import frontendTrack from '../../shared/curriculum/frontend.json'
import fullstackTrack from '../../shared/curriculum/fullstack.json'
import softwareEngineerTrack from '../../shared/curriculum/software-engineer.json'

export type CurriculumSource = {
  title: string
  type: 'official_docs' | 'practice_guide'
  urlLabel: string
}

export type GeneratedCurriculumStep = {
  id: string
  title: string
  detail: string
  outcome: string
  durationLabel: string
}

export type GeneratedCurriculumPlan = {
  id: string
  goal: string
  title: string
  summary: string
  estimatedDuration: string
  focusRole: string
  todayMission: {
    title: string
    detail: string
    durationMinutes: number
    fileName: string
  }
  steps: GeneratedCurriculumStep[]
  sources: CurriculumSource[]
}

type RawCurriculumResource = {
  label: string
  url: string
  type: 'official-doc' | 'reference'
}

type RawCurriculumModule = {
  moduleId: string
  title: string
  topics: string[]
  practiceIdeas: string[]
  resources: RawCurriculumResource[]
}

type RawCurriculumLevel = {
  levelId: string
  levelNumber: number
  title: string
  goal: string
  estimatedWeeks: number
  modules: RawCurriculumModule[]
}

type RawCurriculumTrack = {
  trackId: CurriculumTrackId
  trackName: string
  description: string
  totalLevels: number
  levels: RawCurriculumLevel[]
}

type CurriculumTrackId = 'frontend' | 'backend' | 'fullstack' | 'devops' | 'software-engineer'

type CurriculumTrackConfig = {
  track: RawCurriculumTrack
  keywords: RegExp
  defaultFileName: string
}

const fallbackGoal = '새 기술을 실무에 적용하고 싶어'
const defaultMissionMinutes = 30

const curriculumTracks: Record<CurriculumTrackId, CurriculumTrackConfig> = {
  frontend: {
    track: frontendTrack as RawCurriculumTrack,
    keywords: /(frontend|front-end|프론트|react|리액트|html|css|javascript|자바스크립트)/i,
    defaultFileName: 'index.html',
  },
  backend: {
    track: backendTrack as RawCurriculumTrack,
    keywords: /(backend|back-end|백엔드|api|server|서버|fastapi|db|database|데이터베이스)/i,
    defaultFileName: 'main.py',
  },
  fullstack: {
    track: fullstackTrack as RawCurriculumTrack,
    keywords: /(fullstack|full-stack|풀스택)/i,
    defaultFileName: 'app.tsx',
  },
  devops: {
    track: devopsTrack as RawCurriculumTrack,
    keywords: /(devops|dev ops|데브옵스|인프라|sre|cloud|클라우드|docker|도커|platform|플랫폼)/i,
    defaultFileName: 'ops-checklist.sh',
  },
  'software-engineer': {
    track: softwareEngineerTrack as RawCurriculumTrack,
    keywords: /(software engineer|소프트웨어|cs|computer science|알고리즘|자료구조|설계|architecture|아키텍처)/i,
    defaultFileName: 'solution.py',
  },
}

export function generateMockCurriculum(goal: string): GeneratedCurriculumPlan {
  return generateCurriculumPlan(goal)
}

function generateCurriculumPlan(goal: string): GeneratedCurriculumPlan {
  const normalizedGoal = goal.trim() || fallbackGoal
  const config = selectCurriculumTrack(normalizedGoal)
  const startLevel = config.track.levels[0]
  const firstModule = startLevel.modules[0]

  return {
    id: `${config.track.trackId}-curriculum-plan`,
    goal: normalizedGoal,
    title: `${config.track.trackName} 커리큘럼`,
    summary: `${config.track.description} 먼저 ${startLevel.goal}`,
    estimatedDuration: `${getTotalEstimatedWeeks(config.track)}주 로드맵`,
    focusRole: config.track.trackName,
    todayMission: createTodayMission(firstModule, config.defaultFileName),
    steps: startLevel.modules.map((module, index) => createCurriculumStep(module, startLevel, index)),
    sources: createCurriculumSources(startLevel),
  }
}

function selectCurriculumTrack(goal: string) {
  const matchedConfig = Object.values(curriculumTracks).find((config) => config.keywords.test(goal))

  return matchedConfig ?? curriculumTracks.frontend
}

function getTotalEstimatedWeeks(track: RawCurriculumTrack) {
  return track.levels.reduce((total, level) => total + level.estimatedWeeks, 0)
}

function createTodayMission(module: RawCurriculumModule, fileName: string) {
  return {
    title: `${module.title} 실습`,
    detail: module.practiceIdeas[0] ?? `${module.title}의 핵심 개념을 작은 예제로 확인합니다.`,
    durationMinutes: defaultMissionMinutes,
    fileName,
  }
}

function createCurriculumStep(
  module: RawCurriculumModule,
  level: RawCurriculumLevel,
  index: number,
): GeneratedCurriculumStep {
  return {
    id: module.moduleId,
    title: module.title,
    detail: createModuleDetail(module),
    outcome: index === 0 ? level.goal : `${module.title}를 실습으로 설명할 수 있습니다.`,
    durationLabel: `Week ${index + 1}`,
  }
}

function createModuleDetail(module: RawCurriculumModule) {
  const topicSummary = module.topics.slice(0, 3).join(', ')

  return topicSummary ? `${topicSummary}를 순서대로 학습합니다.` : `${module.title}를 학습합니다.`
}

function createCurriculumSources(level: RawCurriculumLevel): CurriculumSource[] {
  const sourceMap = new Map<string, CurriculumSource>()

  for (const module of level.modules) {
    for (const resource of module.resources) {
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

function getUrlLabel(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}