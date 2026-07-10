import { useMemo, useState } from 'react'
import CommitGraphSvg from './components/CommitGraphSvg'
import GitTerminalPanel, { type TerminalLog } from './components/GitTerminalPanel'
import GoalPanel from './components/GoalPanel'
import { compareGoalGraph } from './engine/compareGoalGraph'
import {
  createEngineStateFromSnapshot,
  createGraphSnapshotFromEngineState,
  type GraphSnapshot,
} from './engine/gitGraphAdapter'
import { runGitCommand, type GitEngineState } from './engine/gitEngine'
import levelsData from './levels/gitLabLevels.json'
import styles from './GitLabPage.module.css'

type GitLabLevel = {
  id: string
  title: string
  goalTitle: string
  description: string
  hint: string
  initial: GraphSnapshot
  goal: GraphSnapshot
}

const levels = levelsData.levels as GitLabLevel[]

export default function GitLabPage() {
  const [level, setLevel] = useState(levels[0])
  const [engineState, setEngineState] = useState<GitEngineState>(() =>
    createEngineStateFromSnapshot(level.initial),
  )
  const [logs, setLogs] = useState<TerminalLog[]>(() => [
    createLog('info', 'level intro1로 레벨을 다시 불러오거나 hint로 힌트를 볼 수 있습니다.'),
    createLog(
      'info',
      '지원 명령: git commit, git branch <name>, git checkout <name>, git checkout -b <name>, git merge <name>, git log',
    ),
  ])
  const [showGoal, setShowGoal] = useState(true)
  const [showClearModal, setShowClearModal] = useState(false)

  const currentGraph = useMemo(() => createGraphSnapshotFromEngineState(engineState), [engineState])
  const goalCheck = useMemo(
    () => compareGoalGraph(currentGraph, level.goal),
    [currentGraph, level.goal],
  )

  function appendLogs(nextLogs: TerminalLog[]) {
    setLogs((currentLogs) => [...currentLogs, ...nextLogs])
  }

  function loadLevel(levelId: string) {
    const nextLevel = levels.find((candidate) => candidate.id === levelId)

    if (!nextLevel) {
      appendLogs([createLog('error', `알 수 없는 레벨입니다: ${levelId}`)])
      return
    }

    setLevel(nextLevel)
    setEngineState(createEngineStateFromSnapshot(nextLevel.initial))
    setShowClearModal(false)
    setLogs([
      createLog('command', `level ${levelId}`),
      createLog('success', `${nextLevel.title} 레벨을 불러왔습니다.`),
      createLog('info', nextLevel.goalTitle),
    ])
  }

  function handleCommand(rawCommand: string) {
    const command = rawCommand.trim().replace(/^\$\s*/, '')

    if (!command) {
      return
    }

    if (command.startsWith('level ')) {
      loadLevel(command.split(/\s+/)[1] ?? '')
      return
    }

    if (command === 'hint') {
      appendLogs([createLog('command', command), createLog('info', level.hint)])
      return
    }

    const result = runGitCommand(engineState, command)
    const nextGraph = createGraphSnapshotFromEngineState(result.state)
    const nextGoalCheck = compareGoalGraph(nextGraph, level.goal)
    const resultKind = result.ok ? getSuccessLogKind(command) : 'error'
    const nextLogs = [
      createLog('command', command),
      ...result.logs.map((logLine) => createLog(resultKind, logLine)),
    ]

    if (result.ok && nextGoalCheck.cleared && !goalCheck.cleared) {
      nextLogs.push(createLog('success', '목표 그래프와 일치합니다.'))
      setShowClearModal(true)
    }

    setEngineState(result.state)
    appendLogs(nextLogs)
  }

  return (
    <section className={styles.page} aria-labelledby="git-lab-title">
      <header className={styles.levelBar}>
        <div>
          <p className={styles.eyebrow}>Git Branching Lab</p>
          <h1 id="git-lab-title">Level {level.title}</h1>
        </div>
        <button className={styles.toggleButton} onClick={() => setShowGoal((value) => !value)}>
          {showGoal ? '목표 숨기기' : '목표 보기'}
        </button>
      </header>

      <div className={styles.workspace}>
        <GitTerminalPanel logs={logs} onCommand={handleCommand} />

        <main className={styles.graphPanel} aria-label="현재 커밋 그래프">
          <div className={styles.graphHeader}>
            <div>
              <h2>현재 그래프</h2>
              <p>{goalCheck.message}</p>
            </div>
            <span className={goalCheck.cleared ? styles.clearState : styles.pendingState}>
              {goalCheck.cleared ? 'Cleared' : 'In progress'}
            </span>
          </div>
          <div className={styles.graphCanvas}>
            <CommitGraphSvg
              branches={currentGraph.branches}
              commits={currentGraph.commits}
              currentBranch={currentGraph.currentBranch}
            />
          </div>
        </main>

        <GoalPanel
          branches={level.goal.branches}
          cleared={goalCheck.cleared}
          commits={level.goal.commits}
          currentBranch={level.goal.currentBranch}
          description={level.description}
          hidden={!showGoal}
          title={level.goalTitle}
        />
      </div>

      {showClearModal ? (
        <div className={styles.modalBackdrop} role="presentation">
          <section
            aria-labelledby="clear-modal-title"
            aria-modal="true"
            className={styles.clearModal}
            role="dialog"
          >
            <p className={styles.modalBadge}>Cleared</p>
            <h2 id="clear-modal-title">축하합니다. 목표 그래프를 완성했습니다.</h2>
            <p>현재 커밋 구조와 브랜치 위치가 {level.id} 목표와 일치합니다.</p>
            <button className={styles.modalButton} onClick={() => setShowClearModal(false)}>
              계속 보기
            </button>
          </section>
        </div>
      ) : null}
    </section>
  )
}

function getSuccessLogKind(command: string): TerminalLog['kind'] {
  return command === 'git log' ? 'info' : 'success'
}

function createLog(kind: TerminalLog['kind'], text: string): TerminalLog {
  return {
    id: `${kind}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    kind,
    text,
  }
}
