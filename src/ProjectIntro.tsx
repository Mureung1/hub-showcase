import { useState } from 'react'

type ScenarioId = 'groupwork' | 'professor' | 'senior' | 'friend'
type PurposeId = 'ask' | 'apologize' | 'decline' | 'question' | 'suggest' | 'other'
type ToneLevel = 1 | 2 | 3
type Mode = 'reply' | 'initiate'
type Step = 'mode' | 'scenario' | 'situation' | 'manual' | 'result'
type Source = 'template' | 'ai'
type SituationId =
  | 'schedule'
  | 'thanks_check'
  | 'ask'
  | 'apologize'
  | 'decline'
  | 'contribution_check'
  | 'absence_inquiry'
  | 'casual_request'
  | 'express_feelings'

type Scenario = {
  id: ScenarioId
  helper: string
  name: string
  summary: string
  example: string
}

type Purpose = {
  id: PurposeId
  label: string
}

type SituationCard = {
  id: SituationId
  label: string
}

type Candidate = {
  toneLevel: ToneLevel
  toneLabel: string
  text: string
}

const scenarios: Scenario[] = [
  {
    id: 'groupwork',
    helper: '팀플냥',
    name: '팀플·조모임',
    summary: '할 말은 해야 할 때',
    example: '자료 마감이 오늘인데 팀원이 아직 공유를 안 했어요.',
  },
  {
    id: 'professor',
    helper: '교수냥',
    name: '교수님·조교님',
    summary: '결석·기한 연장·질문, 정중하게',
    example: '과제 제출 기한을 하루만 연장 가능한지 여쭤보고 싶어요.',
  },
  {
    id: 'senior',
    helper: '선배냥',
    name: '선배·동기',
    summary: '존댓말 수위가 애매할 때',
    example: '동아리 회의 시간을 다시 확인하고 싶어요.',
  },
  {
    id: 'friend',
    helper: '연인냥',
    name: '친구·연인',
    summary: '마음은 있는데 말이 안 나올 때',
    example: '약속을 미뤄야 하는데 서운하지 않게 말하고 싶어요.',
  },
]

const purposes: Purpose[] = [
  { id: 'ask', label: '부탁하기' },
  { id: 'apologize', label: '사과하기' },
  { id: 'decline', label: '거절하기' },
  { id: 'question', label: '질문하기' },
  { id: 'suggest', label: '제안·확인하기' },
  { id: 'other', label: '기타' },
]

const toneLabels: Record<ToneLevel, string> = {
  1: '기본',
  2: '더 부드럽게',
  3: '더 분명하게',
}

const commonSituations: SituationCard[] = [
  { id: 'schedule', label: '일정 조율' },
  { id: 'thanks_check', label: '감사·확인' },
  { id: 'ask', label: '부탁' },
  { id: 'apologize', label: '사과' },
  { id: 'decline', label: '거절' },
]

const specificSituation: Record<ScenarioId, SituationCard> = {
  groupwork: { id: 'contribution_check', label: '몫 확인·재촉' },
  professor: { id: 'absence_inquiry', label: '결석·과제 문의' },
  senior: { id: 'casual_request', label: '말 편하게 하자고 하기' },
  friend: { id: 'express_feelings', label: '마음 표현하기' },
}

const situationCardsFor = (scenarioId: ScenarioId): SituationCard[] => [
  ...commonSituations,
  specificSituation[scenarioId],
]

