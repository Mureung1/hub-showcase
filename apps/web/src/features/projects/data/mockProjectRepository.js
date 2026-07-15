import { PROJECT_STATUS } from '@teamflow/shared'

const MEMBERS = Object.freeze({
  owner: { id: 'member-1', name: '이주환', initial: '이', color: '#4c6da1' },
  planner: { id: 'member-2', name: '김민지', initial: '김', color: '#8a4e68' },
  researcher: { id: 'member-3', name: '박서준', initial: '박', color: '#2e7878' },
  designer: { id: 'member-4', name: '최지우', initial: '최', color: '#4a7b58' },
  backend: { id: 'member-5', name: '정태호', initial: '정', color: '#516b91' },
  ai: { id: 'member-ai', name: '자료조사 AI', initial: 'AI', color: '#6b4ca8', isAi: true },
})

/** @type {import('@teamflow/shared/project').ProjectSummary[]} */
const PROJECTS = Object.freeze([
  {
    id: 'teamflow',
    name: '팀플 관리 웹서비스 (TeamFlow)',
    description: '부트캠프 4주 개인 프로젝트 · 팀플 정보를 한 공간에서 관리',
    status: PROJECT_STATUS.IN_PROGRESS,
    progress: 40,
    members: [MEMBERS.owner, MEMBERS.planner, MEMBERS.designer, MEMBERS.backend, MEMBERS.ai],
    startDate: '2026-07-01',
    endDate: '2026-07-31',
  },
  {
    id: 'startup-contest',
    name: '교내 창업 공모전 기획안',
    description: '플랫폼 비즈니스 아이디어 스케치와 팀원 역할 배분',
    status: PROJECT_STATUS.IN_PROGRESS,
    progress: 29,
    members: [MEMBERS.owner, MEMBERS.planner, MEMBERS.researcher, MEMBERS.ai],
    startDate: '2026-07-15',
    endDate: '2026-08-15',
  },
  {
    id: 'capstone',
    name: '캡스톤 디자인 (졸업작품)',
    description: 'AI 기반 개인화 일정 추천 시스템 개발',
    status: PROJECT_STATUS.IN_PROGRESS,
    progress: 43,
    members: [MEMBERS.owner, MEMBERS.designer, MEMBERS.backend],
    startDate: '2026-03-02',
    endDate: '2026-11-30',
  },
  {
    id: 'open-source-2024',
    name: '오픈소스 컨트리뷰톤 2024',
    description: '프론트엔드 오픈소스 이슈 해결 및 PR 제출',
    status: PROJECT_STATUS.NOT_STARTED,
    progress: 0,
    members: [MEMBERS.owner],
    startDate: '2026-08-01',
    endDate: '2026-08-31',
  },
])

function cloneProject(project) {
  return {
    ...project,
    members: project.members.map((member) => ({ ...member })),
  }
}

/**
 * Mock implementation of the future project summary API repository.
 */
export const projectRepository = Object.freeze({
  /**
   * @param {{ query?: string, signal?: AbortSignal }} [options]
   * @returns {Promise<import('@teamflow/shared/project').ProjectSummary[]>}
   */
  async list(options = {}) {
    const { query = '', signal } = options
    await Promise.resolve()

    if (signal?.aborted) {
      throw new DOMException('Project request was cancelled.', 'AbortError')
    }

    const normalizedQuery = query.trim().toLocaleLowerCase('ko-KR')
    const filteredProjects = normalizedQuery
      ? PROJECTS.filter((project) => {
          const searchableText = `${project.name} ${project.description}`.toLocaleLowerCase('ko-KR')
          return searchableText.includes(normalizedQuery)
        })
      : PROJECTS

    return filteredProjects.map(cloneProject)
  },
})
