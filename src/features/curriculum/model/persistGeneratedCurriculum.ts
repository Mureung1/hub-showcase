import type { GeneratedCurriculumPlan } from './curriculumGenerator'
import type { GeneratedCurriculumSnapshot } from './useGeneratedCurriculumStore'

type PersistGeneratedCurriculumOptions = {
  goal: string
  plan: GeneratedCurriculumPlan
  serverMode: boolean
  saveServer: () => Promise<{ generatedCurriculum: GeneratedCurriculumSnapshot }>
  saveLocal: (goal: string, plan: GeneratedCurriculumPlan) => void
  hydrate: (snapshot: GeneratedCurriculumSnapshot) => void
}

export async function persistGeneratedCurriculum(options: PersistGeneratedCurriculumOptions) {
  if (!options.serverMode) {
    options.saveLocal(options.goal, options.plan)
    return null
  }

  const { generatedCurriculum } = await options.saveServer()
  options.hydrate(generatedCurriculum)

  return generatedCurriculum
}