const templates: Record<ScenarioId, Partial<Record<SituationId, Record<ToneLevel, string>>>> = {
  groupwork: {
    schedule: {
      1: '이번 주 미팅 시간 다시 맞춰볼까? 다들 편한 시간대로 알려줘.',
      2: '다들 바쁜 거 아는데, 이번 주 미팅 시간 다시 한번 맞춰볼 수 있을까?',
      3: '이번 주 미팅 시간을 오늘 안으로 확정해야 해서, 가능한 시간대를 지금 알려줘.',
    },
    thanks_check: {
      1: '확인했어! 챙겨줘서 고마워.',
      2: '챙겨줘서 정말 고마워, 덕분에 잘 확인했어.',
      3: '확인 완료. 알려줘서 고마워.',
    },
    ask: {
      1: '혹시 이 부분 좀 도와줄 수 있어?',
      2: '바쁜 거 아는데, 혹시 이 부분 좀 도와줄 수 있을까?',
      3: '이 부분 오늘 안에 도와줘야 해. 가능할까?',
    },
    apologize: {
      1: '내가 늦어서 미안해, 다음부터는 더 신경 쓸게.',
      2: '정말 미안해, 내가 더 신경 썼어야 했는데.',
      3: '늦어서 미안해. 앞으로는 이런 일 없도록 할게.',
    },
    decline: {
      1: '미안한데 이번엔 어려울 것 같아.',
      2: '미안해, 사정이 있어서 이번엔 함께하기 어려울 것 같아.',
      3: '이번엔 참여하기 어려워. 다음에 참여할게.',
    },
    contribution_check: {
      1: '맡은 부분 진행 상황 공유해줄 수 있을까?',
      2: '바쁜 거 알지만, 맡은 부분 진행 상황을 공유해주면 좋겠어.',
      3: '맡은 부분을 오늘 안으로 공유해줘. 상황 파악이 필요해.',
    },
  },
  professor: {
    schedule: {
      1: '안녕하세요 교수님, 면담 가능한 시간대를 여쭙고 싶습니다.',
      2: '안녕하세요 교수님, 바쁘신 줄 알지만 면담 가능한 시간대를 여쭤봐도 될까요?',
      3: '안녕하세요 교수님, 면담 가능한 시간대를 확인 부탁드립니다.',
    },
    thanks_check: {
      1: '안녕하세요 교수님, 확인해주셔서 감사합니다.',
      2: '교수님, 신경 써서 확인해주셔서 정말 감사드립니다.',
      3: '확인 감사합니다, 교수님.',
    },
    ask: {
      1: '안녕하세요 교수님, 부탁드릴 것이 있어 연락드립니다.',
      2: '안녕하세요 교수님, 조심스럽지만 부탁드리고 싶은 것이 있습니다.',
      3: '교수님, 요청드릴 사항이 있어 연락드립니다.',
    },
    apologize: {
      1: '안녕하세요 교수님, 늦어져 죄송합니다.',
      2: '교수님, 불편을 드려 정말 죄송합니다.',
      3: '늦어진 점 사과드립니다, 교수님.',
    },
    decline: {
      1: '안녕하세요 교수님, 이번엔 참여가 어려울 것 같아 말씀드립니다.',
      2: '교수님, 사정상 이번엔 어려울 것 같아 조심스럽게 말씀드립니다.',
      3: '이번 건은 참여가 어렵습니다, 교수님.',
    },
    absence_inquiry: {
      1: '안녕하세요 교수님. [과목명] 수강생입니다. 결석 사유를 말씀드리고 과제 제출 기한을 여쭙고 싶습니다.',
      2: '안녕하세요 교수님. [과목명] 수업에 부득이한 사정으로 결석하게 되어 조심스럽게 연락드립니다. 과제 제출은 어떻게 하면 될까요?',
      3: '안녕하세요 교수님. [과목명] 결석 사유를 알려드리며, 과제 제출 기한 확인 부탁드립니다.',
    },
  },
  senior: {
    schedule: {
      1: '선배님, 이번 모임 시간 다시 확인하고 싶어요.',
      2: '선배님, 바쁘신 줄 알지만 모임 시간 한 번만 확인 부탁드려도 될까요?',
      3: '선배님, 모임 시간 확인 부탁드립니다.',
    },
    thanks_check: {
      1: '선배님, 확인해주셔서 감사해요!',
      2: '선배님 덕분에 잘 확인했어요, 감사합니다!',
      3: '확인 감사합니다, 선배님.',
    },
    ask: {
      1: '선배님, 혹시 여쭤볼 게 있는데 시간 괜찮으세요?',
      2: '선배님, 바쁘신데 죄송하지만 여쭤볼 게 있어요.',
      3: '선배님, 여쭤볼 게 있습니다.',
    },
    apologize: {
      1: '선배님, 늦어서 죄송해요.',
      2: '선배님, 정말 죄송해요. 신경 썼어야 했는데.',
      3: '늦어진 점 죄송합니다, 선배님.',
    },
    decline: {
      1: '선배님, 이번엔 참여가 어려울 것 같아요.',
      2: '선배님, 사정이 있어서 이번엔 어려울 것 같아 조심스럽네요.',
      3: '이번 건은 참여가 어렵습니다, 선배님.',
    },
    casual_request: {
      1: '선배님, 편하게 말씀 놓으셔도 괜찮아요!',
      2: '선배님, 괜찮으시면 편하게 말씀 놓으셔도 좋을 것 같아요.',
      3: '선배님, 이제 편하게 말씀 놓으세요.',
    },
  },
  friend: {
    schedule: {
      1: '우리 이번 주 언제 볼지 다시 얘기해볼까?',
      2: '우리 이번 주 시간 맞춰보고 싶은데, 언제가 괜찮아?',
      3: '이번 주 만날 시간 오늘 정하자.',
    },
    thanks_check: {
      1: '챙겨줘서 고마워, 잘 확인했어!',
      2: '이렇게 챙겨줘서 진짜 고마워.',
      3: '확인했어, 고마워.',
    },
    ask: {
      1: '혹시 부탁 하나 해도 될까?',
      2: '미안한데 부탁 하나만 들어줄 수 있어?',
      3: '부탁 하나만 들어줘.',
    },
    apologize: {
      1: '미안해, 내가 더 신경 썼어야 했는데.',
      2: '정말 미안해, 마음 상하게 했다면 미안해.',
      3: '미안해. 앞으로는 이런 일 없게 할게.',
    },
    decline: {
      1: '미안한데 이번엔 어려울 것 같아.',
      2: '미안해, 이번엔 함께하기 어려울 것 같아.',
      3: '이번엔 어려워. 다음에 하자.',
    },
    express_feelings: {
      1: '요즘 너랑 있으면 편하고 좋아.',
      2: '말하기 조금 부끄럽지만, 너랑 있으면 정말 좋아.',
      3: '나 너 좋아해.',
    },
  },
}

