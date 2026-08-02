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

  if (level.goalKind === 'remoteState') {
    const goalCheck = level.goalCheck?.type === 'remoteState' ? level.goalCheck : null
    const remoteOk = goalCheck?.requiredRemoteName
      ? state.remotes.some((remote) => remote.name === goalCheck.requiredRemoteName)
      : true
    const branchOk = goalCheck?.requiredRemoteBranch
      ? Boolean(state.remoteBranches[goalCheck.requiredRemoteBranch])
      : true
    const cleared = Boolean(goalCheck) && remoteOk && branchOk

    return {
      cleared,
      message: cleared
        ? '원격 저장소 상태가 목표와 일치합니다.'
        : (goalCheck?.description ?? '원격 저장소 설정이 필요합니다.'),
    }
  }

  if (level.goalKind === 'tagState') {
    const goalCheck = level.goalCheck?.type === 'tagState' ? level.goalCheck : null
    const cleared = Boolean(
      goalCheck &&
      state.tags.some((tag) => tag.name === goalCheck.tagName && tag.commitId === goalCheck.commitId),
    )

    return {
      cleared,
      message: cleared
        ? `${goalCheck?.tagName} 태그가 올바른 커밋에 생성됐습니다.`
        : (goalCheck?.description ?? '태그를 생성해야 합니다.'),
    }
  }

  if (level.goalKind === 'conflictResolved') {
    const goalCheck = level.goalCheck?.type === 'conflictResolved' ? level.goalCheck : null
    const file = goalCheck ? state.files[goalCheck.filePath] : null
    const markersGone = Boolean(
      file &&
      !file.content.includes('<<<<<<<') &&
      !file.content.includes('=======') &&
      !file.content.includes('>>>>>>>'),
    )
    const cleared = Boolean(markersGone && !state.pendingMerge && !state.conflict)

    return {
      cleared,
      message: cleared
        ? '충돌을 해결하고 병합 커밋을 만들었습니다.'
        : (goalCheck?.description ?? '충돌 마커를 제거하고 add, commit까지 완료해야 합니다.'),
    }
  }

  if (level.goalKind === 'commandOutput') {
    const goalCheck = level.goalCheck?.type === 'commandOutput' ? level.goalCheck : null
    const resolvedOk = goalCheck?.expectedResolvedRef
      ? state.lastResolvedRef === goalCheck.expectedResolvedRef
      : true
    const logOk = goalCheck?.expectedLogResult
      ? JSON.stringify([...(state.lastLogRangeResult ?? [])].sort()) ===
        JSON.stringify([...goalCheck.expectedLogResult].sort())
      : true
    const hasTarget = Boolean(goalCheck?.expectedResolvedRef) || Boolean(goalCheck?.expectedLogResult)
    const cleared = Boolean(goalCheck) && hasTarget && resolvedOk && logOk

    return {
      cleared,
      message: cleared
        ? '명령 결과가 목표와 일치합니다.'
        : (goalCheck?.description ?? '명령 결과를 다시 확인하세요.'),
    }
  }

  if (level.goalKind === 'stashState') {
    const goalCheck = level.goalCheck?.type === 'stashState' ? level.goalCheck : null
    const stashOk =
      goalCheck?.expectedStashLength !== undefined
        ? state.stash.length === goalCheck.expectedStashLength
        : true
    const file = goalCheck?.fileName ? state.files[goalCheck.fileName] : null
    const fileOk = goalCheck?.fileStatus ? file?.status === goalCheck.fileStatus : true
    const cleared = Boolean(goalCheck) && stashOk && fileOk

    return {
      cleared,
      message: cleared
        ? 'Stash 상태가 목표와 일치합니다.'
        : (goalCheck?.description ?? 'Stash 상태를 다시 확인하세요.'),
    }
  }

  if (level.goalKind === 'bisectResult') {
    const goalCheck = level.goalCheck?.type === 'bisectResult' ? level.goalCheck : null
    const cleared = Boolean(goalCheck && state.bisect?.foundCommitId === goalCheck.commitId)

    return {
      cleared,
      message: cleared
        ? '올바른 커밋을 찾았습니다.'
        : (goalCheck?.description ?? 'bisect로 첫 버그 커밋을 찾아야 합니다.'),
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
