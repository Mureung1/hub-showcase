import { useEffect, useState } from 'react'
import { WEAK_AREAS_BY_EXAM } from '../constants/examAreas'
import { createAdaptiveDailyStudyPlan, createDailyStudyPlan, getPriorityAreaFromNote } from '../utils/studyPlanGenerator'
import { createTodayStudyTasks } from '../utils/todayStudyGenerator'

const MENU_ITEMS = [
  { id: 'intro', label: '시험 선택' },
  { id: 'info', label: '정보 입력' },
  { id: 'diagnosis', label: '취약 영역' },
  { id: 'plan', label: '학습 계획' },
  { id: 'today', label: '오늘의 학습' },
]

const RECORD_MENU_ITEM = { id: 'records', label: '학습 기록' }

const EXAMS = [
  {
    name: 'TOEIC',
    description: '취업과 졸업 요건에 자주 쓰이는 시험으로, 듣기와 읽기 점수를 중심으로 준비합니다.',
    tags: ['목표 점수', 'LC/RC'],
  },
  {
    name: 'OPIc',
    description: '일상과 경험을 바탕으로 말하기 답변을 구성하고, 목표 등급에 맞춰 연습합니다.',
    tags: ['목표 등급', '말하기'],
  },
  {
    name: 'TOEIC Speaking',
    description: '정해진 문항 유형별 답변, 발화 속도, 전달력을 함께 평가하는 시험입니다.',
    tags: ['목표 점수', '말하기 유형'],
  },
  {
    name: 'TOEFL',
    description: '읽기, 듣기, 말하기, 쓰기 영역을 균형 있게 준비해야 하는 학업 목적 시험입니다.',
    tags: ['목표 점수', '4개 영역'],
  },
]

const INITIAL_FORM_VALUES = {
  currentScore: '',
  targetScore: '',
  examDate: '',
  dailyStudyMinutes: '',
}

const INITIAL_ACTUAL_STUDY_FORM = {
  area: '',
  title: '',
  minutes: '',
}

const SCORE_STATUS = {
  hasScore: 'hasScore',
  noScore: 'noScore',
}

const STUDY_PLAN_ID_STORAGE_KEY = 'studyPlanId'
const DEFAULT_TOEFL_SCORE_SYSTEM = 'scaled'
const TOEFL_SCORE_SYSTEMS = {
  scaled: { label: '1.0~6.0 점수', placeholder: '예: 5.5' },
  ibt: { label: '0~120 점수', placeholder: '예: 95' },
}
const OPIC_GRADES = ['NL', 'NM', 'NH', 'IL', 'IM1', 'IM2', 'IM3', 'IH', 'AL']
const FRIENDLY_RESPONSE_ERROR_MESSAGE = '서버 응답을 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.'
const DEFAULT_SAVE_ERROR_MESSAGE = '학습 계획을 저장하지 못했습니다. 입력값을 확인하고 다시 시도해 주세요.'
const DEFAULT_LOOKUP_ERROR_MESSAGE = '저장된 학습 계획을 다시 불러오지 못했습니다. 정보를 다시 입력해 주세요.'

