import { describe, expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import PathResult from './PathResult.jsx'

describe('PathResult', () => {
  test('결과 없음: 안내 문구가 표시된다', () => {
    render(<PathResult result={null} isLoading={false} error={null} />)

    expect(screen.getByText(/2개 이상 선택하고/)).toBeInTheDocument()
  })

  test('로딩 중: 계산 중 문구가 표시된다', () => {
    render(<PathResult result={null} isLoading error={null} />)

    expect(screen.getByText('계산 중...')).toBeInTheDocument()
  })

  test('에러: 에러 문구가 표시된다', () => {
    render(<PathResult result={null} isLoading={false} error="경로를 계산하지 못했습니다." />)

    expect(screen.getByText('경로를 계산하지 못했습니다.')).toBeInTheDocument()
  })

  test('정렬 성공: 번호와 이름 순서대로 표시된다', () => {
    const result = {
      order: [
        { id: 2, name: '정보처리기사' },
        { id: 1, name: 'SQLD' },
      ],
      stuckCertifications: [],
      hasCycle: false,
    }
    render(<PathResult result={result} isLoading={false} error={null} />)

    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('정보처리기사')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('SQLD')).toBeInTheDocument()
  })

  test('순환 참조: 경고 문구와 정체된 자격증 목록이 표시된다', () => {
    const result = {
      order: [],
      stuckCertifications: [
        { id: 1, name: 'SQLD' },
        { id: 2, name: '정보처리기사' },
      ],
      hasCycle: true,
    }
    render(<PathResult result={result} isLoading={false} error={null} />)

    expect(screen.getByText('순환 참조로 순서를 정할 수 없습니다')).toBeInTheDocument()
    expect(screen.getByText('SQLD')).toBeInTheDocument()
    expect(screen.getByText('정보처리기사')).toBeInTheDocument()
  })
})
