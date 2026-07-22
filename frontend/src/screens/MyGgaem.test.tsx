import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import MyGgaem, { type CalendarState, type RecordsState } from './MyGgaem'
import type { MissionRecordCalendarDay, MissionRecordListItem } from '../api/types'

function makeCalendarDay(fields: {
  date: string
  recordCount: number
  firstMissionType: MissionRecordCalendarDay['firstMissionType']
}): MissionRecordCalendarDay {
  return fields
}

function makeRecordItem(fields: {
  id: string
  articleId: string
  articleTitle: string
  sourceName: string
  missionType: MissionRecordListItem['missionType']
  missionPrompt: string
  userAnswer: string
  createdAt: string
  originalUrl: string
  urlStatus: MissionRecordListItem['urlStatus']
}): MissionRecordListItem {
  return {
    ...fields,
    interestTags: [{ id: 'interest-1', name: 'IT·개발' }],
  }
}

const LOADING_CALENDAR: CalendarState = { status: 'loading' }
const LOADING_RECORDS: RecordsState = { status: 'loading' }

type MyGgaemProps = Parameters<typeof MyGgaem>[0]

function makeProps(overrides: Partial<MyGgaemProps> = {}): MyGgaemProps {
  return {
    displayMonth: '2026-07',
    selectedDate: '2026-07-21',
    today: '2026-07-21',
    calendarState: LOADING_CALENDAR,
    recordsState: LOADING_RECORDS,
    onPrevMonth: vi.fn(),
    onNextMonth: vi.fn(),
    onSelectDate: vi.fn(),
    onGoToToday: vi.fn(),
    ...overrides,
  }
}

function renderMyGgaem(overrides: Partial<MyGgaemProps> = {}) {
  return render(<MyGgaem {...makeProps(overrides)} />)
}

