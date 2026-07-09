export type CurriculumStep = {
  title: string
  detail: string
  mission: string
}

export type CurriculumPreset = {
  label: string
  goal: string
  fileName: string
  code: string
  steps: CurriculumStep[]
}
