export const generatedMissionId = 'generated-first-mission'

export type StepState = 'done' | 'current' | 'waiting'
export type TestState = 'passed' | 'failed' | 'pending'
export type RunState =
  'idle' | 'running' | 'compiling' | 'rendering' | 'failed' | 'passed' | 'timeout'

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

export function clampStepOffset(activeStepOffset: number, totalSteps: number) {
  if (totalSteps <= 0) {
    return 0
  }

  return Math.min(Math.max(activeStepOffset, 0), totalSteps - 1)
}

export function isFinalStep(activeStepOffset: number, totalSteps: number) {
  return totalSteps > 0 && clampStepOffset(activeStepOffset, totalSteps) === totalSteps - 1
}

export function getNextRunState(runAttemptCount: number): 'failed' | 'passed' {
  return runAttemptCount === 0 ? 'failed' : 'passed'
}

export function toLearningRunState(runState: RunState): 'idle' | 'failed' | 'passed' {
  if (runState === 'passed') return 'passed'
  if (runState === 'failed' || runState === 'timeout') return 'failed'
  return 'idle'
}

export function createWorkspaceTestCases({
  isGeneratedMission,
  runState,
}: {
  isGeneratedMission: boolean
  runState: RunState
}): TestCase[] {
  if (runState === 'running' || runState === 'compiling' || runState === 'rendering') {
    return createRunningTestCases(isGeneratedMission)
  }

  if (runState === 'passed') {
    return createPassedTestCases(isGeneratedMission)
  }

  if (isGeneratedMission) {
    return [
      {
        id: 'TC 01',
        input: '학습 목표 요약',
        expected: '오늘 단계의 핵심을 한 문장으로 설명',
        actual: '오늘 단계의 핵심을 한 문장으로 설명',
        state: 'passed',
        runtime: '8ms',
      },
      {
        id: 'TC 02',
        input: '예제 실행',
        expected: '파일의 핵심 흐름 확인',
        actual: '파일의 핵심 흐름 확인',
        state: 'passed',
        runtime: '11ms',
      },
      {
        id: 'TC 03',
        input: '근거 정리',
        expected: '공식 문서 기준으로 다음 질문 기록',
        actual: runState === 'failed' ? '근거 문서 확인 필요' : '실행 대기',
        state: runState === 'failed' ? 'failed' : 'pending',
        runtime: runState === 'failed' ? '15ms' : '-',
      },
    ]
  }

  return [
    {
      id: 'TC 01',
      input: 'initial = 0',
      expected: '0 표시',
      actual: '0 표시',
      state: 'passed',
      runtime: '12ms',
    },
    {
      id: 'TC 02',
      input: 'click once',
      expected: '1 표시',
      actual: '1 표시',
      state: 'passed',
      runtime: '14ms',
    },
    {
      id: 'TC 03',
      input: 'click many',
      expected: '계속 증가',
      actual: '확인 필요',
      state: 'failed',
      runtime: '16ms',
    },
    {
      id: 'TC 04',
      input: 'negative case',
      expected: '오류 없음',
      actual: '대기',
      state: 'pending',
      runtime: '-',
    },
  ]
}

function createRunningTestCases(isGeneratedMission: boolean): TestCase[] {
  if (isGeneratedMission) {
    return [
      {
        id: 'TC 01',
        input: '학습 목표 요약',
        expected: '오늘 단계의 핵심을 한 문장으로 설명',
        actual: '실행 중',
        state: 'pending',
        runtime: '-',
      },
      {
        id: 'TC 02',
        input: '예제 실행',
        expected: '파일의 핵심 흐름 확인',
        actual: '실행 중',
        state: 'pending',
        runtime: '-',
      },
      {
        id: 'TC 03',
        input: '근거 정리',
        expected: '공식 문서 기준으로 다음 질문 기록',
        actual: '실행 중',
        state: 'pending',
        runtime: '-',
      },
    ]
  }

  return [
    {
      id: 'TC 01',
      input: 'initial = 0',
      expected: '0 표시',
      actual: '실행 중',
      state: 'pending',
      runtime: '-',
    },
    {
      id: 'TC 02',
      input: 'click once',
      expected: '1 표시',
      actual: '실행 중',
      state: 'pending',
      runtime: '-',
    },
    {
      id: 'TC 03',
      input: 'click many',
      expected: '계속 증가',
      actual: '실행 중',
      state: 'pending',
      runtime: '-',
    },
    {
      id: 'TC 04',
      input: 'negative case',
      expected: '오류 없음',
      actual: '실행 중',
      state: 'pending',
      runtime: '-',
    },
  ]
}

function createPassedTestCases(isGeneratedMission: boolean): TestCase[] {
  if (isGeneratedMission) {
    return [
      {
        id: 'TC 01',
        input: '학습 목표 요약',
        expected: '오늘 단계의 핵심을 한 문장으로 설명',
        actual: '오늘 단계의 핵심을 한 문장으로 설명',
        state: 'passed',
        runtime: '7ms',
      },
      {
        id: 'TC 02',
        input: '예제 실행',
        expected: '파일의 핵심 흐름 확인',
        actual: '파일의 핵심 흐름 확인',
        state: 'passed',
        runtime: '10ms',
      },
      {
        id: 'TC 03',
        input: '근거 정리',
        expected: '공식 문서 기준으로 다음 질문 기록',
        actual: '다음 질문 1개 기록',
        state: 'passed',
        runtime: '14ms',
      },
    ]
  }

  return [
    {
      id: 'TC 01',
      input: 'initial = 0',
      expected: '0 표시',
      actual: '0 표시',
      state: 'passed',
      runtime: '11ms',
    },
    {
      id: 'TC 02',
      input: 'click once',
      expected: '1 표시',
      actual: '1 표시',
      state: 'passed',
      runtime: '12ms',
    },
    {
      id: 'TC 03',
      input: 'click many',
      expected: '계속 증가',
      actual: '3까지 증가',
      state: 'passed',
      runtime: '13ms',
    },
    {
      id: 'TC 04',
      input: 'negative case',
      expected: '오류 없음',
      actual: '오류 없음',
      state: 'passed',
      runtime: '10ms',
    },
  ]
}

export function getResultMessage(
  runState: RunState,
  passedCount: number,
  failedCount: number,
  totalCount: number,
) {
  if (runState === 'compiling') {
    return '코드를 컴파일하고 있습니다.'
  }

  if (runState === 'rendering') {
    return '실행 화면을 렌더링하고 있습니다.'
  }

  if (runState === 'running') {
    return '테스트를 실행하고 있습니다.'
  }

  if (runState === 'passed') {
    return `${passedCount} / ${totalCount} 테스트 통과. 다음 단계로 이동할 수 있습니다.`
  }

  if (runState === 'failed') {
    return `${failedCount}개 테스트를 다시 확인해야 합니다. 힌트를 보고 다시 실행해보세요.`
  }

  if (runState === 'timeout') {
    return '실행 화면 응답 시간이 초과되었습니다. 코드를 확인하고 다시 실행해보세요.'
  }

  return `${passedCount} / ${totalCount} 테스트 통과`
}
