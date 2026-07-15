import { useEffect, useRef, useState } from 'react'
import {
  catAssistantAssets,
  catStageAssetPaths,
  scenarios,
  templateCandidatesFor,
  type Candidate,
  type Mode,
  type PurposeId,
  type Scenario,
  type ScenarioId,
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
  SituationInput,
} from '../../features/manual-input'
import { ResultList } from '../../features/copy-result'
import { AssistantPrompt, GuidedChatFrame } from '../../features/guided-chat'
import { CatStage, type CatStageState } from '../../features/cat-stage'

type FlowState = {
  step: Step
  mode: Mode | null
  selectedScenarioId: ScenarioId | null
  selectedPurposeId: PurposeId | null
  receivedMessage: string
  situation: string
  candidates: Candidate[]
  source: Source
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
  receivedMessage: '',
  situation: '',
  candidates: [],
  source: 'template',
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null

const loadFlowState = (): FlowState => {
  if (typeof window === 'undefined') return initialFlowState

  try {
    const savedValue: unknown = JSON.parse(window.sessionStorage.getItem(storageKey) ?? 'null')
    if (
      !isRecord(savedValue) ||
      !['mode', 'scenario', 'situation', 'manual', 'result'].includes(String(savedValue.step)) ||
      ![null, 'reply', 'initiate'].includes(savedValue.mode as Mode | null) ||
      ![null, 'groupwork', 'professor', 'senior', 'friend'].includes(savedValue.selectedScenarioId as ScenarioId | null) ||
      ![null, 'ask', 'apologize', 'decline', 'question', 'suggest', 'other'].includes(
        savedValue.selectedPurposeId as PurposeId | null,
      ) ||
      typeof savedValue.receivedMessage !== 'string' ||
      typeof savedValue.situation !== 'string' ||
      typeof savedValue.savedAt !== 'number' ||
      !Number.isFinite(savedValue.savedAt) ||
      savedValue.savedAt > Date.now() ||
      Date.now() - savedValue.savedAt > flowStorageTtlMs ||
      !Array.isArray(savedValue.candidates) ||
      (savedValue.candidates.length > 0 &&
        !isValidGenerationResponse({
          source: savedValue.source,
          candidates: savedValue.candidates,
        }))
    ) {
      return initialFlowState
    }

    const savedFlow: FlowState = {
      step: savedValue.step as Step,
      mode: savedValue.mode as Mode | null,
      selectedScenarioId: savedValue.selectedScenarioId as ScenarioId | null,
      selectedPurposeId: savedValue.selectedPurposeId as PurposeId | null,
      receivedMessage: savedValue.receivedMessage,
      situation: savedValue.situation,
      candidates: savedValue.candidates,
      source: savedValue.source as Source,
    }

    if ((savedFlow.step === 'result' && savedFlow.candidates.length !== 3) || (savedFlow.step !== 'mode' && !savedFlow.mode)) {
      return initialFlowState
    }

    return savedFlow
  } catch {
    return initialFlowState
  }
}

type MessageFlowProps = {
  mockGenerationCase?: MockGenerationCase
}

function MessageFlow({ mockGenerationCase = developmentGenerationCase }: MessageFlowProps) {
  const [initialFlow] = useState<FlowState>(loadFlowState)
  const [step, setStep] = useState<Step>(initialFlow.step)
  const [mode, setMode] = useState<Mode | null>(initialFlow.mode)
  const [selectedScenarioId, setSelectedScenarioId] = useState<ScenarioId | null>(initialFlow.selectedScenarioId)
  const [selectedPurposeId, setSelectedPurposeId] = useState<PurposeId | null>(initialFlow.selectedPurposeId)
  const [receivedMessage, setReceivedMessage] = useState(initialFlow.receivedMessage)
  const [situation, setSituation] = useState(initialFlow.situation)
  const [candidates, setCandidates] = useState<Candidate[]>(initialFlow.candidates)
  const [source, setSource] = useState<Source>(initialFlow.source)
  const [copiedTone, setCopiedTone] = useState<ToneLevel | null>(null)
  const [copiedNoticeTone, setCopiedNoticeTone] = useState<ToneLevel | null>(null)
  const [fallbackTone, setFallbackTone] = useState<ToneLevel | null>(null)
  const [copyFailedTone, setCopyFailedTone] = useState<ToneLevel | null>(null)
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus>('idle')
  const [generationError, setGenerationError] = useState<GenerationErrorCode | null>(null)
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0)
  const [isLongWait, setIsLongWait] = useState(false)
  const resultTextRefs = useRef(new Map<ToneLevel, HTMLParagraphElement>())
  const generationRequestId = useRef(0)
  const copyResetTimer = useRef<number | undefined>(undefined)
  const stepHeadingRef = useRef<HTMLHeadingElement | null>(null)
  const hasNavigatedSteps = useRef(false)

  useEffect(() => () => window.clearTimeout(copyResetTimer.current), [])

  useEffect(() => {
    if (!hasNavigatedSteps.current) {
      hasNavigatedSteps.current = true
      return
    }
    stepHeadingRef.current?.focus()
    window.scrollTo(0, 0)
  }, [step])

  const selectedScenario = scenarios.find((scenario) => scenario.id === selectedScenarioId) ?? null

  const canGenerate =
    selectedPurposeId !== null &&
    mode !== null &&
    (mode === 'reply' ? receivedMessage.trim().length > 0 : situation.trim().length > 0)

  const generateGuide =
    selectedPurposeId === null
      ? '메시지 목적을 골라주세요.'
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
      receivedMessage,
      situation,
      candidates,
      source,
      savedAt: Date.now(),
    }
    window.sessionStorage.setItem(storageKey, JSON.stringify(flowState))
    const expiryTimer = window.setTimeout(() => {
      window.sessionStorage.removeItem(storageKey)
    }, flowStorageTtlMs)

    return () => {
      window.clearTimeout(expiryTimer)
    }
  }, [candidates, mode, receivedMessage, selectedPurposeId, selectedScenarioId, situation, source, step])

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
    setGenerationStatus('idle')
    setGenerationError(null)
  }

  const discardResult = () => {
    setCandidates([])
    setCopiedTone(null)
    setCopiedNoticeTone(null)
    setFallbackTone(null)
    setCopyFailedTone(null)
  }

  const chooseMode = (nextMode: Mode) => {
    cancelGeneration()
    if (nextMode !== mode) {
      setReceivedMessage('')
      setSituation('')
      setSelectedPurposeId(null)
      discardResult()
    }
    setMode(nextMode)
    setStep('scenario')
  }

  const selectScenario = (scenario: Scenario) => {
    cancelGeneration()
    if (scenario.id !== selectedScenarioId) {
      discardResult()
    }
    setSelectedScenarioId(scenario.id)
    setStep('situation')
  }

  const selectSituationCard = (situationId: SituationId) => {
    if (!selectedScenarioId) return
    const templateCandidates = templateCandidatesFor(selectedScenarioId, situationId)
    if (!templateCandidates) return
    cancelGeneration()
    setSource('template')
    setCandidates(templateCandidates)
    setCopiedTone(null)
    setCopiedNoticeTone(null)
    setFallbackTone(null)
    setCopyFailedTone(null)
    setStep('result')
  }

  const goToManual = () => {
    cancelGeneration()
    setStep('manual')
  }

  const generateFromManual = async () => {
    if (!selectedScenarioId || selectedPurposeId === null || !canGenerate || isGenerating) return

    const requestId = generationRequestId.current + 1
    generationRequestId.current = requestId
    setGenerationStatus('loading')
    setGenerationError(null)

    const result = await generateWithTimeout(
      {
        scenarioId: selectedScenarioId,
        purpose: selectedPurposeId,
        ...(receivedMessage.trim() ? { receivedMessage } : {}),
        ...(situation.trim() ? { situation } : {}),
      },
      mockGenerationCase,
    )

    if (requestId !== generationRequestId.current) return

    if (!result.ok) {
      setGenerationStatus('error')
      setGenerationError(result.error)
      return
    }

    setSource(result.response.source)
    setCandidates(result.response.candidates)
    setCopiedTone(null)
    setCopiedNoticeTone(null)
    setFallbackTone(null)
    setCopyFailedTone(null)
    setGenerationStatus('idle')
    setGenerationError(null)
    setStep('result')
  }

  const selectCandidateText = (toneLevel: ToneLevel) => {
    try {
      const resultText = resultTextRefs.current.get(toneLevel)
      const selection = window.getSelection()
      if (!resultText || !selection) return false

      const range = document.createRange()
      range.selectNodeContents(resultText)
      selection.removeAllRanges()
      selection.addRange(range)
      return true
    } catch {
      return false
    }
  }

  const copyCandidate = async (candidate: Candidate) => {
    try {
      if (!navigator.clipboard) throw new Error('Clipboard API를 사용할 수 없습니다.')
      await navigator.clipboard.writeText(candidate.text)
      window.clearTimeout(copyResetTimer.current)
      setCopiedTone(candidate.toneLevel)
      setCopiedNoticeTone(candidate.toneLevel)
      setFallbackTone(null)
      setCopyFailedTone(null)
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

  const setResultTextRef = (toneLevel: ToneLevel, element: HTMLParagraphElement | null) => {
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

  const reroll = () => {
    if (source === 'template') {
      cancelGeneration()
      setStep('manual')
      return
    }
    void generateFromManual()
  }

  const restart = () => {
    cancelGeneration()
    setStep('mode')
    setMode(null)
    setSelectedScenarioId(null)
    setSelectedPurposeId(null)
    setReceivedMessage('')
    setSituation('')
    setCandidates([])
    setCopiedTone(null)
    setCopiedNoticeTone(null)
    setFallbackTone(null)
    setCopyFailedTone(null)
  }

  const resetGenerationFeedback = () => {
    setGenerationStatus('idle')
    setGenerationError(null)
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
          <ul className="brand-points" aria-label="답냥이 특징">
            <li>긴 설명 없이 빠른 선택</li>
            <li>관계별 말투</li>
            <li>비교할 수 있는 세 가지 톤</li>
          </ul>
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
            scenario={selectedScenario}
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
              description="맞는 빠른 답변이 없을 때만 직접 알려주세요. 지금은 AI 연결 전 검증용 예시를 보여줘요."
              headingRef={stepHeadingRef}
              title={mode === 'reply' ? '받은 말을 조금 보여주라냥' : '상황을 조금 더 들려주라냥'}
            />

            <div className="chat-form-surface">
              <PurposeSelect
                onSelect={(purposeId) => {
                  setSelectedPurposeId(purposeId)
                  resetGenerationFeedback()
                }}
                selectedPurposeId={selectedPurposeId}
              />

              {mode === 'reply' && (
                <ReceivedMessageInput
                  onChange={(value) => {
                    setReceivedMessage(value)
                    resetGenerationFeedback()
                  }}
                  value={receivedMessage}
                />
              )}
              <SituationInput
                onChange={(value) => {
                  setSituation(value)
                  resetGenerationFeedback()
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
                onGenerate={() => void generateFromManual()}
              />
              {generationStatus === 'error' && generationError && (
                <GenerationErrorNotice error={generationError} onRetry={() => void generateFromManual()} />
              )}
              <button className="privacy-clear" onClick={restart} type="button">
                이 탭의 작성 내용 지우기
              </button>
            </div>
          </div>
        )}

        {step === 'result' && selectedScenario && (
          <div aria-busy={isRerolling} className="demo-panel wizard-panel">
            <button
              className="wizard-back"
              onClick={source === 'template' ? backToSituation : goToManual}
              type="button"
            >
              {source === 'template' ? '상황 다시 고르기' : '입력 내용 수정하기'}
            </button>
            <AssistantPrompt
              assistantName={selectedScenario.helper}
              avatarAsset={catAssistantAssets[selectedScenario.id]}
              description={`${selectedScenario.name}에 맞춰 같은 뜻을 세 가지 말투로 준비했어요.`}
              headingRef={stepHeadingRef}
              title="어떤 말투로 보낼까냥?"
            />

            <div className="result-bundle">
              <div className="result-bundle-heading">
                <strong>기본 · 더 부드럽게 · 더 분명하게</strong>
                <span>하나를 골라 바로 복사해요</span>
              </div>
              {source === 'ai' && <p className="mock-note">현재는 AI 연결 전 검증용 예시 후보입니다.</p>}
              {generationStatus === 'error' && generationError && (
                <GenerationErrorNotice error={generationError} onRetry={() => void generateFromManual()} />
              )}

              <ResultList
                candidates={candidates}
                copiedNoticeTone={copiedNoticeTone}
                copiedTone={copiedTone}
                copyFailedTone={copyFailedTone}
                disabled={isRerolling}
                fallbackTone={fallbackTone}
                onCopy={(candidate) => void copyCandidate(candidate)}
                setTextRef={setResultTextRef}
              />
            </div>

            <button className="wizard-back wizard-reroll" disabled={isRerolling} onClick={reroll} type="button">
              {source === 'template' ? '내 상황에 더 맞추기' : isRerolling ? '다시 만들고 있어요…' : '다시 만들기'}
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
