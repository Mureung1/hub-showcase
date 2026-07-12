import { useEffect, useRef, useState } from 'react'
import {
  catAssistantAssets,
  purposes,
  scenarios,
  situationCardsFor,
  toneLabels,
  type Candidate,
  type Mode,
  type PurposeId,
  type Scenario,
  type ScenarioId,
  type SituationId,
  type Source,
  type Step,
  type ToneLevel,
} from './domain/message'
import { hasPlaceholder, isPlaceholder, splitPlaceholderText } from './domain/placeholders'
import {
  isValidGenerationResponse,
  type GenerationErrorCode,
  type GenerationResult,
} from './services/generation/contracts'
import {
  generateWithMock,
  type MockGenerationCase,
} from './services/generation/mockGenerator'

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
const loadingMessages = ['상황을 읽고 있어요.', '톤 3가지로 쓰고 있어요.', '거의 다 됐어요.']

const generationErrorMessage: Record<GenerationErrorCode, string> = {
  invalid_request: '입력 내용을 다시 확인해주세요.',
  rate_limited: '요청이 많아요. 잠시 후 다시 시도해주세요.',
  generation_failed: '보낼 말을 만들지 못했어요. 입력은 그대로 두었어요.',
  timeout: '응답이 오래 걸리고 있어요. 잠시 후 다시 시도해주세요.',
  invalid_response: '안전하게 확인할 수 없는 응답이에요. 다시 시도해주세요.',
  unsafe_response: '안전하지 않은 표현이 감지됐어요. 상황을 조금 바꿔 다시 시도해주세요.',
}

const renderCandidateText = (value: string) =>
  splitPlaceholderText(value).map((part, index) =>
    isPlaceholder(part) ? (
      <mark className="placeholder" key={`${part}-${index}`}>
        {part}
      </mark>
    ) : (
      part
    ),
  )

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

