import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ChatBotSheet from './ChatBotSheet.jsx'
import { useUser } from '../context/UserContext.jsx'
import { sendChatMessage } from '../lib/chatBot.js'

vi.mock('../context/UserContext.jsx', () => ({ useUser: vi.fn() }))
vi.mock('../lib/chatBot.js', () => ({ sendChatMessage: vi.fn() }))

describe('ChatBotSheet', () => {
  beforeEach(() => {
    useUser.mockReturnValue({ effectiveRecommended: { protein: 60 }, todayMealsTotal: { protein: 20 } })
    sendChatMessage.mockReset()
  })

  it('처음엔 트리거 버튼만 보이고 시트는 닫혀 있다', () => {
    render(<ChatBotSheet />)
    expect(screen.getByRole('button', { name: '영양 상담 챗봇 열기' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('트리거를 누르면 시트가 열린다', () => {
    render(<ChatBotSheet />)
    fireEvent.click(screen.getByRole('button', { name: '영양 상담 챗봇 열기' }))
    expect(screen.getByRole('dialog', { name: '영양 상담' })).toBeInTheDocument()
  })

  it('메시지를 보내면 사용자 말풍선이 즉시 뜨고, 응답이 오면 봇 말풍선도 뜬다', async () => {
    sendChatMessage.mockResolvedValue('오늘 단백질이 조금 부족해요.')
    render(<ChatBotSheet />)
    fireEvent.click(screen.getByRole('button', { name: '영양 상담 챗봇 열기' }))

    fireEvent.change(screen.getByPlaceholderText('예: 오늘 저녁 뭐 먹을까요?'), { target: { value: '오늘 단백질 어때요?' } })
    fireEvent.click(screen.getByRole('button', { name: '보내기' }))

    expect(screen.getByText('오늘 단백질 어때요?')).toBeInTheDocument()
    expect(await screen.findByText('오늘 단백질이 조금 부족해요.')).toBeInTheDocument()
    expect(sendChatMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        message: '오늘 단백질 어때요?',
        dailyContext: { recommended: { protein: 60 }, todayTotal: { protein: 20 } },
      }),
    )
  })

  it('빈 입력이면 보내기 버튼이 비활성화된다', () => {
    render(<ChatBotSheet />)
    fireEvent.click(screen.getByRole('button', { name: '영양 상담 챗봇 열기' }))
    expect(screen.getByRole('button', { name: '보내기' })).toBeDisabled()
  })

  it('실패하면 에러 메시지를 보여준다', async () => {
    sendChatMessage.mockRejectedValue(new Error('잠시 후 다시 시도해주세요.'))
    render(<ChatBotSheet />)
    fireEvent.click(screen.getByRole('button', { name: '영양 상담 챗봇 열기' }))
    fireEvent.change(screen.getByPlaceholderText('예: 오늘 저녁 뭐 먹을까요?'), { target: { value: '질문' } })
    fireEvent.click(screen.getByRole('button', { name: '보내기' }))

    expect(await screen.findByText('잠시 후 다시 시도해주세요.')).toBeInTheDocument()
  })

  it('배경을 클릭하면 시트가 닫힌다', async () => {
    render(<ChatBotSheet />)
    fireEvent.click(screen.getByRole('button', { name: '영양 상담 챗봇 열기' }))
    const dialog = screen.getByRole('dialog')
    fireEvent.click(dialog)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('메시지마다 DM처럼 아바타와 이름표를 보여준다(리텐션 강화 v4)', async () => {
    sendChatMessage.mockResolvedValue('오늘 단백질이 조금 부족해요.')
    render(<ChatBotSheet />)
    fireEvent.click(screen.getByRole('button', { name: '영양 상담 챗봇 열기' }))

    fireEvent.change(screen.getByPlaceholderText('예: 오늘 저녁 뭐 먹을까요?'), { target: { value: '오늘 단백질 어때요?' } })
    fireEvent.click(screen.getByRole('button', { name: '보내기' }))

    await screen.findByText('오늘 단백질이 조금 부족해요.')
    expect(screen.getByText('나')).toBeInTheDocument()
    expect(screen.getByText('Meal-Bot')).toBeInTheDocument()
  })

  it('연속 입력 중에도 입력창 포커스가 유지된다(한글 조합 깨짐 회귀 방지)', () => {
    render(<ChatBotSheet />)
    fireEvent.click(screen.getByRole('button', { name: '영양 상담 챗봇 열기' }))
    const input = screen.getByPlaceholderText('예: 오늘 저녁 뭐 먹을까요?')

    input.focus()
    expect(input).toHaveFocus()
    fireEvent.change(input, { target: { value: '아' } })
    expect(input).toHaveFocus()
    fireEvent.change(input, { target: { value: '안' } })
    expect(input).toHaveFocus()
    fireEvent.change(input, { target: { value: '안녕' } })
    expect(input).toHaveFocus()
    expect(input).toHaveValue('안녕')
  })
})
