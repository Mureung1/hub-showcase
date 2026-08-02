import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import ReportView from './ReportView'
import { buildEmotionReport } from '../utils/emotionReport'

describe('감정 리포트', () => {
  test('저장된 기록의 개수, 기분 분포와 AI 정리 내용을 요약한다', () => {
    const report = buildEmotionReport([
      {
        id: '3',
        mood: '😐',
        emotion: '긴장',
        cause: '발표 준비',
        action: '목차를 세 줄로 적기',
        createdAt: '2026-07-30T03:00:00.000Z',
      },
      {
        id: '2',
        mood: '😐',
        emotion: '걱정',
        cause: '마감 시간',
        action: '제출 링크 확인하기',
        createdAt: '2026-07-29T03:00:00.000Z',
      },
      {
        id: '1',
        mood: '🙂',
        emotion: '',
        cause: '',
        action: '',
        createdAt: '2026-07-28T03:00:00.000Z',
      },
    ])

    expect(report).toMatchObject({
      total: 3,
      organizedCount: 2,
      moods: [
        { mood: '😐', count: 2 },
        { mood: '🙂', count: 1 },
      ],
      actions: ['목차를 세 줄로 적기', '제출 링크 확인하기'],
    })
    expect(report.timeline.map(({ id }) => id)).toEqual(['1', '2', '3'])
    expect(report.overviewText).toContain('3개의 기록')
    expect(report.overviewText).toContain('😐 2회')
    expect(report.overviewText).toContain('최근 정리된 감정은 긴장')
    expect(report.overviewText).toContain('최근 작은 행동에는 “목차를 세 줄로 적기”라는 기록')
    expect(report.copyText).toContain('전체 기록: 3개')
    expect(report.copyText).toContain('발표 준비')
  })

  test('기록이 없으면 빈 리포트를 만든다', () => {
    expect(buildEmotionReport([])).toMatchObject({
      total: 0,
      organizedCount: 0,
      moods: [],
      recent: [],
      actions: [],
      timeline: [],
      overviewText: '',
    })
  })

  test('별도 동의 후 현재 리포트 요약만 AI 분석에 보낸다', async () => {
    const onAnalyze = vi.fn().mockResolvedValue({
      overview: '최근 기록에서는 긴장 뒤 안도가 나타났어요.',
      pattern: '발표 준비가 원인으로 반복됐어요.',
      nextFocus: '긴장이 줄어든 날의 행동을 살펴볼까요?',
    })

    render(
      <ReportView
        checkins={[{
          id: '1',
          mood: '😐',
          emotion: '긴장',
          cause: '발표 준비',
          action: '목차 적기',
          createdAt: '2026-07-30T03:00:00.000Z',
        }]}
        isLoading={false}
        onRefresh={() => {}}
        onAnalyze={onAnalyze}
      />,
    )

    const analyzeButton = screen.getByRole('button', { name: 'AI로 전체 흐름 정리' })
    expect(analyzeButton).toBeDisabled()

    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(analyzeButton)

    expect(onAnalyze).toHaveBeenCalledWith(expect.stringContaining('전체 기록: 1개'))
    expect(await screen.findByText('최근 기록에서는 긴장 뒤 안도가 나타났어요.')).toBeInTheDocument()
  })
})