const aiDemoMessages: Record<ScenarioId, Record<ToneLevel, string>> = {
  groupwork: {
    1: '[상황]을 반영해서 답냥이가 새로 써준 문장이에요 — 기본 톤.',
    2: '[상황]을 반영해서 답냥이가 새로 써준 문장이에요 — 더 부드러운 톤.',
    3: '[상황]을 반영해서 답냥이가 새로 써준 문장이에요 — 더 분명한 톤.',
  },
  professor: {
    1: '안녕하세요 교수님. [상황]을 반영해 답냥이가 새로 써준 문장이에요 — 기본 톤.',
    2: '안녕하세요 교수님. [상황]을 반영해 답냥이가 새로 써준 문장이에요 — 더 부드러운 톤.',
    3: '안녕하세요 교수님. [상황]을 반영해 답냥이가 새로 써준 문장이에요 — 더 분명한 톤.',
  },
  senior: {
    1: '선배님, [상황]을 반영해서 답냥이가 새로 써준 문장이에요 — 기본 톤.',
    2: '선배님, [상황]을 반영해서 답냥이가 새로 써준 문장이에요 — 더 부드러운 톤.',
    3: '선배님, [상황]을 반영해서 답냥이가 새로 써준 문장이에요 — 더 분명한 톤.',
  },
  friend: {
    1: '[상황]을 반영해서 답냥이가 새로 써준 문장이에요 — 기본 톤.',
    2: '[상황]을 반영해서 답냥이가 새로 써준 문장이에요 — 더 부드러운 톤.',
    3: '[상황]을 반영해서 답냥이가 새로 써준 문장이에요 — 더 분명한 톤.',
  },
}

const buildCandidates = (source: Record<ToneLevel, string>): Candidate[] =>
  ([1, 2, 3] as const).map((toneLevel) => ({
    toneLevel,
    toneLabel: toneLabels[toneLevel],
    text: source[toneLevel],
  }))

