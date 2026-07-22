import { useCallback, useEffect, useRef, useState } from 'react'
import {
  catAssistantAssets,
  catStageAssetPaths,
  defaultSpeechStyleFor,
  emailDraftFieldMaxLengths,
  emailTemplateCandidatesFor,
  emptyEmailDraftInput,
  guidedContextQuestionFor,
  isContactChannel,
  isEmailSituationId,
  isSituationForScenario,
  isSituationId,
  isSpeechStyleAllowed,
  isSpeechStyleId,
  isToneLevel,
  scenarios,
  situationCardsFor,
  speechStyles,
  templateCandidatesFor,
  type Candidate,
  type ContactChannel,
  type ContextAnswer,
  type EmailCandidate,
  type EmailDraftInput,
  type EmailSituationId,
  type Mode,
  type PurposeId,
  type Scenario,
  type ScenarioId,
  type SpeechStyleId,
  type SituationId,
  type Source,
  type Step,
  type ToneLevel,
} from '../../entities/message'
import {
  generateWithMock,
  isValidGenerationResponse,
  type GenerationErrorCode,
  type GenerationResult,
  type GenerationRoute,
  type MockGenerationCase,
} from '../../shared/generation'
import { ModeSelect } from '../../features/mode-select'
import { ScenarioSelect } from '../../features/scenario-select'
import { SituationSelect } from '../../features/situation-select'
import {
  GenerateButton,
  GenerationErrorNotice,
  PurposeSelect,
  ReceivedMessageInput,
  SpeechStyleSelect,
  SituationInput,
} from '../../features/manual-input'
import { ResultList } from '../../features/copy-result'
import { AssistantPrompt, GuidedChatFrame } from '../../features/guided-chat'
import { CatStage, type CatStageState } from '../../features/cat-stage'
import { EmailDetailsForm, EmailResultList } from '../../features/email-compose'
import { GuidedContextStep } from '../../features/guided-context'
import { ResultRefinementPanel } from '../../features/result-refinement'
import {
  reportInteraction,
  type InteractionEvent,
  type InteractionEventName,
  type InteractionReporter,
  type InteractionResultRoute,
} from '../../shared/interaction'

type ResultRoute = GenerationRoute | 'email_template' | null
type FallbackReason = 'guided_generation_failed' | null

type ResultSnapshot = {
  candidates: Candidate[]
  source: Source
  resultRoute: GenerationRoute
  fallbackReason: FallbackReason
  contextAnswer: ContextAnswer | null
}

type FlowState = {
  step: Step
  mode: Mode | null
  selectedScenarioId: ScenarioId | null
  selectedPurposeId: PurposeId | null
  speechStyleId: SpeechStyleId | null
  contactChannel: ContactChannel | null
  selectedSituationId: SituationId | null
  selectedContextAnswer: ContextAnswer | null
  selectedEmailSituationId: EmailSituationId | null
  emailDraftInput: EmailDraftInput
  receivedMessage: string
  situation: string
  candidates: Candidate[]
  emailCandidates: EmailCandidate[]
  source: Source
  resultRoute: ResultRoute
  fallbackReason: FallbackReason
}

type StoredFlowState = FlowState & {
  savedAt: number
}

type GenerationStatus = 'idle' | 'loading' | 'error'

const storageKey = 'dabnyangi:flow'
const flowStorageTtlMs = 30 * 60 * 1000
const generationTimeoutMs = 20_000
const developmentGenerationCase: MockGenerationCase = 'normal'
const loadingMessages = ['보낼 말 3가지를 만들고 있어요.', '아직 만들고 있어요.']

const generateWithTimeout = (
  request: Parameters<typeof generateWithMock>[0],
  generationCase: MockGenerationCase,
): Promise<GenerationResult> =>
  new Promise((resolve) => {
    const timeout = window.setTimeout(() => {
      resolve({ ok: false, error: 'timeout' })
    }, generationTimeoutMs)

    void generateWithMock(request, generationCase)
      .then((result) => {
        window.clearTimeout(timeout)
        resolve(result)
      })
      .catch(() => {
        window.clearTimeout(timeout)
        resolve({ ok: false, error: 'generation_failed' })
      })
  })

