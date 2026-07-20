import CommitGraphSvg, { type CommitGraphBranch, type CommitGraphCommit } from './CommitGraphSvg'
import styles from './GoalPanel.module.css'

type GoalPanelProps = {
  title: string
  description: string
  chapterTitle: string
  proGitSection: string
  conceptSummary: string
  acceptedCommands: string[]
  visualMode: string
  commits: CommitGraphCommit[]
  branches: CommitGraphBranch[]
  currentBranch: string | null
  cleared: boolean
  hidden: boolean
}

export default function GoalPanel({
  title,
  description,
  chapterTitle,
  proGitSection,
  conceptSummary,
  acceptedCommands,
  visualMode,
  commits,
  branches,
  currentBranch,
  cleared,
  hidden,
}: GoalPanelProps) {
  return (
    <aside className={styles.panel} aria-label="목표 커밋 그래프">
      <div className={styles.windowHeader}>
        <div className={styles.trafficLights} aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <strong>Lesson Goal</strong>
        <span className={cleared ? styles.clearBadge : styles.pendingBadge}>
          {cleared ? '클리어' : '진행 중'}
        </span>
      </div>

      {hidden ? (
        <div className={styles.hiddenState}>목표가 숨겨져 있습니다.</div>
      ) : (
        <div className={styles.body}>
          <div className={styles.copy}>
            <span className={styles.modeBadge}>{formatVisualMode(visualMode)}</span>
            <p className={styles.chapter}>{chapterTitle}</p>
            <h2>{title}</h2>
            <p>{description}</p>
          </div>

          <section className={styles.lessonCard} aria-labelledby="git-lab-concept-title">
            <h3 id="git-lab-concept-title">이번 레슨에서 볼 것</h3>
            <p>{conceptSummary}</p>
            <dl className={styles.metaList}>
              <div>
                <dt>Pro Git 기준</dt>
                <dd>{proGitSection}</dd>
              </div>
              <div>
                <dt>허용 명령</dt>
                <dd className={styles.commandList}>
                  {acceptedCommands.map((command) => (
                    <code key={command}>{command}</code>
                  ))}
                </dd>
              </div>
            </dl>
          </section>
          <section className={styles.flowCard} aria-labelledby="git-lab-flow-title">
            <h3 id="git-lab-flow-title">명령이 바꾸는 흐름</h3>
            <div className={styles.flowSteps}>
              {getVisualGuide(visualMode).map((step, index) => (
                <div className={styles.flowStep} key={step.label}>
                  <span>{index + 1}</span>
                  <strong>{step.label}</strong>
                  <p>{step.description}</p>
                </div>
              ))}
            </div>
          </section>

          <div className={styles.graphFrame}>
            <CommitGraphSvg
              branches={branches}
              commits={commits}
              currentBranch={currentBranch}
              layoutOptions={{
                laneGap: 104,
                rowGap: 78,
                paddingX: 54,
                paddingY: 50,
                nodeRadius: 21,
              }}
            />
          </div>
        </div>
      )}
    </aside>
  )
}

function formatVisualMode(visualMode: string) {
  return visualMode
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
type VisualGuideStep = {
  label: string
  description: string
}

function getVisualGuide(visualMode: string): VisualGuideStep[] {
  if (visualMode === 'file-status') {
    return [
      { label: 'Working Tree', description: '새 파일이나 수정한 파일이 먼저 머무는 자리입니다.' },
      {
        label: 'Index',
        description: 'git add를 실행하면 다음 커밋에 담을 변경이 이곳으로 이동합니다.',
      },
      { label: 'HEAD', description: 'git commit 후 저장소의 최신 커밋이 바뀝니다.' },
    ]
  }

  if (visualMode === 'reset-state') {
    return [
      { label: 'HEAD', description: 'reset은 먼저 현재 브랜치가 가리키는 커밋을 옮깁니다.' },
      { label: 'Index', description: '--soft는 유지, --mixed와 --hard는 목표 커밋에 맞춥니다.' },
      { label: 'Working Tree', description: '--hard만 파일 내용까지 목표 커밋 상태로 되돌립니다.' },
    ]
  }

  if (visualMode.includes('fast-forward')) {
    return [
      {
        label: '기준 확인',
        description: '현재 브랜치가 합칠 브랜치의 조상이면 새 커밋이 필요 없습니다.',
      },
      { label: '포인터 이동', description: 'git merge는 현재 브랜치 포인터만 앞으로 이동합니다.' },
      { label: '그래프 유지', description: '히스토리는 갈라지지 않고 한 줄로 이어집니다.' },
    ]
  }

  if (visualMode.includes('merge') || visualMode.includes('3-way')) {
    return [
      {
        label: '공통 조상',
        description: '두 브랜치의 공통 부모 커밋을 기준으로 차이를 비교합니다.',
      },
      { label: '두 변경 합치기', description: '각 브랜치의 변경을 새 결과로 합칩니다.' },
      { label: 'Merge Commit', description: '부모가 두 개인 커밋으로 합쳐진 기록을 남깁니다.' },
    ]
  }

  return [
    { label: '현재 상태', description: '먼저 그래프와 파일 상태를 보고 출발점을 확인합니다.' },
    { label: '명령 실행', description: '허용 명령 중 목표에 가장 가까운 Git 명령을 실행합니다.' },
    { label: '결과 비교', description: 'HEAD, 브랜치, 파일 상태가 목표와 일치하는지 확인합니다.' },
  ]
}
