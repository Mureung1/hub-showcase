import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react'

import { TeamFlowContext } from './TeamFlowContext.js'

function reducer(state, action) {
  switch (action.type) {
    case 'hydrate': {
      const aiCredential = normalizeAiCredential(action.payload.aiCredential)
      return {
        ...emptyState,
        ...action.payload,
        aiAgents: action.payload.aiAgents ?? [],
        aiRuns: action.payload.aiRuns ?? [],
        aiCredential,
        aiExecution: normalizeAiExecution(action.payload.aiExecution),
        ready: true,
        loadError: '',
      }
    }
    case 'loadFailed':
      return { ...state, ready: false, loadError: action.message }
    case 'projectCreated':
      return {
        ...state,
        projects: [...state.projects.filter((project) => project.id !== action.project.id), action.project],
        currentMemberIdsByProject: action.project.creatorId
          ? { ...state.currentMemberIdsByProject, [action.project.id]: action.project.creatorId }
          : state.currentMemberIdsByProject,
      }
    case 'projectUpdated':
      return {
        ...state,
        projects: state.projects.map((project) => project.id === action.projectId
          ? { ...project, ...action.patch }
          : project),
      }
    case 'projectDeleted':
      return {
        ...state,
        projects: state.projects.filter((project) => project.id !== action.projectId),
        members: state.members.filter((member) => member.projectId !== action.projectId),
        tasks: state.tasks.filter((task) => task.projectId !== action.projectId),
        notes: state.notes.filter((note) => note.projectId !== action.projectId),
        resources: state.resources.filter((resource) => resource.projectId !== action.projectId),
        invitations: state.invitations.filter((invitation) => invitation.projectId !== action.projectId),
        aiAgents: state.aiAgents.filter((agent) => agent.projectId !== action.projectId),
        aiRuns: state.aiRuns.filter((run) => run.projectId !== action.projectId),
      }
    case 'taskCreated':
      return { ...state, tasks: [action.task, ...state.tasks] }
    case 'taskUpdated':
      return {
        ...state,
        tasks: state.tasks.map((task) => task.id === action.taskId
          ? { ...task, ...action.patch }
          : task),
      }
    case 'taskDeleted':
      return { ...state, tasks: state.tasks.filter((task) => task.id !== action.taskId) }
    case 'taskSettled':
      return {
        ...state,
        tasks: state.tasks.map((task) => task.id === action.taskId ? { ...task, isNew: false } : task),
      }
    case 'memberUpdated':
      return {
        ...state,
        members: state.members.map((member) => member.id === action.memberId
          ? { ...member, ...action.patch }
          : member),
      }
    case 'memberDeleted':
      return {
        ...state,
        members: state.members.filter((member) => member.id !== action.memberId),
        projects: state.projects.map((project) => project.id === action.projectId
          ? { ...project, memberIds: project.memberIds.filter((memberId) => memberId !== action.memberId) }
          : project),
        notes: state.notes.map((note) => note.authorId === action.memberId ? { ...note, authorId: null } : note),
        resources: state.resources.map((resource) => resource.ownerId === action.memberId ? { ...resource, ownerId: null } : resource),
      }
    case 'noteCreated':
      return { ...state, notes: [action.note, ...state.notes] }
    case 'noteUpdated':
      return {
        ...state,
        notes: state.notes.map((note) => note.id === action.noteId ? { ...note, ...action.patch } : note),
      }
    case 'noteDeleted':
      return { ...state, notes: state.notes.filter((note) => note.id !== action.noteId) }
    case 'resourceCreated':
      return { ...state, resources: [action.resource, ...state.resources] }
    case 'resourceUpdated':
      return {
        ...state,
        resources: state.resources.map((resource) => resource.id === action.resourceId
          ? { ...resource, ...action.patch }
          : resource),
      }
    case 'resourceDeleted':
      return { ...state, resources: state.resources.filter((resource) => resource.id !== action.resourceId) }
    case 'invitationCreated':
      return { ...state, invitations: [action.invitation, ...state.invitations] }
    case 'invitationRemoved':
      return { ...state, invitations: state.invitations.filter((invitation) => invitation.id !== action.invitationId) }
    case 'aiAgentCreated':
      return {
        ...state,
        members: upsertById(state.members, action.member),
        projects: state.projects.map((project) => project.id === action.member.projectId
          ? { ...project, memberIds: [...new Set([...project.memberIds, action.member.id])] }
          : project),
        aiAgents: upsertByKey(state.aiAgents, action.aiAgent, 'memberId'),
      }
    case 'aiAgentUpdated':
      return {
        ...state,
        members: action.member ? upsertById(state.members, action.member) : state.members,
        aiAgents: upsertByKey(state.aiAgents, action.aiAgent, 'memberId'),
      }
    case 'aiRunUpserted':
      return {
        ...state,
        aiRuns: upsertById(state.aiRuns, action.aiRun),
      }
    case 'aiRunApplied':
      return {
        ...state,
        aiRuns: upsertById(state.aiRuns, action.aiRun),
        notes: action.note ? upsertById(state.notes, action.note) : state.notes,
      }
    case 'aiCredentialUpdated': {
      const aiCredential = normalizeAiCredential(action.credential)
      return {
        ...state,
        aiCredential,
      }
    }
    default:
      return state
  }
}