function ProjectIntro({ accessToken = '', isAuthenticated = true, onAuthRequired = () => {}, restoreLatestPlan = true }) {
  const [activeScreen, setActiveScreen] = useState('intro')
  const [selectedExam, setSelectedExam] = useState('')
  const [formValues, setFormValues] = useState(INITIAL_FORM_VALUES)
  const [toeflScoreSystem, setToeflScoreSystem] = useState(DEFAULT_TOEFL_SCORE_SYSTEM)
  const [scoreStatus, setScoreStatus] = useState(SCORE_STATUS.hasScore)
  const [selectedWeakAreas, setSelectedWeakAreas] = useState([])
  const [weakAreaNote, setWeakAreaNote] = useState('')
  const [actualStudyForm, setActualStudyForm] = useState(INITIAL_ACTUAL_STUDY_FORM)
  const [actualStudyEntries, setActualStudyEntries] = useState([])
  const [difficultArea, setDifficultArea] = useState('')
  const [nextPriorityArea, setNextPriorityArea] = useState('')
  const [reflectionNote, setReflectionNote] = useState('')
  const [studyRecordMessage, setStudyRecordMessage] = useState('')
  const [isSavingStudyRecord, setIsSavingStudyRecord] = useState(false)
  const [dailyStudyRecords, setDailyStudyRecords] = useState([])
  const [selectedDailyStudyRecord, setSelectedDailyStudyRecord] = useState(null)
  const [isLoadingDailyStudyRecords, setIsLoadingDailyStudyRecords] = useState(false)
  const [dailyStudyRecordError, setDailyStudyRecordError] = useState('')
  const [previousDailyStudyRecord, setPreviousDailyStudyRecord] = useState(null)
  const [adaptivePlanError, setAdaptivePlanError] = useState('')
  const [diagnosisError, setDiagnosisError] = useState('')
  const [completedTasks, setCompletedTasks] = useState([])
  const [fieldErrors, setFieldErrors] = useState({})
  const [savedStudyPlan, setSavedStudyPlan] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const availableMenuItems = isAuthenticated ? [...MENU_ITEMS, RECORD_MENU_ITEM] : MENU_ITEMS
  const screenTitle = availableMenuItems.find((item) => item.id === activeScreen)?.label
  const workflowStepIndex = MENU_ITEMS.findIndex((item) => item.id === activeScreen)
  const workflowStep = workflowStepIndex >= 0 ? workflowStepIndex + 1 : MENU_ITEMS.length
  const adaptiveStudyPlan = createAdaptiveStudyPlanResult({
    formValues,
    previousRecord: previousDailyStudyRecord,
    savedStudyPlan,
    selectedExam,
    selectedWeakAreas,
    weakAreaNote,
  })
  const todayTasks = createTodayStudyTasks({
    examType: (savedStudyPlan || { ...formValues, examType: selectedExam }).examType || selectedExam,
    dailyStudyPlan: adaptiveStudyPlan.plan,
  })

  useEffect(() => {
    resetStudyPlanState()

    if (!restoreLatestPlan || !isAuthenticated || !accessToken) {
      return undefined
    }

    let isMounted = true

    async function restoreSavedStudyPlan() {
      try {
        const studyPlan = await fetchLatestStudyPlan(accessToken)

        if (!isMounted) {
          return
        }

        setSavedStudyPlan(studyPlan)
        setSelectedExam(studyPlan.examType)
        setActiveScreen('plan')
      } catch (error) {
        if (!isMounted) {
          return
        }

        if (error.code === 'STUDY_PLAN_NOT_FOUND') {
          resetStudyPlanState()
          return
        }

        if (error.code === 'UNAUTHORIZED') {
          resetStudyPlanState()
          setErrorMessage('로그인 세션이 만료되었습니다. 다시 로그인해 주세요.')
          return
        }

        if (error.code === 'NETWORK_ERROR') {
          resetStudyPlanState()
          setErrorMessage('서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.')
          return
        }

        if (error.code === 'DATABASE_ERROR') {
          resetStudyPlanState()
          setErrorMessage(error.message || '저장된 학습 계획을 조회하지 못했습니다.')
          setActiveScreen('info')
        }
      }
    }

    restoreSavedStudyPlan()

    return () => {
      isMounted = false
    }
  }, [accessToken, isAuthenticated, restoreLatestPlan])

  useEffect(() => {
    if (!isAuthenticated || !accessToken || !savedStudyPlan?.id) {
      setPreviousDailyStudyRecord(null)
      setAdaptivePlanError('')
      return undefined
    }

    let isMounted = true

    async function loadPreviousRecord() {
      try {
        const record = await fetchLatestDailyStudyRecordBeforeToday(savedStudyPlan.id, accessToken)

        if (isMounted) {
          setPreviousDailyStudyRecord(record)
          setAdaptivePlanError('')
        }
      } catch (error) {
        if (isMounted) {
          setPreviousDailyStudyRecord(null)
          setAdaptivePlanError('이전 학습 기록을 불러오지 못해 기본 계획을 사용합니다.')
        }
      }
    }

    loadPreviousRecord()

    return () => {
      isMounted = false
    }
  }, [accessToken, isAuthenticated, savedStudyPlan?.id])

  function resetStudyPlanState() {
    setActiveScreen('intro')
    setSelectedExam('')
    setFormValues(INITIAL_FORM_VALUES)
    setToeflScoreSystem(DEFAULT_TOEFL_SCORE_SYSTEM)
    setScoreStatus(SCORE_STATUS.hasScore)
    setSelectedWeakAreas([])
    setWeakAreaNote('')
    resetStudyRecordState()
    setDiagnosisError('')
    setCompletedTasks([])
    setFieldErrors({})
    setSavedStudyPlan(null)
    setErrorMessage('')
    localStorage.removeItem(STUDY_PLAN_ID_STORAGE_KEY)
  }

  function resetStudyRecordState() {
    setActualStudyForm(INITIAL_ACTUAL_STUDY_FORM)
    setActualStudyEntries([])
    setDifficultArea('')
    setNextPriorityArea('')
    setReflectionNote('')
    setStudyRecordMessage('')
    setIsSavingStudyRecord(false)
    setDailyStudyRecords([])
    setSelectedDailyStudyRecord(null)
    setIsLoadingDailyStudyRecords(false)
    setDailyStudyRecordError('')
    setPreviousDailyStudyRecord(null)
    setAdaptivePlanError('')
  }

  function handleMenuClick(screenId) {
    if (screenId === 'records') {
      loadDailyStudyRecords()
    }

    setActiveScreen(screenId)
  }

  function updateFormValue(fieldName, value) {
    setFieldErrors((currentErrors) => ({ ...currentErrors, [fieldName]: '' }))
    setFormValues((currentValues) => ({ ...currentValues, [fieldName]: value }))
  }

  function handleSelectExam(examName) {
    setSelectedExam(examName)
    setFormValues(INITIAL_FORM_VALUES)
    setToeflScoreSystem(DEFAULT_TOEFL_SCORE_SYSTEM)
    setScoreStatus(SCORE_STATUS.hasScore)
    setSelectedWeakAreas([])
    setWeakAreaNote('')
    setCompletedTasks([])
    resetStudyRecordState()
    setDiagnosisError('')
    setFieldErrors({})
    setErrorMessage('')
  }

  function handleScoreStatusChange(nextScoreStatus) {
    setScoreStatus(nextScoreStatus)
    setFieldErrors((currentErrors) => ({ ...currentErrors, currentScore: '' }))

    if (nextScoreStatus === SCORE_STATUS.noScore) {
      setFormValues((currentValues) => ({ ...currentValues, currentScore: '' }))
    }
  }

  function handleToeflScoreSystemChange(scoreSystem) {
    setToeflScoreSystem(scoreSystem)
    setFormValues((currentValues) => ({ ...currentValues, currentScore: '', targetScore: '' }))
    setFieldErrors({})
    setErrorMessage('')
  }

  async function handleSaveStudyPlan() {
    if (!isAuthenticated || !accessToken) {
      setSavedStudyPlan(null)
      setCompletedTasks([])
      resetStudyRecordState()
      setActiveScreen('plan')
      onAuthRequired()
      return
    }

    setIsSaving(true)
    setErrorMessage('')
    setFieldErrors({})

    const dailyStudyMinutes = Number(formValues.dailyStudyMinutes)

    if (!Number.isInteger(dailyStudyMinutes)) {
      setIsSaving(false)
      setErrorMessage('하루 공부 시간은 분 단위 숫자로 입력해 주세요.')
      return
    }

    const scoreValidationErrors = validateScoreInputs(selectedExam, toeflScoreSystem, formValues)

    if (Object.keys(scoreValidationErrors).length > 0) {
      setIsSaving(false)
      setFieldErrors(scoreValidationErrors)
      return
    }

    const currentScore = scoreStatus === SCORE_STATUS.hasScore ? formValues.currentScore.trim() : ''
    const requestBody = {
      examType: selectedExam,
      isFirstAttempt: currentScore === '',
      currentScore: currentScore || null,
      targetScore: formValues.targetScore.trim(),
      examDate: formValues.examDate,
      dailyStudyMinutes,
    }

    try {
      const createResponse = await fetch('/api/study-plans', {
        method: 'POST',
        headers: getAuthorizedJsonHeaders(accessToken),
        body: JSON.stringify(requestBody),
      })
      const createResult = await parseJsonResponse(createResponse, 'SAVE')

      if (!createResponse.ok) {
        throw new Error(getResponseMessage(createResult) || DEFAULT_SAVE_ERROR_MESSAGE)
      }

      const studyPlanId = createResult?.data?.id

      if (!studyPlanId) {
        throw new Error('저장된 학습 계획 id를 확인하지 못했습니다.')
      }

      localStorage.setItem(STUDY_PLAN_ID_STORAGE_KEY, studyPlanId)

      let studyPlan

      try {
        studyPlan = await fetchStudyPlanById(studyPlanId, accessToken)
      } catch (error) {
        localStorage.removeItem(STUDY_PLAN_ID_STORAGE_KEY)
        throw error
      }

      setSavedStudyPlan(studyPlan)
      setSelectedExam(studyPlan.examType)
      setActiveScreen('plan')
    } catch (error) {
      setErrorMessage(error.message || DEFAULT_SAVE_ERROR_MESSAGE)
    } finally {
      setIsSaving(false)
    }
  }

  function handleInfoNext() {
    setErrorMessage('')
    setFieldErrors({})

    const dailyStudyMinutes = Number(formValues.dailyStudyMinutes)

    if (!Number.isInteger(dailyStudyMinutes)) {
      setErrorMessage('하루 공부 시간은 분 단위 숫자로 입력해 주세요.')
      return
    }

    const scoreValidationErrors = validateScoreInputs(selectedExam, toeflScoreSystem, formValues)

    if (Object.keys(scoreValidationErrors).length > 0) {
      setFieldErrors(scoreValidationErrors)
      return
    }

    setActiveScreen('diagnosis')
  }

  function handleCreatePlan() {
    if (selectedWeakAreas.length === 0) {
      setDiagnosisError('취약 영역을 하나 이상 선택해 주세요.')
      return
    }

    setDiagnosisError('')
    setCompletedTasks([])
    resetStudyRecordState()
    handleSaveStudyPlan()
  }

  function updateActualStudyForm(fieldName, value) {
    setStudyRecordMessage('')
    setActualStudyForm((currentForm) => ({ ...currentForm, [fieldName]: value }))
  }

  function addActualStudyEntry() {
    const area = actualStudyForm.area || (WEAK_AREAS_BY_EXAM[selectedExam] || [])[0] || ''
    const title = actualStudyForm.title.trim()
    const minutes = Number(actualStudyForm.minutes)

    if (!area || !title || !Number.isInteger(minutes) || minutes < 1) {
      setStudyRecordMessage('학습 영역, 내용, 1분 이상의 시간을 입력해 주세요.')
      return
    }

    setActualStudyEntries((currentEntries) => [
      ...currentEntries,
      {
        id: `actual-${Date.now()}-${currentEntries.length}`,
        area,
        title,
        minutes,
      },
    ])
    setActualStudyForm({ area, title: '', minutes: '' })
    setStudyRecordMessage('')
  }

  function removeActualStudyEntry(entryId) {
    setActualStudyEntries((currentEntries) => currentEntries.filter((entry) => entry.id !== entryId))
  }

  async function handleSaveStudyRecord() {
    if (!isAuthenticated || !accessToken) {
      onAuthRequired()
      return
    }

    if (!savedStudyPlan?.id) {
      setStudyRecordMessage('저장된 학습 계획을 먼저 생성해 주세요.')
      return
    }

    setIsSavingStudyRecord(true)
    setStudyRecordMessage('')

    try {
      const response = await fetch('/api/daily-study-records', {
        method: 'POST',
        headers: getAuthorizedJsonHeaders(accessToken),
        body: JSON.stringify({
          studyPlanId: savedStudyPlan.id,
          recordDate: getLocalDateString(),
          generatedTasks: todayTasks,
          completedTaskIds: completedTasks,
          actualStudyEntries,
          difficultArea: difficultArea || null,
          nextPriorityArea: nextPriorityArea || null,
          reflectionNote: reflectionNote || null,
        }),
      })
      const result = await parseJsonResponse(response, 'DAILY_STUDY_RECORD')

      if (!response.ok) {
        const error = new Error(getDailyStudyRecordErrorMessage(response.status, result))
        error.code = result?.error?.code || getStudyPlanRequestErrorCode(response.status)
        throw error
      }

      setStudyRecordMessage('오늘의 학습 기록을 저장했습니다.')
    } catch (error) {
      if (error.code === 'UNAUTHORIZED') {
        setStudyRecordMessage('로그인이 만료되었습니다. 다시 로그인해 주세요.')
      } else if (error.code === 'VALIDATION_ERROR') {
        setStudyRecordMessage('학습 기록 입력값을 확인해 주세요.')
      } else {
        setStudyRecordMessage('학습 기록을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.')
      }
    } finally {
      setIsSavingStudyRecord(false)
    }
  }

  async function loadDailyStudyRecords() {
    if (!isAuthenticated || !accessToken) {
      setDailyStudyRecordError('학습 기록을 보려면 로그인해 주세요.')
      return
    }

    setIsLoadingDailyStudyRecords(true)
    setDailyStudyRecordError('')
    setSelectedDailyStudyRecord(null)

    try {
      const records = await fetchDailyStudyRecords(accessToken)
      setDailyStudyRecords(records)
    } catch (error) {
      setDailyStudyRecords([])
      setDailyStudyRecordError(getDailyStudyRecordLookupErrorMessage(error))
    } finally {
      setIsLoadingDailyStudyRecords(false)
    }
  }

  async function loadDailyStudyRecordDetail(recordId) {
    if (!isAuthenticated || !accessToken) {
      setDailyStudyRecordError('학습 기록을 보려면 로그인해 주세요.')
      return
    }

    setIsLoadingDailyStudyRecords(true)
    setDailyStudyRecordError('')

    try {
      const record = await fetchDailyStudyRecordById(recordId, accessToken)
      setSelectedDailyStudyRecord(record)
    } catch (error) {
      setDailyStudyRecordError(getDailyStudyRecordLookupErrorMessage(error))
    } finally {
      setIsLoadingDailyStudyRecords(false)
    }
  }

  return (
    <section className="project-intro">
      <nav className="top-menu" aria-label="학습 계획 화면 메뉴">
        <div className="top-menu-inner">
          <span className="brand-mark">Study Plan</span>
          <div className="menu-list">
            {availableMenuItems.map((item) => (
              <button
                className={`menu-button ${activeScreen === item.id ? 'menu-button-active' : ''}`}
                data-screen-id={item.id}
                key={item.id}
                type="button"
                onClick={() => handleMenuClick(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <div className="intro-shell">
        <header className="intro-header">
          <span className="intro-label">STEP {Math.min(workflowStep, MENU_ITEMS.length)}/{MENU_ITEMS.length}</span>
          <h1>준비할 시험과 목표를 정리해 학습 흐름을 만들어 보세요</h1>
          <p className="intro-tagline">
            시험 선택부터 정보 입력, 취약 영역 진단, 학습 계획 확인까지 한 화면 안에서 차분하게 이동할 수 있는
            학습 계획 프로토타입입니다.
          </p>
          <div className="intro-summary">
        <span className="summary-pill">현재 화면: {screenTitle}</span>
        <span className="summary-pill">선택 시험: {selectedExam || '선택 전'}</span>
        <span className="summary-pill">{isAuthenticated ? (savedStudyPlan ? 'DB 저장 완료' : 'DB 저장 전') : '비로그인 체험'}</span>
          </div>
        </header>

        {activeScreen === 'intro' && (
          <StartScreen
            formValues={formValues}
            savedStudyPlan={savedStudyPlan}
            selectedExam={selectedExam}
            selectedWeakAreas={selectedWeakAreas}
            onNext={() => setActiveScreen('info')}
            onSelectExam={handleSelectExam}
          />
        )}
        {activeScreen === 'info' && (
          <InfoInput
            errorMessage={errorMessage}
            fieldErrors={fieldErrors}
            formValues={formValues}
            isSaving={isSaving}
            scoreStatus={scoreStatus}
            selectedExam={selectedExam}
            toeflScoreSystem={toeflScoreSystem}
            onNext={handleInfoNext}
            onPrevious={() => setActiveScreen('intro')}
            onScoreStatusChange={handleScoreStatusChange}
            onToeflScoreSystemChange={handleToeflScoreSystemChange}
            onUpdate={updateFormValue}
          />
        )}
        {activeScreen === 'diagnosis' && (
          <DiagnosisScreen
            selectedExam={selectedExam}
            selectedWeakAreas={selectedWeakAreas}
            errorMessage={diagnosisError || errorMessage}
            isSaving={isSaving}
            weakAreaNote={weakAreaNote}
            onCreatePlan={handleCreatePlan}
            onNoteChange={setWeakAreaNote}
            onPrevious={() => setActiveScreen('info')}
            onToggleWeakArea={setSelectedWeakAreas}
          />
        )}
        {activeScreen === 'plan' && (
          <PlanDashboard
            formValues={formValues}
            adaptivePlanError={adaptivePlanError}
            adaptiveStudyPlan={adaptiveStudyPlan}
            savedStudyPlan={savedStudyPlan}
            selectedExam={selectedExam}
            selectedWeakAreas={selectedWeakAreas}
            isAuthenticated={isAuthenticated}
            previousRecord={previousDailyStudyRecord}
            weakAreaNote={weakAreaNote}
            onEditInfo={() => setActiveScreen('info')}
            onViewToday={() => setActiveScreen('today')}
          />
        )}
        {activeScreen === 'today' && (
          <TodayStudy
            completedTasks={completedTasks}
            formValues={formValues}
            savedStudyPlan={savedStudyPlan}
            selectedExam={selectedExam}
            actualStudyEntries={actualStudyEntries}
            actualStudyForm={actualStudyForm}
            difficultArea={difficultArea}
            isAuthenticated={isAuthenticated}
            isSavingStudyRecord={isSavingStudyRecord}
            nextPriorityArea={nextPriorityArea}
            reflectionNote={reflectionNote}
            studyRecordMessage={studyRecordMessage}
            tasks={todayTasks}
            onAddActualStudyEntry={addActualStudyEntry}
            onActualStudyFormChange={updateActualStudyForm}
            onDifficultAreaChange={setDifficultArea}
            onNextPriorityAreaChange={setNextPriorityArea}
            onReflectionNoteChange={setReflectionNote}
            onRemoveActualStudyEntry={removeActualStudyEntry}
            onSaveStudyRecord={handleSaveStudyRecord}
            onToggleTask={setCompletedTasks}
          />
        )}
        {activeScreen === 'records' && (
          <DailyStudyRecordsScreen
            errorMessage={dailyStudyRecordError}
            isLoading={isLoadingDailyStudyRecords}
            records={dailyStudyRecords}
            selectedRecord={selectedDailyStudyRecord}
            onBackToList={() => setSelectedDailyStudyRecord(null)}
            onSelectRecord={loadDailyStudyRecordDetail}
          />
        )}
      </div>
    </section>
  )
}

async function fetchStudyPlanById(studyPlanId, accessToken) {
  if (!accessToken) {
    throw new Error(DEFAULT_LOOKUP_ERROR_MESSAGE)
  }

  const lookupResponse = await fetch(`/api/study-plans/${studyPlanId}`, {
    headers: getAuthorizedHeaders(accessToken),
  })
  const lookupResult = await parseJsonResponse(lookupResponse, 'LOOKUP')

  if (!lookupResponse.ok) {
    const error = new Error(getStudyPlanRequestErrorMessage(lookupResponse.status, lookupResult))
    error.code = lookupResult?.error?.code || getStudyPlanRequestErrorCode(lookupResponse.status)
    throw error
  }

  return lookupResult.data
}

async function fetchLatestStudyPlan(accessToken) {
  let lookupResponse

  try {
    lookupResponse = await fetch('/api/study-plans/me/latest', {
      headers: getAuthorizedHeaders(accessToken),
    })
  } catch (error) {
    const networkError = new Error('서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.')
    networkError.code = 'NETWORK_ERROR'
    throw networkError
  }

  const lookupResult = await parseJsonResponse(lookupResponse, 'LATEST')

  if (!lookupResponse.ok) {
    const error = new Error(getStudyPlanRequestErrorMessage(lookupResponse.status, lookupResult))
    error.code = lookupResult?.error?.code || getStudyPlanRequestErrorCode(lookupResponse.status)
    throw error
  }

  return lookupResult.data
}

async function fetchDailyStudyRecords(accessToken) {
  const response = await fetch('/api/daily-study-records', {
    headers: getAuthorizedHeaders(accessToken),
  })
  const result = await parseJsonResponse(response, 'DAILY_STUDY_RECORD_LIST')

  if (!response.ok) {
    const error = new Error(getDailyStudyRecordLookupErrorMessageByStatus(response.status, result))
    error.code = result?.error?.code || getStudyPlanRequestErrorCode(response.status)
    throw error
  }

  return result.data || []
}

async function fetchDailyStudyRecordById(recordId, accessToken) {
  const response = await fetch(`/api/daily-study-records/${recordId}`, {
    headers: getAuthorizedHeaders(accessToken),
  })
  const result = await parseJsonResponse(response, 'DAILY_STUDY_RECORD_DETAIL')

  if (!response.ok) {
    const error = new Error(getDailyStudyRecordLookupErrorMessageByStatus(response.status, result))
    error.code = result?.error?.code || getStudyPlanRequestErrorCode(response.status)
    throw error
  }

  return result.data
}

async function fetchLatestDailyStudyRecordBeforeToday(studyPlanId, accessToken) {
  const response = await fetch(`/api/daily-study-records/latest-before-today?studyPlanId=${studyPlanId}`, {
    headers: getAuthorizedHeaders(accessToken),
  })
  const result = await parseJsonResponse(response, 'PREVIOUS_DAILY_STUDY_RECORD')

  if (!response.ok) {
    const error = new Error(getDailyStudyRecordLookupErrorMessageByStatus(response.status, result))
    error.code = result?.error?.code || getStudyPlanRequestErrorCode(response.status)
    throw error
  }

  return result.data || null
}

function getAuthorizedHeaders(accessToken) {
  return {
    Authorization: `Bearer ${accessToken}`,
  }
}

function getAuthorizedJsonHeaders(accessToken) {
  return {
    ...getAuthorizedHeaders(accessToken),
    'Content-Type': 'application/json',
  }
}

async function parseJsonResponse(response, requestType = 'GENERAL') {
  const responseText = await response.text()

  if (!responseText) {
    return null
  }

  try {
    return JSON.parse(responseText)
  } catch {
    if (requestType === 'LATEST' && response.status === 404) {
      return {
        error: {
          code: 'STUDY_PLAN_NOT_FOUND',
          message: '저장된 학습 계획이 없습니다.',
        },
      }
    }

    throw new Error(FRIENDLY_RESPONSE_ERROR_MESSAGE)
  }
}

function getResponseMessage(responseBody) {
  return responseBody?.message || responseBody?.error?.message || ''
}

function getStudyPlanRequestErrorCode(status) {
  if (status === 401) {
    return 'UNAUTHORIZED'
  }

  if (status === 404) {
    return 'STUDY_PLAN_NOT_FOUND'
  }

  if (status >= 500) {
    return 'DATABASE_ERROR'
  }

  return 'REQUEST_ERROR'
}

function getStudyPlanRequestErrorMessage(status, responseBody) {
  const responseMessage = getResponseMessage(responseBody)

  if (status === 401) {
    return responseMessage || '로그인 세션이 만료되었습니다. 다시 로그인해 주세요.'
  }

  if (status === 404) {
    return responseMessage || '저장된 학습 계획이 없습니다.'
  }

  if (status >= 500) {
    return responseMessage || '저장된 학습 계획을 조회하지 못했습니다.'
  }

  return responseMessage || DEFAULT_LOOKUP_ERROR_MESSAGE
}

function getDailyStudyRecordErrorMessage(status, responseBody) {
  const responseMessage = getResponseMessage(responseBody)

  if (status === 401) {
    return responseMessage || '로그인이 만료되었습니다. 다시 로그인해 주세요.'
  }

  if (status === 400) {
    return responseMessage || '학습 기록 입력값을 확인해 주세요.'
  }

  return responseMessage || '학습 기록을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.'
}

function getDailyStudyRecordLookupErrorMessage(error) {
  if (error.code === 'UNAUTHORIZED') {
    return '로그인이 만료되었습니다. 다시 로그인해 주세요.'
  }

  return '학습 기록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'
}

function getDailyStudyRecordLookupErrorMessageByStatus(status, responseBody) {
  const responseMessage = getResponseMessage(responseBody)

  if (status === 401) {
    return responseMessage || '로그인이 만료되었습니다. 다시 로그인해 주세요.'
  }

  return responseMessage || '학습 기록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'
}

function getRecordStats(record) {
  const generatedTasks = Array.isArray(record.generatedTasks) ? record.generatedTasks : []
  const completedTaskIds = Array.isArray(record.completedTaskIds) ? record.completedTaskIds : []
  const actualStudyEntries = Array.isArray(record.actualStudyEntries) ? record.actualStudyEntries : []
  const totalTasks = generatedTasks.length
  const completedCount = generatedTasks.filter((task) => completedTaskIds.includes(task.id)).length
  const completionRate = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0
  const plannedMinutes = generatedTasks.reduce((total, task) => total + (Number(task.minutes) || 0), 0)
  const actualMinutes = actualStudyEntries.reduce((total, entry) => total + (Number(entry.minutes) || 0), 0)

  return {
    actualMinutes,
    completedCount,
    completionRate,
    plannedMinutes,
    totalTasks,
  }
}

function formatRecordDate(dateText) {
  return dateText ? dateText.replaceAll('-', '.') : '날짜 없음'
}

function getLocalDateString(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function createAdaptiveStudyPlanResult({ formValues, previousRecord, savedStudyPlan, selectedExam, selectedWeakAreas, weakAreaNote }) {
  const planSource = savedStudyPlan || { ...formValues, examType: selectedExam }
  const examType = planSource.examType || selectedExam
  const dailyStudyMinutes = Number(planSource.dailyStudyMinutes)
  const priorityAreaFromNote = getPriorityAreaFromNote({
    areas: WEAK_AREAS_BY_EXAM[examType] || [],
    weakAreas: selectedWeakAreas,
    weakAreaNote,
  })
  if (previousRecord) {
    return createAdaptiveDailyStudyPlan({
      examType,
      dailyStudyMinutes,
      weakAreas: selectedWeakAreas,
      previousRecord,
    })
  }

  const plan = createDailyStudyPlan({
    examType,
    dailyStudyMinutes,
    weakAreas: selectedWeakAreas,
    priorityArea: priorityAreaFromNote,
  })

  return {
    priorityArea: plan.find((item) => item.isPriority)?.area || selectedWeakAreas[0] || plan[0]?.area || '',
    reason: '저장된 이전 기록이 없어 선택한 취약 영역을 기준으로 계획을 만들었습니다.',
    previousRecordDate: null,
    plan,
  }
}

function validateScoreInputs(selectedExam, toeflScoreSystem, formValues) {
  const currentScore = formValues.currentScore.trim()
  const targetScore = formValues.targetScore.trim()
  const errors = {}

  if (!targetScore) {
    errors.targetScore = '목표 점수 또는 목표 등급을 입력해 주세요.'
    return errors
  }

  if (selectedExam === 'OPIc') {
    validateOpicScores(currentScore, targetScore, errors)
    return errors
  }

  const currentNumber = currentScore ? Number(currentScore) : null
  const targetNumber = Number(targetScore)

  if (selectedExam === 'TOEIC') {
    validateNumericScore('currentScore', currentScore, currentNumber, errors, {
      label: '현재 점수',
      min: 10,
      max: 990,
      step: 5,
      required: false,
      integerOnly: true,
    })
    validateNumericScore('targetScore', targetScore, targetNumber, errors, {
      label: '목표 점수',
      min: 10,
      max: 990,
      step: 5,
      required: true,
      integerOnly: true,
    })
  }

  if (selectedExam === 'TOEFL' && toeflScoreSystem === 'scaled') {
    validateNumericScore('currentScore', currentScore, currentNumber, errors, {
      label: '현재 점수',
      min: 1,
      max: 6,
      step: 0.5,
      required: false,
    })
    validateNumericScore('targetScore', targetScore, targetNumber, errors, {
      label: '목표 점수',
      min: 1,
      max: 6,
      step: 0.5,
      required: true,
    })
  }

  if (selectedExam === 'TOEFL' && toeflScoreSystem === 'ibt') {
    validateNumericScore('currentScore', currentScore, currentNumber, errors, {
      label: '현재 점수',
      min: 0,
      max: 120,
      step: 1,
      required: false,
      integerOnly: true,
    })
    validateNumericScore('targetScore', targetScore, targetNumber, errors, {
      label: '목표 점수',
      min: 0,
      max: 120,
      step: 1,
      required: true,
      integerOnly: true,
    })
  }

  if (selectedExam === 'TOEIC Speaking') {
    validateNumericScore('currentScore', currentScore, currentNumber, errors, {
      label: '현재 점수',
      min: 0,
      max: 200,
      step: 10,
      required: false,
      integerOnly: true,
    })
    validateNumericScore('targetScore', targetScore, targetNumber, errors, {
      label: '목표 점수',
      min: 0,
      max: 200,
      step: 10,
      required: true,
      integerOnly: true,
    })
  }

  if (currentScore && !errors.currentScore && !errors.targetScore && targetNumber <= currentNumber) {
    errors.targetScore = '목표 점수는 현재 점수보다 높아야 합니다.'
  }

  return errors
}

function validateNumericScore(fieldName, rawValue, numericValue, errors, rule) {
  if (!rawValue && !rule.required) {
    return
  }

  if (!rawValue && rule.required) {
    errors[fieldName] = `${rule.label}를 입력해 주세요.`
    return
  }

  if (!Number.isFinite(numericValue)) {
    errors[fieldName] = `${rule.label}는 숫자로 입력해 주세요.`
    return
  }

  if (rule.integerOnly && !Number.isInteger(numericValue)) {
    errors[fieldName] = `${rule.label}는 정수로 입력해 주세요.`
    return
  }

  if (numericValue < rule.min || numericValue > rule.max) {
    errors[fieldName] = `${rule.label}는 ${rule.min}~${rule.max} 범위로 입력해 주세요.`
    return
  }

  const hasValidStep =
    rule.step === 0.5
      ? Number.isInteger(numericValue * 2)
      : Number.isInteger((numericValue - rule.min) / rule.step)

  if (!hasValidStep) {
    errors[fieldName] = `${rule.label}는 ${rule.step} 단위로 입력해 주세요.`
  }
}

function validateOpicScores(currentScore, targetScore, errors) {
  const currentGradeIndex = currentScore ? OPIC_GRADES.indexOf(currentScore) : -1
  const targetGradeIndex = OPIC_GRADES.indexOf(targetScore)

  if (currentScore && currentGradeIndex === -1) {
    errors.currentScore = '현재 등급을 목록에서 선택해 주세요.'
  }

  if (targetGradeIndex === -1) {
    errors.targetScore = '목표 등급을 목록에서 선택해 주세요.'
  }

  if (currentScore && currentGradeIndex !== -1 && targetGradeIndex !== -1 && targetGradeIndex <= currentGradeIndex) {
    errors.targetScore = '목표 등급은 현재 등급보다 높아야 합니다.'
  }
}

function StartScreen({ formValues, savedStudyPlan, selectedExam, selectedWeakAreas, onNext, onSelectExam }) {
  return (
    <section className="start-layout">
      <div className="start-main">
        <ExamSelection selectedExam={selectedExam} compact onNext={onNext} onPrevious={() => {}} onSelectExam={onSelectExam} />
      </div>
      <SummaryBoard
        formValues={savedStudyPlan || formValues}
        selectedExam={selectedExam}
        selectedWeakAreas={selectedWeakAreas}
      />
    </section>
  )
}

function SummaryBoard({ formValues, selectedExam, selectedWeakAreas }) {
  return (
    <aside className="summary-board" aria-label="입력 요약">
      <div>
        <span className="board-label">선택한 시험</span>
        <strong>{selectedExam || '선택 전'}</strong>
      </div>
      <div className="summary-metric-grid">
        <SummaryMetric label="현재 점수" value={formValues.currentScore || '아직 입력되지 않았어요'} />
        <SummaryMetric label="목표 점수" value={formValues.targetScore || '아직 입력되지 않았어요'} />
        <SummaryMetric
          label="하루 학습"
          value={formValues.dailyStudyMinutes ? `${formValues.dailyStudyMinutes}분` : '아직 입력되지 않았어요'}
        />
      </div>
      <div>
        <span className="board-label">취약 영역</span>
        <div className="tag-list">
          {selectedWeakAreas.length > 0 ? (
            selectedWeakAreas.map((area) => (
              <span className="weak-tag" key={area}>
                {area}
              </span>
            ))
          ) : (
            <span className="empty-text">선택 전</span>
          )}
        </div>
      </div>
    </aside>
  )
}

function SummaryMetric({ label, value }) {
  return (
    <div className="summary-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function IntroScreen() {
  return (
    <section className="feature-section">
      <div className="section-head">
        <h2>서비스 소개</h2>
        <p>대학생의 어학시험 준비 조건을 빠르게 정리하고, 오늘 확인할 학습 계획으로 이어지는 화면입니다.</p>
      </div>
      <div className="feature-grid">
        <article className="feature-card">
          <div className="feature-header">
            <span className="feature-badge">1</span>
            <h3>시험과 목표 정리</h3>
          </div>
          <p className="feature-description">
            TOEIC, OPIc, TOEIC Speaking, TOEFL 중 준비할 시험을 고르고 목표 점수 또는 등급을 입력합니다.
          </p>
        </article>
        <article className="feature-card">
          <div className="feature-header">
            <span className="feature-badge">2</span>
            <h3>현재 상태 선택 입력</h3>
          </div>
          <p className="feature-description">
            현재 점수나 등급은 사용자가 공개하고 싶을 때만 입력하고, 목표 값은 시험별 규칙에 맞춰 확인합니다.
          </p>
        </article>
        <article className="feature-card">
          <div className="feature-header">
            <span className="feature-badge">3</span>
            <h3>저장 결과 확인</h3>
          </div>
          <p className="feature-description">
            입력한 정보가 서버와 Supabase에 저장된 뒤 다시 조회된 결과를 학습 계획 화면에서 확인합니다.
          </p>
        </article>
      </div>
    </section>
  )
}

function ExamSelection({ compact = false, selectedExam, onNext, onPrevious, onSelectExam }) {
  const [hasSelectedExam, setHasSelectedExam] = useState(Boolean(selectedExam))

  return (
    <section className={compact ? 'start-exam-section exam-section-compact' : 'exam-section'}>
      <div className="section-head">
        <h2>시험 선택</h2>
        <p>준비할 시험을 선택하면 다음 입력 단계에서 같은 시험 기준의 정보가 저장됩니다.</p>
      </div>

      <div className="exam-grid">
        {EXAMS.map((exam) => {
          const isSelected = selectedExam === exam.name

          return (
            <button
              aria-pressed={isSelected}
              className={`exam-card ${isSelected ? 'exam-card-selected' : ''}`}
              key={exam.name}
              type="button"
              onClick={() => {
                setHasSelectedExam(true)
                onSelectExam(exam.name)
              }}
            >
              <h3 className="exam-title">{exam.name}</h3>
              <p className="exam-description">{exam.description}</p>
              <ul className="exam-meta">
                {exam.tags.map((tag) => (
                  <li key={tag}>{tag}</li>
                ))}
              </ul>
            </button>
          )
        })}
      </div>
      <div className="form-actions">
        {!compact && (
          <button className="secondary-action" type="button" onClick={onPrevious}>
            이전
          </button>
        )}
        <button className="primary-action" type="button" disabled={!hasSelectedExam || !selectedExam} onClick={onNext}>
          다음
        </button>
      </div>
    </section>
  )
}

function InfoInput({
  errorMessage,
  fieldErrors,
  formValues,
  isSaving,
  scoreStatus,
  selectedExam,
  toeflScoreSystem,
  onNext,
  onPrevious,
  onScoreStatusChange,
  onToeflScoreSystemChange,
  onUpdate,
}) {
  return (
    <section className="form-section">
      <div className="section-head">
        <h2>정보 입력</h2>
        <p>{selectedExam} 준비에 필요한 기본 정보를 입력하면 서버에 저장하고 DB 결과를 다시 불러옵니다.</p>
      </div>

      {selectedExam === 'TOEFL' && (
        <div className="toefl-score-system">
          <span className="input-label">TOEFL 점수 체계</span>
          <SegmentedOptionGroup
            ariaLabel="TOEFL 점수 체계"
            options={Object.entries(TOEFL_SCORE_SYSTEMS).map(([value, option]) => ({
              label: option.label,
              value,
            }))}
            selectedValue={toeflScoreSystem}
            onSelect={onToeflScoreSystemChange}
          />
        </div>
      )}

      <SegmentedOptionGroup
        ariaLabel="점수 보유 여부"
        options={[
          { label: '공식 또는 모의 점수가 있어요', value: SCORE_STATUS.hasScore },
          { label: '아직 점수가 없어요', value: SCORE_STATUS.noScore },
        ]}
        selectedValue={scoreStatus}
        onSelect={onScoreStatusChange}
      />

      <div className={`input-grid ${selectedExam === 'OPIc' ? 'opic-score-grid' : ''}`}>
        {scoreStatus === SCORE_STATUS.hasScore && (
          <ScoreField
            errorMessage={fieldErrors.currentScore}
            fieldName="currentScore"
            label={selectedExam === 'OPIc' ? '현재 등급' : '현재 점수'}
            selectedExam={selectedExam}
            toeflScoreSystem={toeflScoreSystem}
            value={formValues.currentScore}
            onUpdate={onUpdate}
          />
        )}
        <ScoreField
          errorMessage={fieldErrors.targetScore}
          fieldName="targetScore"
          label={selectedExam === 'OPIc' ? '목표 등급' : '목표 점수'}
          selectedExam={selectedExam}
          toeflScoreSystem={toeflScoreSystem}
          value={formValues.targetScore}
          onUpdate={onUpdate}
        />
        <label className="input-field">
          <span>시험일</span>
          <input type="date" value={formValues.examDate} onChange={(event) => onUpdate('examDate', event.target.value)} />
        </label>
        <label className="input-field">
          <span>하루 공부 시간(분)</span>
          <input
            min="1"
            max="720"
            type="number"
            value={formValues.dailyStudyMinutes}
            placeholder="예: 120"
            onChange={(event) => onUpdate('dailyStudyMinutes', event.target.value)}
          />
        </label>
      </div>

      {errorMessage && <p className="form-message form-message-error">{errorMessage}</p>}

      <div className="form-actions">
        <button className="secondary-action" type="button" onClick={onPrevious}>
          이전
        </button>
        <button className="primary-action" type="button" disabled={isSaving} onClick={onNext}>
          다음
        </button>
      </div>
    </section>
  )
}

function SegmentedOptionGroup({ ariaLabel, options, selectedValue, onSelect }) {
  return (
    <div aria-label={ariaLabel} className="segmented-control" role="group">
      {options.map((option) => (
        <button
          aria-pressed={selectedValue === option.value}
          className={`segmented-button ${selectedValue === option.value ? 'option-button-selected' : ''}`}
          key={option.value}
          type="button"
          onClick={() => onSelect(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

function ScoreField({ errorMessage, fieldName, label, selectedExam, toeflScoreSystem, value, onUpdate }) {
  const inputId = `${fieldName}-input`
  const errorId = `${fieldName}-error`

  if (selectedExam === 'OPIc') {
    return (
      <div className="input-field">
        <span>{label}</span>
        <div
          aria-describedby={errorMessage ? errorId : undefined}
          aria-label={label}
          className="grade-button-grid"
          role="group"
        >
          {OPIC_GRADES.map((grade) => {
            const isSelected = value === grade
            const nextValue = fieldName === 'currentScore' && isSelected ? '' : grade

            return (
              <button
                aria-pressed={isSelected}
                className={`grade-button ${isSelected ? 'option-button-selected' : ''}`}
                key={grade}
                type="button"
                onClick={() => onUpdate(fieldName, nextValue)}
              >
                {grade}
              </button>
            )
          })}
        </div>
        {errorMessage && (
          <span className="form-message form-message-error" id={errorId}>
            {errorMessage}
          </span>
        )}
      </div>
    )
  }

  return (
    <label className="input-field" htmlFor={inputId}>
      <span>{label}</span>
      <input
        aria-describedby={errorMessage ? errorId : undefined}
        aria-invalid={Boolean(errorMessage)}
        id={inputId}
        type="number"
        value={value}
        placeholder={getScorePlaceholder(selectedExam, toeflScoreSystem)}
        onChange={(event) => onUpdate(fieldName, event.target.value)}
      />
      {errorMessage && (
        <span className="form-message form-message-error" id={errorId}>
          {errorMessage}
        </span>
      )}
    </label>
  )
}

function getScorePlaceholder(selectedExam, toeflScoreSystem) {
  if (selectedExam === 'TOEFL') {
    return TOEFL_SCORE_SYSTEMS[toeflScoreSystem].placeholder
  }

  if (selectedExam === 'TOEIC Speaking') {
    return '예: 140'
  }

  return '예: 650'
}

function DiagnosisScreen({
  errorMessage,
  isSaving,
  selectedExam,
  selectedWeakAreas,
  weakAreaNote,
  onCreatePlan,
  onNoteChange,
  onPrevious,
  onToggleWeakArea,
}) {
  const weakAreas = WEAK_AREAS_BY_EXAM[selectedExam] || []

  function toggleWeakArea(area) {
    onToggleWeakArea((currentAreas) => {
      if (currentAreas.includes(area)) {
        return currentAreas.filter((selectedArea) => selectedArea !== area)
      }

      return [...currentAreas, area]
    })
  }

  return (
    <section className="split-section diagnosis-section">
      <div>
        <div className="section-head">
          <h2>취약 영역 진단</h2>
          <p>{selectedExam}에서 우선 보완할 영역을 선택하고, 구체적인 어려움을 적어 주세요.</p>
        </div>

        <div className="weak-grid">
          {weakAreas.map((area, index) => {
            const isSelected = selectedWeakAreas.includes(area)

            return (
              <button
                aria-pressed={isSelected}
                className={isSelected ? 'weak-card weak-card-active' : 'weak-card'}
                key={area}
                type="button"
                onClick={() => toggleWeakArea(area)}
              >
                <span className="weak-icon" aria-hidden="true">
                  {isSelected ? '✓' : `0${index + 1}`}
                </span>
                <strong>{area}</strong>
                <span>오늘 계획에 우선 반영</span>
              </button>
            )
          })}
        </div>

        <label className="input-field weak-note">
          <span>구체적으로 어떤 점이 어렵나요?</span>
          <textarea
            value={weakAreaNote}
            placeholder="예: 들은 내용을 바로 이해하기 어렵거나, 질문을 듣고 문장을 바로 만들기 어려워요."
            onChange={(event) => onNoteChange(event.target.value)}
          />
        </label>
        {errorMessage && <p className="form-message form-message-error">{errorMessage}</p>}
        <div className="form-actions">
          <button className="secondary-action" type="button" onClick={onPrevious}>
            이전
          </button>
          <button className="primary-action" type="button" disabled={isSaving || selectedWeakAreas.length === 0} onClick={onCreatePlan}>
            {isSaving ? '저장 중...' : '학습 계획 생성하기'}
          </button>
        </div>
      </div>
      <aside className="summary-card">
        <span className="board-label">선택 영역</span>
        <div className="tag-list">
          {selectedWeakAreas.length > 0 ? (
            selectedWeakAreas.map((area) => (
              <span className="weak-tag weak-tag-selected" key={area}>
                {area}
              </span>
            ))
          ) : (
            <span className="empty-text">취약 영역을 선택해 주세요</span>
          )}
        </div>
      </aside>
    </section>
  )
}

function PlanDashboard({
  adaptivePlanError,
  adaptiveStudyPlan,
  formValues,
  savedStudyPlan,
  selectedExam,
  isAuthenticated,
  previousRecord,
  onEditInfo,
  onViewToday,
}) {
  const planSource = savedStudyPlan || { ...formValues, examType: selectedExam }
  const dailyMinutes = Number(planSource.dailyStudyMinutes) || 120
  const dailyPlan = adaptiveStudyPlan.plan
  const priorityArea = adaptiveStudyPlan.priorityArea || dailyPlan.find((item) => item.isPriority)?.area || dailyPlan[0]?.area || '기본기'
  const daysLeft = getDaysLeft(planSource.examDate)

  return (
    <section className="split-section dashboard-section">
      <div>
        <div className="section-head">
          <h2>학습 계획</h2>
          <p>
            {planSource.currentScore
              ? `현재 ${planSource.currentScore}에서 목표 ${planSource.targetScore || '미입력'}을 준비하고 있으며, 시험까지 ${daysLeft} 남았습니다.`
              : `현재 점수 없이 목표 ${planSource.targetScore || '미입력'}을 준비하고 있으며, 시험까지 ${daysLeft} 남았습니다.`}
          </p>
        </div>
        <div className="result-panel compact-results">
          <article className="result-item priority-result">
            <span>우선 학습 영역</span>
            <strong>{priorityArea}</strong>
          </article>
          <ResultItem label="현재 점수" value={planSource.currentScore || '미입력'} />
          <ResultItem label="목표 점수" value={planSource.targetScore || '미입력'} />
          <ResultItem label="하루 학습 시간" value={`${dailyMinutes}분`} />
        </div>
        <div className="bar-list">
          {dailyPlan.map((item) => (
            <div className="bar-row" key={item.area}>
              <span>{item.area}</span>
              <div className="bar-track">
                <span style={{ width: `${Math.max(8, Math.round((item.minutes / dailyMinutes) * 100))}%` }} />
              </div>
              <strong>{Math.round((item.minutes / dailyMinutes) * 100)}%</strong>
            </div>
          ))}
        </div>
        <section className="adaptive-plan-panel">
          <div className="section-head record-head">
            <h3>이전 학습 기록 반영</h3>
            <p>{adaptivePlanError || adaptiveStudyPlan.reason}</p>
          </div>
          <div className="result-panel compact-results">
            <ResultItem label="오늘 우선 영역" value={priorityArea || '기록 없음'} />
            <ResultItem label="이전 기록 날짜" value={previousRecord?.studyDate ? formatRecordDate(previousRecord.studyDate) : '기록 없음'} />
            <ResultItem label="조정 상태" value={previousRecord ? '이전 기록 반영' : '기본 계획'} />
            <ResultItem label="영역 수" value={`${dailyPlan.length}개`} />
          </div>
        </section>
        <div className="form-actions">
          <button className="secondary-action" type="button" onClick={onEditInfo}>
            입력 정보 수정
          </button>
          <button className="primary-action" type="button" onClick={onViewToday}>
            오늘의 학습 보기
          </button>
        </div>
      </div>
      <aside className="summary-card weekly-goal-card">
        <span className="board-label">이번 주 핵심 목표</span>
        <strong>{priorityArea} 루틴 고정</strong>
        <p>매일 {Math.max(20, Math.round(dailyMinutes * 0.35))}분 이상을 우선 영역에 배정하고, 오답 원인을 한 줄로 남깁니다.</p>
        {!isAuthenticated && <p>학습 기록을 저장하고 다음 계획에 반영하려면 로그인해 주세요.</p>}
        {savedStudyPlan?.id && (
          <div className="result-item saved-id">
            <span>저장된 데이터 id</span>
            <strong>{savedStudyPlan.id}</strong>
          </div>
        )}
      </aside>
    </section>
  )
}

function ResultItem({ label, value }) {
  return (
    <div className="result-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function DailyStudyRecordsScreen({
  errorMessage,
  isLoading,
  records,
  selectedRecord,
  onBackToList,
  onSelectRecord,
}) {
  if (selectedRecord) {
    const stats = getRecordStats(selectedRecord)

    return (
      <section className="dashboard-section record-history-section">
        <div className="section-head">
          <div>
            <h2>{formatRecordDate(selectedRecord.studyDate)} · {selectedRecord.examType || '시험 정보 없음'}</h2>
            <p>{stats.completedCount}/{stats.totalTasks}개 완료 · 달성률 {stats.completionRate}%</p>
          </div>
          <button className="secondary-action" type="button" onClick={onBackToList}>
            목록으로 돌아가기
          </button>
        </div>

        {errorMessage && <p className="form-message form-message-error">{errorMessage}</p>}
        {isLoading && <p className="empty-text">학습 기록을 불러오는 중입니다.</p>}

        <div className="record-detail-grid">
          <section className="record-detail-panel">
            <h3>체크리스트</h3>
            <div className="task-list">
              {(selectedRecord.generatedTasks || []).map((task) => {
                const isCompleted = (selectedRecord.completedTaskIds || []).includes(task.id)

                return (
                  <div className={`history-task-item ${isCompleted ? 'history-task-done' : ''}`} key={task.id}>
                    <span>{isCompleted ? '완료' : '미완료'}</span>
                    <strong>{task.title}</strong>
                    <em>{task.area}</em>
                    <b>{task.minutes}분</b>
                  </div>
                )
              })}
            </div>
          </section>

          <section className="record-detail-panel">
            <h3>체크리스트 외 실제 학습</h3>
            {(selectedRecord.actualStudyEntries || []).length > 0 ? (
              <div className="actual-entry-list">
                {selectedRecord.actualStudyEntries.map((entry) => (
                  <div className="actual-entry-item" key={entry.id}>
                    <span>{entry.area}</span>
                    <strong>{entry.title}</strong>
                    <em>{entry.minutes}분</em>
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty-text">추가 학습 기록이 없습니다.</p>
            )}
          </section>
        </div>

        <div className="record-reflection-grid">
          <ResultItem label="오늘 가장 어려웠던 영역" value={selectedRecord.difficultArea || '기록 없음'} />
          <ResultItem label="내일 더 공부하고 싶었던 영역" value={selectedRecord.nextPriorityArea || '기록 없음'} />
          <ResultItem label="오늘의 메모" value={selectedRecord.reflectionNote || '기록 없음'} />
        </div>
      </section>
    )
  }

  return (
    <section className="dashboard-section record-history-section">
      <div className="section-head">
        <div>
          <h2>학습 기록</h2>
          <p>저장한 날짜별 학습 결과를 최신 순으로 확인합니다.</p>
        </div>
      </div>

      {isLoading && <p className="empty-text">학습 기록을 불러오는 중입니다.</p>}
      {errorMessage && <p className="form-message form-message-error">{errorMessage}</p>}
      {!isLoading && !errorMessage && records.length === 0 && (
        <p className="empty-text">아직 저장된 학습 기록이 없습니다. 오늘의 학습을 완료하고 첫 기록을 남겨 보세요.</p>
      )}

      {!isLoading && !errorMessage && records.length > 0 && (
        <div className="record-history-list">
          {records.map((record) => {
            const stats = getRecordStats(record)

            return (
              <article className="record-history-card" key={record.id}>
                <div>
                  <h3>{formatRecordDate(record.studyDate)} · {record.examType || '시험 정보 없음'}</h3>
                  <p>{stats.completedCount}/{stats.totalTasks}개 완료 · 달성률 {stats.completionRate}%</p>
                  <p>계획 {stats.plannedMinutes}분 · 추가 학습 {stats.actualMinutes}분</p>
                  <p>어려웠던 영역 {record.difficultArea || '기록 없음'}</p>
                  <p>다음 우선 영역 {record.nextPriorityArea || '기록 없음'}</p>
                </div>
                <button className="primary-action" type="button" onClick={() => onSelectRecord(record.id)}>
                  자세히 보기
                </button>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}

function TodayStudy({
  actualStudyEntries,
  actualStudyForm,
  completedTasks,
  difficultArea,
  formValues,
  isAuthenticated,
  isSavingStudyRecord,
  nextPriorityArea,
  reflectionNote,
  savedStudyPlan,
  selectedExam,
  studyRecordMessage,
  tasks,
  onActualStudyFormChange,
  onAddActualStudyEntry,
  onDifficultAreaChange,
  onNextPriorityAreaChange,
  onReflectionNoteChange,
  onRemoveActualStudyEntry,
  onSaveStudyRecord,
  onToggleTask,
}) {
  const planSource = savedStudyPlan || { ...formValues, examType: selectedExam }
  const examType = planSource.examType || selectedExam
  const studyAreas = WEAK_AREAS_BY_EXAM[examType] || []
  const actualArea = actualStudyForm.area || studyAreas[0] || ''
  const completedCount = completedTasks.length
  const remainingCount = tasks.length - completedCount
  const progress = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0
  const dailyMinutes = tasks.reduce((total, task) => total + task.minutes, 0)
  const daysLeft = getDaysLeft(planSource.examDate)

  function toggleTask(task) {
    onToggleTask((currentTasks) =>
      currentTasks.includes(task.id) ? currentTasks.filter((item) => item !== task.id) : [...currentTasks, task.id],
    )
  }

  return (
    <section className="split-section today-section">
      <div>
        <div className="section-head">
          <h2>오늘의 학습</h2>
          <p>지금 바로 실행할 수 있는 항목만 체크리스트로 정리했습니다.</p>
        </div>
        <div className="task-list">
          {tasks.map((task) => {
            const isDone = completedTasks.includes(task.id)

            return (
              <label className={`task-item ${isDone ? 'task-item-done' : ''}`} key={task.id}>
                <input checked={isDone} type="checkbox" onChange={() => toggleTask(task)} />
                <span>{task.title}</span>
                <strong>{task.minutes}분</strong>
              </label>
            )
          })}
        </div>
        <section className="study-record-panel" aria-labelledby="study-record-title">
          <div className="section-head record-head">
            <h3 id="study-record-title">오늘 학습 기록</h3>
            <p>체크리스트와 별도로 실제 공부한 내용을 남겨 둡니다.</p>
          </div>

          <div className="record-entry-grid">
            <label className="input-field">
              <span>영역 선택</span>
              <select value={actualArea} onChange={(event) => onActualStudyFormChange('area', event.target.value)}>
                {studyAreas.map((area) => (
                  <option key={area} value={area}>
                    {area}
                  </option>
                ))}
              </select>
            </label>

            <label className="input-field">
              <span>학습 내용</span>
              <input
                type="text"
                value={actualStudyForm.title}
                placeholder="예: Part 3 오답 복습"
                onChange={(event) => onActualStudyFormChange('title', event.target.value)}
              />
            </label>

            <label className="input-field">
              <span>실제 공부 시간(분)</span>
              <input
                min="1"
                type="number"
                value={actualStudyForm.minutes}
                onChange={(event) => onActualStudyFormChange('minutes', event.target.value)}
              />
            </label>

            <button className="primary-action add-record-button" type="button" onClick={onAddActualStudyEntry}>
              추가하기
            </button>
          </div>

          <div className="actual-entry-list" aria-label="추가된 학습 항목">
            {actualStudyEntries.length > 0 ? (
              actualStudyEntries.map((entry) => (
                <div className="actual-entry-item" key={entry.id}>
                  <span>{entry.area}</span>
                  <strong>{entry.title}</strong>
                  <em>{entry.minutes}분</em>
                  <button className="secondary-action" type="button" onClick={() => onRemoveActualStudyEntry(entry.id)}>
                    삭제
                  </button>
                </div>
              ))
            ) : (
              <p className="empty-text">추가된 학습 기록이 없습니다.</p>
            )}
          </div>

          <div className="record-select-grid">
            <label className="input-field">
              <span>오늘 가장 어려웠던 영역</span>
              <select value={difficultArea} onChange={(event) => onDifficultAreaChange(event.target.value)}>
                <option value="">선택 전</option>
                {studyAreas.map((area) => (
                  <option key={area} value={area}>
                    {area}
                  </option>
                ))}
              </select>
            </label>

            <label className="input-field">
              <span>내일 더 공부하고 싶은 영역</span>
              <select value={nextPriorityArea} onChange={(event) => onNextPriorityAreaChange(event.target.value)}>
                <option value="">선택 전</option>
                {studyAreas.map((area) => (
                  <option key={area} value={area}>
                    {area}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="input-field">
            <span>오늘의 메모</span>
            <textarea
              value={reflectionNote}
              placeholder="오늘 공부하면서 느낀 점을 적어 주세요."
              onChange={(event) => onReflectionNoteChange(event.target.value)}
            />
          </label>

          {studyRecordMessage && (
            <p className={`form-message ${isAuthenticated ? 'form-message-success' : 'form-message-error'}`}>
              {studyRecordMessage}
            </p>
          )}

          <div className="form-actions">
            <button className="primary-action" type="button" disabled={isSavingStudyRecord} onClick={onSaveStudyRecord}>
              {isSavingStudyRecord ? '저장 중...' : '오늘 학습 기록 저장하기'}
            </button>
          </div>
        </section>
      </div>
      <aside className="summary-card progress-card">
        <div className="circle-progress" style={{ '--progress': `${progress}%` }}>
          <strong>{progress}%</strong>
        </div>
        <p>{completedCount}/{tasks.length}개 완료</p>
        <div className="summary-metric-grid">
          <SummaryMetric label="남은 항목" value={`${remainingCount}개`} />
          <SummaryMetric label="총 학습 시간" value={`${dailyMinutes}분`} />
          <SummaryMetric label="시험까지" value={daysLeft} />
        </div>
      </aside>
    </section>
  )
}

function getDaysLeft(examDate) {
  if (!examDate) {
    return '미입력'
  }

  const today = new Date()
  const targetDate = new Date(`${examDate}T00:00:00`)
  const daysLeft = Math.ceil((targetDate - today) / 86400000)

  if (!Number.isFinite(daysLeft)) {
    return '미입력'
  }

  return daysLeft >= 0 ? `D-${daysLeft}` : '종료'
}

export default ProjectIntro