const templates: Record<ScenarioId, Partial<Record<SituationId, Record<ToneLevel, string>>>> = {
  groupwork: {
    schedule: {
      1: '다음 모임 시간 맞추려고 하는데 언제가 괜찮으세요?',
      2: '다음 모임 시간 맞추려고 해요 편하실 때 시간 알려주세요',
      3: '다음 모임 시간 정하려고 해요 가능한 시간 알려주세요',
    },
    thanks_check: {
      1: '확인했어요 알려주셔서 고마워요',
      2: '챙겨주신 덕분에 잘 확인했어요 고마워요',
      3: '내용 확인했어요 고마워요',
    },
    ask: {
      1: '[부탁할 내용] 도움 부탁드려도 될까요?',
      2: '시간 되실 때 [부탁할 내용] 도움 부탁드려도 될까요?',
      3: '[부탁할 내용] 도움 부탁드려요 가능하실까요?',
    },
    apologize: {
      1: '답장이 늦어서 미안해요',
      2: '답장이 늦었어요 기다리게 해서 미안해요',
      3: '답 늦었어요 미안해요',
    },
    decline: {
      1: '이번에는 어려울 것 같아요 미안해요',
      2: '죄송한데 이번에는 어려울 것 같아요',
      3: '이번에는 어려워요 미안해요',
    },
    contribution_check: {
      1: '맡은 부분 진행 상황 공유해주실 수 있나요?',
      2: '가능하실 때 맡은 부분 진행 상황 알려주세요',
      3: '맡은 부분 진행 상황 알려주세요',
    },
  },
  professor: {
    schedule: {
      1: '안녕하세요 면담 가능한 시간을 여쭤봐도 될까요?',
      2: '안녕하세요 편하신 시간에 맞추겠습니다 면담 가능한 시간을 여쭤봐도 될까요?',
      3: '안녕하세요 면담 가능한 시간이 언제일까요?',
    },
    thanks_check: {
      1: '안녕하세요 확인해주셔서 감사합니다',
      2: '안녕하세요 확인해주셔서 정말 감사합니다 큰 도움이 됐습니다',
      3: '확인해주셔서 감사합니다',
    },
    ask: {
      1: '안녕하세요 [부탁할 내용] 부탁드려도 될까요?',
      2: '안녕하세요 괜찮으시다면 [부탁할 내용] 부탁드려도 될까요?',
      3: '안녕하세요 [부탁할 내용] 가능하실까요?',
    },
    apologize: {
      1: '안녕하세요 답장이 늦어 죄송합니다',
      2: '안녕하세요 답장이 늦었습니다 기다리게 해드려 죄송합니다',
      3: '답장이 늦었습니다 죄송합니다',
    },
    decline: {
      1: '안녕하세요 이번에는 어려울 것 같습니다 죄송합니다',
      2: '안녕하세요 죄송하지만 이번에는 어려울 것 같습니다',
      3: '안녕하세요 이번에는 어렵겠습니다 죄송합니다',
    },
    absence_inquiry: {
      1: '안녕하세요 결석하게 되어 과제 제출 방법을 여쭤봐도 될까요?',
      2: '안녕하세요 결석하게 되어서요 괜찮으실 때 과제 제출 방법을 알려주실 수 있을까요?',
      3: '안녕하세요 결석하게 됐습니다 과제 제출 방법이 어떻게 될까요?',
    },
  },
  senior: {
    schedule: {
      1: '다음 모임 시간이 언제인지 알려주실 수 있나요?',
      2: '편하실 때 다음 모임 시간 알려주세요',
      3: '다음 모임 시간 알려주세요',
    },
    thanks_check: {
      1: '확인했어요 알려주셔서 감사해요',
      2: '덕분에 잘 확인했어요 감사해요',
      3: '내용 확인했어요 감사해요',
    },
    ask: {
      1: '[부탁할 내용] 부탁드려도 될까요?',
      2: '바쁘지 않으시면 [부탁할 내용] 부탁드려도 될까요?',
      3: '[부탁할 내용] 가능하실까요?',
    },
    apologize: {
      1: '답장이 늦어서 죄송해요',
      2: '답장이 늦었어요 기다리게 해서 죄송해요',
      3: '답 늦었어요 죄송해요',
    },
    decline: {
      1: '이번에는 어려울 것 같아요 죄송해요',
      2: '죄송하지만 이번에는 어려울 것 같아요',
      3: '이번에는 어려워요',
    },
    casual_request: {
      1: '저한테는 편하게 말씀하셔도 괜찮아요',
      2: '원하시면 저한테는 편하게 말씀하셔도 돼요',
      3: '말 편하게 하셔도 돼요 존댓말도 괜찮아요',
    },
  },
  friend: {
    schedule: {
      1: '우리 언제 볼지 정해볼까?',
      2: '괜찮으면 우리 만날 시간 정할까?',
      3: '우리 만날 시간 정하자',
    },
    thanks_check: {
      1: '확인했어 챙겨줘서 고마워',
      2: '덕분에 잘 확인했어 고마워',
      3: '내용 확인했어 고마워',
    },
    ask: {
      1: '[부탁할 내용] 해줄 수 있어?',
      2: '괜찮으면 [부탁할 내용] 해줄 수 있을까?',
      3: '[부탁할 내용] 해줄래?',
    },
    apologize: {
      1: '답 늦어서 미안해',
      2: '답이 늦었어 기다리게 해서 미안해',
      3: '답 늦었어 미안해',
    },
    decline: {
      1: '이번에는 어려울 것 같아 미안해',
      2: '미안한데 이번에는 어려울 것 같아',
      3: '이번에는 어려워',
    },
    express_feelings: {
      1: '너랑 있으면 편하고 좋아',
      2: '너랑 있으면 편하고 좋아 ㅎㅎ',
      3: '너랑 있는 게 좋아',
    },
  },
}

const buildCandidates = (source: Record<ToneLevel, string>): Candidate[] =>
  ([1, 2, 3] as const).map((toneLevel) => ({
    toneLevel,
    toneLabel: toneLabels[toneLevel],
    text: source[toneLevel],
  }))

type ProjectIntroProps = {
  mockGenerationCase?: MockGenerationCase
}

