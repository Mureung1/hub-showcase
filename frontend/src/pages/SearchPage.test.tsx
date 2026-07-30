import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '../i18n/LanguageContext'
import SearchPage from './SearchPage'

// 이 프로젝트의 vitest.config.ts는 test.globals를 켜지 않아 @testing-library/react의
// 자동 cleanup(afterEach 전역 감지)이 동작하지 않는다 — 테스트 간 렌더 잔재가 남는 것을 막기 위해 명시적으로 정리한다.
afterEach(() => {
  cleanup()
})

// SearchPage 자체 로직뿐 아니라, apiClient → useItemSearch → 렌더링 → react-router 네비게이션까지
// 실제로 이어지는지 확인하는 화면 단위 통합 테스트. ResultPage는 자체 데이터 조회 로직이 있어 여기서는
// 이동 대상 경로/파라미터만 확인하는 스텁으로 대체한다 (ResultPage 내부 동작은 별도 테스트 관심사).

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
}))

vi.mock('../lib/apiClient', () => ({
  apiClient: { get: mocks.get },
}))

function ResultRouteStub() {
  const { itemId } = useParams()
  return <p>이동됨: {itemId}</p>
}

function renderSearchPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <MemoryRouter initialEntries={['/search']}>
          <Routes>
            <Route path="/search" element={<SearchPage />} />
            <Route path="/result/:itemId" element={<ResultRouteStub />} />
          </Routes>
        </MemoryRouter>
      </LanguageProvider>
    </QueryClientProvider>,
  )
}

describe('SearchPage', () => {
  it('검색어를 입력하면 결과가 뜨고, 클릭하면 결과 화면으로 이동한다', async () => {
    mocks.get.mockResolvedValue({ data: { items: [{ id: 'item-1', name: '페트병', nameEn: null }] } })

    renderSearchPage()

    fireEvent.change(screen.getByPlaceholderText(/./), { target: { value: '페트' } })

    await waitFor(() => expect(mocks.get).toHaveBeenCalledWith('/items/search', { params: { q: '페트' } }))

    fireEvent.click(await screen.findByText('페트병'))

    expect(await screen.findByText('이동됨: item-1')).toBeInTheDocument()
  })

  it('검색 결과가 없으면 빈 안내 문구를 보여준다', async () => {
    mocks.get.mockResolvedValue({ data: { items: [] } })

    renderSearchPage()

    fireEvent.change(screen.getByPlaceholderText(/./), { target: { value: '없는물건' } })

    await waitFor(() => expect(mocks.get).toHaveBeenCalled())
    expect(await screen.findByText('일치하는 품목이 없어요.')).toBeInTheDocument()
  })

  it('검색 API가 실패하면 에러 안내 문구를 보여준다', async () => {
    mocks.get.mockRejectedValue(new Error('network error'))

    renderSearchPage()

    fireEvent.change(screen.getByPlaceholderText(/./), { target: { value: '페트' } })

    expect(await screen.findByText('검색 중 오류가 발생했어요. 다시 시도해 주세요.')).toBeInTheDocument()
  })
})
