import type { ReactPreviewBundle } from './api/codeRunnerClient'
import {
  clampStepOffset,
  createStepState,
  createWorkspaceTestCases,
  generatedMissionId,
  type RunState,
  type StepState,
  type TestCase,
} from './workspaceInteraction'
import type {
  GeneratedCurriculumPlan,
  GeneratedCurriculumStep,
  WorkspaceMode,
} from '../curriculum/model/curriculumGenerator'
import { todayQueue, type TodayQueueItem } from '../today-learning/data/todayLearning'
import { frontendModuleExercises, type ModuleExercise } from './data/frontendModuleExercises'

export type CurriculumStep = {
  title: string
  detail: string
  state: StepState
}

export type WorkspaceMission = {
  id: string
  title: string
  detail: string
  durationMinutes: number
  fileName: string
  mode: WorkspaceMode
  trackTitle: string
  stepLabel: string
  sourceLabel: string
  guideTitle: string
  guideDetail: string
  practiceDetail: string
  hint: string
  criteria: string[]
  sources: string[]
  codeLines: string[]
  cssCode?: string
}

export type CodeRunPreviewState = {
  status: RunState
  logs: string[]
  error?: string
  result?: string | null
  preview?: ReactPreviewBundle
}

export type ExecutionPanelModel = {
  title: string
  ariaLabel: string
  emptyTitle: string
  emptyDetail: string
  statusLabel: string
}

export type WorkspaceEditorFile = {
  path: string
  name: string
  language: string
  value: string
}

export const defaultCareerGoal = 'DevOps 엔지니어가 되고 싶어'

const reactCodeLines = [
  "import React, { useState } from 'react'",
  '',
  'export default function Counter({ initial = 0 }) {',
  '  const [count, setCount] = useState(initial)',
  '',
  '  return (',
  '    <section className="preview-root" aria-label="counter practice">',
  '      <p>{count}</p>',
  '      <button onClick={() => setCount(count + 1)}>+1</button>',
  '    </section>',
  '  )',
  '}',
]

const shellCodeLines = [
  '#!/bin/bash',
  'echo "현재 위치 확인"',
  'pwd',
  '',
  'echo "학습 파일 목록 확인"',
  'ls -la',
  '',
  'echo "실행 중인 프로세스 일부 확인"',
  'ps aux | head',
]

const apiCodeLines = [
  'from fastapi import FastAPI',
  '',
  'app = FastAPI()',
  '',
  '@app.get("/learning-topics/{topic}")',
  'def read_topic(topic: str):',
  '    return {"topic": topic, "status": "ready"}',
]

const dockerCodeLines = [
  'FROM node:22-alpine',
  'WORKDIR /app',
  'COPY package*.json ./',
  'RUN npm ci',
  'COPY . .',
  'CMD ["npm", "run", "dev"]',
]

export const initialActivityItems = [
  {
    id: 'submit-ready',
    time: '10:15',
    title: '학습 준비',
    detail: '오늘 미션과 참고 문서를 확인했습니다.',
  },
  {
    id: 'hint-opened',
    time: '10:12',
    title: '힌트 확인',
    detail: '막히는 지점을 먼저 좁혀봅니다.',
  },
  {
    id: 'run-started',
    time: '10:08',
    title: '테스트 실행',
    detail: '현재 코드 상태를 확인했습니다.',
  },
]

export function stateLabel(state: StepState) {
  if (state === 'done') {
    return '완료'
  }

  if (state === 'current') {
    return '진행 중'
  }

  return '예정'
}

export function createSteps(
  plan: GeneratedCurriculumPlan,
  selectedMissionId: string,
  activeStepOffset: number,
): CurriculumStep[] {
  if (selectedMissionId !== generatedMissionId) {
    return ['개념 확인', '현재 미션', '테스트 실행', 'AI 코드 리뷰'].map((title, index) => ({
      title,
      detail: '선택한 오늘 학습 항목을 완료하기 위한 기본 단계입니다.',
      state: createStepState(index, activeStepOffset),
    }))
  }

  return plan.steps.map((step, index) => ({
    title: step.title,
    detail: step.detail,
    state: createStepState(index, activeStepOffset),
  }))
}