function ProjectIntro() {
  const [step, setStep] = useState<Step>('mode')
  const [mode, setMode] = useState<Mode | null>(null)
  const [selectedScenarioId, setSelectedScenarioId] = useState<ScenarioId | null>(null)
  const [selectedPurposeId, setSelectedPurposeId] = useState<PurposeId>('ask')
  const [receivedMessage, setReceivedMessage] = useState('')
  const [situation, setSituation] = useState('')
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [source, setSource] = useState<Source>('template')
  const [copiedTone, setCopiedTone] = useState<ToneLevel | null>(null)

  const selectedScenario = scenarios.find((scenario) => scenario.id === selectedScenarioId) ?? null

  const canGenerate =
    mode !== null && (mode === 'reply' ? receivedMessage.trim().length > 0 : situation.trim().length > 0)

  const chooseMode = (nextMode: Mode) => {
    setMode(nextMode)
    setStep('scenario')
  }

  const selectScenario = (scenario: Scenario) => {
    setSelectedScenarioId(scenario.id)
    setReceivedMessage('')
    setSituation('')
    setStep('situation')
  }

  const selectSituationCard = (situationId: SituationId) => {
    if (!selectedScenarioId) return
    const toneTexts = templates[selectedScenarioId][situationId]
    if (!toneTexts) return
    setSource('template')
    setCandidates(buildCandidates(toneTexts))
    setCopiedTone(null)
    setStep('result')
  }

  const goToManual = () => setStep('manual')

  const generateFromManual = () => {
    if (!selectedScenarioId || !canGenerate) return
    setSource('ai')
    setCandidates(buildCandidates(aiDemoMessages[selectedScenarioId]))
    setCopiedTone(null)
    setStep('result')
  }

  const copyCandidate = async (candidate: Candidate) => {
    try {
      await navigator.clipboard.writeText(candidate.text)
      setCopiedTone(candidate.toneLevel)
    } catch {
      setCopiedTone(candidate.toneLevel)
    }
  }

  const backToMode = () => {
    setMode(null)
    setReceivedMessage('')
    setSituation('')
    setStep('mode')
  }

  const backToScenario = () => {
    setReceivedMessage('')
    setSituation('')
    setStep('scenario')
  }

  const backToSituation = () => setStep('situation')

  const reroll = () => {
    if (source === 'template') {
      setStep('manual')
      return
    }
    if (!selectedScenarioId) return
    setCandidates(buildCandidates(aiDemoMessages[selectedScenarioId]))
    setCopiedTone(null)
  }

  const restart = () => {
    setStep('mode')
    setMode(null)
    setSelectedScenarioId(null)
    setReceivedMessage('')
    setSituation('')
    setCandidates([])
    setCopiedTone(null)
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
                  data-selected={scenario.id === selectedScenarioId}
                  key={scenario.id}
                  onClick={() => selectScenario(scenario)}
                  type="button"
                >
                  <strong>{scenario.helper}</strong>
                  <span>{scenario.name}</span>
                  <small>{scenario.summary}</small>
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
                <p>맞는 카드가 없을 때만 여기서 직접 알려주세요 — 답냥이가 AI로 새로 써줘요.</p>
              </div>
            </div>

            <div className="purpose-list" aria-label="메시지 목적">
              {purposes.map((purpose) => (
                <button
                  className="purpose-chip"
                  data-selected={purpose.id === selectedPurposeId}
                  key={purpose.id}
                  onClick={() => setSelectedPurposeId(purpose.id)}
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
                    maxLength={500}
                    onChange={(event) => setReceivedMessage(event.target.value)}
                    placeholder="여기에 상대방이 보낸 메시지를 붙여넣어요"
                    value={receivedMessage}
                  />
                </label>
                <label className="field">
                  <span>상황 설명 (선택)</span>
                  <textarea
                    maxLength={300}
                    onChange={(event) => setSituation(event.target.value)}
                    placeholder="더 알려주고 싶은 상황이 있다면 적어주세요"
                    value={situation}
                  />
                </label>
              </>
            ) : (
              <label className="field">
                <span>상황 설명</span>
                <textarea
                  maxLength={300}
                  onChange={(event) => setSituation(event.target.value)}
                  placeholder={selectedScenario.example}
                  value={situation}
                />
              </label>
            )}

            <p className="privacy-note">실명 대신 “교수님”, “팀원”처럼 적어주세요.</p>
            <button className="generate-button" disabled={!canGenerate} onClick={generateFromManual} type="button">
              보낼 말 3가지 만들기
            </button>
          </div>
        )}

        {step === 'result' && selectedScenario && (
          <div className="demo-panel wizard-panel">
            <button className="wizard-back" onClick={backToSituation} type="button">
              상황 수정
            </button>
            <div className="section-heading">
              <span>S3</span>
              <div>
                <h2>보낼 말 후보</h2>
                <p>{selectedScenario.name} 상황에 맞춘 톤 3단계예요.</p>
              </div>
            </div>

            <div className="result-list">
              {candidates.map((candidate) => (
                <article className="result-card" key={candidate.toneLevel}>
                  <div className="result-meta">
                    <span>{candidate.toneLabel}</span>
                    {candidate.text.includes('[') && <em>빈칸을 채워주세요</em>}
                  </div>
                  <p>{candidate.text}</p>
                  <button onClick={() => void copyCandidate(candidate)} type="button">
                    {copiedTone === candidate.toneLevel ? '복사됨' : '복사'}
                  </button>
                </article>
              ))}
            </div>

            <button className="wizard-back wizard-reroll" onClick={reroll} type="button">
              다시 만들기
            </button>
            <button className="wizard-restart" onClick={restart} type="button">
              처음으로
            </button>
          </div>
        )}
      </section>
    </main>
  )
}

export default ProjectIntro
