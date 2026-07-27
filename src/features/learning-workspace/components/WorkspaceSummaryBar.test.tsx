import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { WorkspaceSummaryBar } from './WorkspaceSummaryBar'
import type { CurriculumStep } from '../workspaceMission'

const curriculumSteps: CurriculumStep[] = [
  { title: '리눅스와 셸 기초', detail: '파일시스템 구조를 학습합니다.', state: 'current' },
  { title: '네트워크 기본기', detail: 'TCP/IP 기초를 학습합니다.', state: 'waiting' },
  { title: '버전 관리와 협업 기초', detail: 'Git 브랜치 전략을 학습합니다.', state: 'waiting' },
]

const baseProps = {
  missionTitle: '리눅스와 셸 기초',
  missionTrackTitle: 'DevOps 엔지니어',
  missionFileName: 'ops-checklist.sh',
  progressPercent: 33,
  curriculumSteps,
  currentStepIndex: 1,
  hasSavedGeneratedPlan: false,
  planTitle: 'DevOps 엔지니어 커리큘럼',
  planSummary: '리눅스 서버 환경과 기본적인 자동화 스크립트를 다룰 수 있다.',
  planSummaryItems: [
    { label: '학습 목표', value: 'DevOps 엔지니어가 되고 싶어' },
    { label: '추천 트랙', value: 'DevOps 엔지니어' },
    { label: '예상 기간', value: '16주 로드맵' },
  ],
  guideTitle: '리눅스와 셸 기초',
  guideDetail: '파일시스템 구조, 권한 관리, 프로세스 관리를 순서대로 학습합니다.',
  practiceDetail: 'ops-checklist.sh에서 확인할 내용을 정리하세요.',
  criteria: ['오늘 단계의 핵심을 한 문장으로 설명하기', '예제 명령 또는 코드를 직접 실행하기'],
}

describe('WorkspaceSummaryBar', () => {
  it('renders mission title, progress, stepper, and concept/practice content', () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <WorkspaceSummaryBar {...baseProps} />
      </MemoryRouter>,
    )

    expect(markup).toContain('리눅스와 셸 기초')
    expect(markup).toContain('DevOps 엔지니어')
    expect(markup).toContain('ops-checklist.sh')
    expect(markup).toContain('33%')
    expect(markup).toContain('네트워크 기본기')
    expect(markup).toContain('버전 관리와 협업 기초')
    expect(markup).toContain('파일시스템 구조, 권한 관리, 프로세스 관리를 순서대로 학습합니다.')
    expect(markup).toContain('ops-checklist.sh에서 확인할 내용을 정리하세요.')
    expect(markup).toContain('오늘 단계의 핵심을 한 문장으로 설명하기')
  })

  it('keeps the plan overview collapsed by default (content not in static markup)', () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <WorkspaceSummaryBar {...baseProps} />
      </MemoryRouter>,
    )

    expect(markup).toContain('계획 정보')
    expect(markup).not.toContain('16주 로드맵')
  })

  it('shows a saved-plan badge label when hasSavedGeneratedPlan is true', () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <WorkspaceSummaryBar {...baseProps} hasSavedGeneratedPlan />
      </MemoryRouter>,
    )

    expect(markup).toContain('저장됨')
  })
})