export function resolveWorkspaceMission(
  selectedMissionId: string,
  generatedPlan: GeneratedCurriculumPlan,
): WorkspaceMission {
  if (selectedMissionId === generatedMissionId) {
    return {
      id: generatedMissionId,
      title: generatedPlan.todayMission.title,
      detail: generatedPlan.todayMission.detail,
      durationMinutes: generatedPlan.todayMission.durationMinutes,
      fileName: generatedPlan.todayMission.fileName,
      mode: resolveWorkspaceMode({
        explicitMode: generatedPlan.todayMission.mode,
        fileName: generatedPlan.todayMission.fileName,
        trackTitle: generatedPlan.focusRole || generatedPlan.title,
        goal: generatedPlan.goal,
      }),
      trackTitle: generatedPlan.focusRole || generatedPlan.title,
      stepLabel: 'AI 추천 미션',
      sourceLabel: '생성 커리큘럼 기반',
      guideTitle: generatedPlan.steps[0]?.title ?? generatedPlan.title,
      guideDetail: generatedPlan.steps[0]?.detail ?? generatedPlan.summary,
      practiceDetail: generatedPlan.todayMission.detail,
      hint:
        generatedPlan.steps[0]?.outcome ??
        '오늘 미션을 실행한 뒤 결과와 헷갈린 지점을 짧게 기록해보세요.',
      criteria: [
        '오늘 단계의 핵심을 한 문장으로 설명하기',
        '예제 명령 또는 코드를 직접 실행하기',
        '막힌 지점과 다음 질문을 기록하기',
      ],
      sources: generatedPlan.sources.map((source) => `${source.title} · ${source.urlLabel}`),
      codeLines: pickCodeLines(generatedPlan.todayMission.fileName),
    }
  }

  const queueItem = todayQueue.find((item) => item.id === selectedMissionId) ?? todayQueue[0]

  return createQueueMission(queueItem)
}

export function resolveWorkspaceMode(input: {
  explicitMode?: WorkspaceMode
  fileName: string
  trackTitle?: string
  goal?: string
}): WorkspaceMode {
  if (input.explicitMode) {
    return input.explicitMode
  }

  const fileName = input.fileName.toLowerCase()
  const context = `${input.trackTitle ?? ''} ${input.goal ?? ''}`.toLowerCase()

  if (
    fileName === 'dockerfile' ||
    fileName.endsWith('.dockerfile') ||
    context.includes('docker') ||
    context.includes('도커')
  ) {
    return 'docker'
  }

  if (
    fileName.endsWith('.sh') ||
    context.includes('linux') ||
    context.includes('리눅스') ||
    context.includes('devops')
  ) {
    return 'linux'
  }

  if (
    fileName.endsWith('.py') ||
    context.includes('python') ||
    context.includes('파이썬') ||
    context.includes('fastapi')
  ) {
    return 'python'
  }

  return 'react'
}

export function createWorkspaceModeLabel(mode: WorkspaceMode) {
  if (mode === 'linux') return 'Linux 터미널'
  if (mode === 'docker') return 'Docker 빌드'
  if (mode === 'python') return 'Python 출력'
  return 'React 미리보기'
}

export function createWorkspaceModeDescription(mode: WorkspaceMode) {
  if (mode === 'linux') return '터미널에서 셸 명령 실행 결과를 확인합니다.'
  if (mode === 'docker') return '빌드 로그에서 Dockerfile 실행 단계를 확인합니다.'
  if (mode === 'python') return '출력 패널에서 Python 실행 결과를 확인합니다.'
  return '미리보기 화면에서 작성한 React 결과를 확인합니다.'
}

