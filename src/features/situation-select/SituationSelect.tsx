import type { RefObject } from 'react'
import {
  catAssistantAssets,
  situationCardsFor,
  type ContactChannel,
  type EmailSituationId,
  type Mode,
  type Scenario,
  type SpeechStyleId,
  type SituationId,
} from '../../entities/message'
import { AssistantPrompt } from '../guided-chat'
import { SpeechStyleSelect } from '../manual-input'
import { ContactChannelSelect } from '../contact-channel'
import { EmailSituationSelect } from '../email-compose'

type SituationSelectProps = {
  headingRef: RefObject<HTMLHeadingElement | null>
  scenario: Scenario
  mode: Mode | null
  onBack: () => void
  onSelectContactChannel: (contactChannel: ContactChannel) => void
  onSelectEmailSituation: (emailSituationId: EmailSituationId) => void
  onSelectSpeechStyle: (speechStyleId: SpeechStyleId) => void
  onSelectCard: (situationId: SituationId) => void
  onManual: () => void
  selectedContactChannel: ContactChannel | null
  selectedSpeechStyleId: SpeechStyleId | null
}

function SituationSelect({
  headingRef,
  scenario,
  mode,
  onBack,
  onSelectContactChannel,
  onSelectEmailSituation,
  onSelectSpeechStyle,
  onSelectCard,
  onManual,
  selectedContactChannel,
  selectedSpeechStyleId,
}: SituationSelectProps) {
  const isProfessor = scenario.id === 'professor'
  const showsMessengerSituations = !isProfessor || selectedContactChannel === 'messenger'
  const showsEmailSituations = isProfessor && selectedContactChannel === 'email'

  return (
    <div className="demo-panel wizard-panel">
      <button className="wizard-back" onClick={onBack} type="button">
        ← 관계 바꾸기
      </button>
      <AssistantPrompt
        assistantName={scenario.helper}
        avatarAsset={catAssistantAssets[scenario.id]}
        description={
          isProfessor && selectedContactChannel === null
            ? '먼저 연락할 형식을 고르면 필요한 상황을 이어서 물어볼게요.'
            : '아래에 있으면 한 번만 눌러도 세 가지 말로 바로 골라줄게요.'
        }
        headingRef={headingRef}
        title="어떤 상황인지 알려주라냥"
      />

      {isProfessor && (
        <div className="contact-channel-panel">
          <ContactChannelSelect onSelect={onSelectContactChannel} selectedContactChannel={selectedContactChannel} />
          {selectedContactChannel === null && (
            <p className="situation-style-guide" role="status">
              연락 형식을 먼저 골라주세요.
            </p>
          )}
        </div>
      )}

      {showsMessengerSituations && (
        <div className="situation-style-panel">
          <SpeechStyleSelect
            onSelect={onSelectSpeechStyle}
            scenarioId={scenario.id}
            selectedSpeechStyleId={selectedSpeechStyleId}
          />
          {selectedSpeechStyleId === null && (
            <p className="situation-style-guide" role="status">
              상황 카드를 고르려면 말투를 먼저 골라주세요.
            </p>
          )}
        </div>
      )}

      {showsMessengerSituations && mode === 'reply' && (
        <p className="situation-reply-note">
          아래 빠른 답변은 받은 내용을 읽지 않아요. 내용에 딱 맞추려면 ‘직접 설명할게요’를 골라주세요.
        </p>
      )}

      {showsMessengerSituations && (
        <div aria-label="상황 빠른 답변" className="situation-list">
          {situationCardsFor(scenario.id).map((card) => (
            <button
              className="situation-card"
              disabled={selectedSpeechStyleId === null}
              key={card.id}
              onClick={() => onSelectCard(card.id)}
              type="button"
            >
              {card.label}
            </button>
          ))}
          <button className="situation-card situation-card--other" onClick={onManual} type="button">
            직접 설명할게요
          </button>
        </div>
      )}

      {showsEmailSituations && <EmailSituationSelect onSelect={onSelectEmailSituation} />}
    </div>
  )
}

export default SituationSelect
