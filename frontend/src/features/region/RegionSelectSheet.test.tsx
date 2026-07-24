import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { it, expect, vi } from 'vitest'
import { LanguageProvider } from '../../i18n/LanguageContext'
import RegionSelectSheet from './RegionSelectSheet'

vi.mock('../../lib/apiClient', () => ({
  apiClient: {
    get: (url: string) =>
      Promise.resolve({
        data:
          url === '/regions/provinces'
            ? { provinces: [{ name: '부산광역시', nameEn: 'Busan' }] }
            : url === '/regions/districts'
              ? { districts: [{ name: '해운대구', nameEn: 'Haeundae-gu' }] }
              : { covered: false, districtWide: false, dongOptions: [], alternativeDistricts: [] },
      }),
  },
}))

it('커버리지 없는 구/군을 고르면 저장 버튼이 비활성화된다', async () => {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <LanguageProvider>
        <RegionSelectSheet initialRegion={null} onSave={vi.fn()} onClose={vi.fn()} />
      </LanguageProvider>
    </QueryClientProvider>,
  )

  await waitFor(() => screen.getByText('부산광역시'))
  fireEvent.change(screen.getByDisplayValue('시/도 선택'), { target: { value: '부산광역시' } })
  await waitFor(() => screen.getByText('해운대구'))
  fireEvent.change(screen.getByDisplayValue('구/군 선택'), { target: { value: '해운대구' } })

  expect(await screen.findByRole('button', { name: '지역 저장' })).toBeDisabled()
})