export function createRunStateLabel(state: RunState) {
  if (state === 'compiling') return '컴파일 중'
  if (state === 'rendering') return '렌더링 중'
  if (state === 'running') return '실행 중'
  if (state === 'passed') return '통과'
  if (state === 'failed') return '실패'
  if (state === 'timeout') return '시간 초과'
  return '실행 전'
}

function createQueueMission(item: TodayQueueItem): WorkspaceMission {
  return {
    id: item.id,
    title: item.title,
    detail: item.detail,
    durationMinutes: item.durationMinutes,
    fileName: item.id === 'run-tests' ? 'Counter.test.jsx' : 'Counter.jsx',
    mode: 'react',
    trackTitle: 'React 입문',
    stepLabel: '오늘 학습 항목',
    sourceLabel: item.status === 'optional' ? 'AI 리뷰 기반' : '공식 문서 기반',
    guideTitle: item.title,
    guideDetail: item.detail,
    practiceDetail: '선택한 항목을 완료할 수 있도록 코드와 실행 결과를 함께 확인하세요.',
    hint: '정답을 바로 보기 전에 현재 코드에서 상태가 바뀌는 지점을 먼저 찾아보세요.',
    criteria: [
      '미션 내용을 한 문장으로 요약',
      '코드 또는 문서에서 근거 확인',
      '완료 여부를 실행 결과로 확인',
    ],
    sources: ['React Docs: State: A Component Memory', 'React Docs: Responding to Events'],
    codeLines: reactCodeLines,
  }
}

export function getEditorLanguage(fileName: string) {
  const ext = fileName.toLowerCase()
  if (ext.endsWith('.py')) return 'python'
  if (ext.endsWith('.jsx') || ext.endsWith('.tsx')) return 'javascript'
  if (ext.endsWith('.css')) return 'css'
  if (ext.endsWith('.md')) return 'markdown'
  if (ext.endsWith('.sh')) return 'shell'
  if (ext.includes('dockerfile')) return 'dockerfile'
  return 'javascript'
}

export function getExecutionLanguage(fileName: string, mode: WorkspaceMode) {
  if (mode === 'react')
    return fileName.toLowerCase().endsWith('.tsx') || fileName.toLowerCase().endsWith('.ts')
      ? 'tsx'
      : 'jsx'
  if (mode === 'linux') return 'shell'
  if (mode === 'docker') return 'dockerfile'
  if (mode === 'python') return 'python'
  return 'javascript'
}

export function pickCodeLines(fileName: string) {
  const normalizedFileName = fileName.toLowerCase()

  if (normalizedFileName.endsWith('.sh')) {
    return shellCodeLines
  }

  if (normalizedFileName.endsWith('.py')) {
    return apiCodeLines
  }

  if (normalizedFileName.includes('dockerfile') || normalizedFileName.endsWith('.dockerfile')) {
    return dockerCodeLines
  }

  return reactCodeLines
}

const defaultReactStyles = [
  '.preview-root {',
  '  display: grid;',
  '  gap: 16px;',
  '}',
  '',
  'button {',
  '  font: inherit;',
  '}',
].join('\n')

export function createWorkspaceEditorFiles(mission: WorkspaceMission): WorkspaceEditorFile[] {
  const fileName = mission.fileName
  const appCode = mission.codeLines.join('\n')
  const files: WorkspaceEditorFile[] = [
    {
      path: `file:///${mission.id}/${fileName}`,
      name: fileName,
      language: getEditorLanguage(fileName),
      value: appCode,
    },
  ]

  if (mission.mode === 'react') {
    files.push({
      path: `file:///${mission.id}/styles.css`,
      name: 'styles.css',
      language: 'css',
      value: mission.cssCode ?? defaultReactStyles,
    })
  }

  if (mission.mode === 'docker') {
    files.push({
      path: `file:///${mission.id}/.dockerignore`,
      name: '.dockerignore',
      language: 'plaintext',
      value: ['node_modules', 'dist', '.env'].join('\n'),
    })
  }

  files.push({
    path: `file:///${mission.id}/mission-notes.md`,
    name: 'mission-notes.md',
    language: 'markdown',
    value: `# ${mission.title}\n\n- ${createWorkspaceModeLabel(mission.mode)} 결과를 확인합니다.\n- 막힌 지점과 다음 질문을 기록합니다.`,
  })

  return files
}

