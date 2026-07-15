import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react'

import { mockTeamFlowRepository } from '../data/mockTeamFlowRepository.js'
import { TeamFlowContext } from './TeamFlowContext.js'

function reducer(state, action) {
  switch (action.type) {
    case 'hydrate':
      return { ...action.payload, ready: true }
    case 'projectCreated':
      return { ...state, projects: [...state.projects, action.project] }
    case 'taskCreated':
      return { ...state, tasks: [action.task, ...state.tasks] }
    case 'taskSettled':
      return {
        ...state,
        tasks: state.tasks.map((task) => task.id === action.taskId ? { ...task, isNew: false } : task),
      }
    case 'memberCreated':
      return {
        ...state,
        members: [...state.members, action.member],
        projects: state.projects.map((project) => project.id === action.projectId
          ? { ...project, memberIds: [...project.memberIds, action.member.id] }
          : project),
      }
    case 'noteCreated':
      return { ...state, notes: [action.note, ...state.notes] }
    case 'noteUpdated':
      return {
        ...state,
        notes: state.notes.map((note) => note.id === action.noteId ? { ...note, ...action.patch } : note),
      }
    case 'resourceCreated':
      return { ...state, resources: [action.resource, ...state.resources] }
    case 'aiSettingsUpdated':
      return {
        ...state,
        aiSettings: {
          ...state.aiSettings,
          [action.projectId]: {
            ...(state.aiSettings[action.projectId] ?? {}),
            ...action.patch,
          },
        },
      }
    default:
      return state
  }
}

const emptyState = {
  ready: false,
  projects: [],
  members: [],
  tasks: [],
  notes: [],
  resources: [],
  aiSettings: {},
  currentUserId: '',
  aiMemberId: '',
}

/**
 * Provides one session-scoped source of truth for every mock-backed screen.
 */
export function TeamFlowProvider({ children, repository = mockTeamFlowRepository }) {
  const [state, dispatch] = useReducer(reducer, emptyState)
  const timers = useRef(new Set())

  useEffect(() => {
    let active = true
    const activeTimers = timers.current
    repository.load().then((payload) => {
      if (active) dispatch({ type: 'hydrate', payload })
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
    return project
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

  const addMember = useCallback(async (projectId, input) => {
    const result = await repository.createMember(projectId, input)
    dispatch({ type: 'memberCreated', ...result })
    return result.member
  }, [repository])

  const createNote = useCallback(async (projectId, input) => {
    const note = await repository.createNote(projectId, input)
    dispatch({ type: 'noteCreated', note })
    return note
  }, [repository])

  const updateNote = useCallback(async (noteId, patch) => {
    const result = await repository.updateNote(noteId, patch)
    dispatch({ type: 'noteUpdated', ...result })
  }, [repository])

  const createResource = useCallback(async (projectId, input) => {
    const resource = await repository.createResource(projectId, input)
    dispatch({ type: 'resourceCreated', resource })
    return resource
  }, [repository])

  const updateAiSettings = useCallback(async (projectId, patch) => {
    const result = await repository.updateAiSettings(projectId, patch)
    dispatch({ type: 'aiSettingsUpdated', ...result })
  }, [repository])

  const value = useMemo(() => ({
    state,
    actions: { createProject, createTask, addMember, createNote, updateNote, createResource, updateAiSettings },
  }), [state, createProject, createTask, addMember, createNote, updateNote, createResource, updateAiSettings])

  if (!state.ready) {
    return <div role="status" className="app-loading">TeamFlow를 불러오는 중입니다.</div>
  }

  return <TeamFlowContext.Provider value={value}>{children}</TeamFlowContext.Provider>
}
