import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import axios from 'axios'
import JoinAppointmentForm from './JoinAppointmentForm.tsx'
import { setSession } from '../lib/session.ts'

vi.mock('axios', () => {
  const post = vi.fn()
  const isAxiosError = (error: unknown) => Boolean(error && typeof error === 'object' && 'response' in error)
  return { default: { post, isAxiosError } }
})

const postMock = vi.mocked(axios.post)

function fillNameAndPassword(name: string, password: string) {
  fireEvent.change(screen.getByLabelText('이름'), { target: { value: name } })
  fireEvent.change(screen.getByLabelText('간편 비밀번호'), { target: { value: password } })
}

function submit() {
  fireEvent.click(screen.getByRole('button', { name: '참여하기' }))
}

describe('JoinAppointmentForm', () => {
  beforeEach(() => {
    postMock.mockReset()
    localStorage.clear()
  })

  it('appointmentId가 있으면 참여 링크 칸이 채워지고 비활성화된다', () => {
    render(<JoinAppointmentForm appointmentId="abc-123" onSuccess={vi.fn()} />)

    const linkInput = screen.getByLabelText('참여 링크')
    expect(linkInput).toHaveValue(`${window.location.origin}/a/abc-123`)
    expect(linkInput).toBeDisabled()
  })

  it('appointmentId가 없으면 참여 링크 칸이 비어있고 입력 가능하다', () => {
    render(<JoinAppointmentForm onSuccess={vi.fn()} />)

    const linkInput = screen.getByLabelText('참여 링크')
    expect(linkInput).toHaveValue('')
    expect(linkInput).not.toBeDisabled()
  })

  it('이름/비밀번호를 비우고 제출하면 유효성 에러를 보여주고 API를 호출하지 않는다', async () => {
    render(<JoinAppointmentForm appointmentId="abc-123" onSuccess={vi.fn()} />)

    submit()

    expect(await screen.findByText('이름을 입력해주세요')).toBeInTheDocument()
    expect(screen.getByText('숫자 4자리를 입력해주세요')).toBeInTheDocument()
    expect(postMock).not.toHaveBeenCalled()
  })

  it('appointmentId가 있으면 그 id로 참여 API를 호출하고 성공하면 onSuccess를 호출한다', async () => {
    const onSuccess = vi.fn()
    postMock.mockResolvedValueOnce({ data: { participantId: 'p1', role: 'participant' } })
    render(<JoinAppointmentForm appointmentId="abc-123" onSuccess={onSuccess} />)

    fillNameAndPassword('철수', '1234')
    submit()

    await waitFor(() => {
      expect(postMock).toHaveBeenCalledWith('/api/appointments/abc-123/participants', {
        name: '철수',
        password: '1234',
      })
    })
    expect(onSuccess).toHaveBeenCalledWith({ participantId: 'p1', role: 'participant' }, 'abc-123')
  })

  it('appointmentId에 이미 세션이 저장되어 있으면 API 호출 없이 바로 onSuccess를 호출한다', async () => {
    const onSuccess = vi.fn()
    setSession('abc-123', { participantId: 'p9', role: 'participant' })
    render(<JoinAppointmentForm appointmentId="abc-123" onSuccess={onSuccess} />)

    fillNameAndPassword('철수', '1234')
    submit()

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith({ participantId: 'p9', role: 'participant' }, 'abc-123')
    })
    expect(postMock).not.toHaveBeenCalled()
  })

  it('링크로 파싱된 id에 이미 세션이 저장되어 있으면 API 호출 없이 바로 onSuccess를 호출한다', async () => {
    const onSuccess = vi.fn()
    setSession('xyz-789', { participantId: 'p10', role: 'admin' })
    render(<JoinAppointmentForm onSuccess={onSuccess} />)

    fireEvent.change(screen.getByLabelText('참여 링크'), {
      target: { value: 'http://localhost:5173/a/xyz-789' },
    })
    fillNameAndPassword('영희', '5678')
    submit()

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith({ participantId: 'p10', role: 'admin' }, 'xyz-789')
    })
    expect(postMock).not.toHaveBeenCalled()
  })

  it('appointmentId가 없으면 붙여넣은 링크를 파싱해서 그 id로 API를 호출한다', async () => {
    const onSuccess = vi.fn()
    postMock.mockResolvedValueOnce({ data: { participantId: 'p2', role: 'participant' } })
    render(<JoinAppointmentForm onSuccess={onSuccess} />)

    fireEvent.change(screen.getByLabelText('참여 링크'), {
      target: { value: 'http://localhost:5173/a/xyz-789' },
    })
    fillNameAndPassword('영희', '5678')
    submit()

    await waitFor(() => {
      expect(postMock).toHaveBeenCalledWith('/api/appointments/xyz-789/participants', {
        name: '영희',
        password: '5678',
      })
    })
    expect(onSuccess).toHaveBeenCalledWith({ participantId: 'p2', role: 'participant' }, 'xyz-789')
  })

  it('링크를 파싱할 수 없으면 에러를 보여주고 API를 호출하지 않는다', async () => {
    render(<JoinAppointmentForm onSuccess={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('참여 링크'), { target: { value: '이상한 텍스트' } })
    fillNameAndPassword('철수', '1234')
    submit()

    expect(await screen.findByText('올바른 참여 링크가 아니에요')).toBeInTheDocument()
    expect(postMock).not.toHaveBeenCalled()
  })

  it('401이면 비밀번호가 일치하지 않는다는 에러를 보여준다', async () => {
    postMock.mockRejectedValueOnce({ response: { status: 401 } })
    render(<JoinAppointmentForm appointmentId="abc-123" onSuccess={vi.fn()} />)

    fillNameAndPassword('철수', '1234')
    submit()

    expect(await screen.findByText('비밀번호가 일치하지 않아요')).toBeInTheDocument()
  })

  it('404면 존재하지 않는 약속이라는 에러를 링크 칸 쪽에 보여준다', async () => {
    postMock.mockRejectedValueOnce({ response: { status: 404 } })
    render(<JoinAppointmentForm appointmentId="abc-123" onSuccess={vi.fn()} />)

    fillNameAndPassword('철수', '1234')
    submit()

    expect(await screen.findByText('존재하지 않는 약속이에요')).toBeInTheDocument()
  })

  it('400 필드 에러가 오면 해당 필드에 에러를 표시한다', async () => {
    postMock.mockRejectedValueOnce({
      response: { status: 400, data: { fields: { name: '서버가 거부한 이름이에요' } } },
    })
    render(<JoinAppointmentForm appointmentId="abc-123" onSuccess={vi.fn()} />)

    fillNameAndPassword('철수', '1234')
    submit()

    expect(await screen.findByText('서버가 거부한 이름이에요')).toBeInTheDocument()
  })

  it('네트워크 에러 등 그 외 실패는 공통 에러 메시지를 보여준다', async () => {
    postMock.mockRejectedValueOnce(new Error('network down'))
    render(<JoinAppointmentForm appointmentId="abc-123" onSuccess={vi.fn()} />)

    fillNameAndPassword('철수', '1234')
    submit()

    expect(await screen.findByText('참여에 실패했어요. 잠시 후 다시 시도해주세요.')).toBeInTheDocument()
  })
})