const initialFlowState: FlowState = {
  step: 'mode',
  mode: null,
  selectedScenarioId: null,
  selectedPurposeId: null,
  speechStyleId: null,
  contactChannel: null,
  selectedSituationId: null,
  selectedContextAnswer: null,
  selectedEmailSituationId: null,
  emailDraftInput: { ...emptyEmailDraftInput },
  receivedMessage: '',
  situation: '',
  candidates: [],
  emailCandidates: [],
  source: 'template',
  resultRoute: null,
  fallbackReason: null,
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null

const emailDraftInputFrom = (value: unknown): EmailDraftInput => {
  if (!isRecord(value)) return { ...emptyEmailDraftInput }

  const draftInput: EmailDraftInput = {
    recipientName: typeof value.recipientName === 'string' ? value.recipientName : '',
    department: typeof value.department === 'string' ? value.department : '',
    studentId: typeof value.studentId === 'string' ? value.studentId : '',
    studentName: typeof value.studentName === 'string' ? value.studentName : '',
    details: typeof value.details === 'string' ? value.details : '',
    availableTimes: typeof value.availableTimes === 'string' ? value.availableTimes : '',
    meetingMethod: typeof value.meetingMethod === 'string' ? value.meetingMethod : '',
  }

  for (const field of Object.keys(emailDraftFieldMaxLengths) as (keyof EmailDraftInput)[]) {
    if (draftInput[field].length > emailDraftFieldMaxLengths[field]) return { ...emptyEmailDraftInput }
  }
  return draftInput
}

const isStoredEmailCandidates = (value: unknown): value is EmailCandidate[] =>
  Array.isArray(value) &&
  (value.length === 0 || value.length === 3) &&
  value.every(
    (candidate, index) =>
      isRecord(candidate) &&
      isToneLevel(candidate.toneLevel) &&
      candidate.toneLevel === index + 1 &&
      typeof candidate.toneLabel === 'string' &&
      candidate.toneLabel.trim().length > 0 &&
      typeof candidate.subject === 'string' &&
      candidate.subject.trim().length > 0 &&
      typeof candidate.body === 'string' &&
      candidate.body.trim().length > 0,
  )

const loadFlowState = (): FlowState => {
  if (typeof window === 'undefined') return initialFlowState

  try {
    const savedValue: unknown = JSON.parse(window.sessionStorage.getItem(storageKey) ?? 'null')
    if (
      !isRecord(savedValue) ||
      !['mode', 'scenario', 'situation', 'context', 'email-details', 'manual', 'result'].includes(
        String(savedValue.step),
      ) ||
      ![null, 'reply', 'initiate'].includes(savedValue.mode as Mode | null) ||
      ![null, 'groupwork', 'professor', 'senior', 'friend'].includes(savedValue.selectedScenarioId as ScenarioId | null) ||
      ![null, 'ask', 'apologize', 'decline', 'question', 'suggest', 'other'].includes(
        savedValue.selectedPurposeId as PurposeId | null,
      ) ||
      typeof savedValue.receivedMessage !== 'string' ||
      typeof savedValue.situation !== 'string' ||
      !['template', 'ai'].includes(String(savedValue.source)) ||
      typeof savedValue.savedAt !== 'number' ||
      !Number.isFinite(savedValue.savedAt) ||
      savedValue.savedAt > Date.now() ||
      Date.now() - savedValue.savedAt > flowStorageTtlMs ||
      !Array.isArray(savedValue.candidates) ||
      (savedValue.emailCandidates !== undefined && !isStoredEmailCandidates(savedValue.emailCandidates)) ||
      (savedValue.candidates.length > 0 &&
        !isValidGenerationResponse({
          source: savedValue.source,
          candidates: savedValue.candidates,
        }))
    ) {
      return initialFlowState
    }

    const savedScenarioId = savedValue.selectedScenarioId as ScenarioId | null
    const savedContactChannel: ContactChannel | null =
      savedScenarioId === 'professor'
        ? isContactChannel(savedValue.contactChannel)
          ? savedValue.contactChannel
          : null
        : savedScenarioId
          ? 'messenger'
          : null
    const savedSpeechStyleId =
      savedScenarioId &&
      isSpeechStyleId(savedValue.speechStyleId) &&
      isSpeechStyleAllowed(savedScenarioId, savedValue.speechStyleId)
        ? savedValue.speechStyleId
        : null
    const savedSituationId =
      savedScenarioId &&
      isSituationId(savedValue.selectedSituationId) &&
      isSituationForScenario(savedScenarioId, savedValue.selectedSituationId)
        ? savedValue.selectedSituationId
        : null
    const savedQuestion =
      savedScenarioId && savedSituationId ? guidedContextQuestionFor(savedScenarioId, savedSituationId) : null
    let savedContextAnswer: ContextAnswer | null = null
    if (savedQuestion && isRecord(savedValue.selectedContextAnswer)) {
      const savedQuestionId = savedValue.selectedContextAnswer.questionId
      const savedOptionId = savedValue.selectedContextAnswer.optionId
      if (
        savedQuestionId === savedQuestion.id &&
        typeof savedOptionId === 'string' &&
        savedQuestion.options.some((option) => option.id === savedOptionId)
      ) {
        savedContextAnswer = { questionId: savedQuestion.id, optionId: savedOptionId }
      }
    }
    const savedResultRoute: ResultRoute = [
      'template_fallback',
      'guided_ai',
      'manual_ai',
      'email_template',
    ].includes(String(savedValue.resultRoute))
      ? (savedValue.resultRoute as Exclude<ResultRoute, null>)
      : savedValue.source === 'ai'
        ? 'manual_ai'
        : null

    const savedFlow: FlowState = {
      step: savedValue.step as Step,
      mode: savedValue.mode as Mode | null,
      selectedScenarioId: savedScenarioId,
      selectedPurposeId: savedValue.selectedPurposeId as PurposeId | null,
      speechStyleId: savedSpeechStyleId,
      contactChannel: savedContactChannel,
      selectedSituationId: savedSituationId,
      selectedContextAnswer: savedContextAnswer,
      selectedEmailSituationId: isEmailSituationId(savedValue.selectedEmailSituationId)
        ? savedValue.selectedEmailSituationId
        : null,
      emailDraftInput: emailDraftInputFrom(savedValue.emailDraftInput),
      receivedMessage: savedValue.receivedMessage,
      situation: savedValue.situation,
      candidates: savedValue.candidates,
      emailCandidates: isStoredEmailCandidates(savedValue.emailCandidates) ? savedValue.emailCandidates : [],
      source: savedValue.source as Source,
      resultRoute: savedResultRoute,
      fallbackReason:
        savedResultRoute === 'guided_ai' &&
        savedValue.source === 'template' &&
        (savedValue.fallbackReason === 'guided_generation_failed' || savedValue.guidedFallbackUsed === true)
          ? 'guided_generation_failed'
          : null,
    }

    if (
      (savedFlow.step !== 'mode' && !savedFlow.mode) ||
      (['situation', 'context', 'email-details', 'manual', 'result'].includes(savedFlow.step) &&
        !savedFlow.selectedScenarioId)
    ) {
      return initialFlowState
    }

    if (
      savedFlow.selectedScenarioId === 'professor' &&
      savedFlow.contactChannel === null &&
      ['situation', 'context', 'email-details', 'manual', 'result'].includes(savedFlow.step)
    ) {
      return {
        ...savedFlow,
        step: 'situation',
        candidates: [],
        emailCandidates: [],
      }
    }

    if (savedFlow.contactChannel === 'email') {
      if (savedFlow.step === 'manual' || savedFlow.step === 'context') {
        return {
          ...savedFlow,
          step: 'situation',
          selectedSituationId: null,
          selectedContextAnswer: null,
          candidates: [],
          emailCandidates: [],
        }
      }
      if (savedFlow.step === 'email-details' && savedFlow.selectedEmailSituationId === null) {
        return { ...savedFlow, step: 'situation', candidates: [], emailCandidates: [] }
      }
      if (savedFlow.step === 'result') {
        const restoredEmailCandidates = savedFlow.selectedEmailSituationId
          ? emailTemplateCandidatesFor(savedFlow.selectedEmailSituationId, savedFlow.emailDraftInput)
          : null
        if (!restoredEmailCandidates || savedFlow.emailCandidates.length !== 3) {
          return {
            ...savedFlow,
            step: savedFlow.selectedEmailSituationId ? 'email-details' : 'situation',
            candidates: [],
            emailCandidates: [],
          }
        }
        return { ...savedFlow, candidates: [], emailCandidates: restoredEmailCandidates }
      }
      return { ...savedFlow, candidates: [], emailCandidates: [] }
    }

    if (savedFlow.step === 'email-details') {
      return { ...savedFlow, step: 'situation', emailCandidates: [] }
    }

    if (savedFlow.step === 'context' && savedFlow.selectedSituationId === null) {
      return { ...savedFlow, step: 'situation', selectedContextAnswer: null }
    }

    if (savedFlow.step === 'result' && savedFlow.candidates.length !== 3) return initialFlowState

    if (
      savedFlow.step === 'result' &&
      ((savedFlow.resultRoute === 'manual_ai' && savedFlow.source !== 'ai') ||
        (savedFlow.resultRoute === 'template_fallback' && savedFlow.source !== 'template') ||
        (savedFlow.resultRoute === 'guided_ai' &&
          savedFlow.source === 'template' &&
          savedFlow.fallbackReason !== 'guided_generation_failed'))
    ) {
      return {
        ...savedFlow,
        step: savedFlow.resultRoute === 'manual_ai' ? 'manual' : 'context',
        candidates: [],
        resultRoute: null,
        fallbackReason: null,
      }
    }

    if (savedFlow.step === 'result' && savedFlow.resultRoute === null) {
      return { ...savedFlow, step: 'situation', candidates: [], resultRoute: null }
    }

    if (
      savedFlow.step === 'result' &&
      (savedFlow.resultRoute === 'guided_ai' || savedFlow.resultRoute === 'template_fallback') &&
      savedFlow.selectedSituationId === null
    ) {
      return { ...savedFlow, step: 'situation', candidates: [], resultRoute: null, fallbackReason: null }
    }

    if (
      savedFlow.step === 'result' &&
      savedFlow.resultRoute === 'guided_ai' &&
      savedFlow.selectedContextAnswer === null
    ) {
      return { ...savedFlow, step: 'context', candidates: [], resultRoute: null, fallbackReason: null }
    }

    if (savedFlow.step === 'result' && savedFlow.speechStyleId === null) {
      return {
        ...savedFlow,
        step: savedFlow.resultRoute === 'manual_ai' ? 'manual' : 'situation',
        candidates: [],
        emailCandidates: [],
      }
    }

    if (
      savedFlow.step === 'result' &&
      savedFlow.source === 'template' &&
      (savedFlow.resultRoute === 'template_fallback' || savedFlow.fallbackReason === 'guided_generation_failed') &&
      savedFlow.selectedScenarioId &&
      savedFlow.selectedSituationId &&
      savedFlow.speechStyleId
    ) {
      const restoredTemplateCandidates = templateCandidatesFor(
        savedFlow.selectedScenarioId,
        savedFlow.selectedSituationId,
        savedFlow.speechStyleId,
      )
      if (!restoredTemplateCandidates) {
        return { ...savedFlow, step: 'context', candidates: [], resultRoute: null, fallbackReason: null }
      }
      return { ...savedFlow, candidates: restoredTemplateCandidates, emailCandidates: [] }
    }

    return { ...savedFlow, emailCandidates: [] }
  } catch {
    return initialFlowState
  }
}

type MessageFlowProps = {
  interactionReporter?: InteractionReporter
  mockGenerationCase?: MockGenerationCase
}

function MessageFlow({
  interactionReporter = reportInteraction,
  mockGenerationCase = developmentGenerationCase,
}: MessageFlowProps) {
  const [initialFlow] = useState<FlowState>(loadFlowState)
  const [step, setStep] = useState<Step>(initialFlow.step)
  const [mode, setMode] = useState<Mode | null>(initialFlow.mode)
  const [selectedScenarioId, setSelectedScenarioId] = useState<ScenarioId | null>(initialFlow.selectedScenarioId)
  const [selectedPurposeId, setSelectedPurposeId] = useState<PurposeId | null>(initialFlow.selectedPurposeId)
  const [speechStyleId, setSpeechStyleId] = useState<SpeechStyleId | null>(initialFlow.speechStyleId)
  const [contactChannel, setContactChannel] = useState<ContactChannel | null>(initialFlow.contactChannel)
  const [selectedSituationId, setSelectedSituationId] = useState<SituationId | null>(
    initialFlow.selectedSituationId,
  )
  const [selectedContextAnswer, setSelectedContextAnswer] = useState<ContextAnswer | null>(
    initialFlow.selectedContextAnswer,
  )
  const [selectedEmailSituationId, setSelectedEmailSituationId] = useState<EmailSituationId | null>(
    initialFlow.selectedEmailSituationId,
  )
  const [emailDraftInput, setEmailDraftInput] = useState<EmailDraftInput>(initialFlow.emailDraftInput)
  const [receivedMessage, setReceivedMessage] = useState(initialFlow.receivedMessage)
  const [situation, setSituation] = useState(initialFlow.situation)
  const [candidates, setCandidates] = useState<Candidate[]>(initialFlow.candidates)
  const [emailCandidates, setEmailCandidates] = useState<EmailCandidate[]>(initialFlow.emailCandidates)
  const [source, setSource] = useState<Source>(initialFlow.source)
  const [resultRoute, setResultRoute] = useState<ResultRoute>(initialFlow.resultRoute)
  const [fallbackReason, setFallbackReason] = useState<FallbackReason>(initialFlow.fallbackReason)
  const [previousResult, setPreviousResult] = useState<ResultSnapshot | null>(null)
  const [isPreviousResultShown, setIsPreviousResultShown] = useState(false)
  const [isResultContextOpen, setIsResultContextOpen] = useState(false)
  const [pendingContextAnswer, setPendingContextAnswer] = useState<ContextAnswer | null>(null)
  const [candidateEdits, setCandidateEdits] = useState<Partial<Record<ToneLevel, string>>>({})
  const [editingTones, setEditingTones] = useState<ToneLevel[]>([])
  const [copiedTone, setCopiedTone] = useState<ToneLevel | null>(null)
  const [copiedNoticeTone, setCopiedNoticeTone] = useState<ToneLevel | null>(null)
  const [fallbackTone, setFallbackTone] = useState<ToneLevel | null>(null)
  const [copyFailedTone, setCopyFailedTone] = useState<ToneLevel | null>(null)
  const [resultUpdateAnnouncement, setResultUpdateAnnouncement] = useState('')
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus>('idle')
  const [generationError, setGenerationError] = useState<GenerationErrorCode | null>(null)
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0)
  const [isLongWait, setIsLongWait] = useState(false)
  const resultTextRefs = useRef(new Map<ToneLevel, HTMLElement>())
  const generationRequestId = useRef(0)
  const guidedGenerationInFlight = useRef(false)
  const copyResetTimer = useRef<number | undefined>(undefined)
  const stepHeadingRef = useRef<HTMLHeadingElement | null>(null)
  const resultCandidatesRef = useRef<HTMLDivElement | null>(null)
  const resultRefinementTriggerRef = useRef<HTMLButtonElement | null>(null)
  const hasNavigatedSteps = useRef(false)
  const [resultShownVersion, setResultShownVersion] = useState(initialFlow.step === 'result' ? 1 : 0)
  const lastReportedResultVersion = useRef(0)

  useEffect(() => () => window.clearTimeout(copyResetTimer.current), [])

  useEffect(() => {
    if (!hasNavigatedSteps.current) {
      hasNavigatedSteps.current = true
      return
    }
    stepHeadingRef.current?.focus()
    window.scrollTo(0, 0)
  }, [step])

  useEffect(() => {
    if (step === 'result' && resultUpdateAnnouncement) {
      stepHeadingRef.current?.focus()
    }
  }, [resultUpdateAnnouncement, step])

  const selectedScenario = scenarios.find((scenario) => scenario.id === selectedScenarioId) ?? null
  const selectedSpeechStyle = speechStyles.find((style) => style.id === speechStyleId) ?? null
  const selectedContextQuestion =
    selectedScenarioId && selectedSituationId
      ? guidedContextQuestionFor(selectedScenarioId, selectedSituationId)
      : null
  const selectedSituationLabel =
    selectedScenario && selectedSituationId
      ? situationCardsFor(selectedScenario.id).find((card) => card.id === selectedSituationId)?.label ?? null
      : null
  const guidedFallbackUsed = fallbackReason === 'guided_generation_failed'
  const displayedResult = isPreviousResultShown ? previousResult : null
  const displayedCandidates = displayedResult?.candidates ?? candidates
  const displayedSource = displayedResult?.source ?? source
  const displayedResultRoute = displayedResult?.resultRoute ?? resultRoute
  const displayedFallbackReason = displayedResult?.fallbackReason ?? fallbackReason
  const displayedContextAnswer = displayedResult?.contextAnswer ?? selectedContextAnswer
  const displayedContextOption =
    selectedContextQuestion && displayedContextAnswer
      ? selectedContextQuestion.options.find((option) => option.id === displayedContextAnswer.optionId) ?? null
      : null

  const reportResultEvent = useCallback(
    (
      eventName: InteractionEventName,
      route: InteractionResultRoute,
      toneLevel?: ToneLevel,
    ) => {
      if (!mode || !selectedScenarioId) return
      const isCardRoute = route === 'guided_ai' || route === 'template_fallback'
      if (isCardRoute && !selectedSituationId) return

      const common = {
        mode,
        route,
        scenarioId: selectedScenarioId,
        ...(isCardRoute && selectedSituationId ? { situationId: selectedSituationId } : {}),
      }
      let event: InteractionEvent
      if (eventName === 'copy_succeeded') {
        if (!toneLevel) return
        event = { ...common, eventName, toneLevel }
      } else {
        event = { ...common, eventName }
      }

      try {
        interactionReporter(event)
      } catch {
        // Interaction reporting is best-effort and must never block the writing flow.
      }
    },
    [interactionReporter, mode, selectedScenarioId, selectedSituationId],
  )

  useEffect(() => {
    if (
      resultShownVersion === 0 ||
      resultShownVersion === lastReportedResultVersion.current ||
      resultRoute === null
    ) {
      return
    }
    lastReportedResultVersion.current = resultShownVersion
    reportResultEvent('result_shown', resultRoute)
  }, [reportResultEvent, resultRoute, resultShownVersion])

  const canGenerate =
    selectedPurposeId !== null &&
    speechStyleId !== null &&
    mode !== null &&
    (mode === 'reply' ? receivedMessage.trim().length > 0 : situation.trim().length > 0)

  const generateGuide =
    selectedPurposeId === null
      ? '메시지 목적을 골라주세요.'
      : speechStyleId === null
        ? '평소 쓰는 말투를 골라주세요.'
        : mode === 'reply' && receivedMessage.trim().length === 0
          ? '받은 메시지를 붙여넣어주세요.'
          : mode === 'initiate' && situation.trim().length === 0
            ? '상황을 적어주세요.'
            : null

  const isGenerating = generationStatus === 'loading'
  const isRerolling = step === 'result' && isGenerating
  const catStageState: CatStageState = isGenerating
    ? 'generating'
    : step === 'result'
      ? 'result'
      : step === 'mode'
        ? 'idle'
        : 'selected'
  const catStageAssetSrc = selectedScenarioId
    ? catStageAssetPaths[selectedScenarioId]
    : '/cats/dabnyangi-main.webp'

  useEffect(() => {
    if (step === 'mode' && mode === null) {
      window.sessionStorage.removeItem(storageKey)
      return
    }

    const flowState: StoredFlowState = {
      step,
      mode,
      selectedScenarioId,
      selectedPurposeId,
      speechStyleId,
      contactChannel,
      selectedSituationId,
      selectedContextAnswer,
      selectedEmailSituationId,
      emailDraftInput,
      receivedMessage,
      situation,
      candidates,
      emailCandidates,
      source,
      resultRoute,
      fallbackReason,
      savedAt: Date.now(),
    }
    window.sessionStorage.setItem(storageKey, JSON.stringify(flowState))
    const expiryTimer = window.setTimeout(() => {
      window.sessionStorage.removeItem(storageKey)
    }, flowStorageTtlMs)

    return () => {
      window.clearTimeout(expiryTimer)
    }
  }, [
    candidates,
    contactChannel,
    emailCandidates,
    emailDraftInput,
    mode,
    receivedMessage,
    resultRoute,
    fallbackReason,
    selectedContextAnswer,
    selectedEmailSituationId,
    selectedPurposeId,
    selectedScenarioId,
    selectedSituationId,
    situation,
    source,
    speechStyleId,
    step,
  ])

  useEffect(
    () => () => {
      generationRequestId.current += 1
    },
    [],
  )

  useEffect(() => {
    if (!isGenerating) {
      setLoadingMessageIndex(0)
      setIsLongWait(false)
      return
    }

    const messageInterval = window.setInterval(() => {
      setLoadingMessageIndex((currentIndex) => (currentIndex + 1) % loadingMessages.length)
    }, 4_500)
    const longWaitTimer = window.setTimeout(() => {
      setIsLongWait(true)
    }, 10_000)

    return () => {
      window.clearInterval(messageInterval)
      window.clearTimeout(longWaitTimer)
    }
  }, [isGenerating])

  const cancelGeneration = () => {
    generationRequestId.current += 1
    guidedGenerationInFlight.current = false
    setGenerationStatus('idle')
    setGenerationError(null)
  }

  const discardResult = () => {
    setCandidates([])
    setEmailCandidates([])
    setCopiedTone(null)
    setCopiedNoticeTone(null)
    setFallbackTone(null)
    setCopyFailedTone(null)
    setResultRoute(null)
    setFallbackReason(null)
    setPreviousResult(null)
    setIsPreviousResultShown(false)
    setIsResultContextOpen(false)
    setPendingContextAnswer(null)
    setCandidateEdits({})
    setEditingTones([])
    setResultUpdateAnnouncement('')
  }

  const currentResultSnapshot = (): ResultSnapshot | null => {
    if (
      candidates.length !== 3 ||
      (resultRoute !== 'template_fallback' && resultRoute !== 'guided_ai' && resultRoute !== 'manual_ai')
    ) {
      return null
    }

    return {
      candidates: candidates.map((candidate) => ({
        ...candidate,
        text: candidateEdits[candidate.toneLevel] ?? candidate.text,
      })),
      source,
      resultRoute,
      fallbackReason,
      contextAnswer: selectedContextAnswer,
    }
  }

  const clearCurrentResultPresentation = () => {
    setCopiedTone(null)
    setCopiedNoticeTone(null)
    setFallbackTone(null)
    setCopyFailedTone(null)
    setCandidateEdits({})
    setEditingTones([])
    setIsPreviousResultShown(false)
  }

  const chooseMode = (nextMode: Mode) => {
    cancelGeneration()
    if (nextMode !== mode) {
      setReceivedMessage('')
      setSituation('')
      setSelectedPurposeId(null)
      setContactChannel(null)
      setSelectedSituationId(null)
      setSelectedContextAnswer(null)
      setSelectedEmailSituationId(null)
      setEmailDraftInput({ ...emptyEmailDraftInput })
      discardResult()
    }
    setMode(nextMode)
    setStep('scenario')
  }

  const selectScenario = (scenario: Scenario) => {
    cancelGeneration()
    if (scenario.id !== selectedScenarioId) {
      discardResult()
      setContactChannel(scenario.id === 'professor' ? null : 'messenger')
      setSelectedSituationId(null)
      setSelectedContextAnswer(null)
    }
    setSelectedScenarioId(scenario.id)
    setSpeechStyleId(defaultSpeechStyleFor(scenario.id))
    setStep('situation')
  }

  const selectSituationCard = (situationId: SituationId) => {
    if (
      !selectedScenarioId ||
      (selectedScenarioId === 'professor' && contactChannel !== 'messenger')
    ) {
      return
    }
    cancelGeneration()
    discardResult()
    setSelectedSituationId(situationId)
    setSelectedContextAnswer(null)
    setSpeechStyleId(defaultSpeechStyleFor(selectedScenarioId))
    setStep('context')
  }

  const selectContactChannel = (nextContactChannel: ContactChannel) => {
    if (selectedScenarioId !== 'professor') return
    cancelGeneration()
    if (nextContactChannel !== contactChannel) {
      discardResult()
      setSelectedSituationId(null)
      setSelectedContextAnswer(null)
    }
    setContactChannel(nextContactChannel)
  }

  const selectEmailSituation = (emailSituationId: EmailSituationId) => {
    if (selectedScenarioId !== 'professor' || contactChannel !== 'email') return
    cancelGeneration()
    if (emailSituationId !== selectedEmailSituationId) discardResult()
    setSelectedEmailSituationId(emailSituationId)
    setStep('email-details')
  }

  const updateEmailDraftInput = (field: keyof EmailDraftInput, value: string) => {
    cancelGeneration()
    setEmailDraftInput((currentInput) => ({ ...currentInput, [field]: value }))
    setEmailCandidates([])
  }

  const generateEmailCandidates = () => {
    if (
      selectedScenarioId !== 'professor' ||
      contactChannel !== 'email' ||
      selectedEmailSituationId === null
    ) {
      return
    }

    const nextCandidates = emailTemplateCandidatesFor(selectedEmailSituationId, emailDraftInput)
    if (!nextCandidates) return
    cancelGeneration()
    setSource('template')
    setCandidates([])
    setEmailCandidates(nextCandidates)
    setResultRoute('email_template')
    setFallbackReason(null)
    setResultShownVersion((version) => version + 1)
    setStep('result')
  }

  const goToManual = () => {
    cancelGeneration()
    setStep('manual')
  }

  const selectSpeechStyle = (nextSpeechStyleId: SpeechStyleId) => {
    cancelGeneration()
    if (nextSpeechStyleId !== speechStyleId) {
      discardResult()
    }
    setSpeechStyleId(nextSpeechStyleId)
  }

  const showTemplateResult = (isGuidedFailure: boolean) => {
    if (!selectedScenarioId || !selectedSituationId) return false
    const safeSpeechStyleId = speechStyleId ?? defaultSpeechStyleFor(selectedScenarioId)
    const templateCandidates = templateCandidatesFor(selectedScenarioId, selectedSituationId, safeSpeechStyleId)
    if (!templateCandidates) return false

    setSpeechStyleId(safeSpeechStyleId)
    setSource('template')
    setCandidates(templateCandidates)
    clearCurrentResultPresentation()
    setResultRoute(isGuidedFailure ? 'guided_ai' : 'template_fallback')
    setFallbackReason(isGuidedFailure ? 'guided_generation_failed' : null)
    setPreviousResult(null)
    setIsResultContextOpen(false)
    setPendingContextAnswer(null)
    setGenerationStatus('idle')
    setGenerationError(null)
    setResultShownVersion((version) => version + 1)
    setStep('result')
    return true
  }

  const showDraftWithoutQuestion = () => {
    cancelGeneration()
    setSelectedContextAnswer(null)
    void showTemplateResult(false)
  }

  const generateFromGuided = async (answer: ContextAnswer, replacesCurrentResult: boolean) => {
    if (
      !selectedScenarioId ||
      !selectedSituationId ||
      !mode ||
      (selectedScenarioId === 'professor' && contactChannel !== 'messenger') ||
      isGenerating ||
      guidedGenerationInFlight.current
    ) {
      return
    }

    const safeSpeechStyleId = speechStyleId ?? defaultSpeechStyleFor(selectedScenarioId)
    const requestId = generationRequestId.current + 1
    generationRequestId.current = requestId
    guidedGenerationInFlight.current = true
    if (replacesCurrentResult) {
      setPendingContextAnswer(answer)
      setResultUpdateAnnouncement('')
      reportResultEvent('regeneration_requested', resultRoute === 'guided_ai' ? 'guided_ai' : 'template_fallback')
    } else {
      setSelectedContextAnswer(answer)
    }
    setSpeechStyleId(safeSpeechStyleId)
    setGenerationStatus('loading')
    setGenerationError(null)

    const result = await generateWithTimeout(
      {
        route: 'guided_ai',
        mode,
        scenarioId: selectedScenarioId,
        situationId: selectedSituationId,
        speechStyleId: safeSpeechStyleId,
        contextAnswers: [answer],
      },
      mockGenerationCase,
    )

    if (requestId !== generationRequestId.current) return
    guidedGenerationInFlight.current = false

    if (!result.ok || result.response.source !== 'ai') {
      if (replacesCurrentResult) {
        setGenerationStatus('error')
        setGenerationError(result.ok ? 'invalid_response' : result.error)
      } else if (!showTemplateResult(true)) {
        setGenerationStatus('error')
        setGenerationError(result.ok ? 'invalid_response' : result.error)
      }
      return
    }

    if (replacesCurrentResult) {
      const snapshot = currentResultSnapshot()
      if (snapshot) setPreviousResult(snapshot)
    }
    setSource(result.response.source)
    setCandidates(result.response.candidates)
    clearCurrentResultPresentation()
    setSelectedContextAnswer(answer)
    setResultRoute('guided_ai')
    setFallbackReason(null)
    setPendingContextAnswer(null)
    setIsResultContextOpen(false)
    setGenerationStatus('idle')
    setGenerationError(null)
    if (replacesCurrentResult) setResultUpdateAnnouncement('새 초안 3개가 준비됐어요.')
    setResultShownVersion((version) => version + 1)
    setStep('result')
  }

  const generateFromManual = async (replacesCurrentResult: boolean) => {
    if (
      !selectedScenarioId ||
      selectedPurposeId === null ||
      speechStyleId === null ||
      (selectedScenarioId === 'professor' && contactChannel !== 'messenger') ||
      !canGenerate ||
      isGenerating
    ) {
      return
    }

    const requestId = generationRequestId.current + 1
    generationRequestId.current = requestId
    if (replacesCurrentResult) {
      setResultUpdateAnnouncement('')
      reportResultEvent('regeneration_requested', 'manual_ai')
    }
    setGenerationStatus('loading')
    setGenerationError(null)

    const result = await generateWithTimeout(
      mode === 'reply'
        ? {
            route: 'manual_ai',
            mode: 'reply',
            scenarioId: selectedScenarioId,
            purpose: selectedPurposeId,
            speechStyleId,
            receivedMessage,
            ...(situation.trim() ? { situation } : {}),
          }
        : {
            route: 'manual_ai',
            mode: 'initiate',
            scenarioId: selectedScenarioId,
            purpose: selectedPurposeId,
            speechStyleId,
            situation,
          },
      mockGenerationCase,
    )

    if (requestId !== generationRequestId.current) return

    if (!result.ok) {
      setGenerationStatus('error')
      setGenerationError(result.error)
      return
    }

    if (replacesCurrentResult) {
      const snapshot = currentResultSnapshot()
      if (snapshot) setPreviousResult(snapshot)
    }
    setSource(result.response.source)
    setCandidates(result.response.candidates)
    clearCurrentResultPresentation()
    setResultRoute('manual_ai')
    setFallbackReason(null)
    setGenerationStatus('idle')
    setGenerationError(null)
    if (replacesCurrentResult) setResultUpdateAnnouncement('새 초안 3개가 준비됐어요.')
    setResultShownVersion((version) => version + 1)
    setStep('result')
  }

  const selectCandidateText = (toneLevel: ToneLevel) => {
    try {
      const resultText = resultTextRefs.current.get(toneLevel)
      if (!resultText) return false
      if (resultText instanceof HTMLTextAreaElement) {
        resultText.focus()
        resultText.select()
        return resultText.selectionStart === 0 && resultText.selectionEnd === resultText.value.length
      }

      const selection = window.getSelection()
      if (!selection) return false

      const range = document.createRange()
      range.selectNodeContents(resultText)
      selection.removeAllRanges()
      selection.addRange(range)
      return true
    } catch {
      return false
    }
  }

  const copyCandidate = async (candidate: Candidate, route: InteractionResultRoute) => {
    try {
      if (!navigator.clipboard) throw new Error('Clipboard API를 사용할 수 없습니다.')
      await navigator.clipboard.writeText(candidate.text)
      window.clearTimeout(copyResetTimer.current)
      setCopiedTone(candidate.toneLevel)
      setCopiedNoticeTone(candidate.toneLevel)
      setFallbackTone(null)
      setCopyFailedTone(null)
      reportResultEvent('copy_succeeded', route, candidate.toneLevel)
      copyResetTimer.current = window.setTimeout(() => setCopiedTone(null), 1500)
    } catch {
      setCopiedTone(null)
      setCopiedNoticeTone(null)
      if (selectCandidateText(candidate.toneLevel)) {
        setFallbackTone(candidate.toneLevel)
        setCopyFailedTone(null)
        return
      }
      setFallbackTone(null)
      setCopyFailedTone(candidate.toneLevel)
    }
  }

  const setResultTextRef = (toneLevel: ToneLevel, element: HTMLElement | null) => {
    if (element) {
      resultTextRefs.current.set(toneLevel, element)
      return
    }
    resultTextRefs.current.delete(toneLevel)
  }

  const backToMode = () => {
    cancelGeneration()
    setStep('mode')
  }

  const backToScenario = () => {
    cancelGeneration()
    setStep('scenario')
  }

  const backToSituation = () => {
    cancelGeneration()
    setStep('situation')
  }

  const openResultContext = () => {
    if (!selectedContextQuestion || resultRoute === null) return
    cancelGeneration()
    setPendingContextAnswer(null)
    setIsResultContextOpen(true)
    reportResultEvent('refinement_opened', resultRoute)
  }

  const closeResultContext = () => {
    cancelGeneration()
    setPendingContextAnswer(null)
    setIsResultContextOpen(false)
    window.setTimeout(() => resultRefinementTriggerRef.current?.focus(), 0)
  }

  const returnFromResultToSituation = () => {
    if (resultRoute) reportResultEvent('situation_change', resultRoute)
    cancelGeneration()
    discardResult()
    setStep('situation')
  }

  const continueResultManually = () => {
    cancelGeneration()
    discardResult()
    setStep('manual')
  }

  const backToEmailSituations = () => {
    cancelGeneration()
    setEmailCandidates([])
    setStep('situation')
  }

  const returnEmailResultToSituations = () => {
    reportResultEvent('situation_change', 'email_template')
    backToEmailSituations()
  }

  const editEmailDetails = () => {
    cancelGeneration()
    setEmailCandidates([])
    setStep('email-details')
  }

  const reroll = () => {
    if (resultRoute === 'guided_ai' && selectedContextAnswer) {
      void generateFromGuided(selectedContextAnswer, true)
      return
    }
    if (resultRoute === 'template_fallback') {
      openResultContext()
      return
    }
    void generateFromManual(true)
  }

  const retryResultGeneration = () => {
    const retryAnswer = pendingContextAnswer ?? selectedContextAnswer
    if (resultRoute === 'guided_ai' && retryAnswer) {
      void generateFromGuided(retryAnswer, true)
      return
    }
    void generateFromManual(true)
  }

  const showCurrentResult = () => {
    setIsPreviousResultShown(false)
    setCopiedTone(null)
    setCopiedNoticeTone(null)
    setFallbackTone(null)
    setCopyFailedTone(null)
    window.setTimeout(() => resultCandidatesRef.current?.focus(), 0)
  }

  const showPreviousResult = () => {
    if (!previousResult) return
    setIsPreviousResultShown(true)
    setCopiedTone(null)
    setCopiedNoticeTone(null)
    setFallbackTone(null)
    setCopyFailedTone(null)
    setIsResultContextOpen(false)
    window.setTimeout(() => resultCandidatesRef.current?.focus(), 0)
  }

  const restorePreviousResult = () => {
    if (!previousResult || resultRoute === null || resultRoute === 'email_template') return
    const currentSnapshot = currentResultSnapshot()
    if (!currentSnapshot) return

    setCandidates(previousResult.candidates)
    setSource(previousResult.source)
    setResultRoute(previousResult.resultRoute)
    setFallbackReason(previousResult.fallbackReason)
    setSelectedContextAnswer(previousResult.contextAnswer)
    setPreviousResult(currentSnapshot)
    clearCurrentResultPresentation()
    setIsResultContextOpen(false)
    setPendingContextAnswer(null)
    setGenerationStatus('idle')
    setGenerationError(null)
    window.setTimeout(() => resultCandidatesRef.current?.focus(), 0)
  }

  const updateCandidateEdit = (toneLevel: ToneLevel, text: string) => {
    setCandidateEdits((currentEdits) => ({ ...currentEdits, [toneLevel]: text }))
    setCopiedTone(null)
    setCopiedNoticeTone(null)
    setFallbackTone(null)
    setCopyFailedTone(null)
  }

  const restoreCandidateText = (toneLevel: ToneLevel) => {
    setCandidateEdits((currentEdits) => {
      const nextEdits = { ...currentEdits }
      delete nextEdits[toneLevel]
      return nextEdits
    })
  }

  const toggleCandidateEdit = (toneLevel: ToneLevel) => {
    setEditingTones((currentTones) =>
      currentTones.includes(toneLevel)
        ? currentTones.filter((currentTone) => currentTone !== toneLevel)
        : [...currentTones, toneLevel],
    )
  }

  const copyDisplayedCandidate = (candidate: Candidate) => {
    if (!displayedResultRoute || displayedResultRoute === 'email_template') return
    void copyCandidate(candidate, displayedResultRoute)
  }

  const restart = () => {
    cancelGeneration()
    setStep('mode')
    setMode(null)
    setSelectedScenarioId(null)
    setSelectedPurposeId(null)
    setSpeechStyleId(null)
    setContactChannel(null)
    setSelectedSituationId(null)
    setSelectedContextAnswer(null)
    setSelectedEmailSituationId(null)
    setEmailDraftInput({ ...emptyEmailDraftInput })
    setReceivedMessage('')
    setSituation('')
    setCandidates([])
    setEmailCandidates([])
    setCopiedTone(null)
    setCopiedNoticeTone(null)
    setFallbackTone(null)
    setCopyFailedTone(null)
    setResultRoute(null)
    setFallbackReason(null)
    setPreviousResult(null)
    setIsPreviousResultShown(false)
    setIsResultContextOpen(false)
    setPendingContextAnswer(null)
    setCandidateEdits({})
    setEditingTones([])
  }

  return (
    <main className="demo-shell">
      <section className="brand-panel" aria-labelledby="service-title">
        <div aria-hidden="true" className="brand-panel-overlay" />
        <CatStage
          assetSrc={catStageAssetSrc}
          generatingAssetSrc="/cats/dabnyangi-thinking.webp"
          state={catStageState}
        />
        <div className="brand-copy">
          <span className="eyebrow">대학생 메시지 작성 도우미</span>
          <h1 id="service-title">답냥이</h1>
          <p>꺼내기 어려운 말, 관계를 아는 냥이와 빠르게 골라봐요.</p>
        </div>
      </section>

      <GuidedChatFrame mode={mode} scenario={selectedScenario} step={step}>
        {step === 'mode' && <ModeSelect headingRef={stepHeadingRef} onChoose={chooseMode} />}

        {step === 'scenario' && (
          <ScenarioSelect
            headingRef={stepHeadingRef}
            mode={mode}
            onBack={backToMode}
            onSelect={selectScenario}
            selectedScenarioId={selectedScenarioId}
          />
        )}

        {step === 'situation' && selectedScenario && (
          <SituationSelect
            headingRef={stepHeadingRef}
            mode={mode}
            onBack={backToScenario}
            onManual={goToManual}
            onSelectCard={selectSituationCard}
            onSelectContactChannel={selectContactChannel}
            onSelectEmailSituation={selectEmailSituation}
            scenario={selectedScenario}
            selectedContactChannel={contactChannel}
          />
        )}

        {step === 'context' && selectedScenario && mode && selectedContextQuestion && (
          <GuidedContextStep
            headingRef={stepHeadingRef}
            isGenerating={isGenerating}
            mode={mode}
            onBack={backToSituation}
            onManual={goToManual}
            onSelectOption={(option) =>
              void generateFromGuided(
                { questionId: selectedContextQuestion.id, optionId: option.id },
                false,
              )
            }
            onShowDraft={showDraftWithoutQuestion}
            question={selectedContextQuestion}
            scenario={selectedScenario}
            selectedOptionId={selectedContextAnswer?.optionId ?? null}
            situationLabel={selectedSituationLabel ?? ''}
          />
        )}

        {step === 'email-details' &&
          selectedScenario?.id === 'professor' &&
          contactChannel === 'email' &&
          selectedEmailSituationId && (
            <EmailDetailsForm
              emailDraftInput={emailDraftInput}
              emailSituationId={selectedEmailSituationId}
              headingRef={stepHeadingRef}
              onBack={backToEmailSituations}
              onChange={updateEmailDraftInput}
              onClear={restart}
              onGenerate={generateEmailCandidates}
            />
          )}

        {step === 'manual' && selectedScenario && mode && (
          <div aria-busy={isGenerating} className="demo-panel wizard-panel">
            <button className="wizard-back" onClick={backToSituation} type="button">
              ← 자주 쓰는 상황에서 고르기
            </button>
            <AssistantPrompt
              assistantName={selectedScenario.helper}
              avatarAsset={catAssistantAssets[selectedScenario.id]}
              description="받은 내용이나 구체적인 사정을 반영하고 싶을 때 직접 알려주세요. 지금은 AI 연결 전 검증용 예시를 보여줘요."
              headingRef={stepHeadingRef}
              title={mode === 'reply' ? '받은 말을 조금 보여주라냥' : '상황을 조금 더 들려주라냥'}
            />

            <div className="chat-form-surface">
              <PurposeSelect
                onSelect={(purposeId) => {
                  cancelGeneration()
                  setSelectedPurposeId(purposeId)
                }}
                selectedPurposeId={selectedPurposeId}
              />

              <SpeechStyleSelect
                onSelect={selectSpeechStyle}
                scenarioId={selectedScenario.id}
                selectedSpeechStyleId={speechStyleId}
              />

              {mode === 'reply' && (
                <ReceivedMessageInput
                  onChange={(value) => {
                    cancelGeneration()
                    setReceivedMessage(value)
                  }}
                  value={receivedMessage}
                />
              )}
              <SituationInput
                onChange={(value) => {
                  cancelGeneration()
                  setSituation(value)
                }}
                optional={mode === 'reply'}
                placeholder={selectedScenario.example}
                value={situation}
              />

              <p className="privacy-note">
                <strong>이 대화의 약속</strong>
                실명·연락처·학번은 빼고 적어주세요. 입력 내용은 마지막 선택 후 30분 동안 이 탭에만 임시 보관돼요.
              </p>
              <GenerateButton
                canGenerate={canGenerate}
                guide={generateGuide}
                isGenerating={isGenerating}
                loadingMessage={isLongWait ? '조금만 더 기다려주세요.' : loadingMessages[loadingMessageIndex]}
                onGenerate={() =>
                  void generateFromManual(candidates.length === 3 && resultRoute === 'manual_ai')
                }
              />
              {generationStatus === 'error' && generationError && (
                <GenerationErrorNotice
                  error={generationError}
                  onRetry={() =>
                    void generateFromManual(candidates.length === 3 && resultRoute === 'manual_ai')
                  }
                />
              )}
              <button className="privacy-clear" onClick={restart} type="button">
                이 탭의 작성 내용 지우기
              </button>
            </div>
          </div>
        )}

        {step === 'result' && selectedScenario && contactChannel !== 'email' && (
          <div aria-busy={isRerolling} className="demo-panel wizard-panel">
            <button
              aria-label="상황 다시 고르기"
              className="wizard-back"
              onClick={returnFromResultToSituation}
              type="button"
            >
              ← 상황 다시 고르기
            </button>
            <AssistantPrompt
              assistantName={selectedScenario.helper}
              avatarAsset={catAssistantAssets[selectedScenario.id]}
              description={
                selectedSpeechStyle
                  ? `${selectedScenario.name}에 맞춰 ${selectedSpeechStyle.label}로 같은 뜻을 세 가지 톤으로 준비했어요.`
                  : `${selectedScenario.name}에 맞춰 같은 뜻을 세 가지 톤으로 준비했어요.`
              }
              headingRef={stepHeadingRef}
              title="어느 톤으로 보낼까냥?"
            />
            <div className="result-bundle">
              {resultUpdateAnnouncement && !isPreviousResultShown && (
                <p aria-atomic="true" aria-live="polite" className="result-update-notice" role="status">
                  <strong>{resultUpdateAnnouncement}</strong>
                  <span>마음에 드는 문장을 고쳐서 복사하거나 이전 초안과 비교해보세요.</span>
                </p>
              )}
              {previousResult && (
                <div className="result-version-controls" aria-label="초안 버전 비교">
                  <button
                    aria-controls="result-candidates"
                    aria-pressed={!isPreviousResultShown}
                    disabled={isRerolling}
                    onClick={showCurrentResult}
                    type="button"
                  >
                    현재 초안
                  </button>
                  <button
                    aria-controls="result-candidates"
                    aria-pressed={isPreviousResultShown}
                    disabled={isRerolling}
                    onClick={showPreviousResult}
                    type="button"
                  >
                    이전 초안
                  </button>
                  {isPreviousResultShown && (
                    <button className="result-version-restore" onClick={restorePreviousResult} type="button">
                      이전 초안으로 복원
                    </button>
                  )}
                </div>
              )}
              {displayedResultRoute === 'guided_ai' &&
                selectedSituationLabel &&
                displayedContextOption && (
                <div className="guided-context-summary" aria-label="선택한 내용">
                  <strong>선택한 내용</strong>
                  <span>
                    {selectedScenario.name} · {selectedSituationLabel} · {displayedContextOption.label}
                  </span>
                </div>
              )}
              {displayedResultRoute === 'template_fallback' && selectedSituationLabel && (
                <div className="guided-context-summary" aria-label="고른 상황">
                  <strong>바로 초안</strong>
                  <span>
                    {selectedScenario.name} · {selectedSituationLabel}
                  </span>
                </div>
              )}
              {displayedFallbackReason === 'guided_generation_failed' && (
                <p className="guided-fallback-notice" role={isRerolling ? undefined : 'status'}>
                  잠시 AI 결과를 만들지 못해 기본 초안을 보여드려요. 방금 고른 세부 답은 반영되지 않았어요.
                </p>
              )}
              <div className="result-bundle-heading">
                <strong>기본 · 더 부드럽게 · 더 분명하게</strong>
                <span>필요하면 고쳐서 바로 복사해요</span>
              </div>
              {displayedSource === 'ai' && <p className="mock-note">현재는 AI 연결 전 검증용 예시 후보입니다.</p>}
              {!isPreviousResultShown && generationStatus === 'error' && generationError && (
                <GenerationErrorNotice error={generationError} onRetry={retryResultGeneration} />
              )}
              {!isPreviousResultShown && isRerolling && !isResultContextOpen && (
                <p aria-live="polite" className="guided-retry-status" role="status">
                  기존 후보를 유지한 채 같은 선택으로 다시 만들고 있어요.
                </p>
              )}

              <div
                aria-label={isPreviousResultShown ? '이전 초안 후보' : '현재 초안 후보'}
                id="result-candidates"
                ref={resultCandidatesRef}
                role="region"
                tabIndex={-1}
              >
                <ResultList
                  candidates={displayedCandidates}
                  copiedNoticeTone={copiedNoticeTone}
                  copiedTone={copiedTone}
                  copyFailedTone={copyFailedTone}
                  disabled={isRerolling}
                  editable={!isPreviousResultShown}
                  editedTexts={isPreviousResultShown ? {} : candidateEdits}
                  editingTones={isPreviousResultShown ? [] : editingTones}
                  fallbackTone={fallbackTone}
                  onChangeText={updateCandidateEdit}
                  onCopy={copyDisplayedCandidate}
                  onRestoreText={restoreCandidateText}
                  onToggleEdit={toggleCandidateEdit}
                  setTextRef={setResultTextRef}
                />
              </div>
            </div>

            {!isPreviousResultShown &&
              isResultContextOpen &&
              mode &&
              selectedContextQuestion &&
              selectedSituationLabel && (
                <ResultRefinementPanel
                  isGenerating={isRerolling}
                  mode={mode}
                  onClose={closeResultContext}
                  onManual={continueResultManually}
                  onSelectOption={(option) =>
                    void generateFromGuided(
                      { questionId: selectedContextQuestion.id, optionId: option.id },
                      true,
                    )
                  }
                  question={selectedContextQuestion}
                  scenario={selectedScenario}
                  selectedOptionId={
                    pendingContextAnswer?.optionId ?? selectedContextAnswer?.optionId ?? null
                  }
                  situationLabel={selectedSituationLabel}
                />
              )}

            {!isPreviousResultShown && !isResultContextOpen && (
              <div className="result-actions">
                {resultRoute === 'template_fallback' && (
                  <button
                    className="wizard-back wizard-reroll"
                    onClick={openResultContext}
                    ref={resultRefinementTriggerRef}
                    type="button"
                  >
                    AI로 더 맞추기
                  </button>
                )}
                {resultRoute === 'guided_ai' && guidedFallbackUsed && (
                  <button className="wizard-back wizard-reroll" disabled={isRerolling} onClick={reroll} type="button">
                    {isRerolling ? '다시 만들고 있어요…' : '같은 선택으로 AI 다시 만들기'}
                  </button>
                )}
                {resultRoute === 'guided_ai' && !guidedFallbackUsed && (
                  <>
                    <p className="result-action-guide" id="guided-reroll-guide">
                      지금 고른 답은 그대로 유지돼요. 아래 버튼을 누르면 추가 입력 없이 새 초안 3개를 바로
                      만들어요.
                    </p>
                    <button
                      aria-describedby="guided-reroll-guide"
                      className="wizard-back wizard-reroll"
                      disabled={isRerolling}
                      onClick={reroll}
                      type="button"
                    >
                      {isRerolling ? '새 초안 3개 만들고 있어요…' : '이 선택으로 새 초안 3개 만들기'}
                    </button>
                    <button
                      className="wizard-back wizard-result-secondary"
                      disabled={isRerolling}
                      onClick={openResultContext}
                      ref={resultRefinementTriggerRef}
                      type="button"
                    >
                      선택한 답 바꾸기
                    </button>
                  </>
                )}
                {resultRoute === 'manual_ai' && (
                  <>
                    <button className="wizard-back wizard-reroll" disabled={isRerolling} onClick={reroll} type="button">
                      {isRerolling ? '다시 만들고 있어요…' : '같은 입력으로 다른 표현 만들기'}
                    </button>
                    <button className="wizard-back wizard-result-secondary" onClick={goToManual} type="button">
                      입력 고쳐 다시 쓰기
                    </button>
                  </>
                )}
                {resultRoute !== 'manual_ai' && (
                  <button
                    className="wizard-back wizard-result-secondary"
                    disabled={isRerolling}
                    onClick={continueResultManually}
                    type="button"
                  >
                    내 상황을 직접 설명하기
                  </button>
                )}
              </div>
            )}
            <button className="wizard-restart" onClick={restart} type="button">
              처음으로 (작성 내용 지우기)
            </button>
          </div>
        )}

        {step === 'result' &&
          selectedScenario?.id === 'professor' &&
          contactChannel === 'email' &&
          emailCandidates.length === 3 && (
            <div className="demo-panel wizard-panel">
              <button className="wizard-back" onClick={editEmailDetails} type="button">
                이메일 정보 수정하기
              </button>
              <AssistantPrompt
                assistantName={selectedScenario.helper}
                avatarAsset={catAssistantAssets[selectedScenario.id]}
                description="교수님·조교님께 보낼 이메일을 습니다체로 세 가지 준비했어요."
                headingRef={stepHeadingRef}
                title="어떤 이메일로 보낼까냥?"
              />

              <div className="result-bundle email-result-bundle">
                <div className="result-bundle-heading">
                  <strong>정석 · 더 정중하게 · 더 간결하게</strong>
                  <span>제목, 본문 또는 전체 메일을 복사해요</span>
                </div>
                <EmailResultList
                  candidates={emailCandidates}
                  onCopySucceeded={(toneLevel) =>
                    reportResultEvent('copy_succeeded', 'email_template', toneLevel)
                  }
                />
              </div>

              <button className="wizard-back wizard-reroll" onClick={returnEmailResultToSituations} type="button">
                이메일 상황 다시 고르기
              </button>
              <button className="wizard-restart" onClick={restart} type="button">
                처음으로 (작성 내용 지우기)
              </button>
            </div>
          )}
      </GuidedChatFrame>
    </main>
  )
}

export default MessageFlow