function upsertByKey(items, value, key) {
  return [...items.filter((item) => item[key] !== value[key]), value]
}

function upsertById(items, value) {
  return upsertByKey(items, value, 'id')
}

const emptyAiCredential = Object.freeze({
  provider: 'gemini',
  configured: false,
  keyHint: '',
  verifiedAt: null,
})

const emptyAiExecution = Object.freeze({
  mode: 'mock',
  provider: null,
  modelLabel: 'Mock',
  credentialRequired: false,
})

function normalizeAiCredential(value) {
  return {
    provider: value?.provider === 'gemini' ? 'gemini' : emptyAiCredential.provider,
    configured: Boolean(value?.configured),
    keyHint: typeof value?.keyHint === 'string' ? value.keyHint : '',
    verifiedAt: typeof value?.verifiedAt === 'string' ? value.verifiedAt : null,
  }
}

function normalizeAiExecution(value) {
  const mode = value?.mode === 'live' ? 'live' : 'mock'
  return {
    mode,
    provider: mode === 'live' && value?.provider === 'gemini' ? 'gemini' : null,
    modelLabel: typeof value?.modelLabel === 'string' && value.modelLabel.trim()
      ? value.modelLabel
      : mode === 'live' ? 'Gemini' : emptyAiExecution.modelLabel,
    credentialRequired: mode === 'live' ? Boolean(value?.credentialRequired) : false,
  }
}

const emptyState = {
  ready: false,
  loadError: '',
  projects: [],
  members: [],
  tasks: [],
  notes: [],
  resources: [],
  invitations: [],
  currentMemberIdsByProject: {},
  aiAgents: [],
  aiRuns: [],
  aiExecution: emptyAiExecution,
  aiCredential: emptyAiCredential,
  currentUserId: '',
  accessMode: 'authenticated',
  capabilities: { projects: false, members: false, tasks: false, notes: false, resources: false, ai: false },
}

/**
 * Provides one source of truth for either authenticated API data or the read-only demo.
 */