describe('MyGgaem', () => {
  it('renders the displayed month and weekday header', () => {
    renderMyGgaem()

    expect(screen.getByText('2026.07')).toBeInTheDocument()
    expect(screen.getByText('일')).toBeInTheDocument()
    expect(screen.getByText('월')).toBeInTheDocument()
    expect(screen.getByText('화')).toBeInTheDocument()
    expect(screen.getByText('수')).toBeInTheDocument()
    expect(screen.getByText('목')).toBeInTheDocument()
    expect(screen.getByText('금')).toBeInTheDocument()
    expect(screen.getByText('토')).toBeInTheDocument()
  })

  it('places the first and last day of the month at the correct 7-column position', () => {
    const { container } = renderMyGgaem()

    const grid = container.querySelector('.myggaem-days') as HTMLElement
    const cells = Array.from(grid.children)

    // 2026-07-01은 수요일(3번째 인덱스)이라 앞에 빈 칸 3개가 와야 한다.
    expect(cells.slice(0, 3).every((cell) => cell.tagName !== 'BUTTON')).toBe(true)
    expect(cells[3].tagName).toBe('BUTTON')
    expect(cells[3]).toHaveAccessibleName(/1일/)

    // 7일 단위로 채워지므로 전체 칸 수는 7의 배수여야 한다.
    expect(cells.length % 7).toBe(0)

    const dateButtons = cells.filter((cell) => cell.tagName === 'BUTTON')
    expect(dateButtons).toHaveLength(31)
    expect(dateButtons[dateButtons.length - 1]).toHaveAccessibleName(/31일/)
  })

  it('renders every day cell as a native button', () => {
    renderMyGgaem()

    const dateButtons = screen.getAllByRole('button', { name: /\d+일/ })
    expect(dateButtons).toHaveLength(31)
  })

  it('marks the selected date with aria-pressed=true and other dates false', () => {
    renderMyGgaem({ selectedDate: '2026-07-21' })

    const selected = screen.getByRole('button', { name: /21일/ })
    const notSelected = screen.getByRole('button', { name: /^1일/ })
    expect(selected).toHaveAttribute('aria-pressed', 'true')
    expect(notSelected).toHaveAttribute('aria-pressed', 'false')
  })

  it('distinguishes today from the selected date when they differ', () => {
    renderMyGgaem({ today: '2026-07-08', selectedDate: '2026-07-21' })

    const todayButton = screen.getByRole('button', { name: /^8일/ })
    const selectedButton = screen.getByRole('button', { name: /21일/ })

    expect(todayButton.className).toContain('myggaem-day--today')
    expect(todayButton.className).not.toContain('myggaem-day--selected')
    expect(selectedButton.className).toContain('myggaem-day--selected')
    expect(selectedButton.className).not.toContain('myggaem-day--today')
  })

  it('calls onSelectDate even for a date without any records', async () => {
    const onSelectDate = vi.fn()
    renderMyGgaem({
      onSelectDate,
      calendarState: { status: 'success', days: [] },
    })

    await userEvent.click(screen.getByRole('button', { name: /^5일/ }))

    expect(onSelectDate).toHaveBeenCalledExactlyOnceWith('2026-07-05')
  })

  it('calls onPrevMonth and onNextMonth without computing a new month itself', async () => {
    const onPrevMonth = vi.fn()
    const onNextMonth = vi.fn()
    renderMyGgaem({ onPrevMonth, onNextMonth })

    await userEvent.click(screen.getByRole('button', { name: '이전 달' }))
    await userEvent.click(screen.getByRole('button', { name: '다음 달' }))

    expect(onPrevMonth).toHaveBeenCalledExactlyOnceWith()
    expect(onNextMonth).toHaveBeenCalledExactlyOnceWith()
  })

  it('shows a stamp class for each of the four firstMissionType values', () => {
    const days = [
      makeCalendarDay({ date: '2026-07-06', recordCount: 1, firstMissionType: 'question' }),
      makeCalendarDay({ date: '2026-07-07', recordCount: 1, firstMissionType: 'rebuttal' }),
      makeCalendarDay({ date: '2026-07-08', recordCount: 1, firstMissionType: 'connection' }),
      makeCalendarDay({ date: '2026-07-09', recordCount: 1, firstMissionType: 'expression' }),
    ]
    const { container } = renderMyGgaem({ calendarState: { status: 'success', days } })

    expect(
      container.querySelector('.myggaem-day--has-record[aria-label^="6일"] .myggaem-day-stamp')
        ?.className,
    ).toContain('myggaem-stamp--question')
    expect(
      container.querySelector('.myggaem-day--has-record[aria-label^="7일"] .myggaem-day-stamp')
        ?.className,
    ).toContain('myggaem-stamp--rebuttal')
    expect(
      container.querySelector('.myggaem-day--has-record[aria-label^="8일"] .myggaem-day-stamp')
        ?.className,
    ).toContain('myggaem-stamp--connection')
    expect(
      container.querySelector('.myggaem-day--has-record[aria-label^="9일"] .myggaem-day-stamp')
        ?.className,
    ).toContain('myggaem-stamp--expression')
  })

  it('includes the mission type and record count in the date button accessible name', () => {
    const days = [
      makeCalendarDay({ date: '2026-07-21', recordCount: 3, firstMissionType: 'connection' }),
    ]
    renderMyGgaem({ calendarState: { status: 'success', days } })

    expect(
      screen.getByRole('button', { name: /21일.*연결.*3개/ }),
    ).toBeInTheDocument()
  })

  it('renders each selected-date record as a separate card, including repeats of the same article, in API order', () => {
    const items = [
      makeRecordItem({
        id: '50000000-0000-0000-0000-000000000002',
        articleId: '40000000-0000-0000-0000-000000000001',
        articleTitle: 'A 글',
        sourceName: '요즘IT',
        missionType: 'expression',
        missionPrompt: '이 글이 놓친 관점은 뭐지?',
        userAnswer: '두 번째 생각',
        createdAt: '2026-07-21T10:00:00Z',
        originalUrl: 'https://example.com/a',
        urlStatus: 'active',
      }),
      makeRecordItem({
        id: '50000000-0000-0000-0000-000000000001',
        articleId: '40000000-0000-0000-0000-000000000001',
        articleTitle: 'A 글',
        sourceName: '요즘IT',
        missionType: 'connection',
        missionPrompt: '내 상황이나 프로젝트와 연결해보면?',
        userAnswer: '첫 번째 생각',
        createdAt: '2026-07-21T01:00:00Z',
        originalUrl: 'https://example.com/a',
        urlStatus: 'active',
      }),
    ]
    renderMyGgaem({ recordsState: { status: 'success', items } })

    const cards = screen.getAllByRole('article')
    expect(cards).toHaveLength(2)
    // API 순서(createdAt desc, id desc) 그대로 유지되어야 하며 프론트에서 재정렬하지 않는다.
    expect(cards[0]).toHaveTextContent('두 번째 생각')
    expect(cards[1]).toHaveTextContent('첫 번째 생각')
  })

  it('shows title, source, interest tags, mission type label, prompt, answer, and KST time on each card', () => {
    const items = [
      makeRecordItem({
        id: '50000000-0000-0000-0000-000000000001',
        articleId: '40000000-0000-0000-0000-000000000001',
        articleTitle: '숏폼 시대, 우리는 정말 더 많이 이해하고 있을까',
        sourceName: '요즘IT',
        missionType: 'connection',
        missionPrompt: '내 상황이나 프로젝트와 연결해보면?',
        userAnswer: '숏폼을 보는 시간을 정해야겠다.',
        createdAt: '2026-07-21T01:00:00Z',
        originalUrl: 'https://example.com/a',
        urlStatus: 'active',
      }),
    ]
    renderMyGgaem({ recordsState: { status: 'success', items } })

    const card = screen.getAllByRole('article')[0]
    expect(card).toHaveTextContent('숏폼 시대, 우리는 정말 더 많이 이해하고 있을까')
    expect(card).toHaveTextContent('요즘IT')
    expect(card).toHaveTextContent('IT·개발')
    expect(card).toHaveTextContent('연결')
    expect(card).toHaveTextContent('내 상황이나 프로젝트와 연결해보면?')
    expect(card).toHaveTextContent('숏폼을 보는 시간을 정해야겠다.')
    // createdAt 2026-07-21T01:00:00Z -> KST 10:00
    expect(card).toHaveTextContent('10:00')
  })

  it('shows an active original link with the correct href, target, and rel', () => {
    const items = [
      makeRecordItem({
        id: '50000000-0000-0000-0000-000000000001',
        articleId: '40000000-0000-0000-0000-000000000001',
        articleTitle: 'A 글',
        sourceName: '요즘IT',
        missionType: 'connection',
        missionPrompt: '내 상황이나 프로젝트와 연결해보면?',
        userAnswer: '생각',
        createdAt: '2026-07-21T01:00:00Z',
        originalUrl: 'https://example.com/a',
        urlStatus: 'active',
      }),
    ]
    renderMyGgaem({ recordsState: { status: 'success', items } })

    const link = screen.getByRole('link', { name: /원문 다시 보기/ })
    expect(link).toHaveAttribute('href', 'https://example.com/a')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', expect.stringContaining('noreferrer'))
  })

  it.each([
    ['paywalled', /유료 콘텐츠/],
    ['broken', /링크에 문제/],
    ['removed', /삭제/],
  ] as const)(
    'shows a notice and a disabled button for urlStatus=%s',
    (urlStatus, noticePattern) => {
      const items = [
        makeRecordItem({
          id: '50000000-0000-0000-0000-000000000001',
          articleId: '40000000-0000-0000-0000-000000000001',
          articleTitle: 'A 글',
          sourceName: '요즘IT',
          missionType: 'connection',
          missionPrompt: '내 상황이나 프로젝트와 연결해보면?',
          userAnswer: '생각',
          createdAt: '2026-07-21T01:00:00Z',
          originalUrl: 'https://example.com/a',
          urlStatus,
        }),
      ]
      renderMyGgaem({ recordsState: { status: 'success', items } })

      expect(screen.getByText(noticePattern)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /원문 다시 보기/ })).toBeDisabled()
      expect(screen.queryByRole('link', { name: /원문 다시 보기/ })).not.toBeInTheDocument()
    },
  )

  it('shows a label announcing the selected date', () => {
    renderMyGgaem({ selectedDate: '2026-07-21' })

    expect(screen.getByText('2026.07.21 기록')).toBeInTheDocument()
  })

  it('shows the calendar loading indicator', () => {
    renderMyGgaem({
      calendarState: { status: 'loading' },
      recordsState: { status: 'success', items: [] },
    })

    expect(screen.getByRole('status')).toHaveTextContent(/불러오/)
  })

  it('shows a calendar error with a working retry button', async () => {
    const onRetryCalendar = vi.fn()
    renderMyGgaem({
      calendarState: { status: 'error', message: '달력을 불러오지 못했어요.', onRetry: onRetryCalendar },
    })

    expect(screen.getByRole('alert')).toHaveTextContent('달력을 불러오지 못했어요.')
    await userEvent.click(screen.getByRole('button', { name: /다시 시도/ }))
    expect(onRetryCalendar).toHaveBeenCalledTimes(1)
  })

  it('keeps the calendar grid and shows a month-empty notice when the month has no records', () => {
    renderMyGgaem({ calendarState: { status: 'success', days: [] } })

    expect(screen.getByText(/이 달에는 기록이 없어요/)).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /\d+일/ })).toHaveLength(31)
  })

  it('shows the records loading indicator', () => {
    renderMyGgaem({
      calendarState: { status: 'success', days: [] },
      recordsState: { status: 'loading' },
    })

    expect(screen.getByRole('status')).toHaveTextContent(/불러오/)
  })

  it('shows a records error with a working retry button', async () => {
    const onRetryRecords = vi.fn()
    renderMyGgaem({
      recordsState: { status: 'error', message: '기록을 불러오지 못했어요.', onRetry: onRetryRecords },
    })

    expect(screen.getByRole('alert')).toHaveTextContent('기록을 불러오지 못했어요.')
    await userEvent.click(screen.getByRole('button', { name: /다시 시도/ }))
    expect(onRetryRecords).toHaveBeenCalledTimes(1)
  })

  it('shows a date-empty notice when the selected date has no records', () => {
    renderMyGgaem({ recordsState: { status: 'success', items: [] } })

    expect(screen.getByText(/이 날짜에는 기록이 없어요/)).toBeInTheDocument()
  })

  it('keeps the successful calendar visible while the records area shows an error', () => {
    const days = [
      makeCalendarDay({ date: '2026-07-21', recordCount: 1, firstMissionType: 'connection' }),
    ]
    renderMyGgaem({
      calendarState: { status: 'success', days },
      recordsState: { status: 'error', message: '기록을 불러오지 못했어요.', onRetry: vi.fn() },
    })

    expect(screen.getByRole('alert')).toHaveTextContent('기록을 불러오지 못했어요.')
    expect(screen.getByRole('button', { name: /21일.*연결.*1개/ })).toBeInTheDocument()
  })

  it('shows 나의 깸 as the current tab and calls onGoToToday from the 오늘의 글 tab', async () => {
    const onGoToToday = vi.fn()
    renderMyGgaem({ onGoToToday })

    const myGgaemTab = screen.getByRole('button', { name: /나의 깸/ })
    expect(myGgaemTab).toHaveAttribute('aria-current', 'page')

    await userEvent.click(screen.getByRole('button', { name: /오늘의 글/ }))
    expect(onGoToToday).toHaveBeenCalledExactlyOnceWith()
  })

  it('does not render body text, sentence lists, AI summary, or a mission answer input', () => {
    const items = [
      makeRecordItem({
        id: '50000000-0000-0000-0000-000000000001',
        articleId: '40000000-0000-0000-0000-000000000001',
        articleTitle: 'A 글',
        sourceName: '요즘IT',
        missionType: 'connection',
        missionPrompt: '내 상황이나 프로젝트와 연결해보면?',
        userAnswer: '생각',
        createdAt: '2026-07-21T01:00:00Z',
        originalUrl: 'https://example.com/a',
        urlStatus: 'active',
      }),
    ]
    renderMyGgaem({ recordsState: { status: 'success', items } })

    expect(screen.queryByText(/AI 요약/)).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /기록 남기기|저장/ })).not.toBeInTheDocument()
  })
})
