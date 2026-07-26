import { describe, expect, it } from 'vitest'
import { generatedMissionId } from './workspaceInteraction'
import {
  createActiveMissionPresentation,
  createWorkspaceEditorFiles,
  resolveActiveGeneratedStep,
  resolveWorkspaceMission,
} from './workspaceMission'
import { generateMockCurriculum } from '../curriculum/model/curriculumGenerator'

describe('workspace mission presentation helpers', () => {
  it('resolves the generated mission and its first editor file', () => {
    const plan = generateMockCurriculum('React 프론트엔드 개발자가 되고 싶어')
    const mission = resolveWorkspaceMission(generatedMissionId, plan)
    const activeStep = resolveActiveGeneratedStep(plan, 0)
    const activeMission = createActiveMissionPresentation(mission, activeStep)
    const files = createWorkspaceEditorFiles(activeMission)

    expect(mission.id).toBe(generatedMissionId)
    expect(activeMission.title).toBe(activeStep?.title)
    expect(files[0].value.length).toBeGreaterThan(0)
  })

  it('resolves a today-queue mission by id', () => {
    const plan = generateMockCurriculum('React 프론트엔드 개발자가 되고 싶어')
    const mission = resolveWorkspaceMission('counter-mission', plan)

    expect(mission.id).toBe('counter-mission')
    expect(mission.mode).toBe('react')
  })
})
