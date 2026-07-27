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
import { CurriculumLoading } from './CurriculumLoading'
import styles from './TodayLearningHub.module.css'

type CurriculumMode = 'docs' | 'ai'
type GenerationStatus = 'idle' | 'generating' | 'ready'

const defaultCareerGoal = 'DEVOPS 엔지니어가 되고 싶어'

const docsCurriculum = [
  { title: 'React 공식 문서', detail: 'State: A Component Memory', progress: '62%' },
  { title: '이벤트 처리', detail: 'Responding to Events', progress: '38%' },
  { title: 'Counter.jsx 실습', detail: 'state와 onClick 연결', progress: '진행' },
]

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
  const saveGeneratedCurriculum = useGeneratedCurriculumStore((state) => state.saveGeneratedCurriculum)
  const resetGeneratedCurriculum = useGeneratedCurriculumStore((state) => state.resetGeneratedCurriculum)
  const profileGoal = profile?.learningGoal ?? defaultCareerGoal
  const fallbackGeneratedPlan = useMemo(() => createFallbackCurriculumPlan(profileGoal), [profileGoal])
  const generatedPlan = useMemo(
    () => resolveGeneratedCurriculumPlan(generatedCurriculum, fallbackGeneratedPlan),
    [fallbackGeneratedPlan, generatedCurriculum],
  )
  const [curriculumMode, setCurriculumMode] = useState<CurriculumMode>('ai')
  const [careerGoal, setCareerGoal] = useState(generatedCurriculum?.goal ?? profileGoal)
  const [followUpText, setFollowUpText] = useState('')
  const [goalError, setGoalError] = useState('')
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus>('ready')
  const savedGoal = generatedCurriculum?.goal ?? generatedPlan.goal
  const isGoalDraftChanged = careerGoal.trim().length > 0 && careerGoal.trim() !== savedGoal
  const isGenerating = generationStatus === 'generating'
  const generatedAtLabel = formatGeneratedAt(generatedCurriculum?.generatedAt)
  const generatedStateLabel = generatedCurriculum ? '최근 생성한 커리큘럼' : '프로필 기준 기본 커리큘럼'

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
      { goal: trimmedGoal, followUpInstruction: trimmedFollowUp || undefined, previousPlan: generatedCurriculum?.plan },
      { mode: shouldUseServerApi() ? 'server' : 'mock' },
    )
      .then(({ plan }) => {
        setCareerGoal(trimmedGoal)
        saveGeneratedCurriculum(trimmedGoal, plan)
        if (shouldUseServerApi()) {
          void saveGeneratedCurriculumApi(
            { goal: trimmedGoal, plan, generatedAt: new Date().toISOString() },
            { mode: 'server' },
          ).catch(() => {})
        }
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

  function handleResetGeneratedCurriculum() {
    resetGeneratedCurriculum()
    if (shouldUseServerApi()) {
      void resetGeneratedCurriculumApi({ mode: 'server' }).catch(() => {})
    }
    setCareerGoal(profileGoal)
    setGoalError('')
    setGenerationStatus('ready')
  }

  return (
    <main className={styles.page} aria-labelledby="today-goal-title">
      <section className={styles.content}>
        <header className={styles.topbar}>
          <div>
            <h1 id="today-goal-title">새 목표 만들기</h1>
            <p>목표를 입력하면 코듀가 학습 순서를 제안합니다.</p>
          </div>
          <Link className={styles.profileLink} to="/today">
            오늘 학습으로 돌아가기
          </Link>
        </header>

        <section className={styles.curriculumPanel} aria-labelledby="curriculum-title">
          <div className={styles.panelTitleRow}>
            <div>
              <h2 id="curriculum-title">커리큘럼 만들기</h2>
              <p>문서를 따라가거나, 목표를 입력해 코듀가 학습 순서를 짜게 합니다.</p>
            </div>
            <div className={styles.tabs} role="tablist" aria-label="커리큘럼 작성 방식">
              <button
                type="button"
                role="tab"
                aria-selected={curriculumMode === 'docs'}
                className={curriculumMode === 'docs' ? styles.activeTab : undefined}
                onClick={() => setCurriculumMode('docs')}
              >
                문서 기반
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={curriculumMode === 'ai'}
                className={curriculumMode === 'ai' ? styles.activeTab : undefined}
                onClick={() => setCurriculumMode('ai')}
              >
                AI 커리큘럼 작성하기
              </button>
              <Link to="/curriculum/history" className={styles.historyTabLink}>
                보관함 관리
              </Link>
            </div>
          </div>

          {curriculumMode === 'docs' ? (
            <div className={styles.docsCurriculum} role="tabpanel">
              {docsCurriculum.map((item) => (
                <article key={item.title}>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.detail}</p>
                  </div>
                  <strong>{item.progress}</strong>
                </article>
              ))}
            </div>
          ) : (
            <div className={styles.aiCurriculum} role="tabpanel" aria-busy={generationStatus === 'generating'}>
              <form className={styles.goalInputRow} onSubmit={handleGenerateCurriculum}>
                <label>
                  <span>되고 싶은 목표</span>
                  <input
                    value={careerGoal}
                    aria-invalid={Boolean(goalError)}
                    aria-describedby={goalError ? 'curriculum-goal-error' : undefined}
                    onChange={(event) => setCareerGoal(event.target.value)}
                  />
                </label>
                <button type="submit" disabled={generationStatus === 'generating'}>
                  {generationStatus === 'generating' ? '작성 중' : '코듀로 작성'}
                </button>
              </form>
              {goalError ? (
                <p className={styles.validationMessage} id="curriculum-goal-error">
                  {goalError}
                </p>
              ) : null}
              {generationStatus === 'generating' ? (
                <CurriculumLoading />
              ) : (
                <>
                  <section className={styles.generatedSummary} aria-label="최근 생성한 커리큘럼">
                    <div>
                      <span>{generatedStateLabel}</span>
                      <strong>{generatedPlan.title}</strong>
                      <p>
                        {generatedAtLabel} · {generatedPlan.todayMission.fileName}
                      </p>
                    </div>
                    <div className={styles.generatedActions}>
                      <button
                        type="button"
                        className={styles.generatedStartLink}
                        onClick={() => navigate('/today')}
                      >
                        오늘 학습으로 이동
                      </button>
                      {isGoalDraftChanged ? (
                        <span className={styles.pendingNotice}>입력한 목표가 아직 적용되지 않았습니다.</span>
                      ) : null}
                      <button type="button" onClick={() => startCurriculumGeneration(careerGoal)}>
                        다시 생성
                      </button>
                      <button type="button" disabled={!generatedCurriculum} onClick={handleResetGeneratedCurriculum}>
                        초기화
                      </button>
                    </div>
                  </section>
                  <div className={styles.followUpSection}>
                    <div className={styles.quickChips} aria-label="추천 후속 질문">
                      <button type="button" onClick={() => startCurriculumGeneration(careerGoal, '3주 커리큘럼으로 수정해줘')}>
                        3주 코스로 변경
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          startCurriculumGeneration(careerGoal, '어제 공부한 내용에 이어서 다음 단계를 추천해줘')
                        }
                      >
                        어제 내용 이어서
                      </button>
                      <button type="button" onClick={() => startCurriculumGeneration(careerGoal, '실습 30분 위주로 구성해줘')}>
                        실습 중심 구성
                      </button>
                    </div>
                    <form className={styles.followUpRow} onSubmit={handleFollowUpSubmit}>
                      <input
                        type="text"
                        placeholder="후속 요청 입력 (예: 3주 과정으로 수정, 어제 내용 이어서)"
                        value={followUpText}
                        onChange={(event) => setFollowUpText(event.target.value)}
                      />
                      <button type="submit" disabled={isGenerating || !followUpText.trim()}>
                        {isGenerating ? '수정 중' : '후속 요청'}
                      </button>
                    </form>
                  </div>
                  <div className={styles.aiPlanHeader} data-status={generationStatus}>
                    <strong>{generatedPlan.title}</strong>
                    <span>{generatedPlan.summary}</span>
                    <small>
                      {generatedPlan.estimatedDuration} / {generatedPlan.focusRole}
                    </small>
                  </div>
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
                  <div className={styles.sourceList} aria-label="추천 문서">
                    {generatedPlan.sources.map((source) => (
                      <article key={source.title}>
                        <strong>{source.title}</strong>
                        <span>{source.urlLabel}</span>
                      </article>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </section>
      </section>
    </main>
  )
}
