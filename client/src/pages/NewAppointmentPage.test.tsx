import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import axios from 'axios'
import NewAppointmentPage from './NewAppointmentPage.tsx'
import { getSession } from '../lib/session.ts'

vi.mock('axios', () => {
  const post = vi.fn()
  const isAxiosError = (error: unknown) => Boolean(error && typeof error === 'object' && 'response' in error)
  return { default: { post, isAxiosError } }
})

const navigateMock = vi.fn()
vi.mock('react-router', () => ({ useNavigate: () => navigateMock }))

const postMock = vi.mocked(axios.post)

function fillValidForm() {
  fireEvent.change(screen.getByLabelText('약속 제목'), { target: { value: '팀 회의' } })
  fireEvent.change(screen.getByLabelText('후보 날짜 (시작)'), { target: { value: '2026-08-01' } })
  fireEvent.change(screen.getByLabelText('후보 날짜 (종료)'), { target: { value: '2026-08-02' } })
  fireEvent.change(screen.getByLabelText('만남 가능 시간대 (시작)'), { target: { value: '09:00' } })
  fireEvent.change(screen.getByLabelText('만남 가능 시간대 (종료)'), { target: { value: '18:00' } })
  fireEvent.change(screen.getByLabelText('약속 전체 인원수'), { target: { value: '5' } })
  fireEvent.change(screen.getByLabelText('생성자 이름'), { target: { value: '방장' } })
  fireEvent.change(screen.getByLabelText('관리자 비밀번호'), { target: { value: '1234' } })
}

function submit() {
  fireEvent.click(screen.getByRole('button', { name: '약속 만들기' }))
}

describe('NewAppointmentPage', () => {
  beforeEach(() => {
    postMock.mockReset()
    navigateMock.mockClear()
    localStorage.clear()
  })

  it('필수값을 비우고 제출하면 유효성 에러를 보여주고 API를 호출하지 않는다', async () => {
    render(<NewAppointmentPage />)

    submit()

    expect(await screen.findByText('약속 제목을 입력해주세요')).toBeInTheDocument()
    expect(screen.getByText('이름을 입력해주세요')).toBeInTheDocument()
    expect(screen.getByText('숫자 4자리를 입력해주세요')).toBeInTheDocument()
    expect(postMock).not.toHaveBeenCalled()
  })

  it('종료 날짜가 시작 날짜보다 이르면 에러를 보여준다', async () => {
    render(<NewAppointmentPage />)

    fillValidForm()
    fireEvent.change(screen.getByLabelText('후보 날짜 (시작)'), { target: { value: '2026-08-05' } })
    fireEvent.change(screen.getByLabelText('후보 날짜 (종료)'), { target: { value: '2026-08-01' } })
    submit()

    expect(await screen.findByText('종료 날짜는 시작 날짜 이후여야 해요')).toBeInTheDocument()
    expect(postMock).not.toHaveBeenCalled()
  })

  it('정상 입력이면 API를 호출하고, 성공하면 세션을 저장한 뒤 상세 페이지로 이동한다', async () => {
    postMock.mockResolvedValueOnce({ data: { appointmentId: 'appt-1', participantId: 'p-1' } })
    render(<NewAppointmentPage />)

    fillValidForm()
    submit()

    await waitFor(() => {
      expect(postMock).toHaveBeenCalledWith('/api/appointments', {
        title: '팀 회의',
        dateStart: '2026-08-01',
        dateEnd: '2026-08-02',
        timeStart: '09:00',
        timeEnd: '18:00',
        deadline: '',
        headcount: 5,
        creatorName: '방장',
        adminPassword: '1234',
      })
    })
    expect(getSession('appt-1')).toEqual({ participantId: 'p-1', role: 'admin' })
    expect(navigateMock).toHaveBeenCalledWith('/a/appt-1', { state: { justCreated: true } })
  })

  it('400 필드 에러가 오면 해당 필드에 에러를 표시한다', async () => {
    postMock.mockRejectedValueOnce({
      response: { status: 400, data: { fields: { title: '서버가 거부한 제목이에요' } } },
    })
    render(<NewAppointmentPage />)

    fillValidForm()
    submit()

    expect(await screen.findByText('서버가 거부한 제목이에요')).toBeInTheDocument()
    expect(navigateMock).not.toHaveBeenCalled()
  })

  it('네트워크 에러 등 그 외 실패는 공통 에러 메시지를 보여준다', async () => {
    postMock.mockRejectedValueOnce(new Error('network down'))
    render(<NewAppointmentPage />)

    fillValidForm()
    submit()

    expect(await screen.findByText('약속 생성에 실패했어요. 잠시 후 다시 시도해주세요.')).toBeInTheDocument()
    expect(navigateMock).not.toHaveBeenCalled()
  })
})