import { Button } from '@/shared/ui/Button'
import { Input } from '@/shared/ui/Input'

import { Disclaimer, InputBarWrapper, InputRow, StyledInputWrapper } from './AskAiInputBar.styles'

interface AskAiInputBarProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  isSubmitDisabled: boolean
}

export const AskAiInputBar = ({ value, onChange, onSubmit, isSubmitDisabled }: AskAiInputBarProps) => (
  <InputBarWrapper>
    <InputRow>
      <StyledInputWrapper>
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="예: 삼성전자 지금 들어가도 돼?"
        />
      </StyledInputWrapper>
      <Button onClick={onSubmit} disabled={isSubmitDisabled}>
        분석하기
      </Button>
    </InputRow>
    <Disclaimer>가즈아는 투자 판단을 돕는 참고 정보를 제공하며, 최종 투자 결정과 책임은 사용자에게 있습니다.</Disclaimer>
  </InputBarWrapper>
)