export function createTestCases(mission: WorkspaceMission, runState: RunState): TestCase[] {
  return createWorkspaceTestCases({
    isGeneratedMission: mission.id === generatedMissionId,
    runState,
  })
}

export function getLogTime() {
  return new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date())
}

export function resolveActiveGeneratedStep(
  generatedPlan: GeneratedCurriculumPlan,
  activeStepOffset: number,
): GeneratedCurriculumStep | null {
  if (generatedPlan.steps.length === 0) {
    return null
  }

  return generatedPlan.steps[clampStepOffset(activeStepOffset, generatedPlan.steps.length)] ?? null
}

export function createActiveMissionPresentation(
  mission: WorkspaceMission,
  activeGeneratedStep: GeneratedCurriculumStep | null,
  exercises: Record<string, ModuleExercise> = frontendModuleExercises,
): WorkspaceMission {
  if (!activeGeneratedStep || mission.id !== generatedMissionId) {
    return mission
  }

  const presentedMission: WorkspaceMission = {
    ...mission,
    title: activeGeneratedStep.title,
    detail: activeGeneratedStep.detail,
    guideTitle: activeGeneratedStep.title,
    guideDetail: activeGeneratedStep.detail,
    practiceDetail: `${activeGeneratedStep.title}을 실습하면서 ${mission.fileName} 파일에서 확인할 내용을 정리하세요.`,
    hint: activeGeneratedStep.outcome || mission.hint,
  }

  const exercise = exercises[activeGeneratedStep.id]
  if (!exercise) {
    return presentedMission
  }

  return {
    ...presentedMission,
    fileName: exercise.fileName,
    codeLines: exercise.codeLines,
    cssCode: exercise.cssCode,
    practiceDetail: exercise.practiceDetail,
    hint: exercise.hint,
  }
}

export function getExecutionPanelModel(mode: WorkspaceMode, fileName: string): ExecutionPanelModel {
  if (mode === 'linux') {
    return {
      title: 'Terminal',
      ariaLabel: 'Linux 터미널 실행 결과',
      emptyTitle: '터미널 실행 대기 중',
      emptyDetail: '실행 버튼을 누르면 명령어 출력이 이 패널에 표시됩니다.',
      statusLabel: fileName,
    }
  }

  if (mode === 'docker') {
    return {
      title: 'Build Log',
      ariaLabel: 'Docker 빌드 로그',
      emptyTitle: '빌드 대기 중',
      emptyDetail: '실행 버튼을 누르면 Dockerfile 빌드 단계가 이 패널에 표시됩니다.',
      statusLabel: fileName,
    }
  }

  if (mode === 'python') {
    return {
      title: 'Output',
      ariaLabel: 'Python 실행 출력',
      emptyTitle: 'Python 실행 대기 중',
      emptyDetail: '실행 버튼을 누르면 Python 출력과 검증 로그가 이 패널에 표시됩니다.',
      statusLabel: fileName,
    }
  }

  return {
    title: 'Preview',
    ariaLabel: 'React 실행 화면',
    emptyTitle: '실행 대기 중',
    emptyDetail: '실행 버튼을 누르면 오른쪽 패널에 결과 화면이 표시됩니다.',
    statusLabel: fileName,
  }
}

export function createInitialRunPreviewState(): CodeRunPreviewState {
  return { status: 'idle', logs: [] }
}
