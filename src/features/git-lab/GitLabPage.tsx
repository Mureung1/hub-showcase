import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import CommitGraphSvg from './components/CommitGraphSvg'
import GitTerminalPanel, { type MistakeAction, type TerminalLog } from './components/GitTerminalPanel'
import GoalPanel from './components/GoalPanel'
import RepositoryStatePanel from './components/RepositoryStatePanel'
import { compareGitLabGoal } from './engine/compareGitLabGoal'
import {
  createEngineStateFromSnapshot,
  createGraphSnapshotFromEngineState,
} from './engine/gitGraphAdapter'
import { runGitCommand, type GitEngineState } from './engine/gitEngine'
import {
  createCurriculumNavigation,
  createPlayableLevels,
  type CurriculumNavigationItem,
  type PlayableGitLabLevel,
} from './levels/gitLabCurriculumAdapter'
import levelsData from './levels/gitLabLevels.json'
import { useMistakeNoteStore, type MistakeNoteInput } from '../../stores/useMistakeNoteStore'
import styles from './GitLabPage.module.css'

const levels = createPlayableLevels(levelsData)
const curriculumModules = createCurriculumNavigation(levelsData)

type MistakeCandidate = MistakeNoteInput

export default function GitLabPage() {
  const [searchParams] = useSearchParams()
  const lessonQuery = searchParams.get('lesson')
  const requestedLevel = getPlayableLevel(lessonQuery)
  const initialLevel = requestedLevel ?? levels[0]
  const [level, setLevel] = useState(initialLevel)
  const [engineState, setEngineState] = useState<GitEngineState>(() =>
    createEngineStateForLevel(initialLevel),
  )
  const [logs, setLogs] = useState<TerminalLog[]>(() =>
    createInitialLogs(initialLevel, lessonQuery, requestedLevel),
  )
  const [showGoal, setShowGoal] = useState(true)
  const [showClearModal, setShowClearModal] = useState(false)
  const [mistakeCandidate, setMistakeCandidate] = useState<MistakeCandidate | null>(null)
  const addMistakeNote = useMistakeNoteStore((state) => state.addMistakeNote)
  const hasOpenDuplicate = useMistakeNoteStore((state) => state.hasOpenDuplicate)

  const currentGraph = useMemo(() => createGraphSnapshotFromEngineState(engineState), [engineState])
  const goalCheck = useMemo(
    () => compareGitLabGoal(level, engineState, currentGraph),
    [currentGraph, engineState, level],
  )
  const nextLevel = getNextPlayableLevel(level)
  const mistakeAction: MistakeAction | null = mistakeCandidate
    ? {
        command: mistakeCandidate.command,
        reason: mistakeCandidate.reason,
        saved: hasOpenDuplicate(mistakeCandidate),
        onSave: handleSaveMistake,
      }
    : null


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
    setEngineState(createEngineStateForLevel(nextLevel))
    setShowClearModal(false)
    setMistakeCandidate(null)
    setLogs([createLog('command', `level ${levelId}`), ...createLessonIntroLogs(nextLevel)])
  }

  function handleCurriculumItemClick(item: CurriculumNavigationItem) {
    if (item.playableLevel) {
      loadLevel(item.playableLevel.id)
      return
    }

    appendLogs([
      createLog('command', `level ${item.id}`),
      createLog('error', `${item.title} 레벨은 아직 준비 중입니다.`),
      createLog('info', item.reason),
    ])
  }

  function handleSaveMistake() {
    if (!mistakeCandidate) {
      return
    }

    addMistakeNote(mistakeCandidate)
    appendLogs([createLog('success', '오답노트에 저장했습니다.')])
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
    const nextGoalCheck = compareGitLabGoal(level, result.state, nextGraph)
    const resultKind = result.ok ? getSuccessLogKind(command) : 'error'
    const nextLogs = [
      createLog('command', command),
      ...result.logs.map((logLine) => createLog(resultKind, logLine)),
    ]

    if (!result.ok && command.startsWith('git ')) {
      setMistakeCandidate({
        source: 'git-lab',
        lessonId: level.id,
        lessonTitle: level.title,
        command,
        reason: result.logs[0] ?? 'Git 명령 실행에 실패했습니다.',
        correction: level.hint,
      })
    } else if (!result.ok) {
      setMistakeCandidate(null)
    }

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
          <p className={styles.eyebrow}>Git Lab · {level.chapterTitle}</p>
          <h1 id="git-lab-title">Level {level.title}</h1>
          <p className={styles.sectionLabel}>{level.proGitSection}</p>
        </div>
        <button className={styles.toggleButton} onClick={() => setShowGoal((value) => !value)}>
          {showGoal ? '목표 숨기기' : '목표 보기'}
        </button>
      </header>

      <div className={styles.workspace}>
        <nav className={styles.curriculumPanel} aria-label="Pro Git 커리큘럼 레벨">
          <div className={styles.curriculumHeader}>
            <strong>Pro Git Curriculum</strong>
            <span>{getPlayableCurriculumCount()} / 28 ready</span>
          </div>

          <div className={styles.moduleList}>
            {curriculumModules.map((module) => (
              <section className={styles.moduleGroup} key={module.moduleId}>
                <div className={styles.moduleTitle}>
                  <h2>{module.moduleTitle}</h2>
                  <p>{module.bookRef}</p>
                </div>
                <div className={styles.lessonList}>
                  {module.items.map((item) => (
                    <button
                      className={
                        item.id === level.id
                          ? `${styles.lessonButton} ${styles.currentLessonButton}`
                          : styles.lessonButton
                      }
                      key={item.id}
                      onClick={() => handleCurriculumItemClick(item)}
                      type="button"
                    >
                      <span>{item.id}</span>
                      <strong>{item.title}</strong>
                      <small>
                        {getLessonStatusText(item)}
                      </small>
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </nav>

        <div className={styles.labMain}>
          <div className={styles.terminalSlot}>
            <GitTerminalPanel logs={logs} mistakeAction={mistakeAction} onCommand={handleCommand} />
          </div>

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
            <RepositoryStatePanel state={engineState} />
          </main>

          <div className={styles.goalSlot}>
            <GoalPanel
              acceptedCommands={level.acceptedCommands}
              branches={level.goal.branches}
              chapterTitle={level.chapterTitle}
              cleared={goalCheck.cleared}
              commits={level.goal.commits}
              conceptSummary={level.conceptSummary}
              currentBranch={level.goal.currentBranch}
              description={level.description}
              hidden={!showGoal}
              proGitSection={level.proGitSection}
              title={level.goalTitle}
              visualMode={level.visualMode}
            />
          </div>
        </div>
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
            <div className={styles.modalActions}>
              <button className={styles.modalButton} onClick={() => setShowClearModal(false)}>
                계속 보기
              </button>
              {nextLevel ? (
                <button className={styles.modalButton} onClick={() => loadLevel(nextLevel.id)}>
                  다음 레슨
                </button>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}
    </section>
  )
}

function getPlayableLevel(levelId: string | null) {
  return levels.find((candidate) => candidate.id === levelId)
}

function createInitialLogs(
  level: PlayableGitLabLevel,
  lessonQuery: string | null,
  requestedLevel: PlayableGitLabLevel | undefined,
): TerminalLog[] {
  if (lessonQuery && !requestedLevel) {
    return [
      ...createLessonIntroLogs(level),
      createLog('error', `알 수 없는 레벨입니다: ${lessonQuery}`),
    ]
  }

  return createLessonIntroLogs(level)
}

function createEngineStateForLevel(level: PlayableGitLabLevel): GitEngineState {
  return level.initialEngineState ?? createEngineStateFromSnapshot(level.initial)
}

function createLessonIntroLogs(level: PlayableGitLabLevel): TerminalLog[] {
  return [
    createLog('success', `${level.title} 레슨을 불러왔습니다.`),
    createLog('info', level.goalTitle),
    createLog('info', level.conceptSummary),
    createLog('info', `Pro Git: ${level.proGitSection}`),
    createLog('info', `지원 명령: ${level.acceptedCommands.join(', ')}`),
    createLog('info', `level ${level.id}로 다시 불러오거나 hint로 힌트를 볼 수 있습니다.`),
  ]
}

function getNextPlayableLevel(currentLevel: PlayableGitLabLevel) {
  const currentIndex = levels.findIndex((candidate) => candidate.id === currentLevel.id)

  return levels[(currentIndex + 1) % levels.length]
}

function getPlayableCurriculumCount() {
  return curriculumModules.flatMap((module) => module.items).filter((item) => item.playableLevel)
    .length
}

function getLessonStatusText(item: CurriculumNavigationItem) {
  if (!item.playableLevel) {
    return '엔진 준비 필요'
  }

  return item.playableLevel.goalKind === 'graph' ? '그래프 실습' : '기초 실습'
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