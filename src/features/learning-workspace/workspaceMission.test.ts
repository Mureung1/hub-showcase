import { describe, expect, it } from 'vitest'
import {
  createActiveMissionPresentation,
  createWorkspaceEditorFiles,
  type WorkspaceMission,
} from './workspaceMission'
import type { ModuleExercise } from './data/frontendModuleExercises'
import { generatedMissionId } from './workspaceInteraction'
import type { GeneratedCurriculumStep } from '../curriculum/model/curriculumGenerator'

const baseMission: WorkspaceMission = {
  id: generatedMissionId,
  title: '기본 제목',
  detail: '기본 설명',
  durationMinutes: 30,
  fileName: 'App.jsx',
  mode: 'react',
  trackTitle: '프론트엔드 개발자',
  stepLabel: 'AI 추천 미션',
  sourceLabel: '생성 커리큘럼 기반',
  guideTitle: '가이드 제목',
  guideDetail: '가이드 설명',
  practiceDetail: '기본 실습 설명',
  hint: '기본 힌트',
  criteria: [],
  sources: [],
  codeLines: ['export default function App() { return null }'],
}

describe('createWorkspaceEditorFiles', () => {
  it('uses mission.cssCode for styles.css when present', () => {
    const mission: WorkspaceMission = { ...baseMission, cssCode: '.custom { color: blue; }' }

    const files = createWorkspaceEditorFiles(mission)
    const cssFile = files.find((file) => file.name === 'styles.css')

    expect(cssFile?.value).toBe('.custom { color: blue; }')
  })

  it('falls back to the default react styles when cssCode is not set', () => {
    const files = createWorkspaceEditorFiles(baseMission)
    const cssFile = files.find((file) => file.name === 'styles.css')

    expect(cssFile?.value).toContain('.preview-root')
  })
})

function createStep(id: string): GeneratedCurriculumStep {
  return { id, title: '단계 제목', detail: '단계 설명', outcome: '단계 성과', durationLabel: 'Week 1' }
}

describe('createActiveMissionPresentation', () => {
  it('applies matching exercise content when the step id has a registered exercise', () => {
    const exercises: Record<string, ModuleExercise> = {
      'test-module-01': {
        fileName: 'Example.jsx',
        codeLines: ['export default function Example() {', '  return null', '}'],
        practiceDetail: '전용 실습 설명',
        hint: '전용 힌트',
      },
    }

    const result = createActiveMissionPresentation(baseMission, createStep('test-module-01'), exercises)

    expect(result.fileName).toBe('Example.jsx')
    expect(result.codeLines).toEqual(['export default function Example() {', '  return null', '}'])
    expect(result.practiceDetail).toBe('전용 실습 설명')
    expect(result.hint).toBe('전용 힌트')
  })

  it('applies cssCode from the exercise when present', () => {
    const exercises: Record<string, ModuleExercise> = {
      'test-module-02': {
        fileName: 'Example.jsx',
        codeLines: ['export default function Example() { return null }'],
        cssCode: '.example { color: red; }',
        practiceDetail: '전용 실습 설명',
        hint: '전용 힌트',
      },
    }

    const result = createActiveMissionPresentation(baseMission, createStep('test-module-02'), exercises)

    expect(result.cssCode).toBe('.example { color: red; }')
  })

  it('falls back to the existing generic behavior when no exercise matches the step id', () => {
    const result = createActiveMissionPresentation(baseMission, createStep('be-01-01'), {})

    expect(result.fileName).toBe(baseMission.fileName)
    expect(result.codeLines).toBe(baseMission.codeLines)
    expect(result.practiceDetail).toBe(
      '단계 제목을 실습하면서 App.jsx 파일에서 확인할 내용을 정리하세요.',
    )
  })

  it('returns the mission unchanged when there is no active generated step', () => {
    const result = createActiveMissionPresentation(baseMission, null, {})

    expect(result).toBe(baseMission)
  })

  it('does not apply exercise content for non-generated missions even if the id matches', () => {
    const exercises: Record<string, ModuleExercise> = {
      'queue-item-1': {
        fileName: 'Example.jsx',
        codeLines: ['export default function Example() { return null }'],
        practiceDetail: '전용 실습 설명',
        hint: '전용 힌트',
      },
    }
    const nonGeneratedMission = { ...baseMission, id: 'queue-item-1' }

    const result = createActiveMissionPresentation(
      nonGeneratedMission,
      createStep('queue-item-1'),
      exercises,
    )

    expect(result).toBe(nonGeneratedMission)
  })

  it('uses the real frontendModuleExercises table by default for a known moduleId', () => {
    const result = createActiveMissionPresentation(baseMission, createStep('fe-01-01'))

    expect(result.fileName).toBe('ProfileCard.jsx')
  })
})
