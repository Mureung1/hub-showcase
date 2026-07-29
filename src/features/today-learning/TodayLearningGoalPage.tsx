import { type FormEvent, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { shouldUseServerApi } from '../../app/icuApiMode'
import {
  createFallbackCurriculumPlan,
  recommendCurriculum,
  saveGeneratedCurriculumApi,
  resetGeneratedCurriculumApi,
} from '../curriculum/api/curriculumClient'
import { useLearningProfileStore } from '../profile/model/useLearningProfileStore'
import {
  resolveGeneratedCurriculumPlan,
  useGeneratedCurriculumStore,
} from '../curriculum/model/useGeneratedCurriculumStore'
import { persistGeneratedCurriculum } from '../curriculum/model/persistGeneratedCurriculum'
import {
  createGeneratedMissionId,
  createWorkspaceMissionHref,
} from '../learning-workspace/workspaceInteraction'
import { CurriculumLoading } from './CurriculumLoading'
import styles from './TodayLearningHub.module.css'

type GenerationStatus = 'idle' | 'generating' | 'ready'

const defaultCareerGoal = 'DEVOPS 엔지니어가 되고 싶어'

function formatGeneratedAt(value: string | undefined) {
  if (!value) return '아직 저장 전'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '저장 시각 확인 필요'

  return new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function TodayLearningGoalPage() {
  const navigate = useNavigate()
  const { profile } = useLearningProfileStore()
  const generatedCurriculum = useGeneratedCurriculumStore((state) => state.generatedCurriculum)
  const saveGeneratedCurriculum = useGeneratedCurriculumStore(
    (state) => state.saveGeneratedCurriculum,
  )
  const hydrateGeneratedCurriculum = useGeneratedCurriculumStore(
    (state) => state.hydrateGeneratedCurriculum,
  )
  const resetGeneratedCurriculum = useGeneratedCurriculumStore(
    (state) => state.resetGeneratedCurriculum,
  )
  const profileGoal = profile?.learningGoal ?? defaultCareerGoal
  const fallbackGeneratedPlan = useMemo(
    () => createFallbackCurriculumPlan(profileGoal),
    [profileGoal],
  )
  const generatedPlan = useMemo(
    () => resolveGeneratedCurriculumPlan(generatedCurriculum, fallbackGeneratedPlan),
    [fallbackGeneratedPlan, generatedCurriculum],
  )
  const [careerGoal, setCareerGoal] = useState(generatedCurriculum?.goal ?? profileGoal)
  const [followUpText, setFollowUpText] = useState('')
  const [goalError, setGoalError] = useState('')
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus>(
    generatedCurriculum ? 'ready' : 'idle',
  )
  const [hasFollowUpRevision, setHasFollowUpRevision] = useState(false)
  const savedGoal = generatedCurriculum?.goal ?? generatedPlan.goal
  const isGoalDraftChanged = careerGoal.trim().length > 0 && careerGoal.trim() !== savedGoal
  const isGenerating = generationStatus === 'generating'
  const generatedAtLabel = formatGeneratedAt(generatedCurriculum?.generatedAt)
  const generatedStateLabel = generatedCurriculum
    ? '최근 생성한 커리큘럼'
    : '프로필 기준 기본 커리큘럼'

  function startCurriculumGeneration(goal: string, followUpInstruction?: string) {
    const trimmedGoal = goal.trim()
    const trimmedFollowUp = followUpInstruction?.trim()

    if (!trimmedGoal) {
      setGoalError('목표를 입력하면 AI가 학습 순서를 제안합니다.')
      setGenerationStatus('idle')
      return
    }

    setGoalError('')
    setGenerationStatus('generating')

    void recommendCurriculum(
      {
        goal: trimmedGoal,
        followUpInstruction: trimmedFollowUp || undefined,
        previousPlan: trimmedFollowUp ? generatedCurriculum?.plan : undefined,
      },
      { mode: shouldUseServerApi() ? 'server' : 'mock' },
    )
      .then(async ({ plan }) => {
        setCareerGoal(trimmedGoal)
        await persistGeneratedCurriculum({
          goal: trimmedGoal,
          plan,
          serverMode: shouldUseServerApi(),
          saveServer: () =>
            saveGeneratedCurriculumApi(
              { goal: trimmedGoal, plan, generatedAt: new Date().toISOString() },
              { mode: 'server' },
            ),
          saveLocal: saveGeneratedCurriculum,
          hydrate: hydrateGeneratedCurriculum,
        })
        setHasFollowUpRevision(Boolean(trimmedFollowUp))
        setGenerationStatus('ready')
      })
      .catch(() => {
        setGoalError('커리큘럼을 생성하지 못했습니다. 잠시 후 다시 시도해보세요.')
        setGenerationStatus('idle')
      })
  }

  function handleGenerateCurriculum(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    startCurriculumGeneration(careerGoal)
  }

  function handleFollowUpSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!followUpText.trim()) return
    startCurriculumGeneration(careerGoal, followUpText)
    setFollowUpText('')
  }

  async function handleResetGeneratedCurriculum() {
    try {
      if (shouldUseServerApi()) {
        await resetGeneratedCurriculumApi({ mode: 'server' })
      }
      resetGeneratedCurriculum()
      setCareerGoal(profileGoal)
      setGoalError('')
      setHasFollowUpRevision(false)
      setGenerationStatus('idle')
    } catch {
      setGoalError('커리큘럼을 초기화하지 못했습니다. 다시 시도해 주세요.')
    }
  }

  return (
    <main className={styles.page} aria-labelledby="today-goal-title">
      <section className={styles.content}>
        <header className={styles.topbar}>
          <div>
            <h1 id="today-goal-title" data-title-density="compact">
              어떤 개발 목표를 이루고 싶나요?
            </h1>
            <p>한 줄 목표로 시작하면 코듀가 초안을 만들고 필요한 내용을 이어서 질문합니다.</p>
          </div>
          <Link className={styles.profileLink} to="/today">
            오늘 학습으로 돌아가기
          </Link>
        </header>

        <section className={styles.curriculumPanel} aria-labelledby="curriculum-title">
          <div className={styles.panelTitleRow}>
            <div>
              <h2 id="curriculum-title">커리큘럼 만들기</h2>
              <p>목표를 구체적으로 적을수록 오늘 바로 시작할 수 있는 계획을 만들 수 있습니다.</p>
            </div>
            <Link to="/curriculum/history" className={styles.historyTabLink}>
              보관함 관리
            </Link>
          </div>

          <div className={styles.aiCurriculum} aria-busy={isGenerating}>
            <form className={styles.goalInputRow} onSubmit={handleGenerateCurriculum}>
              <label className={styles.goalInputLabel} htmlFor="curriculum-goal">
                한 줄 목표
              </label>
              <div className={styles.goalField} data-goal-field="input">
                <input
                  id="curriculum-goal"
                  value={careerGoal}
                  placeholder="예: 3주 안에 React로 개인 프로젝트를 완성하고 싶어"
                  aria-invalid={Boolean(goalError)}
                  aria-describedby={goalError ? 'curriculum-goal-error' : 'curriculum-goal-help'}
                  onChange={(event) => setCareerGoal(event.target.value)}
                />
                <small id="curriculum-goal-help">
                  기간, 기술, 만들고 싶은 결과를 함께 적으면 더 정확해집니다.
                </small>
              </div>
              <button type="submit" disabled={isGenerating}>
                {isGenerating ? '작성 중' : '커리큘럼 초안 만들기'}
              </button>
            </form>
            {goalError ? (
              <p className={styles.validationMessage} id="curriculum-goal-error">
                {goalError}
              </p>
            ) : null}

            {generationStatus === 'idle' ? (
              <section className={styles.curriculumIntro} aria-label="커리큘럼 생성 안내">
                <span>01</span>
                <div>
                  <strong>한 줄 목표를 입력해 주세요.</strong>
                  <p>코듀가 학습 순서와 오늘 바로 시작할 미션을 먼저 제안합니다.</p>
                </div>
                <span>02</span>
                <div>
                  <strong>초안을 보고 답해 주세요.</strong>
                  <p>한 번에 하나씩 묻는 후속 질문으로 기간과 학습 방식을 조정할 수 있습니다.</p>
                </div>
              </section>
            ) : null}

            {isGenerating ? <CurriculumLoading /> : null}

            {generationStatus === 'ready' ? (
              <div className={styles.curriculumWorkspace}>
                <aside className={styles.followUpPanel} aria-labelledby="follow-up-title">
                  <div className={styles.followUpHeading}>
                    <span>코듀의 맞춤 질문</span>
                    <small>질문 1 / 1</small>
                  </div>
                  <h3 id="follow-up-title">이 초안을 어떤 방향으로 다듬을까요?</h3>
                  <p>가장 가까운 답을 고르거나 직접 요청을 적어 주세요.</p>
                  <div className={styles.quickChips} aria-label="후속 질문 답변">
                    <button
                      type="button"
                      onClick={() =>
                        startCurriculumGeneration(careerGoal, '3주 커리큘럼으로 수정해줘')
                      }
                    >
                      3주 코스로 변경
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        startCurriculumGeneration(
                          careerGoal,
                          '어제 공부한 내용에 이어서 다음 단계를 추천해줘',
                        )
                      }
                    >
                      어제 내용 이어서
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        startCurriculumGeneration(careerGoal, '실습 30분 위주로 구성해줘')
                      }
                    >
                      실습 중심 구성
                    </button>
                  </div>
                  <form className={styles.followUpRow} onSubmit={handleFollowUpSubmit}>
                    <label htmlFor="curriculum-follow-up">직접 요청하기</label>
                    <input
                      id="curriculum-follow-up"
                      type="text"
                      placeholder="예: 평일 30분 분량으로 줄여줘"
                      value={followUpText}
                      onChange={(event) => setFollowUpText(event.target.value)}
                    />
                    <button type="submit" disabled={isGenerating || !followUpText.trim()}>
                      초안 수정
                    </button>
                  </form>
                </aside>

                <section className={styles.draftPanel} aria-labelledby="curriculum-draft-title">
                  <header className={styles.draftHeader}>
                    <div>
                      <span>{generatedStateLabel}</span>
                      <small>{generatedAtLabel}</small>
                    </div>
                    <div className={styles.draftBadges}>
                      {hasFollowUpRevision ? (
                        <span className={styles.revisedBadge}>수정됨</span>
                      ) : null}
                      <span className={styles.draftBadge}>초안</span>
                    </div>
                  </header>

                  <div className={styles.aiPlanHeader} data-status={generationStatus}>
                    <strong id="curriculum-draft-title">{generatedPlan.title}</strong>
                    <span>{generatedPlan.summary}</span>
                    <small>
                      {generatedPlan.estimatedDuration} / {generatedPlan.focusRole}
                    </small>
                  </div>

                  <section
                    className={styles.todayMissionCard}
                    aria-labelledby="today-mission-title"
                  >
                    <div>
                      <span>오늘 바로 시작</span>
                      <strong id="today-mission-title">{generatedPlan.todayMission.title}</strong>
                      <p>{generatedPlan.todayMission.detail}</p>
                    </div>
                    <small>
                      {generatedPlan.todayMission.durationMinutes}분 ·{' '}
                      {generatedPlan.todayMission.fileName}
                    </small>
                  </section>

                  <ol className={styles.aiPlanList}>
                    {generatedPlan.steps.map((item, index) => (
                      <li key={item.id}>
                        <span>{String(index + 1).padStart(2, '0')}</span>
                        <div>
                          <strong>{item.title}</strong>
                          <p>{item.detail}</p>
                          <small>
                            {item.durationLabel} · {item.outcome}
                          </small>
                        </div>
                      </li>
                    ))}
                  </ol>

                  <div className={styles.sourceSection}>
                    <strong>추천 학습 자료</strong>
                    <div className={styles.sourceList} aria-label="추천 문서">
                      {generatedPlan.sources.map((source) => (
                        <article key={source.title}>
                          <strong>{source.title}</strong>
                          <span>{source.urlLabel}</span>
                        </article>
                      ))}
                    </div>
                  </div>

                  {isGoalDraftChanged ? (
                    <p className={styles.pendingNotice}>
                      입력한 목표가 아직 초안에 적용되지 않았습니다.
                    </p>
                  ) : null}
                  <footer className={styles.generatedActions}>
                    <button type="button" onClick={() => startCurriculumGeneration(careerGoal)}>
                      다시 생성
                    </button>
                    <button
                      type="button"
                      disabled={!generatedCurriculum}
                      onClick={handleResetGeneratedCurriculum}
                    >
                      초기화
                    </button>
                    <button
                      type="button"
                      className={styles.generatedStartLink}
                      onClick={() =>
                        navigate(
                          createWorkspaceMissionHref(createGeneratedMissionId(generatedPlan.id)),
                        )
                      }
                    >
                      이 커리큘럼으로 시작
                    </button>
                  </footer>
                </section>
              </div>
            ) : null}
          </div>
        </section>
      </section>
    </main>
  )
}
