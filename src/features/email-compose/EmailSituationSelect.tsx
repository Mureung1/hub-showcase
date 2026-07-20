import { emailSituationCards, type EmailSituationId } from '../../entities/message'

type EmailSituationSelectProps = {
  onSelect: (emailSituationId: EmailSituationId) => void
}

function EmailSituationSelect({ onSelect }: EmailSituationSelectProps) {
  return (
    <>
      <p className="email-style-note">
        <strong>이메일은 예의를 위해 습니다체로 작성해요.</strong>
        입력한 내용으로 제목과 본문을 나눠 준비할게요.
      </p>
      <div aria-label="이메일 상황 빠른 답변" className="email-situation-list">
        {emailSituationCards.map((card) => (
          <button className="email-situation-card" key={card.id} onClick={() => onSelect(card.id)} type="button">
            {card.label}
          </button>
        ))}
      </div>
    </>
  )
}

export default EmailSituationSelect
