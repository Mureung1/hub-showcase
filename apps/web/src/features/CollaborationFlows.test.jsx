import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test } from 'vitest'

import { testTeamFlowRepository } from '../test/createTestTeamFlowRepository.js'
import { renderAuthenticatedApp } from '../test/renderTeamFlowApp.jsx'

describe('collaboration state boundaries', () => {
  test('does not expose a successful project creation as retryable when hydration fails', async () => {
    const user = userEvent.setup()
    const project = {
      id: 'created-with-stale-read', name: '재조회 실패 프로젝트', description: '', status: 'in_progress',
      startDate: '', endDate: '', memberIds: ['created-member'], creatorId: 'created-member',
    }
    let createCount = 0
    let loadCount = 0
    const repository = {
      ...testTeamFlowRepository,
      refreshOnEntry: false,
      load: async () => {
        loadCount += 1
        if (loadCount > 1) throw new Error('일시적인 재조회 실패')
        return {
          projects: [], members: [], tasks: [], notes: [], resources: [], invitations: [],
          currentMemberIdsByProject: {}, aiSettings: {}, aiHistory: [], currentUserId: '', aiMemberId: '',
          accessMode: 'authenticated',
          capabilities: { projects: true, members: true, tasks: true, notes: true, resources: true, ai: false },
        }
      },
      createProject: async () => {
        createCount += 1
        return project
      },
    }

    renderAuthenticatedApp('/projects', repository)
    expect(await screen.findByText('아직 프로젝트가 없습니다.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /새 프로젝트/ }))
    await user.type(screen.getByLabelText(/프로젝트 이름/), project.name)
    await user.click(screen.getByRole('button', { name: '프로젝트 만들기' }))

    expect(await screen.findByRole('heading', { name: project.name })).toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: '새 프로젝트' })).not.toBeInTheDocument()
    expect(createCount).toBe(1)
  })

  test('removes an accepted invitation even when the follow-up hydration fails', async () => {
    const user = userEvent.setup()
    const invitation = {
      id: 'received-invitation', projectId: 'shared-project', projectName: '공유 프로젝트',
      inviteeEmail: 'tester@example.com', inviterName: '초대한 사용자', status: 'pending', direction: 'received',
    }
    let loadCount = 0
    let acceptCount = 0
    const repository = {
      ...testTeamFlowRepository,
      refreshOnEntry: false,
      load: async () => {
        loadCount += 1
        if (loadCount > 1) throw new Error('일시적인 재조회 실패')
        return {
          projects: [], members: [], tasks: [], notes: [], resources: [], invitations: [invitation],
          currentMemberIdsByProject: {}, aiSettings: {}, aiHistory: [], currentUserId: '', aiMemberId: '',
          accessMode: 'authenticated',
          capabilities: { projects: true, members: true, tasks: true, notes: true, resources: true, ai: false },
        }
      },
      acceptInvitation: async () => {
        acceptCount += 1
        return { projectId: invitation.projectId, memberId: 'accepted-member' }
      },
    }

    renderAuthenticatedApp('/projects', repository)
    expect(await screen.findByRole('heading', { name: '받은 프로젝트 초대' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '수락' }))

    expect(screen.queryByRole('heading', { name: '받은 프로젝트 초대' })).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(acceptCount).toBe(1)
  })

  test('hydrates the creator member immediately after project creation', async () => {
    const user = userEvent.setup()
    const project = {
      id: 'created-project', name: '생성 직후 검증', description: '', status: 'in_progress',
      startDate: '', endDate: '', memberIds: ['created-member'], creatorId: 'created-member',
    }
    const member = {
      id: 'created-member', projectId: project.id, authUserId: 'auth-user-1', email: 'user@example.com',
      kind: 'user', name: '테스트 사용자', initial: '테', role: '프로젝트 생성자',
      description: '', color: '#3a6898', isAi: false,
    }
    let created = false
    const state = (withProject) => ({
      projects: withProject ? [project] : [], members: withProject ? [member] : [], tasks: [], notes: [], resources: [], invitations: [],
      currentMemberIdsByProject: withProject ? { [project.id]: member.id } : {},
      aiSettings: {}, aiHistory: [], currentUserId: withProject ? member.id : '', aiMemberId: '', accessMode: 'authenticated',
      capabilities: { projects: true, members: true, tasks: true, notes: true, resources: true, ai: false },
    })
    const repository = {
      ...testTeamFlowRepository,
      refreshOnEntry: false,
      load: async () => state(created),
      createProject: async () => {
        created = true
        return project
      },
    }

    renderAuthenticatedApp('/projects', repository)
    expect(await screen.findByText('아직 프로젝트가 없습니다.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /새 프로젝트/ }))
    await user.type(screen.getByLabelText(/프로젝트 이름/), project.name)
    await user.click(screen.getByRole('button', { name: '프로젝트 만들기' }))

    await user.click((await screen.findByRole('heading', { name: project.name })).closest('button'))
    await user.click(await screen.findByRole('button', { name: /새 할 일/ }))
    expect(screen.getByRole('option', { name: member.name })).toBeInTheDocument()
  })

  test('derives my tasks from the current member id of each project', async () => {
    const payload = await testTeamFlowRepository.load()
    const secondProjectMember = {
      id: 'member-project-2-self',
      projectId: '2',
      authUserId: 'auth-user-1',
      email: 'user@example.com',
      kind: 'user',
      name: '이주환',
      initial: '이',
      role: '협업자',
      description: '',
      color: '#3a6898',
      isAi: false,
    }
    const repository = {
      ...testTeamFlowRepository,
      refreshOnEntry: false,
      load: async () => ({
        ...payload,
        members: [...payload.members, secondProjectMember],
        projects: payload.projects.map((project) => project.id === '2'
          ? { ...project, memberIds: [...project.memberIds, secondProjectMember.id] }
          : project),
        tasks: [...payload.tasks, {
          id: 'project-2-personal-task',
          projectId: '2',
          title: '프로젝트별 내 담당자 확인',
          assigneeId: secondProjectMember.id,
          dueDate: '2026-08-01',
          status: 'not_started',
          description: '',
        }],
        currentMemberIdsByProject: {
          ...payload.currentMemberIdsByProject,
          '2': secondProjectMember.id,
        },
      }),
    }

    renderAuthenticatedApp('/tasks', repository)

    expect(await screen.findByText('프로젝트별 내 담당자 확인')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '교내 창업 공모전 기획안' })).toBeInTheDocument()
  })

  test('rehydrates and leaves an inaccessible project after the current collaborator exits', async () => {
    const user = userEvent.setup()
    const currentMember = {
      id: 'solo-current-member', projectId: 'solo-project', authUserId: 'auth-user-1',
      email: 'user@example.com', kind: 'user', name: '테스트 사용자', initial: '테',
      role: '협업자', description: '', color: '#3a6898', isAi: false,
    }
    const otherMember = {
      id: 'solo-other-member', projectId: 'solo-project', authUserId: 'auth-user-2',
      email: 'other@example.com', kind: 'user', name: '다른 협업자', initial: '다',
      role: '협업자', description: '', color: '#8a4e68', isAi: false,
    }
    const project = {
      id: 'solo-project', name: '나가기 검증 프로젝트', description: '', status: 'in_progress',
      startDate: '2026-07-01', endDate: '2026-07-31',
      memberIds: [currentMember.id, otherMember.id], creatorId: currentMember.id,
    }
    let loadCount = 0
    const repository = {
      ...testTeamFlowRepository,
      refreshOnEntry: false,
      load: async () => {
        loadCount += 1
        if (loadCount > 1) {
          return {
            projects: [], members: [], tasks: [], notes: [], resources: [], invitations: [],
            currentMemberIdsByProject: {}, aiSettings: {}, aiHistory: [], currentUserId: '', aiMemberId: '',
            accessMode: 'authenticated',
            capabilities: { projects: true, members: true, tasks: true, notes: true, resources: true, ai: false },
          }
        }
        return {
          projects: [project], members: [currentMember, otherMember], tasks: [], notes: [], resources: [], invitations: [],
          currentMemberIdsByProject: { [project.id]: currentMember.id },
          aiSettings: {}, aiHistory: [], currentUserId: currentMember.id, aiMemberId: '', accessMode: 'authenticated',
          capabilities: { projects: true, members: true, tasks: true, notes: true, resources: true, ai: false },
        }
      },
      deleteMember: async () => ({
        memberId: currentMember.id,
        projectId: project.id,
        wasCollaborator: true,
      }),
    }

    renderAuthenticatedApp('/projects/solo-project/members', repository)
    expect(await screen.findByRole('heading', { name: '팀원 관리' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '프로젝트 나가기' }))
    const dialog = screen.getByRole('dialog', { name: '프로젝트 나가기' })
    await user.click(within(dialog).getByRole('button', { name: '프로젝트 나가기' }))

    expect(await screen.findByRole('heading', { name: '내 프로젝트' })).toBeInTheDocument()
    expect(screen.queryByText('나가기 검증 프로젝트')).not.toBeInTheDocument()
  })

  test('removes the project locally when leaving succeeds but hydration fails', async () => {
    const user = userEvent.setup()
    const currentMember = {
      id: 'leaving-current-member', projectId: 'leaving-project', authUserId: 'auth-user-1',
      email: 'user@example.com', kind: 'user', name: '테스트 사용자', initial: '테',
      role: '협업자', description: '', color: '#3a6898', isAi: false,
    }
    const otherMember = {
      id: 'leaving-other-member', projectId: 'leaving-project', authUserId: 'auth-user-2',
      email: 'other@example.com', kind: 'user', name: '다른 협업자', initial: '다',
      role: '협업자', description: '', color: '#8a4e68', isAi: false,
    }
    const project = {
      id: 'leaving-project', name: '재조회 실패 나가기', description: '', status: 'in_progress',
      startDate: '', endDate: '', memberIds: [currentMember.id, otherMember.id], creatorId: currentMember.id,
    }
    let loadCount = 0
    const repository = {
      ...testTeamFlowRepository,
      refreshOnEntry: false,
      load: async () => {
        loadCount += 1
        if (loadCount > 1) throw new Error('일시적인 재조회 실패')
        return {
          projects: [project], members: [currentMember, otherMember], tasks: [], notes: [], resources: [], invitations: [],
          currentMemberIdsByProject: { [project.id]: currentMember.id }, aiSettings: {}, aiHistory: [],
          currentUserId: currentMember.id, aiMemberId: '', accessMode: 'authenticated',
          capabilities: { projects: true, members: true, tasks: true, notes: true, resources: true, ai: false },
        }
      },
      deleteMember: async () => ({ memberId: currentMember.id, projectId: project.id, wasCollaborator: true }),
    }

    renderAuthenticatedApp('/projects/leaving-project/members', repository)
    expect(await screen.findByRole('heading', { name: '팀원 관리' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '프로젝트 나가기' }))
    const dialog = screen.getByRole('dialog', { name: '프로젝트 나가기' })
    await user.click(within(dialog).getByRole('button', { name: '프로젝트 나가기' }))

    expect(await screen.findByRole('heading', { name: '내 프로젝트' })).toBeInTheDocument()
    expect(screen.queryByText(project.name)).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