function ProjectIntro({ mockGenerationCase = developmentGenerationCase }: ProjectIntroProps) {
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

  useEffect(() => () => window.clearTimeout(copyResetTimer.current), [])

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

  const chooseMode = (nextMode: Mode) => {
    cancelGeneration()
    setMode(nextMode)
    setStep('scenario')
  }

  const selectScenario = (scenario: Scenario) => {
    cancelGeneration()
    setSelectedScenarioId(scenario.id)
    setStep('situation')
  }

  const selectSituationCard = (situationId: SituationId) => {
    if (!selectedScenarioId) return
    const toneTexts = templates[selectedScenarioId][situationId]
    if (!toneTexts) return
    cancelGeneration()
    setSource('template')
    setCandidates(buildCandidates(toneTexts))
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

  const backToMode = () => {
    cancelGeneration()
    setMode(null)
    setReceivedMessage('')
    setSituation('')
    setSelectedPurposeId(null)
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
    setFallbackTone(null)
    setCopyFailedTone(null)
  }

  return (
    <main className="demo-shell">
      <section className="hero-band" aria-labelledby="service-title">
        <img src="/demo-hero.png" alt="대학생이 노트북과 휴대폰으로 메시지를 작성하는 모습" />
        <div className="hero-copy">
          <span className="eyebrow">대학생 메시지 작성 도우미</span>
          <h1 id="service-title">답냥이</h1>
          <p>꺼내기 어려운 말을 관계와 목적에 맞춰 3가지 톤으로 바로 써줘요.</p>
        </div>
      </section>

      <section aria-label="답냥이 데모" className="wizard-shell">
        {step === 'mode' && (
          <div className="demo-panel wizard-panel">
            <div className="section-heading">
              <span>S0</span>
              <div>
                <h2>어떤 상황인가요?</h2>
                <p>방식을 먼저 고르면 그에 맞는 화면으로 안내해요.</p>
              </div>
            </div>

            <div className="mode-card-list">
              <button className="mode-card" onClick={() => chooseMode('reply')} type="button">
                <strong>답장할래요</strong>
                <span>받은 메시지가 있어요. 붙여넣으면 거기에 맞춰 써줘요.</span>
              </button>
              <button className="mode-card" onClick={() => chooseMode('initiate')} type="button">
                <strong>먼저 연락할래요</strong>
                <span>아직 아무 말도 안 했어요. 상황만 알려주면 돼요.</span>
              </button>
            </div>
          </div>
        )}

        {step === 'scenario' && (
          <div className="demo-panel wizard-panel">
            <button className="wizard-back" onClick={backToMode} type="button">
              ← 방식 다시 고르기
            </button>
            <div className="section-heading">
              <span>S1</span>
              <div>
                <h2>관계 고르기</h2>
                <p>{mode === 'reply' ? '답장할 상대는 누구인가요?' : '먼저 연락할 상대는 누구인가요?'}</p>
              </div>
            </div>

            <div className="scenario-list">
              {scenarios.map((scenario) => (
                <button
                  className="scenario-card"
                  data-scenario={scenario.id}
                  data-selected={scenario.id === selectedScenarioId}
                  key={scenario.id}
                  onClick={() => selectScenario(scenario)}
                  type="button"
                >
                  <span className="scenario-card-main">
                    <span className="scenario-card-copy">
                      <strong>{scenario.helper}</strong>
                      <span className="scenario-card-name">{scenario.name}</span>
                    </span>
                    <span aria-hidden="true" className="scenario-card-art" data-asset-slot="cat">
                      {catAssistantAssets[scenario.id].assetPath ? (
                        <img
                          alt={catAssistantAssets[scenario.id].alt}
                          src={catAssistantAssets[scenario.id].assetPath ?? undefined}
                        />
                      ) : (
                        <span className="scenario-card-art-placeholder">냥</span>
                      )}
                    </span>
                  </span>
                  <small>{scenario.summary}</small>
                  <span className="scenario-card-cta">이 냥이와 말 고르기 →</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 'situation' && selectedScenario && (
          <div className="demo-panel wizard-panel">
            <button className="wizard-back" onClick={backToScenario} type="button">
              ← 다른 관계 고르기
            </button>
            <div className="section-heading">
              <span>S2</span>
              <div>
                <h2>어떤 상황이에요?</h2>
                <p>{selectedScenario.helper}이 골라둔 상황 중 하나를 골라주세요. 바로 결과를 볼 수 있어요.</p>
              </div>
            </div>

            <div className="situation-list">
              {situationCardsFor(selectedScenario.id).map((card) => (
                <button
                  className="situation-card"
                  key={card.id}
                  onClick={() => selectSituationCard(card.id)}
                  type="button"
                >
                  {card.label}
                </button>
              ))}
              <button className="situation-card situation-card--other" onClick={goToManual} type="button">
                다른 상황이냥?
              </button>
            </div>
          </div>
        )}

        {step === 'manual' && selectedScenario && mode && (
          <div className="demo-panel wizard-panel">
            <button className="wizard-back" onClick={backToSituation} type="button">
              ← 상황 카드로 돌아가기
            </button>
            <div className="section-heading">
              <span>S2</span>
              <div>
                <h2>{mode === 'reply' ? '받은 메시지 붙여넣기' : '상황 설명'}</h2>
                <p>맞는 카드가 없을 때만 직접 알려주세요. AI 연결 전에는 검증용 예시 후보를 보여줘요.</p>
              </div>
            </div>

            <div className="purpose-list" aria-label="메시지 목적">
              {purposes.map((purpose) => (
                <button
                  className="purpose-chip"
                  data-selected={purpose.id === selectedPurposeId}
                  key={purpose.id}
                  onClick={() => {
                    setSelectedPurposeId(purpose.id)
                    setGenerationStatus('idle')
                    setGenerationError(null)
                  }}
                  type="button"
                >
                  {purpose.label}
                </button>
              ))}
            </div>

            {mode === 'reply' ? (
              <>
                <label className="field">
                  <span>받은 메시지 붙여넣기</span>
                  <textarea
                    aria-label="받은 메시지 붙여넣기"
                    maxLength={500}
                    onChange={(event) => {
                      setReceivedMessage(event.target.value)
                      setGenerationStatus('idle')
                      setGenerationError(null)
                    }}
                    placeholder="여기에 상대방이 보낸 메시지를 붙여넣어요"
                    value={receivedMessage}
                  />
                  <span className="field-count" aria-live="polite">
                    {receivedMessage.length}/500자
                  </span>
                </label>
                <label className="field">
                  <span>상황 설명 (선택)</span>
                  <textarea
                    aria-label="상황 설명 (선택)"
                    maxLength={300}
                    onChange={(event) => {
                      setSituation(event.target.value)
                      setGenerationStatus('idle')
                      setGenerationError(null)
                    }}
                    placeholder="더 알려주고 싶은 상황이 있다면 적어주세요"
                    value={situation}
                  />
                  <span className="field-count" aria-live="polite">
                    {situation.length}/300자
                  </span>
                </label>
              </>
            ) : (
              <label className="field">
                <span>상황 설명</span>
                <textarea
                  aria-label="상황 설명"
                  maxLength={300}
                  onChange={(event) => {
                    setSituation(event.target.value)
                    setGenerationStatus('idle')
                    setGenerationError(null)
                  }}
                  placeholder={selectedScenario.example}
                  value={situation}
                />
                <span className="field-count" aria-live="polite">
                  {situation.length}/300자
                </span>
              </label>
            )}

            <p className="privacy-note">
              실명·연락처·학번은 빼고 적어주세요. 입력 내용은 마지막 선택 후 30분 동안 이 탭에만 임시 보관돼요.
            </p>
            <button
              className="generate-button"
              disabled={!canGenerate || isGenerating}
              onClick={() => void generateFromManual()}
              type="button"
            >
              {isGenerating ? '보낼 말을 만들고 있어요…' : '보낼 말 3가지 만들기'}
            </button>
            {generateGuide && (
              <p className="generate-guide" role="status">
                {generateGuide}
              </p>
            )}
            {isGenerating && (
              <>
                <p className="generation-status" role="status">
                  {isLongWait ? '조금만 더 기다려주세요.' : loadingMessages[loadingMessageIndex]}
                </p>
                <div aria-label="보낼 말 후보를 준비하고 있어요" className="result-list generation-skeleton">
                  {[1, 2, 3].map((skeletonIndex) => (
                    <div className="generation-skeleton-card" key={skeletonIndex} />
                  ))}
                </div>
              </>
            )}
            {generationStatus === 'error' && generationError && (
              <div className="generation-error" role="alert">
                <p>{generationErrorMessage[generationError]}</p>
                <button onClick={() => void generateFromManual()} type="button">
                  다시 시도
                </button>
              </div>
            )}
            <button className="privacy-clear" onClick={restart} type="button">
              이 탭의 작성 내용 지우기
            </button>
          </div>
        )}

        {step === 'result' && selectedScenario && (
          <div className="demo-panel wizard-panel">
            <button
              className="wizard-back"
              onClick={source === 'template' ? backToSituation : goToManual}
              type="button"
            >
              상황 수정
            </button>
            <div className="section-heading">
              <span>S3</span>
              <div>
                <h2>보낼 말 후보</h2>
                <p>{selectedScenario.name} 상황에 맞춘 톤 3단계예요.</p>
              </div>
            </div>
            {source === 'ai' && (
              <p className="mock-note">현재는 AI 연결 전 검증용 예시 후보입니다.</p>
            )}
            {generationStatus === 'error' && generationError && (
              <div className="generation-error" role="alert">
                <p>{generationErrorMessage[generationError]}</p>
                <button onClick={() => void generateFromManual()} type="button">
                  다시 시도
                </button>
              </div>
            )}

            <div className="result-list">
              {candidates.map((candidate) => (
                <article className="result-card" key={candidate.toneLevel}>
                  <div className="result-meta">
                    <span>{candidate.toneLabel}</span>
                    {hasPlaceholder(candidate.text) && <em>빈칸을 채워주세요</em>}
                  </div>
                  <p
                    ref={(element) => {
                      if (element) {
                        resultTextRefs.current.set(candidate.toneLevel, element)
                        return
                      }
                      resultTextRefs.current.delete(candidate.toneLevel)
                    }}
                  >
                    {renderCandidateText(candidate.text)}
                  </p>
                  <button disabled={isRerolling} onClick={() => void copyCandidate(candidate)} type="button">
                    {copiedTone === candidate.toneLevel
                      ? '복사됨 ✓'
                      : fallbackTone === candidate.toneLevel
                        ? '텍스트 선택됨'
                        : copyFailedTone === candidate.toneLevel
                          ? '복사 실패'
                          : '복사'}
                  </button>
                  {copiedNoticeTone === candidate.toneLevel &&
                    (hasPlaceholder(candidate.text) ? (
                      <p className="copy-feedback" role="status">
                        복사했어요. 보내기 전에 빈칸을 채워 보내주세요.
                      </p>
                    ) : (
                      <p className="copy-feedback sr-only" role="status">
                        복사했어요.
                      </p>
                    ))}
                  {fallbackTone === candidate.toneLevel && (
                    <p className="copy-feedback" role="status">
                      텍스트를 선택했어요. 길게 눌러 복사해주세요.
                    </p>
                  )}
                  {copyFailedTone === candidate.toneLevel && (
                    <p className="copy-feedback copy-feedback--error" role="alert">
                      복사하지 못했어요. 텍스트를 길게 눌러 복사해주세요.
                    </p>
                  )}
                </article>
              ))}
            </div>

            <button className="wizard-back wizard-reroll" disabled={isRerolling} onClick={reroll} type="button">
              {source === 'template' ? '내 상황에 더 맞추기' : isRerolling ? '다시 만들고 있어요…' : '다시 만들기'}
            </button>
            <button className="wizard-restart" onClick={restart} type="button">
              처음으로 (작성 내용 지우기)
            </button>
          </div>
        )}
      </section>
    </main>
  )
}

export default ProjectIntro
