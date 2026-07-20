import type { ContactChannel } from '../../entities/message'

type ContactChannelSelectProps = {
  onSelect: (contactChannel: ContactChannel) => void
  selectedContactChannel: ContactChannel | null
}

const contactChannelOptions: { description: string; label: string; value: ContactChannel }[] = [
  {
    value: 'messenger',
    label: '메신저',
    description: '카카오톡처럼 짧게 보낼 말을 골라요.',
  },
  {
    value: 'email',
    label: '이메일',
    description: '제목과 본문을 갖춘 정중한 메일을 만들어요.',
  },
]

function ContactChannelSelect({ onSelect, selectedContactChannel }: ContactChannelSelectProps) {
  return (
    <fieldset className="contact-channel-fieldset">
      <legend>어디로 연락할까요? (필수)</legend>
      <div className="contact-channel-list">
        {contactChannelOptions.map((option) => {
          const isSelected = selectedContactChannel === option.value

          return (
            <label className="contact-channel-option" data-selected={isSelected} key={option.value}>
              <input
                checked={isSelected}
                name="contact-channel"
                onChange={() => onSelect(option.value)}
                type="radio"
                value={option.value}
              />
              <span>
                <strong>{option.label}</strong>
                <small>{option.description}</small>
              </span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

export default ContactChannelSelect
