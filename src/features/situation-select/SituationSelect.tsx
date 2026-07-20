import type { RefObject } from 'react'
import {
  catAssistantAssets,
  situationCardsFor,
  type ContactChannel,
  type EmailSituationId,
  type Mode,
  type Scenario,
  type SituationId,
} from '../../entities/message'
import { AssistantPrompt } from '../guided-chat'
import { ContactChannelSelect } from '../contact-channel'
import { EmailSituationSelect } from '../email-compose'

type SituationSelectProps = {
  headingRef: RefObject<HTMLHeadingElement | null>
  scenario: Scenario
  mode: Mode | null
  onBack: () => void
  onSelectContactChannel: (contactChannel: ContactChannel) => void
  onSelectEmailSituation: (emailSituationId: EmailSituationId) => void
  onSelectCard: (situationId: SituationId) => void
  onManual: () => void
  selectedContactChannel: ContactChannel | null
}

function SituationSelect({
  headingRef,
  scenario,
  mode,
  onBack,
  onSelectContactChannel,
  onSelectEmailSituation,
  onSelectCard,
  onManual,
  selectedContactChannel,
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
            ? mode === 'reply'
              ? '답장할 연락 형식을 고르면 필요한 상황을 이어서 물어볼게요.'
              : '먼저 연락할 형식을 고르면 필요한 상황을 이어서 물어볼게요.'
            : '가까운 상황을 고르면 핵심만 한 번 더 물어볼게요.'
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

      {showsMessengerSituations && mode === 'reply' && (
        <p className="situation-reply-note">
          상황 카드와 빠른 질문은 받은 메시지 원문을 읽지 않아요. 원문에 맞추려면 ‘내 상황을 직접 설명하기’를 골라주세요.
        </p>
      )}

      {showsMessengerSituations && (
        <>
          <div className="situation-path-heading" id="situation-card-path-heading">
            <strong>자주 쓰는 상황에서 빠르게</strong>
            <span>카드를 고르고 한 가지만 답하면 세 가지 톤으로 써드려요</span>
          </div>
          <div aria-labelledby="situation-card-path-heading" className="situation-list">
            {situationCardsFor(scenario.id).map((card) => (
              <button
                className="situation-card"
                key={card.id}
                onClick={() => onSelectCard(card.id)}
                type="button"
              >
                {card.label}
              </button>
            ))}
          </div>
          <button
            aria-describedby="manual-situation-description"
            aria-label="내 상황을 직접 설명하기"
            className="situation-card situation-card--other"
            onClick={onManual}
            type="button"
          >
            <strong>내 상황을 직접 설명하기</strong>
            <small id="manual-situation-description">받은 내용이나 세부 상황을 반영해요</small>
          </button>
        </>
      )}

      {showsEmailSituations && <EmailSituationSelect onSelect={onSelectEmailSituation} />}
    </div>
  )
}

export default SituationSelect
