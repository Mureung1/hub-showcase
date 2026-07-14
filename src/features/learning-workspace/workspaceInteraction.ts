export const generatedMissionId = 'generated-first-mission'

export type StepState = 'done' | 'current' | 'waiting'
export type TestState = 'passed' | 'failed' | 'pending'
export type RunState = 'idle' | 'running' | 'failed' | 'passed'

export type TestCase = {
  id: string
  input: string
  expected: string
  actual: string
  state: TestState
  runtime: string
}

export function createStepState(index: number, activeStepOffset: number): StepState {
  if (index < activeStepOffset) {
    return 'done'
  }

  if (index === activeStepOffset) {
    return 'current'
  }

  return 'waiting'
}

export function getInitialStepOffset(missionId: string) {
  return missionId === generatedMissionId ? 0 : 1
}

export function getNextRunState(runAttemptCount: number): Exclude<RunState, 'idle' | 'running'> {
  return runAttemptCount === 0 ? 'failed' : 'passed'
}

export function createWorkspaceTestCases({
  isGeneratedMission,
  runState,
}: {
  isGeneratedMission: boolean
  runState: RunState
}): TestCase[] {
  if (runState === 'running') {
    return createRunningTestCases(isGeneratedMission)
  }

  if (runState === 'passed') {
    return createPassedTestCases(isGeneratedMission)
  }

  if (isGeneratedMission) {
    return [
      { id: 'TC 01', input: 'pwd', expected: '현재 경로 출력', actual: '현재 경로 출력', state: 'passed', runtime: '8ms' },
      { id: 'TC 02', input: 'ls -la', expected: '파일 목록 출력', actual: '파일 목록 출력', state: 'passed', runtime: '11ms' },
      {
        id: 'TC 03',
        input: 'ps aux',
        expected: '프로세스 확인',
        actual: runState === 'failed' ? '권한 확인 필요' : '실행 대기',
        state: runState === 'failed' ? 'failed' : 'pending',
        runtime: runState === 'failed' ? '15ms' : '-',
      },
    ]
  }

  return [
    { id: 'TC 01', input: 'initial = 0', expected: '0 표시', actual: '0 표시', state: 'passed', runtime: '12ms' },
    { id: 'TC 02', input: 'click once', expected: '1 표시', actual: '1 표시', state: 'passed', runtime: '14ms' },
    { id: 'TC 03', input: 'click many', expected: '누적 증가', actual: '확인 필요', state: 'failed', runtime: '16ms' },
    { id: 'TC 04', input: 'negative case', expected: '오류 없음', actual: '대기', state: 'pending', runtime: '-' },
  ]
}

function createRunningTestCases(isGeneratedMission: boolean): TestCase[] {
  if (isGeneratedMission) {
    return [
      { id: 'TC 01', input: 'pwd', expected: '현재 경로 출력', actual: '실행 중', state: 'pending', runtime: '-' },
      { id: 'TC 02', input: 'ls -la', expected: '파일 목록 출력', actual: '실행 중', state: 'pending', runtime: '-' },
      { id: 'TC 03', input: 'ps aux', expected: '프로세스 확인', actual: '실행 중', state: 'pending', runtime: '-' },
    ]
  }

  return [
    { id: 'TC 01', input: 'initial = 0', expected: '0 표시', actual: '실행 중', state: 'pending', runtime: '-' },
    { id: 'TC 02', input: 'click once', expected: '1 표시', actual: '실행 중', state: 'pending', runtime: '-' },
    { id: 'TC 03', input: 'click many', expected: '누적 증가', actual: '실행 중', state: 'pending', runtime: '-' },
    { id: 'TC 04', input: 'negative case', expected: '오류 없음', actual: '실행 중', state: 'pending', runtime: '-' },
  ]
}

function createPassedTestCases(isGeneratedMission: boolean): TestCase[] {
  if (isGeneratedMission) {
    return [
      { id: 'TC 01', input: 'pwd', expected: '현재 경로 출력', actual: '현재 경로 출력', state: 'passed', runtime: '7ms' },
      { id: 'TC 02', input: 'ls -la', expected: '파일 목록 출력', actual: '파일 목록 출력', state: 'passed', runtime: '10ms' },
      { id: 'TC 03', input: 'ps aux', expected: '프로세스 확인', actual: '프로세스 목록 출력', state: 'passed', runtime: '14ms' },
    ]
  }

  return [
    { id: 'TC 01', input: 'initial = 0', expected: '0 표시', actual: '0 표시', state: 'passed', runtime: '11ms' },
    { id: 'TC 02', input: 'click once', expected: '1 표시', actual: '1 표시', state: 'passed', runtime: '12ms' },
    { id: 'TC 03', input: 'click many', expected: '누적 증가', actual: '3까지 증가', state: 'passed', runtime: '13ms' },
    { id: 'TC 04', input: 'negative case', expected: '오류 없음', actual: '오류 없음', state: 'passed', runtime: '10ms' },
  ]
}

export function getResultMessage(
  runState: RunState,
  passedCount: number,
  failedCount: number,
  totalCount: number,
) {
  if (runState === 'running') {
    return '테스트를 실행하고 있습니다.'
  }

  if (runState === 'passed') {
    return `${passedCount} / ${totalCount} 테스트 통과. 다음 단계로 이동할 수 있습니다.`
  }

  if (runState === 'failed') {
    return `${failedCount}개 테스트를 다시 확인해야 합니다. 힌트를 보고 재실행하세요.`
  }

  return `${passedCount} / ${totalCount} 테스트 통과`
}