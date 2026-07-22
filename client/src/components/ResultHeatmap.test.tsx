import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ResultHeatmap from './ResultHeatmap.tsx'
import { formatDateLabel } from '../lib/formatDateLabel.ts'
import type { ScheduleSlot, SlotResult } from 'shared'

const slots: ScheduleSlot[] = [
  { date: '2026-07-20', time: '09:00' },
  { date: '2026-07-20', time: '09:30' },
]

const respondedResult: SlotResult = { date: '2026-07-20', time: '09:00', availableCount: 2, preferredCount: 1 }
const levelMap = new Map([['2026-07-20T09:00', 3]])
const resultMap = new Map([['2026-07-20T09:00', respondedResult]])

const respondedLabel = `${formatDateLabel('2026-07-20')} 09:00 상세보기`
const emptyLabel = `${formatDateLabel('2026-07-20')} 09:30 상세보기`

describe('ResultHeatmap', () => {
  it('응답 있는 칸을 클릭하면 모달에 정확한 가능/선호 인원수가 뜬다', () => {
    render(<ResultHeatmap slots={slots} levelMap={levelMap} resultMap={resultMap} />)

    fireEvent.click(screen.getByRole('button', { name: respondedLabel }))

    expect(screen.getByText('가능 2명 · 선호 1명')).toBeInTheDocument()
  })

  it('응답 없는 칸은 비활성화돼 있고 클릭해도 모달이 뜨지 않는다', () => {
    render(<ResultHeatmap slots={slots} levelMap={levelMap} resultMap={resultMap} />)

    const emptyCell = screen.getByRole('button', { name: emptyLabel })
    expect(emptyCell).toBeDisabled()

    fireEvent.click(emptyCell)

    expect(screen.queryByText('닫기')).not.toBeInTheDocument()
  })
})
