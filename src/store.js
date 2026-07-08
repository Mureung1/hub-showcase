import { createContext, useContext } from 'react';

export const STORAGE_KEY = 'teample-ez-v1';

export const STEPS = [
  { id: 'wizard', label: '프로젝트 생성' },
  { id: 'plan', label: 'AI 계획' },
  { id: 'survey', label: '팀원 설문' },
  { id: 'assignment', label: '역할 배정' },
  { id: 'dashboard', label: '대시보드' },
];

export const initialState = {
  step: 'wizard',
  project: null, // { type, goal, deadline, members: [{ id, name }] }
  plan: null, // 2단계: { milestones, tasks }
  surveys: {}, // 3단계: memberId → 설문 응답
  assignment: null, // 4단계: 배정 결과 + AI 설명
  swapUsed: false, // 스왑 요청 1회 제한
};

export function reducer(state, action) {
  switch (action.type) {
    case 'CREATE_PROJECT':
      return { ...initialState, project: action.project, step: 'plan' };
    case 'SET_PLAN':
      return { ...state, plan: action.plan };
    case 'UPDATE_TASK':
      return {
        ...state,
        plan: {
          ...state.plan,
          tasks: state.plan.tasks.map((t) =>
            t.id === action.taskId ? { ...t, ...action.patch } : t,
          ),
        },
      };
    case 'ADD_TASK':
      return {
        ...state,
        plan: {
          ...state.plan,
          nextTaskId: state.plan.nextTaskId + 1,
          tasks: [
            ...state.plan.tasks,
            {
              id: `t${state.plan.nextTaskId}`,
              milestoneId: action.milestoneId,
              title: action.title,
              roleId: action.roleId ?? null,
              status: 'todo',
            },
          ],
        },
      };
    case 'DELETE_TASK':
      return {
        ...state,
        plan: {
          ...state.plan,
          tasks: state.plan.tasks.filter((t) => t.id !== action.taskId),
        },
      };
    case 'CONFIRM_PLAN':
      return { ...state, step: 'survey' };
    case 'SUBMIT_SURVEY':
      return {
        ...state,
        surveys: { ...state.surveys, [action.memberId]: action.survey },
      };
    case 'SUBMIT_SURVEYS':
      return { ...state, surveys: { ...state.surveys, ...action.entries } };
    case 'CLOSE_SURVEY': {
      // 미제출자는 "상관없음"(중립 응답)으로 처리하고 배정 단계로 진행
      const surveys = { ...state.surveys };
      state.project.members.forEach((m) => {
        if (!surveys[m.id]) {
          surveys[m.id] = { preferences: [], avoid: null, experience: [], leader: 'any', neutral: true };
        }
      });
      return { ...state, surveys, step: 'assignment' };
    }
    case 'SET_ASSIGNMENT':
      return { ...state, assignment: action.assignment };
    case 'SWAP_ROLES': {
      // 두 팀원의 역할 전체를 맞교환 (양측 동의 후 1회 한정)
      const byMember = { ...state.assignment.result.byMember };
      const tmp = byMember[action.a];
      byMember[action.a] = byMember[action.b];
      byMember[action.b] = tmp;
      return {
        ...state,
        swapUsed: true,
        assignment: {
          ...state.assignment,
          result: { ...state.assignment.result, byMember },
        },
      };
    }
    case 'CONFIRM_ASSIGNMENT':
      return { ...state, step: 'dashboard' };
    case 'GO_TO_STEP':
      return { ...state, step: action.step };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...initialState, ...JSON.parse(raw) } : initialState;
  } catch {
    return initialState;
  }
}

export const ProjectContext = createContext(null);

export function useProject() {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error('useProject는 ProjectProvider 안에서만 사용할 수 있습니다');
  return ctx;
}
