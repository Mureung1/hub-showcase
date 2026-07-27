import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CommentForm from './CommentForm.jsx'

// onSubmit/onCancel은 부모가 넘기는 콜백이라 여기서는 가짜 함수(vi.fn())로 대체한다.
// "무엇이 호출됐는가"만 보면 되고, 실제 저장 로직은 이 컴포넌트의 책임이 아니다.
function setup() {
  const onSubmit = vi.fn()
  const onCancel = vi.fn()
  const user = userEvent.setup()
  render(<CommentForm onSubmit={onSubmit} onCancel={onCancel} />)

  return {
    user,
    onSubmit,
    onCancel,
    textarea: screen.getByRole('textbox'),
    submitButton: screen.getByRole('button', { name: '코멘트 등록' }),
    cancelButton: screen.getByRole('button', { name: '취소' }),
  }
}

describe('CommentForm', () => {
  it('입력한 텍스트로 onSubmit을 호출한다', async () => {
    const { user, onSubmit, textarea, submitButton } = setup()

    await user.type(textarea, '섹션 구조가 명확해서 읽기 좋아요')
    await user.click(submitButton)

    expect(onSubmit).toHaveBeenCalledWith('섹션 구조가 명확해서 읽기 좋아요')
  })

  it('등록하고 나면 입력창이 비워진다', async () => {
    const { user, textarea, submitButton } = setup()

    await user.type(textarea, '좋은 지적이네요')
    await user.click(submitButton)

    expect(textarea).toHaveValue('')
  })

  it('아무것도 입력하지 않으면 등록되지 않는다', async () => {
    const { user, onSubmit, submitButton } = setup()

    await user.click(submitButton)

    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('공백만 입력하면 등록되지 않는다', async () => {
    const { user, onSubmit, textarea, submitButton } = setup()

    await user.type(textarea, '    ')
    await user.click(submitButton)

    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('앞뒤 공백은 잘라내고 전달한다', async () => {
    const { user, onSubmit, textarea, submitButton } = setup()

    await user.type(textarea, '  좋아요  ')
    await user.click(submitButton)

    expect(onSubmit).toHaveBeenCalledWith('좋아요')
  })

  it('취소를 누르면 onCancel만 호출되고 등록은 되지 않는다', async () => {
    const { user, onSubmit, onCancel, textarea, cancelButton } = setup()

    await user.type(textarea, '쓰다가 마음이 바뀜')
    await user.click(cancelButton)

    expect(onCancel).toHaveBeenCalled()
    expect(onSubmit).not.toHaveBeenCalled()
  })
})
