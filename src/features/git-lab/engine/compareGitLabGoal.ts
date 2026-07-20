import type { PlayableGitLabLevel } from '../levels/gitLabCurriculumAdapter'
import { compareGoalGraph, type GoalCheckResult } from './compareGoalGraph'
import type { GraphSnapshot } from './gitGraphAdapter'
import type { GitEngineState } from './gitEngine'

export function compareGitLabGoal(
  level: PlayableGitLabLevel,
  state: GitEngineState,
  currentGraph: GraphSnapshot,
): GoalCheckResult {
  if (level.goalKind === 'graph') {
    return compareGoalGraph(currentGraph, level.goal)
  }

  if (level.goalKind === 'configState') {
    const cleared = Boolean(state.config['user.name'] && state.config['user.email'])

    return {
      cleared,
      message: cleared
        ? '사용자 이름과 이메일 설정이 완료됐습니다.'
        : 'user.name과 user.email을 모두 설정해야 합니다.',
    }
  }

  if (level.goalKind === 'repoState') {
    return {
      cleared: state.repoExists,
      message: state.repoExists
        ? 'Git 저장소가 초기화됐습니다.'
        : '아직 Git 저장소가 초기화되지 않았습니다.',
    }
  }

  if (level.goalKind === 'fileStatus') {
    const goalCheck = level.goalCheck?.type === 'fileStatus' ? level.goalCheck : null
    const file = goalCheck ? state.files[goalCheck.fileName] : null
    const cleared = Boolean(file && goalCheck && file.status === goalCheck.status)

    return {
      cleared,
      message: cleared
        ? `${goalCheck?.fileName} 파일이 ${goalCheck?.status} 상태입니다.`
        : `${goalCheck?.fileName ?? '대상 파일'}을 목표 상태로 이동해야 합니다.`,
    }
  }

  if (level.goalKind === 'resetState') {
    const goalCheck = level.goalCheck?.type === 'resetState' ? level.goalCheck : null
    const headCommitId = getHeadCommitId(state)
    const cleared = Boolean(
      goalCheck &&
      headCommitId === goalCheck.headCommitId &&
      state.indexCommitId === goalCheck.indexCommitId &&
      state.workingTreeCommitId === goalCheck.workingTreeCommitId,
    )

    return {
      cleared,
      message: cleared
        ? 'HEAD, Index, Working Directory가 목표 reset 상태와 일치합니다.'
        : `목표: HEAD ${goalCheck?.headCommitId ?? 'empty'}, Index ${goalCheck?.indexCommitId ?? 'empty'}, Working ${goalCheck?.workingTreeCommitId ?? 'empty'}`,
    }
  }
  return {
    cleared: false,
    message: '아직 지원되지 않는 목표입니다.',
  }
}
function getHeadCommitId(state: GitEngineState) {
  if (state.head.type === 'detached') {
    return state.head.commitId
  }

  const branchName = state.head.branchName

  return state.branches.find((branch) => branch.name === branchName)?.commitId ?? null
}