export function TeamFlowProvider({ children, repository }) {
  const [state, dispatch] = useReducer(reducer, emptyState)
  const timers = useRef(new Set())
  const beforeLeaveHandlers = useRef(new Set())

  const reload = useCallback(async () => {
    const payload = await repository.load()
    dispatch({ type: 'hydrate', payload })
    return payload
  }, [repository])

  const reloadOnEntry = useCallback(() => (
    repository.refreshOnEntry === false ? Promise.resolve(null) : reload()
  ), [repository, reload])

  useEffect(() => {
    let active = true
    const activeTimers = timers.current
    repository.load()
      .then((payload) => {
        if (active) dispatch({ type: 'hydrate', payload })
      })
      .catch((error) => {
        if (active) {
          dispatch({
            type: 'loadFailed',
            message: error instanceof Error ? error.message : 'TeamFlow를 불러오지 못했습니다.',
          })
        }
      })
    return () => {
      active = false
      activeTimers.forEach(clearTimeout)
      activeTimers.clear()
    }
  }, [repository])

  const createProject = useCallback(async (input) => {
    const project = await repository.createProject(input)
    dispatch({ type: 'projectCreated', project })
    // Project creation also creates the signed-in user's project member in the DB.
    // Rehydrate so task/member UIs work without requiring a refresh. A failed
    // follow-up read must not turn a successful POST into a retryable create.
    try {
      const payload = await reload()
      if (!payload.projects.some((candidate) => candidate.id === project.id)) {
        dispatch({ type: 'projectCreated', project })
      }
    } catch {
      // Keep the optimistic project. Screen-entry refreshes will retry hydration.
    }
    return project
  }, [repository, reload])

  const updateProject = useCallback(async (projectId, patch) => {
    const result = await repository.updateProject(projectId, patch)
    dispatch({ type: 'projectUpdated', ...result })
    return result
  }, [repository])

  const deleteProject = useCallback(async (projectId) => {
    const result = await repository.deleteProject(projectId)
    dispatch({ type: 'projectDeleted', projectId: result.projectId })
    return result.projectId
  }, [repository])

  const createTask = useCallback(async (projectId, input) => {
    const task = await repository.createTask(projectId, input)
    dispatch({ type: 'taskCreated', task })
    const timer = setTimeout(() => {
      dispatch({ type: 'taskSettled', taskId: task.id })
      timers.current.delete(timer)
    }, 2500)
    timers.current.add(timer)
    return task
  }, [repository])

  const updateTask = useCallback(async (taskId, patch) => {
    const result = await repository.updateTask(taskId, patch)
    dispatch({ type: 'taskUpdated', ...result })
    return result
  }, [repository])

  const deleteTask = useCallback(async (taskId) => {
    const result = await repository.deleteTask(taskId)
    dispatch({ type: 'taskDeleted', taskId: result.taskId })
    return result.taskId
  }, [repository])

  const updateMember = useCallback(async (memberId, patch) => {
    const result = await repository.updateMember(memberId, patch)
    dispatch({ type: 'memberUpdated', ...result })
    return result
  }, [repository])

  const deleteMember = useCallback(async (memberId) => {
    const result = await repository.deleteMember(memberId)
    const currentMemberId = result.projectId
      ? state.currentMemberIdsByProject?.[result.projectId]
      : null
    if (result.wasCollaborator && currentMemberId === result.memberId) {
      try {
        await reload()
      } catch {
        dispatch({ type: 'projectDeleted', projectId: result.projectId })
      }
      return { ...result, leftProject: true }
    }
    dispatch({ type: 'memberDeleted', ...result })
    return result
  }, [repository, reload, state.currentMemberIdsByProject])

  const registerBeforeLeave = useCallback((handler) => {
    beforeLeaveHandlers.current.add(handler)
    return () => beforeLeaveHandlers.current.delete(handler)
  }, [])

  const flushPending = useCallback(async () => {
    for (const handler of beforeLeaveHandlers.current) {
      if (!(await handler())) return false
    }
    return true
  }, [])

  const createInvitation = useCallback(async (projectId, input) => {
    const invitation = await repository.createInvitation(projectId, input)
    dispatch({ type: 'invitationCreated', invitation })
    return invitation
  }, [repository])

  const acceptInvitation = useCallback(async (invitationId) => {
    const result = await repository.acceptInvitation(invitationId)
    dispatch({ type: 'invitationRemoved', invitationId })
    try {
      await reload()
    } catch {
      // The invitation was already accepted. A later screen-entry refresh will
      // load the shared project without asking the user to accept it twice.
    }
    return result
  }, [repository, reload])

  const rejectInvitation = useCallback(async (invitationId) => {
    const result = await repository.rejectInvitation(invitationId)
    dispatch({ type: 'invitationRemoved', invitationId: result.invitationId })
    return result
  }, [repository])

  const cancelInvitation = useCallback(async (invitationId) => {
    const result = await repository.cancelInvitation(invitationId)
    dispatch({ type: 'invitationRemoved', invitationId: result.invitationId })
    return result
  }, [repository])

  const createNote = useCallback(async (projectId, input) => {
    const note = await repository.createNote(projectId, input)
    dispatch({ type: 'noteCreated', note })
    return note
  }, [repository])

  const updateNote = useCallback(async (noteId, patch) => {
    const result = await repository.updateNote(noteId, patch)
    dispatch({ type: 'noteUpdated', ...result })
    return result
  }, [repository])

  const deleteNote = useCallback(async (noteId) => {
    const result = await repository.deleteNote(noteId)
    dispatch({ type: 'noteDeleted', noteId: result.noteId })
    return result
  }, [repository])

  const createResource = useCallback(async (projectId, input) => {
    const resource = await repository.createResource(projectId, input)
    dispatch({ type: 'resourceCreated', resource })
    return resource
  }, [repository])

  const uploadResource = useCallback(async (projectId, input) => {
    const resource = await repository.uploadResource(projectId, input)
    dispatch({ type: 'resourceCreated', resource })
    return resource
  }, [repository])

  const updateResource = useCallback(async (resourceId, patch) => {
    const result = await repository.updateResource(resourceId, patch)
    dispatch({ type: 'resourceUpdated', ...result })
    return result
  }, [repository])

  const deleteResource = useCallback(async (resourceId) => {
    const result = await repository.deleteResource(resourceId)
    dispatch({ type: 'resourceDeleted', resourceId: result.resourceId })
    return result
  }, [repository])

  const getResourceDownloadUrl = useCallback((resourceId) => (
    repository.getResourceDownloadUrl(resourceId)
  ), [repository])

  const createAiAgent = useCallback(async (projectId, input) => {
    const result = await repository.createAiAgent(projectId, input)
    dispatch({ type: 'aiAgentCreated', ...result })
    return result
  }, [repository])

  const updateAiAgent = useCallback(async (memberId, input) => {
    const result = await repository.updateAiAgent(memberId, input)
    dispatch({ type: 'aiAgentUpdated', ...result })
    return result
  }, [repository])

  const createAiRun = useCallback(async (memberId, taskId) => {
    try {
      const aiRun = await repository.createAiRun(memberId, taskId)
      dispatch({ type: 'aiRunUpserted', aiRun })
      return aiRun
    } catch (error) {
      if (error?.aiRun?.id) {
        dispatch({ type: 'aiRunUpserted', aiRun: error.aiRun })
      }
      throw error
    }
  }, [repository])

  const applyAiRun = useCallback(async (runId) => {
    const result = await repository.applyAiRun(runId)
    dispatch({ type: 'aiRunApplied', ...result })
    return result
  }, [repository])

  const rejectAiRun = useCallback(async (runId) => {
    const aiRun = await repository.rejectAiRun(runId)
    dispatch({ type: 'aiRunUpserted', aiRun })
    return aiRun
  }, [repository])

  const refreshAiCredential = useCallback(async () => {
    const credential = await repository.getAiCredential()
    dispatch({ type: 'aiCredentialUpdated', credential })
    return credential
  }, [repository])

  const saveAiCredential = useCallback(async (input) => {
    const credential = await repository.saveAiCredential(input)
    dispatch({ type: 'aiCredentialUpdated', credential })
    return credential
  }, [repository])

  const deleteAiCredential = useCallback(async () => {
    const credential = await repository.deleteAiCredential()
    dispatch({ type: 'aiCredentialUpdated', credential })
    return credential
  }, [repository])

  const value = useMemo(() => ({
    state,
    capabilities: state.capabilities,
    readOnly: state.accessMode === 'guest',
    actions: {
      reload,
      reloadOnEntry,
      createProject,
      updateProject,
      deleteProject,
      createTask,
      updateTask,
      deleteTask,
      updateMember,
      deleteMember,
      createInvitation,
      acceptInvitation,
      rejectInvitation,
      cancelInvitation,
      createNote,
      updateNote,
      deleteNote,
      createResource,
      uploadResource,
      updateResource,
      deleteResource,
      getResourceDownloadUrl,
      createAiAgent,
      updateAiAgent,
      createAiRun,
      applyAiRun,
      rejectAiRun,
      refreshAiCredential,
      saveAiCredential,
      deleteAiCredential,
      registerBeforeLeave,
      flushPending,
    },
  }), [state, reload, reloadOnEntry, createProject, updateProject, deleteProject, createTask, updateTask, deleteTask, updateMember, deleteMember, createInvitation, acceptInvitation, rejectInvitation, cancelInvitation, createNote, updateNote, deleteNote, createResource, uploadResource, updateResource, deleteResource, getResourceDownloadUrl, createAiAgent, updateAiAgent, createAiRun, applyAiRun, rejectAiRun, refreshAiCredential, saveAiCredential, deleteAiCredential, registerBeforeLeave, flushPending])

  if (state.loadError) {
    return (
      <div role="alert" className="app-loading">
        <span>{state.loadError}</span>
        <small>API 서버를 확인한 뒤 페이지를 새로고침해 주세요.</small>
      </div>
    )
  }

  if (!state.ready) {
    return <div role="status" className="app-loading">TeamFlow를 불러오는 중입니다.</div>
  }

  return <TeamFlowContext.Provider value={value}>{children}</TeamFlowContext.Provider>
}
